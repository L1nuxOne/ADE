#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod terminal;

use terminal::{
    close_terminal, resize_terminal, send_interrupt, spawn_terminal, start_engine_stream,
    stop_engine_stream, write_to_terminal, TerminalState,
};

fn main() {
    tauri::Builder::default()
        .manage(TerminalState::default())
        .invoke_handler(tauri::generate_handler![
            spawn_terminal,
            write_to_terminal,
            resize_terminal,
            close_terminal,
            send_interrupt,
            start_engine_stream,
            stop_engine_stream,
        ])
        .run(tauri::generate_context!())
        .expect("error while running ADE tauri application");
}
