import { getAdminDb, hasAdminCredentials, probeAdminFirestore } from './firebaseAdmin.ts';
import firebaseConfig from '../../firebase-applet-config.json';
import { getPublicWidgetCount } from './widgetHandler.ts';
import { isVisitorSessionSecretConfigured } from './visitorSessionService.ts';

export type HealthStatus = 'HEALTHY' | 'DEGRADED' | 'CRITICAL' | 'UNKNOWN';

export interface SubsystemHealth {
  name: string;
  key: 'api' | 'firestore' | 'auth' | 'ai_provider' | 'email' | 'widget_runtime';
  status: HealthStatus;
  latencyMs: number;
  lastCheckedAt: string;
  message: string;
  details?: Record<string, any>;
}

export interface SystemHealthReport {
  overallStatus: HealthStatus;
  timestamp: string;
  uptimeSeconds: number;
  environment: string;
  subsystems: SubsystemHealth[];
}

const serverStartTime = Date.now();

export async function runSystemDiagnostics(): Promise<SystemHealthReport> {
  const now = new Date().toISOString();
  const subsystems: SubsystemHealth[] = [];

  // 1. API Server Health
  const apiStart = Date.now();
  const memoryUsage = process.memoryUsage();
  const apiLatency = Date.now() - apiStart;
  subsystems.push({
    name: 'Core Express API Server',
    key: 'api',
    status: 'HEALTHY',
    latencyMs: apiLatency,
    lastCheckedAt: now,
    message: 'Express HTTP server operating normally.',
    details: {
      uptimeSeconds: Math.round((Date.now() - serverStartTime) / 1000),
      heapUsedMB: Math.round(memoryUsage.heapUsed / 1024 / 1024),
      rssMB: Math.round(memoryUsage.rss / 1024 / 1024),
      nodeVersion: process.version,
    },
  });

  // 2. Firestore Database Connectivity & Latency Probe via Admin SDK
  const dbStart = Date.now();
  let dbStatus: HealthStatus = 'UNKNOWN';
  let dbMessage = '';
  let dbLatency = 0;

  if (!hasAdminCredentials()) {
    dbStatus = 'CRITICAL';
    dbMessage = 'Firebase Admin credentials or ADC unavailable; server Firestore writes cannot proceed.';
  } else {
    const probe = await probeAdminFirestore();
    dbLatency = probe.latencyMs;
    if (probe.ok) {
      dbStatus = dbLatency < 1500 ? 'HEALTHY' : 'DEGRADED';
      dbMessage = `Firestore Admin SDK connected in ${dbLatency}ms. Database ID: ${firebaseConfig.firestoreDatabaseId || '(default)'}`;
    } else {
      dbStatus = 'CRITICAL';
      dbMessage = `Firestore Admin SDK probe failed: ${probe.error || 'Unknown error'}`;
    }
  }

  subsystems.push({
    name: 'Google Cloud Firestore (Admin SDK)',
    key: 'firestore',
    status: dbStatus,
    latencyMs: dbLatency,
    lastCheckedAt: now,
    message: dbMessage,
    details: {
      projectId: firebaseConfig.projectId,
      databaseId: firebaseConfig.firestoreDatabaseId || '(default)',
      credentialsAvailable: hasAdminCredentials(),
    },
  });

  // 3. Firebase Authentication Service
  const authStart = Date.now();
  let authStatus: HealthStatus = 'UNKNOWN';
  let authLatency = 0;
  let authMessage = 'Identity Toolkit API key not configured.';
  try {
    const apiKey = firebaseConfig.apiKey;
    if (apiKey) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 3000);
      const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: 'invalid-probe-token' }),
        signal: controller.signal,
      }).finally(() => clearTimeout(timer));
      authLatency = Date.now() - authStart;
      if (res.status === 400 || res.status === 200) {
        authStatus = 'HEALTHY';
        authMessage = `Google Identity Toolkit reachable in ${authLatency}ms.`;
      } else {
        authStatus = 'DEGRADED';
        authMessage = `Identity Toolkit returned HTTP ${res.status}.`;
      }
    }
  } catch (err: any) {
    authLatency = Date.now() - authStart;
    authStatus = 'DEGRADED';
    authMessage = `Identity Toolkit probe failed: ${err?.message || err}`;
  }
  subsystems.push({
    name: 'Firebase Authentication & Identity',
    key: 'auth',
    status: authStatus,
    latencyMs: authLatency,
    lastCheckedAt: now,
    message: authMessage,
    details: {
      authDomain: firebaseConfig.authDomain,
    },
  });

  // 4. AI Provider (Gemini API) - genuine config + light API reachability check
  const aiStart = Date.now();
  let aiStatus: HealthStatus = 'UNKNOWN';
  let aiMessage = '';
  let aiLatency = 0;
  const geminiKey = (process.env.GEMINI_API_KEY || '').trim();
  if (!geminiKey) {
    aiLatency = Date.now() - aiStart;
    aiStatus = 'DEGRADED';
    aiMessage = 'GEMINI_API_KEY is not configured. Responses rely strictly on grounded Company Brain fallbacks.';
  } else {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 3000);
      const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models', {
        method: 'GET',
        headers: { 'x-goog-api-key': geminiKey },
        signal: controller.signal,
      }).finally(() => clearTimeout(timer));
      aiLatency = Date.now() - aiStart;
      if (res.ok) {
        aiStatus = 'HEALTHY';
        aiMessage = `Gemini API reachable in ${aiLatency}ms.`;
      } else if (res.status === 401 || res.status === 403) {
        aiStatus = 'CRITICAL';
        aiMessage = `Gemini API key rejected (HTTP ${res.status}).`;
      } else {
        aiStatus = 'DEGRADED';
        aiMessage = `Gemini API probe returned HTTP ${res.status}.`;
      }
    } catch (err: any) {
      aiLatency = Date.now() - aiStart;
      aiStatus = 'UNKNOWN';
      aiMessage = `Gemini API key configured; live probe timed out or unreachable (${err?.message || 'network'}).`;
    }
  }
  subsystems.push({
    name: 'Google Gemini AI Reasoning Engine',
    key: 'ai_provider',
    status: aiStatus,
    latencyMs: aiLatency,
    lastCheckedAt: now,
    message: aiMessage,
    details: {
      model: 'gemini-3.1-flash-lite',
      keyConfigured: Boolean(geminiKey),
    },
  });

  // 5. Email Dispatch & Notification Outbox Worker Health
  const emailStart = Date.now();
  const hasResend = Boolean(process.env.RESEND_API_KEY);
  const hasSendgrid = Boolean(process.env.SENDGRID_API_KEY);
  const hasPostmark = Boolean(process.env.POSTMARK_SERVER_TOKEN);
  let outboxFailedCount = 0;
  let outboxQueuedCount = 0;

  if (hasAdminCredentials()) {
    try {
      const db = getAdminDb();
      const failedSnap = await db.collectionGroup('notification_outbox').where('status', '==', 'failed').limit(25).get();
      outboxFailedCount = failedSnap.size;
      const queuedSnap = await db.collectionGroup('notification_outbox').where('status', '==', 'queued').limit(25).get();
      outboxQueuedCount = queuedSnap.size;
    } catch {
      // Collection group index may not be present yet
    }
  }

  let emailStatus: HealthStatus = 'UNKNOWN';
  let emailMessage = 'No outbound email provider credentials configured (RESEND_API_KEY / SENDGRID_API_KEY / POSTMARK_SERVER_TOKEN).';
  if (hasResend || hasSendgrid || hasPostmark) {
    if (outboxFailedCount > 0) {
      emailStatus = 'DEGRADED';
      emailMessage = `Email provider configured, but ${outboxFailedCount} notification(s) failed delivery and ${outboxQueuedCount} queued.`;
    } else {
      emailStatus = 'HEALTHY';
      emailMessage = `Email provider configured (${hasResend ? 'Resend' : hasSendgrid ? 'SendGrid' : 'Postmark'}). Outbox queued: ${outboxQueuedCount}.`;
    }
  }

  subsystems.push({
    name: 'Commercial Email Dispatch & Outbox',
    key: 'email',
    status: emailStatus,
    latencyMs: Date.now() - emailStart,
    lastCheckedAt: now,
    message: emailMessage,
    details: {
      providerConfigured: hasResend || hasSendgrid || hasPostmark,
      outboxQueued: outboxQueuedCount,
      outboxFailed: outboxFailedCount,
    },
  });

  // 6. Widget Runtime Service
  const widgetStart = Date.now();
  let widgetStatus: HealthStatus = 'HEALTHY';
  let widgetCount: number | null = null;
  let widgetMessage = '';
  try {
    widgetCount = await getPublicWidgetCount();
    widgetMessage = `Standalone embed runtime operating with ${widgetCount} registered public widgets.`;
  } catch (err: any) {
    widgetStatus = 'DEGRADED';
    widgetMessage = `Unable to query registered widgets count: ${err?.message || 'database unavailable'}`;
  }

  const secretConfigured = isVisitorSessionSecretConfigured();
  const isProd = process.env.NODE_ENV === 'production';
  if (isProd && !secretConfigured) {
    widgetStatus = 'CRITICAL';
  }
  subsystems.push({
    name: 'Embed Widget Delivery Runtime',
    key: 'widget_runtime',
    status: widgetStatus,
    latencyMs: Date.now() - widgetStart,
    lastCheckedAt: now,
    message: secretConfigured
      ? widgetMessage
      : isProd
      ? `${widgetMessage} CRITICAL: VISITOR_SESSION_SECRET (>= 32 chars) is missing in production; visitor session tokens cannot be signed or verified.`
      : `${widgetMessage} Dev/test mode: visitor session tokens use ephemeral local secret (set VISITOR_SESSION_SECRET for production).`,
    details: {
      activeWidgets: widgetCount,
      visitorSessionSecretConfigured: secretConfigured,
    },
  });

  let overallStatus: HealthStatus = 'HEALTHY';
  if (subsystems.some((s) => s.status === 'CRITICAL')) {
    overallStatus = 'CRITICAL';
  } else if (subsystems.some((s) => s.status === 'DEGRADED')) {
    overallStatus = 'DEGRADED';
  } else if (subsystems.some((s) => s.status === 'UNKNOWN')) {
    overallStatus = 'DEGRADED';
  }

  return {
    overallStatus,
    timestamp: now,
    uptimeSeconds: Math.round((Date.now() - serverStartTime) / 1000),
    environment: process.env.NODE_ENV || 'development',
    subsystems,
  };
}
