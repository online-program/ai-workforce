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
const EPHEMERAL_FALLBACK_SECRET = crypto.randomBytes(32).toString('hex');
let warnedMissingProdSecret = false;

export function isVisitorSessionSecretConfigured(): boolean {
  const configured = (process.env.VISITOR_SESSION_SECRET || process.env.SESSION_SECRET || '').trim();
  return configured.length >= 32;
}

function getSigningSecret(): string {
  const configured = (process.env.VISITOR_SESSION_SECRET || process.env.SESSION_SECRET || '').trim();
  if (process.env.NODE_ENV === 'production') {
    if (configured.length > 0 && configured.length < 32) {
      throw new Error(
        '[SECURITY] Configured VISITOR_SESSION_SECRET must be at least 32 characters in production.'
      );
    }
    if (!configured) {
      if (!warnedMissingProdSecret) {
        warnedMissingProdSecret = true;
        console.warn(
          '[SECURITY WARNING] VISITOR_SESSION_SECRET is unset in production. Using a cryptographically random per-boot signing secret; set VISITOR_SESSION_SECRET (32+ chars) for session persistence across restarts.'
        );
      }
      return EPHEMERAL_FALLBACK_SECRET;
    }
    return configured;
  }
  return configured || process.env.FIREBASE_PRIVATE_KEY || EPHEMERAL_FALLBACK_SECRET;
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
}): string {
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
  const sig = crypto.createHmac('sha256', getSigningSecret()).update(payloadB64).digest();
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
  }
): VisitorTokenVerificationResult {
  if (!token || typeof token !== 'string' || !token.trim()) {
    return { valid: false, code: 'TOKEN_MISSING', error: 'Visitor session token is required.' };
  }

  const parts = token.trim().split('.');
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    return { valid: false, code: 'TOKEN_MALFORMED', error: 'Malformed visitor session token.' };
  }

  const [payloadB64, sigB64] = parts;
  const expectedSig = crypto.createHmac('sha256', getSigningSecret()).update(payloadB64).digest();
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
