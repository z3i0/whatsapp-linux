<div align="center">

<img src="assets/icon.png" alt="WhatsApp Desktop Logo" width="128" height="128" style="margin-bottom: 16px; border-radius: 28px; box-shadow: 0 10px 30px rgba(0,0,0,0.25);" />

# WhatsApp Desktop (Unofficial)

**Ultra-lightweight, cross-platform, and privacy-hardened desktop client for WhatsApp Web.**  
*Engineered in Rust & Tauri 2 for Linux, macOS, and Windows.*

[![Release](https://img.shields.io/github/v/release/whatsapp-linux/whatsapp-linux?style=for-the-badge&logo=github&color=25D366&logoColor=white)](https://github.com/whatsapp-linux/whatsapp-linux/releases)
[![Unofficial](https://img.shields.io/badge/Type-Unofficial%20Client-ff5722?style=for-the-badge&logo=whatsapp&logoColor=white)](#-disclaimer)
[![Rust](https://img.shields.io/badge/Rust-1.75%2B-orange?style=for-the-badge&logo=rust&logoColor=white)](https://www.rust-lang.org/)
[![Tauri](https://img.shields.io/badge/Tauri-v2.0-24C8D8?style=for-the-badge&logo=tauri&logoColor=white)](https://tauri.app/)
[![Platforms](https://img.shields.io/badge/Platforms-Linux%20|%20macOS%20|%20Windows-blue?style=for-the-badge&logo=linux&logoColor=white)](https://github.com/whatsapp-linux/whatsapp-linux)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge&logo=open-source-initiative&logoColor=white)](LICENSE)

<p align="center">
  <a href="#-overview">Overview</a> •
  <a href="#-key-features">Key Features</a> •
  <a href="#-comparison">Comparison</a> •
  <a href="#-installation--downloads">Downloads</a> •
  <a href="#-building-from-source">Build from Source</a> •
  <a href="#-keyboard-shortcuts">Shortcuts</a> •
  <a href="#-architecture">Architecture</a> •
  <a href="#-troubleshooting">Troubleshooting</a> •
  <a href="#-disclaimer">Disclaimer</a>
</p>

---

</div>

> [!IMPORTANT]
> **Unofficial Community Client**: This application is an independent, open-source project and is **not an official WhatsApp product**. It is not affiliated with, maintained, authorized, or endorsed by WhatsApp LLC, Meta Platforms, Inc., or any of their subsidiaries. All trademarks belong to their respective owners.

## 📖 Overview

Most desktop WhatsApp clients are bloated Electron wrappers that consume 600MB–1.2GB of RAM, lag during heavy typing, and drain battery life.

**WhatsApp Desktop (Unofficial)** is a multiplatform desktop application written in **Rust** and powered by **Tauri 2**. Rather than bundling an entire Chromium browser, it utilizes native OS web engines:
- 🐧 **Linux**: Native `WebKitGTK 4.1` with hardware acceleration, Wayland/X11 focus stabilization, and DBus integration.
- 🍏 **macOS**: Native `WebKit` with Apple Silicon (M1/M2/M3/M4) & Intel support, native menu bar, and macOS notification center.
- 🪟 **Windows**: Microsoft Edge `WebView2` with native tray, Windows Toast notifications, and background memory compaction.

This architecture delivers a **fast startup (< 0.4s)**, a microscopic footprint (**~80–120 MB RAM**), and exclusive client-side power features like **Stealth Privacy Mode** and **1-Click Story Media Downloads**.

---

## ⚡ Key Features

### 🚀 1. Featherweight & Cross-Platform Performance
- **Minimal Resource Footprint**: Consumes **~80–120 MB RAM** under active use — saving over 80% memory compared to standard Electron apps.
- **Hardware-Accelerated Compositing**: Smooth 60fps scrolling, fluid chat lists, and crystal-clear media preview rendering.
- **Linux Wayland / DMA-BUF Fix**: Out-of-the-box fix for WebKitGTK stalls/freezes on Wayland and hybrid GPU systems.
- **macOS & Windows Optimized**: Native rendering engines for zero background bloat.

### 🕵️ 2. Stealth Privacy Suite
Take total control over your visibility and read receipts without third-party modifications to WhatsApp servers:
- **Invisible Story/Status Viewer**: Watch status photos and videos completely incognito. Status read receipts (`sendReadStatus`, `markStatusRead`) are blocked directly in the client runtime.
- **Incognito Messages & Audio**: Read incoming messages and play voice notes without sending blue ticks or played receipts (`sendSeen`, `sendPlayed` interception).
- **Draggable Features Pill & Quick Settings Modal**: Easily toggle features individually on the fly from an in-app draggable badge or via the system tray menu.

### 📥 3. One-Click Story & Status Downloader
- Download any photo or video status in its full original quality.
- Automatically injects an unobtrusive **Download** button directly into the WhatsApp status viewer interface.
- Intelligently generates readable filenames with contact name and precise timestamps (e.g., `WhatsApp_Status_ContactName_2026-11-04_12-30-00.mp4`).

### 🔔 4. Native OS Notifications & Unread Badge Counter
- **Native System Notifications**:
  - **Linux**: DBus / `libnotify` with click-to-focus action.
  - **macOS**: Native `UserNotifications` with badge support.
  - **Windows**: Windows Action Center Toast notifications.
- **Smart Unread Badge Counter**: Monitors unread messages in real-time and updates the system tray icon and tooltip.
- **Multilingual Numeral Parsing**: Seamlessly parses both Western Arabic digits (`0-9`) and Eastern Arabic digits (`٠-٩`).
- **Direct Notification-to-Chat Focus**: Clicking a notification opens the window and jumps immediately into that specific conversation.

### 🖥️ 5. Seamless Desktop & System Tray Integration
- **Background Tray Minimization**: Closing the window (`X`) minimizes it directly to the system tray/menu bar so you stay reachable without desktop clutter.
- **Single-Instance Guard**: Subsequent application launches automatically restore and focus the existing instance.
- **Persistent Sessions**: Log in once with your QR code — session cookies, IndexedDB storage, and local settings are securely kept across reboots.
- **HiDPI Crisp Emojis**: Prioritizes Apple Color Emoji, Noto Color Emoji, and Segoe UI Emoji to prevent broken monochrome glyphs.
- **Nag Banner Suppressor**: Permanently removes annoying "Download WhatsApp for Desktop / Mac" promotion banners.

---

## 📊 Comparison

| Feature | WhatsApp Desktop (Tauri 2 + Rust) | Electron Desktop Apps | Official Web in Browser Tab |
| :--- | :---: | :---: | :---: |
| **Cross-Platform** | **Linux, macOS, Windows** | Linux / macOS / Windows | Any Browser |
| **Idle Memory (RAM)** | **~75 – 110 MB** | ~650 – 1200 MB | ~400 – 700 MB |
| **Startup Time** | **< 0.4s** | ~2.5 – 5.0s | N/A |
| **Binary Size** | **~15 MB** | ~120 – 250 MB | N/A |
| **Stealth Story Viewer** | **Yes (Built-in)** | No | No |
| **Block Read / Played Receipts** | **Yes (Built-in)** | No | No |
| **One-Click Story Downloader** | **Yes (Built-in)** | No | No |
| **System Tray / Menu Bar** | **Yes (All Platforms)** | Partial | No |
| **Direct Click-to-Chat Focus** | **Yes** | No | Partial |
| **Wayland & HiDPI Native** | **Yes** | Requires flags | Dependent on browser |

---

## 🛠️ Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                       WhatsApp Desktop (Tauri 2)                        │
├────────────────────────────────────┬────────────────────────────────────┤
│             Rust Core              │        Injected Web Runtime        │
│      (Multiplatform Backend)       │      (Client-Side Privacy Suite)   │
├────────────────────────────────────┼────────────────────────────────────┤
│ • Window Lifecycle & Focus Control │ • WebKit / Safari Identity Bridge  │
│ • System Tray & OS Context Menu    │ • Stealth Receipt Interceptor      │
│ • OS Native Notifications          │ • 1-Click Status Downloader        │
│ • Single-Instance IPC Socket       │ • HiDPI Emoji Font Stack           │
│ • Background Event Monitor         │ • Audio Playback Sync & Chime      │
│ • OS Compatibility Layer           │ • Banner & Download Suppressor     │
└─────────────────┬──────────────────┴──────────────────┬─────────────────┘
                  │                                     │
                  ▼                                     ▼
        Native Platform APIs                    WhatsApp Web Core
 ┌─────────────────────────────────┐      ┌───────────────────────────────┐
 │ Linux:   GTK3 / WebKitGTK / DBus│      │ End-to-End Encrypted Sessions │
 │ macOS:   AppKit / WebKit        │      │ WebSocket Event Bus           │
 │ Windows: Win32 / Edge WebView2  │      └───────────────────────────────┘
 └─────────────────────────────────┘
```

---

## 📦 Installation & Downloads

Pre-built binaries for all supported operating systems are published on the [GitHub Releases Page](https://github.com/whatsapp-linux/whatsapp-linux/releases):

### 🐧 Linux

#### Debian / Ubuntu / Linux Mint (.deb)
```bash
# Download the .deb package from Releases, then run:
sudo apt install ./whatsapp-linux_*_amd64.deb
```

#### AppImage (Universal Linux)
```bash
chmod +x WhatsApp-Linux*.AppImage
./WhatsApp-Linux*.AppImage
```

#### Arch Linux / Manjaro
```bash
# Extract binary and install desktop shortcut
sudo install -Dm755 whatsapp-linux /usr/local/bin/whatsapp-linux
sudo cp assets/icon.png /usr/share/icons/hicolor/128x128/apps/whatsapp-linux.png
sudo cp whatsapp-linux.desktop /usr/share/applications/
```

---

### 🍏 macOS

1. Download the **`.dmg`** package from [Releases](https://github.com/whatsapp-linux/whatsapp-linux/releases) (Available for Apple Silicon `aarch64` and Intel `x86_64`).
2. Open the `.dmg` file and drag **WhatsApp** into your **Applications** folder.
3. Launch WhatsApp from Spotlight or Launchpad.

---

### 🪟 Windows

1. Download the **`.exe` (NSIS Installer)** or **`.msi`** from [Releases](https://github.com/whatsapp-linux/whatsapp-linux/releases).
2. Run the installer to install WhatsApp Desktop for your user account.
3. WhatsApp will launch and appear in the Windows System Tray.

---

## 🔨 Building from Source

### 1. Prerequisites

Ensure you have the [Rust toolchain](https://www.rust-lang.org/) installed:
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source "$HOME/.cargo/env"
```

#### Platform-Specific Dependencies:

<details>
<summary><b>🐧 Linux Dependencies (Ubuntu / Debian / Fedora / Arch)</b></summary>

- **Ubuntu / Debian**:
  ```bash
  sudo apt update
  sudo apt install -y build-essential curl wget file libssl-dev libgtk-3-dev libwebkit2gtk-4.1-dev libayatana-appindicator3-dev librsvg2-dev patchelf
  ```
- **Fedora / RHEL**:
  ```bash
  sudo dnf install -y gcc gcc-c++ openssl-devel gtk3-devel webkit2gtk4.1-devel libayatana-appindicator3-devel librsvg2-devel
  ```
- **Arch Linux**:
  ```bash
  sudo pacman -S --needed base-devel curl wget openssl gtk3 webkit2gtk-4.1 libayatana-appindicator librsvg
  ```
</details>

<details>
<summary><b>🍏 macOS Dependencies</b></summary>

- Install Xcode Command Line Tools:
  ```bash
  xcode-select --install
  ```
</details>

<details>
<summary><b>🪟 Windows Dependencies</b></summary>

- [Visual Studio C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) (Select "Desktop development with C++").
- [Microsoft Edge WebView2](https://developer.microsoft.com/en-us/microsoft-edge/webview2/) (Pre-installed on Windows 10/11).
</details>

---

### 2. Clone and Compile

```bash
# 1. Clone the repository
git clone https://github.com/whatsapp-linux/whatsapp-linux.git
cd whatsapp-linux

# 2. Build the optimized production binary
cargo build --release

# The compiled binary will be located at:
# Linux / macOS:  ./target/release/whatsapp-linux
# Windows:        .\target\release\whatsapp-linux.exe
```

On Linux, you can also use the convenient launch script:
```bash
./run.sh        # Run foreground
./run.sh -d     # Run in background
```

---

## ⌨️ Keyboard Shortcuts

| Shortcut (Linux / Windows) | Shortcut (macOS) | Description | Scope |
| :--- | :--- | :--- | :--- |
| `Ctrl` + `W` | `Cmd` + `W` | Hide window to System Tray / Menu Bar | Application |
| `Ctrl` + `Q` | `Cmd` + `Q` | Quit application completely | Application |
| `Escape` | `Escape` | Close Features & Privacy modal dialog | In-App Dialog |
| `Left Click` (Tray) | `Left Click` (Menu Bar)| Show / Hide WhatsApp window | Tray / Menu Bar |
| `Right Click` (Tray)| `Right Click` | Open tray context menu (Features, Reload, Quit) | Tray / Menu Bar |

---

## 📂 Configuration & Data Paths

All session tokens, IndexedDB tables, and local preferences persist across reboots in native standard paths:

| Operating System | Profile & Storage Path |
| :--- | :--- |
| 🐧 **Linux** | `~/.config/whatsapp-linux/profile/` |
| 🍏 **macOS** | `~/Library/Application Support/WhatsApp/profile/` |
| 🪟 **Windows** | `%APPDATA%\WhatsApp\profile\` |

### Environment Variables

| Variable | Values | Purpose |
| :--- | :--- | :--- |
| `WA_DEBUG` | `1` or `true` | Writes runtime diagnostics to temporary debug log (`wa-debug.log`) |
| `WEBKIT_DISABLE_DMABUF_RENDERER` | `1` (Linux default) | Prevents DMA-BUF renderer stalls on Wayland and hybrid GPUs |
| `WEBKIT_FORCE_COMPOSITING_MODE` | `1` (Linux default) | Forces GPU compositing mode for stutter-free scrolling |

---

## ❓ Troubleshooting

<details>
<summary><b>1. [Linux] Blank window or freezing on Wayland / NVIDIA</b></summary>

The client sets `WEBKIT_DISABLE_DMABUF_RENDERER=1` automatically. If your display manager still experiences hangs, run:
```bash
WEBKIT_DISABLE_DMABUF_RENDERER=1 WEBKIT_DISABLE_COMPOSITING_MODE=1 ./run.sh
```
</details>

<details>
<summary><b>2. [Linux] System tray icon missing in GNOME Shell</b></summary>

GNOME Shell requires the AppIndicator extension to show tray icons:
```bash
sudo apt install gnome-shell-extension-appindicator
```
Enable the extension via GNOME **Extensions** app.
</details>

<details>
<summary><b>3. [macOS] App is from an unidentified developer</b></summary>

Because community builds are not signed with a paid Apple Developer certificate, macOS Gatekeeper may show a notice:
- Right-click (or Control-click) the application in `/Applications` and select **Open**.
- Click **Open** in the dialog box.
</details>

<details>
<summary><b>4. [Windows] WebView2 runtime missing</b></summary>

On Windows 10/11, WebView2 is included by default. If running an older or stripped Windows build, install the [Evergreen WebView2 Runtime](https://go.microsoft.com/fwlink/p/?LinkId=2124703).
</details>

---

## 🤝 Contributing

Contributions, bug reports, and suggestions are warmly welcome!

1. **Fork** the repository.
2. Create a feature branch (`git checkout -b feature/amazing-feature`).
3. Commit your changes (`git commit -m 'feat: add amazing feature'`).
4. Push to your branch (`git push origin feature/amazing-feature`).
5. Open a **Pull Request**.

---

## 🛡️ Disclaimer

This application is an **unofficial, open-source, third-party desktop client**. It is **not** endorsed by, directly affiliated with, maintained, authorized, or sponsored by WhatsApp LLC, Meta Platforms, Inc., or any of their affiliates or subsidiaries.

- "WhatsApp" and associated names, marks, logos, and emblems are registered trademarks of WhatsApp LLC and Meta Platforms, Inc.
- This application provides an optimized desktop container interface for [WhatsApp Web](https://web.whatsapp.com) and does not store or transmit user credentials, messages, or keys to any third-party servers.
- Use of this software is provided under the terms of the MIT License for personal and open-source usage.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE) © 2026 WhatsApp Desktop Contributors.
