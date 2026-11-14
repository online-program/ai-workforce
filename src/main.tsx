import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { StandaloneEmbedChat } from './components/StandaloneEmbedChat.tsx';
import { AuthProvider } from './context/AuthContext.tsx';
import { ThemeProvider } from './context/ThemeContext.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import './index.css';

const isEmbedChat =
  typeof window !== 'undefined' &&
  (window.location.pathname.startsWith('/embed') ||
   window.location.pathname.startsWith('/chat-widget') ||
   window.location.pathname.startsWith('/standalone-embed'));

try {
  const rootElement = document.getElementById('root');
  if (rootElement) {
    createRoot(rootElement).render(
      <StrictMode>
        <ErrorBoundary>
          <ThemeProvider>
            {isEmbedChat ? (
              <StandaloneEmbedChat />
            ) : (
              <AuthProvider>
                <App />
              </AuthProvider>
            )}
          </ThemeProvider>
        </ErrorBoundary>
      </StrictMode>,
    );
  } else {
    console.error('Critical mounting error: #root element not found in DOM.');
  }
} catch (err) {
  console.error('Critical AI Workforce initialization exception:', err);
  const rootEl = document.getElementById('root');
  if (rootEl) {
    rootEl.innerHTML = `
      <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:#ffffff;color:#0f172a;font-family:Plus Jakarta Sans,sans-serif;padding:24px;">
        <div style="max-width:420px;text-align:center;space-y:16px;">
          <h2 style="font-size:24px;font-weight:800;margin-bottom:8px;">AI Workforce Recovery</h2>
          <p style="font-size:14px;color:#64748b;margin-bottom:20px;line-height:1.5;">An unexpected startup exception was caught. Your workspace data, inquiries, and Company Brain remain completely secure.</p>
          <button onclick="window.location.reload()" style="background:#000000;color:#ffffff;font-weight:700;padding:12px 24px;border-radius:12px;border:none;cursor:pointer;font-size:13px;">Reload Workspace</button>
        </div>
      </div>
    `;
  }
}

