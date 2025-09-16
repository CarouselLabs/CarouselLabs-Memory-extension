// Auto-configure auth/settings from backend based on selected environment.
// Attempts multiple well-known endpoints and persists values to chrome.storage.sync
// without requiring user input.

import { resolveGatewayBaseUrl } from './env_config.js';

function setSync(values) {
  return new Promise((resolve) => {
    try { chrome.storage.sync.set(values, () => resolve(true)); } catch { resolve(false); }
  });
}

function getSync(keys) {
  return new Promise((resolve) => {
    try { chrome.storage.sync.get(keys, (d) => resolve(d || {})); } catch { resolve({}); }
  });
}

async function fetchJson(url, timeoutMs = 4000) {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`http_${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(id);
  }
}

export async function ensureAuthConfig() {
  // If config already present, do nothing
  const existing = await getSync(['cognito_domain','cognito_client_id','auth_exchange_url']);
  if (existing.cognito_domain && existing.cognito_client_id && existing.auth_exchange_url) {
    try {
      const tele = await import(chrome.runtime.getURL('utils/telemetry.js'));
      if (tele && tele.emit) { await tele.emit('config_source', { source: 'stored' }); }
    } catch (_) {}
    return { ok: true, source: 'stored' };
  }

  // 1) Try baked-in defaults if shipped with the extension
  try {
    const localUrl = chrome.runtime.getURL('config/auth.defaults.json');
    const local = await fetchJson(localUrl, 1500).catch(() => null);
    if (local && (local.cognito_domain || local.domain) && (local.cognito_client_id || local.client_id)) {
      const baked = {
        cognito_domain: local.cognito_domain || local.domain,
        cognito_client_id: local.cognito_client_id || local.client_id,
        auth_exchange_url: local.auth_exchange_url || local.exchange_url || local.token_url || null,
      };
      // If exchange URL not provided, derive from selected env API origin
      // resolveGatewayBaseUrl may return a path like https://api.dev.carousellabs.co/mem0
      // The exchange endpoint lives at the API origin: https://api.[env].carousellabs.co/auth/exchange
      if (!baked.auth_exchange_url) {
        try {
          const derivedBase = await resolveGatewayBaseUrl();
          if (derivedBase) {
            let origin = derivedBase;
            try { origin = new URL(derivedBase).origin; } catch (_) {
              // Fallback: normalize to https://host if a path-only value sneaks in
              const host = String(derivedBase).replace(/^https?:\/\//, '').split('/')[0];
              origin = `https://${host}`;
            }
            baked.auth_exchange_url = `${origin}/auth/exchange`;
          }
        } catch (_) {}
      }
      if (baked.cognito_domain && baked.cognito_client_id && baked.auth_exchange_url) {
        await setSync(baked);
        try {
          const tele = await import(chrome.runtime.getURL('utils/telemetry.js'));
          if (tele && tele.emit) { await tele.emit('config_source', { source: 'baked' }); }
        } catch (_) {}
        return { ok: true, source: 'baked', config: baked };
      }
    }
  } catch {}

  const base = await resolveGatewayBaseUrl();
  if (!base) return { ok: false, error: 'no_base_url' };

  // Try a few common endpoints for discovery
  const candidates = [
    `${base}/memloop/config`,
    `${base}/config/memloop`,
    `${base}/gateway/mem0/config`,
    `${base}/auth/config`,
  ];

  let cfg = null; let lastErr;
  for (const u of candidates) {
    try {
      const j = await fetchJson(u);
      if (j && (j.cognito_domain || j.domain) && (j.cognito_client_id || j.client_id)) {
        // Normalize exchange URL to API origin when discovery doesn't include it
        let origin = base;
        try { origin = new URL(base).origin; } catch (_) {
          const host = String(base).replace(/^https?:\/\//, '').split('/')[0];
          origin = `https://${host}`;
        }
        cfg = {
          cognito_domain: j.cognito_domain || j.domain,
          cognito_client_id: j.cognito_client_id || j.client_id,
          auth_exchange_url: j.auth_exchange_url || j.exchange_url || `${origin}/auth/exchange`,
        };
        break;
      }
    } catch (e) { lastErr = e; }
  }

  if (!cfg) return { ok: false, error: lastErr ? String(lastErr) : 'not_found' };

  await setSync(cfg);
  try {
    const tele = await import(chrome.runtime.getURL('utils/telemetry.js'));
    if (tele && tele.emit) { await tele.emit('config_source', { source: 'fetched' }); }
  } catch (_) {}
  return { ok: true, source: 'fetched', config: cfg };
}




