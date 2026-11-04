// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod config;
mod monitor;
mod notifications;
mod scripts;
mod state;
mod tray;
mod window;

use std::sync::Arc;
use std::time::Duration;
use tauri::Manager;

use crate::config::{get_data_dir, get_icon_path, init_environment};
use crate::monitor::start_background_monitor;
use crate::notifications::open_chat;
use crate::state::AppState;
use crate::tray::setup_tray;
use crate::window::build_main_window;

fn main() {
    init_environment();

    let profile_dir = get_data_dir();
    let icon_path = get_icon_path();
    let state = Arc::new(AppState::new(icon_path));
    let state_for_setup = Arc::clone(&state);

    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init({
            let state_for_single = Arc::clone(&state);
            move |app, _args, _cwd| {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.unminimize();
                    let _ = window.set_focus();

                    let target_chat = {
                        let mut pending = state_for_single.pending_chat_target.lock().unwrap();
                        if let Some((chat, time)) = pending.take() {
                            if time.elapsed() < Duration::from_secs(45) {
                                Some(chat)
                            } else {
                                None
                            }
                        } else {
                            None
                        }
                    };

                    if let Some(chat) = target_chat {
                        open_chat(&window, &chat);
                    }
                }
            }
        }))
        .plugin(tauri_plugin_notification::init())
        .setup(move |app| {
            let app_handle = app.handle().clone();

            // Store app_handle for cross-platform desktop notifications
            if let Ok(mut handle_guard) = state_for_setup.app_handle.lock() {
                *handle_guard = Some(app_handle.clone());
            }

            // Setup tray icon and menus
            setup_tray(app, Arc::clone(&state_for_setup))?;

            // Build main application window and attach event handlers
            build_main_window(app, Arc::clone(&state_for_setup), profile_dir)?;

            // Start background monitor task
            start_background_monitor(app_handle, Arc::clone(&state_for_setup));

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running WhatsApp Tauri application");
}
