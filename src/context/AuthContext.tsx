import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
} from 'firebase/auth';
import { auth } from '../firebase.ts';
import { initializeUserWorkspace } from '../services/workspaceService.ts';

// In-memory token cache (never stored in localStorage)
let cachedAccessToken: string | null = null;

interface AuthContextType {
  user: User | null;
  loading: boolean;
  accessToken: string | null;
  isGmailConnected: boolean;
  loginWithGoogle: () => Promise<void>;
  connectGmail: () => Promise<string | null>;
  logout: () => Promise<void>;
  authError: string | null;
  clearAuthError: () => void;
  getAccessToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper to configure standard Google provider without unverified sensitive scopes
function createBasicGoogleAuthProvider() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({
    prompt: 'select_account',
  });
  return provider;
}

// Helper to configure Gmail integration provider with minimal send scope only when explicitly requested
function createGmailAuthProvider() {
  const provider = new GoogleAuthProvider();
  provider.addScope('https://www.googleapis.com/auth/gmail.send');
  provider.setCustomParameters({
    prompt: 'consent',
  });
  return provider;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    // Safety fallback: Never allow auth loading spinner to hang for more than 1.2s
    const timeoutTimer = setTimeout(() => {
      setLoading(false);
    }, 1200);

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      clearTimeout(timeoutTimer);
      setUser(currentUser);
      if (currentUser) {
        // Fire initialization asynchronously in background without blocking UI loading
        initializeUserWorkspace(currentUser.uid, currentUser.email || 'user@workspace.com').catch((err: any) => {
          console.warn('Workspace background sync deferred:', err?.message || err);
        });
      } else {
        cachedAccessToken = null;
        setAccessToken(null);
      }
      setLoading(false);
    });

    return () => {
      clearTimeout(timeoutTimer);
      unsubscribe();
    };
  }, []);

  const loginWithGoogle = async () => {
    setAuthError(null);
    try {
      const provider = createBasicGoogleAuthProvider();
      const cred = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(cred);
      const token = credential?.accessToken || null;

      if (token) {
        cachedAccessToken = token;
        setAccessToken(token);
      }

      await initializeUserWorkspace(cred.user.uid, cred.user.email || 'user@workspace.com');
    } catch (err: any) {
      const code = err?.code || '';
      // Normal intentional user actions or cancellations - do not throw or alarm user
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request' || code === 'auth/user-cancelled') {
        return;
      }
      if (code === 'auth/popup-blocked') {
        const msg = 'The sign-in popup was blocked by your browser. Please allow popups for this site.';
        setAuthError(msg);
        throw new Error(msg);
      }
      console.warn('Google Sign-in status:', err?.message || err);
      const msg = err.message || 'Google sign-in was canceled or failed.';
      setAuthError(msg);
      throw new Error(msg);
    }
  };

  const connectGmail = async (): Promise<string | null> => {
    setAuthError(null);
    try {
      const provider = createGmailAuthProvider();
      const cred = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(cred);
      const token = credential?.accessToken || null;

      if (token) {
        cachedAccessToken = token;
        setAccessToken(token);
        return token;
      }
      return null;
    } catch (err: any) {
      const code = err?.code || '';
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request' || code === 'auth/user-cancelled') {
        return null;
      }
      if (code === 'auth/popup-blocked') {
        const msg = 'The authorization popup was blocked by your browser. Please allow popups for this site.';
        setAuthError(msg);
        throw new Error(msg);
      }
      console.warn('Connect Gmail status:', err?.message || err);
      const msg = err.message || 'Gmail connection failed.';
      setAuthError(msg);
      throw new Error(msg);
    }
  };

  const getAccessToken = useCallback(async (): Promise<string | null> => {
    return cachedAccessToken;
  }, []);

  const logout = async () => {
    setAuthError(null);
    cachedAccessToken = null;
    setAccessToken(null);
    await signOut(auth);
  };

  const clearAuthError = () => setAuthError(null);

  const isGmailConnected = Boolean(accessToken);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        accessToken,
        isGmailConnected,
        loginWithGoogle,
        connectGmail,
        logout,
        authError,
        clearAuthError,
        getAccessToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
