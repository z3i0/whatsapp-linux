#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BINARY="$SCRIPT_DIR/target/release/whatsapp-linux"

# Disable WebKitGTK DMA-BUF renderer to eliminate Wayland/X11 focus and restore freezing
export WEBKIT_DISABLE_DMABUF_RENDERER=1

# Rebuild if binary is missing or source files are newer
NEEDS_BUILD=false
if [ ! -f "$BINARY" ]; then
    NEEDS_BUILD=true
elif [ -n "$(find "$SCRIPT_DIR/src" "$SCRIPT_DIR/Cargo.toml" "$SCRIPT_DIR/tauri.conf.json" -newer "$BINARY" 2>/dev/null)" ]; then
    NEEDS_BUILD=true
fi

if [ "$NEEDS_BUILD" = true ]; then
    echo "Building WhatsApp Linux (Tauri 2 + Rust)..."
    (cd "$SCRIPT_DIR" && cargo build --release) || exit 1
fi

# Run in background if requested
if [ "$1" = "-d" ] || [ "$1" = "--background" ]; then
    shift
    nohup "$BINARY" "$@" >/dev/null 2>&1 &
    echo "WhatsApp Linux started in background (PID: $!)."
    exit 0
fi

exec "$BINARY" "$@"
