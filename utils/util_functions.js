/**
 * Utility function to send extension events to PostHog via mem0 API
 * @param {string} eventType - The type of event (e.g., "extension_install", "extension_toggle_button")
 * @param {Object} additionalData - Optional additional data to include with the event
 * @param {Function} callback - Optional callback function called after attempt (receives success boolean)
 */
function sendExtensionEvent(eventType, additionalData = {}, callback = null) {
    chrome.storage.sync.get(["userId", "user_id"], async function () {
        try {
            const env = await import(chrome.runtime.getURL('utils/env_config.js'));
            const base = env && env.resolveGatewayBaseUrl ? await env.resolveGatewayBaseUrl() : null;
            if (!base) { if (callback) callback(false); return; }
            const payload = {
                event_type: eventType,
                additional_data: {
                    timestamp: new Date().toISOString(),
                    version: chrome.runtime.getManifest().version,
                    user_agent: navigator.userAgent,
                    ...additionalData
                }
            };
            fetch(`${base}/extension/events`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            }).then(r=>{ if (callback) callback(r.ok); }).catch(()=>{ if (callback) callback(false); });
        } catch (e) { if (callback) callback(false); }
    });
}

function getBrowser() {
    const userAgent = navigator.userAgent;
    if (userAgent.includes('Edg/')) return 'Edge';
    if (userAgent.includes('OPR/') || userAgent.includes('Opera/')) return 'Opera';
    if (userAgent.includes('Chrome/')) return 'Chrome';
    if (userAgent.includes('Firefox/')) return 'Firefox';
    if (userAgent.includes('Safari/') && !userAgent.includes('Chrome/')) return 'Safari';
    return 'Unknown';
}