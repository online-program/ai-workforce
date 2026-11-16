/**
 * AI Workforce — Public Embeddable Website Chat Widget
 * Accessible publicly for website visitors on any external website.
 * Uses isolated Shadow DOM and direct CORS API integration.
 * Reads live configuration from widget ID and updates dynamically.
 */
(function () {
  'use strict';

  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (window.__AI_WORKFORCE_WIDGET_INITIALIZED__) return;
  window.__AI_WORKFORCE_WIDGET_INITIALIZED__ = true;

  // 1. Resolve Script Tag & Parameters
  var currentScript =
    document.currentScript ||
    (function () {
      var scripts = document.getElementsByTagName('script');
      for (var i = scripts.length - 1; i >= 0; i--) {
        if (
          scripts[i].src &&
          (scripts[i].src.indexOf('widget.js') !== -1 || scripts[i].src.indexOf('chat-widget.js') !== -1)
        ) {
          return scripts[i];
        }
      }
      return scripts[scripts.length - 1];
    })();

  var widgetId =
    (currentScript &&
      (currentScript.getAttribute('data-widget-id') ||
        currentScript.getAttribute('data-company-id') ||
        currentScript.getAttribute('data-user-id'))) ||
    'default_widget';
  var configuredUserId = (currentScript && currentScript.getAttribute('data-user-id')) || '';
  var initialPosition = (currentScript && currentScript.getAttribute('data-position')) || 'bottom-right';
  var initialColor = (currentScript && currentScript.getAttribute('data-color')) || '#0f172a';
  var autoOpen = currentScript && currentScript.getAttribute('data-auto-open') === 'true';

  var hostOrigin = window.location.origin;
  if (currentScript && currentScript.src) {
    try {
      var scriptUrl = new URL(currentScript.src);
      hostOrigin = scriptUrl.origin;
    } catch (e) {
      hostOrigin = window.location.origin;
    }
  }

  // 2. Session IDs for conversation tracking
  var visitorKey = 'aiw_visitor_' + widgetId;
  var convKey = 'aiw_conv_' + widgetId;
  var msgsKey = 'aiw_msgs_' + widgetId;
  var profileKey = 'aiw_prof_' + widgetId;
  var tokenKey = 'aiw_vtok_' + widgetId + '_' + visitorId;

  var visitorId = '';
  try {
    visitorId = localStorage.getItem(visitorKey) || '';
    if (!visitorId) {
      visitorId = 'vis_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
      localStorage.setItem(visitorKey, visitorId);
    }
  } catch (e) {
    visitorId = 'vis_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
  }
  tokenKey = 'aiw_vtok_' + widgetId + '_' + visitorId;

  var conversationId = '';
  try {
    conversationId = sessionStorage.getItem(convKey) || '';
    if (!conversationId) {
      conversationId = 'conv_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
      sessionStorage.setItem(convKey, conversationId);
    }
  } catch (e) {
    conversationId = 'conv_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
  }

  var storedVisitorToken = '';
  try {
    storedVisitorToken = sessionStorage.getItem(tokenKey) || '';
  } catch (e) {}

  function sanitizeCssColor(val, fallback) {
    if (typeof val !== 'string') return fallback;
    var trimmed = val.trim();
    if (!trimmed || trimmed.length > 64) return fallback;
    if (/[;<>{}()\\]|url\s*\(|expression\s*\(|javascript:/i.test(trimmed)) return fallback;
    if (/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(trimmed)) return trimmed;
    if (/^rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}(\s*,\s*(0|1|0?\.\d+))?\s*\)$/i.test(trimmed)) return trimmed;
    return fallback;
  }

  function getReadableTextColor(bgColor) {
    var clean = sanitizeCssColor(bgColor, '#0f172a').replace('#', '');
    var r = 15, g = 23, b = 42;
    if (clean.length === 3) {
      r = parseInt(clean[0] + clean[0], 16);
      g = parseInt(clean[1] + clean[1], 16);
      b = parseInt(clean[2] + clean[2], 16);
    } else if (clean.length >= 6 && /^[0-9a-f]+$/i.test(clean.slice(0, 6))) {
      r = parseInt(clean.slice(0, 2), 16);
      g = parseInt(clean.slice(2, 4), 16);
      b = parseInt(clean.slice(4, 6), 16);
    }
    var lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return lum > 0.62 ? '#0f172a' : '#ffffff';
  }

  initialColor = sanitizeCssColor(initialColor, '#0f172a');

  // 3. Live Widget State
  var defaultQuickOptions = [
    'Explore Products & Pricing',
    'Request a Quotation',
    'Check Service Areas',
    'Something Else',
  ];

  var state = {
    isOpen: false,
    businessName: 'Alpha',
    welcomeMessage: 'Hi there! 👋 How can Alpha assist you today?',
    themeColor: initialColor,
    themeMode: 'light',
    isDark: false,
    position: initialPosition,
    isActive: true,
    messages: [],
    quickOptions: defaultQuickOptions,
    isTyping: false,
    isSending: false,
    loaded: false,
    currentLeadId: null,
    visitorToken: storedVisitorToken || null,
  };

  // 4. Create Host Container & Shadow Root for full CSS isolation
  var hostElement = document.createElement('div');
  hostElement.id = 'ai-workforce-widget-host';
  hostElement.style.cssText = 'all: initial; position: static; z-index: 2147483647;';

  var shadow = hostElement.attachShadow ? hostElement.attachShadow({ mode: 'open' }) : hostElement;

  var initialContrast = getReadableTextColor(state.themeColor);

  // 5. Inject Scoped CSS using CSS Custom Properties
  var styleSheet = document.createElement('style');
  styleSheet.id = 'aiw-widget-styles';
  styleSheet.textContent = `
    :host, .widget-container {
      --aiw-primary: ${state.themeColor};
      --aiw-primary-contrast: ${initialContrast};
      --aiw-surface: #ffffff;
      --aiw-viewport: #f8fafc;
      --aiw-ai-bg: #ffffff;
      --aiw-ai-text: #0f172a;
      --aiw-ai-border: #e2e8f0;
      --aiw-input-bg: #f1f5f9;
      --aiw-input-text: #0f172a;
      --aiw-input-border: #cbd5e1;
      --aiw-footer-text: #475569;
      --aiw-font: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      font-family: var(--aiw-font);
      -webkit-font-smoothing: antialiased;
    }

    .widget-container {
      position: fixed;
      bottom: 24px;
      z-index: 2147483647;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .widget-container.pos-right {
      right: 24px;
      left: auto;
      align-items: flex-end;
    }

    .widget-container.pos-left {
      left: 24px;
      right: auto;
      align-items: flex-start;
    }

    .chat-bubble-btn {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: var(--aiw-primary, ${state.themeColor});
      color: var(--aiw-primary-contrast, #ffffff);
      border: none;
      box-shadow: 0 8px 28px rgba(0, 0, 0, 0.28);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.2s ease, background 0.3s ease;
      outline: none;
    }

    .chat-bubble-btn:hover {
      transform: scale(1.08);
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.35);
    }

    .chat-bubble-btn:active {
      transform: scale(0.96);
    }

    .chat-window {
      width: 380px;
      height: 580px;
      max-width: calc(100vw - 32px);
      max-height: calc(100vh - 110px);
      background: var(--aiw-surface, #ffffff);
      border-radius: 20px;
      box-shadow: 0 16px 48px rgba(15, 23, 42, 0.22), 0 0 0 1px rgba(15, 23, 42, 0.08);
      display: none;
      flex-direction: column;
      overflow: hidden;
      transform-origin: bottom right;
      animation: popIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }

    .widget-container.pos-left .chat-window {
      transform-origin: bottom left;
    }

    @keyframes popIn {
      from {
        opacity: 0;
        transform: scale(0.92) translateY(16px);
      }
      to {
        opacity: 1;
        transform: scale(1) translateY(0);
      }
    }

    .chat-header {
      background: var(--aiw-primary, ${state.themeColor});
      color: var(--aiw-primary-contrast, #ffffff);
      padding: 14px 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid rgba(255, 255, 255, 0.12);
      transition: background 0.3s ease;
    }

    .header-info {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .header-avatar {
      width: 34px;
      height: 34px;
      border-radius: 10px;
      background: rgba(255, 255, 255, 0.18);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      font-weight: 700;
    }

    .header-title {
      font-size: 14px;
      font-weight: 600;
      line-height: 1.2;
      max-width: 210px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .header-status {
      font-size: 11px;
      opacity: 0.85;
      display: flex;
      align-items: center;
      gap: 6px;
      margin-top: 2px;
    }

    .status-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #22c55e;
      display: inline-block;
      box-shadow: 0 0 8px rgba(34, 197, 94, 0.7);
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .icon-btn,
    .close-btn {
      background: transparent;
      border: none;
      color: var(--aiw-primary-contrast, #ffffff);
      opacity: 0.85;
      cursor: pointer;
      width: 34px;
      height: 34px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.15s ease, opacity 0.15s ease;
    }

    .icon-btn:hover,
    .close-btn:hover {
      background: rgba(255, 255, 255, 0.18);
      opacity: 1;
    }

    .icon-btn:focus-visible,
    .close-btn:focus-visible,
    .send-btn:focus-visible,
    .chat-bubble-btn:focus-visible {
      outline: 2px solid #2563eb;
      outline-offset: 2px;
    }

    .chat-messages {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      background: var(--aiw-viewport, #f8fafc);
    }

    .chat-messages::-webkit-scrollbar {
      width: 4px;
    }

    .chat-messages::-webkit-scrollbar-thumb {
      background: #cbd5e1;
      border-radius: 4px;
    }

    .msg-row {
      display: flex;
      flex-direction: column;
      max-width: 84%;
    }

    .msg-row.customer {
      align-self: flex-end;
      align-items: flex-end;
    }

    .msg-row.assistant {
      align-self: flex-start;
      align-items: flex-start;
    }

    .msg-bubble {
      padding: 11px 15px;
      font-size: 13px;
      line-height: 1.48;
      border-radius: 16px;
      word-break: break-word;
      white-space: pre-wrap;
    }

    .msg-row.customer .msg-bubble {
      background: var(--aiw-primary, ${state.themeColor});
      color: var(--aiw-primary-contrast, #ffffff);
      border-bottom-right-radius: 4px;
      transition: background 0.3s ease;
    }

    .msg-row.assistant .msg-bubble {
      background: var(--aiw-ai-bg, #ffffff);
      color: var(--aiw-ai-text, #0f172a);
      border: 1px solid var(--aiw-ai-border, #e2e8f0);
      border-bottom-left-radius: 4px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
    }

    .msg-time {
      font-size: 10px;
      color: #64748b;
      margin-top: 4px;
      padding: 0 4px;
    }

    .typing-indicator {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 10px 14px;
      background: var(--aiw-ai-bg, #ffffff);
      border: 1px solid var(--aiw-ai-border, #e2e8f0);
      border-radius: 16px;
      border-bottom-left-radius: 4px;
      width: fit-content;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
    }

    .typing-dot {
      width: 6px;
      height: 6px;
      background: #64748b;
      border-radius: 50%;
      animation: typingPulse 1.2s infinite ease-in-out;
    }

    .typing-dot:nth-child(2) { animation-delay: 0.2s; }
    .typing-dot:nth-child(3) { animation-delay: 0.4s; }

    @keyframes typingPulse {
      0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
      40% { transform: scale(1.1); opacity: 1; }
    }

    .msg-options {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 8px;
      max-width: 95%;
    }

    .opt-btn {
      font-size: 11px;
      font-weight: 500;
      padding: 6px 12px;
      border-radius: 10px;
      background: var(--aiw-ai-bg, #ffffff);
      color: var(--aiw-ai-text, #1e293b);
      border: 1px solid var(--aiw-input-border, #cbd5e1);
      cursor: pointer;
      text-align: left;
      transition: all 0.15s ease;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
      white-space: nowrap;
      user-select: none;
    }

    .opt-btn:hover {
      border-color: var(--aiw-primary, #0f172a);
      transform: translateY(-1px);
    }

    .opt-btn:active {
      transform: scale(0.97);
    }

    .opt-btn.something-else {
      border-style: dashed;
    }

    .chat-footer {
      padding: 12px 14px;
      background: var(--aiw-surface, #ffffff);
      border-top: 1px solid var(--aiw-ai-border, #e2e8f0);
    }

    .chat-input-form {
      display: flex;
      align-items: center;
      gap: 8px;
      background: var(--aiw-input-bg, #f1f5f9);
      border: 1px solid var(--aiw-input-border, #cbd5e1);
      border-radius: 12px;
      padding: 4px 6px 4px 12px;
      transition: border-color 0.15s ease, background 0.15s ease;
    }

    .chat-input-form:focus-within {
      border-color: var(--aiw-primary, #0f172a);
      box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.15);
    }

    .chat-input {
      flex: 1;
      border: none;
      background: transparent;
      font-size: 13px;
      color: var(--aiw-input-text, #0f172a);
      outline: none;
      padding: 7px 0;
    }

    .chat-input::placeholder {
      color: #64748b;
    }

    .send-btn {
      width: 36px;
      height: 36px;
      border-radius: 9px;
      background: var(--aiw-primary, ${state.themeColor});
      color: var(--aiw-primary-contrast, #ffffff);
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: opacity 0.15s ease, transform 0.1s ease, background 0.3s ease;
    }

    .send-btn:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    .send-btn:not(:disabled):hover {
      transform: scale(1.04);
    }

    .chat-branding {
      text-align: center;
      font-size: 10.5px;
      color: var(--aiw-footer-text, #475569);
      margin-top: 8px;
      font-weight: 500;
    }

    .chat-branding a {
      color: var(--aiw-footer-text, #475569);
      text-decoration: none;
      transition: opacity 0.15s ease;
    }

    .chat-branding a:hover {
      text-decoration: none;
      opacity: 0.85;
    }
  `;
  shadow.appendChild(styleSheet);

  // 6. Build DOM Structure
  var widgetContainer = document.createElement('div');
  widgetContainer.className = 'widget-container ' + (state.position === 'bottom-left' ? 'pos-left' : 'pos-right');

  var chatWindow = document.createElement('div');
  chatWindow.className = 'chat-window';

  // Header DOM
  var chatHeader = document.createElement('div');
  chatHeader.className = 'chat-header';
  chatHeader.innerHTML = `
    <div class="header-info">
      <div class="header-avatar">🤖</div>
      <div>
        <div class="header-title" id="widget-business-name">${state.businessName}</div>
        <div class="header-status">
          <span class="status-dot"></span>
          <span>Alpha Online</span>
        </div>
      </div>
    </div>
    <div class="header-actions">
      <button class="icon-btn reset-btn" aria-label="Restart Conversation" title="Restart conversation">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="1 4 1 10 7 10"></polyline>
          <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
        </svg>
      </button>
      <button class="icon-btn close-btn" aria-label="Close Chat">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    </div>
  `;

  // Messages DOM
  var chatMessages = document.createElement('div');
  chatMessages.className = 'chat-messages';

  // Footer DOM
  var chatFooter = document.createElement('div');
  chatFooter.className = 'chat-footer';
  chatFooter.innerHTML = `
    <form class="chat-input-form">
      <input type="text" class="chat-input" placeholder="Type your requirements or ask questions..." autocomplete="off" />
      <button type="submit" class="send-btn" aria-label="Send Message" disabled>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <line x1="22" y1="2" x2="11" y2="13"></line>
          <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
        </svg>
      </button>
    </form>
    <div class="chat-branding">
      <a href="https://aiworkforce.ai.studio/" target="_blank" rel="noopener noreferrer">Powered by AI Workforce <span style="font-size: 10px; line-height: 1; font-weight: 600;">↗</span></a>
    </div>
  `;

  chatWindow.appendChild(chatHeader);
  chatWindow.appendChild(chatMessages);
  chatWindow.appendChild(chatFooter);

  // Floating Bubble Button
  var bubbleBtn = document.createElement('button');
  bubbleBtn.className = 'chat-bubble-btn';
  bubbleBtn.setAttribute('aria-label', 'Open AI Sales Chat');
  var chatIconSvg = `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>`;
  var closeIconSvg = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
  bubbleBtn.innerHTML = chatIconSvg;

  widgetContainer.appendChild(chatWindow);
  widgetContainer.appendChild(bubbleBtn);
  shadow.appendChild(widgetContainer);

  // 7. Dynamic Configuration and Styling Engine
  function applyThemeColor(color) {
    var safe = sanitizeCssColor(color, state.themeColor || '#0f172a');
    var contrast = getReadableTextColor(safe);
    state.themeColor = safe;

    widgetContainer.style.setProperty('--aiw-primary', safe);
    widgetContainer.style.setProperty('--aiw-primary-contrast', contrast);
    if (hostElement.style) {
      hostElement.style.setProperty('--aiw-primary', safe);
      hostElement.style.setProperty('--aiw-primary-contrast', contrast);
    }

    bubbleBtn.style.backgroundColor = safe;
    bubbleBtn.style.color = contrast;
    chatHeader.style.backgroundColor = safe;
    chatHeader.style.color = contrast;
    var currentSendBtn = chatFooter.querySelector('.send-btn');
    if (currentSendBtn) {
      currentSendBtn.style.backgroundColor = safe;
      currentSendBtn.style.color = contrast;
    }

    var customerBubbles = chatMessages.querySelectorAll('.msg-row.customer .msg-bubble');
    customerBubbles.forEach(function (el) {
      el.style.backgroundColor = safe;
      el.style.color = contrast;
    });
  }

  function applyThemeSurface(widgetConfig) {
    var prefersDark =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches;
    var tm = widgetConfig.themeMode;
    var isDark = tm === 'dark' || (tm === 'system' && prefersDark);
    state.themeMode = tm || 'light';
    state.isDark = isDark;

    if (isDark) {
      widgetContainer.style.setProperty('--aiw-surface', '#0f172a');
      widgetContainer.style.setProperty('--aiw-viewport', '#0b1120');
      widgetContainer.style.setProperty('--aiw-ai-bg', '#1e293b');
      widgetContainer.style.setProperty('--aiw-ai-text', '#f8fafc');
      widgetContainer.style.setProperty('--aiw-ai-border', 'rgba(148, 163, 184, 0.2)');
      widgetContainer.style.setProperty('--aiw-input-bg', '#1e293b');
      widgetContainer.style.setProperty('--aiw-input-text', '#f8fafc');
      widgetContainer.style.setProperty('--aiw-input-border', 'rgba(148, 163, 184, 0.25)');
      widgetContainer.style.setProperty('--aiw-footer-text', '#94a3b8');
    } else {
      widgetContainer.style.setProperty('--aiw-surface', '#ffffff');
      widgetContainer.style.setProperty('--aiw-viewport', '#f8fafc');
      widgetContainer.style.setProperty('--aiw-ai-bg', '#ffffff');
      widgetContainer.style.setProperty('--aiw-ai-text', '#0f172a');
      widgetContainer.style.setProperty('--aiw-ai-border', '#e2e8f0');
      widgetContainer.style.setProperty('--aiw-input-bg', '#f1f5f9');
      widgetContainer.style.setProperty('--aiw-input-text', '#0f172a');
      widgetContainer.style.setProperty('--aiw-input-border', '#cbd5e1');
      widgetContainer.style.setProperty('--aiw-footer-text', '#475569');
    }
  }

  function applyWidgetConfig(widgetConfig) {
    if (!widgetConfig) return;

    applyThemeSurface(widgetConfig);

    // Theme color
    if (widgetConfig.primaryColor || widgetConfig.theme_color) {
      applyThemeColor(widgetConfig.primaryColor || widgetConfig.theme_color);
    }

    // Business Name
    if (widgetConfig.business_name) {
      state.businessName = widgetConfig.business_name;
      var nameEl = shadow.querySelector('#widget-business-name');
      if (nameEl) nameEl.textContent = widgetConfig.business_name;
    }

    // Welcome Message
    if (widgetConfig.welcome_message) {
      state.welcomeMessage = widgetConfig.welcome_message;

      if (state.messages.length === 1 && state.messages[0].sender === 'assistant') {
        state.messages[0].text = widgetConfig.welcome_message;
        renderMessages();
      }
    }

    // Dynamic Smart Quick Options from verified Company Brain
    if (widgetConfig.quick_options && Array.isArray(widgetConfig.quick_options) && widgetConfig.quick_options.length > 0) {
      state.quickOptions = widgetConfig.quick_options;
      if (state.messages.length === 1 && state.messages[0].sender === 'assistant') {
        state.messages[0].options = state.quickOptions;
        renderMessages();
      }
    }

    // Active state
    if (widgetConfig.is_active === false) {
      state.isActive = false;
      widgetContainer.style.display = 'none';
    } else {
      state.isActive = true;
      widgetContainer.style.display = 'flex';
    }

    // Position
    if (widgetConfig.position) {
      state.position = widgetConfig.position;
      if (widgetConfig.position === 'bottom-left') {
        widgetContainer.classList.remove('pos-right');
        widgetContainer.classList.add('pos-left');
      } else {
        widgetContainer.classList.remove('pos-left');
        widgetContainer.classList.add('pos-right');
      }
    }
  }

  // 8. Component Interaction Logic
  var inputEl = chatFooter.querySelector('.chat-input');
  var sendBtn = chatFooter.querySelector('.send-btn');
  var formEl = chatFooter.querySelector('.chat-input-form');
  var closeBtn = chatHeader.querySelector('.close-btn');
  var resetBtn = chatHeader.querySelector('.reset-btn');

  function updateSendButton() {
    if (sendBtn && inputEl) {
      sendBtn.disabled = !inputEl.value.trim() || state.isTyping;
    }
  }

  if (inputEl) {
    inputEl.addEventListener('input', updateSendButton);
  }

  function toggleChat(open) {
    if (typeof open === 'boolean') {
      state.isOpen = open;
    } else {
      state.isOpen = !state.isOpen;
    }

    if (state.isOpen) {
      chatWindow.style.display = 'flex';
      bubbleBtn.innerHTML = closeIconSvg;
      setTimeout(function () {
        if (inputEl) inputEl.focus();
        scrollToBottom();
      }, 100);
    } else {
      chatWindow.style.display = 'none';
      bubbleBtn.innerHTML = chatIconSvg;
    }
  }

  bubbleBtn.addEventListener('click', function () {
    toggleChat();
  });

  if (closeBtn) {
    closeBtn.addEventListener('click', function () {
      toggleChat(false);
    });
  }

  function resetConversation() {
    state.messages = [];
    state.existingProfile = null;
    state.currentLeadId = null;
    conversationId = 'conv_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    try {
      sessionStorage.setItem(convKey, conversationId);
      sessionStorage.removeItem(profileKey);
      localStorage.removeItem(msgsKey);
    } catch (e) {}
    addMessage('assistant', state.welcomeMessage, state.quickOptions);
  }

  if (resetBtn) {
    resetBtn.addEventListener('click', resetConversation);
  }

  function formatTime(isoString) {
    try {
      var d = isoString ? new Date(isoString) : new Date();
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return '';
    }
  }

  function scrollToBottom() {
    if (chatMessages) {
      chatMessages.scrollTop = chatMessages.scrollHeight;
    }
  }

  function formatMessageHtml(rawText) {
    if (!rawText) return '';
    var div = document.createElement('div');
    div.textContent = rawText;
    var safe = div.innerHTML;
    // Bold **text**
    safe = safe.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    // Italic *text*
    safe = safe.replace(/\*(.*?)\*/g, '<em>$1</em>');
    // Line breaks
    safe = safe.replace(/\n/g, '<br>');
    return safe;
  }

  function renderMessages() {
    if (!chatMessages) return;
    chatMessages.innerHTML = '';

    state.messages.forEach(function (msg, msgIndex) {
      var row = document.createElement('div');
      row.className = 'msg-row ' + (msg.sender === 'customer' ? 'customer' : 'assistant');

      var bubble = document.createElement('div');
      bubble.className = 'msg-bubble';
      bubble.innerHTML = formatMessageHtml(msg.text);

      if (msg.sender === 'customer') {
        bubble.style.backgroundColor = state.themeColor;
      }

      var time = document.createElement('div');
      time.className = 'msg-time';
      time.textContent = formatTime(msg.timestamp);

      row.appendChild(bubble);

      // Render options pills for assistant messages
      var isLatestAssistant =
        msg.sender === 'assistant' && msgIndex === state.messages.length - 1 && !state.isTyping;
      var optsToRender =
        msg.options && msg.options.length > 0
          ? msg.options
          : msgIndex === 0 && state.messages.length === 1
          ? state.quickOptions
          : [];

      if (isLatestAssistant && optsToRender && optsToRender.length > 0) {
        var optionsContainer = document.createElement('div');
        optionsContainer.className = 'msg-options';

        optsToRender.forEach(function (opt) {
          var optBtn = document.createElement('button');
          optBtn.type = 'button';
          var isSomethingElse = opt.toLowerCase().indexOf('something else') !== -1;
          optBtn.className = 'opt-btn' + (isSomethingElse ? ' something-else' : '');
          optBtn.textContent = opt;

          optBtn.addEventListener('click', function () {
            if (isSomethingElse) {
              if (inputEl) {
                inputEl.value = 'I have a specific question: ';
                inputEl.focus();
                updateSendButton();
              }
            } else {
              sendMessage(opt);
            }
          });
          optionsContainer.appendChild(optBtn);
        });
        row.appendChild(optionsContainer);
      }

      row.appendChild(time);
      chatMessages.appendChild(row);
    });

    if (state.isTyping) {
      var typingEl = document.createElement('div');
      typingEl.className = 'typing-indicator';
      typingEl.innerHTML =
        '<span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span>';
      chatMessages.appendChild(typingEl);
    }

    scrollToBottom();
  }

  function addMessage(sender, text, options) {
    var msg = {
      id: 'msg_' + Date.now(),
      sender: sender,
      text: text,
      options: options || undefined,
      timestamp: new Date().toISOString(),
    };
    state.messages.push(msg);
    try {
      localStorage.setItem(msgsKey, JSON.stringify(state.messages));
    } catch (e) {}
    renderMessages();
  }

  // 9. Fetch Live Remote Widget Configuration by Widget ID
  function loadConfig() {
    var configUrl = hostOrigin + '/api/widget/config?widget_id=' + encodeURIComponent(widgetId) + '&_t=' + Date.now();
    
    fetch(configUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      cache: 'no-store',
    })
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(function (data) {
        if (data && data.widget) {
          applyWidgetConfig(data.widget);
        }

        // Restore saved messages or show welcome message
        var saved = null;
        try {
          saved = localStorage.getItem(msgsKey);
        } catch (e) {}

        if (saved) {
          try {
            state.messages = JSON.parse(saved);
          } catch (e) {
            state.messages = [];
          }
        }

        // Check if cached conversation is stale (e.g. from old version with wrong company name or idle >4h)
        var isStale = false;
        if (state.messages.length > 0) {
          var firstMsg = state.messages[0];
          if (firstMsg && firstMsg.sender === 'assistant' && firstMsg.text) {
            if (state.businessName && state.businessName !== 'AI Workforce' && state.businessName !== 'AI Sales Manager' && state.businessName !== 'Alpha') {
              if (firstMsg.text.indexOf('AI Workforce') !== -1 && firstMsg.text.indexOf(state.businessName) === -1) {
                isStale = true;
              }
            }
          }
          var lastMsg = state.messages[state.messages.length - 1];
          if (lastMsg && lastMsg.timestamp) {
            var diffMs = Date.now() - new Date(lastMsg.timestamp).getTime();
            if (diffMs > 4 * 60 * 60 * 1000) {
              isStale = true;
            }
          }
        }

        if (isStale || state.messages.length === 0) {
          state.messages = [];
          try {
            localStorage.removeItem(msgsKey);
          } catch (e) {}
          addMessage('assistant', state.welcomeMessage, state.quickOptions);
        } else {
          // If only the welcome message was stored, keep it fresh with remote welcome message and options
          if (state.messages.length === 1 && state.messages[0].sender === 'assistant') {
            state.messages[0].text = state.welcomeMessage;
            state.messages[0].options = state.quickOptions;
          }
          renderMessages();
        }

        state.loaded = true;
        if (autoOpen) {
          toggleChat(true);
        }
      })
      .catch(function (err) {
        console.warn('Could not load remote widget config, using active settings:', err);
        if (state.messages.length === 0) {
          addMessage('assistant', state.welcomeMessage, state.quickOptions);
        }
        state.loaded = true;
      });
  }

  function rotateConversationId() {
    conversationId = 'conv_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    state.visitorToken = null;
    try {
      sessionStorage.setItem(convKey, conversationId);
      sessionStorage.removeItem(tokenKey);
    } catch (e) {}
  }

  function ensureVisitorToken(forceRefresh) {
    if (state.visitorToken && !forceRefresh) {
      return Promise.resolve({ token: state.visitorToken, fatalError: null });
    }
    return fetch(hostOrigin + '/api/widget/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        widget_id: widgetId,
        conversation_id: conversationId,
        visitor_id: visitorId,
      }),
    })
      .then(function (res) {
        return res
          .json()
          .catch(function () {
            return {};
          })
          .then(function (data) {
            if (!res.ok) {
              if (res.status === 403 && data && data.code === 'UNAUTHORIZED_OWNERSHIP') {
                return { token: null, ownershipConflict: true, fatalError: null };
              }
              if (res.status === 503 || (data && data.code === 'SESSION_SIGNING_UNCONFIGURED')) {
                return { token: null, fatalError: (data && data.error) || 'Session signing unavailable' };
              }
              return { token: null, fatalError: null };
            }
            if (data && data.success && data.token) {
              state.visitorToken = data.token;
              try {
                sessionStorage.setItem(tokenKey, data.token);
              } catch (e) {}
              return { token: data.token, fatalError: null };
            }
            return { token: null, fatalError: null };
          });
      })
      .catch(function () {
        return { token: null, fatalError: null };
      });
  }

  // 10. Send Chat Message over API with synchronous mutex & deterministic client_message_id
  function sendMessage(text) {
    if (!text || !text.trim() || state.isTyping || state.isSending) return;
    state.isSending = true;
    var userText = text.trim();
    var clientMessageId = 'cmsg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);

    addMessage('customer', userText);
    if (inputEl) {
      inputEl.value = '';
      updateSendButton();
    }

    state.isTyping = true;
    renderMessages();

    var historyPayload = state.messages.map(function (m) {
      return { sender: m.sender, text: m.text, timestamp: m.timestamp };
    });

    function postChat(token) {
      var headers = { 'Content-Type': 'application/json' };
      if (token) {
        headers['x-visitor-token'] = token;
      }
      return fetch(hostOrigin + '/api/widget/chat', {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({
          widget_id: widgetId,
          conversation_id: conversationId,
          visitor_id: visitorId,
          visitor_session_token: token || undefined,
          user_id: configuredUserId || undefined,
          lead_id: state.currentLeadId || undefined,
          message: userText,
          client_message_id: clientMessageId,
          message_history: historyPayload,
          existing_profile: state.existingProfile || undefined,
          environment: 'production',
        }),
      });
    }

    ensureVisitorToken(false)
      .then(function (mintRes) {
        if (mintRes && mintRes.ownershipConflict) {
          rotateConversationId();
          return ensureVisitorToken(true);
        }
        return mintRes;
      })
      .then(function (mintRes) {
        if (mintRes && mintRes.fatalError) {
          throw new Error(mintRes.fatalError);
        }
        return postChat(mintRes ? mintRes.token : null);
      })
      .then(function (res) {
        if (res.status === 401 || res.status === 403) {
          return res
            .json()
            .catch(function () {
              return {};
            })
            .then(function (errBody) {
              var code = errBody && errBody.code ? String(errBody.code) : '';
              if (code === 'UNAUTHORIZED_OWNERSHIP') {
                rotateConversationId();
              } else {
                state.visitorToken = null;
              }
              return ensureVisitorToken(true).then(function (freshRes) {
                if (freshRes && freshRes.fatalError) {
                  throw new Error(freshRes.fatalError);
                }
                return postChat(freshRes ? freshRes.token : null);
              });
            });
        }
        return res;
      })
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP error ' + res.status);
        return res.json();
      })
      .then(function (data) {
        state.isTyping = false;
        state.isSending = false;
        if (data && data.visitor_session_token) {
          state.visitorToken = data.visitor_session_token;
          try {
            sessionStorage.setItem(tokenKey, data.visitor_session_token);
          } catch (e) {}
        }
        if (data && data.inquiry_id) {
          state.currentLeadId = data.inquiry_id;
        }
        if (data && data.structured_profile) {
          state.existingProfile = Object.assign({}, state.existingProfile || {}, data.structured_profile);
          try {
            sessionStorage.setItem(profileKey, JSON.stringify(state.existingProfile));
          } catch (e) {}
        }
        if (data && data.reply) {
          addMessage('assistant', data.reply, data.options);
        } else {
          addMessage('assistant', 'I hit a temporary response error. Please try sending your message again.');
        }
      })
      .catch(function (err) {
        console.error('Chat error:', err);
        state.isTyping = false;
        state.isSending = false;
        addMessage(
          'assistant',
          'Could not connect to the assistant right now. Please try sending your message again.'
        );
      });
  }

  if (formEl) {
    formEl.addEventListener('submit', function (e) {
      e.preventDefault();
      if (inputEl) {
        sendMessage(inputEl.value);
      }
    });
  }

  // 11. Mount Widget to Document Body
  function attachWidget() {
    if (!document.getElementById('ai-workforce-widget-host')) {
      document.body.appendChild(hostElement);
      loadConfig();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', attachWidget);
  } else {
    attachWidget();
  }
})();
