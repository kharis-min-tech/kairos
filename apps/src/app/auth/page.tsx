"use client";

import { useEffect } from "react";
import { useCognitoAuth } from "../../hooks/use-cognito-auth";
import { useRouter } from "next/navigation";

/**
 * Auth landing page — redirects to the proper Cognito-based sign-in flow.
 * The previous inline login/signup forms that used a fake auth backend
 * have been removed for security (they bypassed real authentication).
 */
export default function AuthPage() {
  const { isAuthenticated, isLoading, signinRedirect } = useCognitoAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push("/dashboard");
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6 bg-gray-50">
        <div className="w-full max-w-md">
          <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neutral-800 mx-auto mb-4"></div>
            <p className="text-neutral-600">Checking authentication...</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-gray-50">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-semibold text-center mb-2">Welcome</h1>
          <p className="text-sm text-gray-600 text-center mb-8">
            Choose an option to continue
          </p>

          <div className="space-y-3">
            <button
              onClick={() => signinRedirect()}
              className="w-full rounded-xl bg-black px-4 py-3 text-white font-medium hover:opacity-90 active:opacity-80 transition-opacity"
            >
              Sign In
            </button>

            <button
              onClick={() => router.push("/auth/signup")}
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-700 font-medium hover:bg-gray-50 active:bg-gray-100 transition-colors"
            >
              Sign Up
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
