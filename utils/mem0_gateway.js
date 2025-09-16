// Minimal Mem0 gateway client (MV3-safe)
// Mirrors @carousellabs/backend-adapters Mem0 client shapes where feasible

// Structured logger (static import to avoid dynamic import in MV3 service worker)
import { logger as structuredLogger } from './structured_logger.js';
const logger = structuredLogger && structuredLogger.child ? structuredLogger.child({ module: 'mem0_gateway' }) : {
  info: (msg, extra) => console.log(`[INFO] ${msg}`, extra),
  warn: (msg, extra) => console.warn(`[WARN] ${msg}`, extra),
  error: (msg, extra) => console.error(`[ERROR] ${msg}`, extra),
  apiCall: (method, url, duration, status, details) => console.log(`[API] ${method} ${url} ${status} (${duration}ms)`, details),
  memoryOperation: (op, success, details) => console.log(`[MEMORY] ${op} ${success ? 'success' : 'failed'}`, details)
};

import * as auth from './auth.js';
import * as env from './env_config.js';
import * as cache from './cache.js';

async function getSession(keys){return new Promise(r=>{try{chrome.storage.session.get(keys,(d)=>r(d||{}))}catch{r({})}})}

async function getAuthHeader(){
  const sess = await getSession(["access_token"]);
  if (sess.access_token) return { name: "Authorization", value: `Bearer ${sess.access_token}` };
  return null;
}

async function withTimeout(promise, ms){
  const controller = new AbortController();
  const id = setTimeout(()=>controller.abort(), ms);
  try {
    const res = await promise(controller.signal);
    return res;
  } finally { clearTimeout(id); }
}

async function resolveBase(tenant){
  try{
    const url = await env.buildGatewayMemoriesUrl(tenant);
    return url && url.replace(/\/$/, "");
  }catch{return undefined}
}

export async function saveMemory({ tenant, body }){
  const startTime = Date.now();
  const base = await resolveBase(tenant);
  const targetUrl = base || "https://api.mem0.ai/v1/memories";
  const auth = await getAuthHeader();
  const headers = { "Content-Type": "application/json" };
  if (auth) headers[auth.name] = auth.value;
  
  logger.info('Saving memory', { tenant, hasAuth: !!auth, endpoint: base ? 'gateway' : 'direct' });
  
  try {
    const doFetch = (signal)=>fetch(targetUrl + (base ? '' : '/'), { method: 'POST', headers, body: JSON.stringify(body), signal });
    const res = await withTimeout(doFetch, 10000);
    const duration = Date.now() - startTime;
    
    logger.apiCall('POST', targetUrl, duration, res.status, { tenant, success: res.ok });
    logger.memoryOperation('save', res.ok, { tenant, duration, status: res.status });
    
    return res.ok;
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Memory save failed', { tenant, error: error.message, duration });
    logger.memoryOperation('save', false, { tenant, error: error.message, duration });
    return false;
  }
}

export async function searchMemories(params) {
  const cacheKey = cache.createCacheKey(params);
  const cached = await cache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const token = await auth.getAccessToken();
  if (!token) return { items: [] };

  const tenant = await auth.getTenant();
  const baseUrl = await env.resolveGatewayBaseUrl();
  const url = new URL(`${baseUrl}/mem0/${tenant}/memories/search`);
  
  // Append params to URL
  Object.keys(params).forEach(key => {
    if (params[key]) {
      url.searchParams.append(key, params[key]);
    }
  });

  try {
    const res = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
    if (res.ok) {
      const data = await res.json();
      await cache.set(cacheKey, data);
      return data;
    }
  } catch (e) {
    console.error('Mem0 Gateway Search Error:', e);
  }
  return { items: [] };
}


