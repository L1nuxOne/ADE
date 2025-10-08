import { useCallback, useEffect, useRef, useState } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { listen } from '@tauri-apps/api/event';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';

interface TerminalChunk {
  id: string;
  data: string;
}

interface TerminalExit {
  id: string;
  code: number | null;
  signal?: string | null;
  message?: string | null;
}

interface TerminalErrorPayload {
  id?: string | null;
  message: string;
}

type TerminalMode = 'pty' | 'engine';

export type TerminalStatus = 'starting' | 'ready' | 'closed';

interface UseTerminalOptions {
  id: string;
  mode: TerminalMode;
  onError: (message: string) => void;
  onInfo: (message: string) => void;
  useWsl?: boolean;
}

const base64ToString = (chunk: string) => {
  try {
    return decodeURIComponent(
      atob(chunk)
        .split('')
        .map((c) => `%${`00${c.charCodeAt(0).toString(16)}`.slice(-2)}`)
        .join(''),
    );
  } catch (_error) {
    return atob(chunk);
  }
};

const stringToUint8 = (value: string) => new TextEncoder().encode(value);

export const useTerminal = ({ id, mode, onError, onInfo, useWsl }: UseTerminalOptions) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const frameTokenRef = useRef<number | null>(null);
  const bufferRef = useRef<string[]>([]);
  const [status, setStatus] = useState<TerminalStatus>('starting');
  const [shellLabel, setShellLabel] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastExit, setLastExit] = useState<string | null>(null);
  const [supportsWsl, setSupportsWsl] = useState<boolean>(false);
  const [isResolving, setIsResolving] = useState(false);

  const flushBuffer = useCallback(() => {
    if (!terminalRef.current) {
      bufferRef.current = [];
      frameTokenRef.current = null;
      return;
    }
    const chunk = bufferRef.current.join('');
    bufferRef.current = [];
    if (chunk.length > 0) {
      terminalRef.current.write(chunk);
    }
    frameTokenRef.current = null;
  }, []);

  const scheduleFlush = useCallback(() => {
    if (frameTokenRef.current != null) {
      return;
    }
    frameTokenRef.current = requestAnimationFrame(flushBuffer);
  }, [flushBuffer]);

  const enqueue = useCallback(
    (payload: string) => {
      bufferRef.current.push(payload);
      if (bufferRef.current.length > 128) {
        flushBuffer();
        return;
      }
      scheduleFlush();
    },
    [flushBuffer, scheduleFlush],
  );

  const mount = useCallback((node: HTMLDivElement | null) => {
    containerRef.current = node;
    if (node && terminalRef.current) {
      terminalRef.current.open(node);
      fitAddonRef.current?.fit();
    }
  }, []);

  const emitResize = useCallback(() => {
    const terminal = terminalRef.current;
    if (!terminal) {
      return;
    }
    const cols = terminal.cols;
    const rows = terminal.rows;
    if (mode !== 'pty') {
      return;
    }
    invoke('resize_terminal', { id, cols, rows }).catch((resizeError) => {
      const message = resizeError instanceof Error ? resizeError.message : String(resizeError);
      onError(`Failed to resize terminal: ${message}`);
    });
  }, [id, mode, onError]);

  const configureTerminal = useCallback(() => {
    if (terminalRef.current) {
      return;
    }
    const terminal = new Terminal({
      convertEol: true,
      cursorBlink: true,
      fontFamily: getComputedStyle(document.documentElement).fontFamily,
      theme: {
        background: '#0f1115',
        foreground: '#e7ecf4',
        cursor: '#3b82f6',
      },
    });
    terminalRef.current = terminal;
    const fitAddon = new FitAddon();
    fitAddonRef.current = fitAddon;
    terminal.loadAddon(fitAddon);
    if (containerRef.current) {
      terminal.open(containerRef.current);
      queueMicrotask(() => {
        fitAddon.fit();
        emitResize();
      });
    }
    const resizeObserver = new ResizeObserver(() => {
      if (!fitAddonRef.current) {
        return;
      }
      requestAnimationFrame(() => {
        fitAddonRef.current?.fit();
        emitResize();
      });
    });
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }
    const disposeResize = () => resizeObserver.disconnect();

    const subscriptions = [] as Array<() => void>;
    if (mode === 'pty') {
      subscriptions.push(
        terminal.onData((input) => {
          invoke('write_to_terminal', { id, data: Array.from(stringToUint8(input)) })
            .catch((writeError) => {
              const message =
                writeError instanceof Error ? writeError.message : String(writeError);
              onError(`Failed to write to terminal: ${message}`);
            });
        }).dispose,
      );
    }

    const dataListener = listen<TerminalChunk>('terminal://data', (event) => {
      if (event.payload.id !== id) {
        return;
      }
      enqueue(base64ToString(event.payload.data));
      setStatus('ready');
    });
    const exitListener = listen<TerminalExit>('terminal://exit', (event) => {
      if (event.payload.id !== id) {
        return;
      }
      const code =
        typeof event.payload.code === 'number' ? event.payload.code.toString() : 'unknown';
      const signal = event.payload.signal ?? undefined;
      const message = event.payload.message;
      const line = signal ? `${signal}` : `code ${code}`;
      setLastExit(line);
      setStatus('closed');
      if (message) {
        onInfo(message);
      }
    });
    const errorListener = listen<TerminalErrorPayload>('terminal://error', (event) => {
      if (event.payload.id && event.payload.id !== id) {
        return;
      }
      const message = event.payload.message;
      setError(message);
      onError(message);
    });

    const listeners = [dataListener, exitListener, errorListener];

    return () => {
      listeners.forEach((listenerPromise) => {
        listenerPromise.then((unsubscribe) => unsubscribe());
      });
      subscriptions.forEach((dispose) => dispose());
      disposeResize();
      terminal.dispose();
      terminalRef.current = null;
      fitAddonRef.current = null;
    };
  }, [emitResize, enqueue, id, mode, onError, onInfo]);

  useEffect(() => {
    configureTerminal();
  }, [configureTerminal]);

  const startEngine = useCallback(async () => {
    setStatus('starting');
    setLastExit(null);
    try {
      await invoke('start_engine_stream', { id });
      setShellLabel('engine heartbeat');
      setSupportsWsl(false);
      setError(null);
      setStatus('ready');
    } catch (engineError) {
      const message = engineError instanceof Error ? engineError.message : String(engineError);
      setError(message);
      onError(message);
    }
  }, [id, onError]);

  const startShell = useCallback(async () => {
    setStatus('starting');
    setLastExit(null);
    setShellLabel(null);
    setSupportsWsl(false);
    setIsResolving(true);
    try {
      const response = await invoke<{
        shellLabel: string;
        supportsWsl: boolean;
      }>('spawn_terminal', {
        id,
        cols: terminalRef.current?.cols,
        rows: terminalRef.current?.rows,
        useWsl: Boolean(useWsl),
      });
      setShellLabel(response.shellLabel);
      setSupportsWsl(response.supportsWsl);
      setError(null);
      setStatus('ready');
    } catch (spawnError) {
      const message = spawnError instanceof Error ? spawnError.message : String(spawnError);
      setError(message);
      onError(message);
    } finally {
      setIsResolving(false);
    }
  }, [id, onError, useWsl]);

  const sendInterrupt = useCallback(async () => {
    if (mode !== 'pty') {
      return;
    }
    try {
      await invoke('send_interrupt', { id });
      onInfo(`Sent Ctrl+C to ${id}`);
    } catch (interruptError) {
      const message =
        interruptError instanceof Error ? interruptError.message : String(interruptError);
      onError(`Failed to send Ctrl+C: ${message}`);
    }
  }, [id, mode, onError, onInfo]);

  useEffect(() => {
    if (mode === 'engine') {
      startEngine();
      return () => {
        invoke('stop_engine_stream', { id }).catch(() => undefined);
      };
    }
    startShell();
    return () => {
      invoke('close_terminal', { id }).catch(() => undefined);
    };
  }, [id, mode, startEngine, startShell]);
  return {
    mount,
    status,
    error,
    lastExit,
    shellLabel,
    supportsWsl,
    isResolving,
    sendInterrupt,
  };
};
