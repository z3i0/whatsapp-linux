use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, AtomicU32};
use std::sync::Mutex;
use std::time::{Duration, Instant};
use tauri::AppHandle;

#[derive(Debug, Deserialize, Serialize)]
pub struct PendingNotif {
    pub title: Option<String>,
    pub body: Option<String>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct PollResult {
    pub title: Option<String>,
    pub action: Option<String>,
    #[serde(default)]
    pub notifs: Vec<PendingNotif>,
    #[serde(rename = "latestSender")]
    pub latest_sender: Option<String>,
    #[serde(rename = "latestBody")]
    pub latest_body: Option<String>,
    #[serde(rename = "topSender")]
    pub top_sender: Option<String>,
    #[serde(rename = "topBody")]
    pub top_body: Option<String>,
    #[serde(rename = "unreadCount", default)]
    pub unread_count: u32,
    #[serde(rename = "titleCount", default)]
    pub title_count: u32,
    #[serde(rename = "soundPlayed", default)]
    pub sound_played: bool,
}

pub struct AppState {
    pub unread_count: AtomicU32,
    pub title_count: AtomicU32,
    pub is_window_focused: AtomicBool,
    pub last_bg_notif_time: Mutex<Instant>,
    pub last_notif_time: Mutex<Instant>,
    pub notified_messages: Mutex<Vec<(String, Instant)>>,
    pub last_top_snippet: Mutex<String>,
    pub pending_chat_target: Mutex<Option<(String, Instant)>>,
    pub icon_path: PathBuf,
    pub app_handle: Mutex<Option<AppHandle>>,
}

impl AppState {
    pub fn new(icon_path: PathBuf) -> Self {
        Self {
            unread_count: AtomicU32::new(0),
            title_count: AtomicU32::new(0),
            is_window_focused: AtomicBool::new(true),
            last_bg_notif_time: Mutex::new(Instant::now() - Duration::from_secs(60)),
            last_notif_time: Mutex::new(Instant::now() - Duration::from_secs(10)),
            notified_messages: Mutex::new(Vec::new()),
            last_top_snippet: Mutex::new(String::new()),
            pending_chat_target: Mutex::new(None),
            icon_path,
            app_handle: Mutex::new(None),
        }
    }
}
