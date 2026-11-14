import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { getAuth, Auth } from 'firebase-admin/auth';
import firebaseConfig from '../../firebase-applet-config.json' with { type: 'json' };

let adminApp: App | null = null;
let adminDb: Firestore | null = null;
let adminAuth: Auth | null = null;
let initialized = false;
let testDbOverride: Firestore | null = null;

export function hasAdminCredentials(): boolean {
  if (testDbOverride) return true;
  return Boolean(
    process.env.FIREBASE_SERVICE_ACCOUNT_KEY ||
      process.env.GOOGLE_APPLICATION_CREDENTIALS ||
      process.env.K_SERVICE ||
      process.env.GOOGLE_CLOUD_PROJECT ||
      process.env.GCLOUD_PROJECT ||
      process.env.FUNCTION_TARGET ||
      process.env.FIRESTORE_EMULATOR_HOST
  );
}

export function setAdminDbForTesting(db: Firestore | null): void {
  if (process.env.NODE_ENV !== 'test' && process.env.ALLOW_TEST_DB !== '1') {
    throw new Error('Test DB override is only permitted when NODE_ENV=test or ALLOW_TEST_DB=1');
  }
  testDbOverride = db;
}

export function initializeFirebaseAdmin(): {
  app: App | null;
  db: Firestore | null;
  auth: Auth | null;
  isAdminSdkReady: boolean;
} {
  if (testDbOverride) {
    return { app: adminApp, db: testDbOverride, auth: adminAuth, isAdminSdkReady: true };
  }

  if (initialized) {
    return { app: adminApp, db: adminDb, auth: adminAuth, isAdminSdkReady: Boolean(adminDb && hasAdminCredentials()) };
  }
  initialized = true;

  try {
    const existingApps = getApps();
    if (existingApps.length > 0) {
      adminApp = existingApps[0]!;
    } else {
      const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
      const projectId = process.env.FIREBASE_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT || firebaseConfig.projectId;

      if (serviceAccountJson) {
        const parsed = JSON.parse(serviceAccountJson);
        adminApp = initializeApp({
          credential: cert(parsed),
          projectId,
        });
      } else {
        adminApp = initializeApp({
          projectId,
        });
      }
    }

    const databaseId = (firebaseConfig as any).firestoreDatabaseId;
    adminDb =
      databaseId && databaseId !== '(default)'
        ? getFirestore(adminApp, databaseId)
        : getFirestore(adminApp);
    adminAuth = getAuth(adminApp);

    if (hasAdminCredentials()) {
      console.log(
        `[FirebaseAdmin] Initialized with Admin SDK for project=${firebaseConfig.projectId} db=${databaseId || '(default)'}`
      );
    } else {
      console.warn(
        '[FirebaseAdmin] No Admin SDK credentials detected in environment; Firestore writes/reads may fail with PERMISSION_DENIED.'
      );
    }
  } catch (err: any) {
    console.warn(`[FirebaseAdmin] Admin SDK initialization notice: ${err?.message || err}`);
  }

  return { app: adminApp, db: adminDb, auth: adminAuth, isAdminSdkReady: Boolean(adminDb && hasAdminCredentials()) };
}

export function getAdminDb(): Firestore {
  if (testDbOverride) {
    return testDbOverride;
  }
  const { db } = initializeFirebaseAdmin();
  if (!db) {
    throw new Error('Firebase Admin Firestore is not initialized.');
  }
  return db;
}

export function getAdminAuth(): Auth | null {
  const { auth } = initializeFirebaseAdmin();
  return auth;
}

export async function probeAdminFirestore(timeoutMs = 2500): Promise<{
  ok: boolean;
  latencyMs: number;
  error?: string;
}> {
  const start = Date.now();
  try {
    const db = getAdminDb();
    await Promise.race([
      db.collection('system_health_probes').limit(1).get(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`Firestore probe timed out after ${timeoutMs}ms`)), timeoutMs)
      ),
    ]);
    return { ok: true, latencyMs: Date.now() - start };
  } catch (err: any) {
    return {
      ok: false,
      latencyMs: Date.now() - start,
      error: err?.message || String(err),
    };
  }
}
