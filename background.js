import { initContextMenuMemory } from './context-menu-memory.js';
import { initDirectUrlTracking } from './direct-url-tracker.js';
import * as auth from './utils/auth.js';

// Initial setting when extension is installed or updated
chrome.runtime.onInstalled.addListener((details) => {
  chrome.storage.sync.set({ memory_enabled: true }, function() {
    console.log('Memory enabled set to true on install/update');
  });
});

// Keep the existing message listener for opening dashboard
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "openDashboard") {
    chrome.tabs.create({ url: request.url });
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "toggleSidebarSettings") {
    chrome.tabs.sendMessage(sender.tab.id, { action: "toggleSidebarSettings" }); 
  } 
}); 

// Handle sign-in initiated from content scripts (content scripts cannot use chrome.identity)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request && request.type === 'memloop_signin') {
    chrome.storage.sync.get([
      'cognito_domain','cognito_client_id','auth_exchange_url'
    ], async (d) => {
      try {
        const domain = (d && d.cognito_domain) || '';
        const clientId = (d && d.cognito_client_id) || '';
        const exchangeUrl = (d && d.auth_exchange_url) || '';
        if (!domain || !clientId || !exchangeUrl) throw new Error('missing_auth_config');
        await auth.signInWithCognito({ domain, clientId, exchangeUrl });
        sendResponse({ ok: true });
      } catch (e) {
        sendResponse({ ok: false, error: (e && e.message) || String(e) });
      }
    });
    return true; // keep the message channel open for async sendResponse
  }
});

// Initialize features
initContextMenuMemory();
initDirectUrlTracking();