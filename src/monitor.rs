use std::sync::atomic::Ordering;
use std::sync::{Arc, OnceLock};
use std::time::{Duration, Instant};
use tauri::{AppHandle, Manager};

use crate::config::debug_log;
use crate::notifications::{extract_unread_count, sanitize_text, show_desktop_notification};
use crate::scripts::POLL_SCRIPT;
use crate::state::{AppState, PollResult};

static NORMAL_ICON: OnceLock<tauri::image::Image<'static>> = OnceLock::new();
static UNREAD_ICON: OnceLock<tauri::image::Image<'static>> = OnceLock::new();

fn get_normal_icon() -> &'static tauri::image::Image<'static> {
    NORMAL_ICON.get_or_init(|| {
        tauri::image::Image::from_bytes(include_bytes!("../icons/128x128.png"))
            .expect("valid normal icon bytes")
    })
}

fn get_unread_icon() -> &'static tauri::image::Image<'static> {
    UNREAD_ICON.get_or_init(|| {
        tauri::image::Image::from_bytes(include_bytes!("../icons/128x128_unread.png"))
            .expect("valid unread icon bytes")
    })
}

pub fn start_background_monitor(app_handle: AppHandle, state: Arc<AppState>) {
    tauri::async_runtime::spawn(async move {
        let mut interval = tokio::time::interval(Duration::from_millis(2000));

        loop {
            interval.tick().await;

            let Some(w) = app_handle.get_webview_window("main") else {
                continue;
            };

            let app_h = app_handle.clone();
            let st = Arc::clone(&state);

            let _ = w.eval_with_callback(POLL_SCRIPT, move |res| {
                let preview: String = res.chars().take(300).collect();
                debug_log(&format!("POLL CALLBACK FIRED: res_len={} res_preview='{}'", res.len(), preview));
                if res == "null" || res.is_empty() {
                    debug_log("POLL: res is null/empty, returning");
                    return;
                }

                let poll: PollResult = if let Ok(p) = serde_json::from_str::<PollResult>(&res) {
                    debug_log("POLL: parsed directly");
                    p
                } else if let Ok(s) = serde_json::from_str::<String>(&res) {
                    if s == "null" || s.is_empty() {
                        debug_log("POLL: double-decode string is null/empty");
                        return;
                    }
                    match serde_json::from_str::<PollResult>(&s) {
                        Ok(p) => {
                            debug_log("POLL: parsed via double-decode");
                            p
                        },
                        Err(e) => {
                            debug_log(&format!("POLL: double-decode parse FAILED: {}", e));
                            return;
                        },
                    }
                } else {
                    let failed_preview: String = res.chars().take(200).collect();
                    debug_log(&format!("POLL: BOTH parses FAILED for: '{}'", failed_preview));
                    return;
                };

                debug_log(&format!("POLL DATA: count={} prev_count={} sound={} notifs={} sender={:?} body={:?}",
                    poll.unread_count, st.unread_count.load(Ordering::SeqCst), poll.sound_played, poll.notifs.len(),
                    poll.latest_sender, poll.latest_body));

                // Handle shortcut actions from webview
                if let Some(action) = poll.action {
                    match action.as_str() {
                        "quit" => {
                            app_h.exit(0);
                            return;
                        }
                        "hide" => {
                            st.is_window_focused.store(false, Ordering::SeqCst);
                            if let Some(win) = app_h.get_webview_window("main") {
                                let _ = win.eval("window.__wa_set_focused && window.__wa_set_focused(false);");
                                let _ = win.hide();
                            }
                        }
                        _ => {}
                    }
                }

                // Determine unread count from WhatsApp title (most accurate) or DOM
                let title_count = poll.title_count;
                let prev_title_count = st.title_count.swap(title_count, Ordering::SeqCst);

                let count = if poll.title_count > 0 {
                    poll.title_count
                } else if poll.unread_count > 0 {
                    poll.unread_count
                } else {
                    poll.title.as_deref().map(extract_unread_count).unwrap_or(0)
                };
                let prev_count = st.unread_count.swap(count, Ordering::SeqCst);

                // Only update tray and window icon when count actually changes
                if count != prev_count {
                    if let Some(tray) = app_h.tray_by_id("main-tray") {
                        // Never display number text in tray - use Discord-style red badge dot instead
                        let _ = tray.set_title(None::<&str>);

                        if count > 0 {
                            let _ = tray.set_icon(Some(get_unread_icon().clone()));
                            let _ = tray.set_tooltip(Some("WhatsApp (Unread messages)"));
                        } else {
                            let _ = tray.set_icon(Some(get_normal_icon().clone()));
                            let _ = tray.set_tooltip(Some("WhatsApp"));
                        }
                    }

                    if let Some(win) = app_h.get_webview_window("main") {
                        let title = if count > 0 {
                            format!("• WhatsApp ({})", count)
                        } else {
                            "WhatsApp".to_string()
                        };
                        let _ = win.set_title(&title);

                        if count > 0 {
                            let _ = win.set_icon(get_unread_icon().clone());
                        } else {
                            let _ = win.set_icon(get_normal_icon().clone());
                        }
                    }
                }

                // Helper to send debounced notification
                let try_send_notif = |title: &str, body: &str, target_chat: Option<String>| {
                    let clean_t = sanitize_text(title);
                    let clean_b = sanitize_text(body);
                    let t = if clean_t.is_empty() { "WhatsApp" } else { &clean_t };
                    let b = if clean_b.is_empty() { "New message" } else { &clean_b };

                    // Ignore generic placeholder notifications
                    if (t == "WhatsApp" || t.is_empty()) && (b == "New message" || b.is_empty()) {
                        return;
                    }

                    let key = format!("{}::{}", t, b);

                    // Check deduplication history (messages notified in the last 15 minutes)
                    let already_notified = {
                        if let Ok(mut hist) = st.notified_messages.lock() {
                            hist.retain(|(_, time)| time.elapsed() < Duration::from_secs(900));
                            if hist.iter().any(|(k, _)| k == &key) {
                                true
                            } else {
                                hist.push((key.clone(), Instant::now()));
                                false
                            }
                        } else {
                            false
                        }
                    };

                    if already_notified {
                        debug_log(&format!("IGNORING ALREADY NOTIFIED: '{}'", key));
                        return;
                    }

                    // Global rate limit: at least 600ms between successive notifications
                    if let Ok(mut last_time) = st.last_notif_time.lock() {
                        if last_time.elapsed() < Duration::from_millis(600) {
                            debug_log(&format!("RATE LIMITED NOTIF: '{}'", key));
                            return;
                        }
                        *last_time = Instant::now();
                    }

                    debug_log(&format!("TRIGGERING NOTIFICATION: title='{}', body='{}', target='{:?}'", t, b, target_chat));
                    show_desktop_notification(&st, t, b, target_chat);
                };

                // Determine the best sender and message preview (ignoring Archived/WhatsApp)
                let effective_sender = poll.latest_sender
                    .as_deref()
                    .filter(|s| *s != "WhatsApp" && *s != "Archived" && !s.is_empty())
                    .unwrap_or("WhatsApp");

                let effective_body = poll.latest_body
                    .as_deref()
                    .filter(|b| !b.is_empty())
                    .unwrap_or("New message");

                let target = if effective_sender != "WhatsApp" {
                    Some(effective_sender.to_string())
                } else {
                    None
                };

                // Check if the top chat message changed while window is unfocused
                let top_snippet = format!("{}::{}",
                    poll.top_sender.as_deref().unwrap_or(""),
                    poll.top_body.as_deref().unwrap_or(""));

                let top_message_changed = {
                    if let Ok(mut last) = st.last_top_snippet.lock() {
                        if !top_snippet.is_empty() && *last != top_snippet {
                            let is_first = last.is_empty();
                            *last = top_snippet.clone();
                            !is_first
                        } else {
                            false
                        }
                    } else {
                        false
                    }
                };

                let is_focused = st.is_window_focused.load(Ordering::SeqCst);

                // 1. Process explicit notifications from WhatsApp hooks
                let mut sent_hook_notif = false;
                for n in poll.notifs {
                    let title = n.title.unwrap_or_else(|| effective_sender.into());
                    let body = n.body.unwrap_or_else(|| effective_body.into());
                    let notif_target = if title != "WhatsApp" { Some(title.clone()) } else { target.clone() };
                    try_send_notif(&title, &body, notif_target);
                    sent_hook_notif = true;
                }

                let mut notify = false;

                // A notification should ONLY be triggered if there is ACTUALLY an unread message!
                let has_unread = count > 0 || title_count > 0;

                // 2. If WhatsApp title count increased (e.g. (1) -> (2))
                if title_count > prev_title_count && title_count > 0 {
                    debug_log(&format!("NOTIF REASON: title_count increased from {} to {}", prev_title_count, title_count));
                    notify = true;
                }

                // 3. If total unread count increased and is > 0
                if count > prev_count && count > 0 {
                    debug_log(&format!("NOTIF REASON: count increased from {} to {}", prev_count, count));
                    notify = true;
                }

                // 4. If WhatsApp played notification chime and there are unread messages
                if poll.sound_played && has_unread {
                    debug_log("NOTIF REASON: sound_played is true with unread messages");
                    notify = true;
                }

                // 5. If top chat message changed while window is not focused AND has unread messages!
                // NEVER notify on top_message_changed if count == 0 (seen/read messages)!
                if top_message_changed && !is_focused && has_unread && (count > 0 || poll.sound_played) {
                    debug_log(&format!("NOTIF REASON: top_message_changed while unfocused with unread count {}", count));
                    notify = true;
                }

                if !sent_hook_notif && notify && has_unread {
                    if effective_sender != "WhatsApp" {
                        try_send_notif(effective_sender, effective_body, target.clone());
                    } else {
                        try_send_notif("WhatsApp", effective_body, None);
                    }
                }
            });
        }
    });
}

