import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { analyzeInquiry, fallbackRuleBasedAnalysis } from './src/server/analyzeHandler.ts';
import {
  resolvePublicWidget,
  handleWidgetChat,
  handleWidgetChatStream,
  savePublicWidgetConfig,
  generateInitialQuickOptions,
  getUserWidgetConfig,
  getStoredConversationOwner,
  getStoredConversationFromMemory,
  ackStoredConversationMessagesInMemory,
  conversationMemoryStore,
  buildConversationMemoryKey,
} from './src/server/widgetHandler.ts';
import { runFullSafetyTestSuite, ALL_38_TEST_CASES, executeTestCase } from './src/server/testSuiteEngine.ts';
import { validateEmailAddress, dispatchEmailViaProvider } from './src/server/emailService.ts';
import { adminRouter } from './src/server/adminApiRouter.ts';
import { experienceRouter } from './src/server/experienceHandler.ts';
import { getAdminDb, hasAdminCredentials, probeAdminFirestore } from './src/server/firebaseAdmin.ts';
import {
  getAuthoritativeUserRole,
  initializeAdminStore,
  requireAdminRole,
  requireAuthenticatedUser,
  requireTenantOwner,
  verifyFirebaseIdToken,
  checkRateLimit,
  AuthenticatedAdminRequest,
  AuthenticatedUserRequest,
} from './src/server/adminAuth.ts';
import { trackVisitorSession, recordLatency } from './src/server/analyticsService.ts';
import { recordSystemError, recordLiveActivity } from './src/server/adminAuditService.ts';
import { extractCompanyBrainFromWebsite } from './src/server/websiteExtractor.ts';
import {
  saveYouTubeOAuthTokens,
  consumeYouTubeOAuthState,
  getConfiguredYouTubeOAuthCredentials,
} from './src/server/marketingService.ts';
import { getProviderCapabilities, getModelTelemetry, DEFAULT_MODEL_ROUTES } from './src/server/modelRouter.ts';
import { approveAndSendEnquiryReply } from './src/server/enquiryWorkflowService.ts';
import { buildPublicSummary, isReservedOfficialWidgetId, stripPrivateFieldsFromWidget } from './src/server/platformConfig.ts';
import crypto from 'crypto';
import {
  issueVisitorSessionToken,
  verifyVisitorSessionToken,
  isVisitorSessionSecretConfigured,
  ensureClusterVisitorSessionSecret,
  getVisitorSessionSecretStatus,
} from './src/server/visitorSessionService.ts';
import { acceptHumanHandoff, sendHumanHandoffReply, returnControlToAlpha } from './src/server/durableHandoffService.ts';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = process.cwd();
const SAFE_MEDIA_FILENAME_REGEX = /^[a-zA-Z0-9._-]+$/;

async function startServer() {
  const app = express();
  app.set('trust proxy', 1);
  const PORT = Number(process.env.PORT) || 3000;

  // Initialize Admin Role Store & Bootstrap accounts
  await initializeAdminStore().catch((err) => console.warn('Admin store initialization notice:', err));

  // Hydrate shared cluster signing key from Admin Firestore if production env var wasn't injected
  if (process.env.NODE_ENV === 'production' && !isVisitorSessionSecretConfigured() && hasAdminCredentials()) {
    await ensureClusterVisitorSessionSecret(getAdminDb()).catch(() => false);
  }

  // Start notification worker
  setInterval(async () => {
    const { runNotificationWorker } = await import('./src/server/notificationWorker.ts');
    await runNotificationWorker();
  }, 5 * 60 * 1000);

  // Startup check for production signing secret
  if (process.env.NODE_ENV === 'production' && !isVisitorSessionSecretConfigured()) {
    console.error('[SECURITY CRITICAL] VISITOR_SESSION_SECRET (or SESSION_SECRET) is missing or < 32 chars in production and cluster Firestore secret is unavailable. Readiness check and widget session/chat endpoints will fail closed (503).');
  }

  // Security: Apply robust production HTTP security headers
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    if (!req.path.startsWith('/embed') && !req.path.startsWith('/widget') && !req.path.startsWith('/chat-widget') && !req.path.startsWith('/media')) {
      res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    }
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    next();
  });

  // Enable JSON body parsing with strict size limits
  app.use(express.json({ limit: '1mb' }));

  // Reliability: Request Correlation ID & Timeout Protection & Structured Logging
  app.use((req, res, next) => {
    const requestId = (req.headers['x-request-id'] as string) || `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    res.setHeader('X-Request-ID', requestId);
    (req as any).id = requestId;

    const startTime = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      if (res.statusCode >= 400 || duration > 2000) {
        console.log(`[HTTP] id=${requestId} method=${req.method} url=${req.originalUrl} status=${res.statusCode} duration=${duration}ms`);
      }
    });

    // Request Timeout Protection (25s) - cleared on finish/close
    const timeoutId = setTimeout(() => {
      if (!res.headersSent && !res.writableEnded) {
        res.status(504).json({ error: 'Gateway Timeout: Request took too long to process.', requestId });
      }
    }, 25000);

    res.on('finish', () => clearTimeout(timeoutId));
    res.on('close', () => clearTimeout(timeoutId));

    next();
  });

  // Robust HTTP Range-compliant streaming for video MP4 assets in /public/media
  app.get('/media/:filename', (req, res, next) => {
    const requestedName = String(req.params.filename || '');
    if (!SAFE_MEDIA_FILENAME_REGEX.test(requestedName) || requestedName.includes('..') || requestedName.startsWith('.')) {
      return res.status(400).json({ error: 'Invalid media filename' });
    }

    const mediaDir = path.resolve(process.cwd(), 'public', 'media');
    const resolvedPath = path.resolve(mediaDir, requestedName);
    if (!resolvedPath.startsWith(mediaDir + path.sep)) {
      return res.status(403).json({ error: 'Forbidden media path' });
    }
    if (!fs.existsSync(resolvedPath)) {
      return next();
    }

    try {
      const stat = fs.statSync(resolvedPath);
      if (!stat.isFile() || stat.size === 0) {
        return res.status(404).end();
      }
      const fileSize = stat.size;
      const range = req.headers.range;

      res.setHeader('Content-Type', 'video/mp4');
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Cache-Control', 'public, max-age=86400');

      if (range) {
        const match = /^bytes=(\d*)-(\d*)$/.exec(String(range).trim());
        if (!match) {
          res.setHeader('Content-Range', `bytes */${fileSize}`);
          return res.status(416).send('Requested Range Not Satisfiable');
        }
        const start = match[1] ? parseInt(match[1], 10) : 0;
        const end = match[2] ? parseInt(match[2], 10) : fileSize - 1;

        if (isNaN(start) || isNaN(end) || start < 0 || start >= fileSize || end >= fileSize || start > end) {
          res.setHeader('Content-Range', `bytes */${fileSize}`);
          return res.status(416).send('Requested Range Not Satisfiable');
        }

        const chunksize = (end - start) + 1;
        const file = fs.createReadStream(resolvedPath, { start, end });
        res.writeHead(206, {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunksize,
          'Content-Type': 'video/mp4',
        });
        file.pipe(res);
      } else {
        res.setHeader('Content-Length', fileSize);
        fs.createReadStream(resolvedPath).pipe(res);
      }
    } catch (err) {
      console.error('Error streaming media file:', err);
      if (!res.headersSent) {
        res.status(500).end();
      }
    }
  });

  // Helper to set public CORS headers on widget endpoints
  const setPublicWidgetCors = (res: express.Response) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, x-admin-token, x-visitor-token, x-consent-analytics, x-visitor-id');
  };

  // Mount Admin API & Experience Mode Routers
  app.use('/api/admin', adminRouter);
  app.use('/api/experience', experienceRouter);

  // Public Widget JavaScript file loader
  const serveWidgetJs = (req: express.Request, res: express.Response) => {
    setPublicWidgetCors(res);
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

    // Check possible paths for widget.js (dist, public, root)
    const candidatePaths = [
      path.join(__dirname, 'public', 'widget.js'),
      path.join(__dirname, 'dist', 'widget.js'),
      path.join(process.cwd(), 'public', 'widget.js'),
      path.join(process.cwd(), 'dist', 'widget.js'),
      path.join(__dirname, 'widget.js'),
    ];

    for (const p of candidatePaths) {
      if (fs.existsSync(p)) {
        const fileContent = fs.readFileSync(p, 'utf8');
        return res.status(200).send(fileContent);
      }
    }

    // Fallback inline script if file read fails
    res.status(200).send(`
(function() {
  if (window.__AI_WORKFORCE_WIDGET_LOADED__) return;
  window.__AI_WORKFORCE_WIDGET_LOADED__ = true;
  var currentScript = document.currentScript;
  var rawId = currentScript && (currentScript.getAttribute('data-widget-id') || currentScript.getAttribute('data-company-id') || currentScript.getAttribute('data-user-id'));
  var widgetId = rawId ? String(rawId).trim() : '';
  if (!widgetId) { console.error('[AI Workforce] Missing required data-widget-id attribute.'); return; }
  var hostOrigin = (currentScript && currentScript.src) ? new URL(currentScript.src).origin : window.location.origin;
  var container = document.createElement('div');
  container.id = 'ai-workforce-widget-root';
  container.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:2147483647;';
  var iframe = document.createElement('iframe');
  iframe.id = 'ai-workforce-chat-frame';
  iframe.src = hostOrigin + '/embed/chat?widget_id=' + encodeURIComponent(widgetId) + '&v=' + Date.now();
  iframe.style.cssText = 'border:none;width:380px;height:600px;max-width:calc(100vw - 24px);max-height:calc(100vh - 100px);border-radius:18px;box-shadow:0 12px 40px rgba(0,0,0,0.22);display:none;background:transparent;overflow:hidden;';
  var button = document.createElement('button');
  button.style.cssText = 'width:58px;height:58px;border-radius:50%;background:#0f172a;color:#fff;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 6px 24px rgba(0,0,0,0.25);margin-left:auto;margin-top:10px;';
  button.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';
  var open = false;
  button.onclick = function() {
    open = !open;
    iframe.style.display = open ? 'block' : 'none';
  };
  container.appendChild(iframe);
  container.appendChild(button);
  document.body.appendChild(container);
})();
    `);
  };

  app.get('/api/health', (req, res) => {
    const signingStatus = getVisitorSessionSecretStatus();
    res.json({
      status: 'ok',
      service: 'AI Workforce',
      node_env: process.env.NODE_ENV || 'development',
      revision: process.env.K_REVISION || null,
      session_signing: signingStatus.source,
      session_key_fingerprint: signingStatus.fingerprintPrefix,
      time: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });

  app.get('/api/readiness', async (req, res) => {
    const time = new Date().toISOString();
    const signingStatus = getVisitorSessionSecretStatus();
    if (process.env.NODE_ENV === 'production' && !isVisitorSessionSecretConfigured()) {
      return res.status(503).json({
        status: 'not_ready',
        node_env: process.env.NODE_ENV,
        revision: process.env.K_REVISION || null,
        session_signing: signingStatus.source,
        error: 'VISITOR_SESSION_SECRET (or SESSION_SECRET) is missing in production and shared Firestore signing key could not be hydrated.',
        time,
      });
    }
    if (!hasAdminCredentials()) {
      return res.status(503).json({
        status: 'not_ready',
        node_env: process.env.NODE_ENV || 'development',
        database: 'unavailable',
        session_signing: signingStatus.source,
        session_key_fingerprint: signingStatus.fingerprintPrefix,
        error: 'Firebase Admin credentials are not configured.',
        time,
      });
    }
    const probe = await probeAdminFirestore(2500);
    if (!probe.ok) {
      return res.status(503).json({
        status: 'not_ready',
        node_env: process.env.NODE_ENV || 'development',
        database: 'disconnected',
        session_signing: signingStatus.source,
        session_key_fingerprint: signingStatus.fingerprintPrefix,
        latencyMs: probe.latencyMs,
        error: probe.error || 'Firestore readiness probe failed.',
        time,
      });
    }
    return res.json({
      status: 'ready',
      node_env: process.env.NODE_ENV || 'development',
      revision: process.env.K_REVISION || null,
      database: 'connected',
      session_signing: signingStatus.source,
      session_key_fingerprint: signingStatus.fingerprintPrefix,
      latencyMs: probe.latencyMs,
      time,
    });
  });

  app.get('/healthz', (req, res) => {
    res.status(200).send('OK');
  });

  // Multi-Model Router Capabilities & Telemetry API
  app.get('/api/model-router/status', (req, res) => {
    res.json({
      success: true,
      routes: DEFAULT_MODEL_ROUTES,
      providers: getProviderCapabilities(),
      recentTelemetry: getModelTelemetry().slice(0, 20),
    });
  });

  // OAuth 2.0 Redirect Callback (Google Cloud / YouTube Integration)
  app.get('/auth/callback', async (req, res) => {
    const code = req.query.code as string;
    const state = req.query.state as string;
    const error = req.query.error as string;
    if (error) {
      console.warn('OAuth authorization error:', error);
      return res.redirect(`/?tab=marketing&oauth_error=${encodeURIComponent(error)}`);
    }
    if (!code || !state) {
      return res.redirect('/?tab=marketing&oauth_error=missing_code_or_state');
    }

    try {
      const consumedState = await consumeYouTubeOAuthState(state);
      if (!consumedState) {
        return res.redirect('/?tab=marketing&oauth_error=invalid_or_expired_oauth_state');
      }

      const actorRole = await getAuthoritativeUserRole(consumedState.uid);
      if (actorRole === 'USER') {
        return res.redirect('/?tab=marketing&oauth_error=unauthorized_oauth_session');
      }

      const { clientId, clientSecret, redirectUri: configuredRedirect } = getConfiguredYouTubeOAuthCredentials();
      const redirectUri = consumedState.redirectUri || configuredRedirect;

      if (!clientId || !clientSecret || !redirectUri) {
        return res.redirect('/?tab=marketing&oauth_error=oauth_not_configured');
      }

      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
        }),
      });

      const tokenData = await tokenRes.json();
      if (!tokenRes.ok || !tokenData.access_token) {
        return res.redirect(`/?tab=marketing&oauth_error=${encodeURIComponent(tokenData.error_description || tokenData.error || 'Token exchange failed')}`);
      }

      // Fetch real connected YouTube channel metadata using verified access token
      let channelTitle: string | undefined;
      let channelId: string | undefined;
      let channelUrl: string | undefined;
      try {
        const ytRes = await fetch('https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true', {
          headers: { Authorization: `Bearer ${tokenData.access_token}` },
        });
        if (ytRes.ok) {
          const ytData: any = await ytRes.json();
          const first = Array.isArray(ytData?.items) ? ytData.items[0] : null;
          if (first?.id) {
            channelId = first.id;
            channelTitle = first.snippet?.title || `YouTube Channel (${first.id})`;
            channelUrl = first.snippet?.customUrl
              ? `https://youtube.com/${first.snippet.customUrl}`
              : `https://youtube.com/channel/${first.id}`;
          }
        }
      } catch (chanErr: any) {
        console.warn('[OAuth] YouTube channel metadata lookup notice:', chanErr?.message || chanErr);
      }

      await saveYouTubeOAuthTokens({
        refreshToken: tokenData.refresh_token,
        accessToken: tokenData.access_token,
        channelId,
        channelTitle: channelTitle || 'Connected YouTube Channel',
        channelUrl,
      });

      return res.redirect('/?tab=marketing&oauth_success=youtube');
    } catch (err: any) {
      console.error('Error handling /auth/callback:', err?.message || err);
      return res.redirect(`/?tab=marketing&oauth_error=${encodeURIComponent(err.message || 'OAuth handling failed')}`);
    }
  });

  const serveChatWidgetJs = (req: express.Request, res: express.Response) => {
    setPublicWidgetCors(res);
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

    const candidatePaths = [
      path.join(__dirname, 'public', 'chat-widget.js'),
      path.join(__dirname, 'dist', 'chat-widget.js'),
      path.join(process.cwd(), 'public', 'chat-widget.js'),
      path.join(process.cwd(), 'dist', 'chat-widget.js'),
    ];

    for (const p of candidatePaths) {
      if (fs.existsSync(p)) {
        const fileContent = fs.readFileSync(p, 'utf8');
        return res.status(200).send(fileContent);
      }
    }

    return serveWidgetJs(req, res);
  };

  app.get('/widget.js', serveWidgetJs);
  app.get('/chat-widget.js', serveChatWidgetJs);

  // Issue or refresh a scoped visitor-session token
  app.post('/api/widget/session', async (req, res) => {
    setPublicWidgetCors(res);
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    try {
      const { widget_id, conversation_id, visitor_id } = req.body || {};
      if (!widget_id || !conversation_id || !visitor_id) {
        return res.status(400).json({ success: false, error: 'widget_id, conversation_id, and visitor_id are required' });
      }

      const widgetConfig = await resolvePublicWidget(String(widget_id));
      if (!widgetConfig) {
        return res.status(404).json({ success: false, error: 'Widget not found' });
      }
      if (widgetConfig.is_active === false) {
        return res.status(403).json({ success: false, error: 'Widget is currently inactive' });
      }

      const tenantId = widgetConfig.user_id || widgetConfig.widget_id;
      if (!tenantId) {
        return res.status(404).json({ success: false, error: 'Tenant not resolved for widget' });
      }

      const memOwner = getStoredConversationOwner(tenantId, String(conversation_id));
      if (memOwner && memOwner !== String(visitor_id)) {
        return res.status(403).json({ success: false, error: 'Forbidden: Conversation belongs to another visitor', code: 'UNAUTHORIZED_OWNERSHIP' });
      }

      if (hasAdminCredentials()) {
        try {
          const convSnap = await getAdminDb()
            .collection('users')
            .doc(tenantId)
            .collection('conversations')
            .doc(String(conversation_id))
            .get();

          if (convSnap.exists) {
            const convData = convSnap.data() || {};
            if (convData.visitor_id && convData.visitor_id !== String(visitor_id)) {
              return res.status(403).json({ success: false, error: 'Forbidden: Conversation belongs to another visitor', code: 'UNAUTHORIZED_OWNERSHIP' });
            }
          }
        } catch (dbErr: any) {
          if (dbErr?.code !== 7 && !String(dbErr?.message || '').includes('PERMISSION_DENIED')) {
            throw dbErr;
          }
        }
      }

      if (process.env.NODE_ENV === 'production' && !isVisitorSessionSecretConfigured()) {
        return res.status(503).json({
          success: false,
          error: 'Visitor session signing is not configured on this server.',
          code: 'SESSION_SIGNING_UNCONFIGURED',
        });
      }

      const token = issueVisitorSessionToken({
        tenant_id: tenantId,
        widget_id: widgetConfig.widget_id,
        visitor_id: String(visitor_id),
        conversation_id: String(conversation_id),
      });

      return res.json({ success: true, token, visitor_session_token: token });
    } catch (err: any) {
      console.error('Error in POST /api/widget/session:', err);
      return res.status(503).json({
        success: false,
        error: 'Failed to validate conversation or issue visitor session',
        code: 'SESSION_SIGNING_UNCONFIGURED',
      });
    }
  });

  // Secure visitor conversation synchronization API (requires valid scoped visitor-session token)
  app.get('/api/widget/conversation', async (req, res) => {
    setPublicWidgetCors(res);
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    try {
      const widgetId = (req.query.widget_id as string) || '';
      const conversationId = (req.query.conversation_id as string) || '';
      const visitorId = (req.query.visitor_id as string) || '';

      if (!widgetId || !conversationId || !visitorId) {
        return res.status(400).json({ success: false, error: 'widget_id, conversation_id, and visitor_id are required' });
      }

      const authHeader = (req.headers.authorization as string) || '';
      const rawToken = authHeader.startsWith('Bearer ')
        ? authHeader.slice(7).trim()
        : ((req.headers['x-visitor-token'] as string) || (req.query.token as string) || '');

      const widgetConfig = await resolvePublicWidget(widgetId);
      if (!widgetConfig) {
        return res.status(404).json({ success: false, error: 'Widget not found' });
      }

      const tenantId = widgetConfig.user_id || widgetConfig.widget_id;
      if (!tenantId) {
        return res.status(404).json({ success: false, error: 'Tenant not resolved for widget' });
      }

      const verification = verifyVisitorSessionToken(rawToken, {
        tenant_id: tenantId,
        widget_id: widgetConfig.widget_id,
        visitor_id: visitorId,
        conversation_id: conversationId,
      });

      if (!verification.valid) {
        const statusCode = verification.code === 'TOKEN_MISSING' || verification.code === 'TOKEN_EXPIRED' ? 401 : 403;
        return res.status(statusCode).json({
          success: false,
          error: verification.error || 'Unauthorized visitor session',
          code: verification.code,
        });
      }

      let firestoreFound = false;
      let convData: any = null;
      let dbConfirmed = false;

      if (hasAdminCredentials()) {
        try {
          const convSnap = await getAdminDb()
            .collection('users')
            .doc(tenantId)
            .collection('conversations')
            .doc(conversationId)
            .get();
          if (convSnap.exists) {
            firestoreFound = true;
            convData = convSnap.data() || {};
          }
          dbConfirmed = true;
        } catch (dbErr: any) {
          const msg = String(dbErr?.message || '');
          const isPermissionOrUnavail =
            dbErr?.code === 7 ||
            dbErr?.code === 14 ||
            msg.includes('PERMISSION_DENIED') ||
            msg.includes('UNAVAILABLE');
          if (!isPermissionOrUnavail) {
            throw dbErr;
          }
        }
      }

      if (!firestoreFound) {
        const memConv = getStoredConversationFromMemory(tenantId, conversationId);
        if (memConv) {
          convData = memConv;
        }
      }

      if (!convData) {
        return res.json({ success: true, messages: [], status: 'New', db_confirmed: dbConfirmed });
      }

      if (convData.visitor_id && convData.visitor_id !== verification.payload!.visitor_id) {
        return res.status(403).json({ success: false, error: 'Forbidden: Visitor ownership mismatch', code: 'UNAUTHORIZED_OWNERSHIP' });
      }

      return res.json({
        success: true,
        messages: Array.isArray(convData.messages) ? convData.messages : [],
        status: convData.status || 'Active',
        db_confirmed: dbConfirmed,
        updated_at: convData.updated_at || new Date().toISOString(),
      });
    } catch (err: any) {
      console.error('Error in GET /api/widget/conversation:', err);
      return res.status(500).json({ success: false, error: err?.message || 'Failed to sync conversation' });
    }
  });

  // Visitor delivery & read acknowledgement endpoint
  app.post('/api/widget/conversation/ack', async (req, res) => {
    setPublicWidgetCors(res);
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    try {
      const { widget_id, conversation_id, visitor_id, type, message_ids } = req.body || {};
      if (!widget_id || !conversation_id || !visitor_id || !Array.isArray(message_ids) || (type !== 'delivered' && type !== 'read')) {
        return res.status(400).json({ success: false, error: 'widget_id, conversation_id, visitor_id, type (delivered|read), and message_ids[] are required' });
      }

      const authHeader = (req.headers.authorization as string) || '';
      const rawToken = authHeader.startsWith('Bearer ')
        ? authHeader.slice(7).trim()
        : ((req.headers['x-visitor-token'] as string) || (req.body?.token as string) || '');

      const widgetConfig = await resolvePublicWidget(String(widget_id));
      if (!widgetConfig) {
        return res.status(404).json({ success: false, error: 'Widget not found' });
      }

      const tenantId = widgetConfig.user_id || widgetConfig.widget_id;
      if (!tenantId) {
        return res.status(404).json({ success: false, error: 'Tenant not resolved for widget' });
      }

      const verification = verifyVisitorSessionToken(rawToken, {
        tenant_id: tenantId,
        widget_id: widgetConfig.widget_id,
        visitor_id: String(visitor_id),
        conversation_id: String(conversation_id),
      });

      if (!verification.valid) {
        const statusCode = verification.code === 'TOKEN_MISSING' || verification.code === 'TOKEN_EXPIRED' ? 401 : 403;
        return res.status(statusCode).json({ success: false, error: verification.error, code: verification.code });
      }

      // Always keep memory store updated as fast cache / fallback
      const memAck = ackStoredConversationMessagesInMemory(
        tenantId,
        String(conversation_id),
        verification.payload!.visitor_id,
        type,
        message_ids.map((id: any) => String(id))
      );

      if (!memAck.ownershipOk) {
        return res.status(403).json({ success: false, error: 'Forbidden: Visitor ownership mismatch', code: 'UNAUTHORIZED_OWNERSHIP' });
      }

      let firestoreFound = false;
      let dbConfirmed = false;
      let updatedCount = memAck.updatedCount;

      if (hasAdminCredentials()) {
        try {
          const convRef = getAdminDb().collection('users').doc(tenantId).collection('conversations').doc(String(conversation_id));
          const convSnap = await convRef.get();
          if (convSnap.exists) {
            firestoreFound = true;
            const convData = convSnap.data() || {};
            if (convData.visitor_id && convData.visitor_id !== verification.payload!.visitor_id) {
              return res.status(403).json({ success: false, error: 'Forbidden: Visitor ownership mismatch', code: 'UNAUTHORIZED_OWNERSHIP' });
            }

            const targetIds = new Set(message_ids.map((id: any) => String(id)));
            const now = new Date().toISOString();
            let fsUpdatedCount = 0;

            const existingMessages = Array.isArray(convData.messages) ? convData.messages : [];
            const updatedMessages = existingMessages.map((m: any) => {
              if (!m.message_id || !targetIds.has(String(m.message_id))) return m;
              const meta = { ...(m.metadata || {}) };
              let changed = false;

              if (type === 'delivered' && !meta.delivered) {
                meta.delivered = true;
                meta.delivered_at = meta.delivered_at || now;
                changed = true;
              }
              if (type === 'read') {
                if (!meta.delivered) {
                  meta.delivered = true;
                  meta.delivered_at = meta.delivered_at || now;
                  changed = true;
                }
                if (!meta.read) {
                  meta.read = true;
                  meta.read_at = meta.read_at || now;
                  changed = true;
                }
              }

              if (changed) {
                fsUpdatedCount++;
                return { ...m, metadata: meta };
              }
              return m;
            });

            if (fsUpdatedCount > 0) {
              await convRef.set({ messages: updatedMessages, updated_at: now }, { merge: true });
            }
            updatedCount = fsUpdatedCount;
            dbConfirmed = true;
          }
        } catch (dbErr: any) {
          const msg = String(dbErr?.message || '');
          const isPermissionOrUnavail =
            dbErr?.code === 7 ||
            dbErr?.code === 14 ||
            msg.includes('PERMISSION_DENIED') ||
            msg.includes('UNAVAILABLE');
          if (!isPermissionOrUnavail) {
            throw dbErr;
          }
        }
      }

      if (!firestoreFound && !memAck.found) {
        return res.status(404).json({ success: false, error: 'Conversation not found' });
      }

      return res.json({ success: true, updated_count: updatedCount, type, db_confirmed: dbConfirmed });
    } catch (err: any) {
      console.error('Error in POST /api/widget/conversation/ack:', err);
      return res.status(500).json({ success: false, error: err?.message || 'Failed to acknowledge messages' });
    }
  });

  // Public Widget Config & Bootstrap API (Projection ONLY — never exposes private Company Brain or internal fields)
  app.get('/api/widget/config', async (req, res) => {
    const startTime = Date.now();
    setPublicWidgetCors(res);
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    try {
      const widgetId = typeof req.query.widget_id === 'string' ? req.query.widget_id.trim() : '';
      if (!widgetId) {
        return res.status(400).json({ success: false, error: 'widget_id is required' });
      }

      const config = await resolvePublicWidget(widgetId);
      if (!config) {
        return res.status(404).json({ success: false, error: 'Widget not found' });
      }

      const quickOptions = config.quick_options || generateInitialQuickOptions(config.company_profile);
      const analyticsConsent = req.headers['x-consent-analytics'] === '1';

      if (analyticsConsent) {
        const visitorId = (req.query.visitor_id as string) || (req.headers['x-visitor-id'] as string) || `vis_${widgetId}_anon`;
        trackVisitorSession({
          visitorId,
          widgetId: config.widget_id,
          tenantId: config.user_id,
          companyName: config.business_name,
          userAgent: req.headers['user-agent'],
          action: 'LOAD',
          analyticsConsented: true,
        });
      }

      recordLatency(Date.now() - startTime);

      const safeWidgetProjection = stripPrivateFieldsFromWidget(
        {
          ...config,
          design_style: config.design_style || 'attractive_3d',
          quick_options: quickOptions,
        },
        { includeUserId: false }
      );
      const publicSummary = buildPublicSummary(config.company_profile, config.business_name);

      res.json({
        success: true,
        widget: safeWidgetProjection,
        company_profile: publicSummary,
      });
    } catch (err: any) {
      console.error('Error in /api/widget/config:', err);
      recordSystemError({
        service: 'WIDGET',
        severity: 'ERROR',
        endpoint: '/api/widget/config',
        message: err?.message || 'Failed to load widget config',
        stack: err?.stack,
      });
      res.status(500).json({ error: 'Failed to load widget config' });
    }
  });

  // Update / Save Widget Config API (Protected: requires authenticated tenant owner or platform admin)
  app.post('/api/widget/config', requireAuthenticatedUser(), async (req: AuthenticatedUserRequest, res) => {
    try {
      const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
      const rate = checkRateLimit(`widget_config_save:${req.userContext?.uid || clientIp}`, 30, 60);
      if (!rate.allowed) {
        return res.status(429).json({ error: 'Too many widget update requests. Please wait before retrying.', retryAfter: rate.retryAfter });
      }
      const body = req.body || {};
      const { widget_id } = body;
      if (!widget_id || typeof widget_id !== 'string' || !widget_id.trim()) {
        return res.status(400).json({ error: 'widget_id is required' });
      }

      const cleanWidgetId = widget_id.trim();
      const authUser = req.userContext!;
      const callerIsPlatformAdmin = authUser.role === 'CEO' || authUser.role === 'SUPER_ADMIN';

      if (isReservedOfficialWidgetId(cleanWidgetId) && !callerIsPlatformAdmin) {
        return res.status(403).json({
          error: 'Forbidden: Official platform widget configuration is restricted to platform administrators.',
          code: 'FORBIDDEN_OFFICIAL_WIDGET',
        });
      }

      // Fail-closed ownership verification
      const existing = await resolvePublicWidget(cleanWidgetId);
      if (existing && existing.user_id && existing.user_id !== authUser.uid && !callerIsPlatformAdmin) {
        return res.status(403).json({
          error: 'Forbidden: You do not have permission to modify this widget.',
          code: 'FORBIDDEN_CROSS_TENANT',
        });
      }

      const saved = await savePublicWidgetConfig(
        {
          ...body,
          widget_id: cleanWidgetId,
          user_id: callerIsPlatformAdmin && existing?.user_id ? existing.user_id : authUser.uid,
        },
        { callerIsPlatformAdmin }
      );

      res.json({
        success: true,
        widget: {
          ...stripPrivateFieldsFromWidget(saved, { includeUserId: true }),
          quick_options: saved.quick_options || generateInitialQuickOptions(saved.company_profile),
        },
      });
    } catch (err: any) {
      if (err?.message?.startsWith('Forbidden:')) {
        return res.status(403).json({ error: err.message, code: 'FORBIDDEN_CROSS_TENANT' });
      }
      console.error('Error in POST /api/widget/config:', err);
      res.status(500).json({ error: 'Failed to save widget config' });
    }
  });

  // Authenticated Dashboard User Widget Config API (Protected: IDOR prevented)
  app.get('/api/user/widget-config', requireAuthenticatedUser(), requireTenantOwner('user_id'), async (req: AuthenticatedUserRequest, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    try {
      const requestedUserId = (req.query.user_id as string) || (req.headers['x-user-id'] as string) || req.userContext!.uid;
      const effectiveUserId = (req.userContext!.role === 'CEO' || req.userContext!.role === 'SUPER_ADMIN')
        ? requestedUserId.trim()
        : req.userContext!.uid;

      const config = await getUserWidgetConfig(effectiveUserId);
      res.json({ success: true, widget: config });
    } catch (err: any) {
      console.error('Error in GET /api/user/widget-config:', err);
      res.status(500).json({ error: 'Failed to load user widget config' });
    }
  });

  // Authenticated Dashboard User Widget Config API (Save to database with IDOR protection)
  app.post('/api/user/widget-config', requireAuthenticatedUser(), requireTenantOwner('user_id'), async (req: AuthenticatedUserRequest, res) => {
    try {
      const body = req.body || {};
      const { widget_id } = body;
      const authUser = req.userContext!;
      const effectiveUserId = authUser.uid;
      const callerIsPlatformAdmin = authUser.role === 'CEO' || authUser.role === 'SUPER_ADMIN';
      const effectiveWidgetId = (widget_id && typeof widget_id === 'string' && widget_id.trim())
        ? widget_id.trim()
        : effectiveUserId;

      if (isReservedOfficialWidgetId(effectiveWidgetId) && !callerIsPlatformAdmin) {
        return res.status(403).json({
          error: 'Forbidden: Official platform widget configuration is restricted to platform administrators.',
          code: 'FORBIDDEN_OFFICIAL_WIDGET',
        });
      }

      const saved = await savePublicWidgetConfig(
        {
          ...body,
          widget_id: effectiveWidgetId,
          user_id: effectiveUserId,
        },
        { callerIsPlatformAdmin }
      );
      res.json({
        success: true,
        widget: stripPrivateFieldsFromWidget(saved, { includeUserId: true }),
      });
    } catch (err: any) {
      if (err?.message?.startsWith('Forbidden:')) {
        return res.status(403).json({ error: err.message, code: 'FORBIDDEN_CROSS_TENANT' });
      }
      console.error('Error in POST /api/user/widget-config:', err);
      res.status(500).json({ error: err?.message || 'Failed to save user widget config' });
    }
  });

  // Robust Approve & Send API endpoint with real email dispatch (Gmail/Resend/SendGrid/Postmark), idempotency, tenant authorization, and durable conversation sync
  app.post('/api/inquiries/send-reply', requireAuthenticatedUser(), async (req: AuthenticatedUserRequest, res) => {
    try {
      const body = req.body || {};
      const { userId, leadId, recipientEmail, replyText, subject, senderName, senderEmail, googleAccessToken } = body;

      if (!userId || !leadId || !recipientEmail || !replyText) {
        return res.status(400).json({ success: false, error: 'userId, leadId, recipientEmail, and replyText are required' });
      }

      const authUser = req.userContext!;
      if (authUser.uid !== userId && authUser.role !== 'CEO' && authUser.role !== 'SUPER_ADMIN') {
        return res.status(403).json({ success: false, error: 'Forbidden: Cannot send reply for another tenant' });
      }

      let leadData: any = null;
      let dbReadable = false;

      if (hasAdminCredentials()) {
        try {
          const adminDb = getAdminDb();
          const inquiryRef = adminDb.collection('users').doc(userId).collection('inquiries').doc(leadId);
          const leadRef = adminDb.collection('users').doc(userId).collection('leads').doc(leadId);
          const [inqSnap, leadSnap] = await Promise.all([inquiryRef.get(), leadRef.get()]);
          dbReadable = true;
          leadData = inqSnap.exists ? inqSnap.data() : (leadSnap.exists ? leadSnap.data() : null);
        } catch (dbErr: any) {
          const msg = String(dbErr?.message || '');
          const isPermOrUnavail = dbErr?.code === 7 || dbErr?.code === 14 || msg.includes('PERMISSION_DENIED');
          if (!isPermOrUnavail) throw dbErr;
        }
      }

      // Allow lookup fallback from memory conversation if Admin SDK Firestore lacks IAM permissions
      const derivedConvId =
        leadData?.conversation_id ||
        (String(leadId).startsWith('inq_') || String(leadId).startsWith('lead-') || String(leadId).startsWith('lead_')
          ? String(leadId).replace(/^inq_/, '').replace(/^lead[-_]/, '')
          : undefined);
      const memConv = derivedConvId ? getStoredConversationFromMemory(userId, derivedConvId) : undefined;

      if (dbReadable && !leadData && !memConv) {
        return res.status(404).json({ success: false, error: `Inquiry or lead record '${leadId}' not found for tenant.` });
      }

      // Idempotency Check: return stored reply if already dispatched or published with identical text
      if (
        leadData &&
        (leadData.reply_published === true ||
          (leadData.draft_reply === replyText && leadData.status === 'Waiting for Customer')) &&
        (leadData.email_dispatched === true || !googleAccessToken)
      ) {
        return res.json({
          success: true,
          status: leadData.email_dispatched ? 'accepted' : 'published',
          published: Boolean(leadData.reply_published),
          email_dispatched: Boolean(leadData.email_dispatched),
          email_status: leadData.email_status || (leadData.email_dispatched ? 'accepted' : 'not_sent_conversation_only'),
          already_sent: true,
          sent_at: leadData.email_dispatched_at || leadData.reply_published_at || leadData.updated_at || new Date().toISOString(),
          provider: leadData.email_provider || 'direct_conversation_publish',
          email_provider: leadData.email_provider,
          provider_message_id: leadData.provider_message_id,
          recipient: recipientEmail,
        });
      }

      const hasEmailTransportConfigured = Boolean(
        (googleAccessToken && String(googleAccessToken).trim()) ||
          process.env.RESEND_API_KEY?.trim() ||
          process.env.SENDGRID_API_KEY?.trim() ||
          process.env.POSTMARK_SERVER_TOKEN?.trim()
      );

      let emailDispatched = false;
      let emailStatus = 'not_sent_conversation_only';
      let emailProvider = 'direct_conversation_publish';
      let providerMessageId: string | undefined;
      let emailError: string | undefined;
      const now = new Date().toISOString();

      if (hasEmailTransportConfigured) {
        const emailResult = await dispatchEmailViaProvider({
          to: String(recipientEmail).trim(),
          subject: String(subject || 'Regarding your inquiry'),
          bodyText: String(replyText),
          fromName: senderName ? String(senderName) : undefined,
          fromEmail: senderEmail ? String(senderEmail) : authUser.email,
          googleAccessToken: googleAccessToken ? String(googleAccessToken) : undefined,
        });

        if (!emailResult.success) {
          return res.status(emailResult.errorType === 'provider_rejected' ? 502 : 400).json({
            success: false,
            status: 'failed',
            email_dispatched: false,
            email_status: 'failed',
            error_type: emailResult.errorType,
            error: emailResult.failure_reason || 'Email dispatch was rejected by provider.',
            recipient: recipientEmail,
          });
        }

        emailDispatched = true;
        emailStatus = 'accepted';
        emailProvider = emailResult.provider || 'email';
        providerMessageId = emailResult.provider_message_id;
      }

      const conversationId = leadData?.conversation_id || derivedConvId;
      let publishedMessageId: string | undefined;
      let dbConfirmed = false;

      // Publish assistant reply to in-memory conversation store so visitor widget immediately receives it
      if (conversationId && memConv) {
        const alreadyInMem = (memConv.messages || []).some(
          (m) => m.sender === 'assistant' && m.text === replyText
        );
        if (!alreadyInMem) {
          publishedMessageId = `msg_${crypto.randomUUID()}`;
          memConv.messages.push({
            message_id: publishedMessageId,
            sender: 'assistant',
            text: replyText,
            timestamp: now,
            metadata: { published: true, published_at: now, delivered: false, read: false, approved_dispatch: true },
          });
          memConv.status = 'Waiting for Customer';
          memConv.updated_at = now;
          memConv.last_message_at = now;
        }
      }

      const updatePayload: Record<string, any> = {
        status: 'Waiting for Customer',
        draft_reply: replyText,
        suggested_reply: replyText,
        reply_published: Boolean(conversationId),
        reply_published_at: now,
        email_dispatched: emailDispatched,
        email_status: emailStatus,
        ...(emailDispatched ? { email_dispatched_at: now } : {}),
        ...(providerMessageId ? { provider_message_id: providerMessageId } : {}),
        ...(emailError ? { email_error: emailError } : {}),
        email_recipient: recipientEmail,
        email_provider: emailProvider,
        updated_at: now,
      };

      if (hasAdminCredentials() && dbReadable) {
        try {
          const adminDb = getAdminDb();
          const inquiryRef = adminDb.collection('users').doc(userId).collection('inquiries').doc(leadId);
          const leadRef = adminDb.collection('users').doc(userId).collection('leads').doc(leadId);
          const dbWrites: Promise<any>[] = [
            inquiryRef.set(updatePayload, { merge: true }),
            leadRef.set(updatePayload, { merge: true }),
          ];

          if (conversationId) {
            const convRef = adminDb.collection('users').doc(userId).collection('conversations').doc(conversationId);
            const convSnap = await convRef.get();
            const convData = convSnap.exists ? convSnap.data() : null;
            const existingMessages = Array.isArray(convData?.messages) ? convData.messages : [];

            const alreadyPublished = existingMessages.some((m: any) => m.sender === 'assistant' && m.text === replyText);
            if (!alreadyPublished) {
              publishedMessageId = publishedMessageId || `msg_${crypto.randomUUID()}`;
              const newMessage = {
                message_id: publishedMessageId,
                sender: 'assistant',
                text: replyText,
                timestamp: now,
                approved_by: authUser.email || authUser.uid,
                metadata: { published: true, published_at: now, delivered: false, read: false, approved_dispatch: true },
              };

              dbWrites.push(
                convRef.set(
                  {
                    messages: [...existingMessages, newMessage],
                    last_message_at: now,
                    status: 'Waiting for Customer',
                    updated_at: now,
                  },
                  { merge: true }
                )
              );
            }
          }

          const taskRef = adminDb.collection('users').doc(userId).collection('tasks').doc(`task-${leadId}`);
          dbWrites.push(taskRef.set({ status: 'completed', completed_at: now, updated_at: now }, { merge: true }));

          await Promise.all(dbWrites);
          dbConfirmed = true;
        } catch (dbWriteErr: any) {
          const msg = String(dbWriteErr?.message || '');
          const isPermOrUnavail = dbWriteErr?.code === 7 || dbWriteErr?.code === 14 || msg.includes('PERMISSION_DENIED');
          if (!isPermOrUnavail) throw dbWriteErr;
        }
      }

      if (!emailDispatched && !conversationId && !memConv) {
        return res.status(422).json({
          success: false,
          status: 'failed',
          email_dispatched: false,
          email_status: 'provider_not_configured',
          error_type: 'provider_not_configured',
          error:
            'No outbound email provider is configured (connect Gmail or configure RESEND_API_KEY, SENDGRID_API_KEY, or POSTMARK_SERVER_TOKEN) and no live visitor conversation exists for this inquiry.',
        });
      }

      return res.json({
        success: true,
        status: emailDispatched ? 'accepted' : 'published',
        published: Boolean(conversationId),
        email_dispatched: emailDispatched,
        email_status: emailStatus,
        email_provider: emailDispatched ? emailProvider : undefined,
        provider: emailProvider,
        provider_message_id: providerMessageId,
        db_confirmed: dbConfirmed,
        delivered: false,
        read: false,
        message_id: publishedMessageId,
        sent_at: now,
        recipient: recipientEmail,
      });
    } catch (err: any) {
      console.error('Error in POST /api/inquiries/send-reply:', err);
      return res.status(500).json({ success: false, error: err?.message || 'Internal error persisting reply.' });
    }
  });

  // Human Handoff Takeover, Reply, and Return-to-Alpha endpoints
  app.post('/api/handoff/accept', requireAuthenticatedUser(), async (req: AuthenticatedUserRequest, res) => {
    try {
      const { userId, conversationId } = req.body || {};
      if (!userId || !conversationId) {
        return res.status(400).json({ success: false, error: 'userId and conversationId are required' });
      }
      const authUser = req.userContext!;
      if (authUser.uid !== userId && authUser.role !== 'CEO' && authUser.role !== 'SUPER_ADMIN') {
        return res.status(403).json({ success: false, error: 'Forbidden: Cannot accept handoff for another tenant' });
      }
      const result = await acceptHumanHandoff({
        tenant_id: String(userId),
        conversation_id: String(conversationId),
        employee_uid: authUser.uid,
        employee_email: authUser.email || authUser.uid,
      });
      if (!result.success) return res.status(500).json(result);
      return res.json({ success: true, status: 'Human Takeover' });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message || 'Failed to accept handoff' });
    }
  });

  app.post('/api/handoff/reply', requireAuthenticatedUser(), async (req: AuthenticatedUserRequest, res) => {
    try {
      const { userId, conversationId, replyText } = req.body || {};
      if (!userId || !conversationId || !replyText) {
        return res.status(400).json({ success: false, error: 'userId, conversationId, and replyText are required' });
      }
      const authUser = req.userContext!;
      if (authUser.uid !== userId && authUser.role !== 'CEO' && authUser.role !== 'SUPER_ADMIN') {
        return res.status(403).json({ success: false, error: 'Forbidden: Cannot reply for another tenant' });
      }
      const result = await sendHumanHandoffReply({
        tenant_id: String(userId),
        conversation_id: String(conversationId),
        employee_uid: authUser.uid,
        employee_email: authUser.email || authUser.uid,
        reply_text: String(replyText),
      });
      if (!result.success) return res.status(500).json(result);
      return res.json({ success: true, published: true, delivered: false, read: false, message_id: result.message_id });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message || 'Failed to send human handoff reply' });
    }
  });

  app.post('/api/handoff/return-to-alpha', requireAuthenticatedUser(), async (req: AuthenticatedUserRequest, res) => {
    try {
      const { userId, conversationId } = req.body || {};
      if (!userId || !conversationId) {
        return res.status(400).json({ success: false, error: 'userId and conversationId are required' });
      }
      const authUser = req.userContext!;
      if (authUser.uid !== userId && authUser.role !== 'CEO' && authUser.role !== 'SUPER_ADMIN') {
        return res.status(403).json({ success: false, error: 'Forbidden: Cannot return control for another tenant' });
      }
      const result = await returnControlToAlpha({
        tenant_id: String(userId),
        conversation_id: String(conversationId),
        employee_uid: authUser.uid,
      });
      if (!result.success) return res.status(500).json(result);
      return res.json({ success: true, status: 'Active', human_owned: false });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message || 'Failed to return control to Alpha' });
    }
  });

  // 5-Layer Email Validation Endpoint
  app.post('/api/validate-email', async (req, res) => {
    try {
      const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
      const rate = checkRateLimit(`validate_email:${clientIp}`, 30, 60);
      if (!rate.allowed) {
        return res.status(429).json({
          valid: false,
          email: req.body?.email || '',
          errorType: 'rate_limited',
          message: 'Too many email validation requests. Please slow down.',
          retryAfter: rate.retryAfter,
        });
      }
      const { email } = req.body || {};
      const validation = await validateEmailAddress(email);
      res.json(validation);
    } catch (err: any) {
      console.error('Error in /api/validate-email:', err);
      res.status(500).json({
        valid: false,
        email: req.body?.email || '',
        errorType: 'invalid_format',
        message: 'Internal error validating email address.',
      });
    }
  });

  // Bounded short-window duplicate submission cache for public contact/portfolio forms
  const MAX_RECENT_CONTACT_HASHES = 1000;
  const recentContactSubmissions = new Map<string, { id: string; expiresAt: number }>();

  const handlePublicContactSubmission = async (
    req: express.Request,
    res: express.Response,
    defaultSource: 'contact_page' | 'portfolio_inquiry'
  ) => {
    try {
      const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
      const rate = checkRateLimit(`public_contact:${clientIp}`, 10, 60);
      if (!rate.allowed) {
        return res.status(429).json({
          success: false,
          db_confirmed: false,
          error: 'Too many submissions. Please wait a minute before trying again.',
          retryAfter: rate.retryAfter,
        });
      }

      const body = req.body || {};
      const cleanName = typeof body.name === 'string' ? body.name.trim() : '';
      const cleanEmail = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
      const cleanCompany = typeof body.company === 'string' ? body.company.trim().slice(0, 120) : '';
      const cleanInquiryType = typeof body.inquiryType === 'string' ? body.inquiryType.trim().slice(0, 80) : '';
      const cleanMessage = typeof body.message === 'string' ? body.message.trim() : '';

      if (!cleanName || cleanName.length > 120) {
        return res.status(400).json({ success: false, db_confirmed: false, error: 'A valid name (1-120 chars) is required.' });
      }
      const emailRegex = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i;
      if (!cleanEmail || cleanEmail.length > 160 || !emailRegex.test(cleanEmail)) {
        return res.status(400).json({ success: false, db_confirmed: false, error: 'A valid email address is required.' });
      }
      if (!cleanMessage || cleanMessage.length > 4000) {
        return res.status(400).json({ success: false, db_confirmed: false, error: 'A message (1-4000 chars) is required.' });
      }

      if (!hasAdminCredentials()) {
        return res.status(503).json({
          success: false,
          db_confirmed: false,
          error: 'Contact submission storage is currently unavailable. Please try again later.',
        });
      }

      const now = Date.now();
      const dedupeKey = crypto
        .createHash('sha256')
        .update(`${defaultSource}|${cleanEmail}|${cleanMessage}`)
        .digest('hex');

      const existing = recentContactSubmissions.get(dedupeKey);
      if (existing && existing.expiresAt > now) {
        return res.json({
          success: true,
          db_confirmed: true,
          duplicate: true,
          id: existing.id,
        });
      }

      const submissionId = `sub_${crypto.randomUUID()}`;
      const createdAt = new Date(now).toISOString();
      const record = {
        id: submissionId,
        name: cleanName,
        email: cleanEmail,
        company: cleanCompany || null,
        inquiry_type: cleanInquiryType || null,
        message: cleanMessage,
        source: typeof body.source === 'string' && body.source.trim() ? body.source.trim().slice(0, 64) : defaultSource,
        status: 'new',
        created_at: createdAt,
      };

      await getAdminDb().collection('contact_submissions').doc(submissionId).set(record);

      if (recentContactSubmissions.size >= MAX_RECENT_CONTACT_HASHES) {
        for (const [k, v] of recentContactSubmissions.entries()) {
          if (v.expiresAt <= now) recentContactSubmissions.delete(k);
        }
        if (recentContactSubmissions.size >= MAX_RECENT_CONTACT_HASHES) {
          const oldest = recentContactSubmissions.keys().next().value;
          if (oldest) recentContactSubmissions.delete(oldest);
        }
      }
      recentContactSubmissions.set(dedupeKey, { id: submissionId, expiresAt: now + 5 * 60 * 1000 });

      return res.json({
        success: true,
        db_confirmed: true,
        id: submissionId,
        created_at: createdAt,
      });
    } catch (err: any) {
      const isPermOrUnavail =
        err?.code === 7 ||
        err?.code === 14 ||
        String(err?.message || '').includes('PERMISSION_DENIED');
      if (!isPermOrUnavail) {
        console.error(`Error in /api/${defaultSource}:`, err);
      }
      return res.status(isPermOrUnavail ? 503 : 500).json({
        success: false,
        db_confirmed: false,
        error: isPermOrUnavail
          ? 'Contact submission storage is currently unavailable. Please try again later.'
          : 'Failed to save your inquiry. Please try again.',
      });
    }
  };

  app.post('/api/contact', (req, res) => handlePublicContactSubmission(req, res, 'contact_page'));
  app.post('/api/portfolio-inquiry', (req, res) => handlePublicContactSubmission(req, res, 'portfolio_inquiry'));


  // Public Website Chat Message Processing API
  app.post('/api/widget/chat', async (req, res) => {
    const chatStart = Date.now();
    setPublicWidgetCors(res);
    try {
      const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
      const {
        _authorizedPreview: _ignoredPreview,
        _verifiedTenantUserId: _ignoredVerifiedUid,
        ...safeClientBody
      } = req.body || {};

      const { message, widget_id, visitor_id, conversation_id, stream } = safeClientBody;
      const cleanWidgetId = typeof widget_id === 'string' ? widget_id.trim() : '';
      const rateKey = `widget_chat:${clientIp}:${cleanWidgetId || 'default'}`;
      if (!checkRateLimit(rateKey, 30, 60).allowed) {
        return res.status(429).json({ error: 'Too many requests. Please wait a moment before sending another message.' });
      }
      if (!cleanWidgetId) {
        return res.status(400).json({ error: 'widget_id is required.' });
      }
      if (!message || typeof message !== 'string' || !message.trim()) {
        return res.status(400).json({ error: 'Message cannot be empty.' });
      }
      if (message.length > 4000) {
        return res.status(413).json({ error: 'Message exceeds maximum allowed length of 4000 characters.' });
      }

      const widgetConfig = await resolvePublicWidget(cleanWidgetId);
      const wantsSimulation =
        safeClientBody.environment === 'simulation' ||
        safeClientBody.is_simulated === true ||
        Boolean(safeClientBody.company_profile && typeof safeClientBody.company_profile === 'object');

      let authorizedPreview = false;
      let verifiedOwnerUid: string | undefined;

      if (wantsSimulation) {
        const authHeader = (req.headers.authorization as string) || '';
        const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
        const verifiedUser = idToken ? await verifyFirebaseIdToken(idToken) : null;
        if (!verifiedUser) {
          return res.status(403).json({
            success: false,
            error: 'Forbidden: Simulation preview and profile overrides require authenticated widget owner credentials.',
            code: 'FORBIDDEN_SIMULATION',
          });
        }
        const callerRole = await getAuthoritativeUserRole(verifiedUser.uid, verifiedUser.email);
        const callerIsPlatformAdmin = callerRole === 'CEO' || callerRole === 'SUPER_ADMIN';
        const expectedOwner = widgetConfig?.user_id || cleanWidgetId;
        if (verifiedUser.uid !== expectedOwner && !callerIsPlatformAdmin) {
          return res.status(403).json({
            success: false,
            error: 'Forbidden: You do not own this widget for simulation preview.',
            code: 'FORBIDDEN_SIMULATION',
          });
        }
        authorizedPreview = true;
        verifiedOwnerUid = expectedOwner;
      } else {
        if (!widgetConfig) {
          return res.status(404).json({ success: false, error: 'Widget not found.', error_code: 'WIDGET_NOT_FOUND' });
        }
        if (widgetConfig.is_active === false) {
          return res.status(403).json({ success: false, error: 'This widget is currently inactive.', error_code: 'WIDGET_INACTIVE' });
        }
      }

      // Enforce visitor_session_token signing availability & verification consistently across Turn 1..N (no Turn-1 bypass)
      if (!wantsSimulation && widgetConfig) {
        if (process.env.NODE_ENV === 'production' && !isVisitorSessionSecretConfigured()) {
          return res.status(503).json({
            success: false,
            error: 'Visitor session signing is not configured on this server.',
            code: 'SESSION_SIGNING_UNCONFIGURED',
          });
        }

        const effectiveTenantId = widgetConfig.user_id || widgetConfig.widget_id;
        const authHeader = (req.headers.authorization as string) || '';
        const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
        const providedVisitorToken =
          ((req.headers['x-visitor-token'] as string) || '').trim() ||
          (typeof safeClientBody.visitor_session_token === 'string' ? safeClientBody.visitor_session_token.trim() : '') ||
          (bearerToken && bearerToken.split('.').length === 2 ? bearerToken : '');

        let conversationExists = false;
        let existingVisitorOwner: string | undefined;

        if (conversation_id && typeof conversation_id === 'string') {
          existingVisitorOwner = getStoredConversationOwner(effectiveTenantId, conversation_id);
          if (existingVisitorOwner) {
            conversationExists = true;
          } else if (hasAdminCredentials()) {
            try {
              const convSnap = await getAdminDb()
                .collection('users')
                .doc(effectiveTenantId)
                .collection('conversations')
                .doc(conversation_id)
                .get();
              if (convSnap.exists) {
                conversationExists = true;
                existingVisitorOwner = convSnap.data()?.visitor_id;
              }
            } catch {}
          }
        }

        if (existingVisitorOwner && visitor_id && existingVisitorOwner !== String(visitor_id)) {
          return res.status(403).json({
            success: false,
            error: 'Forbidden: Conversation belongs to another visitor.',
            code: 'UNAUTHORIZED_OWNERSHIP',
          });
        }

        if (providedVisitorToken || conversationExists) {
          const verification = verifyVisitorSessionToken(providedVisitorToken, {
            tenant_id: effectiveTenantId,
            widget_id: widgetConfig.widget_id,
            visitor_id: visitor_id ? String(visitor_id) : existingVisitorOwner,
            conversation_id: conversation_id ? String(conversation_id) : undefined,
          });
          if (!verification.valid) {
            const statusCode =
              verification.code === 'TOKEN_MISSING' || verification.code === 'TOKEN_EXPIRED' ? 401 : 403;
            return res.status(statusCode).json({
              success: false,
              error: verification.error || 'Unauthorized visitor session',
              code: verification.code,
            });
          }
        }
      }

      const chatPayload = {
        ...safeClientBody,
        widget_id: cleanWidgetId,
        _authorizedPreview: authorizedPreview,
        _verifiedTenantUserId: verifiedOwnerUid,
      };

      const analyticsConsent = req.headers['x-consent-analytics'] === '1';

      if (stream) {
        res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
        res.setHeader('Cache-Control', 'no-cache, no-transform');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no');
        res.flushHeaders?.();
        res.write(': connected\n\n');

        const ac = new AbortController();
        res.on('close', () => {
          if (!res.writableEnded) {
            ac.abort();
          }
        });

        let lastMetadata: any = null;

        try {
          for await (const event of handleWidgetChatStream(chatPayload, ac.signal)) {
            if (ac.signal.aborted || res.writableEnded) break;
            if (event.type === 'metadata' && event.data) {
              lastMetadata = event.data;
            }
            res.write(`data: ${JSON.stringify(event)}\n\n`);
          }
        } catch (streamErr: any) {
          console.error('[SSE] Widget stream error:', streamErr?.message || streamErr);
          if (!res.writableEnded && !ac.signal.aborted) {
            res.write(
              `data: ${JSON.stringify({
                type: 'error',
                error: streamErr?.message || 'Streaming response failed.',
              })}\n\n`
            );
          }
        }

        const latency = Date.now() - chatStart;
        recordLatency(latency);

        const timingMetrics = lastMetadata?.timing_metrics || chatPayload.timing_metrics;
        (req as any).timing_metrics = timingMetrics;
        if (timingMetrics) {
          console.log(`[REQUEST_PERF] path=/api/widget/chat stream=true total=${latency}ms context=${timingMetrics.context_retrieval_ms}ms ttft=${timingMetrics.ttft_ms ?? 0}ms model_gen=${timingMetrics.generation_ms}ms model=${timingMetrics.model_used}`);
        }

        if (lastMetadata && !authorizedPreview) {
          const visId = visitor_id || `vis_${cleanWidgetId}`;
          const detectedScore = lastMetadata.lead_score || lastMetadata.structured_profile?.lead_score;
          if (analyticsConsent) {
            trackVisitorSession({
              visitorId: visId,
              widgetId: cleanWidgetId,
              tenantId: widgetConfig?.user_id,
              action: lastMetadata.inquiry_registered ? 'INQUIRY' : 'MESSAGE',
              leadScore: detectedScore,
              userAgent: req.headers['user-agent'],
              analyticsConsented: true,
            });
          }

          if (lastMetadata.escalated_to_care || lastMetadata.detected_intent === 'HUMAN_HANDOFF_REQUEST') {
            recordLiveActivity({
              type: 'HUMAN_HANDOFF_REQUEST' as any,
              severity: 'warning',
              title: 'Human Handoff Escalated',
              description: `Visitor requested human connection via widget '${cleanWidgetId}'.`,
              widgetId: cleanWidgetId,
            });
          } else if (lastMetadata.inquiry_registered) {
            recordLiveActivity({
              type: 'INQUIRY_REGISTERED',
              severity: 'success',
              title: `Inquiry Registered (${detectedScore || 'HOT'})`,
              description: `Visitor inquiry registered via widget '${cleanWidgetId}'.`,
              widgetId: cleanWidgetId,
            });
          } else {
            recordLiveActivity({
              type: 'CHAT_MESSAGE',
              title: 'Chat Message Processed',
              description: `Visitor sent message -> ${lastMetadata.detected_intent || 'General Query'}`,
              widgetId: cleanWidgetId,
            });
          }
        }

        if (!res.writableEnded) {
          res.end();
        }
        return;
      }

      const result = (await handleWidgetChat(chatPayload)) as any;
      const latency = Date.now() - chatStart;
      recordLatency(latency);

      const timingMetrics = result.timing_metrics || chatPayload.timing_metrics;
      (req as any).timing_metrics = timingMetrics;
      if (timingMetrics) {
        console.log(`[REQUEST_PERF] path=/api/widget/chat stream=false total=${latency}ms context=${timingMetrics.context_retrieval_ms}ms model_gen=${timingMetrics.generation_ms}ms model=${timingMetrics.model_used}`);
      }

      if (result.error_code === 'WIDGET_NOT_FOUND') {
        return res.status(404).json(result);
      }
      if (
        result.error_code === 'WIDGET_INACTIVE' ||
        result.error_code === 'FORBIDDEN_SIMULATION' ||
        result.error_code === 'UNAUTHORIZED_OWNERSHIP'
      ) {
        return res.status(403).json(result);
      }

      if (!authorizedPreview) {
        const visId = visitor_id || `vis_${cleanWidgetId}`;
        const detectedScore = result.lead_score || result.structured_profile?.lead_score;
        if (analyticsConsent) {
          trackVisitorSession({
            visitorId: visId,
            widgetId: cleanWidgetId,
            tenantId: widgetConfig?.user_id,
            action: result.inquiry_registered ? 'INQUIRY' : 'MESSAGE',
            leadScore: detectedScore,
            userAgent: req.headers['user-agent'],
            analyticsConsented: true,
          });
        }

        if (result.escalated_to_care || result.detected_intent === 'HUMAN_HANDOFF_REQUEST') {
          recordLiveActivity({
            type: 'HUMAN_HANDOFF_REQUEST' as any,
            severity: 'warning',
            title: 'Human Handoff Escalated',
            description: `Visitor requested human connection via widget '${cleanWidgetId}'.`,
            widgetId: cleanWidgetId,
          });
        } else if (result.inquiry_registered) {
          recordLiveActivity({
            type: 'INQUIRY_REGISTERED',
            severity: 'success',
            title: `Inquiry Registered (${detectedScore || 'HOT'})`,
            description: `Visitor inquiry registered via widget '${cleanWidgetId}'.`,
            widgetId: cleanWidgetId,
          });
        } else {
          recordLiveActivity({
            type: 'CHAT_MESSAGE',
            title: 'Chat Message Processed',
            description: `Visitor sent message -> ${result.detected_intent || 'General Query'}`,
            widgetId: cleanWidgetId,
          });
        }
      }

      res.json(result);
    } catch (err: any) {
      console.error('API website chat error:', err);
      recordSystemError({
        service: 'WIDGET',
        severity: 'ERROR',
        endpoint: '/api/widget/chat',
        message: err?.message || 'Chat processing error',
        stack: err?.stack,
      });
      if (!res.headersSent) {
        const conversationId = req.body?.conversation_id || `conv-${Date.now()}`;
        res.status(500).json({ 
          success: false,
          error: err?.message || 'Failed to process chat message. Please try again.',
          reply: 'I hit a temporary response error. Please retry.',
          conversation_id: conversationId,
          is_sales_lead: false,
        });
      } else {
        res.end();
      }
    }
  });

  // Technical SEO: Dynamic robots.txt & sitemap.xml endpoints
  app.get('/robots.txt', (req, res) => {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(`User-agent: *
Allow: /
Disallow: /api/
Disallow: /workspace
Disallow: /admin
Disallow: /guest-session/
Disallow: /sales-coordinator

Sitemap: https://aiworkforce.ai.studio/sitemap.xml
`);
  });

  app.get('/sitemap.xml', (req, res) => {
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    const today = new Date().toISOString().split('T')[0];
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://aiworkforce.ai.studio/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://aiworkforce.ai.studio/alpha</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.95</priority>
  </url>
  <url>
    <loc>https://aiworkforce.ai.studio/blog</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://aiworkforce.ai.studio/about</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://aiworkforce.ai.studio/contact</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://aiworkforce.ai.studio/privacy</loc>
    <lastmod>${today}</lastmod>
    <changefreq>yearly</changefreq>
    <priority>0.5</priority>
  </url>
  <url>
    <loc>https://aiworkforce.ai.studio/cookies</loc>
    <lastmod>${today}</lastmod>
    <changefreq>yearly</changefreq>
    <priority>0.5</priority>
  </url>
  <url>
    <loc>https://aiworkforce.ai.studio/terms</loc>
    <lastmod>${today}</lastmod>
    <changefreq>yearly</changefreq>
    <priority>0.5</priority>
  </url>
</urlset>`);
  });

  // CORS Pre-flight for public widget endpoints
  app.options('/widget.js', (req, res) => { setPublicWidgetCors(res); res.sendStatus(200); });
  app.options('/chat-widget.js', (req, res) => { setPublicWidgetCors(res); res.sendStatus(200); });
  app.options('/api/widget/config', (req, res) => { setPublicWidgetCors(res); res.sendStatus(200); });
  app.options('/api/widget/chat', (req, res) => { setPublicWidgetCors(res); res.sendStatus(200); });
  app.options('/api/widget/session', (req, res) => { setPublicWidgetCors(res); res.sendStatus(200); });
  app.options('/api/widget/conversation', (req, res) => { setPublicWidgetCors(res); res.sendStatus(200); });
  app.options('/api/widget/conversation/ack', (req, res) => { setPublicWidgetCors(res); res.sendStatus(200); });

  // Internal / Dashboard APIs
  app.post('/api/analyze-inquiry', async (req, res) => {
    try {
      const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
      const rate = checkRateLimit(`analyze_inquiry:${clientIp}`, 30, 60);
      if (!rate.allowed) {
        return res.status(429).json({ error: 'Too many inquiry analysis requests. Please slow down.', retryAfter: rate.retryAfter });
      }
      const { inquiryText, companyProfile, source, customerName } = req.body || {};
      if (!inquiryText || typeof inquiryText !== 'string' || !inquiryText.trim()) {
        return res.status(400).json({ error: 'Customer inquiry text is required.' });
      }
      const result = await analyzeInquiry(inquiryText, companyProfile, source || 'Email', customerName);
      res.json(result);
    } catch (err: any) {
      console.warn('API analyze caught exception, returning deterministic analysis:', err?.message || err);
      const fallback = fallbackRuleBasedAnalysis(req.body?.inquiryText || 'Inbound customer inquiry', req.body?.companyProfile, req.body?.source, req.body?.customerName);
      res.json(fallback);
    }
  });

  // Website-Assisted Onboarding Extraction Endpoint (Workstream 3)
  app.post('/api/onboarding/extract-website', async (req, res) => {
    try {
      const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
      const rate = checkRateLimit(`extract_website:${clientIp}`, 15, 60);
      if (!rate.allowed) {
        return res.status(429).json({
          success: false,
          error: 'Too many website extraction requests. Please wait a minute and try again.',
          retryAfter: rate.retryAfter,
        });
      }
      const { url } = req.body || {};
      if (!url || typeof url !== 'string' || !url.trim()) {
        return res.status(400).json({ success: false, error: 'A valid public website URL is required.' });
      }

      const result = await extractCompanyBrainFromWebsite(url);
      res.json(result);
    } catch (err: any) {
      console.error('Error in /api/onboarding/extract-website:', err);
      res.status(500).json({
        success: false,
        error: `Failed to analyze website: ${err?.message || err}`,
      });
    }
  });

  // Automated Test Suite Validation APIs (Admin-only + explicitly supplied tenant company_profile)
  app.get('/api/test-suite/list', requireAdminRole(), (req, res) => {
    res.json({
      total: ALL_38_TEST_CASES.length,
      testCases: ALL_38_TEST_CASES,
    });
  });

  app.post('/api/test-suite/run', requireAdminRole(), async (req: AuthenticatedAdminRequest, res) => {
    try {
      const rateKey = `test_suite_run:${req.admin?.uid || req.ip || 'unknown'}`;
      const rate = checkRateLimit(rateKey, 10, 60);
      if (!rate.allowed) {
        return res.status(429).json({ error: 'Too many test-suite runs. Please slow down.', retryAfter: rate.retryAfter });
      }

      const { company_profile, test_id } = req.body || {};
      if (!company_profile || typeof company_profile !== 'object' || !String(company_profile.name || '').trim()) {
        return res.status(400).json({
          success: false,
          error: 'A complete company_profile object (including name) is required in the request body.',
        });
      }

      if (test_id) {
        const targetTest = ALL_38_TEST_CASES.find((t) => t.id === Number(test_id));
        if (!targetTest) {
          return res.status(404).json({ error: `Test case with ID ${test_id} not found` });
        }
        const singleResult = await executeTestCase(targetTest, company_profile);
        return res.json({ success: true, result: singleResult });
      }

      const testSuiteResults = await runFullSafetyTestSuite(company_profile);
      res.json({ success: true, ...testSuiteResults });
    } catch (err: any) {
      console.error('Test suite run error:', err);
      res.status(500).json({ error: 'Failed to run test suite', details: err?.message || String(err) });
    }
  });

  // Vite Middleware in Development vs Static Serving in Production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.use(express.static(path.join(process.cwd(), 'public')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`AI Workforce server listening on http://0.0.0.0:${PORT}`);
  });

  const shutdown = () => {
    console.log('Received shutdown signal, gracefully closing HTTP server...');
    server.close(() => {
      console.log('HTTP server closed successfully.');
      process.exit(0);
    });
    setTimeout(() => {
      console.error('Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

startServer().catch((err) => {
  console.error('Failed to start AI Workforce server:', err);
});

