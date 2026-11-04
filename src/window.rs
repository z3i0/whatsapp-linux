use std::path::PathBuf;
use std::sync::atomic::Ordering;
use std::sync::Arc;
use std::time::{Duration, Instant};
use tauri::{App, Manager, WebviewUrl, WebviewWindow, WebviewWindowBuilder, WindowEvent};

use crate::config::{debug_log, USER_AGENT, WHATSAPP_URL};
use crate::notifications::{open_chat, show_desktop_notification};
use crate::scripts::INIT_SCRIPT;
use crate::state::AppState;

pub fn build_main_window(
    app: &App,
    state: Arc<AppState>,
    profile_dir: PathBuf,
) -> Result<WebviewWindow, Box<dyn std::error::Error>> {
    #[cfg(target_os = "windows")]
    let platform_script = "window.__WA_PLATFORM__ = 'windows';";
    #[cfg(target_os = "macos")]
    let platform_script = "window.__WA_PLATFORM__ = 'macos';";
    #[cfg(target_os = "linux")]
    let platform_script = "window.__WA_PLATFORM__ = 'linux';";

    let window = WebviewWindowBuilder::new(
        app,
        "main",
        WebviewUrl::External(WHATSAPP_URL.parse()?),
    )
    .title("WhatsApp")
    .inner_size(1100.0, 750.0)
    .min_inner_size(600.0, 400.0)
    .center()
    .user_agent(USER_AGENT)
    .data_directory(profile_dir)
    .initialization_script(platform_script)
    .initialization_script(INIT_SCRIPT)
    .enable_clipboard_access()
    .devtools(true)
    .build()?;

    debug_log("=== WhatsApp Linux started ===");
    show_desktop_notification(&state, "WhatsApp", "WhatsApp is ready", None);

    let app_handle = app.handle().clone();
    let state_for_events = Arc::clone(&state);

    window.on_window_event(move |event| {
        match event {
            WindowEvent::CloseRequested { api, .. } => {
                api.prevent_close();
                state_for_events.is_window_focused.store(false, Ordering::SeqCst);
                if let Some(w) = app_handle.get_webview_window("main") {
                    let _ = w.eval("window.__wa_set_focused && window.__wa_set_focused(false);");
                    let _ = w.hide();
                }
                let mut should_notify = false;
                if let Ok(mut last_bg) = state_for_events.last_bg_notif_time.lock() {
                    if last_bg.elapsed() > Duration::from_secs(15) {
                        *last_bg = Instant::now();
                        should_notify = true;
                    }
                }
                if should_notify {
                    show_desktop_notification(
                        &state_for_events,
                        "WhatsApp",
                        "WhatsApp is running in the background to receive instant notifications.",
                        None,
                    );
                }
            }
            WindowEvent::Focused(focused) => {
                state_for_events.is_window_focused.store(*focused, Ordering::SeqCst);
                if let Some(w) = app_handle.get_webview_window("main") {
                    let js = format!("window.__wa_set_focused && window.__wa_set_focused({});", focused);
                    let _ = w.eval(&js);

                    if *focused {
                        let target_chat = {
                            let mut pending = state_for_events.pending_chat_target.lock().unwrap();
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
                            open_chat(&w, &chat);
                        }
                    }
                }
            }
            _ => {}
        }
    });

    Ok(window)
}

