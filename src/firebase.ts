import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, getFirestore, setLogLevel } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

// Silence Firestore internal gRPC idle disconnect and stream timeout notices
try {
  setLogLevel('error');
} catch {
  // Ignored in environments where setLogLevel is not permitted
}

// Suppress noisy Firestore offline/connection warnings in sandbox environment
if (typeof window !== 'undefined') {
  const originalWarn = console.warn;
  console.warn = (...args: any[]) => {
    const msg = args.map(arg => String(arg)).join(' ');
    if (msg.includes('Could not reach Cloud Firestore backend') || (msg.includes('Firestore') && msg.includes('offline'))) {
      return;
    }
    originalWarn(...args);
  };
  const originalError = console.error;
  console.error = (...args: any[]) => {
    const msg = args.map(arg => String(arg)).join(' ');
    if (msg.includes('Could not reach Cloud Firestore backend') || (msg.includes('Firestore') && msg.includes('offline mode'))) {
      return;
    }
    originalError(...args);
  };
}

// Initialize Firebase App instance safely
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Firebase Auth with email/password and Google provider support
export const auth = getAuth(app);

// Firestore instance targeting the provisioned database with robust long polling & resilience
const databaseId = (firebaseConfig as any).firestoreDatabaseId;

function getOrInitFirestore() {
  try {
    return initializeFirestore(
      app,
      {
        experimentalForceLongPolling: true,
        ignoreUndefinedProperties: true,
      },
      databaseId && databaseId !== '(default)' ? databaseId : undefined
    );
  } catch {
    return databaseId && databaseId !== '(default)'
      ? getFirestore(app, databaseId)
      : getFirestore(app);
  }
}

export const db = getOrInitFirestore();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid || null,
      email: auth?.currentUser?.email || null,
      emailVerified: auth?.currentUser?.emailVerified || null,
      isAnonymous: auth?.currentUser?.isAnonymous || null,
      tenantId: auth?.currentUser?.tenantId || null,
      providerInfo: auth?.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

