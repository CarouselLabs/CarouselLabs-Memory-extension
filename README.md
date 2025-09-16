# MemLoop Chrome Extension 🔄

**MemLoop keeps your conversations in sync. No more repeating yourself—just seamless AI collaboration!**

MemLoop is a Chrome browser extension that acts as your personal, persistent memory across various AI chat platforms. It solves the problem of limited context windows by creating a searchable, personal knowledge base from your most important interactions.

## Key Features

-   **🧠 Persistent Memory:** Creates a long-term, searchable memory layer for your AI interactions.
-   **🌐 Multi-Platform Support:** Integrates with a wide range of popular AI chat services like ChatGPT, Claude, Perplexity, and more.
-   **🚀 Contextual Assistance:** Automatically surfaces relevant past memories in a convenient sidebar right next to your current chat, streamlining your workflow.
-   **🔒 Secure & Private:** Your memories are securely stored in a dedicated backend service, and all communication is handled over authenticated APIs.
-   **✅ User-Controlled:** You decide exactly what to save.

## How It Works

1.  **Save Memories:** Use the context menu or buttons injected into AI chat interfaces to save important snippets of conversation, code, or ideas.
2.  **Seamless Recall:** When you start a new chat, MemLoop automatically searches your memory base for relevant information.
3.  **Sidebar Integration:** View, search, and manage your memories in the sidebar without leaving your current tab.

## Installation & Setup (for Local Development)

1.  Clone this repository.
2.  Open Chrome and navigate to `chrome://extensions`.
3.  Enable **"Developer mode"** in the top-right corner.
4.  Click **"Load unpacked"** and select the directory where you cloned this repository.
5.  The extension will be installed and ready to use. It comes pre-configured to point to the `dev` environment.

The extension will attempt to auto-configure its authentication settings upon installation. You can view or override these settings on the extension's **Settings** page.

---

## For Developers

### Architecture

-   **Manifest V3:** Built on the modern Chrome extension platform.
-   **Service Worker:** Handles background tasks like authentication and event listeners.
-   **ES Modules:** Uses modern JavaScript modules throughout.
-   **Dynamic Configuration:** Loads authentication configuration in this priority order:
    1.  User overrides from the Settings page (`chrome.storage.sync`).
    2.  Baked-in defaults from `config/auth.defaults.json`.
    3.  Dynamic discovery from the backend gateway.
    4.  Hardcoded fallback URLs.
-   **Authentication:** Uses **Cognito OAuth 2.0 with PKCE** via the `chrome.identity.launchWebAuthFlow` API for a secure sign-in process.

### Key Files

-   `manifest.json`: The core extension manifest file.
-   `sw.js`: The service worker for all background logic.
-   `popup.html` / `popup.js`: The UI and logic for the extension's popup.
-   `settings.html` / `settings.js`: The options page for user configuration.
-   `sidebar.js`: The content script that builds and manages the main sidebar UI.
-   `utils/auth.js`: Handles the entire Cognito PKCE authentication flow.
-   `utils/auto_config.js`: Manages the dynamic loading of environment and auth settings.
-   `utils/mem0_gateway.js`: The client for interacting with the Mem0 backend API.
-   `config/auth.defaults.json`: Default authentication settings for the `dev` environment.