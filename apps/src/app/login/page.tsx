"use client";

import { useAuth } from "react-oidc-context";
import { useState, useEffect } from "react";
import Link from "next/link";
import { cognitoDomain } from "../../lib/auth-config";
import { AuthDebug } from "../../components/auth-debug";

export default function LoginPage() {
  const auth = useAuth();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const signOutRedirect = () => {
    const clientId = "7mqmc57sb18ideegj293pk81ib";
    const logoutUri = "http://localhost:3001"; // Updated for local development
    window.location.href = `${cognitoDomain}/logout?client_id=${clientId}&logout_uri=${encodeURIComponent(logoutUri)}`;
  };

  // Don't render auth-dependent content on server
  if (!isClient) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6 bg-gray-50">
        <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="text-center">Loading...</div>
        </div>
      </main>
    );
  }

  if (auth.isLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6 bg-gray-50">
        <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="text-center">Loading authentication...</div>
          <AuthDebug />
        </div>
      </main>
    );
  }

  if (auth.error) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6 bg-gray-50">
        <div className="w-full max-w-2xl rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="text-center text-red-600 mb-4">
            <h2 className="text-lg font-semibold mb-2">Authentication Error</h2>
            <p className="text-sm">{auth.error.message}</p>
          </div>
          
          <AuthDebug />
          
          <div className="mt-4 text-center">
            <button 
              onClick={() => window.location.reload()} 
              className="mr-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Try Again
            </button>
            <button 
              onClick={() => auth.signinRedirect()} 
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Sign In Again
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (auth.isAuthenticated) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6 bg-gray-50">
        <div className="w-full max-w-2xl rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-semibold mb-6">Welcome!</h1>
          
          <div className="space-y-4">
            <div className="p-4 bg-green-50 rounded-lg">
              <h3 className="font-medium text-green-800">User Information</h3>
              <p className="text-sm text-green-700 mt-1">
                Hello: {auth.user?.profile.email}
              </p>
            </div>

            <AuthDebug />

            <div className="p-4 bg-gray-50 rounded-lg">
              <h3 className="font-medium text-gray-800 mb-2">Tokens (for debugging)</h3>
              <div className="space-y-2 text-xs font-mono">
                <div>
                  <strong>ID Token:</strong>
                  <div className="break-all bg-white p-2 rounded border mt-1">
                    {auth.user?.id_token}
                  </div>
                </div>
                <div>
                  <strong>Access Token:</strong>
                  <div className="break-all bg-white p-2 rounded border mt-1">
                    {auth.user?.access_token}
                  </div>
                </div>
                <div>
                  <strong>Refresh Token:</strong>
                  <div className="break-all bg-white p-2 rounded border mt-1">
                    {auth.user?.refresh_token}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <button 
                onClick={() => auth.removeUser()}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Sign out (Local)
              </button>
              <button 
                onClick={() => signOutRedirect()}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                Sign out (Cognito)
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-gray-50">
      <div className="w-full max-w-2xl rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold mb-1">Sign in with Cognito</h1>
        <p className="text-sm text-gray-600 mb-6">
          Click the button below to authenticate with Amazon Cognito
        </p>

        <AuthDebug />

        <div className="space-y-4 mt-6">
          <button
            onClick={() => auth.signinRedirect()}
            className="w-full rounded-xl bg-blue-600 px-4 py-3 text-white font-medium hover:bg-blue-700 active:bg-blue-800 transition-colors"
          >
            Sign in with Amazon Cognito
          </button>

          <button
            onClick={() => signOutRedirect()}
            className="w-full rounded-xl bg-gray-600 px-4 py-3 text-white font-medium hover:bg-gray-700 active:bg-gray-800 transition-colors"
          >
            Sign out (if already signed in)
          </button>
        </div>

        <p className="mt-6 text-xs text-gray-500 text-center">
          Don't have an account?{" "}
          <Link href="/signup" className="text-blue-600 hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </main>
  );
}
