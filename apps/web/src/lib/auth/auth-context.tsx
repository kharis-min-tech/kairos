'use client';

import { createContext, useContext, useEffect, useState, useCallback, useRef, type ReactNode } from 'react';
import type { AuthUser } from './cognito';
import {
  signIn as cognitoSignIn,
  signOut as cognitoSignOut,
  getCurrentSession,
  getIdToken,
  refreshSession,
  extractUser,
} from './cognito';

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface AuthContextValue extends AuthState {
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  getToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// Refresh token 5 minutes before expiry (Cognito tokens last 1 hour by default)
const REFRESH_INTERVAL_MS = 50 * 60 * 1000;

// Dev mock user for local testing (NEXT_PUBLIC_AUTH_MOCK=true)
const MOCK_USER: AuthUser = {
  sub: 'mock-sub-001',
  email: 'admin@kairos.church',
  role: 'Admin',
  branchId: '1',
};

const IS_AUTH_MOCK = process.env.NEXT_PUBLIC_AUTH_MOCK === 'true';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: IS_AUTH_MOCK ? MOCK_USER : null,
    isAuthenticated: IS_AUTH_MOCK,
    isLoading: !IS_AUTH_MOCK,
  });
  const refreshTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startRefreshTimer = useCallback(() => {
    if (IS_AUTH_MOCK) return;
    if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
    refreshTimerRef.current = setInterval(async () => {
      const session = await refreshSession();
      if (session) {
        setState((prev) => ({ ...prev, user: extractUser(session) }));
      } else {
        setState({ user: null, isAuthenticated: false, isLoading: false });
        if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
      }
    }, REFRESH_INTERVAL_MS);
  }, []);

  const stopRefreshTimer = useCallback(() => {
    if (refreshTimerRef.current) {
      clearInterval(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
  }, []);

  // Check for existing session on mount (skip in mock mode)
  useEffect(() => {
    if (IS_AUTH_MOCK) return;
    let cancelled = false;
    (async () => {
      try {
        const session = await getCurrentSession();
        if (cancelled) return;
        if (session) {
          setState({ user: extractUser(session), isAuthenticated: true, isLoading: false });
          startRefreshTimer();
        } else {
          setState({ user: null, isAuthenticated: false, isLoading: false });
        }
      } catch {
        if (!cancelled) setState({ user: null, isAuthenticated: false, isLoading: false });
      }
    })();
    return () => {
      cancelled = true;
      stopRefreshTimer();
    };
  }, [startRefreshTimer, stopRefreshTimer]);

  const handleSignIn = useCallback(
    async (email: string, password: string) => {
      if (IS_AUTH_MOCK) {
        setState({ user: { ...MOCK_USER, email }, isAuthenticated: true, isLoading: false });
        return;
      }
      try {
        const { user } = await cognitoSignIn(email, password);
        setState({ user, isAuthenticated: true, isLoading: false });
        startRefreshTimer();
      } catch (error: any) {
        if (error?.code === 'NEW_PASSWORD_REQUIRED') {
          // Re-throw with cognitoUser attached so the login page can handle it
          throw error;
        }
        throw error;
      }
    },
    [startRefreshTimer],
  );

  const handleSignOut = useCallback(async () => {
    if (IS_AUTH_MOCK) {
      setState({ user: null, isAuthenticated: false, isLoading: false });
      return;
    }
    await cognitoSignOut();
    stopRefreshTimer();
    setState({ user: null, isAuthenticated: false, isLoading: false });
  }, [stopRefreshTimer]);

  const handleGetToken = useCallback(async () => {
    if (IS_AUTH_MOCK) return 'mock-jwt-token';
    return getIdToken();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        ...state,
        signIn: handleSignIn,
        signOut: handleSignOut,
        getToken: handleGetToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
