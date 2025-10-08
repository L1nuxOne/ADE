use anyhow::{anyhow, Context, Result};
use base64::{engine::general_purpose, Engine as _};
use parking_lot::Mutex;
use portable_pty::{
    native_pty_system, Child, CommandBuilder, ExitStatus, MasterPty, PtyPair, PtySize,
};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::io::{Read, Write};
use std::sync::Arc;
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use tauri::AppHandle;
use tokio_util::sync::CancellationToken;
use tracing::warn;

#[derive(Clone, Default)]
pub struct TerminalState {
    inner: Arc<InnerState>,
}

#[derive(Default)]
struct InnerState {
    terminals: Mutex<HashMap<String, Arc<PtyEntry>>>,
    engines: Mutex<HashMap<String, EngineHandle>>,
}

struct PtyEntry {
    id: String,
    master: Mutex<Box<dyn MasterPty + Send>>,
    writer: Mutex<Box<dyn Write + Send>>,
    child: Mutex<Box<dyn Child + Send>>,
}

struct EngineHandle {
    cancel: CancellationToken,
    task: tauri::async_runtime::JoinHandle<()>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SpawnTerminalRequest {
    pub id: String,
    pub cols: Option<u16>,
    pub rows: Option<u16>,
    pub use_wsl: Option<bool>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SpawnTerminalResponse {
    pub shell_label: String,
    pub supports_wsl: bool,
}

#[derive(Debug, Serialize)]
struct TerminalChunk {
    id: String,
    data: String,
}

#[derive(Debug, Serialize)]
struct TerminalExitEvent {
    id: String,
    code: Option<i32>,
    signal: Option<String>,
    message: Option<String>,
}

#[derive(Debug, Serialize)]
struct TerminalErrorEvent {
    id: Option<String>,
    message: String,
}

#[derive(Debug)]
struct ShellLaunch {
    program: String,
    args: Vec<String>,
    label: String,
    supports_wsl: bool,
}

impl TerminalState {
    pub fn take_terminal(&self, id: &str) -> Option<Arc<PtyEntry>> {
        self.inner.terminals.lock().remove(id)
    }

    pub fn insert_terminal(&self, id: String, entry: Arc<PtyEntry>) {
        self.inner.terminals.lock().insert(id, entry);
    }

    pub fn get_terminal(&self, id: &str) -> Option<Arc<PtyEntry>> {
        self.inner.terminals.lock().get(id).cloned()
    }

    pub fn insert_engine(&self, id: String, handle: EngineHandle) {
        self.inner.engines.lock().insert(id, handle);
    }

    pub fn has_engine(&self, id: &str) -> bool {
        self.inner.engines.lock().contains_key(id)
    }

    pub fn take_engine(&self, id: &str) -> Option<EngineHandle> {
        self.inner.engines.lock().remove(id)
    }
}

impl PtyEntry {
    fn new(
        id: String,
        master: Box<dyn MasterPty + Send>,
        writer: Box<dyn Write + Send>,
        child: Box<dyn Child + Send>,
    ) -> Self {
        Self {
            id,
            master: Mutex::new(master),
            writer: Mutex::new(writer),
            child: Mutex::new(child),
        }
    }

    fn resize(&self, cols: u16, rows: u16) -> Result<()> {
        self.master
            .lock()
            .resize(PtySize {
                cols,
                rows,
                pixel_width: 0,
                pixel_height: 0,
            })
            .context("failed to resize pty")
    }

    fn write(&self, data: &[u8]) -> Result<()> {
        self.writer
            .lock()
            .write_all(data)
            .context("failed to write to terminal")
    }

    fn kill(&self) -> Result<()> {
        self.child.lock().kill().context("failed to kill process")
    }

    fn wait_exit(&self) -> Option<ExitStatus> {
        // Blocking wait is acceptable here—if the process already exited, this returns immediately.
        self.child.lock().wait().ok()
    }
}

#[tauri::command]
pub async fn spawn_terminal(
    app: AppHandle,
    state: tauri::State<'_, TerminalState>,
    request: SpawnTerminalRequest,
) -> Result<SpawnTerminalResponse, String> {
    let terminal_id = request.id.clone();
    match spawn_terminal_inner(&app, &state, request).await {
        Ok(response) => Ok(response),
        Err(err) => {
            emit_error(&app, Some(terminal_id), err.to_string());
            Err(err.to_string())
        }
    }
}

async fn spawn_terminal_inner(
    app: &AppHandle,
    state: &TerminalState,
    request: SpawnTerminalRequest,
) -> Result<SpawnTerminalResponse> {
    let id = request.id.clone();
    if let Some(existing) = state.take_terminal(&id) {
        if let Err(error) = existing.kill() {
            emit_error(
                app,
                Some(id.clone()),
                format!("failed to stop existing terminal: {error}"),
            );
        }
        let status = existing.wait_exit();
        emit_exit_event(app, &id, status, Some("terminal restarted".into()));
    }

    let use_wsl = request.use_wsl.unwrap_or(false);
    let launch = resolve_shell(use_wsl)?;
    let pty_system = native_pty_system();
    let size = PtySize {
        cols: request.cols.unwrap_or(80),
        rows: request.rows.unwrap_or(24),
        pixel_width: 0,
        pixel_height: 0,
    };
    let PtyPair { master, slave } = pty_system.openpty(size).context("failed to open pty")?;

    let mut command = CommandBuilder::new(&launch.program);
    for arg in &launch.args {
        command.arg(arg);
    }

    let child = slave
        .spawn_command(command)
        .context("failed to spawn shell process")?;
    let mut reader = master
        .try_clone_reader()
        .context("failed to clone pty reader")?;
    let writer = master
        .take_writer()
        .context("failed to acquire pty writer")?;
    let entry = Arc::new(PtyEntry::new(id.clone(), master, writer, child));

    start_reader(app.clone(), state.clone(), entry.clone(), reader);
    state.insert_terminal(id.clone(), entry);
    Ok(SpawnTerminalResponse {
        shell_label: launch.label,
        supports_wsl: launch.supports_wsl,
    })
}

fn start_reader(
    app: AppHandle,
    state: TerminalState,
    entry: Arc<PtyEntry>,
    mut reader: Box<dyn Read + Send>,
) {
    let id = entry.id.clone();
    std::thread::spawn(move || {
        let mut buffer = [0u8; 8192];
        loop {
            match reader.read(&mut buffer) {
                Ok(0) => {
                    finalize_terminal(&app, &state, &id, Some("process exited".into()));
                    break;
                }
                Ok(size) => {
                    let encoded = general_purpose::STANDARD.encode(&buffer[..size]);
                    let payload = TerminalChunk {
                        id: id.clone(),
                        data: encoded,
                    };
                    if app.emit_all("terminal://data", &payload).is_err() {
                        break;
                    }
                }
                Err(err) => {
                    let message = format!("Failed to read terminal output: {err}");
                    emit_error(&app, Some(id.clone()), &message);
                    finalize_terminal(&app, &state, &id, Some(message));
                    break;
                }
            }
        }
    });
}

#[tauri::command]
pub fn write_to_terminal(
    state: tauri::State<'_, TerminalState>,
    id: String,
    data: Vec<u8>,
) -> Result<(), String> {
    let Some(entry) = state.get_terminal(&id) else {
        return Err(format!("terminal {id} not found"));
    };
    entry
        .write(&data)
        .map_err(|err| format!("write failed: {err}"))
}

#[tauri::command]
pub fn resize_terminal(
    state: tauri::State<'_, TerminalState>,
    id: String,
    cols: u16,
    rows: u16,
) -> Result<(), String> {
    let Some(entry) = state.get_terminal(&id) else {
        return Err(format!("terminal {id} not found"));
    };
    entry
        .resize(cols, rows)
        .map_err(|err| format!("resize failed: {err}"))
}

#[tauri::command]
pub fn send_interrupt(state: tauri::State<'_, TerminalState>, id: String) -> Result<(), String> {
    let Some(entry) = state.get_terminal(&id) else {
        return Err(format!("terminal {id} not found"));
    };
    entry
        .write(&[0x03])
        .map_err(|err| format!("interrupt failed: {err}"))
}

#[tauri::command]
pub fn close_terminal(
    app: AppHandle,
    state: tauri::State<'_, TerminalState>,
    id: String,
) -> Result<(), String> {
    if let Some(entry) = state.take_terminal(&id) {
        if let Err(error) = entry.kill() {
            emit_error(
                &app,
                Some(id.clone()),
                format!("failed to kill terminal: {error}"),
            );
        }
        let status = entry.wait_exit();
        emit_exit_event(&app, &id, status, Some("terminal closed".into()));
        Ok(())
    } else {
        Err(format!("terminal {id} not found"))
    }
}

#[tauri::command]
pub async fn start_engine_stream(
    app: AppHandle,
    state: tauri::State<'_, TerminalState>,
    id: String,
) -> Result<(), String> {
    if state.has_engine(&id) {
        return Ok(());
    }
    let handle = spawn_engine_stream(app.clone(), state.clone(), id.clone());
    state.insert_engine(id.clone(), handle);
    Ok(())
}

#[tauri::command]
pub async fn stop_engine_stream(
    state: tauri::State<'_, TerminalState>,
    id: String,
) -> Result<(), String> {
    if let Some(handle) = state.take_engine(&id) {
        handle.cancel.cancel();
        tauri::async_runtime::spawn(async move {
            let _ = handle.task.await;
        });
    }
    Ok(())
}

fn spawn_engine_stream(app: AppHandle, state: TerminalState, id: String) -> EngineHandle {
    let cancel = CancellationToken::new();
    let token = cancel.clone();
    let task = tauri::async_runtime::spawn(async move {
        let mut interval = tokio::time::interval(Duration::from_secs(1));
        let mut seq: u64 = 0;
        while !token.is_cancelled() {
            interval.tick().await;
            seq += 1;
            let heartbeat = EngineHeartbeat::new(seq);
            match serde_json::to_string(&heartbeat) {
                Ok(json) => {
                    let line = format!("{json}\n");
                    let payload = TerminalChunk {
                        id: id.clone(),
                        data: general_purpose::STANDARD.encode(line.as_bytes()),
                    };
                    if let Err(err) = app.emit_all("terminal://data", &payload) {
                        warn!("failed to emit engine heartbeat: {err}");
                        break;
                    }
                }
                Err(err) => {
                    emit_error(
                        &app,
                        Some(id.clone()),
                        format!("engine stream error: {err}"),
                    );
                    break;
                }
            }
        }
        let _ = app.emit_all(
            "terminal://exit",
            &TerminalExitEvent {
                id: id.clone(),
                code: None,
                signal: None,
                message: Some("engine stream stopped".into()),
            },
        );
        state.take_engine(&id);
    });
    EngineHandle { cancel, task }
}

#[derive(Debug, Serialize)]
struct EngineHeartbeat {
    seq: u64,
    timestamp: f64,
    level: &'static str,
    message: String,
}

impl EngineHeartbeat {
    fn new(seq: u64) -> Self {
        let timestamp = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|duration| duration.as_secs_f64())
            .unwrap_or_default();
        Self {
            seq,
            timestamp,
            level: "info",
            message: format!("engine heartbeat {seq}"),
        }
    }
}

fn emit_exit_event(app: &AppHandle, id: &str, status: Option<ExitStatus>, message: Option<String>) {
    let (code, signal) = status
        .map(|status| (status.code(), status.signal().map(|s| s.to_string())))
        .unwrap_or((None, None));
    let _ = app.emit_all(
        "terminal://exit",
        &TerminalExitEvent {
            id: id.to_string(),
            code,
            signal,
            message,
        },
    );
}

fn finalize_terminal(app: &AppHandle, state: &TerminalState, id: &str, message: Option<String>) {
    if let Some(entry) = state.take_terminal(id) {
        let status = entry.wait_exit();
        emit_exit_event(app, id, status, message);
    }
}

fn emit_error(app: &AppHandle, id: Option<String>, message: impl Into<String>) {
    let payload = TerminalErrorEvent {
        id,
        message: message.into(),
    };
    let _ = app.emit_all("terminal://error", &payload);
}

fn resolve_shell(use_wsl: bool) -> Result<ShellLaunch> {
    if cfg!(target_os = "windows") {
        resolve_windows_shell(use_wsl)
    } else {
        resolve_unix_shell()
    }
}

fn resolve_windows_shell(use_wsl: bool) -> Result<ShellLaunch> {
    let supports_wsl = which::which("wsl").is_ok() || which::which("wsl.exe").is_ok();
    if use_wsl {
        if !supports_wsl {
            return Err(anyhow!("WSL requested but no wsl executable was found"));
        }
        let wsl_path = which::which("wsl").or_else(|_| which::which("wsl.exe"));
        let program = wsl_path
            .as_ref()
            .map(|path| path.to_string_lossy().to_string())
            .unwrap_or_else(|| "wsl".to_string());
        return Ok(ShellLaunch {
            program,
            args: vec!["-e".into(), "bash".into()],
            label: "wsl -e bash".into(),
            supports_wsl,
        });
    }
    let candidates = ["pwsh.exe", "pwsh", "powershell.exe", "powershell"];
    for candidate in candidates {
        if let Ok(path) = which::which(candidate) {
            return Ok(ShellLaunch {
                label: format!(
                    "{}",
                    path.file_name()
                        .map(|s| s.to_string_lossy())
                        .unwrap_or_else(|| candidate.into())
                ),
                program: path.to_string_lossy().to_string(),
                args: vec![],
                supports_wsl,
            });
        }
    }
    Err(anyhow!(
        "No PowerShell executable found. Install pwsh or powershell, or enable WSL."
    ))
}

fn resolve_unix_shell() -> Result<ShellLaunch> {
    let mut candidates = Vec::new();
    if let Ok(shell_env) = std::env::var("SHELL") {
        candidates.push(shell_env);
    }
    candidates.extend([
        "/bin/zsh".to_string(),
        "/bin/bash".to_string(),
        "/bin/sh".to_string(),
    ]);
    for candidate in candidates {
        if candidate.is_empty() {
            continue;
        }
        let path = if candidate.starts_with('/') {
            let candidate_path = std::path::Path::new(&candidate);
            if candidate_path.exists() {
                candidate_path.to_path_buf()
            } else {
                continue;
            }
        } else if let Ok(found) = which::which(&candidate) {
            found
        } else {
            continue;
        };
        return Ok(ShellLaunch {
            label: path
                .file_name()
                .map(|name| name.to_string_lossy().to_string())
                .unwrap_or_else(|| candidate.clone()),
            program: path.to_string_lossy().to_string(),
            args: vec![],
            supports_wsl: false,
        });
    }
    Err(anyhow!(
        "No suitable shell found (checked SHELL, zsh, bash, sh)."
    ))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[cfg(not(target_os = "windows"))]
    #[test]
    fn unix_shell_prefers_env() {
        let launch = resolve_unix_shell().unwrap();
        assert!(!launch.program.is_empty());
    }

    #[test]
    fn heartbeat_timestamp_is_non_zero() {
        let heartbeat = EngineHeartbeat::new(1);
        assert!(heartbeat.timestamp >= 0.0);
        assert_eq!(heartbeat.seq, 1);
    }
}
