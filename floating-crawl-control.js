(function () {
  let floatingControlVisible = false;
  let contextScopeConfig = null;

  // Initialize the floating crawl control
  function initializeFloatingCrawlControl() {
    // Only show on pages that aren't AI chat platforms (to avoid conflicts)
    const currentHost = window.location.hostname;
    const aiPlatforms = ['claude.ai', 'chat.openai.com', 'chatgpt.com', 'perplexity.ai', 'grok.com', 'x.com', 'chat.deepseek.com', 'gemini.google.com', 'replit.com', 'app.mem0.ai'];
    
    if (aiPlatforms.some(platform => currentHost.includes(platform))) {
      return; // Don't show on AI platforms
    }

    createFloatingCrawlButton();
  }

  function createFloatingCrawlButton() {
    // Check if button already exists
    if (document.querySelector('#memloop-crawl-control')) {
      return;
    }

    // Add CarouselLabs design tokens and fonts
    if (!document.querySelector('#memloop-design-tokens')) {
      // Add Google Fonts
      const fontLink = document.createElement('link');
      fontLink.rel = 'preconnect';
      fontLink.href = 'https://fonts.googleapis.com';
      document.head.appendChild(fontLink);
      
      const fontLinkCrossorigin = document.createElement('link');
      fontLinkCrossorigin.rel = 'preconnect';
      fontLinkCrossorigin.href = 'https://fonts.gstatic.com';
      fontLinkCrossorigin.crossOrigin = 'anonymous';
      document.head.appendChild(fontLinkCrossorigin);
      
      const fontImport = document.createElement('link');
      fontImport.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Space+Grotesk:wght@400;600;700&display=swap';
      fontImport.rel = 'stylesheet';
      document.head.appendChild(fontImport);

      const tokensStyle = document.createElement('style');
      tokensStyle.id = 'memloop-design-tokens';
      tokensStyle.textContent = `
        :root {
          /* CarouselLabs Design Tokens */
          --colors-jet-900: #131416;
          --colors-forest-600: #2F8F5A;
          --colors-mint-400: #4DB9A5;
          --colors-cyan-300: #17D8FD;
          --colors-ivory-50: #E1E1E3;
          --light-colors-pearl-50: #FEFEFE;
          --light-colors-pearl-100: #F8F9FA;
          --light-colors-pearl-200: #F1F3F4;
          --light-colors-slate-700: #334155;
          --light-colors-slate-800: #1E293B;
          --light-colors-gray-300: #CBD5E1;
          --light-colors-gray-400: #94A3B8;
          --light-colors-gray-500: #64748B;
          --typography-body-font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          --typography-h3-font-family: 'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          --spacing-4: 16px;
          --spacing-6: 24px;
          --spacing-8: 32px;
        }
      `;
      document.head.appendChild(tokensStyle);
    }

    const floatingButton = document.createElement('div');
    floatingButton.id = 'memloop-crawl-control';
    floatingButton.style.cssText = `
      position: fixed !important;
      top: 50% !important;
      right: 20px !important;
      transform: translateY(-50%) !important;
      width: 60px !important;
      height: 60px !important;
      background: linear-gradient(135deg, var(--colors-mint-400), var(--colors-cyan-300)) !important;
      border-radius: 50% !important;
      box-shadow: 0 4px 20px rgba(77, 185, 165, 0.4) !important;
      cursor: pointer !important;
      z-index: 10000 !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      transition: all 0.3s ease !important;
      border: 2px solid rgba(255, 255, 255, 0.2) !important;
      backdrop-filter: blur(10px) !important;
    `;

    // Create CarouselLabs beaker logo
    const iconSvg = document.createElement('div');
    iconSvg.innerHTML = `
      <svg width="28" height="28" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <!-- CarouselLabs Beaker Icon -->
        <path d="M35 25V15C35 12.2386 37.2386 10 40 10H60C62.7614 10 65 12.2386 65 15V25" stroke="white" stroke-width="3" fill="none"/>
        <path d="M40 25L30 60C28.5 65 32 70 37 70H63C68 70 71.5 65 70 60L60 25" stroke="white" stroke-width="3" fill="none"/>
        <circle cx="45" cy="45" r="3" fill="white" opacity="0.8"/>
        <circle cx="55" cy="52" r="2" fill="white" opacity="0.6"/>
        <circle cx="50" cy="58" r="2.5" fill="white" opacity="0.7"/>
        <!-- Bubbles for activity -->
        <circle cx="52" cy="40" r="1.5" fill="white" opacity="0.5"/>
        <circle cx="48" cy="35" r="1" fill="white" opacity="0.4"/>
      </svg>
    `;
    iconSvg.style.cssText = `
      pointer-events: none !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1)) !important;
    `;

    floatingButton.appendChild(iconSvg);

    // Add hover effects with CarouselLabs colors
    floatingButton.addEventListener('mouseenter', () => {
      floatingButton.style.transform = 'translateY(-50%) scale(1.1) !important';
      floatingButton.style.boxShadow = '0 6px 25px rgba(77, 185, 165, 0.6) !important';
      floatingButton.style.background = 'linear-gradient(135deg, var(--colors-cyan-300), var(--colors-mint-400)) !important';
    });

    floatingButton.addEventListener('mouseleave', () => {
      floatingButton.style.transform = 'translateY(-50%) scale(1) !important';
      floatingButton.style.boxShadow = '0 4px 20px rgba(77, 185, 165, 0.4) !important';
      floatingButton.style.background = 'linear-gradient(135deg, var(--colors-mint-400), var(--colors-cyan-300)) !important';
    });

    // Add click event to show crawl control panel
    floatingButton.addEventListener('click', () => {
      if (floatingControlVisible) {
        hideCrawlControlPanel();
      } else {
        showCrawlControlPanel();
      }
    });

    document.body.appendChild(floatingButton);
  }

  function showCrawlControlPanel() {
    // Remove existing panel if any
    const existingPanel = document.querySelector('#memloop-crawl-panel');
    if (existingPanel) {
      existingPanel.remove();
    }

    const panel = document.createElement('div');
    panel.id = 'memloop-crawl-panel';
    panel.style.cssText = `
      position: fixed !important;
      top: 50% !important;
      right: 90px !important;
      transform: translateY(-50%) !important;
      width: 320px !important;
      background: var(--colors-jet-900) !important;
      backdrop-filter: blur(20px) !important;
      border-radius: 16px !important;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4) !important;
      border: 1px solid var(--light-colors-slate-700) !important;
      z-index: 10001 !important;
      padding: var(--spacing-6) !important;
      font-family: var(--typography-body-font-family), -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
      color: var(--light-colors-pearl-50) !important;
      animation: slideInFromRight 0.3s ease-out !important;
    `;

    // Add animation keyframes
    if (!document.querySelector('#memloop-crawl-animations')) {
      const style = document.createElement('style');
      style.id = 'memloop-crawl-animations';
      style.textContent = `
        @keyframes slideInFromRight {
          from {
            opacity: 0;
            transform: translateY(-50%) translateX(20px);
          }
          to {
            opacity: 1;
            transform: translateY(-50%) translateX(0);
          }
        }
      `;
      document.head.appendChild(style);
    }

    panel.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--spacing-4);">
        <div style="display: flex; align-items: center; gap: 12px;">
          <svg width="24" height="24" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M35 25V15C35 12.2386 37.2386 10 40 10H60C62.7614 10 65 12.2386 65 15V25" stroke="currentColor" stroke-width="3" fill="none"/>
            <path d="M40 25L30 60C28.5 65 32 70 37 70H63C68 70 71.5 65 70 60L60 25" stroke="currentColor" stroke-width="3" fill="none"/>
            <circle cx="45" cy="45" r="3" fill="currentColor" opacity="0.8"/>
            <circle cx="55" cy="52" r="2" fill="currentColor" opacity="0.6"/>
            <circle cx="50" cy="58" r="2.5" fill="currentColor" opacity="0.7"/>
          </svg>
          <h3 style="margin: 0; font-size: 18px; font-weight: 600; font-family: var(--typography-h3-font-family); background: linear-gradient(135deg, var(--colors-mint-400), var(--colors-cyan-300)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">Crawl Page</h3>
        </div>
        <button id="close-crawl-panel" style="background: none; border: none; font-size: 20px; cursor: pointer; color: var(--light-colors-gray-400); padding: 0; width: 24px; height: 24px; transition: color 0.2s;">×</button>
      </div>
      
      <div style="margin-bottom: var(--spacing-4);">
        <label style="display: block; margin-bottom: 8px; font-size: 14px; font-weight: 500; color: var(--light-colors-gray-300);">Page URL:</label>
        <input type="text" id="crawl-url" value="${window.location.href}" 
               style="width: 100%; padding: 8px 12px; border: 1px solid var(--light-colors-slate-700); border-radius: 8px; font-size: 14px; box-sizing: border-box; background: var(--light-colors-slate-800); color: var(--light-colors-pearl-50); font-family: inherit;">
      </div>
      
      <div style="margin-bottom: var(--spacing-4);">
        <label style="display: block; margin-bottom: 8px; font-size: 14px; font-weight: 500; color: var(--light-colors-gray-300);">Context Scope:</label>
        <div id="context-scope-options" style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 12px;">
          <label style="display: flex; align-items: center; cursor: pointer; color: var(--light-colors-pearl-50);">
            <input type="checkbox" id="scope-page" checked style="margin-right: 6px; accent-color: var(--colors-mint-400);"> Page
          </label>
          <label style="display: flex; align-items: center; cursor: pointer; color: var(--light-colors-pearl-50);">
            <input type="checkbox" id="scope-domain" checked style="margin-right: 6px; accent-color: var(--colors-mint-400);"> Domain
          </label>
          <label style="display: flex; align-items: center; cursor: pointer; color: var(--light-colors-pearl-50);">
            <input type="checkbox" id="scope-user" style="margin-right: 6px; accent-color: var(--colors-mint-400);"> User
          </label>
          <label style="display: flex; align-items: center; cursor: pointer; color: var(--light-colors-pearl-50);">
            <input type="checkbox" id="scope-business" style="margin-right: 6px; accent-color: var(--colors-mint-400);"> Business
          </label>
          <label style="display: flex; align-items: center; cursor: pointer; color: var(--light-colors-pearl-50);">
            <input type="checkbox" id="scope-ecommerce" style="margin-right: 6px; accent-color: var(--colors-mint-400);"> E-commerce
          </label>
          <label style="display: flex; align-items: center; cursor: pointer; color: var(--light-colors-pearl-50);">
            <input type="checkbox" id="scope-app" style="margin-right: 6px; accent-color: var(--colors-mint-400);"> App
          </label>
        </div>
      </div>
      
      <div style="margin-bottom: var(--spacing-4);">
        <label style="display: block; margin-bottom: 8px; font-size: 14px; font-weight: 500; color: var(--light-colors-gray-300);">Additional Context:</label>
        <textarea id="additional-context" placeholder="Add any additional context for this crawl..." 
                  style="width: 100%; height: 60px; padding: 8px 12px; border: 1px solid var(--light-colors-slate-700); border-radius: 8px; font-size: 14px; resize: vertical; box-sizing: border-box; font-family: inherit; background: var(--light-colors-slate-800); color: var(--light-colors-pearl-50);"></textarea>
      </div>
      
      <div style="display: flex; gap: 12px;">
        <button id="start-crawl" style="flex: 1; background: linear-gradient(135deg, var(--colors-mint-400), var(--colors-cyan-300)); color: var(--light-colors-pearl-50); border: none; padding: 12px; border-radius: 8px; font-size: 14px; font-weight: 500; cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 12px rgba(77, 185, 165, 0.3);">
          Start Crawl
        </button>
        <button id="cancel-crawl" style="flex: 1; background: var(--light-colors-slate-700); color: var(--light-colors-gray-300); border: none; padding: 12px; border-radius: 8px; font-size: 14px; font-weight: 500; cursor: pointer; transition: all 0.2s;">
          Cancel
        </button>
      </div>
      
      <div id="crawl-status" style="margin-top: var(--spacing-4); padding: 12px; background: var(--light-colors-slate-800); border-radius: 8px; font-size: 13px; display: none; border: 1px solid var(--light-colors-slate-700);">
        <div id="status-text" style="color: var(--light-colors-pearl-50);">Ready to crawl...</div>
        <div id="progress-bar" style="width: 100%; height: 4px; background: var(--light-colors-slate-700); border-radius: 2px; margin-top: 8px; overflow: hidden;">
          <div id="progress-fill" style="height: 100%; background: linear-gradient(90deg, var(--colors-mint-400), var(--colors-cyan-300)); width: 0%; transition: width 0.3s ease;"></div>
        </div>
      </div>
    `;

    // Add event listeners
    panel.querySelector('#close-crawl-panel').addEventListener('click', hideCrawlControlPanel);
    panel.querySelector('#cancel-crawl').addEventListener('click', hideCrawlControlPanel);
    panel.querySelector('#start-crawl').addEventListener('click', handleStartCrawl);

    // Add hover effects to buttons
    const startButton = panel.querySelector('#start-crawl');
    const cancelButton = panel.querySelector('#cancel-crawl');
    const closeButton = panel.querySelector('#close-crawl-panel');
    
    startButton.addEventListener('mouseenter', () => {
      startButton.style.transform = 'translateY(-1px)';
      startButton.style.boxShadow = '0 6px 16px rgba(77, 185, 165, 0.4)';
      startButton.style.background = 'linear-gradient(135deg, var(--colors-cyan-300), var(--colors-mint-400))';
    });
    
    startButton.addEventListener('mouseleave', () => {
      startButton.style.transform = 'translateY(0)';
      startButton.style.boxShadow = '0 4px 12px rgba(77, 185, 165, 0.3)';
      startButton.style.background = 'linear-gradient(135deg, var(--colors-mint-400), var(--colors-cyan-300))';
    });
    
    cancelButton.addEventListener('mouseenter', () => {
      cancelButton.style.background = 'var(--light-colors-slate-800)';
      cancelButton.style.color = 'var(--light-colors-pearl-50)';
    });
    
    cancelButton.addEventListener('mouseleave', () => {
      cancelButton.style.background = 'var(--light-colors-slate-700)';
      cancelButton.style.color = 'var(--light-colors-gray-300)';
    });

    closeButton.addEventListener('mouseenter', () => {
      closeButton.style.color = 'var(--light-colors-pearl-50)';
    });
    
    closeButton.addEventListener('mouseleave', () => {
      closeButton.style.color = 'var(--light-colors-gray-400)';
    });

    document.body.appendChild(panel);
    floatingControlVisible = true;

    // Load saved context scope preferences
    loadContextScopePreferences();
  }

  function hideCrawlControlPanel() {
    const panel = document.querySelector('#memloop-crawl-panel');
    if (panel) {
      panel.style.animation = 'slideOutToRight 0.3s ease-in forwards';
      setTimeout(() => {
        panel.remove();
      }, 300);
    }
    floatingControlVisible = false;
  }

  async function handleStartCrawl() {
    const urlInput = document.querySelector('#crawl-url');
    const additionalContext = document.querySelector('#additional-context');
    const statusDiv = document.querySelector('#crawl-status');
    const statusText = document.querySelector('#status-text');
    const progressFill = document.querySelector('#progress-fill');
    const startButton = document.querySelector('#start-crawl');
    
    if (!urlInput.value.trim()) {
      alert('Please enter a valid URL to crawl');
      return;
    }

    // Get selected context scope options
    const selectedScopes = [];
    const scopeCheckboxes = document.querySelectorAll('#context-scope-options input[type="checkbox"]');
    scopeCheckboxes.forEach(checkbox => {
      if (checkbox.checked) {
        selectedScopes.push(checkbox.id.replace('scope-', ''));
      }
    });

    // Save context scope preferences
    saveContextScopePreferences(selectedScopes);

    // Show status and disable button
    statusDiv.style.display = 'block';
    startButton.disabled = true;
    startButton.style.opacity = '0.6';
    startButton.style.cursor = 'not-allowed';
    
    try {
      statusText.textContent = 'Initiating crawl request...';
      progressFill.style.width = '20%';
      
      // Send crawl request via service worker to avoid dynamic import issues
      statusText.textContent = 'Sending crawl request to crawl4ai...';
      progressFill.style.width = '50%';

      // Prepare crawl request payload
      const crawlPayload = {
        url: urlInput.value.trim(),
        contextScopes: selectedScopes,
        contextData: {
          url: urlInput.value.trim(),
          title: document.title
        },
        additionalContext: additionalContext.value.trim(),
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
        correlationId: `memloop-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      };

      statusText.textContent = 'Processing crawl request...';
      progressFill.style.width = '75%';

      // Use chrome.runtime.sendMessage to communicate with service worker
      const response = await new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(
          { type: 'memloop_crawl', params: crawlPayload },
          (response) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else {
              resolve(response);
            }
          }
        );
      });

      if (!response.ok) {
        throw new Error(response.error || 'Crawl request failed');
      }

      const result = response.result;
      
      statusText.textContent = 'Crawl completed successfully!';
      progressFill.style.width = '100%';
      
      // Show success message
      setTimeout(() => {
        statusText.innerHTML = `
          <div style="color: #28a745; font-weight: 500;">✓ Crawl completed!</div>
          <div style="font-size: 12px; color: #666; margin-top: 4px;">
            Data sent to mem0 for processing and storage.
            ${result.correlationId ? `Correlation ID: ${result.correlationId}` : ''}
          </div>
        `;
        
        // Auto-hide panel after 3 seconds
        setTimeout(() => {
          hideCrawlControlPanel();
        }, 3000);
      }, 500);

    } catch (error) {
      console.error('Crawl request failed:', error);
      statusText.innerHTML = `
        <div style="color: #dc3545; font-weight: 500;">✗ Crawl failed</div>
        <div style="font-size: 12px; color: #666; margin-top: 4px;">${error.message}</div>
      `;
      progressFill.style.width = '0%';
      progressFill.style.background = '#dc3545';
    } finally {
      // Re-enable button
      startButton.disabled = false;
      startButton.style.opacity = '1';
      startButton.style.cursor = 'pointer';
    }
  }

  function saveContextScopePreferences(selectedScopes) {
    chrome.storage.sync.set({
      'memloop_context_scope_preferences': selectedScopes
    });
  }

  function loadContextScopePreferences() {
    chrome.storage.sync.get(['memloop_context_scope_preferences'], (result) => {
      const savedScopes = result.memloop_context_scope_preferences || ['page', 'domain'];
      
      // Update checkboxes based on saved preferences
      const scopeCheckboxes = document.querySelectorAll('#context-scope-options input[type="checkbox"]');
      scopeCheckboxes.forEach(checkbox => {
        const scopeName = checkbox.id.replace('scope-', '');
        checkbox.checked = savedScopes.includes(scopeName);
      });
    });
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeFloatingCrawlControl);
  } else {
    initializeFloatingCrawlControl();
  }

  // Handle visibility changes (hide/show on focus/blur)
  document.addEventListener('visibilitychange', () => {
    const crawlButton = document.querySelector('#memloop-crawl-control');
    if (crawlButton) {
      if (document.hidden) {
        crawlButton.style.opacity = '0.3';
      } else {
        crawlButton.style.opacity = '1';
      }
    }
  });

  // Add slideOutToRight animation
  if (!document.querySelector('#memloop-crawl-animations-out')) {
    const style = document.createElement('style');
    style.id = 'memloop-crawl-animations-out';
    style.textContent = `
      @keyframes slideOutToRight {
        from {
          opacity: 1;
          transform: translateY(-50%) translateX(0);
        }
        to {
          opacity: 0;
          transform: translateY(-50%) translateX(20px);
        }
      }
    `;
    document.head.appendChild(style);
  }

})();
