(function () {
  // Utilities
  function normalize(text) {
    return (text || "").replace(/\s+/g, " ").trim();
  }

  function getSettings() {
    return new Promise((resolve) => {
      chrome.storage.sync.get(
        [
          "access_token",
          "user_id",
          "selected_org",
          "selected_project",
          "memory_enabled",
        ],
        (d) => {
          resolve({
            hasCreds: Boolean(d.access_token),
            accessToken: d.access_token || null,
            userId: d.user_id || "chrome-extension-user",
            orgId: d.selected_org || null,
            projectId: d.selected_project || null,
            memoryEnabled: d.memory_enabled !== false,
          });
        }
      );
    });
  }

  function formatTimestamp() {
    try {
      const now = new Date();
      const date = now.toLocaleDateString(undefined, {
        year: 'numeric', month: 'short', day: 'numeric'
      });
      const time = now.toLocaleTimeString(undefined, {
        hour: 'numeric', minute: '2-digit'
      });
      return { date, time };
    } catch {
      return { date: new Date().toISOString().slice(0,10), time: new Date().toISOString().slice(11,16) };
    }
  }

  async function addMemory(content, settings, pageUrl, engine) {
    const headers = { "Content-Type": "application/json" };
    if (settings.accessToken) headers.Authorization = `Bearer ${settings.accessToken}`; else return false;

    const body = {
      messages: [{ role: "user", content }],
      user_id: settings.userId,
      metadata: {
        provider: "SearchTracker",
        category: "SEARCH",
        engine: engine || "",
        page_url: pageUrl || location.href,
      },
      source: "OPENMEMORY_CHROME_EXTENSION",
    };
    if (settings.orgId) body.org_id = settings.orgId;
    if (settings.projectId) body.project_id = settings.projectId;

    try {
      const gw = await import(chrome.runtime.getURL('utils/mem0_gateway.js'));
      const tenant = settings.orgId || settings.projectId || 'carousel-labs';
      const ok = gw && gw.saveMemory ? await gw.saveMemory({ tenant, body }) : false;
      return ok;
    } catch { return false; }
  }

  function maybeSend(engine, query) {
    const q = normalize(query);
    if (!q || q.length < 2) return;

    getSettings().then(async (settings) => {
      if (!settings.hasCreds || settings.memoryEnabled === false) return;
      // Gate by track_searches toggle (default ON if undefined)
      const allow = await new Promise((resolve) => {
        try {
          chrome.storage.sync.get(["track_searches"], (d) => {
            resolve(d.track_searches !== false);
          });
        } catch { resolve(true); }
      });
      if (!allow) return;
      const ts = formatTimestamp();
      const content = `Searched on ${engine}: ${q} on ${ts.date} at ${ts.time}`;
      const ok = await addMemory(content, settings, location.href, engine);
    });
  }

  // URL based capture for results pages
  function urlCapture() {
    const host = location.hostname || "";
    const path = location.pathname || "";
    const params = new URLSearchParams(location.search || "");

    // Google results
    if (/(^|\.)google\./.test(host) && path.startsWith("/search")) {
      const q = params.get("q");
      if (q) maybeSend("Google", q);
      return;
    }

    // Bing results
    if (host.endsWith("bing.com") && (path === "/search" || path === "/")) {
      const q = params.get("q");
      if (q) maybeSend("Bing", q);
      return;
    }

    // Brave results
    if (host === "search.brave.com" && (path === "/search" || path === "/images")) {
      const q = params.get("q");
      if (q) maybeSend("Brave", q);
      return;
    }

    // Arc results
    if (host === "search.arc.net" && (path === "/search" || path.startsWith("/search"))) {
      const q = params.get("q") || params.get("query");
      if (q) maybeSend("Arc", q);
      return;
    }
  }

  function installSpaUrlWatcher() {
    const origPush = history.pushState;
    const origReplace = history.replaceState;
    function onUrlChange() { try { urlCapture(); } catch {} }
    history.pushState = function () { origPush.apply(this, arguments); onUrlChange(); };
    history.replaceState = function () { origReplace.apply(this, arguments); onUrlChange(); };
    window.addEventListener("popstate", onUrlChange);
  }

  // Run
  urlCapture();
  installSpaUrlWatcher();
})();


