import { buildAuthUrl } from "../config/cognito";

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useCognitoAuth } from "../../../hooks/use-cognito-auth";

export default function ForgotPasswordPage() {
  const { isAuthenticated, isLoading, forgotPasswordRedirect, getUserInfo } = useCognitoAuth();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neutral-800 mx-auto mb-4"></div>
          <p className="text-neutral-600">Please wait...</p>
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    const userInfo = getUserInfo();
    
    return (
      <div className="min-h-screen bg-white">
        {/* Header */}
        <header className="bg-white border-b border-neutral-200 px-4 py-3">
          <div className="flex items-center space-x-2">
            <i className="fa-solid fa-church text-2xl text-neutral-800"></i>
            <span className="text-lg text-neutral-800">KCMS</span>
          </div>
        </header>

        {/* Main Content */}
        <main className="px-4 py-8">
          <div className="max-w-md mx-auto">
            {/* Header Section */}
            <div className="text-center mb-8">
              <div className="w-20 h-20 mx-auto mb-4 bg-neutral-800 rounded-full flex items-center justify-center">
                <i className="fa-solid fa-check text-white text-2xl"></i>
              </div>
              <h1 className="text-2xl text-neutral-900 mb-2">Already Signed In</h1>
              <p className="text-neutral-600">Signed in as {userInfo?.email}</p>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-neutral-50 rounded-lg">
                <p className="text-sm text-neutral-700">
                  You're already signed in. If you want to change your password, use the change password option instead.
                </p>
              </div>

              <div className="space-y-3">
                <Link 
                  href="/auth/change-password"
                  className="block w-full text-center px-4 py-3 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-colors"
                >
                  Change Password
                </Link>
                
                <Link 
                  href="/auth/profile"
                  className="block w-full text-center px-4 py-3 border border-neutral-300 text-neutral-700 rounded-lg hover:bg-neutral-50 transition-colors"
                >
                  Go to Profile
                </Link>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b border-neutral-200 px-4 py-3">
        <div className="flex items-center space-x-2">
          <i className="fa-solid fa-church text-2xl text-neutral-800"></i>
          <span className="text-lg text-neutral-800">KCMS</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 py-8">
        <div className="max-w-md mx-auto">
          {/* Header Section */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 mx-auto mb-4 bg-neutral-800 rounded-full flex items-center justify-center">
              <i className="fa-solid fa-lock text-white text-2xl"></i>
            </div>
            <h1 className="text-2xl text-neutral-900 mb-2">Reset Password</h1>
            <p className="text-neutral-600">We'll help you get back into your account</p>
          </div>

          <div className="space-y-6">
            <div className="space-y-4">
              <div className="p-4 bg-neutral-50 rounded-lg">
                <h3 className="font-medium text-neutral-800 mb-2 flex items-center">
                  <i className="fa-solid fa-info-circle mr-2 text-neutral-600"></i>
                  Password Reset Process
                </h3>
                <ol className="text-sm text-neutral-700 space-y-1 list-decimal list-inside">
                  <li>Click the button below to start the reset process</li>
                  <li>Enter your email address on the secure page</li>
                  <li>Check your email for a verification code</li>
                  <li>Enter the code and set your new password</li>
                  <li>Sign in with your new password</li>
                </ol>
              </div>
              
              <button
                onClick={() => forgotPasswordRedirect()}
                className="w-full px-4 py-3 bg-neutral-900 text-white font-medium rounded-lg hover:bg-neutral-800 transition-colors flex items-center justify-center"
              >
                <i className="fa-solid fa-lock mr-2"></i>
                Reset Password
              </button>
            </div>

            <div className="text-center space-y-2">
              <p className="text-sm text-neutral-600">
                Remember your password?{" "}
                <Link href="/auth/signin" className="text-neutral-800 hover:underline font-medium">
                  Sign in
                </Link>
              </p>
              
              <p className="text-sm text-neutral-600">
                Don't have an account?{" "}
                <Link href="/auth/signup" className="text-neutral-800 hover:underline font-medium">
                  Sign up
                </Link>
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-4 py-6 border-t border-neutral-200 bg-white">
        <div className="text-center space-y-2">
          <p className="text-xs text-neutral-500">© 2025 Kharis Church Management System</p>
          <div className="flex justify-center space-x-4 text-xs">
            <a href="#" className="text-neutral-500 hover:text-neutral-700">Privacy</a>
            <a href="#" className="text-neutral-500 hover:text-neutral-700">Terms</a>
            <a href="#" className="text-neutral-500 hover:text-neutral-700">Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
}