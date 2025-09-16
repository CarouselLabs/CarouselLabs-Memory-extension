
const CACHE_PREFIX = 'memloop_cache_';
const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

export async function get(key) {
  const cacheKey = `${CACHE_PREFIX}${key}`;
  const result = await chrome.storage.session.get(cacheKey);
  const entry = result[cacheKey];

  if (entry && entry.expires > Date.now()) {
    return entry.value;
  }
  return null;
}

export async function set(key, value, ttl = DEFAULT_TTL) {
  const cacheKey = `${CACHE_PREFIX}${key}`;
  const expires = Date.now() + ttl;
  await chrome.storage.session.set({ [cacheKey]: { value, expires } });
}

export async function invalidate(key) {
  const cacheKey = `${CACHE_PREFIX}${key}`;
  await chrome.storage.session.remove(cacheKey);
}

export function createCacheKey(params) {
  // Simple key generation from search params
  return Object.values(params).join('_');
}

