import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { getAdminDb, getAdminAuth, hasAdminCredentials } from './firebaseAdmin.ts';
import firebaseConfig from '../../firebase-applet-config.json' with { type: 'json' };
import { recordAuditLog } from './adminAuditService.ts';

export type AdminRole = 'CEO' | 'SUPER_ADMIN' | 'ADMIN' | 'CMO' | 'SUPPORT_ADMIN' | 'ANALYST' | 'USER';

export type AdminPermission =
  | 'admin.dashboard.view'
  | 'admin.users.view'
  | 'admin.users.manage'
  | 'admin.companies.view'
  | 'admin.companies.manage'
  | 'admin.widgets.view'
  | 'admin.widgets.manage'
  | 'admin.conversations.view'
  | 'admin.conversations.manage'
  | 'admin.inquiries.view'
  | 'admin.inquiries.manage'
  | 'admin.analytics.view'
  | 'admin.marketing.view'
  | 'admin.marketing.manage'
  | 'admin.system_health.view'
  | 'admin.security.view'
  | 'admin.security.manage'
  | 'admin.audit_logs.view'
  | 'admin.team.view'
  | 'admin.team.invite'
  | 'admin.team.role_change'
  | 'admin.team.dismiss'
  | 'admin.billing.view'
  | 'admin.platform_settings.manage'
  | 'admin.ceo.manage'
  | 'admin.super_admin.manage'
  // Legacy camelCase support
  | 'canViewAnalytics'
  | 'canViewCompanies'
  | 'canViewUsers'
  | 'canViewWidgets'
  | 'canViewConversations'
  | 'canViewInquiries'
  | 'canViewErrors'
  | 'canViewHealth'
  | 'canViewSecurity'
  | 'canViewAuditLogs'
  | 'canManageAdmins'
  | 'canPerformDestructive'
  | 'canConfigurePlatform'
  | 'canViewLiveActivity';

export interface AdminUserRecord {
  uid: string;
  email: string;
  role: AdminRole;
  displayName?: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'REVOKED';
  assignedBy?: string;
  assignedAt: string;
  lastActiveAt?: string;
  notes?: string;
}

export interface AdminAssignmentRecord {
  id: string;
  email: string;
  role: AdminRole;
  invitedByUid: string;
  invitedByEmail: string;
  invitedByRole?: AdminRole;
  status: 'PENDING' | 'CLAIMED' | 'CANCELLED';
  createdAt: string;
  updatedAt?: string;
  claimedAt?: string;
  claimedByUid?: string;
  claimedByEmail?: string;
  cancelledAt?: string;
  cancelledByEmail?: string;
  cancelledByUid?: string;
  displayName?: string;
  notes?: string;
}

export interface AdminInvitationRecord {
  id: string;
  email: string;
  role: AdminRole;
  invitedByEmail: string;
  invitedByUid: string;
  invitedByRole?: AdminRole;
  invitedAt: string;
  expiresAt: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'REVOKED' | 'EXPIRED';
  acceptedAt?: string;
  acceptedByUid?: string;
  rejectedAt?: string;
  revokedAt?: string;
  revokedBy?: string;
  displayName?: string;
  notes?: string;
}

export interface AuthenticatedAdminRequest extends Request {
  admin?: {
    uid: string;
    email: string;
    role: AdminRole;
    emailVerified: boolean;
  };
}

// Authority Rank: Lower number = Higher Authority
export const ROLE_RANK: Record<AdminRole, number> = {
  CEO: 1,
  SUPER_ADMIN: 2,
  ADMIN: 3,
  CMO: 4,
  SUPPORT_ADMIN: 5,
  ANALYST: 6,
  USER: 7,
};

// Target-Hierarchy Evaluation Rules
export function canActOnTargetRole(callerRole: AdminRole, targetRole: AdminRole): boolean {
  if (callerRole === 'CEO') return true;
  if (targetRole === 'CEO') return false; // Non-CEO cannot act on CEO
  if (callerRole === 'SUPER_ADMIN') {
    return true; // Super Admin can manage Super Admins and lower tiers
  }
  // Strictly higher authority (strictly lower rank number)
  return ROLE_RANK[callerRole] < ROLE_RANK[targetRole];
}

export function canInviteRole(callerRole: AdminRole, roleToInvite: AdminRole): boolean {
  if (roleToInvite === 'CEO' || roleToInvite === 'USER') {
    return false; // CEO cannot be invited via standard invite, USER is non-admin
  }
  if (callerRole === 'CEO') {
    return true; // CEO can invite SUPER_ADMIN, ADMIN, CMO, SUPPORT_ADMIN, ANALYST
  }
  if (callerRole === 'SUPER_ADMIN') {
    return ROLE_RANK[roleToInvite] >= 2; // Super Admin can invite SUPER_ADMIN (2), ADMIN (3), CMO (4), SUPPORT_ADMIN (5), ANALYST (6)
  }
  if (callerRole === 'ADMIN') {
    return ROLE_RANK[roleToInvite] >= 4; // Admin can invite CMO, SUPPORT_ADMIN, ANALYST
  }
  return false;
}

// In-memory synchronized store for instant authorization checks
const adminRoleStore = new Map<string, AdminUserRecord>();
const emailToUidMap = new Map<string, string>();
const adminInvitationsStore = new Map<string, AdminInvitationRecord>();
const adminAssignmentsStore = new Map<string, AdminAssignmentRecord>();

// Designated primary platform bootstrap accounts
const BOOTSTRAP_CEO_EMAILS = new Set<string>([
  'malikaayush200@gmail.com',
]);

// Bounded rate limiter storage for sensitive operations
interface RateLimitEntry {
  count: number;
  resetAt: number;
}
const MAX_RATE_LIMIT_ENTRIES = 5000;
const rateLimitMap = new Map<string, RateLimitEntry>();

export function checkRateLimit(key: string, maxRequests: number, windowSeconds: number): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(key);

  if (!entry || now > entry.resetAt) {
    if (rateLimitMap.size >= MAX_RATE_LIMIT_ENTRIES) {
      for (const [k, v] of rateLimitMap.entries()) {
        if (now > v.resetAt) {
          rateLimitMap.delete(k);
        }
      }
      if (rateLimitMap.size >= MAX_RATE_LIMIT_ENTRIES) {
        const overflow = rateLimitMap.size - Math.floor(MAX_RATE_LIMIT_ENTRIES * 0.8);
        let removed = 0;
        for (const k of rateLimitMap.keys()) {
          rateLimitMap.delete(k);
          if (++removed >= overflow) break;
        }
      }
    }
    rateLimitMap.set(key, { count: 1, resetAt: now + windowSeconds * 1000 });
    return { allowed: true };
  }

  if (entry.count >= maxRequests) {
    return { allowed: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000) };
  }

  entry.count += 1;
  return { allowed: true };
}

// Central Role Permissions Matrix
export const ROLE_PERMISSIONS: Record<AdminRole, Record<string, boolean>> = {
  CEO: {
    // Granular permissions
    'admin.dashboard.view': true,
    'admin.users.view': true,
    'admin.users.manage': true,
    'admin.companies.view': true,
    'admin.companies.manage': true,
    'admin.widgets.view': true,
    'admin.widgets.manage': true,
    'admin.conversations.view': true,
    'admin.conversations.manage': true,
    'admin.inquiries.view': true,
    'admin.inquiries.manage': true,
    'admin.analytics.view': true,
    'admin.marketing.view': true,
    'admin.marketing.manage': true,
    'admin.system_health.view': true,
    'admin.security.view': true,
    'admin.security.manage': true,
    'admin.audit_logs.view': true,
    'admin.team.view': true,
    'admin.team.invite': true,
    'admin.team.role_change': true,
    'admin.team.dismiss': true,
    'admin.billing.view': true,
    'admin.platform_settings.manage': true,
    'admin.ceo.manage': true,
    'admin.super_admin.manage': true,
    // Legacy support
    canViewAnalytics: true,
    canViewLiveActivity: true,
    canViewUsers: true,
    canViewCompanies: true,
    canViewWidgets: true,
    canViewConversations: true,
    canViewInquiries: true,
    canViewErrors: true,
    canViewHealth: true,
    canViewSecurity: true,
    canViewAuditLogs: true,
    canManageAdmins: true,
    canPerformDestructive: true,
    canConfigurePlatform: true,
  },
  SUPER_ADMIN: {
    'admin.dashboard.view': true,
    'admin.users.view': true,
    'admin.users.manage': true,
    'admin.companies.view': true,
    'admin.companies.manage': true,
    'admin.widgets.view': true,
    'admin.widgets.manage': true,
    'admin.conversations.view': true,
    'admin.conversations.manage': true,
    'admin.inquiries.view': true,
    'admin.inquiries.manage': true,
    'admin.analytics.view': true,
    'admin.marketing.view': true,
    'admin.marketing.manage': true,
    'admin.system_health.view': true,
    'admin.security.view': true,
    'admin.security.manage': true,
    'admin.audit_logs.view': true,
    'admin.team.view': true,
    'admin.team.invite': true,
    'admin.team.role_change': true,
    'admin.team.dismiss': true,
    'admin.billing.view': true,
    'admin.platform_settings.manage': true,
    'admin.ceo.manage': false,
    'admin.super_admin.manage': true,
    // Legacy support
    canViewAnalytics: true,
    canViewLiveActivity: true,
    canViewUsers: true,
    canViewCompanies: true,
    canViewWidgets: true,
    canViewConversations: true,
    canViewInquiries: true,
    canViewErrors: true,
    canViewHealth: true,
    canViewSecurity: true,
    canViewAuditLogs: true,
    canManageAdmins: true,
    canPerformDestructive: true,
    canConfigurePlatform: true,
  },
  ADMIN: {
    'admin.dashboard.view': true,
    'admin.users.view': true,
    'admin.users.manage': true,
    'admin.companies.view': true,
    'admin.companies.manage': true,
    'admin.widgets.view': true,
    'admin.widgets.manage': true,
    'admin.conversations.view': true,
    'admin.conversations.manage': true,
    'admin.inquiries.view': true,
    'admin.inquiries.manage': true,
    'admin.analytics.view': true,
    'admin.marketing.view': true,
    'admin.marketing.manage': false,
    'admin.system_health.view': true,
    'admin.security.view': false,
    'admin.security.manage': false,
    'admin.audit_logs.view': true,
    'admin.team.view': true,
    'admin.team.invite': true, // can invite CMO, SUPPORT_ADMIN, ANALYST
    'admin.team.role_change': true,
    'admin.team.dismiss': true,
    'admin.billing.view': true,
    'admin.platform_settings.manage': false,
    'admin.ceo.manage': false,
    'admin.super_admin.manage': false,
    // Legacy support
    canViewAnalytics: true,
    canViewLiveActivity: true,
    canViewUsers: true,
    canViewCompanies: true,
    canViewWidgets: true,
    canViewConversations: true,
    canViewInquiries: true,
    canViewErrors: true,
    canViewHealth: true,
    canViewSecurity: false,
    canViewAuditLogs: true,
    canManageAdmins: true,
    canPerformDestructive: false,
    canConfigurePlatform: false,
  },
  CMO: {
    'admin.dashboard.view': true,
    'admin.users.view': false,
    'admin.users.manage': false,
    'admin.companies.view': true,
    'admin.companies.manage': false,
    'admin.widgets.view': true,
    'admin.widgets.manage': false,
    'admin.conversations.view': false,
    'admin.conversations.manage': false,
    'admin.inquiries.view': true,
    'admin.inquiries.manage': false,
    'admin.analytics.view': true,
    'admin.marketing.view': true,
    'admin.marketing.manage': true,
    'admin.system_health.view': false,
    'admin.security.view': false,
    'admin.security.manage': false,
    'admin.audit_logs.view': false,
    'admin.team.view': false,
    'admin.team.invite': false,
    'admin.team.role_change': false,
    'admin.team.dismiss': false,
    'admin.billing.view': false,
    'admin.platform_settings.manage': false,
    'admin.ceo.manage': false,
    'admin.super_admin.manage': false,
    // Legacy support
    canViewAnalytics: true,
    canViewLiveActivity: false,
    canViewUsers: false,
    canViewCompanies: true,
    canViewWidgets: true,
    canViewConversations: false,
    canViewInquiries: true,
    canViewErrors: false,
    canViewHealth: false,
    canViewSecurity: false,
    canViewAuditLogs: false,
    canManageAdmins: false,
    canPerformDestructive: false,
    canConfigurePlatform: false,
  },
  SUPPORT_ADMIN: {
    'admin.dashboard.view': true,
    'admin.users.view': true,
    'admin.users.manage': false,
    'admin.companies.view': true,
    'admin.companies.manage': false,
    'admin.widgets.view': true,
    'admin.widgets.manage': false,
    'admin.conversations.view': true,
    'admin.conversations.manage': true,
    'admin.inquiries.view': true,
    'admin.inquiries.manage': true,
    'admin.analytics.view': false,
    'admin.marketing.view': false,
    'admin.marketing.manage': false,
    'admin.system_health.view': false,
    'admin.security.view': false,
    'admin.security.manage': false,
    'admin.audit_logs.view': false,
    'admin.team.view': false,
    'admin.team.invite': false,
    'admin.team.role_change': false,
    'admin.team.dismiss': false,
    'admin.billing.view': false,
    'admin.platform_settings.manage': false,
    'admin.ceo.manage': false,
    'admin.super_admin.manage': false,
    // Legacy support
    canViewAnalytics: false,
    canViewLiveActivity: true,
    canViewUsers: true,
    canViewCompanies: true,
    canViewWidgets: true,
    canViewConversations: true,
    canViewInquiries: true,
    canViewErrors: false,
    canViewHealth: false,
    canViewSecurity: false,
    canViewAuditLogs: false,
    canManageAdmins: false,
    canPerformDestructive: false,
    canConfigurePlatform: false,
  },
  ANALYST: {
    'admin.dashboard.view': true,
    'admin.users.view': false,
    'admin.users.manage': false,
    'admin.companies.view': false,
    'admin.companies.manage': false,
    'admin.widgets.view': false,
    'admin.widgets.manage': false,
    'admin.conversations.view': false,
    'admin.conversations.manage': false,
    'admin.inquiries.view': false,
    'admin.inquiries.manage': false,
    'admin.analytics.view': true,
    'admin.marketing.view': true,
    'admin.marketing.manage': false,
    'admin.system_health.view': true,
    'admin.security.view': false,
    'admin.security.manage': false,
    'admin.audit_logs.view': false,
    'admin.team.view': false,
    'admin.team.invite': false,
    'admin.team.role_change': false,
    'admin.team.dismiss': false,
    'admin.billing.view': false,
    'admin.platform_settings.manage': false,
    'admin.ceo.manage': false,
    'admin.super_admin.manage': false,
    // Legacy support
    canViewAnalytics: true,
    canViewLiveActivity: true,
    canViewUsers: false,
    canViewCompanies: false,
    canViewWidgets: false,
    canViewConversations: false,
    canViewInquiries: false,
    canViewErrors: false,
    canViewHealth: true,
    canViewSecurity: false,
    canViewAuditLogs: false,
    canManageAdmins: false,
    canPerformDestructive: false,
    canConfigurePlatform: false,
  },
  USER: {
    'admin.dashboard.view': false,
    'admin.users.view': false,
    'admin.users.manage': false,
    'admin.companies.view': false,
    'admin.companies.manage': false,
    'admin.widgets.view': false,
    'admin.widgets.manage': false,
    'admin.conversations.view': false,
    'admin.conversations.manage': false,
    'admin.inquiries.view': false,
    'admin.inquiries.manage': false,
    'admin.analytics.view': false,
    'admin.marketing.view': false,
    'admin.marketing.manage': false,
    'admin.system_health.view': false,
    'admin.security.view': false,
    'admin.security.manage': false,
    'admin.audit_logs.view': false,
    'admin.team.view': false,
    'admin.team.invite': false,
    'admin.team.role_change': false,
    'admin.team.dismiss': false,
    'admin.billing.view': false,
    'admin.platform_settings.manage': false,
    'admin.ceo.manage': false,
    'admin.super_admin.manage': false,
    // Legacy support
    canViewAnalytics: false,
    canViewLiveActivity: false,
    canViewUsers: false,
    canViewCompanies: false,
    canViewWidgets: false,
    canViewConversations: false,
    canViewInquiries: false,
    canViewErrors: false,
    canViewHealth: false,
    canViewSecurity: false,
    canViewAuditLogs: false,
    canManageAdmins: false,
    canPerformDestructive: false,
    canConfigurePlatform: false,
  },
};

// Initialize system admin store from Admin Firestore and bootstrap configs
export async function initializeAdminStore(): Promise<void> {
  if (!hasAdminCredentials()) {
    console.log('[AdminAuth] Admin SDK credentials unavailable; skipping initial Firestore admin store hydration.');
    return;
  }
  try {
    const db = getAdminDb();
    // 1. Fetch persistent system admins from Firestore
    const snapshot = await db.collection('system_admins').get().catch((err) => {
      console.warn('Notice: System admins collection read in initial boot:', err?.message || err);
      return null;
    });

    if (snapshot) {
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as any;
        if (data && data.role) {
          let normalizedRole: AdminRole = data.role;
          if (data.role === 'SUPPORT') normalizedRole = 'SUPPORT_ADMIN';

          adminRoleStore.set(docSnap.id, {
            ...data,
            uid: docSnap.id,
            role: normalizedRole,
          });
          if (data.email) {
            emailToUidMap.set(String(data.email).toLowerCase(), docSnap.id);
          }
        }
      });
    }

    // 2. Fetch persistent admin assignments from Firestore
    const assignmentsSnapshot = await db.collection('system_admin_assignments').get().catch((err) => {
      console.warn('Notice: System admin assignments collection read in initial boot:', err?.message || err);
      return null;
    });

    if (assignmentsSnapshot) {
      assignmentsSnapshot.forEach((docSnap) => {
        const data = docSnap.data() as any;
        if (data && data.id && data.email) {
          let normalizedRole: AdminRole = data.role;
          if (data.role === 'SUPPORT') normalizedRole = 'SUPPORT_ADMIN';

          adminAssignmentsStore.set(data.id, {
            ...data,
            role: normalizedRole,
          });
        }
      });
    }

    // 3. Fetch persistent legacy admin invitations for backward compatibility
    const invitesSnapshot = await db.collection('system_admin_invitations').get().catch((err) => {
      console.warn('Notice: System admin invitations collection read in initial boot:', err?.message || err);
      return null;
    });

    if (invitesSnapshot) {
      invitesSnapshot.forEach((docSnap) => {
        const data = docSnap.data() as any;
        if (data && data.id && data.email) {
          let normalizedRole: AdminRole = data.role;
          if (data.role === 'SUPPORT') normalizedRole = 'SUPPORT_ADMIN';

          adminInvitationsStore.set(data.id, {
            ...data,
            role: normalizedRole,
          });

          if (!adminAssignmentsStore.has(data.id) && data.status === 'PENDING') {
            adminAssignmentsStore.set(data.id, {
              id: data.id,
              email: String(data.email).toLowerCase(),
              role: normalizedRole,
              invitedByUid: data.invitedByUid || 'system',
              invitedByEmail: data.invitedByEmail || 'system',
              invitedByRole: data.invitedByRole,
              status: 'PENDING',
              createdAt: data.invitedAt || new Date().toISOString(),
              displayName: data.displayName,
              notes: data.notes,
            });
          }
        }
      });
    }

    console.log(`System Admin Store initialized with ${adminRoleStore.size} persistent admins, ${adminAssignmentsStore.size} assignments, and ${adminInvitationsStore.size} legacy invitations.`);
  } catch (err) {
    console.warn('System Admin Store initial sync notice:', err);
  }
}

// Explicit Test Token Registry (strictly gated to test environments)
const testTokenRegistry = new Map<string, { uid: string; email: string; email_verified: boolean; expiresAt?: number }>();

function isTestTokenEnvAllowed(): boolean {
  return process.env.NODE_ENV === 'test' || process.env.ALLOW_TEST_TOKENS === '1';
}

export function registerTestToken(token: string, user: { uid: string; email: string; email_verified: boolean; expiresAt?: number }) {
  if (!isTestTokenEnvAllowed()) {
    throw new Error('registerTestToken is only permitted when NODE_ENV=test or ALLOW_TEST_TOKENS=1');
  }
  testTokenRegistry.set(token, user);
}

export function clearTestTokens() {
  testTokenRegistry.clear();
}

export function clearAdminRoleCacheForTesting() {
  if (!isTestTokenEnvAllowed()) {
    throw new Error('clearAdminRoleCacheForTesting is only permitted in test mode');
  }
  adminRoleStore.clear();
  emailToUidMap.clear();
  adminAssignmentsStore.clear();
  adminInvitationsStore.clear();
}

// Helper: Authoritatively verify Firebase ID Token via Admin Auth (with revocation check) or Google Identity Toolkit
export async function verifyFirebaseIdToken(idToken: string): Promise<{ uid: string; email: string; email_verified: boolean } | null> {
  if (!idToken || typeof idToken !== 'string' || idToken.trim().length < 10) {
    return null;
  }

  const cleanToken = idToken.trim();

  // 1. Registered test token registry (strictly gated to test environments)
  if (isTestTokenEnvAllowed() && testTokenRegistry.has(cleanToken)) {
    const testEntry = testTokenRegistry.get(cleanToken)!;
    if (testEntry.expiresAt && testEntry.expiresAt < Date.now()) {
      return null;
    }
    return {
      uid: testEntry.uid,
      email: testEntry.email,
      email_verified: testEntry.email_verified,
    };
  }

  // 2. Token structural validation & expiration check
  const parts = cleanToken.split('.');
  if (parts.length !== 3) {
    return null;
  }

  try {
    const payloadBase64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const payloadJson = Buffer.from(payloadBase64, 'base64').toString('utf8');
    const claims = JSON.parse(payloadJson);

    const now = Math.floor(Date.now() / 1000);
    if (claims.exp && claims.exp < now) {
      return null;
    }
    if (claims.aud && claims.aud !== firebaseConfig.projectId) {
      return null;
    }
  } catch {
    return null;
  }

  // 3. Firebase Admin Auth signature + revocation check (when Admin credentials available)
  if (hasAdminCredentials()) {
    try {
      const adminAuth = getAdminAuth();
      if (adminAuth) {
        const decoded = await adminAuth.verifyIdToken(cleanToken, true);
        if (decoded && decoded.uid) {
          return {
            uid: decoded.uid,
            email: (decoded.email || '').toLowerCase(),
            email_verified: decoded.email_verified === true,
          };
        }
      }
    } catch (adminErr: any) {
      const code = adminErr?.code || '';
      if (code.startsWith('auth/')) {
        // Explicit Firebase Auth rejection (expired, revoked, invalid signature)
        return null;
      }
      // Otherwise fall through to Identity Toolkit REST verification
    }
  }

  // 4. Cryptographic Verification with Google Identity Toolkit REST API
  try {
    const apiKey = firebaseConfig.apiKey;
    if (apiKey) {
      const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: cleanToken }),
      });

      if (response.ok) {
        const data = (await response.json()) as any;
        if (data && data.users && data.users[0]) {
          const userObj = data.users[0];
          if (userObj.disabled === true) {
            return null;
          }
          return {
            uid: userObj.localId,
            email: (userObj.email || '').toLowerCase(),
            email_verified: userObj.emailVerified === true,
          };
        }
      } else {
        return null;
      }
    }
  } catch (apiErr) {
    console.warn('Identity toolkit cryptographic verification notice:', apiErr);
    return null;
  }

  return null;
}

// Resolve user's authoritative admin role (Always verifies fresh status from Firestore when available; fail-closed -> 'USER')
export async function getAuthoritativeUserRole(uid: string, email?: string): Promise<AdminRole> {
  const cleanUid = uid?.trim();
  const cleanEmail = email?.trim().toLowerCase();

  if (!cleanUid) {
    return 'USER';
  }

  const db = getAdminDb();

  // 1. Check authoritative Firestore record FIRST so revocations/suspensions take immediate effect across instances
  if (hasAdminCredentials()) {
    try {
      const docSnap = await db.collection('system_admins').doc(cleanUid).get();
      if (docSnap.exists) {
        const data = docSnap.data() as any;
        let role: AdminRole = data?.role || 'USER';
        if ((role as string) === 'SUPPORT') role = 'SUPPORT_ADMIN';
        const status: 'ACTIVE' | 'SUSPENDED' | 'REVOKED' = data?.status || 'REVOKED';
        const rec: AdminUserRecord = { ...data, uid: cleanUid, role, status };
        adminRoleStore.set(cleanUid, rec);
        if (data?.email) {
          emailToUidMap.set(String(data.email).toLowerCase(), cleanUid);
        }
        return status === 'ACTIVE' ? role : 'USER';
      } else if (adminRoleStore.has(cleanUid)) {
        // Record removed from Firestore -> revoke in-memory entry
        const existingMem = adminRoleStore.get(cleanUid)!;
        if (existingMem.status !== 'REVOKED') {
          existingMem.status = 'REVOKED';
        }
        return 'USER';
      }
    } catch (err: any) {
      if (err?.code !== 7 && !String(err?.message || '').includes('PERMISSION_DENIED')) {
        console.warn('[AdminAuth] Firestore role check notice:', err?.message || err);
      }
    }
  }

  // 2. Check in-memory store ONLY if it still says REVOKED/SUSPENDED or when Admin DB unavailable
  if (adminRoleStore.has(cleanUid)) {
    const rec = adminRoleStore.get(cleanUid)!;
    if (rec.status === 'ACTIVE') {
      return rec.role;
    }
    return 'USER';
  }

  // 3. Check if this is the designated platform CEO bootstrap email (only when no existing non-ACTIVE doc was found)
  if (cleanEmail && BOOTSTRAP_CEO_EMAILS.has(cleanEmail)) {
    const autoCeo: AdminUserRecord = {
      uid: cleanUid,
      email: cleanEmail,
      role: 'CEO',
      status: 'ACTIVE',
      assignedBy: 'SYSTEM_BOOTSTRAP',
      assignedAt: new Date().toISOString(),
      displayName: cleanEmail.split('@')[0],
      notes: 'Initial Provisioned Platform CEO (Highest Authority)',
    };

    adminRoleStore.set(cleanUid, autoCeo);
    emailToUidMap.set(cleanEmail, cleanUid);
    if (hasAdminCredentials()) {
      try {
        await db.collection('system_admins').doc(cleanUid).set(autoCeo, { merge: true });
      } catch {}
    }

    return 'CEO';
  }

  // 4. Check for PENDING admin assignment for this verified Google email (Firestore first, then memory)
  if (cleanEmail) {
    if (hasAdminCredentials()) {
      try {
        const assignSnap = await db
          .collection('system_admin_assignments')
          .where('email', '==', cleanEmail)
          .where('status', '==', 'PENDING')
          .limit(5)
          .get();
        assignSnap.forEach((docSnap) => {
          const data = docSnap.data() as AdminAssignmentRecord;
          if (data && data.id) {
            adminAssignmentsStore.set(data.id, data);
          }
        });
      } catch {}
    }

    for (const assign of adminAssignmentsStore.values()) {
      if (assign.email.toLowerCase() === cleanEmail && assign.status === 'PENDING') {
        const assignedRole = assign.role;

        let shouldUpgrade = true;
        if (adminRoleStore.has(cleanUid)) {
          const currentRec = adminRoleStore.get(cleanUid)!;
          if (currentRec.status === 'ACTIVE' && ROLE_RANK[currentRec.role] <= ROLE_RANK[assignedRole]) {
            shouldUpgrade = false;
          }
        }

        if (shouldUpgrade) {
          const claimedRecord: AdminUserRecord = {
            uid: cleanUid,
            email: cleanEmail,
            role: assignedRole,
            displayName: assign.displayName || cleanEmail.split('@')[0],
            status: 'ACTIVE',
            assignedBy: assign.invitedByEmail || assign.invitedByUid,
            assignedAt: new Date().toISOString(),
            notes: assign.notes ? `Claimed role assignment: ${assign.notes}` : `Claimed pending assignment ${assign.id}`,
          };

          adminRoleStore.set(cleanUid, claimedRecord);
          emailToUidMap.set(cleanEmail, cleanUid);
          if (hasAdminCredentials()) {
            try {
              await db.collection('system_admins').doc(cleanUid).set(claimedRecord, { merge: true });
            } catch {}
          }
        }

        assign.status = 'CLAIMED';
        assign.claimedAt = new Date().toISOString();
        assign.claimedByUid = cleanUid;
        assign.claimedByEmail = cleanEmail;
        adminAssignmentsStore.set(assign.id, assign);
        if (hasAdminCredentials()) {
          try {
            await db.collection('system_admin_assignments').doc(assign.id).set(assign, { merge: true });
          } catch {}
        }

        recordAuditLog({
          adminUid: cleanUid,
          adminEmail: cleanEmail,
          adminRole: assignedRole,
          action: 'CLAIM_ADMIN_ASSIGNMENT',
          targetResource: `SYSTEM_ADMIN:${cleanEmail}`,
          targetId: assign.id,
          result: 'SUCCESS',
          details: { email: cleanEmail, role: assignedRole, assignedBy: assign.invitedByEmail },
        });

        if (shouldUpgrade) {
          return assignedRole;
        }
      }
    }
  }

  return 'USER';
}

export interface RequestContext {
  uid: string;
  email: string;
  role: AdminRole;
  authVerified: boolean;
  tenantId: string;
}

export interface AuthenticatedUserRequest extends Request {
  userContext?: RequestContext;
  admin?: {
    uid: string;
    email: string;
    role: AdminRole;
    emailVerified: boolean;
  };
}

// Express Middleware: Verifies Firebase Authentication token and attaches authoritative user context
export function requireAuthenticatedUser() {
  return async (req: AuthenticatedUserRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization || (req.headers['x-admin-token'] as string);
    let token = '';

    if (authHeader && typeof authHeader === 'string') {
      if (authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7).trim();
      } else {
        token = authHeader.trim();
      }
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required. No authorization token provided.',
        code: 'UNAUTHENTICATED',
      });
    }

    const verified = await verifyFirebaseIdToken(token);
    if (!verified || !verified.uid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired authentication token.',
        code: 'INVALID_TOKEN',
      });
    }

    const role = await getAuthoritativeUserRole(verified.uid, verified.email);
    req.userContext = {
      uid: verified.uid,
      email: verified.email,
      role,
      authVerified: true,
      tenantId: verified.uid,
    };

    if (role !== 'USER') {
      req.admin = {
        uid: verified.uid,
        email: verified.email,
        role,
        emailVerified: verified.email_verified,
      };
    }

    next();
  };
}

// Express Middleware: Enforces that the authenticated user owns the target tenant/resource
export function requireTenantOwner(targetUserIdKey: string = 'user_id') {
  return async (req: AuthenticatedUserRequest, res: Response, next: NextFunction) => {
    if (!req.userContext || !req.userContext.authVerified) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required.',
        code: 'UNAUTHENTICATED',
      });
    }

    const targetUserId =
      req.params[targetUserIdKey] ||
      (req.query[targetUserIdKey] as string) ||
      (req.query['userId'] as string) ||
      (req.body && (req.body[targetUserIdKey] || req.body['userId'])) ||
      (req.headers['x-user-id'] as string);

    if (targetUserId && targetUserId.trim() !== req.userContext.uid) {
      // Super admin or CEO can manage across tenants
      if (req.userContext.role !== 'CEO' && req.userContext.role !== 'SUPER_ADMIN') {
        return res.status(403).json({
          success: false,
          error: 'Forbidden: You do not have permission to access another tenant\'s resources.',
          code: 'FORBIDDEN_CROSS_TENANT',
        });
      }
    }

    next();
  };
}

// Express Middleware: Verifies Firebase Authentication and requires admin role / permissions
export function requireAdminRole(minRoleOrPermissions?: AdminPermission | AdminRole[] | string) {
  return async (req: AuthenticatedAdminRequest, res: Response, next: NextFunction) => {
    // 1. Extract Bearer token from header
    const authHeader = req.headers.authorization || (req.headers['x-admin-token'] as string);
    let token = '';

    if (authHeader && typeof authHeader === 'string') {
      if (authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7).trim();
      } else {
        token = authHeader.trim();
      }
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required. No authorization token provided.',
        code: 'UNAUTHENTICATED',
      });
    }

    // Rate limiting per verified Express IP (avoid spoofable raw x-forwarded-for)
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
    const rateCheck = checkRateLimit(`admin_auth_${clientIp}`, 120, 60);
    if (!rateCheck.allowed) {
      return res.status(429).json({
        success: false,
        error: 'Too many requests. Please wait before retrying.',
        code: 'RATE_LIMITED',
        retryAfter: rateCheck.retryAfter,
      });
    }

    // 2. Authoritative token verification
    const verified = await verifyFirebaseIdToken(token);
    if (!verified || !verified.uid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired authentication token.',
        code: 'INVALID_TOKEN',
      });
    }

    // 3. Server-side role resolution
    const role = await getAuthoritativeUserRole(verified.uid, verified.email);

    if (role === 'USER') {
      // Reject non-admin user
      return res.status(403).json({
        success: false,
        error: 'Forbidden: You do not have permission to access the AI Workforce Admin Control Center.',
        code: 'INSUFFICIENT_PERMISSIONS',
        role: 'USER',
      });
    }

    // 4. Permission check if specified
    if (minRoleOrPermissions) {
      const userPerms = ROLE_PERMISSIONS[role] || {};

      if (Array.isArray(minRoleOrPermissions)) {
        if (!minRoleOrPermissions.includes(role)) {
          return res.status(403).json({
            success: false,
            error: `Forbidden: Action requires one of [${minRoleOrPermissions.join(', ')}] role. Your role is ${role}.`,
            code: 'INSUFFICIENT_ROLE',
          });
        }
      } else if (typeof minRoleOrPermissions === 'string') {
        const requiredPerm = minRoleOrPermissions;
        if (!userPerms[requiredPerm]) {
          return res.status(403).json({
            success: false,
            error: `Forbidden: Your role (${role}) does not have permission for '${String(requiredPerm)}'.`,
            code: 'PERMISSION_DENIED',
          });
        }
      }
    }

    // Attach verified admin context to request
    req.admin = {
      uid: verified.uid,
      email: verified.email,
      role,
      emailVerified: verified.email_verified,
    };

    next();
  };
}

// Server-side Team Management Operations with Strict Target-Hierarchy Protection
export async function assignAdminRole(params: {
  targetUid?: string;
  targetEmail: string;
  newRole: AdminRole;
  actorUid: string;
  actorEmail: string;
  actorRole: AdminRole;
  displayName?: string;
  notes?: string;
  status?: 'ACTIVE' | 'SUSPENDED' | 'REVOKED';
}): Promise<AdminUserRecord> {
  const { targetEmail, newRole, actorUid, actorEmail, actorRole, displayName, notes, status = 'ACTIVE' } = params;

  if (!targetEmail || !newRole) {
    throw new Error('targetEmail and newRole are required');
  }

  const cleanEmail = targetEmail.trim().toLowerCase();

  // Resolve target UID if not explicitly provided
  let targetUid = params.targetUid?.trim();
  if (!targetUid) {
    if (emailToUidMap.has(cleanEmail)) {
      targetUid = emailToUidMap.get(cleanEmail)!;
    } else {
      // Look up existing in adminRoleStore
      for (const [uId, adminRec] of adminRoleStore.entries()) {
        if (adminRec.email.toLowerCase() === cleanEmail) {
          targetUid = uId;
          break;
        }
      }
    }

    if (!targetUid) {
      targetUid = `usr_${cleanEmail.replace(/[^a-zA-Z0-9]/g, '_')}`;
    }
  }

  // Prevent modifying any CEO account or bootstrap CEO unless actor is CEO keeping CEO role
  const existingRole = await getAuthoritativeUserRole(targetUid, cleanEmail);
  if (BOOTSTRAP_CEO_EMAILS.has(cleanEmail) || existingRole === 'CEO') {
    if (actorRole !== 'CEO' || newRole !== 'CEO') {
      throw new Error('Permission Denied: Platform CEO ownership is immutable and cannot be demoted or replaced.');
    }
  }

  // Hierarchy verification: actor cannot assign a role equal to or higher than their own rank (unless CEO)
  if (!canActOnTargetRole(actorRole, newRole)) {
    throw new Error(`Permission Denied: Your role (${actorRole}) cannot assign or elevate to ${newRole}.`);
  }

  if (existingRole !== 'USER' && !canActOnTargetRole(actorRole, existingRole)) {
    throw new Error(`Permission Denied: Your role (${actorRole}) cannot modify an existing ${existingRole}.`);
  }

  const record: AdminUserRecord = {
    uid: targetUid,
    email: cleanEmail,
    role: newRole,
    displayName: displayName || cleanEmail.split('@')[0],
    status,
    assignedBy: actorEmail || actorUid,
    assignedAt: new Date().toISOString(),
    notes: notes || undefined,
  };

  if (newRole === 'USER') {
    record.status = 'REVOKED';
  }

  // 1. Update Firestore first
  if (hasAdminCredentials()) {
    await getAdminDb().collection('system_admins').doc(record.uid).set(record, { merge: true });
  }

  // 2. Update memory store
  adminRoleStore.set(record.uid, record);
  emailToUidMap.set(record.email, record.uid);

  return record;
}

export async function revokeAdminAccess(params: {
  targetUid: string;
  actorUid: string;
  actorEmail: string;
  actorRole: AdminRole;
}): Promise<void> {
  const { targetUid, actorUid, actorEmail, actorRole } = params;
  if (!targetUid) throw new Error('targetUid is required');

  const cleanUid = targetUid.trim();
  if (cleanUid === actorUid) {
    throw new Error('Cannot revoke your own admin account.');
  }

  const db = getAdminDb();
  let existing = adminRoleStore.get(cleanUid);

  if (!existing && hasAdminCredentials()) {
    const snap = await db.collection('system_admins').doc(cleanUid).get();
    if (snap.exists) {
      const data = snap.data() as any;
      existing = {
        ...data,
        uid: cleanUid,
        role: data?.role === 'SUPPORT' ? 'SUPPORT_ADMIN' : (data?.role || 'USER'),
        status: data?.status || 'ACTIVE',
      };
    }
  }

  if (!existing) {
    throw new Error(`Admin record '${cleanUid}' not found.`);
  }

  if (existing.email && BOOTSTRAP_CEO_EMAILS.has(existing.email.toLowerCase())) {
    throw new Error('Permission Denied: Primary platform CEO cannot be revoked.');
  }

  if (!canActOnTargetRole(actorRole, existing.role)) {
    throw new Error(`Permission Denied: Your role (${actorRole}) cannot revoke access for ${existing.role}.`);
  }

  const revokedAt = new Date().toISOString();
  existing.status = 'REVOKED';
  adminRoleStore.set(cleanUid, existing);

  if (hasAdminCredentials()) {
    await db.collection('system_admins').doc(cleanUid).set(
      {
        status: 'REVOKED',
        revokedBy: actorEmail,
        revokedAt,
      },
      { merge: true }
    );
  }
}

export async function createAdminInvitation(params: {
  email: string;
  role: AdminRole;
  actorUid: string;
  actorEmail: string;
  actorRole: AdminRole;
  displayName?: string;
  notes?: string;
}): Promise<AdminInvitationRecord> {
  const { email, role, actorUid, actorEmail, actorRole, displayName, notes } = params;
  if (!email || !role) {
    throw new Error('email and role are required for admin invitation');
  }

  if (!canInviteRole(actorRole, role)) {
    throw new Error(`Permission Denied: Your role (${actorRole}) cannot invite users into the '${role}' role.`);
  }

  const cleanEmail = email.trim().toLowerCase();
  const id = `inv_${crypto.randomUUID()}`;
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const invitation: AdminInvitationRecord = {
    id,
    email: cleanEmail,
    role,
    invitedByUid: actorUid,
    invitedByEmail: actorEmail,
    invitedByRole: actorRole,
    invitedAt: new Date().toISOString(),
    expiresAt,
    status: 'PENDING',
    displayName: displayName?.trim() || cleanEmail.split('@')[0],
    notes,
  };

  adminInvitationsStore.set(id, invitation);

  if (hasAdminCredentials()) {
    try {
      await getAdminDb().collection('system_admin_invitations').doc(id).set(invitation, { merge: true });
    } catch (err: any) {
      console.warn('Warning saving admin invitation to Firestore:', err?.message || err);
    }
  }

  return invitation;
}

export function getAdminInvitations(): AdminInvitationRecord[] {
  return Array.from(adminInvitationsStore.values()).sort(
    (a, b) => new Date(b.invitedAt).getTime() - new Date(a.invitedAt).getTime()
  );
}

export function getPendingInvitationsForEmail(email: string): AdminInvitationRecord[] {
  if (!email) return [];
  const cleanEmail = email.trim().toLowerCase();
  const now = new Date().toISOString();
  return Array.from(adminInvitationsStore.values()).filter(
    (i) => i.email.toLowerCase() === cleanEmail && i.status === 'PENDING' && i.expiresAt > now
  );
}

export async function revokeAdminInvitation(params: {
  invitationId: string;
  actorUid: string;
  actorEmail: string;
  actorRole: AdminRole;
}): Promise<void> {
  const { invitationId, actorEmail, actorRole } = params;
  const invite = adminInvitationsStore.get(invitationId);
  if (!invite) throw new Error('Invitation not found');

  if (!canActOnTargetRole(actorRole, invite.role)) {
    throw new Error(`Permission Denied: Your role (${actorRole}) cannot revoke an invitation for '${invite.role}'.`);
  }

  invite.status = 'REVOKED';
  invite.revokedAt = new Date().toISOString();
  invite.revokedBy = actorEmail;
  adminInvitationsStore.set(invitationId, invite);

  if (hasAdminCredentials()) {
    try {
      await getAdminDb().collection('system_admin_invitations').doc(invitationId).set(
        {
          status: 'REVOKED',
          revokedBy: actorEmail,
          revokedAt: invite.revokedAt,
        },
        { merge: true }
      );
    } catch (err: any) {
      console.warn('Warning updating revoked invitation in Firestore:', err?.message || err);
    }
  }
}

export async function acceptAdminInvitation(params: {
  invitationId: string;
  userUid: string;
  userEmail: string;
}): Promise<AdminUserRecord> {
  const { invitationId, userUid, userEmail } = params;
  const invite = adminInvitationsStore.get(invitationId);
  if (!invite) throw new Error('Invitation not found');

  if (invite.status !== 'PENDING') {
    throw new Error(`Invitation is already ${invite.status.toLowerCase()}`);
  }

  if (invite.expiresAt && new Date(invite.expiresAt).getTime() < Date.now()) {
    invite.status = 'EXPIRED';
    adminInvitationsStore.set(invitationId, invite);
    throw new Error('This invitation has expired.');
  }

  if (invite.email.toLowerCase() !== userEmail.trim().toLowerCase()) {
    throw new Error(`Invitation was sent to ${invite.email}, but your authenticated account is ${userEmail}`);
  }

  invite.status = 'ACCEPTED';
  invite.acceptedAt = new Date().toISOString();
  invite.acceptedByUid = userUid;
  adminInvitationsStore.set(invitationId, invite);

  const adminRecord: AdminUserRecord = {
    uid: userUid.trim(),
    email: userEmail.trim().toLowerCase(),
    role: invite.role,
    displayName: invite.displayName || userEmail.split('@')[0],
    status: 'ACTIVE',
    assignedBy: invite.invitedByEmail || invite.invitedByUid,
    assignedAt: new Date().toISOString(),
    notes: `Accepted invitation ${invitationId}`,
  };

  // Persist admin record
  if (hasAdminCredentials()) {
    await getAdminDb().collection('system_admins').doc(adminRecord.uid).set(adminRecord, { merge: true });
  }
  adminRoleStore.set(adminRecord.uid, adminRecord);
  emailToUidMap.set(adminRecord.email, adminRecord.uid);

  if (hasAdminCredentials()) {
    try {
      await getAdminDb().collection('system_admin_invitations').doc(invitationId).set(invite, { merge: true });
    } catch {}
  }

  return adminRecord;
}

export async function rejectAdminInvitation(params: {
  invitationId: string;
  userUid: string;
  userEmail: string;
}): Promise<void> {
  const { invitationId, userEmail } = params;
  const invite = adminInvitationsStore.get(invitationId);
  if (!invite) throw new Error('Invitation not found');

  if (invite.email.toLowerCase() !== userEmail.trim().toLowerCase()) {
    throw new Error(`Invitation was sent to ${invite.email}, but your current account is ${userEmail}`);
  }

  invite.status = 'REJECTED';
  invite.rejectedAt = new Date().toISOString();
  adminInvitationsStore.set(invitationId, invite);

  if (hasAdminCredentials()) {
    try {
      await getAdminDb().collection('system_admin_invitations').doc(invitationId).set(invite, { merge: true });
    } catch {}
  }
}

export async function createOrUpdateAdminAssignment(params: {
  email: string;
  role: AdminRole;
  actorUid: string;
  actorEmail: string;
  actorRole: AdminRole;
  displayName?: string;
  notes?: string;
}): Promise<{ assignment: AdminAssignmentRecord; isImmediate: boolean; message: string }> {
  const { email, role, actorUid, actorEmail, actorRole, displayName, notes } = params;
  if (!email || !role) {
    throw new Error('email and role are required for admin assignment');
  }

  // Hierarchy enforcement: caller cannot assign a role higher or equal to themselves unless CEO / Super Admin hierarchy allows
  if (!canInviteRole(actorRole, role)) {
    throw new Error(`Permission Denied: Your role (${actorRole}) cannot assign users into the '${role}' role.`);
  }

  const cleanEmail = email.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(cleanEmail)) {
    throw new Error('Invalid email format. Please provide a valid email address.');
  }

  // Check if this email already belongs to an existing active administrator or registered account
  const existingUid = emailToUidMap.get(cleanEmail) || (adminRoleStore.has(cleanEmail) ? cleanEmail : null);
  if (existingUid && adminRoleStore.has(existingUid)) {
    const existingRec = adminRoleStore.get(existingUid)!;
    if (existingRec.status === 'ACTIVE') {
      // Permission check: actor must have authority to modify the existing member
      if (!canActOnTargetRole(actorRole, existingRec.role)) {
        throw new Error(`Permission Denied: Cannot modify existing team member with role '${existingRec.role}'.`);
      }

      // Assign role immediately
      await assignAdminRole({
        targetUid: existingUid,
        targetEmail: cleanEmail,
        newRole: role,
        actorUid,
        actorEmail,
        actorRole,
        displayName: displayName || existingRec.displayName,
        notes,
      });

      const assignmentId = `assign_${crypto.randomUUID()}`;
      const assignment: AdminAssignmentRecord = {
        id: assignmentId,
        email: cleanEmail,
        role,
        invitedByUid: actorUid,
        invitedByEmail: actorEmail,
        invitedByRole: actorRole,
        status: 'CLAIMED',
        createdAt: new Date().toISOString(),
        claimedAt: new Date().toISOString(),
        claimedByUid: existingUid,
        claimedByEmail: cleanEmail,
        displayName: displayName?.trim() || existingRec.displayName || cleanEmail.split('@')[0],
        notes,
      };

      adminAssignmentsStore.set(assignmentId, assignment);
      if (hasAdminCredentials()) {
        try {
          await getAdminDb().collection('system_admin_assignments').doc(assignmentId).set(assignment, { merge: true });
        } catch (err) {
          console.warn('Warning saving admin assignment to Firestore:', err);
        }
      }

      return {
        assignment,
        isImmediate: true,
        message: `Role assigned immediately to existing team member (${cleanEmail}).`,
      };
    }
  }

  // Check if there is already a PENDING assignment for this cleanEmail
  let existingAssignment: AdminAssignmentRecord | undefined;
  for (const assign of adminAssignmentsStore.values()) {
    if (assign.email.toLowerCase() === cleanEmail && assign.status === 'PENDING') {
      existingAssignment = assign;
      break;
    }
  }

  if (existingAssignment) {
    existingAssignment.role = role;
    existingAssignment.invitedByUid = actorUid;
    existingAssignment.invitedByEmail = actorEmail;
    existingAssignment.invitedByRole = actorRole;
    existingAssignment.updatedAt = new Date().toISOString();
    if (displayName) existingAssignment.displayName = displayName.trim();
    if (notes) existingAssignment.notes = notes.trim();

    adminAssignmentsStore.set(existingAssignment.id, existingAssignment);
    if (hasAdminCredentials()) {
      try {
        await getAdminDb().collection('system_admin_assignments').doc(existingAssignment.id).set(existingAssignment, { merge: true });
      } catch (err) {
        console.warn('Warning updating admin assignment in Firestore:', err);
      }
    }

    return {
      assignment: existingAssignment,
      isImmediate: false,
      message: 'Team member updated. The role will be applied when this account signs in.',
    };
  }

  // Create a new PENDING assignment
  const id = `assign_${crypto.randomUUID()}`;
  const assignment: AdminAssignmentRecord = {
    id,
    email: cleanEmail,
    role,
    invitedByUid: actorUid,
    invitedByEmail: actorEmail,
    invitedByRole: actorRole,
    status: 'PENDING',
    createdAt: new Date().toISOString(),
    displayName: displayName?.trim() || cleanEmail.split('@')[0],
    notes: notes?.trim() || undefined,
  };

  adminAssignmentsStore.set(id, assignment);
  if (hasAdminCredentials()) {
    try {
      await getAdminDb().collection('system_admin_assignments').doc(id).set(assignment, { merge: true });
    } catch (err: any) {
      console.warn('Warning saving admin assignment to Firestore:', err?.message || err);
    }
  }

  return {
    assignment,
    isImmediate: false,
    message: 'Team member added. The role will be applied when this account signs in.',
  };
}

export function getAdminAssignments(): AdminAssignmentRecord[] {
  return Array.from(adminAssignmentsStore.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export async function cancelAdminAssignment(params: {
  assignmentId: string;
  actorUid: string;
  actorEmail: string;
  actorRole: AdminRole;
}): Promise<void> {
  const { assignmentId, actorEmail, actorUid, actorRole } = params;
  const assignment = adminAssignmentsStore.get(assignmentId);
  if (!assignment) throw new Error('Assignment record not found');

  if (!canActOnTargetRole(actorRole, assignment.role)) {
    throw new Error(`Permission Denied: Your role (${actorRole}) cannot cancel an assignment for '${assignment.role}'.`);
  }

  assignment.status = 'CANCELLED';
  assignment.cancelledAt = new Date().toISOString();
  assignment.cancelledByEmail = actorEmail;
  assignment.cancelledByUid = actorUid;
  adminAssignmentsStore.set(assignmentId, assignment);

  if (hasAdminCredentials()) {
    try {
      await getAdminDb().collection('system_admin_assignments').doc(assignmentId).set(
        {
          status: 'CANCELLED',
          cancelledByEmail: actorEmail,
          cancelledByUid: actorUid,
          cancelledAt: assignment.cancelledAt,
        },
        { merge: true }
      );
    } catch (err: any) {
      console.warn('Warning updating cancelled assignment in Firestore:', err?.message || err);
    }
  }
}

export function getAllAdminUsers(): AdminUserRecord[] {
  return Array.from(adminRoleStore.values()).sort(
    (a, b) => ROLE_RANK[a.role] - ROLE_RANK[b.role]
  );
}

