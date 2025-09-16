# Smoke Test Checklist

## Prerequisites
- Chrome browser with the extension loaded in Developer Mode.
- `config/auth.defaults.json` is populated with valid credentials for the environment under test.
- The corresponding backend (mem0 service) is deployed and running.

## Test Cases

### 1. First-Time Install & Sign In
- [ ] **Clean Slate:** Ensure no existing `chrome.storage.sync` data for the extension.
- [ ] **Open Popup:** Click the extension icon. The "Sign in" view should appear.
- [ ] **Click Sign In:** The Cognito Hosted UI should open in a new tab.
- [ ] **Authenticate:** Complete the sign-in flow.
- [ ] **Successful Redirect:** The tab should close, and the popup should now show the "Signed In" view.
- [ ] **Verify Tokens:** `chrome.storage.session` should contain `access_token` and `id_token`.

### 2. Sidebar Functionality
- [ ] **Toggle on a Whitelisted Page:** Open a page like `google.com`. Click the extension icon and "Open Full View". The sidebar should open.
- [ ] **Toggle via Hotkey:** Use the configured hotkey (if any) to open and close the sidebar.
- [ ] **Toggle on a Blacklisted Page:** Add a domain to the blacklist in Settings. Visit that domain. The sidebar should not open.
- [ ] **Signed Out Toggle:** Sign out. Try to open the sidebar. It should trigger the sign-in flow.

### 3. Settings Page
- [ ] **Open Settings:** From the popup, click "Settings". The settings page should open.
- [ ] **Load Baked Defaults:** Click "Load Baked Defaults". The auth fields should populate from `config/auth.defaults.json`.
- [ ] **Re-run Discovery:** Click "Re-run Discovery". The auth fields should populate from the backend's discovery endpoint.
- [ ] **Save Environment:** Change the environment and save. The change should persist.
- [ ] **Save Auth:** Manually change auth details and save. The changes should persist.

### 4. Memory Creation & Retrieval
- [ ] **Quick Save:** In the popup, use the "Quick Save" feature. A success notification should appear.
- [ ] **Context Menu:** Right-click on selected text on a page and use the "Save to Mem0" context menu item.
- [ ] **Verify in Sidebar:** Open the sidebar. The newly created memories should be visible.

