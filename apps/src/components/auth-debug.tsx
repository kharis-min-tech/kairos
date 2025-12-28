"use client";

import { useAuth } from "react-oidc-context";
import { cognitoAuthConfig } from "../lib/auth-config";

export function AuthDebug() {
  const auth = useAuth();

  return (
    <div className="p-4 bg-gray-100 rounded-lg text-xs font-mono">
      <h3 className="font-bold mb-2">Debug Information:</h3>
      <div className="space-y-1">
        <div><strong>Authority:</strong> {cognitoAuthConfig.authority}</div>
        <div><strong>Client ID:</strong> {cognitoAuthConfig.client_id}</div>
        <div><strong>Redirect URI:</strong> {cognitoAuthConfig.redirect_uri}</div>
        <div><strong>Current URL:</strong> {typeof window !== 'undefined' ? window.location.href : 'N/A'}</div>
        <div><strong>Auth State:</strong> {auth.isLoading ? 'Loading' : auth.isAuthenticated ? 'Authenticated' : 'Not Authenticated'}</div>
        {auth.error && (
          <div className="text-red-600">
            <strong>Error:</strong> {auth.error.message}
            <br />
            <strong>Error Details:</strong> {JSON.stringify(auth.error, null, 2)}
          </div>
        )}
      </div>
    </div>
  );
}