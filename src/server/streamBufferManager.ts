import { PersistentConversationState } from '../types.ts';

export interface StreamBufferSession {
  conversationId: string;
  requestId: string;
  userId?: string;
  companyId: string;
  chunks: string[];
  accumulatedText: string;
  isComplete: boolean;
  isCancelled: boolean;
  createdAt: number;
  metadata?: any;
}

const activeStreamSessions = new Map<string, StreamBufferSession>();

/**
 * Builds a deterministic key for an active stream session
 */
export function buildStreamSessionKey(conversationId: string, requestId: string): string {
  return `${conversationId.trim()}::${requestId.trim()}`;
}

export class DeterministicStreamManager {
  /**
   * Initializes a new buffered streaming session.
   * Cancels any pre-existing uncompleted stream session for the same conversation ID.
   */
  static startStreamSession(params: {
    conversationId: string;
    requestId: string;
    companyId: string;
    userId?: string;
  }): StreamBufferSession {
    const { conversationId, requestId, companyId, userId } = params;

    // Purge any stale or uncompleted stream for this conversation
    for (const [key, session] of activeStreamSessions.entries()) {
      if (session.conversationId === conversationId && !session.isComplete) {
        session.isCancelled = true;
        activeStreamSessions.delete(key);
      }
    }

    const sessionKey = buildStreamSessionKey(conversationId, requestId);
    const newSession: StreamBufferSession = {
      conversationId,
      requestId,
      companyId,
      userId,
      chunks: [],
      accumulatedText: '',
      isComplete: false,
      isCancelled: false,
      createdAt: Date.now(),
    };

    activeStreamSessions.set(sessionKey, newSession);
    return newSession;
  }

  /**
   * Appends a chunk to the in-memory stream buffer.
   * Returns false if the session was cancelled or non-existent.
   */
  static appendChunk(conversationId: string, requestId: string, chunk: string): boolean {
    const sessionKey = buildStreamSessionKey(conversationId, requestId);
    const session = activeStreamSessions.get(sessionKey);
    if (!session || session.isCancelled || session.isComplete) {
      return false;
    }

    session.chunks.push(chunk);
    session.accumulatedText += chunk;
    return true;
  }

  /**
   * Cancels and purges a stream buffer session (e.g. on client abort or interrupt).
   * Ensures fragments are NEVER persisted.
   */
  static cancelStreamSession(conversationId: string, requestId: string): void {
    const sessionKey = buildStreamSessionKey(conversationId, requestId);
    const session = activeStreamSessions.get(sessionKey);
    if (session) {
      session.isCancelled = true;
      activeStreamSessions.delete(sessionKey);
    }
  }

  /**
   * Commits the stream buffer ONLY after receiving an explicit 'stream-end' completion confirmation.
   * Returns the complete verified text and metadata, or null if cancelled/invalid.
   */
  static completeStreamSession(params: {
    conversationId: string;
    requestId: string;
    verifiedReply: string;
    metadata: any;
  }): { session: StreamBufferSession; verifiedReply: string } | null {
    const { conversationId, requestId, verifiedReply, metadata } = params;
    const sessionKey = buildStreamSessionKey(conversationId, requestId);
    const session = activeStreamSessions.get(sessionKey);

    if (!session || session.isCancelled) {
      return null;
    }

    session.isComplete = true;
    session.metadata = metadata;
    session.accumulatedText = verifiedReply;

    // Purge from active memory store after completion
    activeStreamSessions.delete(sessionKey);

    return { session, verifiedReply };
  }

  /**
   * Checks if a stream session is active and valid
   */
  static isSessionActive(conversationId: string, requestId: string): boolean {
    const sessionKey = buildStreamSessionKey(conversationId, requestId);
    const session = activeStreamSessions.get(sessionKey);
    return Boolean(session && !session.isCancelled && !session.isComplete);
  }
}
