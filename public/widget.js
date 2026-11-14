/**
 * AI Workforce — Production Universal Embeddable Widget Loader
 *
 * Embeds the authoritative React CustomerChatWidget application inside an isolated,
 * responsive, and secure iframe with bidirectional communication.
 */
(function () {
  'use strict';

  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (window.__AI_WORKFORCE_WIDGET_LOADED__) return;
  window.__AI_WORKFORCE_WIDGET_LOADED__ = true;

  // 1. Resolve Script Tag & Configuration
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

  var rawWidgetId =
    currentScript &&
    (currentScript.getAttribute('data-widget-id') ||
      currentScript.getAttribute('data-company-id') ||
      currentScript.getAttribute('data-user-id'));
  var widgetId = rawWidgetId ? String(rawWidgetId).trim() : '';

  if (!widgetId) {
    console.error('[AI Workforce] Missing required data-widget-id attribute. Widget initialization aborted.');
    return;
  }

  var initialPosition = (currentScript && currentScript.getAttribute('data-position')) || 'bottom-right';
  var initialColor = (currentScript && currentScript.getAttribute('data-color')) || '#0f172a';
  var autoOpen = currentScript && currentScript.getAttribute('data-auto-open') === 'true';

  var hostOrigin =
    (currentScript && (currentScript.getAttribute('data-api-host') || currentScript.getAttribute('data-host'))) ||
    window.location.origin;
  if (!currentScript || (!currentScript.getAttribute('data-api-host') && !currentScript.getAttribute('data-host'))) {
    if (currentScript && currentScript.src) {
      try {
        var scriptUrl = new URL(currentScript.src);
        hostOrigin = scriptUrl.origin;
      } catch (e) {
        hostOrigin = window.location.origin;
      }
    }
  }

  // 2. Create Host Container
  var container = document.createElement('div');
  container.id = 'ai-workforce-widget-root';
  var isLeft = initialPosition === 'bottom-left';
  container.style.cssText =
    'position:fixed;bottom:20px;' +
    (isLeft ? 'left:20px;' : 'right:20px;') +
    'z-index:2147483647;display:flex;flex-direction:column;' +
    (isLeft ? 'align-items:flex-start;' : 'align-items:flex-end;') +
    'gap:12px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;';

  // 3. Create IFrame
  var iframe = document.createElement('iframe');
  iframe.id = 'ai-workforce-chat-frame';
  iframe.title = 'Customer Chat Widget';
  iframe.allow = 'microphone; autoplay; clipboard-write';
  var embedUrl = hostOrigin + '/embed/chat?widget_id=' + encodeURIComponent(widgetId) + '&v=' + Date.now();
  iframe.src = embedUrl;

  var isMobile = window.innerWidth <= 480;
  var desktopStyle =
    'border:none;width:380px;height:620px;max-width:calc(100vw - 32px);max-height:calc(100vh - 100px);border-radius:20px;box-shadow:0 14px 40px rgba(0,0,0,0.25);display:none;background:transparent;overflow:hidden;transition:transform 0.2s cubic-bezier(0.16,1,0.3,1),opacity 0.2s ease;';
  var mobileStyle =
    'border:none;position:fixed;bottom:85px;' +
    (isLeft ? 'left:12px;' : 'right:12px;') +
    'width:calc(100vw - 24px);height:min(580px,calc(100dvh - 100px));max-width:400px;max-height:600px;border-radius:20px;box-shadow:0 14px 40px rgba(0,0,0,0.3);display:none;background:transparent;overflow:hidden;z-index:2147483647;';

  iframe.style.cssText = isMobile ? mobileStyle : desktopStyle;

  // 4. Create Launcher Button
  var button = document.createElement('button');
  button.id = 'ai-workforce-launcher-btn';
  button.setAttribute('aria-label', 'Open AI Sales Manager');
  button.style.cssText =
    'width:58px;height:58px;border-radius:50%;background:' +
    initialColor +
    ';color:#ffffff;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 8px 28px rgba(0,0,0,0.28);transition:transform 0.2s cubic-bezier(0.34,1.56,0.64,1),box-shadow 0.2s ease;outline:none;user-select:none;margin-top:auto;';

  var SVG_CHAT =
    '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';
  var SVG_CLOSE =
    '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';

  button.innerHTML = SVG_CHAT;

  var isOpen = false;

  function toggleOpen(forceState) {
    isOpen = typeof forceState === 'boolean' ? forceState : !isOpen;
    if (isOpen) {
      iframe.style.display = 'block';
      button.innerHTML = SVG_CLOSE;
      if (isMobile) {
        button.style.display = 'none';
      }
    } else {
      iframe.style.display = 'none';
      button.innerHTML = SVG_CHAT;
      if (isMobile) {
        button.style.display = 'flex';
      }
    }
  }

  button.onclick = function () {
    toggleOpen();
  };

  button.onmouseenter = function () {
    button.style.transform = 'scale(1.08)';
  };
  button.onmouseleave = function () {
    button.style.transform = 'scale(1)';
  };

  // 5. Handle PostMessage Events from Embed Frame (origin-checked)
  window.addEventListener('message', function (event) {
    if (!event.data || (hostOrigin && event.origin !== hostOrigin)) return;
    if (event.data.type === 'AI_WORKFORCE_CLOSE_CHAT' || event.data.type === 'CLOSE_WIDGET') {
      toggleOpen(false);
    }
    if (event.data.type === 'AI_WORKFORCE_OPEN_CHAT' || event.data.type === 'OPEN_WIDGET') {
      toggleOpen(true);
    }
  });

  // Handle Resize for Responsive Switching
  window.addEventListener('resize', function () {
    isMobile = window.innerWidth <= 480;
    if (!isOpen) {
      iframe.style.cssText = isMobile ? mobileStyle : desktopStyle;
    } else {
      iframe.style.cssText = (isMobile ? mobileStyle : desktopStyle) + 'display:block;';
      if (isMobile) {
        button.style.display = 'none';
      } else {
        button.style.display = 'flex';
      }
    }
  });

  // 6. Fetch live widget configuration to update button styling & position
  fetch(hostOrigin + '/api/widget/config?widget_id=' + encodeURIComponent(widgetId) + '&_t=' + Date.now())
    .then(function (res) {
      if (!res.ok) return null;
      return res.json();
    })
    .then(function (data) {
      if (!data) return;
      var cfg = data.widget ? data.widget : data;
      if (cfg) {
        if (cfg.is_active === false) {
          container.style.display = 'none';
          return;
        }
        if (cfg.theme_color || cfg.primaryColor) {
          button.style.background = cfg.theme_color || cfg.primaryColor;
        }
        if (cfg.position === 'bottom-left') {
          container.style.left = '20px';
          container.style.right = 'auto';
          container.style.alignItems = 'flex-start';
        } else if (cfg.position === 'bottom-right') {
          container.style.right = '20px';
          container.style.left = 'auto';
          container.style.alignItems = 'flex-end';
        }
      }
    })
    .catch(function () {});

  container.appendChild(iframe);
  container.appendChild(button);

  function mount() {
    if (!document.getElementById('ai-workforce-widget-root')) {
      document.body.appendChild(container);
      if (autoOpen) {
        toggleOpen(true);
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})();
