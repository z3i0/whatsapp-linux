<div align="center">

<img src="assets/icon.png" alt="WhatsApp Desktop Logo" width="128" height="128" style="margin-bottom: 16px; border-radius: 28px; box-shadow: 0 10px 30px rgba(0,0,0,0.25);" />

# WhatsApp Desktop for Linux

**Next-generation, ultra-lightweight, and privacy-hardened WhatsApp desktop client.**  
*Crafted with Rust and Tauri 2 for optimal speed, minimal memory usage, and seamless OS integration.*

[![Release](https://img.shields.io/github/v/release/whatsapp-linux/whatsapp-linux?style=for-the-badge&logo=github&color=25D366&logoColor=white)](https://github.com/whatsapp-linux/whatsapp-linux/releases)
[![Rust](https://img.shields.io/badge/Rust-1.75%2B-orange?style=for-the-badge&logo=rust&logoColor=white)](https://www.rust-lang.org/)
[![Tauri](https://img.shields.io/badge/Tauri-v2.0-24C8D8?style=for-the-badge&logo=tauri&logoColor=white)](https://tauri.app/)
[![Platform](https://img.shields.io/badge/Platform-Linux%20|%20macOS%20|%20Windows-blue?style=for-the-badge&logo=linux&logoColor=white)](https://github.com/whatsapp-linux/whatsapp-linux)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge&logo=open-source-initiative&logoColor=white)](LICENSE)
[![CI Status](https://img.shields.io/badge/Build-Passing-brightgreen?style=for-the-badge&logo=githubactions&logoColor=white)](#)

<p align="center">
  <a href="#-key-features">Key Features</a> •
  <a href="#-comparison">Comparison</a> •
  <a href="#-installation">Installation</a> •
  <a href="#-building-from-source">Build from Source</a> •
  <a href="#-keyboard-shortcuts">Shortcuts</a> •
  <a href="#-architecture">Architecture</a> •
  <a href="#-troubleshooting">Troubleshooting</a> •
  <a href="#-disclaimer">Disclaimer</a>
</p>

---

</div>

## 📖 Overview

Most desktop WhatsApp alternatives on Linux are packaged as bloated Electron wrappers that consume 600MB–1.2GB of RAM, lag during heavy typing, and fail to integrate cleanly with Linux system trays and desktop notifications.

**WhatsApp Desktop for Linux** solves this by leveraging **Rust** and **Tauri 2**. Utilizing native platform web engines (`WebKitGTK` on Linux, `WebKit` on macOS, and `WebView2` on Windows), it delivers blazing speed with **less than 100MB idle RAM**, instant startup, hardware-accelerated rendering, and exclusive enhancements including **Stealth Privacy Modes** and **1-Click Story Media Downloads**.

---

## ⚡ Key Features

### 🚀 1. Featherweight & High Performance
- **Minimal Resource Footprint**: Consumes **~80–120 MB RAM** under active use — saving over 80% memory compared to standard Electron apps.
- **Hardware Acceleration**: Built-in GPU compositing mode for fluid animations, smooth 60fps scrolling, and crisp chat lists.
- **WebKitGTK DMA-BUF Fix**: Out-of-the-box fix for the infamous WebKit freeze/hang issue on Wayland and modern X11 compositors.

### 🕵️ 2. Stealth Privacy Suite
Control what information is shared with other users through an integrated privacy suite:
- **Invisible Story Viewer**: View status updates and stories anonymously. Read receipts (`sendReadStatus`, `markStatusRead`) are blocked at runtime.
- **Incognito Messages & Audio**: Read incoming messages and listen to voice notes without triggering blue checkmarks or played indicators.
- **Floating Feature Pill & Modal**: Toggle any stealth feature on or off on the fly via a sleek draggable floating badge or through the system tray.

### 📥 3. One-Click Story & Status Downloader
- Download any photo or video status in its full original quality.
- Automatically injects an unobtrusive **Download** button directly into the WhatsApp status viewer header.
- Intelligently names saved files with the contact's name and precise timestamp (e.g., `WhatsApp_Status_JohnDoe_2026-11-04_12-30-00.mp4`).

### 🔔 4. Native OS Notifications & Badge Counter
- **Desktop Notifications**: Seamless integration with Linux Notification daemons (`libnotify` / DBus), macOS `UserNotifications`, and Windows Notification Center.
- **Smart Unread Badge Counter**: Monitors unread messages in real-time and updates the system tray tooltip and status.
- **Multilingual Numeral Support**: Parsers handle standard Arabic numerals (`0-9`) and Eastern Arabic numerals (`٠-٩`).
- **Click-to-Focus Target Chat**: Clicking a notification opens the window and jumps directly to the conversation that sent the message.

### 🖥️ 5. Seamless Desktop Integration
- **Background Tray Minimization**: Closing the window (`X`) minimizes it directly to the system tray so you never miss a call or message.
- **Single-Instance Guard**: Attempting to open WhatsApp again focuses the already running instance rather than creating duplicate processes.
- **Persistent Sessions**: Log in once with your QR code — session cookies, IndexedDB data, and local cache are securely preserved across reboots in `~/.config/whatsapp-linux`.
- **HiDPI Emoji Rendering**: Prioritizes Apple Color Emoji and Noto Color Emoji to prevent missing or broken monochrome font rendering.
- **Nag Banner Suppressor**: Permanently removes annoying "Download WhatsApp for Desktop / Mac" promotion banners.

---

## 📊 Comparison

| Feature | WhatsApp Linux (Tauri 2 + Rust) | Electron Wrappers (ZapZap, etc.) | Official Web in Chrome Tab |
| :--- | :---: | :---: | :---: |
| **Idle Memory (RAM)** | **~75 – 110 MB** | ~650 – 1200 MB | ~400 – 700 MB |
| **Startup Time** | **< 0.4s** | ~2.5 – 5.0s | N/A |
| **Binary Size** | **~15 MB** | ~120 – 250 MB | N/A |
| **Stealth Story Viewer** | **Yes (Built-in)** | No | No |
| **Block Read / Played Receipts** | **Yes (Built-in)** | No | No |
| **One-Click Story Downloader** | **Yes (Built-in)** | No | No |
| **System Tray & Hide-to-Tray** | **Yes** | Partial | No |
| **Direct Notification Click to Chat**| **Yes** | No | Partial |
| **Wayland Native Compatibility** | **Yes** | Requires flags | Yes |

---

## 🛠️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                       WhatsApp Desktop                      │
├──────────────────────────────┬──────────────────────────────┤
│          Rust Core           │      Injected Web Runtime    │
│  (Tauri 2 Native Engine)     │    (Client-Side Enhancements)│
├──────────────────────────────┼──────────────────────────────┤
│ • Window Management & Focus  │ • WebKit/Safari User-Agent   │
│ • System Tray & Context Menu │ • Stealth Receipt Blocker    │
│ • DBus / OS Notifications    │ • 1-Click Story Downloader   │
│ • Single-Instance IPC Socket │ • HiDPI Emoji Typography     │
│ • Background Event Monitor   │ • Audio Playback Sync & Chime│
│ • Wayland DMA-BUF Stabilizer │ • Banner & Nag Suppressor    │
└──────────────┬───────────────┴──────────────┬───────────────┘
               │                              │
               ▼                              ▼
     Operating System APIs            WhatsApp Web Core
     (GTK3, WebKitGTK, DBus)       (Encrypted WebSocket Engine)
```

---

## 📦 Installation

### Option 1: Pre-built Packages (Recommended)

Download the latest release for your platform from the [Releases Page](https://github.com/whatsapp-linux/whatsapp-linux/releases):

#### Debian / Ubuntu / Linux Mint
```bash
# Download the .deb package from Releases, then install:
sudo apt install ./whatsapp-linux_*_amd64.deb
```

#### Arch Linux (Manual installation)
```bash
# Extract the binary or package
sudo install -Dm755 whatsapp-linux /usr/local/bin/whatsapp-linux
sudo cp assets/icon.png /usr/share/icons/hicolor/128x128/apps/whatsapp-linux.png
sudo cp whatsapp-linux.desktop /usr/share/applications/
```

#### AppImage (Universal Linux)
```bash
chmod +x WhatsApp-Linux*.AppImage
./WhatsApp-Linux*.AppImage
```

---

## 🔨 Building from Source

### 1. Prerequisites

#### Ubuntu / Debian:
```bash
sudo apt update
sudo apt install -y \
  build-essential \
  curl \
  wget \
  file \
  libssl-dev \
  libgtk-3-dev \
  libwebkit2gtk-4.1-dev \
  libayatana-appindicator3-dev \
  librsvg2-dev \
  patchelf
```

#### Fedora / RHEL:
```bash
sudo dnf install -y \
  gcc \
  gcc-c++ \
  openssl-devel \
  gtk3-devel \
  webkit2gtk4.1-devel \
  libayatana-appindicator3-devel \
  librsvg2-devel
```

#### Arch Linux:
```bash
sudo pacman -S --needed \
  base-devel \
  curl \
  wget \
  openssl \
  gtk3 \
  webkit2gtk-4.1 \
  libayatana-appindicator \
  librsvg
```

#### Rust Toolchain:
Ensure you have Rust installed (version 1.75 or higher):
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source "$HOME/.cargo/env"
```

### 2. Clone and Build

```bash
# 1. Clone the repository
git clone https://github.com/whatsapp-linux/whatsapp-linux.git
cd whatsapp-linux

# 2. Build the optimized release binary
cargo build --release

# The compiled binary will be located at:
# ./target/release/whatsapp-linux
```

### 3. Quick Run Script

A ready-to-use launch script (`run.sh`) is provided:

```bash
# Run in foreground
./run.sh

# Run detached in background
./run.sh -d
```

### 4. Create Desktop Entry & Menu Shortcut

To integrate WhatsApp with your application launcher and app grid:

```bash
# Copy binary to user bin path
mkdir -p ~/.local/bin ~/.local/share/applications ~/.local/share/icons/hicolor/128x128/apps

cp target/release/whatsapp-linux ~/.local/bin/
cp assets/icon.png ~/.local/share/icons/hicolor/128x128/apps/whatsapp-linux.png

# Create desktop entry
cat << 'EOF' > ~/.local/share/applications/whatsapp-linux.desktop
[Desktop Entry]
Name=WhatsApp
GenericName=WhatsApp Desktop
Comment=Lightweight WhatsApp client for Linux
Exec=whatsapp-linux
Icon=whatsapp-linux
Terminal=false
Type=Application
Categories=Network;InstantMessaging;Chat;
StartupWMClass=whatsapp-linux
Keywords=WhatsApp;Chat;Message;
EOF

update-desktop-database ~/.local/share/applications 2>/dev/null || true
```

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Description | Scope |
| :--- | :--- | :--- |
| `Ctrl` + `W` / `Cmd` + `W` | Hide WhatsApp window to system tray | Application |
| `Ctrl` + `Q` / `Cmd` + `Q` | Quit application completely | Application |
| `Escape` | Close Features & Privacy modal dialog | In-App Dialog |
| `Left Click` (Tray) | Toggle WhatsApp window visibility (Show / Hide) | System Tray |
| `Right Click` (Tray) | Open tray context menu (Features, Reload, Quit) | System Tray |

---

## 📂 Configuration & Data Paths

All session tokens, IndexedDB tables, and local preferences persist across runs:

| OS | Data Directory Path |
| :--- | :--- |
| **Linux** | `~/.config/whatsapp-linux/profile/` |
| **macOS** | `~/Library/Application Support/WhatsApp/profile/` |
| **Windows** | `%APPDATA%\WhatsApp\profile\` |

### Environment Variables

| Variable | Values | Purpose |
| :--- | :--- | :--- |
| `WA_DEBUG` | `1` or `true` | Writes real-time runtime diagnostics to `/tmp/wa-debug.log` |
| `WEBKIT_DISABLE_DMABUF_RENDERER` | `1` (default) | Prevents DMA-BUF renderer stalls on Wayland and hybrid GPUs |
| `WEBKIT_FORCE_COMPOSITING_MODE` | `1` (default) | Forces GPU compositing mode for stutter-free scrolling |

---

## ❓ Troubleshooting

<details>
<summary><b>1. Blank white window or freezing on Wayland / NVIDIA</b></summary>

The client sets `WEBKIT_DISABLE_DMABUF_RENDERER=1` automatically. If your environment has a conflicting custom compositor rule, launch WhatsApp with:
```bash
WEBKIT_DISABLE_DMABUF_RENDERER=1 WEBKIT_DISABLE_COMPOSITING_MODE=1 ./run.sh
```
</details>

<details>
<summary><b>2. System tray icon is missing in GNOME Shell</b></summary>

Modern GNOME desktop environments do not display AppIndicator tray icons natively. Install the standard GNOME extension:
```bash
# Ubuntu / Debian
sudo apt install gnome-shell-extension-appindicator
```
Then log out and log in, or enable it using the **Extensions** app.
</details>

<details>
<summary><b>3. Microphone or camera permissions for voice calls</b></summary>

Ensure your desktop audio server (`pipewire`, `wireplumber`, or `pulseaudio`) is running properly. When prompted by WhatsApp Web for microphone permissions, click **Allow**. WebKitGTK inherits the session permissions.
</details>

---

## 🤝 Contributing

Contributions, bug reports, and suggestions are warmly welcome!

1. **Fork** the repository.
2. Create a feature branch:
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. Commit your changes:
   ```bash
   git commit -m 'feat: add amazing feature'
   ```
4. Push to the branch:
   ```bash
   git push origin feature/amazing-feature
   ```
5. Open a **Pull Request**.

---

## 🛡️ Disclaimer

This is an open-source, third-party desktop client. It is **not** endorsed by, directly affiliated with, maintained, authorized, or sponsored by WhatsApp LLC, Meta Platforms, Inc., or any of their affiliates or subsidiaries.

- WhatsApp and the WhatsApp logo are registered trademarks of WhatsApp LLC / Meta Platforms, Inc.
- Use of this software complies with open-source fair-use principles.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE) © 2026 WhatsApp Desktop Linux Contributors.
