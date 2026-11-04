(function() {
    // Only run UI injection in the top-level main window, never inside hidden subframes
    if (typeof window !== 'undefined' && window.top !== window.self) return;

    // 1. WebKit/Safari identity: Matches underlying WebKitGTK engine on Linux so WhatsApp Web
    // serves its WebKit-tested code path. This fixes missing/unloaded emojis, animated stickers,
    // and layout/spritesheet scaling issues that fail under Chrome/Blink spoofing.
    // On Windows, WebView2 is native Chromium/Edge, so we do not spoof Safari or delete window.chrome.
    const isWindows = (typeof window !== 'undefined' && window.__WA_PLATFORM__ === 'windows') ||
                      (typeof navigator !== 'undefined' && navigator.userAgent && navigator.userAgent.includes('Windows'));
    if (!isWindows) {
        function spoofProp(obj, prop, val) {
            try {
                Object.defineProperty(obj, prop, {
                    get: function() { return val; },
                    configurable: true,
                    enumerable: true
                });
            } catch(e) {}
        }
        const safariUA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Safari/605.1.15";
        spoofProp(navigator, 'vendor', 'Apple Computer, Inc.');
        spoofProp(Navigator.prototype, 'vendor', 'Apple Computer, Inc.');
        spoofProp(navigator, 'platform', 'MacIntel');
        spoofProp(Navigator.prototype, 'platform', 'MacIntel');
        spoofProp(navigator, 'userAgent', safariUA);
        spoofProp(Navigator.prototype, 'userAgent', safariUA);
        spoofProp(navigator, 'appVersion', '5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Safari/605.1.15');
        spoofProp(Navigator.prototype, 'appVersion', '5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Safari/605.1.15');
        spoofProp(navigator, 'maxTouchPoints', 0);
        spoofProp(Navigator.prototype, 'maxTouchPoints', 0);

        // Remove Blink-only properties so WhatsApp executes clean WebKit code paths
        try { delete window.chrome; } catch(e) {}
        try { delete navigator.userAgentData; } catch(e) {}
        try { delete Navigator.prototype.userAgentData; } catch(e) {}
    }

    // 2. High-quality Emoji & Performance Styles
    function injectPerformanceStyles() {
        if (document.getElementById('wa-perf-styles')) return;
        const style = document.createElement('style');
        style.id = 'wa-perf-styles';
        style.textContent = `
            /* Smooth, crystal-clear rendering for emojis and stickers */
            img.emoji, [data-emoji], span[data-testid*="emoji"], img {
                image-rendering: auto !important;
                -webkit-font-smoothing: antialiased !important;
            }
            /* Prioritize Apple Color Emoji followed by Noto Color Emoji */
            @font-face {
                font-family: 'Apple Color Emoji';
                src: local('Apple Color Emoji'), local('Noto Color Emoji');
            }
            @font-face {
                font-family: 'Segoe UI Emoji';
                src: local('Apple Color Emoji'), local('Noto Color Emoji');
            }
            body, [contenteditable="true"], .selectable-text, [data-lexical-text], span[dir="auto"], span[dir="ltr"], span[dir="rtl"] {
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, "Apple Color Emoji", "Noto Color Emoji", sans-serif;
            }
            /* Completely hide WhatsApp Mac/Desktop download banners and notification bars */
            [data-testid*="banner-download"],
            [data-asset-conf*="download"],
            div[data-testid*="download"],
            div[data-testid*="banner"],
            div[role="alert"]:has(a[href*="download"]),
            div:has(> a[href*="whatsapp.com/download"]),
            div:has(> div > a[href*="whatsapp.com/download"]),
            a[href*="whatsapp.com/download"],
            a[href*="itunes.apple.com"],
            div[data-testid="intro-text"] a[href*="download"] {
                display: none !important;
            }

            /* Hardware-accelerated chat list & message scrolling */
            #pane-side {
                transform: translateZ(0);
                will-change: scroll-position;
                contain: content;
            }
            #main [data-testid="conversation-panel-messages"],
            div[tabindex="-1"][role="region"] {
                transform: translateZ(0);
                contain: style layout;
            }
            img, video, canvas {
                transform: translateZ(0);
            }
        `;
        (document.head || document.documentElement).appendChild(style);
    }
    injectPerformanceStyles();
    window.addEventListener('DOMContentLoaded', injectPerformanceStyles);
    window.addEventListener('load', injectPerformanceStyles);

    // Auto-dismiss in-app Mac/Desktop download prompt banners (runs once on load + when body changes)
    let bannersDismissed = 0;
    function dismissMacBanners() {
        if (bannersDismissed > 5) return; // Stop after running a few times on load
        try {
            const banners = document.querySelectorAll('div[role="alert"], [data-testid*="banner"], [data-testid*="download"]');
            for (const b of banners) {
                const txt = (b.textContent || "").toLowerCase();
                if ((txt.includes('mac') || txt.includes('ماك') || txt.includes('download') || txt.includes('تنزيل')) &&
                    (txt.includes('app') || txt.includes('تطبيق') || txt.includes('get') || txt.includes('احصل') || txt.includes('install') || txt.includes('أسرع') || txt.includes('تجربة'))) {
                    b.style.display = 'none';
                }
            }
            bannersDismissed++;
        } catch(e) {}
    }
    window.addEventListener('DOMContentLoaded', dismissMacBanners);
    window.addEventListener('load', dismissMacBanners);
    setTimeout(dismissMacBanners, 3000);
    setTimeout(dismissMacBanners, 8000);

    // 3. Notification permissions and hooks
    window.__wa_pending_notifs = window.__wa_pending_notifs || [];

    function pushNotif(title, body) {
        try {
            window.__wa_pending_notifs.push({
                title: title || "WhatsApp",
                body: body || "New message"
            });
        } catch(e) {}
    }

    function CustomNotification(title, options) {
        pushNotif(title, options && options.body);
        return {
            title: title || "WhatsApp",
            body: options ? options.body : "",
            tag: options ? options.tag : "",
            onclick: null,
            onclose: null,
            onerror: null,
            onshow: null,
            close: function() {},
            addEventListener: function() {},
            removeEventListener: function() {},
            dispatchEvent: function() { return false; }
        };
    }
    CustomNotification.prototype = Object.prototype;
    CustomNotification.requestPermission = function(cb) {
        if (typeof cb === 'function') cb('granted');
        return Promise.resolve('granted');
    };
    Object.defineProperty(CustomNotification, 'permission', {
        get: function() { return 'granted'; },
        set: function() {},
        configurable: true
    });
    try {
        window.Notification = CustomNotification;
        Object.defineProperty(window, 'Notification', {
            get: function() { return CustomNotification; },
            set: function() {},
            configurable: true
        });
    } catch(e) {}

    // Hook navigator.permissions.query for notifications
    if (navigator.permissions && navigator.permissions.query) {
        const origQuery = navigator.permissions.query.bind(navigator.permissions);
        navigator.permissions.query = function(params) {
            if (params && (params.name === 'notifications' || params.name === 'persistent-storage')) {
                return Promise.resolve({
                    state: 'granted',
                    name: params.name,
                    onchange: null,
                    addEventListener: function() {},
                    removeEventListener: function() {},
                    dispatchEvent: function() { return false; }
                });
            }
            return origQuery(params);
        };
    }

    // Hook ServiceWorker showNotification
    if (typeof ServiceWorkerRegistration !== 'undefined') {
        try {
            ServiceWorkerRegistration.prototype.showNotification = function(title, options) {
                pushNotif(title, options && options.body);
                return Promise.resolve();
            };
        } catch(e) {}
    }

    // Hook audio playback:
    // - Short notification chimes are routed via AudioContext so they NEVER show a Music Player in GNOME
    // - Voice notes (records) and chat media play natively so the GNOME Media Player / MPRIS works for them!
    window.__wa_sound_played = false;
    let _notifCtx = null;
    function getNotifAudioContext() {
        if (!_notifCtx) {
            const AC = window.AudioContext || window.webkitAudioContext;
            if (AC) _notifCtx = new AC();
        }
        if (_notifCtx && _notifCtx.state === 'suspended') {
            _notifCtx.resume().catch(() => {});
        }
        return _notifCtx;
    }

    function playViaAudioContext(src, fallback) {
        if (!src) { if (fallback) fallback(); return; }
        const ctx = getNotifAudioContext();
        if (!ctx) { if (fallback) fallback(); return; }

        fetch(src)
            .then(r => r.arrayBuffer())
            .then(buf => ctx.decodeAudioData(buf))
            .then(decoded => {
                const srcNode = ctx.createBufferSource();
                srcNode.buffer = decoded;
                srcNode.connect(ctx.destination);
                srcNode.start(0);
            })
            .catch(() => {
                if (fallback) fallback();
            });
    }

    function markSound(el) {
        try {
            const dur = el && el.duration;
            if (typeof dur === 'number' && dur > 6) {
                return;
            }
            window.__wa_sound_played = true;
        } catch(e) {
            window.__wa_sound_played = true;
        }
    }

    function isNotificationAlert(el) {
        if (!el) return false;
        try {
            const src = (el.src || el.currentSrc || "").toLowerCase();
            // Voice notes, audio records, and chat media ALWAYS use blob: URLs!
            if (src.startsWith('blob:') || src.includes('blob:')) {
                return false;
            }

            // Duration check: records/voice notes have duration > 4s or non-static
            const dur = el.duration;
            if (typeof dur === 'number' && !isNaN(dur) && dur > 4) {
                return false;
            }

            // Check if element is in chat DOM or message container
            if (el.closest) {
                const inChat = el.closest(
                    '[data-testid*="msg"], [data-testid*="audio"], [data-testid*="voice"], #main, [role="row"], [role="listitem"]'
                );
                if (inChat) return false;
            }
            if (document.body && document.body.contains(el)) {
                return false;
            }

            // Static audio files (notification_bell.mp3, alert, beep) are notification alerts
            if (src.includes('notification') || src.includes('alert') || src.includes('bell') || src.includes('beep') || src.includes('sound')) {
                return true;
            }

            // If it is an unattached Audio object with short duration (<= 4s) and NOT a blob, it is an alert chime
            if (typeof dur === 'number' && !isNaN(dur) && dur > 0 && dur <= 4 && !src.startsWith('blob:')) {
                return true;
            }

            // By default, let audio play natively so GNOME Media Player / MPRIS works!
            return false;
        } catch(e) {
            return false;
        }
    }

    function handleAudioPlay(el, origPlay, args) {
        // Videos and status media must ALWAYS play directly with sound
        if (el && (el.tagName === 'VIDEO' || el instanceof HTMLVideoElement)) {
            try {
                el.muted = false;
                if (el.volume < 0.5) el.volume = 1.0;
            } catch(e) {}
            return origPlay.apply(el, args);
        }

        if (el && el.closest && el.closest('[data-testid*="status"], [role="dialog"], [data-animate-status-v3]')) {
            try {
                el.muted = false;
                if (el.volume < 0.5) el.volume = 1.0;
            } catch(e) {}
            return origPlay.apply(el, args);
        }

        markSound(el);
        if (isNotificationAlert(el)) {
            // Route notification chime via Web Audio to avoid triggering MPRIS Music Player in GNOME
            playViaAudioContext(el.src, () => {
                try { origPlay.apply(el, args); } catch(e) {}
            });
            return Promise.resolve();
        }
        // Voice notes / chat audio play normally so GNOME Media Player controls work!
        return origPlay.apply(el, args);
    }

    try {
        if (typeof HTMLMediaElement !== 'undefined') {
            const origMediaPlay = HTMLMediaElement.prototype.play;
            HTMLMediaElement.prototype.play = function() {
                // Completely bypass alert routing for video elements and story media
                if (this.tagName === 'VIDEO' || this instanceof HTMLVideoElement) {
                    try {
                        this.muted = false;
                        if (this.volume < 0.5) this.volume = 1.0;
                    } catch(e) {}
                    return origMediaPlay.apply(this, arguments);
                }
                if (this.closest && this.closest('[data-testid*="status"], [role="dialog"], [data-animate-status-v3]')) {
                    try {
                        this.muted = false;
                        if (this.volume < 0.5) this.volume = 1.0;
                    } catch(e) {}
                    return origMediaPlay.apply(this, arguments);
                }
                return handleAudioPlay(this, origMediaPlay, arguments);
            };
        }
    } catch(e) {}

    // Ensure story videos and media are unmuted automatically when played
    document.addEventListener('play', function(e) {
        if (e.target && (e.target.tagName === 'VIDEO' || e.target.tagName === 'AUDIO')) {
            try {
                e.target.muted = false;
                if (e.target.volume < 0.5) e.target.volume = 1.0;
            } catch(err) {}
        }
    }, true);

    // Fast unmute handler for status viewer
    function checkMuteButtons() {
        try {
            // Only search if volume-off icon exists in the DOM to avoid unnecessary queries
            const offIcon = document.querySelector('[data-icon="volume-off"]');
            if (offIcon) {
                const btn = offIcon.closest('button') || offIcon;
                if (btn && !btn.dataset.waAutoUnmuted) {
                    btn.dataset.waAutoUnmuted = "true";
                    btn.click();
                }
            }
        } catch(e) {}
    }
    // Check on click anywhere (e.g. opening a status/story) and on play events
    document.addEventListener('click', () => { setTimeout(checkMuteButtons, 150); }, true);
    document.addEventListener('play', () => { setTimeout(checkMuteButtons, 150); }, true);

    try {
        if (typeof HTMLAudioElement !== 'undefined') {
            const origAudioPlay = HTMLAudioElement.prototype.play;
            HTMLAudioElement.prototype.play = function() {
                return handleAudioPlay(this, origAudioPlay, arguments);
            };
        }
    } catch(e) {}

    try {
        const OrigAudio = window.Audio;
        if (OrigAudio) {
            window.Audio = function(...args) {
                const a = new OrigAudio(...args);
                const origAplay = a.play;
                a.play = function() {
                    return handleAudioPlay(this, origAplay, arguments);
                };
                return a;
            };
            window.Audio.prototype = OrigAudio.prototype;
        }
    } catch(e) {}

    try {
        if (typeof AudioBufferSourceNode !== 'undefined') {
            const origStart = AudioBufferSourceNode.prototype.start;
            AudioBufferSourceNode.prototype.start = function() {
                try {
                    const dur = this.buffer ? this.buffer.duration : 0;
                    if (dur <= 6) {
                        window.__wa_sound_played = true;
                    }
                } catch(e) {
                    window.__wa_sound_played = true;
                }
                return origStart.apply(this, arguments);
            };
        }
    } catch(e) {}

    try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
            const origCreate = AudioCtx.prototype.createBufferSource;
            AudioCtx.prototype.createBufferSource = function() {
                const node = origCreate.apply(this, arguments);
                const origNodeStart = node.start;
                node.start = function() {
                    try {
                        const dur = node.buffer ? node.buffer.duration : 0;
                        if (dur <= 6) {
                            window.__wa_sound_played = true;
                        }
                    } catch(e) {
                        window.__wa_sound_played = true;
                    }
                    return origNodeStart.apply(this, arguments);
                };
                return node;
            };
        }
    } catch(e) {}

    // 4. Focus & Visibility Sync (Prevents background throttling and freeze upon return)
    window.__wa_focused = true;
    window.__wa_set_focused = function(focused) {
        window.__wa_focused = focused;
        try {
            const evt = focused ? 'focus' : 'blur';
            window.dispatchEvent(new Event(evt));
            document.dispatchEvent(new Event(evt));
            if (focused && window.requestAnimationFrame) {
                window.requestAnimationFrame(function() {});
            }
        } catch(e) {}
    };

    // Keep document.hidden ALWAYS false and visibilityState ALWAYS 'visible'
    // This is CRITICAL: it prevents WhatsApp Web from entering background sleep/hibernation,
    // stopping it from pausing its message queue or causing a massive batch re-render/freeze on focus regain.
    try {
        Object.defineProperty(document, 'hidden', {
            get: function() { return false; },
            configurable: true
        });
        Object.defineProperty(document, 'visibilityState', {
            get: function() { return 'visible'; },
            configurable: true
        });
    } catch(e) {}

    const origHasFocus = document.hasFocus ? document.hasFocus.bind(document) : function() { return true; };
    document.hasFocus = function() {
        if (window.__wa_focused === false) {
            return false;
        }
        return origHasFocus();
    };

    window.addEventListener('focus', function() { window.__wa_set_focused(true); });
    window.addEventListener('blur', function() { window.__wa_set_focused(false); });

    // 5. Shortcuts: Ctrl+Q/Cmd+Q (quit), Ctrl+W/Cmd+W (hide)
    window.addEventListener('keydown', function(e) {
        if ((e.ctrlKey || e.metaKey) && (e.key === 'q' || e.key === 'Q')) {
            e.preventDefault();
            window.__wa_action = "quit";
        } else if ((e.ctrlKey || e.metaKey) && (e.key === 'w' || e.key === 'W')) {
            e.preventDefault();
            window.__wa_action = "hide";
        }
    }, true);

    // 6. WhatsApp Enhancements & Stealth Mode (Stories, Messages & Voice Notes)
    (function initWhatsAppFeatures() {
        try {
            window.__wa_stealth_story = localStorage.getItem('wa_feature_stealth_story') !== 'false';
            window.__wa_stealth_messages = localStorage.getItem('wa_feature_stealth_messages') !== 'false';
            window.__wa_story_downloader = localStorage.getItem('wa_feature_story_downloader') !== 'false';
        } catch(e) {
            window.__wa_stealth_story = true;
            window.__wa_stealth_messages = true;
            window.__wa_story_downloader = true;
        }

        let capturedWebpackRequire = null;

        // Fast global status viewer detector
        function isStatusViewerOpen() {
            try {
                if (document.querySelector('[data-testid="status-v3"], [data-animate-status-v3="true"], [data-testid="media-viewer"], [data-testid="status-viewer"]')) {
                    return true;
                }
                const closeBtn = document.querySelector('span[data-icon="x-viewer"], [data-icon="x-viewer"]');
                if (closeBtn) return true;
                const statusMediaBtn = document.querySelector('[data-icon="pause"], [data-icon="play-status"]');
                if (statusMediaBtn) return true;
            } catch(e) {}
            return false;
        }

        // Unified receipt interceptor rule: checks if receipt is for Status or Message, and blocks accordingly!
        function shouldBlockReceipt(methodName, args) {
            const isViewerOpen = isStatusViewerOpen();
            let isStatusArg = false;

            if (args && args.length > 0) {
                for (const arg of args) {
                    if (!arg) continue;
                    if (typeof arg === 'string') {
                        if (arg.includes('status') || arg.includes('broadcast')) {
                            isStatusArg = true;
                            break;
                        }
                    } else if (typeof arg === 'object') {
                        const s = String(arg.id || arg._serialized || arg.chatId || arg.to || arg.remote || "");
                        if (s.includes('status') || s.includes('broadcast')) {
                            isStatusArg = true;
                            break;
                        }
                        if (arg.type === 'status' || arg.isStatusV3 || arg.isStatus) {
                            isStatusArg = true;
                            break;
                        }
                    }
                }
            }

            const isStatusRelated = methodName.toLowerCase().includes('status') || isViewerOpen || isStatusArg;

            if (isStatusRelated) {
                if (window.__wa_stealth_story) {
                    console.log(`[WhatsApp-Desktop] Stealth Story: Blocked status receipt call (${methodName})!`, args);
                    return true;
                }
            } else {
                if (window.__wa_stealth_messages) {
                    console.log(`[WhatsApp-Desktop] Stealth Messages: Blocked message receipt call (${methodName})!`, args);
                    return true;
                }
            }
            return false;
        }

        const allReceiptMethods = [
            'sendSeen',
            'markSeen',
            'sendChatRead',
            'markChatRead',
            'markIsRead',
            'markRead',
            'sendRead',
            'sendReceipt',
            'sendReceiptAction',
            'sendReceiptChatAction',
            'sendReadReceipt',
            'sendReadStatus',
            'handleReadStatus',
            'sendReadStatusAction',
            'sendReadStatusJob',
            'sendReadStatusAsync',
            'markStatusRead',
            'readStatus',
            'markAsRead',
            'sendSeenChatAction',
            'sendReadStatusReceipt',
            'sendReadReceiptChatAction',
            'sendPlayedReceipt',
            'sendPlayedReceiptAction',
            'markPlayed',
            'sendPlayed'
        ];

        // Core patching helper that intercepts read, seen, and played methods on ANY object, prototype or function
        function patchCandidate(obj) {
            if (!obj || (typeof obj !== 'object' && typeof obj !== 'function')) return;

            for (const name of allReceiptMethods) {
                if (typeof obj[name] === 'function' && !obj[name]._waStealthPatched) {
                    const orig = obj[name];
                    const wrapped = function(...args) {
                        if (shouldBlockReceipt(name, args)) {
                            return Promise.resolve(this);
                        }
                        return orig.apply(this, args);
                    };
                    wrapped._waStealthPatched = true;
                    try {
                        obj[name] = wrapped;
                    } catch(e) {
                        try {
                            Object.defineProperty(obj, name, { value: wrapped, writable: true, configurable: true });
                        } catch(e2) {}
                    }
                }
            }

            // canMarkPlayed helper - returns false to prevent player from ever marking audio as played
            if (typeof obj.canMarkPlayed === 'function' && !obj.canMarkPlayed._waStealthPatched) {
                const wrapped = function() {
                    return !window.__wa_stealth_messages;
                };
                wrapped._waStealthPatched = true;
                try {
                    obj.canMarkPlayed = wrapped;
                } catch(e) {}
            }
        }

        function patchAllLevels(target) {
            if (!target) return;
            patchCandidate(target);
            if (target.default) patchCandidate(target.default);
            if (target.prototype) patchCandidate(target.prototype);
            if (target.default && target.default.prototype) patchCandidate(target.default.prototype);
        }

        // Hook window.require so ANY module requested by WhatsApp at runtime is immediately patched
        function hookWindowRequire() {
            if (typeof window.require !== 'function' || window.require._waStealthHooked) return;
            const origRequire = window.require;
            const hookedRequire = function(name) {
                const mod = origRequire.apply(this, arguments);
                try {
                    if (mod) patchAllLevels(mod);
                } catch(e) {}
                return mod;
            };
            for (const k in origRequire) {
                try { hookedRequire[k] = origRequire[k]; } catch(e) {}
            }
            hookedRequire._waStealthHooked = true;
            try { window.require = hookedRequire; } catch(e) {}
        }

        const scannedModuleDefs = new Set();
        let lastCacheSize = 0;

        function scanAndPatchAllModules() {
            // Hook window.require (Meta loader / modern WhatsApp Web)
            hookWindowRequire();

            // 1. Check all modules in captured Webpack require
            if (capturedWebpackRequire) {
                const r = capturedWebpackRequire;
                if (r.c) {
                    const cacheKeys = Object.keys(r.c);
                    if (cacheKeys.length !== lastCacheSize) {
                        lastCacheSize = cacheKeys.length;
                        for (let i = 0; i < cacheKeys.length; i++) {
                            const mod = r.c[cacheKeys[i]];
                            if (mod && mod.exports && !mod.exports._waStealthScanned) {
                                mod.exports._waStealthScanned = true;
                                patchAllLevels(mod.exports);
                            }
                        }
                    }
                }
                if (r.m) {
                    for (const id in r.m) {
                        if (scannedModuleDefs.has(id)) continue;
                        scannedModuleDefs.add(id);
                        try {
                            const fn = r.m[id];
                            if (typeof fn === 'function') {
                                const fnStr = fn.toString();
                                if (fnStr.includes('sendReadStatus') || fnStr.includes('sendSeen') ||
                                    fnStr.includes('sendReceipt') || fnStr.includes('markChatRead') ||
                                    fnStr.includes('markSeen') || fnStr.includes('markPlayed') ||
                                    fnStr.includes('sendPlayed') || fnStr.includes('canMarkPlayed')) {
                                    const m = r(id);
                                    patchAllLevels(m);
                                }
                            }
                        } catch(e) {}
                    }
                }
            }

            // 2. Query known and debug modules from window.require
            try {
                if (typeof window.require === 'function') {
                    const knownModules = [
                        'WAWebUpdateUnreadChatAction',
                        'WAWebSendReceiptChatAction',
                        'WAWebSendPlayedReceiptAction',
                        'WAWebSendSeenChatAction',
                        'WAWebSendReadStatusAction',
                        'WAWebSendReadStatus',
                        'WAWebChatModel',
                        'WAWebMsgModel',
                        'WAWebStatusV3Model',
                        'WAWebStatus'
                    ];
                    for (const name of knownModules) {
                        try {
                            const m = window.require(name);
                            if (m) patchAllLevels(m);
                        } catch(e) {}
                    }
                    const dbg = window.require('__debug');
                    if (dbg && dbg.modulesMap) {
                        for (const id in dbg.modulesMap) {
                            const lower = id.toLowerCase();
                            if (lower.includes('status') || lower.includes('receipt') || lower.includes('seen') || lower.includes('read')) {
                                try {
                                    const m = window.require(id);
                                    if (m) patchAllLevels(m);
                                } catch(e) {}
                            }
                        }
                    }
                }
            } catch(e) {}

            // 3. Check window.Store if exposed
            try {
                if (window.Store) {
                    for (const k in window.Store) {
                        try {
                            const item = window.Store[k];
                            if (item && typeof item === 'object') {
                                patchAllLevels(item);
                            }
                        } catch(e) {}
                    }
                }
            } catch(e) {}
        }

        // Capture Webpack internal require as soon as WhatsApp initializes its bundle chunk
        function setupWebpackHook(chunk) {
            if (!chunk || !chunk.push) return;
            try {
                const origPush = chunk.push.bind(chunk);
                chunk.push = function(...args) {
                    const res = origPush(...args);
                    setTimeout(scanAndPatchAllModules, 25);
                    return res;
                };

                chunk.push([
                    ['wa-stealth-capture'],
                    {},
                    function(r) {
                        capturedWebpackRequire = r;
                        console.log("[WhatsApp-Desktop] Successfully captured Webpack __webpack_require__!");
                        scanAndPatchAllModules();
                    }
                ]);
            } catch(e) {
                console.error("[WhatsApp-Desktop] Error capturing Webpack require:", e);
            }
        }

        if (window.webpackChunkwhatsapp_web_client) {
            setupWebpackHook(window.webpackChunkwhatsapp_web_client);
        } else {
            let chunkInstance;
            try {
                Object.defineProperty(window, 'webpackChunkwhatsapp_web_client', {
                    configurable: true,
                    enumerable: true,
                    get() {
                        return chunkInstance;
                    },
                    set(val) {
                        chunkInstance = val;
                        if (val && Array.isArray(val)) {
                            setupWebpackHook(val);
                        }
                    }
                });
            } catch(e) {}
        }

        // Light progressive scanning: check during startup, then gentle low-frequency check
        [1000, 3000, 6000, 12000].forEach(delay => setTimeout(scanAndPatchAllModules, delay));
        setInterval(scanAndPatchAllModules, 5000);

        // UI Styles Injection
        function injectFeatureStyles() {
            if (document.getElementById('wa-features-styles')) return;
            const style = document.createElement('style');
            style.id = 'wa-features-styles';
            style.textContent = `
                /* WhatsApp Native Theme Tokens */
                :root, body {
                    --wa-modal-bg: #ffffff;
                    --wa-header-bg: #f0f2f5;
                    --wa-text-primary: #111b21;
                    --wa-text-secondary: #667781;
                    --wa-border: #e9edef;
                    --wa-item-bg: #f0f2f5;
                    --wa-item-hover: #e9edef;
                    --wa-pill-bg: #ffffff;
                    --wa-pill-text: #111b21;
                    --wa-pill-border: #d1d7db;
                    --wa-pill-hover: #f5f6f6;
                    --wa-pill-shadow: 0 1px 3px rgba(11, 20, 26, 0.12);
                    --wa-accent: #008069;
                    --wa-overlay: rgba(11, 20, 26, 0.35);
                    --wa-card-shadow: 0 4px 16px rgba(11, 20, 26, 0.14);
                    --wa-switch-off: #cbd5e1;
                    --wa-switch-knob: #ffffff;
                    --wa-footer-bg: #f0f2f5;
                }

                body.dark, html.dark, [data-theme="dark"], body[class*="dark"] {
                    --wa-modal-bg: #222e35;
                    --wa-header-bg: #202c33;
                    --wa-text-primary: #e9edef;
                    --wa-text-secondary: #8696a0;
                    --wa-border: #2a3942;
                    --wa-item-bg: #111b21;
                    --wa-item-hover: #182229;
                    --wa-pill-bg: #202c33;
                    --wa-pill-text: #e9edef;
                    --wa-pill-border: #374248;
                    --wa-pill-hover: #2a3942;
                    --wa-pill-shadow: 0 2px 6px rgba(0, 0, 0, 0.4);
                    --wa-accent: #00a884;
                    --wa-overlay: rgba(11, 20, 26, 0.7);
                    --wa-card-shadow: 0 8px 24px rgba(0, 0, 0, 0.45);
                    --wa-switch-off: #3b4a54;
                    --wa-switch-knob: #e9edef;
                    --wa-footer-bg: #111b21;
                }

                /* Standalone Floating Features Pill */
                .wa-feat-pill {
                    position: fixed;
                    bottom: 22px;
                    left: 78px;
                    display: inline-flex;
                    align-items: center;
                    gap: 7px;
                    padding: 6px 14px;
                    border-radius: 20px;
                    background: var(--wa-pill-bg);
                    color: var(--wa-pill-text);
                    border: 1px solid var(--wa-pill-border);
                    box-shadow: var(--wa-pill-shadow);
                    cursor: grab;
                    z-index: 99999;
                    font-family: inherit;
                    font-size: 13px;
                    font-weight: 500;
                    user-select: none;
                    -webkit-user-select: none;
                    touch-action: none;
                    transition: background 0.12s ease;
                }
                .wa-feat-pill:hover {
                    background: var(--wa-pill-hover);
                }
                .wa-feat-pill:active {
                    cursor: grabbing;
                }
                .wa-feat-pill-icon {
                    color: var(--wa-accent);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .wa-feat-badge {
                    width: 6px;
                    height: 6px;
                    border-radius: 50%;
                    background: var(--wa-accent);
                    display: none;
                }
                .wa-feat-badge.active {
                    display: block;
                }

                /* Modal Backdrop - simple clean overlay without heavy blur */
                .wa-modal-backdrop {
                    position: fixed;
                    inset: 0;
                    background: var(--wa-overlay);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 999999;
                    opacity: 0;
                    visibility: hidden;
                    transition: opacity 0.15s ease, visibility 0.15s ease;
                    padding: 16px;
                }
                .wa-modal-backdrop.open {
                    opacity: 1;
                    visibility: visible;
                }

                /* Modal Card */
                .wa-modal-card {
                    width: 100%;
                    max-width: 440px;
                    background: var(--wa-modal-bg);
                    color: var(--wa-text-primary);
                    border-radius: 10px;
                    box-shadow: var(--wa-card-shadow);
                    border: 1px solid var(--wa-border);
                    overflow: hidden;
                    font-family: inherit;
                    direction: ltr;
                    text-align: left;
                }

                /* Modal Header */
                .wa-modal-header {
                    padding: 16px 20px;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    border-bottom: 1px solid var(--wa-border);
                    background: var(--wa-header-bg);
                }
                .wa-modal-title-wrap {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }
                .wa-modal-icon {
                    width: 34px;
                    height: 34px;
                    border-radius: 8px;
                    background: rgba(0, 168, 132, 0.12);
                    color: var(--wa-accent);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                }
                .wa-modal-header h2 {
                    margin: 0;
                    font-size: 16px;
                    font-weight: 600;
                    line-height: 1.3;
                    color: var(--wa-text-primary);
                }
                .wa-modal-header p {
                    margin: 2px 0 0;
                    font-size: 12px;
                    color: var(--wa-text-secondary);
                }
                .wa-modal-close {
                    background: transparent;
                    border: none;
                    color: var(--wa-text-secondary);
                    width: 30px;
                    height: 30px;
                    border-radius: 50%;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: background 0.12s ease, color 0.12s ease;
                }
                .wa-modal-close:hover {
                    background: rgba(134, 150, 160, 0.15);
                    color: var(--wa-text-primary);
                }

                /* Modal Body */
                .wa-modal-body {
                    padding: 18px 20px;
                    display: flex;
                    flex-direction: column;
                    gap: 14px;
                    max-height: 65vh;
                    overflow-y: auto;
                    background: var(--wa-modal-bg);
                }

                /* Feature Item */
                .wa-feat-item {
                    display: flex;
                    align-items: flex-start;
                    justify-content: space-between;
                    gap: 14px;
                    padding: 14px 16px;
                    border-radius: 8px;
                    background: var(--wa-item-bg);
                    border: 1px solid var(--wa-border);
                }
                .wa-feat-content {
                    flex: 1;
                }
                .wa-feat-title {
                    font-size: 14px;
                    font-weight: 600;
                    margin: 0 0 4px 0;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    color: var(--wa-text-primary);
                }
                .wa-feat-desc {
                    font-size: 13px;
                    line-height: 1.45;
                    color: var(--wa-text-secondary);
                    margin: 0 0 8px 0;
                }
                .wa-feat-status-tag {
                    display: inline-flex;
                    align-items: center;
                    gap: 5px;
                    font-size: 11.5px;
                    padding: 2px 8px;
                    border-radius: 10px;
                    background: rgba(134, 150, 160, 0.12);
                    color: var(--wa-text-secondary);
                    font-weight: 500;
                }
                .wa-feat-status-tag.active {
                    background: rgba(0, 168, 132, 0.12);
                    color: var(--wa-accent);
                }

                /* Custom Toggle Switch */
                .wa-switch {
                    position: relative;
                    width: 38px;
                    height: 22px;
                    flex-shrink: 0;
                    margin-top: 3px;
                }
                .wa-switch input {
                    opacity: 0;
                    width: 0;
                    height: 0;
                    position: absolute;
                }
                .wa-slider {
                    position: absolute;
                    cursor: pointer;
                    inset: 0;
                    background: var(--wa-switch-off);
                    border-radius: 22px;
                    transition: background 0.15s ease;
                }
                .wa-slider:before {
                    position: absolute;
                    content: "";
                    height: 16px;
                    width: 16px;
                    left: 3px;
                    bottom: 3px;
                    background: var(--wa-switch-knob);
                    border-radius: 50%;
                    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
                    transition: transform 0.15s ease;
                }
                .wa-switch input:checked + .wa-slider {
                    background: var(--wa-accent);
                }
                .wa-switch input:checked + .wa-slider:before {
                    transform: translateX(16px);
                }

                /* Modal Footer */
                .wa-modal-footer {
                    padding: 12px 20px;
                    background: var(--wa-footer-bg);
                    border-top: 1px solid var(--wa-border);
                    font-size: 12px;
                    color: var(--wa-text-secondary);
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                }

                /* Toast notification */
                .wa-toast {
                    position: fixed;
                    bottom: 28px;
                    left: 50%;
                    transform: translateX(-50%) translateY(10px);
                    background: var(--wa-pill-bg);
                    color: var(--wa-text-primary);
                    border: 1px solid var(--wa-border);
                    border-radius: 8px;
                    padding: 8px 16px;
                    font-size: 13px;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    box-shadow: var(--wa-card-shadow);
                    opacity: 0;
                    pointer-events: none;
                    transition: opacity 0.15s ease, transform 0.15s ease;
                    z-index: 1000000;
                    direction: ltr;
                }
                .wa-toast.show {
                    opacity: 1;
                    transform: translateX(-50%) translateY(0);
                }

                /* Story Viewer Download Button */
                .wa-status-download-btn {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    gap: 6px;
                    padding: 6px 14px;
                    border-radius: 20px;
                    background: rgba(17, 27, 33, 0.85);
                    color: #ffffff;
                    border: 1px solid rgba(255, 255, 255, 0.25);
                    backdrop-filter: blur(10px);
                    -webkit-backdrop-filter: blur(10px);
                    font-size: 13px;
                    font-weight: 500;
                    cursor: pointer;
                    z-index: 100000;
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.35);
                    transition: all 0.15s ease;
                    user-select: none;
                    -webkit-user-select: none;
                }
                .wa-status-download-btn:hover {
                    background: #00a884;
                    border-color: #00a884;
                    color: #ffffff;
                    transform: scale(1.04);
                }
                .wa-status-download-btn:active {
                    transform: scale(0.96);
                }

                /* Quick Download Button inside Features Modal */
                .wa-quick-dl-btn {
                    width: 100%;
                    padding: 10px 16px;
                    border-radius: 8px;
                    background: var(--wa-accent);
                    color: #ffffff;
                    border: none;
                    font-size: 13px;
                    font-weight: 600;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
                    transition: opacity 0.15s ease, transform 0.1s ease;
                }
                .wa-quick-dl-btn:hover {
                    opacity: 0.92;
                    transform: translateY(-1px);
                }
                .wa-quick-dl-btn:active {
                    transform: translateY(0);
                }
            `;
            (document.head || document.documentElement).appendChild(style);
        }

        function showToast(msg) {
            let toast = document.getElementById('wa-feat-toast');
            if (!toast) {
                toast = document.createElement('div');
                toast.id = 'wa-feat-toast';
                toast.className = 'wa-toast';
                document.body.appendChild(toast);
            }
            toast.textContent = msg;
            toast.classList.add('show');
            setTimeout(() => { toast.classList.remove('show'); }, 3000);
        }

        // Story / Status Downloader Helpers
        function findStatusViewer() {
            const viewer = document.querySelector('[data-testid="status-v3"], [data-animate-status-v3="true"], [data-testid="media-viewer"], [data-testid="status-viewer"]');
            if (viewer) return viewer;

            const closeBtn = document.querySelector('span[data-icon="x-viewer"], [data-icon="x-viewer"]');
            if (closeBtn) {
                return closeBtn.closest('div[role="dialog"], div[tabindex="-1"], div[data-animate-status-v3]') || closeBtn.parentElement;
            }
            return null;
        }

        function getActiveStatusMedia() {
            const viewer = findStatusViewer() || document;

            // 1. Check for Video element
            const video = viewer.querySelector('video') || document.querySelector('video');
            if (video && (video.currentSrc || video.src)) {
                return {
                    type: 'video',
                    url: video.currentSrc || video.src,
                    ext: 'mp4',
                    element: video
                };
            }

            // 2. Check for Story Image
            const imgs = viewer.querySelectorAll('img');
            for (const img of imgs) {
                const src = img.currentSrc || img.src || "";
                if (!src) continue;
                if (img.width < 120 && img.height < 120 && !src.startsWith('blob:')) continue;
                if (img.classList.contains('emoji')) continue;

                let ext = 'jpg';
                if (src.includes('png')) ext = 'png';
                if (src.includes('webp')) ext = 'webp';
                return {
                    type: 'image',
                    url: src,
                    ext: ext,
                    element: img
                };
            }

            return null;
        }

        function triggerDirectDownloadLink(url, filename) {
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.target = '_blank';
            document.body.appendChild(a);
            a.click();
            setTimeout(() => { if (a.parentElement) a.parentElement.removeChild(a); }, 1000);
            showToast(`✓ Download started: ${filename}`);
        }

        async function downloadActiveStory() {
            if (!window.__wa_story_downloader) {
                showToast('Story Downloader is disabled in Features');
                return;
            }

            const media = getActiveStatusMedia();
            if (!media || !media.url) {
                showToast('⚠️ No active story media detected. Open a story first.');
                return;
            }

            let contact = "Contact";
            try {
                const viewer = findStatusViewer() || document;
                const nameEl = viewer.querySelector(
                    '[data-testid="status-header-chat-name"], span[data-testid="status-v3-chat-name"], header span[title], header span[dir="auto"], span[title]'
                );
                if (nameEl) {
                    const raw = (nameEl.getAttribute('title') || nameEl.innerText || "").trim();
                    if (raw && raw !== 'WhatsApp' && !raw.includes(':')) {
                        contact = raw.replace(/[^a-zA-Z0-9_\-\u0600-\u06FF]/g, '_');
                    }
                }
            } catch(e) {}

            const now = new Date();
            const pad = n => String(n).padStart(2, '0');
            const timestamp = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
            const filename = `WhatsApp_Status_${contact}_${timestamp}.${media.ext}`;

            showToast(`⏳ Downloading ${media.type}...`);

            try {
                const resp = await fetch(media.url);
                const blob = await resp.blob();
                const blobUrl = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = blobUrl;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                setTimeout(() => {
                    if (a.parentElement) a.parentElement.removeChild(a);
                    URL.revokeObjectURL(blobUrl);
                }, 3000);
                showToast(`✓ Story saved: ${filename}`);
                return;
            } catch(err) {
                console.warn('[WhatsApp-Desktop] Fetch blob failed, trying canvas/direct link fallback:', err);
            }

            if (media.type === 'image' && media.element) {
                try {
                    const canvas = document.createElement('canvas');
                    const img = media.element;
                    canvas.width = img.naturalWidth || img.width || 1080;
                    canvas.height = img.naturalHeight || img.height || 1920;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0);
                    canvas.toBlob(blob => {
                        if (blob) {
                            const blobUrl = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = blobUrl;
                            a.download = filename;
                            document.body.appendChild(a);
                            a.click();
                            setTimeout(() => {
                                if (a.parentElement) a.parentElement.removeChild(a);
                                URL.revokeObjectURL(blobUrl);
                            }, 3000);
                            showToast(`✓ Story saved: ${filename}`);
                        } else {
                            triggerDirectDownloadLink(media.url, filename);
                        }
                    }, 'image/jpeg', 0.98);
                    return;
                } catch(e) {
                    console.warn('[WhatsApp-Desktop] Canvas fallback failed:', e);
                }
            }

            triggerDirectDownloadLink(media.url, filename);
        }

        function ensureStatusDownloadBtn() {
            if (!window.__wa_story_downloader) {
                const existing = document.getElementById('wa-story-dl-btn');
                if (existing) existing.remove();
                return;
            }

            const viewer = findStatusViewer();
            if (!viewer) {
                const existing = document.getElementById('wa-story-dl-btn');
                if (existing) existing.remove();
                return;
            }

            if (document.getElementById('wa-story-dl-btn')) return;

            const btn = document.createElement('button');
            btn.id = 'wa-story-dl-btn';
            btn.className = 'wa-status-download-btn';
            btn.setAttribute('title', 'Download this status (WhatsApp Linux)');
            btn.innerHTML = `
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="7 10 12 15 17 10"></polyline>
                    <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
                <span>Download</span>
            `;

            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                downloadActiveStory();
            });

            btn.style.position = 'fixed';
            btn.style.top = '20px';
            btn.style.right = '76px';
            btn.style.zIndex = '999999';
            document.body.appendChild(btn);
        }

        function createModal() {
            let backdrop = document.getElementById('wa-modal-backdrop');
            if (backdrop && document.body && document.body.contains(backdrop)) {
                return backdrop;
            }
            if (backdrop) backdrop.remove();
            if (!document.body) return null;

            backdrop = document.createElement('div');
            backdrop.id = 'wa-modal-backdrop';
            backdrop.className = 'wa-modal-backdrop';
            backdrop.innerHTML = `
                <div class="wa-modal-card" id="wa-modal-card">
                    <div class="wa-modal-header">
                        <div class="wa-modal-title-wrap">
                            <div class="wa-modal-icon">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                                    <path d="m9 12 2 2 4-4"/>
                                </svg>
                            </div>
                            <div>
                                <h2>WhatsApp Features</h2>
                                <p>Privacy controls and enhancements</p>
                            </div>
                        </div>
                        <button class="wa-modal-close" id="wa-modal-close-btn" title="Close">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </button>
                    </div>
                    <div class="wa-modal-body">
                        <!-- Feature 1: Stealth Status -->
                        <div class="wa-feat-item">
                            <div class="wa-feat-content">
                                <div class="wa-feat-title">
                                    <span>Stealth Story Viewer</span>
                                    <span>👁️‍🗨️</span>
                                </div>
                                <div class="wa-feat-desc">
                                    View contacts' status updates and stories anonymously. Seen receipts will never be sent to the publisher.
                                </div>
                                <div class="wa-feat-status-tag ${window.__wa_stealth_story ? 'active' : ''}" id="wa-stealth-story-tag">
                                    ${window.__wa_stealth_story ? '✓ Stealth Active (Protected)' : 'Disabled'}
                                </div>
                            </div>
                            <label class="wa-switch" title="Toggle Stealth Story Viewer">
                                <input type="checkbox" id="wa-stealth-story-checkbox" ${window.__wa_stealth_story ? 'checked' : ''}>
                                <span class="wa-slider"></span>
                            </label>
                        </div>

                        <!-- Feature 2: Stealth Messages & Voice Notes -->
                        <div class="wa-feat-item">
                            <div class="wa-feat-content">
                                <div class="wa-feat-title">
                                    <span>Stealth Messages & Audio</span>
                                    <span>🔇</span>
                                </div>
                                <div class="wa-feat-desc">
                                    Read incoming messages and listen to voice notes privately without sending blue ticks or played receipts.
                                </div>
                                <div class="wa-feat-status-tag ${window.__wa_stealth_messages ? 'active' : ''}" id="wa-stealth-msg-tag">
                                    ${window.__wa_stealth_messages ? '✓ Stealth Active (Protected)' : 'Disabled'}
                                </div>
                            </div>
                            <label class="wa-switch" title="Toggle Stealth Messages and Audio">
                                <input type="checkbox" id="wa-stealth-msg-checkbox" ${window.__wa_stealth_messages ? 'checked' : ''}>
                                <span class="wa-slider"></span>
                            </label>
                        </div>

                        <!-- Feature 3: Story & Status Downloader -->
                        <div class="wa-feat-item">
                            <div class="wa-feat-content">
                                <div class="wa-feat-title">
                                    <span>Story & Status Downloader</span>
                                    <span>📥</span>
                                </div>
                                <div class="wa-feat-desc">
                                    Save status photos and videos in full quality directly while watching stories with a 1-click download button.
                                </div>
                                <div class="wa-feat-status-tag ${window.__wa_story_downloader ? 'active' : ''}" id="wa-story-dl-tag">
                                    ${window.__wa_story_downloader ? '✓ Downloader Active' : 'Disabled'}
                                </div>
                            </div>
                            <label class="wa-switch" title="Toggle Story Downloader">
                                <input type="checkbox" id="wa-story-dl-checkbox" ${window.__wa_story_downloader ? 'checked' : ''}>
                                <span class="wa-slider"></span>
                            </label>
                        </div>

                        <!-- Quick Download Card (visible when a story is currently open) -->
                        <div id="wa-quick-dl-container" style="display: none;">
                            <button id="wa-quick-dl-btn" class="wa-quick-dl-btn" type="button" title="Download open story">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                    <polyline points="7 10 12 15 17 10"></polyline>
                                    <line x1="12" y1="15" x2="12" y2="3"></line>
                                </svg>
                                <span>Download Currently Open Story Now</span>
                            </button>
                        </div>
                    </div>
                    <div class="wa-modal-footer">
                        <span>Settings are saved automatically</span>
                        <span>WhatsApp Desktop v1.0</span>
                    </div>
                </div>
            `;

            document.body.appendChild(backdrop);

            // Close listeners
            backdrop.addEventListener('click', (e) => {
                if (e.target === backdrop) closeFeaturesModal();
            });
            const closeBtn = document.getElementById('wa-modal-close-btn');
            if (closeBtn) closeBtn.addEventListener('click', closeFeaturesModal);

            // Helper to update badge
            function updateBadgeState() {
                const anyActive = !!(window.__wa_stealth_story || window.__wa_stealth_messages || window.__wa_story_downloader);
                document.querySelectorAll('.wa-feat-badge').forEach(b => {
                    b.classList.toggle('active', anyActive);
                });
            }

            // Feature 1: Story Switch
            const storyCheckbox = document.getElementById('wa-stealth-story-checkbox');
            if (storyCheckbox) {
                storyCheckbox.addEventListener('change', () => {
                    const isEnabled = storyCheckbox.checked;
                    window.__wa_stealth_story = isEnabled;
                    try {
                        localStorage.setItem('wa_feature_stealth_story', isEnabled ? 'true' : 'false');
                    } catch(e) {}

                    const tag = document.getElementById('wa-stealth-story-tag');
                    if (tag) {
                        tag.className = isEnabled ? 'wa-feat-status-tag active' : 'wa-feat-status-tag';
                        tag.textContent = isEnabled ? '✓ Stealth Active (Protected)' : 'Disabled';
                    }
                    updateBadgeState();
                    showToast(isEnabled ? '✓ Stealth Story Viewer enabled' : 'Stealth Story Viewer disabled');
                });
            }

            // Feature 2: Messages & Audio Switch
            const msgCheckbox = document.getElementById('wa-stealth-msg-checkbox');
            if (msgCheckbox) {
                msgCheckbox.addEventListener('change', () => {
                    const isEnabled = msgCheckbox.checked;
                    window.__wa_stealth_messages = isEnabled;
                    try {
                        localStorage.setItem('wa_feature_stealth_messages', isEnabled ? 'true' : 'false');
                    } catch(e) {}

                    const tag = document.getElementById('wa-stealth-msg-tag');
                    if (tag) {
                        tag.className = isEnabled ? 'wa-feat-status-tag active' : 'wa-feat-status-tag';
                        tag.textContent = isEnabled ? '✓ Stealth Active (Protected)' : 'Disabled';
                    }
                    updateBadgeState();
                    showToast(isEnabled ? '✓ Stealth Messages & Audio enabled' : 'Stealth Messages & Audio disabled');
                });
            }

            // Feature 3: Story Downloader Switch
            const dlCheckbox = document.getElementById('wa-story-dl-checkbox');
            if (dlCheckbox) {
                dlCheckbox.addEventListener('change', () => {
                    const isEnabled = dlCheckbox.checked;
                    window.__wa_story_downloader = isEnabled;
                    try {
                        localStorage.setItem('wa_feature_story_downloader', isEnabled ? 'true' : 'false');
                    } catch(e) {}

                    const tag = document.getElementById('wa-story-dl-tag');
                    if (tag) {
                        tag.className = isEnabled ? 'wa-feat-status-tag active' : 'wa-feat-status-tag';
                        tag.textContent = isEnabled ? '✓ Downloader Active' : 'Disabled';
                    }
                    updateBadgeState();
                    ensureStatusDownloadBtn();
                    showToast(isEnabled ? '✓ Story Downloader enabled' : 'Story Downloader disabled');
                });
            }

            // Quick download button click
            const quickDlBtn = document.getElementById('wa-quick-dl-btn');
            if (quickDlBtn) {
                quickDlBtn.addEventListener('click', () => {
                    downloadActiveStory();
                });
            }

            return backdrop;
        }

        window.__wa_attach_pill = attachFloatingPill;
        window.__wa_open_features = function() {
            injectFeatureStyles();
            const backdrop = createModal() || document.getElementById('wa-modal-backdrop');
            if (backdrop) {
                // If a story is currently active, show the quick download button
                const quickDl = document.getElementById('wa-quick-dl-container');
                if (quickDl) {
                    const activeMedia = getActiveStatusMedia();
                    quickDl.style.display = activeMedia ? 'block' : 'none';
                }
                syncWhatsAppTheme();
                backdrop.classList.add('open');
            }
        };

        function closeFeaturesModal() {
            const backdrop = document.getElementById('wa-modal-backdrop');
            if (backdrop) backdrop.classList.remove('open');
        }

        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') closeFeaturesModal();
        });

        function attachFloatingPill() {
            if (!document.body) return;
            const existing = document.getElementById('wa-features-pill');
            if (existing && document.body.contains(existing)) return;
            if (existing) existing.remove();

            injectFeatureStyles();
            createModal();

            let pill = document.createElement('div');
            pill.id = 'wa-features-pill';
            pill.className = 'wa-feat-pill';
            pill.setAttribute('title', 'WhatsApp Features & Privacy (Click to open, Drag to move)');
            pill.innerHTML = `
                <span class="wa-feat-pill-icon">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                    </svg>
                </span>
                <span>Features</span>
                <span class="wa-feat-badge ${(window.__wa_stealth_story || window.__wa_stealth_messages || window.__wa_story_downloader) ? 'active' : ''}"></span>
            `;

            // Ensure bulletproof fixed positioning and maximum z-index directly on element
            pill.style.setProperty('position', 'fixed', 'important');
            pill.style.setProperty('bottom', '24px', 'important');
            pill.style.setProperty('left', '80px', 'important');
            pill.style.setProperty('z-index', '2147483647', 'important');
            pill.style.setProperty('display', 'inline-flex', 'important');
            pill.style.setProperty('align-items', 'center', 'important');
            pill.style.setProperty('gap', '8px', 'important');
            pill.style.setProperty('padding', '8px 16px', 'important');
            pill.style.setProperty('border-radius', '24px', 'important');
            pill.style.setProperty('cursor', 'pointer', 'important');
            pill.style.setProperty('font-family', '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif', 'important');
            pill.style.setProperty('font-size', '13px', 'important');
            pill.style.setProperty('font-weight', '600', 'important');
            pill.style.setProperty('line-height', 'normal', 'important');
            pill.style.setProperty('visibility', 'visible', 'important');
            pill.style.setProperty('opacity', '1', 'important');
            pill.style.setProperty('pointer-events', 'auto', 'important');
            pill.style.setProperty('user-select', 'none', 'important');
            pill.style.setProperty('-webkit-user-select', 'none', 'important');
            pill.style.setProperty('touch-action', 'none', 'important');

            // Restore saved position if available and within screen bounds
            try {
                const savedPos = JSON.parse(localStorage.getItem('wa_feat_btn_pos'));
                if (savedPos && savedPos.left && savedPos.top) {
                    const l = parseInt(savedPos.left, 10);
                    const t = parseInt(savedPos.top, 10);
                    const maxW = Math.max(200, (window.innerWidth || 1100) - 120);
                    const maxH = Math.max(200, (window.innerHeight || 750) - 50);
                    if (!isNaN(l) && !isNaN(t) && l >= 10 && l <= maxW && t >= 10 && t <= maxH) {
                        pill.style.setProperty('left', l + 'px', 'important');
                        pill.style.setProperty('top', t + 'px', 'important');
                        pill.style.setProperty('bottom', 'auto', 'important');
                        pill.style.setProperty('right', 'auto', 'important');
                    }
                }
            } catch(e) {}

            // Pointer-based dragging and click logic (works for mouse, trackpad, and touch)
            let isDragging = false;
            let dragMoved = false;
            let startX = 0, startY = 0, initialLeft = 0, initialTop = 0;

            function onPointerMove(ev) {
                const dx = ev.clientX - startX;
                const dy = ev.clientY - startY;
                if (Math.abs(dx) > 6 || Math.abs(dy) > 6) {
                    dragMoved = true;
                    isDragging = true;
                    const newX = Math.max(12, Math.min(window.innerWidth - pill.offsetWidth - 12, initialLeft + dx));
                    const newY = Math.max(12, Math.min(window.innerHeight - pill.offsetHeight - 12, initialTop + dy));
                    pill.style.left = newX + 'px';
                    pill.style.top = newY + 'px';
                    pill.style.bottom = 'auto';
                    pill.style.right = 'auto';
                }
            }

            function onPointerUp(ev) {
                document.removeEventListener('pointermove', onPointerMove);
                document.removeEventListener('pointerup', onPointerUp);
                if (dragMoved) {
                    try {
                        localStorage.setItem('wa_feat_btn_pos', JSON.stringify({
                            left: pill.style.left,
                            top: pill.style.top
                        }));
                    } catch(e) {}
                    setTimeout(() => {
                        isDragging = false;
                        dragMoved = false;
                    }, 80);
                } else {
                    isDragging = false;
                    dragMoved = false;
                }
            }

            pill.addEventListener('pointerdown', function(e) {
                if (e.button !== 0) return;
                dragMoved = false;
                isDragging = false;
                startX = e.clientX;
                startY = e.clientY;
                const rect = pill.getBoundingClientRect();
                initialLeft = rect.left;
                initialTop = rect.top;

                document.addEventListener('pointermove', onPointerMove);
                document.addEventListener('pointerup', onPointerUp);
            });

            pill.addEventListener('click', function(e) {
                if (isDragging || dragMoved) {
                    e.preventDefault();
                    e.stopPropagation();
                    return;
                }
                window.__wa_open_features();
            });

            document.body.appendChild(pill);
            syncWhatsAppTheme();
        }

        // Sync dark / light theme with WhatsApp Web dynamically
        function syncWhatsAppTheme() {
            if (!document.body) return;
            const isDark = document.body.classList.contains('dark') ||
                           document.documentElement.classList.contains('dark') ||
                           (document.body.getAttribute('data-theme') === 'dark');
            const backdrop = document.getElementById('wa-modal-backdrop');
            if (backdrop) backdrop.setAttribute('data-theme', isDark ? 'dark' : 'light');
            const pill = document.getElementById('wa-features-pill');
            if (pill) {
                pill.setAttribute('data-theme', isDark ? 'dark' : 'light');
                if (isDark) {
                    pill.style.setProperty('background', '#202c33', 'important');
                    pill.style.setProperty('color', '#e9edef', 'important');
                    pill.style.setProperty('border', '1px solid #374248', 'important');
                    pill.style.setProperty('box-shadow', '0 4px 16px rgba(0, 0, 0, 0.45)', 'important');
                } else {
                    pill.style.setProperty('background', '#ffffff', 'important');
                    pill.style.setProperty('color', '#111b21', 'important');
                    pill.style.setProperty('border', '1px solid #d1d7db', 'important');
                    pill.style.setProperty('box-shadow', '0 3px 12px rgba(11, 20, 26, 0.18)', 'important');
                }
            }
        }

        if (window.MutationObserver) {
            const themeObserver = new MutationObserver(syncWhatsAppTheme);
            if (document.body) {
                themeObserver.observe(document.body, { attributes: true, attributeFilter: ['class', 'data-theme'] });
            } else {
                window.addEventListener('DOMContentLoaded', () => {
                    themeObserver.observe(document.body, { attributes: true, attributeFilter: ['class', 'data-theme'] });
                    syncWhatsAppTheme();
                });
            }
        }

        // Observe status viewer lifecycle to show/hide download button seamlessly
        if (window.MutationObserver) {
            const statusObserver = new MutationObserver(() => {
                if (window.__wa_story_downloader) {
                    if (findStatusViewer()) {
                        ensureStatusDownloadBtn();
                    } else {
                        const existing = document.getElementById('wa-story-dl-btn');
                        if (existing) existing.remove();
                    }
                }
            });
            if (document.body) {
                statusObserver.observe(document.body, { childList: true });
            } else {
                window.addEventListener('DOMContentLoaded', () => {
                    statusObserver.observe(document.body, { childList: true });
                });
            }
        }
        document.addEventListener('click', () => {
            setTimeout(ensureStatusDownloadBtn, 150);
            setTimeout(scanAndPatchAllModules, 50);
        }, true);
        document.addEventListener('play', () => {
            setTimeout(ensureStatusDownloadBtn, 150);
            setTimeout(scanAndPatchAllModules, 50);
        }, true);

        // Keep floating pill reliably attached across SPA page re-renders, WhatsApp load stages, and dynamic DOM updates
        attachFloatingPill();
        window.addEventListener('DOMContentLoaded', attachFloatingPill);
        window.addEventListener('load', attachFloatingPill);
        setTimeout(attachFloatingPill, 1000);
        setTimeout(attachFloatingPill, 2500);
        setTimeout(attachFloatingPill, 5000);

        if (window.MutationObserver) {
            const pillObserver = new MutationObserver(() => {
                if (document.body && !document.getElementById('wa-features-pill')) {
                    attachFloatingPill();
                }
            });
            if (document.body) {
                pillObserver.observe(document.body, { childList: true });
            } else {
                window.addEventListener('DOMContentLoaded', () => {
                    if (document.body) pillObserver.observe(document.body, { childList: true });
                });
            }
        }

        // Heartbeat watchdog (every 2.5s) to guarantee pill remains in DOM under all circumstances
        setInterval(() => {
            if (document.body && !document.getElementById('wa-features-pill')) {
                attachFloatingPill();
            }
        }, 2500);
    })();
})();
