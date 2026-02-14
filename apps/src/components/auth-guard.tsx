"use client";

import { useCognitoAuth } from "../hooks/use-cognito-auth";
import { getAuthErrorMessage } from "../lib/auth";

interface AuthGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function AuthGuard({ children, fallback }: AuthGuardProps) {
  const { isAuthenticated, isLoading, error, signinRedirect } = useCognitoAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neutral-800 mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center text-red-600">
          <h2 className="text-lg font-semibold mb-2">Authentication Error</h2>
          <p className="text-sm mb-4">{getAuthErrorMessage(error)}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50">
        <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-sm text-center">
          <h2 className="text-xl font-semibold mb-4">Authentication Required</h2>
          <p className="text-gray-600 mb-6">Please sign in to access this page.</p>
          <button
            onClick={() => signinRedirect()}
            className="w-full rounded-xl bg-neutral-900 px-4 py-3 text-white font-medium hover:bg-neutral-800"
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}