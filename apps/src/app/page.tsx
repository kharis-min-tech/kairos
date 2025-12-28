"use client";

import { useRouter } from "next/navigation";
import { useCognitoAuth } from "../hooks/use-cognito-auth";
import { useEffect } from "react";

export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated, isLoading, getUserInfo, signinRedirect, signOutRedirect } = useCognitoAuth();

  useEffect(() => {
    // Redirect authenticated users to dashboard
    if (isAuthenticated) {
      router.push("/dashboard");
    }
  }, [isAuthenticated, router]);

  if (isLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6 bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </main>
    );
  }

  const userInfo = getUserInfo();

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-gray-50">
      <div className="w-full max-w-2xl text-center">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Welcome to Kairos</h1>
          <p className="text-lg text-gray-600">
            Your secure church management platform powered by Amazon Cognito
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
          {isAuthenticated && userInfo ? (
            <div className="space-y-6">
              <div className="p-4 bg-green-50 rounded-lg">
                <h3 className="font-medium text-green-800 mb-2">Welcome back!</h3>
                <p className="text-sm text-green-700">
                  Signed in as: {userInfo.email}
                </p>
                <div className="mt-2 text-xs text-green-600">
                  Email: {userInfo.emailVerified ? '✅' : '❌'} | 
                  MFA: {userInfo.mfaEnabled ? '✅' : '⚠️'} |
                  {userInfo.phone && ` Phone: ${userInfo.phoneVerified ? '✅' : '❌'}`}
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <button
                  onClick={() => router.push("/auth/profile")}
                  className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  👤 View Profile
                </button>
                
                {!userInfo.mfaEnabled && (
                  <button
                    onClick={() => router.push("/auth/mfa-setup")}
                    className="px-4 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                  >
                    🔐 Set Up MFA
                  </button>
                )}
                
                <button
                  onClick={() => router.push("/auth/change-password")}
                  className="px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  🔑 Change Password
                </button>
                
                <button
                  onClick={() => signOutRedirect()}
                  className="px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  🚪 Sign Out
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <p className="text-gray-700 mb-6">
                Get started with secure authentication powered by Amazon Cognito
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  onClick={() => router.push("/auth/signin")}
                  className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
                >
                  🔑 Sign In
                </button>

                <button
                  onClick={() => router.push("/auth/signup")}
                  className="px-6 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors"
                >
                  ✨ Create Account
                </button>
              </div>

              <div className="text-center">
                <button
                  onClick={() => router.push("/auth/forgot-password")}
                  className="text-sm text-blue-600 hover:underline"
                >
                  Forgot your password?
                </button>
              </div>

              <div className="p-4 bg-blue-50 rounded-lg text-left">
                <h3 className="font-medium text-blue-800 mb-2">🔒 Security Features</h3>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>✅ Email verification</li>
                  <li>✅ Multi-factor authentication (MFA)</li>
                  <li>✅ Secure password reset</li>
                  <li>✅ Advanced security monitoring</li>
                  <li>✅ OAuth 2.0 / OpenID Connect</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            Powered by Amazon Cognito • Secure • Scalable • Compliant
          </p>
        </div>
      </div>
    </main>
  );
}
