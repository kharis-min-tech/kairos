"use client";

import { AuthProvider } from "react-oidc-context";
import { useEffect, useCallback, useRef } from "react";
import { useAuth } from "react-oidc-context";
import { cognitoAuthConfig } from "../lib/auth-config";

/**
 * Inner component that syncs auth state to a session cookie
 * so the server-side middleware can gate protected routes.
 */
function AuthSessionSync({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  const prevAuthenticated = useRef(false);

  useEffect(() => {
    if (auth.isAuthenticated && !prevAuthenticated.current) {
      // Set a lightweight cookie to signal "authenticated" to middleware.
      // It contains no sensitive data — just a flag.
      document.cookie = `kcms_auth_session=1; path=/; max-age=${60 * 60 * 8}; SameSite=Lax; Secure`;
    }

    if (!auth.isAuthenticated && prevAuthenticated.current) {
      // Clear the session cookie on sign-out
      document.cookie = 'kcms_auth_session=; path=/; max-age=0; SameSite=Lax; Secure';
    }

    prevAuthenticated.current = auth.isAuthenticated;
  }, [auth.isAuthenticated]);

  return <>{children}</>;
}

export function CognitoAuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider {...cognitoAuthConfig}>
      <AuthSessionSync>
        {children}
      </AuthSessionSync>
    </AuthProvider>
  );
}