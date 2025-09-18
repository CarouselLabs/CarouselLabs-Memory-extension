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
      background: #4DB9A5 !important;
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
      <svg width="28" height="38" viewBox="0 0 477 659" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M156.696 223.161C146.724 223.161 132.701 225.519 131.121 212.347C129.986 202.847 129.941 188.807 141.983 187.405C149.685 186.493 171.342 186.471 178.932 187.561C187.502 188.785 193 196.372 193.779 204.627C196.695 235.754 191.954 272.044 193.156 303.661L43.6669 558.845C26.6614 589.038 42.643 617.518 76.8545 620.188H401.296C425.469 619.164 443.876 602.433 441.45 577.401C440.315 565.698 429.72 550.657 423.799 540.155C378.636 459.944 327.598 382.759 284.705 301.369C286.197 270.642 281.678 236.177 284.349 205.895C285.106 197.395 290.114 188.918 299.173 187.517C306.385 186.404 328.621 186.560 336.145 187.405C348.454 188.785 349.745 201.957 348.164 212.236C346.117 225.564 332.873 223.317 322.701 223.161V296.563C366.839 376.507 419.904 453.915 462.908 534.237C494.849 593.844 469.652 646.354 403.766 658.413L74.2948 658.48C16.4669 654.097 -18.7907 592.442 12.1933 541.423L156.696 295.295V223.183V223.161Z" fill="white"/>
        <path d="M257.347 428.721C242.7 424.71 228.071 422.892 213.323 427.557C165.268 442.77 146.988 507.596 185.028 542.584C225.175 579.534 284.602 557.091 297.291 505.865C300.342 493.547 293.3 473.424 309.714 470.234C327.612 466.746 331.246 483.334 330.55 496.96C325.016 606.219 168.624 629.715 135.726 523.318C111.125 443.728 196.426 364.183 273.278 401.128C279.18 386.988 293.5 368.639 300.024 393.576C303.596 407.2 304.632 422.545 308.841 436.177C309.215 439.938 307.358 444.133 304.013 445.875L254.274 459.062C249.38 459.705 244.383 451.219 246.286 447.924L257.377 428.713L257.347 428.721Z" fill="white"/>
        <path d="M221.068 174.056C241.806 174.056 258.618 157.25 258.618 136.52C258.618 115.79 241.806 98.9844 221.068 98.9844C200.329 98.9844 183.518 115.79 183.518 136.52C183.518 157.25 200.329 174.056 221.068 174.056Z" fill="white"/>
        <path d="M275.948 94.4979C289.382 94.4979 300.272 83.612 300.272 70.1835C300.272 56.7551 289.382 45.8691 275.948 45.8691C262.515 45.8691 251.625 56.7551 251.625 70.1835C251.625 83.612 262.515 94.4979 275.948 94.4979Z" fill="white"/>
        <path d="M243.594 32.917C252.576 32.917 259.856 25.6392 259.856 16.6616C259.856 7.68403 252.576 0.40625 243.594 0.40625C234.613 0.40625 227.333 7.68403 227.333 16.6616C227.333 25.6392 234.613 32.917 243.594 32.917Z" fill="white"/>
      </svg>
    `;
    iconSvg.style.cssText = `
      pointer-events: none !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1)) !important;
      margin-top: -4px !important;
    `;

    floatingButton.appendChild(iconSvg);

    // Add hover effects with CarouselLabs colors
    floatingButton.addEventListener('mouseenter', () => {
      floatingButton.style.transform = 'translateY(-50%) scale(1.1) !important';
      floatingButton.style.boxShadow = '0 6px 25px rgba(77, 185, 165, 0.6) !important';
      floatingButton.style.background = '#17D8FD !important'; // Cyan on hover
    });

    floatingButton.addEventListener('mouseleave', () => {
      floatingButton.style.transform = 'translateY(-50%) scale(1) !important';
      floatingButton.style.boxShadow = '0 4px 20px rgba(77, 185, 165, 0.4) !important';
      floatingButton.style.background = '#4DB9A5 !important'; // Back to mint
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
        
        /* Placeholder text styling for textarea */
        #additional-context::placeholder {
          color: var(--light-colors-gray-400) !important;
          opacity: 1 !important;
        }
        
        /* Firefox placeholder styling */
        #additional-context::-moz-placeholder {
          color: var(--light-colors-gray-400) !important;
          opacity: 1 !important;
        }
        
        /* Webkit placeholder styling */
        #additional-context::-webkit-input-placeholder {
          color: var(--light-colors-gray-400) !important;
        }
      `;
      document.head.appendChild(style);
    }

    panel.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--spacing-4);">
        <div style="display: flex; align-items: center; gap: 12px;">
          <h3 style="margin: 0; font-size: 18px; font-weight: 600; font-family: var(--typography-h3-font-family); background: linear-gradient(135deg, var(--colors-mint-400), var(--colors-cyan-300)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; display: flex; align-items: center; gap: 8px;">
            <svg width="20" height="20" viewBox="0 0 477 680" fill="none" xmlns="http://www.w3.org/2000/svg">
              <g clip-path="url(#clip0_121_65)">
                <path d="M156.511 244.161C146.539 244.161 132.516 246.519 130.935 233.347C129.8 223.847 129.756 209.807 141.798 208.405C149.499 207.493 171.157 207.471 178.747 208.561C187.316 209.785 192.814 217.372 193.593 225.627C196.509 256.754 191.768 293.044 192.97 324.661L43.4814 579.845C26.4758 610.038 42.4575 638.518 76.6689 641.188H401.11C425.283 640.164 443.691 623.433 441.265 598.401C440.129 586.698 429.534 571.657 423.614 561.155C378.451 480.944 327.412 403.759 284.52 322.369C286.011 291.642 281.493 257.177 284.164 226.895C284.92 218.395 289.929 209.918 298.988 208.517C306.2 207.404 328.436 207.56 335.959 208.405C348.268 209.785 349.559 222.957 347.979 233.236C345.931 246.564 332.687 244.317 322.515 244.161V317.563C366.654 397.507 419.718 474.915 462.722 555.237C494.663 614.844 469.466 667.354 403.581 679.413L74.1092 679.48C16.2814 675.097 -18.9762 613.442 12.0077 562.423L156.511 316.295V244.183V244.161Z" fill="white"/>
                <path d="M257.161 449.721C242.514 445.71 227.885 443.892 213.138 448.557C165.082 463.77 146.803 528.596 184.843 563.584C224.989 600.534 284.416 578.091 297.105 526.865C300.156 514.547 293.114 494.424 309.529 491.234C327.427 487.746 331.06 504.334 330.364 517.96C324.831 627.219 168.439 650.715 135.541 544.318C110.94 464.728 196.241 385.183 273.092 422.128C278.994 407.988 293.315 389.639 299.839 414.576C303.411 428.2 304.446 443.545 308.656 457.177C309.029 460.938 307.173 465.133 303.828 466.875L254.089 480.062C249.194 480.705 244.198 472.219 246.1 468.924L257.192 449.713L257.161 449.721Z" fill="white"/>
                <path d="M220.882 195.056C241.621 195.056 258.433 178.25 258.433 157.52C258.433 136.79 241.621 119.984 220.882 119.984C200.144 119.984 183.332 136.79 183.332 157.52C183.332 178.25 200.144 195.056 220.882 195.056Z" fill="white"/>
                <path d="M275.763 115.498C289.197 115.498 300.087 104.612 300.087 91.1835C300.087 77.7551 289.197 66.8691 275.763 66.8691C262.329 66.8691 251.439 77.7551 251.439 91.1835C251.439 104.612 262.329 115.498 275.763 115.498Z" fill="white"/>
                <path d="M243.409 53.917C252.39 53.917 259.671 46.6392 259.671 37.6616C259.671 28.684 252.39 21.4062 243.409 21.4062C234.428 21.4062 227.147 28.684 227.147 37.6616C227.147 46.6392 234.428 53.917 243.409 53.917Z" fill="white"/>
              </g>
              <defs>
                <linearGradient id="beaker-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" style="stop-color:#4DB9A5"/>
                  <stop offset="100%" style="stop-color:#22D3EE"/>
                </linearGradient>
                <clipPath id="clip0_121_65">
                  <rect width="476" height="679" fill="none" transform="translate(0.5 0.480469)"/>
                </clipPath>
              </defs>
            </svg>
            Crawl Page
          </h3>
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
        <div style="color: var(--colors-red-400); font-weight: 500;">✗ Crawl failed</div>
        <div style="font-size: 12px; color: var(--light-colors-gray-400); margin-top: 4px;">${error.message}</div>
      `;
      progressFill.style.width = '0%';
      progressFill.style.background = 'var(--colors-red-400)';
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
