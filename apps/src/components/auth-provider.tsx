"use client";

import { AuthProvider } from "react-oidc-context";
import { cognitoAuthConfig } from "../lib/auth-config";

export function CognitoAuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider {...cognitoAuthConfig}>
      {children}
    </AuthProvider>
  );
}