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
  document.getElementById('selected_env').value = d.selected_env || 'prod';
  document.getElementById('gateway_base_url_dev').value = d.gateway_base_url_dev || '';
  document.getElementById('gateway_base_url_staging').value = d.gateway_base_url_staging || '';
  document.getElementById('gateway_base_url_prod').value = d.gateway_base_url_prod || 'https://api.carousellabs.co/mem0';
  // Pre-populate auth fields
  const env = (d.selected_env || 'prod');
  const baseByEnv = {
    dev: d.gateway_base_url_dev,
    staging: d.gateway_base_url_staging,
    prod: d.gateway_base_url_prod || 'https://api.carousellabs.co/mem0'
  };
  const baseUrl = baseByEnv[env];
  const derivedExchange = (()=>{ try{ if(!baseUrl) return ''; const u = new URL(baseUrl); return `${u.origin}/auth/exchange`; }catch{ return ''; } })();
  document.getElementById('auth_exchange_url').value = d.auth_exchange_url || derivedExchange || '';
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
}

async function fetchAndPopulateConfigIfMissing() {
  try {
    const dom = document.getElementById('cognito_domain');
    const cid = document.getElementById('cognito_client_id');
    const exg = document.getElementById('auth_exchange_url');
    if (dom.value && cid.value && exg.value) return; // already set
    await (async ()=>{
      const env = document.getElementById('selected_env').value;
      const d = await getSync(['gateway_base_url_dev','gateway_base_url_staging','gateway_base_url_prod']);
      const baseByEnv = { dev: d.gateway_base_url_dev, staging: d.gateway_base_url_staging, prod: d.gateway_base_url_prod };
      const base = baseByEnv[env] || d.gateway_base_url_prod || '';
      if (!base) return;
      const origin = (()=>{ try{ return new URL(base).origin; }catch{ return base.replace(/\/$/, ''); } })();
      const urls = [
        `${origin}/config/memloop`,
        `${origin}/memloop/config`,
        `${origin}/tf/${env}/carousel-labs/memloop/config`,
        `${origin}/tf/${env}/carousel-labs/memloop/cognito_config`
      ];
      let payload = null;
      for (const u of urls) {
        try { const res = await fetch(u, { credentials: 'omit' }); if (res.ok) { payload = await res.json(); break; } } catch (_) {}
      }
      if (!payload) return;
      const cc = payload.cognito_config || payload;
      const gc = payload.gateway_config || null;
      if (cc && cc.domain && !dom.value) dom.value = cc.domain;
      if (cc && (cc.client_id || cc.clientId) && !cid.value) cid.value = cc.client_id || cc.clientId;
      if (gc && gc.auth_exchange_url && !exg.value) exg.value = gc.auth_exchange_url;
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

document.addEventListener('DOMContentLoaded', ()=>{ load().then(async ()=>{ await fetchAndPopulateConfigIfMissing(); await bind(); }); });



