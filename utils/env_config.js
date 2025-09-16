// Environment configuration utilities for MV3 extension
// - Stores selected environment and per-env gateway base URLs in chrome.storage.sync
// - Never embeds secrets; values are editable via settings UI

const ENV_STORAGE_KEY = "selected_env"; // 'dev' | 'staging' | 'prod'
const ENV_URL_KEYS = {
  dev: "gateway_base_url_dev",
  staging: "gateway_base_url_staging",
  prod: "gateway_base_url_prod",
};

function getFromSync(keys) {
  return new Promise((resolve) => {
    try {
      chrome.storage.sync.get(keys, (items) => resolve(items || {}));
    } catch (e) {
      resolve({});
    }
  });
}

function setInSync(obj) {
  return new Promise((resolve) => {
    try {
      chrome.storage.sync.set(obj, () => resolve(true));
    } catch (e) {
      resolve(false);
    }
  });
}

export async function getSelectedEnv() {
  const { [ENV_STORAGE_KEY]: env } = await getFromSync([ENV_STORAGE_KEY]);
  return env || "dev";
}

export async function setSelectedEnv(env) {
  if (!env || !ENV_URL_KEYS[env]) return false;
  return setInSync({ [ENV_STORAGE_KEY]: env });
}

export async function getGatewayBaseUrl(env) {
  const key = ENV_URL_KEYS[env];
  if (!key) return undefined;
  const items = await getFromSync([key]);
  let url = items[key];
  // Default hard-coded prod if not configured in sync storage
  if (!url && env === "prod") url = "https://api.carousellabs.co/mem0";
  if (!url && env === "staging") url = "https://api.staging.carousellabs.co/mem0";
  if (!url && env === "dev") url = "https://api.dev.carousellabs.co/mem0";
  if (typeof url !== "string") return undefined;
  const trimmed = url.trim();
  if (!trimmed) return undefined;
  return trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed;
}

export async function resolveGatewayBaseUrl() {
  const env = await getSelectedEnv();
  return getGatewayBaseUrl(env);
}

export async function buildGatewayMemoriesUrl(tenant) {
  const base = await resolveGatewayBaseUrl();
  if (!base || !tenant) return undefined;
  const t = encodeURIComponent(String(tenant));
  return `${base}/gateway/mem0/${t}/memories`;
}


