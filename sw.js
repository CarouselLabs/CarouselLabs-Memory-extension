import { initContextMenuMemory } from './context-menu-memory.js';
import { initDirectUrlTracking } from './direct-url-tracker.js';
import * as auth from './utils/auth.js';
import { ensureAuthConfig } from './utils/auto_config.js';
import * as gw from './utils/mem0_gateway.js';
import * as env from './utils/env_config.js';
import * as contextScope from './utils/context_scope_adapter.js';
import * as ranking from './utils/ranking.js';
import * as telemetry from './utils/telemetry.js';
// SSM config removed - extensions use static config

// Render an SVG into raster ImageData and set as action icon
async function setActionIconFromSvg(svgPath) {
  try {
    const url = chrome.runtime.getURL(svgPath);
    const res = await fetch(url);
    if (!res.ok) return;
    const blob = await res.blob();
    const bitmap = await createImageBitmap(blob);
    const sizes = [16, 48, 128];
    const imageData = {};
    for (const size of sizes) {
      const canvas = new OffscreenCanvas(size, size);
      const ctx = canvas.getContext('2d');
      const scale = Math.min(size / bitmap.width, size / bitmap.height);
      const dw = Math.max(1, Math.floor(bitmap.width * scale));
      const dh = Math.max(1, Math.floor(bitmap.height * scale));
      const dx = Math.floor((size - dw) / 2);
      const dy = Math.floor((size - dh) / 2);
      ctx.clearRect(0, 0, size, size);
      ctx.drawImage(bitmap, dx, dy, dw, dh);
      imageData[size] = ctx.getImageData(0, 0, size, size);
    }
    await chrome.action.setIcon({ imageData });
  } catch (_) {
    // Non-fatal: keep default PNGs
  }
}

// Same as above but force a tint by inlining a style into the SVG text before rasterizing
async function setActionIconFromSvgTinted(svgPath, tintHex) {
  try {
    const url = chrome.runtime.getURL(svgPath);
    const res = await fetch(url);
    if (!res.ok) return;
    let svg = await res.text();
    // Inject a style to override fills/strokes
    const styleTag = `<style>*{fill:${tintHex}!important;stroke:${tintHex}!important}</style>`;
    if (svg.includes('</svg>')) {
      svg = svg.replace(/<svg\b([^>]*)>/i, (m) => `${m}${styleTag}`);
    } else {
      svg = `<svg xmlns="http://www.w3.org/2000/svg">${styleTag}${svg}</svg>`;
    }
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const bitmap = await createImageBitmap(blob);
    const sizes = [16, 48, 128];
    const imageData = {};
    for (const size of sizes) {
      const canvas = new OffscreenCanvas(size, size);
      const ctx = canvas.getContext('2d');
      const scale = Math.min(size / bitmap.width, size / bitmap.height);
      const dw = Math.max(1, Math.floor(bitmap.width * scale));
      const dh = Math.max(1, Math.floor(bitmap.height * scale));
      const dx = Math.floor((size - dw) / 2);
      const dy = Math.floor((size - dh) / 2);
      ctx.clearRect(0, 0, size, size);
      ctx.drawImage(bitmap, dx, dy, dw, dh);
      imageData[size] = ctx.getImageData(0, 0, size, size);
    }
    await chrome.action.setIcon({ imageData });
  } catch (_) {
    // fall back silently
  }
}

async function getIconTint() {
  const d = await new Promise((r)=>{ try { chrome.storage.sync.get(['icon_tint_hex'], (x)=>r(x||{})); } catch { r({}); } });
  return d.icon_tint_hex || '#4DB9A5'; // default mint green to match CTA button
}

// Initial setting when extension is installed or updated
chrome.runtime.onInstalled.addListener((details) => {
  chrome.storage.sync.set({ memory_enabled: true }, function() {
    console.log('Memory enabled set to true on install/update');
  });
  // Best-effort auto configuration on install/update
  ensureAuthConfig().catch(()=>{});
  // Force new default icon color on install/update
  (async ()=>{ 
    try { 
      // Clear any old tint and set new default
      await new Promise((r)=>{ try { chrome.storage.sync.remove(['icon_tint_hex'], ()=>r(true)); } catch { r(true); } });
      const tint = await getIconTint(); // Will now use new default #4DB9A5
      await setActionIconFromSvgTinted('icons/logo-beaker-green.svg', tint); 
      console.log('Icon tint updated to:', tint);
    } catch {} 
  })();
});

// Re-apply icon on browser startup (SW can be restarted)
chrome.runtime.onStartup?.addListener(() => {
  (async ()=>{ try { const tint = await getIconTint(); await setActionIconFromSvgTinted('icons/logo-beaker-green.svg', tint); } catch {} })();
});

// Allow runtime tint updates
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request && request.type === 'memloop_set_icon_tint') {
    (async ()=>{
      try {
        const hex = String(request.hex || '').trim();
        if (!/^#?[0-9a-fA-F]{6}$/.test(hex.replace('#',''))) throw new Error('bad_hex');
        const value = hex.startsWith('#') ? hex : `#${hex}`;
        await new Promise((r)=>{ try { chrome.storage.sync.set({ icon_tint_hex: value }, ()=>r(true)); } catch { r(true); } });
        await setActionIconFromSvgTinted('icons/logo-beaker-green.svg', value);
        sendResponse({ ok: true, hex: value });
      } catch (e) {
        sendResponse({ ok: false, error: (e && e.message) || String(e) });
      }
    })();
    return true;
  }
});

// Keep the existing message listener for opening dashboard
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "openDashboard") {
    chrome.tabs.create({ url: request.url });
  }
  if (request.action === "openPopup") {
    // MV3 cannot programmatically open browser action popup; open options as fallback
    chrome.runtime.openOptionsPage();
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "toggleSidebarSettings") {
    try {
      const tabId = sender && sender.tab && typeof sender.tab.id === 'number' ? sender.tab.id : null;
      if (tabId !== null) {
        chrome.tabs.sendMessage(tabId, { action: "toggleSidebarSettings" }, () => {
          // Swallow errors when no content script is present
          void chrome.runtime.lastError;
        });
      }
    } catch (_) {}
  } 
}); 

// Handle sign-in initiated from content scripts (content scripts cannot use chrome.identity)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request && request.type === 'memloop_signin') {
    (async () => {
      try {
        try { await ensureAuthConfig(); } catch (_) {}
        const d = await new Promise((resolve)=>{
          chrome.storage.sync.get([
            'cognito_domain','cognito_client_id','auth_exchange_url'
          ], (x)=> resolve(x||{}));
        });
        console.log('[MemLoop Debug] Read from sync storage:', d);
        // Load baked defaults as a safety net (prevents stale old client IDs)
        let baked = null;
        try {
          const res = await fetch(chrome.runtime.getURL('config/auth.defaults.json'));
          if (res.ok) {
            baked = await res.json();
            console.log('[MemLoop Debug] Read from baked file:', baked);
          }
        } catch (_) {}
        const bakedDomain = baked && (baked.cognito_domain || baked.domain) || '';
        const bakedClientId = baked && (baked.cognito_client_id || baked.client_id) || '';
        const bakedExchange = baked && (baked.auth_exchange_url || baked.exchange_url) || '';
        const isOld = (cid)=> typeof cid === 'string' && cid.startsWith('21ep');
        const domain = (d && d.cognito_domain) || bakedDomain || '';
        const clientId = isOld(d && d.cognito_client_id) ? bakedClientId : ((d && d.cognito_client_id) || bakedClientId || '');
        const exchangeUrl = (d && d.auth_exchange_url) || bakedExchange || '';
        if (!domain || !clientId || !exchangeUrl) throw new Error('missing_auth_config');
        // Helpful log
        try { console.log('[MemLoop SignIn Using]', { domain, clientId, exchangeUrl }); } catch(_) {}
        await auth.signInWithCognito({ domain, clientId, exchangeUrl });
        sendResponse({ ok: true });
      } catch (e) {
        sendResponse({ ok: false, error: (e && e.message) || String(e) });
      }
    })();
    return true; // keep the message channel open for async sendResponse
  }
});

// Debug verification: checks tokens, env base and performs a tiny save
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request && request.type === 'memloop_verify') {
    (async () => {
      try {
        try { await ensureAuthConfig(); } catch(_) {}
        const { access_token, access_token_exp, id_token, tenant: storedTenant } = await new Promise((resolve)=>{
          chrome.storage.session.get([ 'access_token','access_token_exp','id_token','tenant' ], (d)=>resolve(d||{}));
        });
        const now = Math.floor(Date.now()/1000);
        const tokenValid = !!access_token && typeof access_token_exp === 'number' && access_token_exp > (now + 30);
        const tenant = storedTenant || await auth.getTenant();
        const base = await env.resolveGatewayBaseUrl();

        let saveOk = false;
        if (tokenValid && tenant) {
          saveOk = await gw.saveMemory({
            tenant,
            body: { text: 'MemLoop verification save', source: 'memloop-verify', url: 'https://example.com' }
          });
        }

        const result = { ok: true, tokenValid, hasIdToken: !!id_token, tenant: tenant || null, base, saveOk };
        console.log('[MemLoop Verify]', result);
        sendResponse(result);
      } catch (e) {
        const err = { ok: false, error: (e && e.message) || String(e) };
        console.error('[MemLoop Verify] failed', err);
        sendResponse(err);
      }
    })();
    return true;
  }
});

// Debug: print id_token payload
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request && request.type === 'memloop_profile') {
    (async () => {
      try {
        const { id_token } = await new Promise((resolve)=>{
          chrome.storage.session.get([ 'id_token' ], (d)=>resolve(d||{}));
        });
        const payload = id_token ? JSON.parse(atob(String(id_token).split('.')[1])) : null;
        console.log('[MemLoop Profile]', payload);
        sendResponse({ ok: true, payload });
      } catch (e) {
        sendResponse({ ok: false, error: (e && e.message) || String(e) });
      }
    })();
    return true;
  }
});

// Debug: derive and set tenant from id_token (custom:tenant or first group)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request && request.type === 'memloop_fix_tenant') {
    (async () => {
      try {
        const { id_token } = await new Promise((resolve)=>{
          chrome.storage.session.get([ 'id_token' ], (d)=>resolve(d||{}));
        });
        if (!id_token) throw new Error('no_id_token');
        const payload = JSON.parse(atob(String(id_token).split('.')[1]));
        const t = payload?.['custom:tenant'] || (Array.isArray(payload?.['cognito:groups']) ? payload['cognito:groups'][0] : null);
        if (!t) throw new Error('no_tenant_claim');
        await new Promise((resolve)=>{ try { chrome.storage.session.set({ tenant: t }, ()=>resolve(true)); } catch { resolve(true); } });
        console.log('[MemLoop Tenant Set]', t);
        sendResponse({ ok: true, tenant: t });
      } catch (e) {
        sendResponse({ ok: false, error: (e && e.message) || String(e) });
      }
    })();
    return true;
  }
});

// Debug: print current auth config (from storage.sync)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request && request.type === 'memloop_print_config') {
    (async () => {
      try {
        const cfg = await new Promise((resolve)=>{
          chrome.storage.sync.get(['cognito_domain','cognito_client_id','auth_exchange_url'], (d)=>resolve(d||{}));
        });
        console.log('[MemLoop Config]', cfg);
        sendResponse({ ok: true, config: cfg });
      } catch (e) {
        sendResponse({ ok: false, error: (e && e.message) || String(e) });
      }
    })();
    return true;
  }
});

// Debug: reset auth config from baked defaults
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request && request.type === 'memloop_reset_config') {
    (async () => {
      try {
        const url = chrome.runtime.getURL('config/auth.defaults.json');
        const res = await fetch(url);
        if (!res.ok) throw new Error('no_baked_defaults');
        const j = await res.json();
        const baked = {
          cognito_domain: j.cognito_domain || j.domain,
          cognito_client_id: j.cognito_client_id || j.client_id,
          auth_exchange_url: j.auth_exchange_url || j.exchange_url || null,
        };
        await new Promise((resolve)=>{ chrome.storage.sync.set(baked, ()=>resolve(true)); });
        console.log('[MemLoop Config Reset]', baked);
        sendResponse({ ok: true, config: baked });
      } catch (e) {
        sendResponse({ ok: false, error: (e && e.message) || String(e) });
      }
    })();
    return true;
  }
});

// Handle crawl requests from floating control
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request && request.type === 'memloop_crawl') {
    (async () => {
      try {
        console.log('[MemLoop Crawl] Starting crawl request:', request.params);
        
        // Get authentication token
        const token = await auth.getAccessToken();
        if (!token) {
          throw new Error('Authentication required. Please sign in first.');
        }

        // Get gateway configuration
        const gatewayUrl = await env.buildGatewayBaseUrl();
        if (!gatewayUrl) {
          throw new Error('Gateway configuration not found. Please check your settings.');
        }

        // Prepare crawl request (use the full payload from floating control)
        const crawlData = request.params;

        // Send crawl request
        const response = await fetch(`${gatewayUrl}/crawl4ai/crawl`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(crawlData)
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Crawl request failed: ${response.status} ${errorText}`);
        }

        const result = await response.json();
        console.log('[MemLoop Crawl] Success:', result);
        sendResponse({ ok: true, result });
      } catch (e) {
        const error = (e && e.message) || String(e);
        console.error('[MemLoop Crawl] Error:', error);
        sendResponse({ ok: false, error });
      }
    })();
    return true;
  }
});

// Handle get access token requests from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request && request.type === 'memloop_get_token') {
    (async () => {
      try {
        const token = await auth.getAccessToken();
        sendResponse({ ok: true, token });
      } catch (e) {
        const error = (e && e.message) || String(e);
        console.error('[MemLoop GetToken] Error:', error);
        sendResponse({ ok: false, error });
      }
    })();
    return true;
  }
});

// Handle search memories requests from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request && request.type === 'memloop_search_memories') {
    (async () => {
      try {
        const token = await auth.getAccessToken();
        if (!token) {
          sendResponse({ ok: false, error: 'No authentication token' });
          return;
        }

        const { searchParams } = request.data;
        const results = await gw.searchMemories(searchParams);
        sendResponse({ ok: true, results });
      } catch (e) {
        const error = (e && e.message) || String(e);
        console.error('[MemLoop Search] Error:', error);
        sendResponse({ ok: false, error });
      }
    })();
    return true;
  }
});

// Handle get context requests from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request && request.type === 'memloop_get_context') {
    (async () => {
      try {
        const { params } = request.data || {};
        const context = await contextScope.getContext(params || {});
        sendResponse({ ok: true, context });
      } catch (e) {
        const error = (e && e.message) || String(e);
        console.error('[MemLoop GetContext] Error:', error);
        sendResponse({ ok: false, error });
      }
    })();
    return true;
  }
});

// Handle ranking requests from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request && request.type === 'memloop_rank_memories') {
    (async () => {
      try {
        const { memories, context } = request.data;
        const rankedMemories = ranking.rankAndSort(memories, context);
        sendResponse({ ok: true, rankedMemories });
      } catch (e) {
        const error = (e && e.message) || String(e);
        console.error('[MemLoop Ranking] Error:', error);
        sendResponse({ ok: false, error });
      }
    })();
    return true;
  }
});

// Handle telemetry requests from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request && request.type === 'memloop_emit_telemetry') {
    (async () => {
      try {
        const { event, data } = request.data;
        await telemetry.emit(event, data);
        sendResponse({ ok: true });
      } catch (e) {
        const error = (e && e.message) || String(e);
        console.error('[MemLoop Telemetry] Error:', error);
        sendResponse({ ok: false, error });
      }
    })();
    return true;
  }
});

// Handle save memory requests from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request && request.type === 'memloop_save_memory') {
    (async () => {
      try {
        console.log('[MemLoop Save] Starting save memory request:', request.data);
        
        // Get authentication token
        const token = await auth.getAccessToken();
        if (!token) {
          throw new Error('Authentication required. Please sign in first.');
        }

        // Get tenant info
        const tenant = await auth.getTenant();
        if (!tenant) {
          throw new Error('Tenant information not found. Please sign in again.');
        }

        // Prepare memory data
        const { message, provider, url, messages } = request.data;
        const memoryData = {
          text: message,
          source: `memloop-${provider.toLowerCase()}`,
          url: url,
          metadata: {
            provider: provider,
            timestamp: new Date().toISOString(),
            messages: messages || []
          }
        };

        // Save memory using the gateway
        const saveResult = await gw.saveMemory({
          tenant,
          body: memoryData
        });

        console.log('[MemLoop Save] Success:', saveResult);
        sendResponse({ ok: true, result: saveResult });
      } catch (e) {
        const error = (e && e.message) || String(e);
        console.error('[MemLoop Save] Error:', error);
        sendResponse({ ok: false, error });
      }
    })();
    return true;
  }
});

// Initialize features
initContextMenuMemory();
initDirectUrlTracking();


