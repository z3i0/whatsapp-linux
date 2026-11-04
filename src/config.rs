use std::fs;
use std::io::Write;
use std::path::PathBuf;

#[cfg(target_os = "windows")]
pub const USER_AGENT: &str =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

#[cfg(not(target_os = "windows"))]
pub const USER_AGENT: &str =
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Safari/605.1.15";

pub const WHATSAPP_URL: &str = "https://web.whatsapp.com";

pub fn debug_log(msg: &str) {
    static DEBUG_ENABLED: std::sync::OnceLock<bool> = std::sync::OnceLock::new();
    let enabled = *DEBUG_ENABLED.get_or_init(|| {
        cfg!(debug_assertions) || std::env::var("WA_DEBUG").map(|v| v == "1" || v == "true").unwrap_or(false)
    });

    if !enabled {
        return;
    }

    let log_path = std::env::temp_dir().join("wa-debug.log");
    if let Ok(mut f) = fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(log_path)
    {
        let now = chrono::Local::now().format("%H:%M:%S%.3f");
        let _ = writeln!(f, "[{}] {}", now, msg);
    }
}

pub fn init_environment() {
    #[cfg(target_os = "linux")]
    {
        // Fix for WebKitGTK freezing/stalling on Wayland and X11 when window loses/regains focus or hides/shows
        std::env::set_var("WEBKIT_DISABLE_DMABUF_RENDERER", "1");

        // Enable GPU hardware accelerated compositing for smooth animations and scrolling
        if std::env::var_os("WEBKIT_FORCE_COMPOSITING_MODE").is_none() {
            std::env::set_var("WEBKIT_FORCE_COMPOSITING_MODE", "1");
        }
    }
}

pub fn get_data_dir() -> PathBuf {
    #[cfg(target_os = "windows")]
    {
        if let Ok(appdata) = std::env::var("APPDATA") {
            let dir = PathBuf::from(appdata).join("WhatsApp").join("profile");
            fs::create_dir_all(&dir).ok();
            return dir;
        }
        if let Ok(userprofile) = std::env::var("USERPROFILE") {
            let dir = PathBuf::from(userprofile).join(".whatsapp").join("profile");
            fs::create_dir_all(&dir).ok();
            return dir;
        }
    }

    #[cfg(target_os = "macos")]
    {
        if let Ok(home) = std::env::var("HOME") {
            let dir = PathBuf::from(home)
                .join("Library")
                .join("Application Support")
                .join("WhatsApp")
                .join("profile");
            fs::create_dir_all(&dir).ok();
            return dir;
        }
    }

    // Default / Linux fallback: Keep backward compatibility with existing profile
    let home = std::env::var("HOME").unwrap_or_else(|_| ".".into());
    let data_dir = PathBuf::from(home).join(".config").join("whatsapp-linux");
    let profile_dir = data_dir.join("profile");
    fs::create_dir_all(&profile_dir).ok();
    profile_dir
}

pub fn get_icon_path() -> PathBuf {
    if let Ok(exe) = std::env::current_exe() {
        if let Some(parent) = exe.parent() {
            let direct = parent.join("assets").join("icon.png");
            if direct.exists() {
                return direct.canonicalize().unwrap_or(direct);
            }
            let root = parent.join("../..").join("assets").join("icon.png");
            if root.exists() {
                return root.canonicalize().unwrap_or(root);
            }
            #[cfg(target_os = "macos")]
            {
                let res = parent.join("../Resources/assets/icon.png");
                if res.exists() {
                    return res.canonicalize().unwrap_or(res);
                }
            }
        }
    }
    PathBuf::from("assets/icon.png")
}
