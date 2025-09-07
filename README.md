# MemLoop by CarouselLabs

MemLoop brings personalized, cross-session memory to your favorite AI assistants. Share context seamlessly across ChatGPT, Claude, Perplexity, and more, making your AI interactions more efficient and powerful.

Built by CarouselLabs ❤️

## Installation

### For Chrome

1.  Clone this repository.
2.  Open Google Chrome and navigate to `chrome://extensions`.
3.  Enable "Developer mode" in the top right corner.
4.  Click "Load unpacked" and select the directory containing the extension files.
5.  The MemLoop icon should now appear in your Chrome toolbar.

### For Vivaldi

1.  Clone this repository.
2.  Open Vivaldi and navigate to `vivaldi://extensions`.
3.  Enable "Developer mode" in the top right corner.
4.  Click "Load unpacked" and select the directory containing the extension files.
5.  The MemLoop icon should now appear in your Vivaldi toolbar.

## Usage

1.  After installation, click the MemLoop icon in your browser's toolbar.
2.  Sign in with your CarouselLabs account.
3.  Start chatting with any supported AI assistant.
4.  MemLoop will automatically save and recall relevant memories to enhance your conversations.

## Configuration (for Developers)

The extension is configured to work with the CarouselLabs development environment by default. You can change the target environment and other settings from the extension's Options page.

-   **Gateway Base URL (Dev):** `https://api.dev.carousellabs.co`
-   **Auth Exchange Endpoint (Dev):** `https://api.dev.carousellabs.co/auth/exchange`

To access the options page:

1.  Right-click the MemLoop extension icon in your toolbar.
2.  Select "Options".

From the Options page, you can "Fetch From Gateway" to auto-populate the Cognito configuration for the selected environment.

## Privacy and Data Security

Your messages are processed by a self-hosted instance of Mem0, fronted by the CarouselLabs API Gateway. All data is handled in accordance with CarouselLabs' internal data security policies.

## Contributing

This is an internal CarouselLabs project. Contributions are welcome from all CarouselLabs team members.
