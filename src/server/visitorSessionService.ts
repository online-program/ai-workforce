import crypto from 'crypto';

export interface VisitorSessionPayload {
  tenant_id: string;
  widget_id?: string;
  visitor_id: string;
  conversation_id: string;
  iat: number;
  exp: number;
  jti: string;
}

export interface VisitorTokenVerificationResult {
  valid: boolean;
  payload?: VisitorSessionPayload;
  code?:
    | 'TOKEN_MISSING'
    | 'TOKEN_MALFORMED'
    | 'TOKEN_INVALID_SIGNATURE'
    | 'TOKEN_EXPIRED'
    | 'UNAUTHORIZED_OWNERSHIP';
  error?: string;
}

const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const DEV_EPHEMERAL_SECRET = crypto.randomBytes(32).toString('hex');
let runtimeClusterSecret: string | null = null;

export function setRuntimeClusterSigningSecret(secret: string | null): void {
  if (secret === null) {
    runtimeClusterSecret = null;
    return;
  }
  const clean = String(secret).trim();
  if (clean.length < 32) {
    throw new Error('[SECURITY] Cluster signing secret must be at least 32 characters.');
  }
  runtimeClusterSecret = clean;
}

export function isVisitorSessionSecretConfigured(): boolean {
  const envConfigured = (process.env.VISITOR_SESSION_SECRET || process.env.SESSION_SECRET || '').trim();
  if (envConfigured.length >= 32) return true;
  return Boolean(runtimeClusterSecret && runtimeClusterSecret.length >= 32);
}

export function getVisitorSessionSecretStatus(): {
  configured: boolean;
  source: 'env' | 'cluster_firestore' | 'dev_ephemeral' | 'unconfigured';
  fingerprintPrefix: string | null;
} {
  const envConfigured = (process.env.VISITOR_SESSION_SECRET || process.env.SESSION_SECRET || '').trim();
  if (envConfigured.length >= 32) {
    return {
      configured: true,
      source: 'env',
      fingerprintPrefix: crypto.createHash('sha256').update(envConfigured).digest('hex').slice(0, 8),
    };
  }
  if (runtimeClusterSecret && runtimeClusterSecret.length >= 32) {
    return {
      configured: true,
      source: 'cluster_firestore',
      fingerprintPrefix: crypto.createHash('sha256').update(runtimeClusterSecret).digest('hex').slice(0, 8),
    };
  }
  if (process.env.NODE_ENV !== 'production') {
    const devSecret = process.env.FIREBASE_PRIVATE_KEY || DEV_EPHEMERAL_SECRET;
    return {
      configured: true,
      source: 'dev_ephemeral',
      fingerprintPrefix: crypto.createHash('sha256').update(devSecret).digest('hex').slice(0, 8),
    };
  }
  return { configured: false, source: 'unconfigured', fingerprintPrefix: null };
}

/**
 * Ensures multi-instance Cloud Run production containers share a single cryptographically random
 * HMAC signing key even when VISITOR_SESSION_SECRET was not manually configured in environment vars.
 * Never falls back to public client config; fails closed if Admin Firestore is unavailable.
 */
export async function ensureClusterVisitorSessionSecret(db: any): Promise<boolean> {
  const envConfigured = (process.env.VISITOR_SESSION_SECRET || process.env.SESSION_SECRET || '').trim();
  if (envConfigured.length >= 32) {
    return true;
  }
  if (runtimeClusterSecret && runtimeClusterSecret.length >= 32) {
    return true;
  }
  if (!db) return false;

  try {
    const secretRef = db.collection('system_secrets').doc('visitor_session');
    const resolvedSecret = await db.runTransaction(async (tx: any) => {
      const snap = await tx.get(secretRef);
      if (snap.exists) {
        const existing = String(snap.data()?.secret || '').trim();
        if (existing.length >= 32) {
          return existing;
        }
      }
      const generated = crypto.randomBytes(32).toString('hex');
      const payload = {
        secret: generated,
        purpose: 'visitor_session_hmac',
        created_at: new Date().toISOString(),
      };
      if (typeof tx.create === 'function' && !snap.exists) {
        tx.create(secretRef, payload);
      } else {
        tx.set(secretRef, payload, { merge: false });
      }
      return generated;
    });

    if (typeof resolvedSecret === 'string' && resolvedSecret.length >= 32) {
      runtimeClusterSecret = resolvedSecret;
      return true;
    }
    return false;
  } catch (err: any) {
    const msg = String(err?.message || err);
    if (!msg.includes('PERMISSION_DENIED') && err?.code !== 7) {
      console.warn('[SessionSigning] Could not hydrate cluster signing secret:', msg);
    }
    return false;
  }
}

function getSigningSecret(secretOverride?: string): string {
  const envOrCluster = (
    process.env.VISITOR_SESSION_SECRET ||
    process.env.SESSION_SECRET ||
    runtimeClusterSecret ||
    ''
  ).trim();
  const configured = (secretOverride !== undefined ? secretOverride : envOrCluster).trim();

  if (process.env.NODE_ENV === 'production') {
    if (!configured || configured.length < 32) {
      throw new Error(
        '[SECURITY] VISITOR_SESSION_SECRET (or SESSION_SECRET) must be configured with at least 32 characters in production.'
      );
    }
    return configured;
  }

  if (secretOverride !== undefined) {
    if (configured.length < 32) {
      throw new Error('[SECURITY] Secret override must be at least 32 characters.');
    }
    return configured;
  }

  return configured || process.env.FIREBASE_PRIVATE_KEY || DEV_EPHEMERAL_SECRET;
}

function base64UrlEncode(input: string | Buffer): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function base64UrlDecode(input: string): string {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((input.length + 3) % 4);
  return Buffer.from(padded, 'base64').toString('utf8');
}

export function issueVisitorSessionToken(params: {
  tenant_id: string;
  widget_id?: string;
  visitor_id: string;
  conversation_id: string;
  ttlMs?: number;
  secretOverride?: string;
}): string {
  const secret = getSigningSecret(params.secretOverride);
  const now = Date.now();
  const payload: VisitorSessionPayload = {
    tenant_id: params.tenant_id,
    ...(params.widget_id ? { widget_id: params.widget_id } : {}),
    visitor_id: params.visitor_id,
    conversation_id: params.conversation_id,
    iat: now,
    exp: now + (params.ttlMs ?? DEFAULT_TTL_MS),
    jti: crypto.randomBytes(12).toString('hex'),
  };

  const payloadB64 = base64UrlEncode(JSON.stringify(payload));
  const sig = crypto.createHmac('sha256', secret).update(payloadB64).digest();
  const sigB64 = base64UrlEncode(sig);
  return `${payloadB64}.${sigB64}`;
}

export function verifyVisitorSessionToken(
  token: string | undefined | null,
  expected?: {
    tenant_id?: string;
    widget_id?: string;
    visitor_id?: string;
    conversation_id?: string;
    secretOverride?: string;
  }
): VisitorTokenVerificationResult {
  if (!token || typeof token !== 'string' || !token.trim()) {
    return { valid: false, code: 'TOKEN_MISSING', error: 'Visitor session token is required.' };
  }

  let secret: string;
  try {
    secret = getSigningSecret(expected?.secretOverride);
  } catch (err: any) {
    return {
      valid: false,
      code: 'TOKEN_INVALID_SIGNATURE',
      error: err?.message || 'Session signing secret is not configured.',
    };
  }

  const parts = token.trim().split('.');
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    return { valid: false, code: 'TOKEN_MALFORMED', error: 'Malformed visitor session token.' };
  }

  const [payloadB64, sigB64] = parts;
  const expectedSig = crypto.createHmac('sha256', secret).update(payloadB64).digest();
  const expectedSigB64 = base64UrlEncode(expectedSig);

  const sigBuf = Buffer.from(sigB64, 'utf8');
  const expectedBuf = Buffer.from(expectedSigB64, 'utf8');
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    return { valid: false, code: 'TOKEN_INVALID_SIGNATURE', error: 'Invalid visitor session token signature.' };
  }

  let payload: VisitorSessionPayload;
  try {
    payload = JSON.parse(base64UrlDecode(payloadB64));
  } catch {
    return { valid: false, code: 'TOKEN_MALFORMED', error: 'Corrupted visitor session token payload.' };
  }

  if (!payload || !payload.tenant_id || !payload.visitor_id || !payload.conversation_id || !payload.exp) {
    return { valid: false, code: 'TOKEN_MALFORMED', error: 'Incomplete visitor session token payload.' };
  }

  if (Date.now() > payload.exp) {
    return { valid: false, code: 'TOKEN_EXPIRED', error: 'Visitor session token has expired.' };
  }

  if (expected) {
    if (expected.tenant_id && payload.tenant_id !== expected.tenant_id) {
      return { valid: false, code: 'UNAUTHORIZED_OWNERSHIP', error: 'Token tenant mismatch.' };
    }
    if (expected.widget_id && payload.widget_id && payload.widget_id !== expected.widget_id) {
      return { valid: false, code: 'UNAUTHORIZED_OWNERSHIP', error: 'Token widget mismatch.' };
    }
    if (expected.visitor_id && payload.visitor_id !== expected.visitor_id) {
      return { valid: false, code: 'UNAUTHORIZED_OWNERSHIP', error: 'Token visitor mismatch.' };
    }
    if (expected.conversation_id && payload.conversation_id !== expected.conversation_id) {
      return { valid: false, code: 'UNAUTHORIZED_OWNERSHIP', error: 'Token conversation mismatch.' };
    }
  }

  return { valid: true, payload };
}
