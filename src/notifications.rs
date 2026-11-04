use std::process::Command;
use std::sync::Arc;
use std::time::Instant;
use tauri::WebviewWindow;

use crate::config::debug_log;
use crate::state::AppState;

pub fn sanitize_text(s: &str) -> String {
    s.chars()
        .filter(|c| !matches!(*c, '\u{200E}' | '\u{200F}' | '\u{202A}'..='\u{202E}' | '\u{2066}'..='\u{2069}'))
        .collect::<String>()
        .trim()
        .to_string()
}

pub fn extract_unread_count(title: &str) -> u32 {
    if let Some(start) = title.find('(') {
        if let Some(end) = title[start..].find(')') {
            let num_str = &title[start + 1..start + end];
            let ascii_str: String = num_str
                .chars()
                .map(|c| match c {
                    '٠' | '۰' => '0',
                    '١' | '۱' => '1',
                    '٢' | '۲' => '2',
                    '٣' | '۳' => '3',
                    '٤' | '۴' => '4',
                    '٥' | '۵' => '5',
                    '٦' | '۶' => '6',
                    '٧' | '۷' => '7',
                    '٨' | '۸' => '8',
                    '٩' | '۹' => '9',
                    c if c.is_ascii_digit() => c,
                    _ => ' ',
                })
                .collect();
            if let Some(num) = ascii_str.split_whitespace().next().and_then(|d| d.parse::<u32>().ok()) {
                return num;
            }
        }
    }
    0
}

pub fn show_desktop_notification(
    state: &Arc<AppState>,
    title: &str,
    message: &str,
    target_chat: Option<String>,
) {
    let clean_title = sanitize_text(title);
    let title_owned = if clean_title.is_empty() {
        "WhatsApp".to_string()
    } else {
        clean_title
    };

    let clean_msg = sanitize_text(message);
    let message_owned = if clean_msg.is_empty() {
        "New message".to_string()
    } else {
        clean_msg
    };

    let icon_str = state.icon_path.to_string_lossy().to_string();

    // Store pending chat target
    if let Some(chat) = target_chat {
        let clean_chat = sanitize_text(&chat);
        if !clean_chat.is_empty() && clean_chat != "WhatsApp" {
            if let Ok(mut pending) = state.pending_chat_target.lock() {
                *pending = Some((clean_chat, Instant::now()));
            }
        }
    }

    // 1. Try official Tauri Notification plugin (cross-platform: WinRT, macOS UserNotifications, Linux DBus)
    let plugin_sent = {
        if let Ok(handle_guard) = state.app_handle.lock() {
            if let Some(app) = handle_guard.as_ref() {
                use tauri_plugin_notification::NotificationExt;
                let res = app
                    .notification()
                    .builder()
                    .title(&title_owned)
                    .body(&message_owned)
                    .show();
                res.is_ok()
            } else {
                false
            }
        } else {
            false
        }
    };

    // 2. OS-Native fallback if plugin was not yet ready or failed
    if !plugin_sent {
        std::thread::spawn(move || {
            debug_log(&format!(
                "DESKTOP-NOTIF FALLBACK: title='{}' body='{}'",
                title_owned, message_owned
            ));

            #[cfg(target_os = "linux")]
            {
                let mut cmd = Command::new("notify-send");
                cmd.arg("-a")
                    .arg("WhatsApp")
                    .arg("-i")
                    .arg(&icon_str)
                    .arg("-u")
                    .arg("normal")
                    .arg(&title_owned)
                    .arg(&message_owned);
                let _ = cmd.output();
            }

            #[cfg(target_os = "macos")]
            {
                let mut cmd = Command::new("osascript");
                let script = format!(
                    "display notification \"{}\" with title \"{}\"",
                    message_owned.replace('"', "\\\""),
                    title_owned.replace('"', "\\\"")
                );
                cmd.arg("-e").arg(&script);
                let _ = cmd.output();
            }

            #[cfg(target_os = "windows")]
            {
                let script = format!(
                    r#"[Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] > $null;
$template = [Windows.UI.Notifications.ToastNotificationManager]::GetTemplateContent([Windows.UI.Notifications.ToastTemplateType]::ToastText02);
$textNodes = $template.GetElementsByTagName('text');
$textNodes.Item(0).AppendChild($template.CreateTextNode('{}')) > $null;
$textNodes.Item(1).AppendChild($template.CreateTextNode('{}')) > $null;
$toast = [Windows.UI.Notifications.ToastNotification::CreateToastNotification]($template);
[Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier('WhatsApp').Show($toast);"#,
                    title_owned.replace('\'', "''"),
                    message_owned.replace('\'', "''")
                );
                let mut cmd = Command::new("powershell");
                cmd.arg("-NoProfile")
                    .arg("-ExecutionPolicy")
                    .arg("Bypass")
                    .arg("-Command")
                    .arg(&script);
                let _ = cmd.output();
            }
        });
    }
}

pub fn open_chat(window: &WebviewWindow, chat_name: &str) {
    let escaped_name = serde_json::to_string(chat_name).unwrap_or_else(|_| format!("\"{}\"", chat_name));
    let js = format!(
        r#"
        (function() {{
            const targetName = {escaped};
            console.log("[WhatsApp-Desktop] openChat requested for:", targetName);

            function findAndClickChat() {{
                const chatList = document.querySelector('div[aria-label="Chat list"]')
                    || document.querySelector('#pane-side')
                    || document.querySelector('div[role="grid"]');

                if (!chatList) {{
                    console.log("[WhatsApp-Desktop] Chat list container not found yet");
                    return false;
                }}

                const rows = chatList.querySelectorAll('div[role="row"], div[role="listitem"], div._ak8l, div[tabindex="-1"]');
                for (const row of rows) {{
                    const titleEl = row.querySelector('span[title], span._ao3e, span[dir="auto"]');
                    if (titleEl) {{
                        const title = titleEl.getAttribute('title') || titleEl.textContent;
                        if (title && (title.trim() === targetName.trim() || title.includes(targetName) || targetName.includes(title))) {{
                            console.log("[WhatsApp-Desktop] Found matching chat element, clicking:", title);
                            const clickable = row.querySelector('div[tabindex="0"]') || row;
                            clickable.dispatchEvent(new MouseEvent('mousedown', {{ bubbles: true, cancelable: true, view: window }}));
                            clickable.dispatchEvent(new MouseEvent('mouseup', {{ bubbles: true, cancelable: true, view: window }}));
                            clickable.click();
                            return true;
                        }}
                    }}
                }}
                return false;
            }}

            if (!findAndClickChat()) {{
                console.log("[WhatsApp-Desktop] Chat not in initial view, focusing search box");
                const searchBox = document.querySelector('div[contenteditable="true"][data-tab="3"]')
                    || document.querySelector('div[aria-label="Search"]')
                    || document.querySelector('div[role="textbox"]');
                if (searchBox) {{
                    searchBox.focus();
                    try {{
                        document.execCommand('insertText', false, targetName);
                    }} catch(e) {{
                        searchBox.textContent = targetName;
                    }}
                    searchBox.dispatchEvent(new InputEvent('input', {{ bubbles: true, cancelable: true }}));
                    setTimeout(findAndClickChat, 600);
                }}
            }}
        }})();
        "#,
        escaped = escaped_name
    );
    let _ = window.eval(&js);
}
