(function() {
    let result = {
        title: document.title || "",
        action: window.__wa_action || null,
        notifs: window.__wa_pending_notifs || [],
        latestSender: null,
        latestBody: null,
        topSender: null,
        topBody: null,
        unreadCount: 0,
        titleCount: 0,
        soundPlayed: window.__wa_sound_played || false
    };
    window.__wa_action = null;
    window.__wa_pending_notifs = [];
    window.__wa_sound_played = false;

    // Ensure Features Pill is actively attached on live page
    try {
        if (!document.getElementById('wa-features-pill') && typeof window.__wa_attach_pill === 'function') {
            window.__wa_attach_pill();
        }
    } catch(e) {}

    function toInt(str) {
        if (!str) return 0;
        let s = str.replace(/[٠-٩]/g, d => "٠١٢٣٤٥٦٧٨٩".indexOf(d));
        let num = parseInt(s.replace(/[^0-9]/g, ''), 10);
        return isNaN(num) ? 0 : num;
    }

    function isTimestamp(str) {
        if (!str) return false;
        const s = str.trim();
        return /^[\d٠-٩]{1,2}:[\d٠-٩]{2}(\s*[ap]m)?$/i.test(s) ||
               /^(\d{1,2}\/\d{1,2}(\/\d{2,4})?)$/.test(s) ||
               s === 'Yesterday' || s === 'أمس' || s === 'Today' || s === 'اليوم';
    }

    function isMediaLabel(str) {
        if (!str) return false;
        const s = str.trim().toLowerCase();
        return s === 'photo' || s === 'sticker' || s === 'video' || s === 'audio' ||
               s === 'voice message' || s === 'gif' || s === 'document' || s === 'contact' ||
               s === 'صورة' || s === 'ملصق' || s === 'فيديو' || s === 'مقطع صوتي' ||
               s === 'رسالة صوتية' || s === 'مستند' || s === 'جهة اتصال';
    }

    function isIgnored(name) {
        if (!name) return true;
        const lower = name.trim().toLowerCase();
        if (isTimestamp(name)) return true;
        return lower === 'whatsapp' ||
               lower === 'archived' ||
               lower === 'المؤرشفة' ||
               lower === 'archive' ||
               lower === 'أرشيف' ||
               lower.includes('archived') ||
               lower.includes('المؤرشفة');
    }

    let titleMatch = result.title.match(/\(([0-9٠-٩]+)\)/);
    if (titleMatch) {
        result.titleCount = toInt(titleMatch[1]);
    }

    // Performance optimization: When there are no unread messages, no sound, and no pending notifs,
    // skip DOM queries completely to keep scrolling and background CPU usage at near zero!
    if (result.titleCount === 0 && !result.soundPlayed && (!result.notifs || result.notifs.length === 0)) {
        window.__wa_poll_cache = {
            lastTitle: result.title,
            topSender: null,
            topBody: null,
            latestSender: null,
            latestBody: null,
            unreadCount: 0,
            lastScanTime: Date.now()
        };
        return result;
    }

    // Smart Delta Cache: If title, unread count, sound, and notifs haven't changed,
    // reuse cached chat details instead of traversing the whole DOM every tick!
    const cache = window.__wa_poll_cache;
    const now = Date.now();
    if (cache &&
        cache.lastTitle === result.title &&
        !result.soundPlayed &&
        (!result.notifs || result.notifs.length === 0) &&
        (now - cache.lastScanTime < 8000)) {
        result.topSender = cache.topSender;
        result.topBody = cache.topBody;
        result.latestSender = cache.latestSender;
        result.latestBody = cache.latestBody;
        result.unreadCount = cache.unreadCount || result.titleCount;
        return result;
    }

    function extractChatDetails(row) {
        if (!row) return null;
        let sender = null;
        let body = null;
        try {
            // Find sender name: must be from the title section
            const titleEl = row.querySelector(
                '[data-testid="cell-frame-title"] span[title], [data-testid="cell-frame-title"] span[dir="auto"], [data-testid="cell-frame-title"]'
            );
            if (titleEl) {
                const s = (titleEl.getAttribute('title') || titleEl.innerText || "").trim();
                if (s && !isTimestamp(s) && !isMediaLabel(s) && !isIgnored(s)) {
                    sender = s;
                }
            }

            if (!sender) {
                const spans = row.querySelectorAll('div._ak8q span[title], div._ak8q span[dir="auto"], span[title]');
                for (const sp of spans) {
                    const s = (sp.getAttribute('title') || sp.innerText || "").trim();
                    if (s && !isTimestamp(s) && !isMediaLabel(s) && !isIgnored(s)) {
                        sender = s;
                        break;
                    }
                }
            }

            if (!sender || isIgnored(sender)) {
                return null;
            }

            // Find message body preview
            const bodyEl = row.querySelector(
                '[data-testid="last-msg-status"], [data-testid="cell-frame-body"] span, span._ao3e, div._ak8l span, div._ak8k span, span[dir="ltr"], span[dir="rtl"]'
            );
            if (bodyEl) {
                body = (bodyEl.getAttribute('title') || bodyEl.innerText || "").trim();
                if (body === sender) {
                    body = null;
                }
            }

            if (!body) {
                if (row.querySelector('[data-testid="status-image"], [data-icon="status-image"]')) {
                    body = "📷 Photo";
                } else if (row.querySelector('[data-testid="status-sticker"], [data-icon="status-sticker"]')) {
                    body = "🖼️ Sticker";
                } else if (row.querySelector('[data-testid="status-video"], [data-icon="status-video"]')) {
                    body = "🎥 Video";
                } else if (row.querySelector('[data-testid="status-audio"], [data-icon="status-audio"]')) {
                    body = "🎤 Voice message";
                } else if (row.querySelector('[data-testid="status-document"], [data-icon="status-document"]')) {
                    body = "📄 Document";
                }
            }
        } catch(e) {}

        if (sender && !isIgnored(sender)) {
            return { sender: sender, body: body || "New message" };
        }
        return null;
    }

    const sidePane = document.getElementById('pane-side') || document;

    // 1. Get the very top REAL chat in the list (skipping Archived)
    try {
        const topCandidates = sidePane.querySelectorAll('[data-testid="cell-frame-container"], [role="listitem"], [role="row"], div[tabindex="-1"]');
        for (const c of topCandidates) {
            const det = extractChatDetails(c);
            if (det && !isIgnored(det.sender)) {
                result.topSender = det.sender;
                result.topBody = det.body;
                break;
            }
        }
    } catch(e) {}

    // 2. Scan for unread badges and resolve their chat rows (skipping Archived)
    try {
        const unreadNodes = sidePane.querySelectorAll(
            'span[aria-label*="unread" i], span[aria-label*="غير مقروء" i], div[aria-label*="unread" i], div[aria-label*="غير مقروء" i], [data-testid="unread-count"], span._ahlk'
        );
        let domCount = 0;
        for (const node of unreadNodes) {
            const row = node.closest('[data-testid="cell-frame-container"], [role="listitem"], [role="row"], div[tabindex="-1"]');
            const det = row ? extractChatDetails(row) : null;
            if (det) {
                let val = toInt(node.innerText || node.getAttribute('aria-label'));
                domCount += (val > 0 ? val : 1);

                if (!result.latestSender) {
                    result.latestSender = det.sender;
                    result.latestBody = det.body;
                }
            }
        }

        // WhatsApp title count is the most accurate; if title count is 0, use DOM count
        result.unreadCount = result.titleCount > 0 ? result.titleCount : domCount;
    } catch(e) {}

    // If no unread row was resolved from badges, do NOT fall back to topSender!
    if (!result.latestSender && result.unreadCount > 0) {
        result.latestSender = "WhatsApp";
        result.latestBody = result.unreadCount === 1 ? "New message" : `${result.unreadCount} unread messages`;
    }

    // Save scan to cache
    window.__wa_poll_cache = {
        lastTitle: result.title,
        topSender: result.topSender,
        topBody: result.topBody,
        latestSender: result.latestSender,
        latestBody: result.latestBody,
        unreadCount: result.unreadCount,
        lastScanTime: now
    };

    return result;
})();
