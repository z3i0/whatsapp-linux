use std::sync::atomic::Ordering;
use std::sync::Arc;
use tauri::menu::{MenuBuilder, MenuItemBuilder};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{App, Manager};

use crate::state::AppState;

pub fn setup_tray(app: &mut App, state: Arc<AppState>) -> Result<(), Box<dyn std::error::Error>> {
    let show_i = MenuItemBuilder::with_id("show", "Show / Hide WhatsApp").build(app)?;
    let features_i = MenuItemBuilder::with_id("features", "App Features & Privacy").build(app)?;
    let reload_i = MenuItemBuilder::with_id("reload", "Reload Page").build(app)?;
    let quit_i = MenuItemBuilder::with_id("quit", "Quit WhatsApp").build(app)?;

    let tray_menu = MenuBuilder::new(app)
        .item(&show_i)
        .item(&features_i)
        .separator()
        .item(&reload_i)
        .item(&quit_i)
        .build()?;

    let default_icon = app
        .default_window_icon()
        .cloned()
        .expect("Failed to load default window icon");

    let state_for_tray_menu = Arc::clone(&state);
    let state_for_tray_click = Arc::clone(&state);

    // On macOS, menu bar items standardly open the menu on left click.
    // On Windows and Linux, left click toggles the window visibility.
    #[cfg(target_os = "macos")]
    let show_menu_on_left = true;
    #[cfg(not(target_os = "macos"))]
    let show_menu_on_left = false;

    let _tray = TrayIconBuilder::with_id("main-tray")
        .icon(default_icon)
        .menu(&tray_menu)
        .tooltip("WhatsApp Web")
        .show_menu_on_left_click(show_menu_on_left)
        .on_menu_event(move |app, event| {
            match event.id.as_ref() {
                "show" => {
                    if let Some(w) = app.get_webview_window("main") {
                        if w.is_visible().unwrap_or(false)
                            && !w.is_minimized().unwrap_or(false)
                        {
                            state_for_tray_menu.is_window_focused.store(false, Ordering::SeqCst);
                            let _ = w.eval("window.__wa_set_focused && window.__wa_set_focused(false);");
                            let _ = w.hide();
                        } else {
                            state_for_tray_menu.is_window_focused.store(true, Ordering::SeqCst);
                            let _ = w.show();
                            let _ = w.unminimize();
                            let _ = w.set_focus();
                            let _ = w.eval("window.__wa_set_focused && window.__wa_set_focused(true);");
                        }
                    }
                }
                "features" => {
                    if let Some(w) = app.get_webview_window("main") {
                        state_for_tray_menu.is_window_focused.store(true, Ordering::SeqCst);
                        let _ = w.show();
                        let _ = w.unminimize();
                        let _ = w.set_focus();
                        let _ = w.eval("window.__wa_open_features && window.__wa_open_features();");
                    }
                }
                "reload" => {
                    if let Some(w) = app.get_webview_window("main") {
                        let _ = w.eval("window.location.reload();");
                    }
                }
                "quit" => {
                    app.exit(0);
                }
                _ => {}
            }
        })
        .on_tray_icon_event(move |tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                let app = tray.app_handle();
                if let Some(w) = app.get_webview_window("main") {
                    if w.is_visible().unwrap_or(false)
                        && !w.is_minimized().unwrap_or(false)
                    {
                        state_for_tray_click.is_window_focused.store(false, Ordering::SeqCst);
                        let _ = w.eval("window.__wa_set_focused && window.__wa_set_focused(false);");
                        let _ = w.hide();
                    } else {
                        state_for_tray_click.is_window_focused.store(true, Ordering::SeqCst);
                        let _ = w.show();
                        let _ = w.unminimize();
                        let _ = w.set_focus();
                        let _ = w.eval("window.__wa_set_focused && window.__wa_set_focused(true);");
                    }
                }
            }
        })
        .build(app)?;

    Ok(())
}
