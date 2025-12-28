"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "react-oidc-context";
import { cognitoDomain } from "../../lib/auth-config";
import { AuthDebug } from "../../components/auth-debug";

export default function SignupPage() {
  const auth = useAuth();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const redirectToSignUp = () => {
    // Redirect to Cognito Hosted UI with signup parameter
    const clientId = "7mqmc57sb18ideegj293pk81ib";
    const redirectUri = encodeURIComponent("http://localhost:3001");
    const signUpUrl = `${cognitoDomain}/signup?client_id=${clientId}&response_type=code&scope=openid+email+phone&redirect_uri=${redirectUri}`;
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
                onClick={() => auth.removeUser()}
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
          Sign up with Amazon Cognito to get started
        </p>

        <AuthDebug />

        <div className="space-y-4 mt-6">
          <button
            onClick={redirectToSignUp}
            className="w-full rounded-xl bg-green-600 px-4 py-3 text-white font-medium hover:bg-green-700 active:bg-green-800 transition-colors"
          >
            Sign Up with Amazon Cognito
          </button>

          <div className="text-center text-sm text-gray-500">
            Or use the sign-in flow (includes sign-up option)
          </div>

          <button
            onClick={() => auth.signinRedirect()}
            className="w-full rounded-xl bg-blue-600 px-4 py-3 text-white font-medium hover:bg-blue-700 active:bg-blue-800 transition-colors"
          >
            Go to Sign In (with Sign Up option)
          </button>
        </div>

        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500 mb-4">
            By signing up, you agree to our Terms of Service and Privacy Policy
          </p>
          
          <p className="text-xs text-gray-500">
            Already have an account?{" "}
            <Link href="/login" className="text-blue-600 hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}