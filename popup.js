document.addEventListener("DOMContentLoaded", function () {
  const googleSignInButton = document.getElementById("googleSignInButton");

  async function isSignedIn() {
    return new Promise((resolve) => {
      try {
        chrome.storage.session.get(["access_token","access_token_exp"], (d) => {
          const now = Math.floor(Date.now()/1000);
          resolve(Boolean(d.access_token && d.access_token_exp && d.access_token_exp > now + 30));
        });
      } catch { resolve(false); }
    });
  }

  async function toggleSidebarIfSignedIn() {
    const ok = await isSignedIn();
    if (ok) {
      chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        chrome.tabs.sendMessage(tabs[0].id, {action: "toggleSidebar"});
        window.close();
      });
    }
  }

  async function showViews() {
    console.log('showViews: Checking auth state...');
    const auth = await import(chrome.runtime.getURL('utils/auth.js'));
    const token = auth && auth.getAccessToken ? await auth.getAccessToken() : null;
    console.log('showViews: Token found?', !!token);
    const signedOut = document.getElementById('signedOutView');
    const signedIn = document.getElementById('signedInView');
    if (token) {
      if (signedOut) signedOut.style.display = 'none';
      if (signedIn) signedIn.style.display = 'block';
      
      // Populate User Info
      try {
        const prof = auth && auth.getUserProfile ? await auth.getUserProfile() : null;
        const tenant = auth && auth.getTenant ? await auth.getTenant() : null;
        if (prof) {
          const un = document.getElementById('userName'); if (un) un.textContent = prof.name || prof.sub || 'User';
        }
        const tn = document.getElementById('tenantName'); if (tn) tn.textContent = tenant || '';
      } catch (_) {}

      // Wire up buttons
      const signOutButton = document.getElementById('signOutButton');
      if (signOutButton) signOutButton.addEventListener('click', async () => {
        if (auth && auth.signOut) await auth.signOut();
        showViews();
      });

      const openSidebarBtn = document.getElementById('openSidebarBtn');
      if (openSidebarBtn) openSidebarBtn.addEventListener('click', () => {
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
          chrome.tabs.sendMessage(tabs[0].id, {action: "toggleSidebar"});
          window.close();
        });
      });
      const openSettingsBtn = document.getElementById('openSettingsBtn');
      if (openSettingsBtn) openSettingsBtn.addEventListener('click', () => {
        chrome.runtime.openOptionsPage();
        window.close();
      });
      
      const openDebugBtn = document.getElementById('openDebugBtn');
      if (openDebugBtn) openDebugBtn.addEventListener('click', () => {
        chrome.tabs.create({ url: chrome.runtime.getURL('debug-auth.html') });
        window.close();
      });
      
      // Logo loading handlers
      const logoImg = document.getElementById('logoImg');
      if (logoImg) {
        logoImg.addEventListener('load', () => {
          console.log('✅ Logo loaded successfully');
        });
        logoImg.addEventListener('error', (e) => {
          console.error('❌ Logo failed to load:', e.target.src);
        });
      }

      // Fetch memories
      fetchAndRenderMemories();

    } else {
      if (signedOut) signedOut.style.display = 'block';
      if (signedIn) signedIn.style.display = 'none';
    }
  }

  async function fetchAndRenderMemories() {
    const memoryList = document.getElementById('memoryList');
    if (!memoryList) return;

    try {
      memoryList.innerHTML = '<div class="loading">Loading memories...</div>';
      
      const gateway = await import(chrome.runtime.getURL('utils/mem0_gateway.js'));
      const contextScope = await import(chrome.runtime.getURL('utils/context_scope_adapter.js'));
      const ranking = await import(chrome.runtime.getURL('utils/ranking.js'));

      const context = await contextScope.getContext({});
      
      const searchParams = {
        domain: context.domain?.name,
        pathPrefix: context.route?.path,
        tags: context.tags?.join(','),
        limit: 5, // Keep it brief for the popup
      };

      const results = await gateway.searchMemories(searchParams);
      const rankedItems = ranking.rankAndSort(results.items || [], context);

      if (rankedItems && rankedItems.length > 0) {
        memoryList.innerHTML = '';
        rankedItems.forEach(item => {
          const li = document.createElement('li');
          li.className = 'memory-item';
          li.innerHTML = `
            <div class="memory-text">${item.text}</div>
            <div class="memory-score">Score: ${item.score.toFixed(2)}</div>
          `;
          memoryList.appendChild(li);
        });
      } else {
        memoryList.innerHTML = '<div class="empty">No relevant memories found.</div>';
      }
    } catch (error) {
      console.error('Failed to fetch memories:', error);
      memoryList.innerHTML = '<div class="error">Failed to load memories.</div>';
    }
  }

  if (googleSignInButton) {
    googleSignInButton.addEventListener("click", async function () {
      try {
        const env = await import(chrome.runtime.getURL('utils/env_config.js'));
        const auto = await import(chrome.runtime.getURL('utils/auto_config.js'));
        // Ensure config exists (auto-fetch if missing) BEFORE reading storage
        try { if (auto && auto.ensureAuthConfig) await auto.ensureAuthConfig(); } catch (_) {}
        const { cognito_domain, cognito_client_id, auth_exchange_url } = await new Promise((resolve)=>{
          chrome.storage.sync.get([
            'cognito_domain','cognito_client_id','auth_exchange_url'
          ], (d)=> resolve(d||{}));
        });

        // minimal required config
        if (!cognito_domain || !cognito_client_id || !auth_exchange_url) {
          // Surface actionable feedback and open Options
          const msg = document.querySelector('#signedOutView p');
          if (msg) msg.textContent = 'Configure authentication in Settings to sign in.';
          chrome.runtime.openOptionsPage();
          return;
        }

        // Delegate sign-in to background (service worker) for a stable identity context
        const resp = await new Promise((resolve, reject) => {
          chrome.runtime.sendMessage({ type: 'memloop_signin' }, (response) => {
            if (chrome.runtime.lastError) {
              return reject(new Error(chrome.runtime.lastError.message || 'connection_failed'));
            }
            resolve(response || { ok: false, error: 'no_response' });
          });
        });

        if (!resp || !resp.ok) throw new Error(resp?.error || 'signin_failed');
        console.log('Sign-in successful from SW, now updating UI...');

        try {
          const tele = await import(chrome.runtime.getURL('utils/telemetry.js'));
          const selectedEnv = env && env.getSelectedEnv ? await env.getSelectedEnv() : null;
          if (tele && tele.emit) { await tele.emit('signin_success', { env: selectedEnv }); }
        } catch (_) {}
        await showViews();
      } catch (e) {
        try {
          const tele = await import(chrome.runtime.getURL('utils/telemetry.js'));
          if (tele && tele.emit) { await tele.emit('signin_failure', { reason: (e && e.message) || String(e) }); }
        } catch (_) {}
        const errorContainer = document.getElementById('errorContainer');
        const errorMessage = document.getElementById('errorMessage');
        const copyErrorButton = document.getElementById('copyErrorButton');
        
        if (errorContainer && errorMessage && copyErrorButton) {
          errorMessage.textContent = `Sign in failed: ${e.message || 'Unknown error'}`;
          errorContainer.style.display = 'block';
          
          copyErrorButton.onclick = () => {
            navigator.clipboard.writeText(JSON.stringify({
              error: e.message,
              stack: e.stack,
              details: String(e)
            }, null, 2));
          };
        } else {
            const msg = document.querySelector('#signedOutView p');
            if (msg) msg.textContent = 'Sign in failed. Please try again or check Settings.';
        }
        // eslint-disable-next-line no-console
        console.error('signin_failed', e);
      }
    });
  }

  showViews();
});