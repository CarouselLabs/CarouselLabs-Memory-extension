// Lightweight MV3 auth helper: PKCE + launchWebAuthFlow + token storage

const TOKEN_KEY = "access_token"; // in chrome.storage.session
const TOKEN_EXP_KEY = "access_token_exp";
const TENANT_KEY = "tenant"; // optional claim-derived

function setSession(values) {
  return new Promise((resolve) => {
    try { chrome.storage.session.set(values, () => resolve(true)); } catch { resolve(false); }
  });
}

function getSession(keys) {
  return new Promise((resolve) => {
    try { chrome.storage.session.get(keys, (d) => resolve(d || {})); } catch { resolve({}); }
  });
}

// Mirrors to make tokens visible to content scripts (which cannot access session)
function setLocal(values) {
  return new Promise((resolve) => {
    try { chrome.storage.local.set(values, () => resolve(true)); } catch { resolve(false); }
  });
}

function getLocal(keys) {
  return new Promise((resolve) => {
    try { chrome.storage.local.get(keys, (d) => resolve(d || {})); } catch { resolve({}); }
  });
}

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

function b64url(bytes) {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function sha256(data) {
  const enc = new TextEncoder();
  const digest = await crypto.subtle.digest("SHA-256", enc.encode(data));
  return new Uint8Array(digest);
}

async function generatePkce() {
  const random = crypto.getRandomValues(new Uint8Array(32));
  const verifier = b64url(random);
  const challenge = b64url(await sha256(verifier));
  return { verifier, challenge };
}

import * as telemetry from './telemetry.js';

export async function signInWithCognito({ domain, clientId, scopes = ["openid","email","profile"], exchangeUrl, tenantClaim = "custom:tenant" }) {
  try {
    telemetry.emit('signin_started');

    const { verifier, challenge } = await generatePkce();
    const redirectUri = chrome.identity.getRedirectURL();
    const params = new URLSearchParams({
      response_type: "code",
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: scopes.join(" "),
      code_challenge_method: "S256",
      code_challenge: challenge,
    });
    // Accept domains with or without scheme; default to https
    let authDomain = String(domain || "").trim();
    if (!authDomain) throw new Error("missing_cognito_domain");
    // If full URL provided, extract host
    try {
      const maybeUrl = new URL(authDomain);
      authDomain = maybeUrl.host || authDomain.replace(/^https?:\/\//, "");
    } catch (_) {
      authDomain = authDomain.replace(/^https?:\/\//, "");
    }
    const authUrl = `https://${authDomain}/oauth2/authorize?${params.toString()}`;

    async function tryTabFallback(authUrl, redirectUri, clientId, authDomain){
      return new Promise((resolve, reject) => {
        try {
          chrome.tabs.create({ url: authUrl, active: true }, (tab) => {
            if (chrome.runtime.lastError || !tab || !tab.id) {
              reject(new Error('fallback_tab_open_failed'));
              return;
            }
            const tabId = tab.id;
            let done = false;
            const timeoutId = setTimeout(() => {
              if (done) return;
              done = true;
              try { chrome.tabs.remove(tabId); } catch (_) {}
              reject(new Error('fallback_timeout'));
            }, 120000);
            function handler(details){
              try {
                if (done) return;
                if (details.tabId !== tabId) return;
                const urlStr = String(details.url || '');
                if (!urlStr.startsWith(redirectUri)) return;
                done = true;
                clearTimeout(timeoutId);
                try { chrome.webNavigation.onCommitted.removeListener(handler); } catch (_) {}
                try { chrome.tabs.remove(tabId); } catch (_) {}
                resolve(urlStr);
              } catch (e) {
                // ignore
              }
            }
            try {
              chrome.webNavigation.onCommitted.addListener(handler, { url: [{ urlPrefix: redirectUri }] });
            } catch (e) {
              clearTimeout(timeoutId);
              reject(e);
            }
          });
        } catch (e) { reject(e); }
      });
    }

    const redirect = await new Promise((resolve, reject) => {
      try {
        chrome.identity.launchWebAuthFlow({ url: authUrl, interactive: true }, (resp) => {
          if (chrome.runtime.lastError) {
            const lastErr = chrome.runtime.lastError.message || 'launchWebAuthFlow_failed';
            const diag = {
              domain: authDomain,
              clientId,
              redirectUri,
              authUrl
            };
            telemetry.emit('signin_failure', { error: lastErr, ...diag });
            // Try tab-based fallback (helps with browsers that don't fully support identity flow)
            (async ()=>{
              try {
                const redirected = await tryTabFallback(authUrl, redirectUri, clientId, authDomain);
                resolve(redirected);
              } catch (fallbackErr) {
                reject(new Error(`${lastErr}. Ensure Cognito allows callback ${redirectUri} for client ${clientId}.`));
              }
            })();
            return;
          }
          resolve(resp);
        });
      } catch (e) { reject(e); }
    });

    console.log("[MemLoop Debug] Redirect URL received:", redirect);
    const url = new URL(redirect);
    const code = url.searchParams.get("code");
    const error = url.searchParams.get("error");
    const errorDescription = url.searchParams.get("error_description");
    
    console.log("[MemLoop Debug] Parsed from redirect:", { code, error, errorDescription });
    
    if (error) {
      throw new Error(`Auth error: ${error} - ${errorDescription || 'No description'}`);
    }
    if (!code) throw new Error("No code returned from auth");

    // retry exchange with simple backoff; prefer x-www-form-urlencoded to avoid CORS preflight
    async function doExchange() {
      let attempt = 0; let lastErr;
      console.log("[MemLoop Debug] Exchange URL:", exchangeUrl);
      console.log("[MemLoop Debug] Exchange params:", { code: code?.slice(0,10) + "...", code_verifier: verifier?.slice(0,10) + "...", redirect_uri: redirectUri });
      
      while (attempt < 3) {
        try {
          const ctrl = new AbortController();
          const t = setTimeout(() => ctrl.abort(), 10000);
          try {
            // 1) URL-encoded (simple request)
            const form = new URLSearchParams({ code, code_verifier: verifier, redirect_uri: redirectUri, client_id: clientId });
            console.log("[MemLoop Debug] Attempt", attempt + 1, "- Form data:", form.toString());
            
            const r1 = await fetch(exchangeUrl, {
              method: "POST",
              headers: { "Content-Type": "application/x-www-form-urlencoded", "Accept": "application/json" },
              body: form.toString(),
              mode: "cors",
              credentials: "omit",
              signal: ctrl.signal
            });
            
            console.log("[MemLoop Debug] Response status:", r1.status);
            const responseText = await r1.text();
            console.log("[MemLoop Debug] Response body:", responseText);
            
            if (r1.ok) {
              try {
                return JSON.parse(responseText);
              } catch (parseErr) {
                console.error("[MemLoop Debug] JSON parse error:", parseErr);
                throw new Error(`Invalid JSON response: ${responseText}`);
              }
            }
            
            // If first request failed, try JSON format
            console.log("[MemLoop Debug] URL-encoded failed, trying JSON format...");
            const r2 = await fetch(exchangeUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json", "Accept": "application/json" },
              body: JSON.stringify({ code, code_verifier: verifier, redirect_uri: redirectUri, client_id: clientId }),
              mode: "cors",
              credentials: "omit",
              signal: ctrl.signal
            });
            
            console.log("[MemLoop Debug] JSON attempt status:", r2.status);
            const jsonResponseText = await r2.text();
            console.log("[MemLoop Debug] JSON response body:", jsonResponseText);
            
            if (!r2.ok) throw new Error(`exchange_failed_${r2.status}: ${jsonResponseText}`);
            
            try {
              return JSON.parse(jsonResponseText);
            } catch (parseErr) {
              console.error("[MemLoop Debug] JSON parse error:", parseErr);
              throw new Error(`Invalid JSON response: ${jsonResponseText}`);
            }
          } finally {
            clearTimeout(t);
          }
        } catch (e) {
          console.error("[MemLoop Debug] Exchange attempt", attempt + 1, "failed:", e.message);
          lastErr = e; 
          attempt += 1; 
          if (attempt < 3) {
            console.log("[MemLoop Debug] Retrying in", 200 * attempt, "ms...");
            await new Promise(r=>setTimeout(r, 200*attempt));
          }
        }
      }
      throw lastErr || new Error("exchange_failed");
    }

    let data;
    try {
      data = await doExchange(); // { access_token, expires_in, id_token? }
    } catch (ex) {
      // Fallback: Implicit flow (token/id_token in fragment) if exchange endpoint is unreachable
      try {
        const nonceBytes = crypto.getRandomValues(new Uint8Array(16));
        const nonce = b64url(nonceBytes);
        const implicitParams = new URLSearchParams({
          response_type: "token id_token",
          client_id: clientId,
          redirect_uri: redirectUri,
          scope: scopes.join(" "),
          nonce
        });
        const implicitUrl = `https://${authDomain}/oauth2/authorize?${implicitParams.toString()}`;
        const implicitRedirect = await new Promise((resolve, reject) => {
          try {
            chrome.identity.launchWebAuthFlow({ url: implicitUrl, interactive: true }, (resp) => {
              if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message || 'launchWebAuthFlow_failed_implicit'));
                return;
              }
              resolve(resp);
            });
          } catch (e) { reject(e); }
        });
        const frag = new URL(implicitRedirect).hash.replace(/^#/, "");
        const f = new URLSearchParams(frag);
        const access_token = f.get('access_token');
        const id_token = f.get('id_token');
        const expires_in = Number(f.get('expires_in') || '3600');
        if (!access_token) throw ex;
        data = { access_token, id_token, expires_in };
      } catch (_) {
        throw ex; // bubble original exchange error if implicit also failed
      }
    }

    const now = Math.floor(Date.now()/1000);
    const exp = now + (Number(data.expires_in)||3600);
    // Primary storage
    await setSession({ [TOKEN_KEY]: data.access_token, [TOKEN_EXP_KEY]: exp, id_token: data.id_token || null });
    // Mirrors for content scripts and occasional reads from sync
    await setLocal({ [TOKEN_KEY]: data.access_token, [TOKEN_EXP_KEY]: exp });
    await setSync({ [TOKEN_KEY]: data.access_token, [TOKEN_EXP_KEY]: exp });

    // derive tenant if possible
    try {
      const id = data.id_token || null;
      if (id) {
        const payload = JSON.parse(atob(id.split(".")[1]));
        const tenant = payload?.[tenantClaim] || payload?.["cognito:groups"]?.[0];
        if (tenant) await setSession({ [TENANT_KEY]: tenant });
      }
    } catch {}
    telemetry.emit('signin_success');
    return { token: data.access_token, exp, tenant: undefined };
  } catch (e) {
    telemetry.emit('signin_failure', { error: e.message });
    console.error('Sign-in error:', e);
    return { error: e.message };
  }
}

export async function getAccessToken() {
  const now = Math.floor(Date.now()/1000);
  // 1) Session (background/pages)
  {
    const d = await getSession([TOKEN_KEY, TOKEN_EXP_KEY]);
    if (d[TOKEN_KEY] && d[TOKEN_EXP_KEY] && d[TOKEN_EXP_KEY] > now + 30) return d[TOKEN_KEY];
  }
  // 2) Local (content scripts)
  {
    const d = await getLocal([TOKEN_KEY, TOKEN_EXP_KEY]);
    if (d[TOKEN_KEY] && d[TOKEN_EXP_KEY] && d[TOKEN_EXP_KEY] > now + 30) return d[TOKEN_KEY];
  }
  // 3) Sync (used by some legacy reads/telemetry)
  {
    const d = await getSync([TOKEN_KEY, TOKEN_EXP_KEY]);
    if (d[TOKEN_KEY] && d[TOKEN_EXP_KEY] && d[TOKEN_EXP_KEY] > now + 30) return d[TOKEN_KEY];
  }
  return null;
}

export async function getTenant() {
  const d = await getSession([TENANT_KEY]);
  return d[TENANT_KEY] || null;
}

export async function getUserProfile() {
  const d = await getSession(["id_token"]);
  const id = d && d.id_token;
  if (!id) return null;
  try {
    const payload = JSON.parse(atob(String(id).split(".")[1]));
    return {
      email: payload.email || null,
      name: payload.name || payload["cognito:username"] || null,
      sub: payload.sub || null,
      raw: payload
    };
  } catch (_) { return null; }
}

export async function signOut() {
  await setSession({ [TOKEN_KEY]: null, [TOKEN_EXP_KEY]: 0, [TENANT_KEY]: null, id_token: null });
  try { await setLocal({ [TOKEN_KEY]: null, [TOKEN_EXP_KEY]: 0 }); } catch (_) {}
  try { await setSync({ [TOKEN_KEY]: null, [TOKEN_EXP_KEY]: 0 }); } catch (_) {}
  return true;
}

// Alias for callers using getUserInfo()
export async function getUserInfo() {
  return getUserProfile();
}
