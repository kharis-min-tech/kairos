"use client";

import { useAuth } from "react-oidc-context";
import { useState, useEffect } from "react";
import Link from "next/link";
import { cognitoDomain } from "../../lib/auth-config";
import { useCognitoAuth } from "apps/src/hooks/use-cognito-auth";

export default function LoginPage() {
  const auth = useAuth();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const { signOutComplete, signOutLocal } = useCognitoAuth();

  const signOutRedirect = () => {
    signOutComplete();
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
          
          <div className="mt-4 text-center">
            <button 
              onClick={() => window.location.reload()} 
              className="mr-2 px-4 py-2 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800"
            >
              Try Again
            </button>
            <button 
              onClick={() => auth.signinRedirect()} 
              className="px-4 py-2 border border-neutral-300 text-neutral-700 rounded-lg hover:bg-neutral-50"
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
            <div className="p-4 bg-neutral-50 rounded-lg">
              <h3 className="font-medium text-neutral-800">User Information</h3>
              <p className="text-sm text-neutral-700 mt-1">
                Hello: {auth.user?.profile.email}
              </p>
            </div>

            <div className="flex gap-4">
              <button 
                onClick={() => signOutLocal()}
                className="px-4 py-2 border border-neutral-300 text-neutral-700 rounded-lg hover:bg-neutral-50"
              >
                Sign out (Local)
              </button>
              <button 
                onClick={() => signOutComplete()}
                className="px-4 py-2 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800"
              >
                Sign out (Complete)
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-gray-50">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold mb-1">Sign in to KCMS</h1>
        <p className="text-sm text-neutral-600 mb-6">
          Access your church management account
        </p>

        <div className="space-y-4 mt-6">
          <button
            onClick={() => auth.signinRedirect()}
            className="w-full rounded-xl bg-neutral-900 px-4 py-3 text-white font-medium hover:bg-neutral-800 transition-colors"
          >
            Sign In
          </button>

          <button
            onClick={() => signOutComplete()}
            className="w-full rounded-xl border border-neutral-300 px-4 py-3 text-neutral-700 font-medium hover:bg-neutral-50 transition-colors"
          >
            Sign out (if already signed in)
          </button>
        </div>

        <p className="mt-6 text-xs text-neutral-500 text-center">
          Don't have an account?{" "}
          <Link href="/signup" className="text-neutral-800 hover:underline font-medium">
            Sign up
          </Link>
        </p>
      </div>
    </main>
  );
}
