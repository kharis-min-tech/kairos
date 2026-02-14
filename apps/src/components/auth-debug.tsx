"use client";

import { useAuth } from "react-oidc-context";
import { getAuthErrorMessage } from "../lib/auth";

/**
 * Debug component — only renders in development mode.
 * Never expose auth internals (client IDs, error details) in production.
 */
export function AuthDebug() {
  // Completely hidden in production
  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  const auth = useAuth();

  return (
    <div className="p-4 bg-gray-100 rounded-lg text-xs font-mono">
      <h3 className="font-bold mb-2">Debug Information (dev only):</h3>
      <div className="space-y-1">
        <div><strong>Current URL:</strong> {typeof window !== 'undefined' ? window.location.href : 'N/A'}</div>
        <div><strong>Auth State:</strong> {auth.isLoading ? 'Loading' : auth.isAuthenticated ? 'Authenticated' : 'Not Authenticated'}</div>
        {auth.error && (
          <div className="text-red-600">
            <strong>Error:</strong> {getAuthErrorMessage(auth.error)}
          </div>
        )}
      </div>
    </div>
  );
}