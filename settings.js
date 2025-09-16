function getSync(keys){return new Promise(r=>{try{chrome.storage.sync.get(keys,(d)=>r(d||{}))}catch{r({})}})}
function setSync(obj){return new Promise(r=>{try{chrome.storage.sync.set(obj,()=>r(true))}catch{r(false)}})}
function setSession(obj){return new Promise(r=>{try{chrome.storage.session.set(obj,()=>r(true))}catch{r(false)}})}
function clearSession(keys){return new Promise(r=>{try{chrome.storage.session.remove(keys,()=>r(true))}catch{r(false)}})}

async function load(){
  const d = await getSync([
    'selected_env',
    'gateway_base_url_dev','gateway_base_url_staging','gateway_base_url_prod',
    'cognito_domain','cognito_client_id','auth_exchange_url',
    // env-scoped copies so we can pre-populate on env switch
    'cognito_domain_dev','cognito_client_id_dev',
    'cognito_domain_staging','cognito_client_id_staging',
    'cognito_domain_prod','cognito_client_id_prod',
    'memory_enabled','telemetry_opt_out','domain_blacklist',
    'theme_name'
  ]);
  document.getElementById('selected_env').value = d.selected_env || 'dev';
  const defaultDev = 'https://api.dev.carousellabs.co/mem0';
  const defaultStaging = 'https://api.staging.carousellabs.co/mem0';
  const defaultProd = 'https://api.carousellabs.co/mem0';
  const vDev = d.gateway_base_url_dev || defaultDev;
  const vStaging = d.gateway_base_url_staging || defaultStaging;
  const vProd = d.gateway_base_url_prod || defaultProd;
  document.getElementById('gateway_base_url_dev').value = vDev;
  document.getElementById('gateway_base_url_staging').value = vStaging;
  document.getElementById('gateway_base_url_prod').value = vProd;
  // Pre-populate auth fields
  const env = (d.selected_env || 'dev');
  const baseByEnv = {
    dev: vDev,
    staging: vStaging,
    prod: vProd
  };
  const baseUrl = baseByEnv[env];
  const derivedExchange = (()=>{ try{ if(!baseUrl) return ''; const u = new URL(baseUrl); return `${u.origin}/auth/exchange`; }catch{ return ''; } })();
  document.getElementById('auth_exchange_url').value = d.auth_exchange_url || derivedExchange || '';
  // Show chrome redirect URL for convenience
  try {
    const redirect = chrome.identity && chrome.identity.getRedirectURL ? chrome.identity.getRedirectURL() : '';
    const rd = document.getElementById('chrome_redirect_url'); if (rd) rd.value = redirect || '';
  } catch (_) {}
  // Use env-scoped saved values if present; otherwise keep existing/global
  const domainByEnv = { dev: d.cognito_domain_dev, staging: d.cognito_domain_staging, prod: d.cognito_domain_prod };
  const clientByEnv = { dev: d.cognito_client_id_dev, staging: d.cognito_client_id_staging, prod: d.cognito_client_id_prod };
  document.getElementById('cognito_domain').value = d.cognito_domain || domainByEnv[env] || '';
  document.getElementById('cognito_client_id').value = d.cognito_client_id || clientByEnv[env] || '';
  document.getElementById('memory_enabled').checked = d.memory_enabled !== false;
  document.getElementById('telemetry_opt_out').checked = d.telemetry_opt_out === true;
  const b = Array.isArray(d.domain_blacklist) ? d.domain_blacklist : (typeof d.domain_blacklist==='string'? d.domain_blacklist.split(/\n+/g): []);
  document.getElementById('domain_blacklist').value = b.filter(Boolean).join('\n');
  if (document.getElementById('theme_name')) {
    document.getElementById('theme_name').value = d.theme_name || 'dark';
  }
  // Persist defaults on first load if missing
  const toPersist = {};
  if (!d.gateway_base_url_dev) toPersist.gateway_base_url_dev = vDev;
  if (!d.gateway_base_url_staging) toPersist.gateway_base_url_staging = vStaging;
  if (!d.gateway_base_url_prod) toPersist.gateway_base_url_prod = vProd;
  if (!d.selected_env) toPersist.selected_env = 'dev';
  if (Object.keys(toPersist).length) { await setSync(toPersist); }
}

async function fetchAndPopulateConfigIfMissing() {
  try {
    const dom = document.getElementById('cognito_domain');
    const cid = document.getElementById('cognito_client_id');
    const exg = document.getElementById('auth_exchange_url');
    if (dom.value && cid.value && exg.value) return; // already set
    await (async ()=>{
      let origin = '';
      try {
        const envMod = await import(chrome.runtime.getURL('utils/env_config.js'));
        const base = envMod && envMod.resolveGatewayBaseUrl ? await envMod.resolveGatewayBaseUrl() : null;
        if (base) origin = new URL(base).origin;
      } catch (_) {}
      if (!origin) origin = 'https://api.dev.carousellabs.co';
      const urls = [
        `${origin}/config/memloop`,
        `${origin}/memloop/config`,
        `${origin}/gateway/mem0/config`,
        `${origin}/auth/config`
      ];
      let payload = null;
      for (const u of urls) {
        try { const res = await fetch(u, { credentials: 'omit' }); if (res.ok) { payload = await res.json(); break; } } catch (_) {}
      }
      if (!payload) return;
      const cc = payload.cognito_config || payload;
      const gc = payload.gateway_config || null;
      if (cc && (cc.domain || cc.cognito_domain) && !dom.value) dom.value = (cc.cognito_domain || cc.domain || '').replace(/^https?:\/\//,'');
      if (cc && (cc.client_id || cc.clientId || cc.cognito_client_id) && !cid.value) cid.value = cc.cognito_client_id || cc.client_id || cc.clientId;
      if (!exg.value) {
        exg.value = (gc && gc.auth_exchange_url) ? gc.auth_exchange_url : `${origin}/auth/exchange`;
      }
    })();
  } catch (_) {}
}

async function bind(){
  document.getElementById('save_env').addEventListener('click', async ()=>{
    const obj = {
      selected_env: document.getElementById('selected_env').value,
      gateway_base_url_dev: document.getElementById('gateway_base_url_dev').value.trim(),
      gateway_base_url_staging: document.getElementById('gateway_base_url_staging').value.trim(),
      gateway_base_url_prod: document.getElementById('gateway_base_url_prod').value.trim()
    };
    await setSync(obj);
  });
  document.getElementById('save_auth').addEventListener('click', async ()=>{
    const obj = {
      cognito_domain: document.getElementById('cognito_domain').value.trim(),
      cognito_client_id: document.getElementById('cognito_client_id').value.trim(),
      auth_exchange_url: document.getElementById('auth_exchange_url').value.trim()
    };
    const env = document.getElementById('selected_env').value;
    // Also persist env-scoped copies to enable pre-population on env switch
    if (env === 'dev') { obj.cognito_domain_dev = obj.cognito_domain; obj.cognito_client_id_dev = obj.cognito_client_id; }
    if (env === 'staging') { obj.cognito_domain_staging = obj.cognito_domain; obj.cognito_client_id_staging = obj.cognito_client_id; }
    if (env === 'prod') { obj.cognito_domain_prod = obj.cognito_domain; obj.cognito_client_id_prod = obj.cognito_client_id; }
    await setSync(obj);
  });
  // Fetch dev-scoped config from gateway (cognito_config or combined config)
  if (document.getElementById('fetch_config')) {
    document.getElementById('fetch_config').addEventListener('click', async ()=>{
      await fetchAndPopulateConfigIfMissing();
      const st = document.getElementById('auth_status'); if (st) st.textContent = 'Fetched from gateway (discovery)';
    });
  }
  if (document.getElementById('load_baked')) {
    document.getElementById('load_baked').addEventListener('click', async ()=>{
      try {
        const url = chrome.runtime.getURL('config/auth.defaults.json');
        const res = await fetch(url, { cache: 'no-store' });
        if (!res.ok) throw new Error('missing_baked_defaults');
        const j = await res.json();
        const dom = document.getElementById('cognito_domain');
        const cid = document.getElementById('cognito_client_id');
        const exg = document.getElementById('auth_exchange_url');
        dom.value = (j.cognito_domain || j.domain || '').replace(/^https?:\/\//,'');
        cid.value = j.cognito_client_id || j.client_id || '';
        exg.value = j.auth_exchange_url || j.exchange_url || j.token_url || exg.value;
        const st = document.getElementById('auth_status'); if (st) st.textContent = 'Loaded baked defaults';
      } catch (e) {
        const st = document.getElementById('auth_status'); if (st) st.textContent = 'No baked defaults found';
      }
    });
  }
  if (document.getElementById('rerun_discovery')) {
    document.getElementById('rerun_discovery').addEventListener('click', async ()=>{
      try {
        const mod = await import(chrome.runtime.getURL('utils/auto_config.js'));
        if (mod && mod.ensureAuthConfig) {
          const r = await mod.ensureAuthConfig();
          const st = document.getElementById('auth_status'); if (st) st.textContent = `Discovery: ${r && r.source ? r.source : 'unknown'}`;
          await load();
        }
      } catch (_) {
        const st = document.getElementById('auth_status'); if (st) st.textContent = 'Discovery failed';
      }
    });
  }
  // Copy redirect URL
  if (document.getElementById('copy_redirect_url')) {
    document.getElementById('copy_redirect_url').addEventListener('click', async ()=>{
      try {
        const el = document.getElementById('chrome_redirect_url');
        if (el && el.value) { await navigator.clipboard.writeText(el.value); const st = document.getElementById('auth_status'); if (st) st.textContent = 'Redirect URL copied'; }
      } catch (_) {}
    });
  }
  // Test Hosted UI button
  if (document.getElementById('test_auth')) {
    document.getElementById('test_auth').addEventListener('click', async ()=>{
      try {
        const domain = document.getElementById('cognito_domain').value.trim();
        const clientId = document.getElementById('cognito_client_id').value.trim();
        const redirect = document.getElementById('chrome_redirect_url').value.trim();
        if (!domain || !clientId || !redirect) { const st = document.getElementById('auth_status'); if (st) st.textContent = 'Fill domain/client and have redirect visible'; return; }
        const params = new URLSearchParams({
          response_type: 'code',
          client_id: clientId,
          redirect_uri: redirect,
          scope: 'openid email profile'
        });
        const url = `https://${domain.replace(/^https?:\/\//,'')}/oauth2/authorize?${params.toString()}`;
        chrome.tabs.create({ url });
      } catch (_) {}
    });
  }
  document.getElementById('clear_token').addEventListener('click', async ()=>{
    await clearSession(['access_token','access_token_exp','id_token','tenant']);
  });
  document.getElementById('save_privacy').addEventListener('click', async ()=>{
    const memory_enabled = document.getElementById('memory_enabled').checked;
    const telemetry_opt_out = document.getElementById('telemetry_opt_out').checked;
    const domain_blacklist = document.getElementById('domain_blacklist').value.split(/\n+/g).map(s=>s.trim()).filter(Boolean);
    await setSync({ memory_enabled, telemetry_opt_out, domain_blacklist });
  });

  if (document.getElementById('save_theme')) {
    document.getElementById('save_theme').addEventListener('click', async ()=>{
      const theme_name = document.getElementById('theme_name').value;
      await setSync({ theme_name });
    });
  }

  if (document.getElementById('preview_tokens')) {
    document.getElementById('preview_tokens').addEventListener('click', async ()=>{
      try {
        const theme_name = document.getElementById('theme_name').value;
        const mod = await import(chrome.runtime.getURL('utils/theme.js'));
        if (mod && mod.applyTheme) await mod.applyTheme(theme_name);
        const pv = document.getElementById('tokens_preview');
        if (pv) pv.style.display = 'block';
      } catch (e) {}
    });
  }
  // Update derived defaults on env change
  const envSel = document.getElementById('selected_env');
  envSel.addEventListener('change', async ()=>{
    const d2 = await getSync([
      'gateway_base_url_dev','gateway_base_url_staging','gateway_base_url_prod',
      'cognito_domain_dev','cognito_client_id_dev',
      'cognito_domain_staging','cognito_client_id_staging',
      'cognito_domain_prod','cognito_client_id_prod'
    ]);
    const env = envSel.value;
    const baseByEnv2 = { dev: d2.gateway_base_url_dev, staging: d2.gateway_base_url_staging, prod: d2.gateway_base_url_prod || 'https://api.carousellabs.co/mem0' };
    const baseUrl2 = baseByEnv2[env];
    try {
      if (baseUrl2) {
        const u = new URL(baseUrl2);
        document.getElementById('auth_exchange_url').value = `${u.origin}/auth/exchange`;
      }
    } catch {}
    const domainByEnv2 = { dev: d2.cognito_domain_dev, staging: d2.cognito_domain_staging, prod: d2.cognito_domain_prod };
    const clientByEnv2 = { dev: d2.cognito_client_id_dev, staging: d2.cognito_client_id_staging, prod: d2.cognito_client_id_prod };
    if (domainByEnv2[env]) document.getElementById('cognito_domain').value = domainByEnv2[env];
    if (clientByEnv2[env]) document.getElementById('cognito_client_id').value = clientByEnv2[env];
  });
}

document.addEventListener('DOMContentLoaded', ()=>{
  try { document.documentElement.setAttribute('data-theme','carousel-labs'); } catch {}
  (async ()=>{
    try {
      const auto = await import(chrome.runtime.getURL('utils/auto_config.js')).catch(()=>null);
      if (auto && auto.ensureAuthConfig) { await auto.ensureAuthConfig(); }
    } catch (_) {}
    await load();
    await fetchAndPopulateConfigIfMissing();
    await bind();
  })();
});



