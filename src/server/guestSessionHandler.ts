import { getAdminDb, hasAdminCredentials } from './firebaseAdmin.ts';

const SESSION_EXPIRATION_MS = 60 * 60 * 1000;

export interface GuestSession {
  sessionId: string;
  createdAt: string;
  expiresAt: string;
  companyBrain?: any;
  conversationHistory?: any[];
}

export const createGuestSession = async (sessionId: string): Promise<GuestSession> => {
  if (!hasAdminCredentials()) {
    throw new Error('Database service unavailable for guest sessions.');
  }
  const db = getAdminDb();
  const now = Date.now();
  const session: GuestSession = {
    sessionId,
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + SESSION_EXPIRATION_MS).toISOString(),
    conversationHistory: [],
  };
  await db.collection('guest_sessions').doc(sessionId).set(session);
  return session;
};

export const getGuestSession = async (sessionId: string): Promise<GuestSession | null> => {
  if (!hasAdminCredentials()) {
    throw new Error('Database service unavailable for guest sessions.');
  }
  const db = getAdminDb();
  const docRef = db.collection('guest_sessions').doc(sessionId);
  const docSnap = await docRef.get();

  if (!docSnap.exists) return null;

  const session = docSnap.data() as GuestSession;
  if (!session?.expiresAt || new Date().toISOString() > session.expiresAt) {
    await docRef.delete().catch(() => {});
    return null;
  }
  return session;
};

export const updateGuestBrain = async (sessionId: string, brain: any) => {
  const session = await getGuestSession(sessionId);
  if (!session) throw new Error('Guest session expired or not found.');
  const db = getAdminDb();
  await db.collection('guest_sessions').doc(sessionId).update({ companyBrain: brain });
};

export const updateGuestConversation = async (sessionId: string, history: any[]) => {
  const session = await getGuestSession(sessionId);
  if (!session) throw new Error('Guest session expired or not found.');
  const db = getAdminDb();
  await db.collection('guest_sessions').doc(sessionId).update({ conversationHistory: history });
};
