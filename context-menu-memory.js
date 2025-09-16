import { getAccessToken } from './utils/auth.js';
import * as gateway from './utils/mem0_gateway.js';
import * as contextScope from './utils/context_scope_adapter.js';
import * as telemetry from './utils/telemetry.js';

export function initContextMenuMemory() {
  try {
    chrome.contextMenus.create(
      {
        id: "mem0.saveSelection",
        title: "Save to MemLoop",
        contexts: ["selection"],
      },
      () => { chrome.runtime && chrome.runtime.lastError; }
    );
  } catch (e) {
    // ignore
  }

  chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    if (!tab || !tab.id || info.menuItemId !== "mem0.saveSelection") return;

    try {
      const selection = (info.selectionText || "").trim();
      if (!selection) { toast(tab.id, "Select text first", "error"); return; }

      const token = await getAccessToken();
      if (!token) { toast(tab.id, "Sign in required", "error"); return; }
      
      const settings = await new Promise(r => chrome.storage.sync.get(["memory_enabled", "domainBlacklist"], items => r(items || {})));
      if (settings.memory_enabled === false) {
        toast(tab.id, "Memory saving is disabled in settings.", "info");
        return;
      }
      const url = info.pageUrl || tab.url || "";
      if (settings.domainBlacklist && settings.domainBlacklist.some(d => url.includes(d))) {
        toast(tab.id, "This domain is blacklisted.", "info");
        return;
      }

      const title = tab.title || "";
      
      try {
        const context = contextScope.getContext ? await contextScope.getContext({ url, title }) : {};
        
        const body = {
          messages: [{ role: "user", content: selection }],
          metadata: {
            provider: "ContextMenu",
            category: "BOOKMARK",
            context: context,
            tags: context.tags || []
          },
          source: "MemLoopChromeExtension",
        };

        const t0 = Date.now();
        const ok = gateway.saveMemory ? await gateway.saveMemory(body) : false;
        const duration = Date.now() - t0;
        
        telemetry.emit('memory_saved', { ok, durationMs: duration, domain: context.domain });
        toast(tab.id, ok ? "Saved to MemLoop" : "Failed to save", ok ? "success" : "error");
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("Failed to add memory:", err);
        toast(tab.id, "Failed to save", "error");
      }
    } catch (e) {
      // Handle any unexpected errors during the click listener
      toast(tab.id, "An unexpected error occurred.", "error");
    }
  });
}

function toast(tabId, message, variant = "success") {
  try {
    chrome.tabs.sendMessage(tabId, {
      type: "mem0:toast",
      payload: { message, variant },
    });
  } catch (e) {
    // Best effort only
  }
}

function normalize(text) {
  return (text || "").replace(/\s+/g, " ").trim();
}

function clamp(text, max) {
  if (!text) return text;
  if (text.length <= max) return text;
  return text.slice(0, max - 1).trimEnd() + "…";
}

function composeBasic({ selection, title, url }) {
  const s = clamp(normalize(selection), 700);
  // Return raw selection only (no prefixes). We keep title/url only in metadata.
  return s;
}

function requestSelectionContext(tabId) {
  return new Promise((resolve) => {
    try {
      chrome.tabs.sendMessage(tabId, { type: "mem0:getSelectionContext" }, (resp) => {
        if (chrome.runtime && chrome.runtime.lastError) { resolve({ error: chrome.runtime.lastError.message }); return; }
        resolve(resp || { error: "no-response" });
      });
    } catch (e) {
      resolve({ error: String(e) });
    }
  });
}

async function tryInjectSelectionScript(tabId) {
  try {
    if (!chrome.scripting) return false;
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['selection_context.js']
    });
    return true;
  } catch (e) { return false; }
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

async function addMemory(content, settings, pageUrl, pageTitle) {
  const headers = { "Content-Type": "application/json" };
  if (settings.accessToken) headers.Authorization = `Bearer ${settings.accessToken}`; else throw new Error("Missing credentials");

  const body = {
    messages: [{ role: "user", content }],
    user_id: settings.userId,
    metadata: {
      provider: "ContextMenu",
      category: "BOOKMARK",
      context: (() => {
        try {
          // lazy import to avoid MV3 service worker import issues at load
          const { collectRelativeContext } = chrome?.runtime ? {} : {};
        } catch (e) {}
        return undefined;
      })()
    },
    source: "OPENMEMORY_CHROME_EXTENSION",
  };
  if (settings.orgId) body.org_id = settings.orgId;
  if (settings.projectId) body.project_id = settings.projectId;

  // Enrich metadata.context with relative scope (domain/route/page/env)
  try {
    const ctx = contextScope && contextScope.collectRelativeContext ? contextScope.collectRelativeContext({ url: pageUrl, title: pageTitle }) : null;
    if (ctx) body.metadata.context = ctx;
  } catch (e) { }

  // Resolve tenant
  const tenant = settings.orgId || settings.projectId || 'carousel-labs';

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const t0 = Date.now();
    const ok = gateway && gateway.saveMemory ? await gateway.saveMemory({ tenant, body }) : false;
    const duration = Date.now() - t0;
    try {
      if (telemetry && telemetry.emit) {
        const domainName = (body && body.metadata && body.metadata.context && body.metadata.context.domain && body.metadata.context.domain.name) || null;
        await telemetry.emit('memory_saved', { ok, tenant, durationMs: duration, domain: domainName });
      }
    } catch (e) {}
    return ok;
  } finally {
    clearTimeout(timeout);
  }
}


