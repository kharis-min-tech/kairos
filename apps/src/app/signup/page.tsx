"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "react-oidc-context";
import { cognitoAuthConfig, cognitoDomain, getBaseUrl } from "../../lib/auth-config";
import { useCognitoAuth } from "../../hooks/use-cognito-auth";

export default function SignupPage() {
  const auth = useAuth();
  const { signOutLocal } = useCognitoAuth();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const redirectToSignUp = () => {
    const redirectUri = encodeURIComponent(getBaseUrl());
    const signUpUrl = `${cognitoDomain}/signup?client_id=${cognitoAuthConfig.client_id}&response_type=code&scope=openid+email+phone&redirect_uri=${redirectUri}`;
    window.location.href = signUpUrl;
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
            <p className="text-sm">Something went wrong. Please try again.</p>
          </div>
          
          <div className="mt-4 text-center">
            <button 
              onClick={() => window.location.reload()} 
              className="mr-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Try Again
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (auth.isAuthenticated) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6 bg-gray-50">
        <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-4 text-green-600">Already Signed In!</h2>
            <p className="text-gray-600 mb-6">
              You're already authenticated as: {auth.user?.profile.email}
            </p>
            <div className="space-y-2">
              <Link 
                href="/"
                className="block w-full rounded-xl bg-blue-600 px-4 py-3 text-white font-medium hover:bg-blue-700 text-center"
              >
                Go to Home
              </Link>
              <button
                onClick={() => signOutLocal()}
                className="w-full rounded-xl bg-gray-600 px-4 py-3 text-white font-medium hover:bg-gray-700"
              >
                Sign Out
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
        <h1 className="text-2xl font-semibold mb-1">Create Account</h1>
        <p className="text-sm text-gray-600 mb-6">
          Sign up to get started with KCMS
        </p>

        <div className="space-y-4 mt-6">
          <button
            onClick={redirectToSignUp}
            className="w-full rounded-xl bg-neutral-900 px-4 py-3 text-white font-medium hover:bg-neutral-800 transition-colors"
          >
            Sign Up
          </button>

          <div className="text-center text-sm text-neutral-500">
            Or use the sign-in flow (includes sign-up option)
          </div>

          <button
            onClick={() => auth.signinRedirect()}
            className="w-full rounded-xl border border-neutral-300 px-4 py-3 text-neutral-700 font-medium hover:bg-neutral-50 transition-colors"
          >
            Go to Sign In (with Sign Up option)
          </button>
        </div>

        <div className="mt-6 text-center">
          <p className="text-xs text-neutral-500 mb-4">
            By signing up, you agree to our Terms of Service and Privacy Policy
          </p>
          
          <p className="text-xs text-neutral-500">
            Already have an account?{" "}
            <Link href="/login" className="text-neutral-800 hover:underline font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}