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

export async function signInWithCognito({ domain, clientId, scopes = ["openid","email","profile"], exchangeUrl, tenantClaim = "custom:tenant" }) {
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
  const authUrl = `https://${domain}/oauth2/authorize?${params.toString()}`;

  const redirect = await new Promise((resolve, reject) => {
    try {
      chrome.identity.launchWebAuthFlow({ url: authUrl, interactive: true }, (resp) => {
        if (chrome.runtime.lastError) { reject(new Error(chrome.runtime.lastError.message)); return; }
        resolve(resp);
      });
    } catch (e) { reject(e); }
  });

  const url = new URL(redirect);
  const code = url.searchParams.get("code");
  if (!code) throw new Error("No code returned from auth");

  // retry exchange with simple backoff
  async function doExchange() {
    let attempt = 0; let lastErr;
    while (attempt < 3) {
      try {
        const res = await fetch(exchangeUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code, code_verifier: verifier, redirect_uri: redirectUri }),
        });
        if (!res.ok) throw new Error(`exchange_failed_${res.status}`);
        return await res.json();
      } catch (e) {
        lastErr = e; attempt += 1; await new Promise(r=>setTimeout(r, 200*attempt));
      }
    }
    throw lastErr || new Error("exchange_failed");
  }
  const data = await doExchange(); // { access_token, expires_in, id_token? }

  const now = Math.floor(Date.now()/1000);
  const exp = now + (Number(data.expires_in)||3600);
  await setSession({ [TOKEN_KEY]: data.access_token, [TOKEN_EXP_KEY]: exp, id_token: data.id_token || null });

  // derive tenant if possible
  try {
    const id = data.id_token || null;
    if (id) {
      const payload = JSON.parse(atob(id.split(".")[1]));
      const tenant = payload?.[tenantClaim] || payload?.["cognito:groups"]?.[0];
      if (tenant) await setSession({ [TENANT_KEY]: tenant });
    }
  } catch {}

  return { token: data.access_token, exp, tenant: undefined };
}

export async function getAccessToken() {
  const d = await getSession([TOKEN_KEY, TOKEN_EXP_KEY]);
  const now = Math.floor(Date.now()/1000);
  if (d[TOKEN_KEY] && d[TOKEN_EXP_KEY] && d[TOKEN_EXP_KEY] > now + 30) return d[TOKEN_KEY];
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
  return true;
}
