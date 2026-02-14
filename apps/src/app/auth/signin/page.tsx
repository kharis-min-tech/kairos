"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useCognitoAuth } from "../../../hooks/use-cognito-auth";
import { getAuthErrorMessage } from "../../../lib/auth";

export default function SignInPage() {
  const { isAuthenticated, isLoading, error, signinRedirect, getUserInfo } = useCognitoAuth();
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
      <div className="min-h-screen bg-white">
        <header className="bg-white border-b border-neutral-200 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Link href="/" className="p-2 -ml-2 text-neutral-600 hover:text-neutral-800">
                <i className="fa-solid fa-arrow-left text-lg"></i>
              </Link>
              <i className="fa-solid fa-church text-2xl text-neutral-800"></i>
              <span className="text-lg text-neutral-800">KCMS</span>
            </div>
          </div>
        </header>
        <main className="px-4 py-8 flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neutral-800 mx-auto mb-4"></div>
            <p className="text-neutral-600">Checking authentication status...</p>
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white">
        <header className="bg-white border-b border-neutral-200 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Link href="/" className="p-2 -ml-2 text-neutral-600 hover:text-neutral-800">
                <i className="fa-solid fa-arrow-left text-lg"></i>
              </Link>
              <i className="fa-solid fa-church text-2xl text-neutral-800"></i>
              <span className="text-lg text-neutral-800">KCMS</span>
            </div>
          </div>
        </header>
        <main className="px-4 py-8">
          <div className="text-center mb-8">
            <div className="w-20 h-20 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
              <i className="fa-solid fa-exclamation-triangle text-red-600 text-2xl"></i>
            </div>
            <h1 className="text-2xl text-neutral-900 mb-2">Authentication Error</h1>
            <p className="text-neutral-600">{getAuthErrorMessage(error)}</p>
          </div>
          
          <div className="space-y-3">
            <button 
              onClick={() => window.location.reload()} 
              className="w-full bg-neutral-900 text-white py-3 px-4 rounded-lg hover:bg-neutral-800"
            >
              Try Again
            </button>
            <button 
              onClick={() => signinRedirect()} 
              className="w-full border border-neutral-300 text-neutral-700 py-3 px-4 rounded-lg hover:bg-neutral-50"
            >
              Sign In Again
            </button>
          </div>
        </main>
      </div>
    );
  }

  if (isAuthenticated) {
    const userInfo = getUserInfo();
    
    return (
      <div className="min-h-screen bg-white">
        <header className="bg-white border-b border-neutral-200 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Link href="/" className="p-2 -ml-2 text-neutral-600 hover:text-neutral-800">
                <i className="fa-solid fa-arrow-left text-lg"></i>
              </Link>
              <i className="fa-solid fa-church text-2xl text-neutral-800"></i>
              <span className="text-lg text-neutral-800">KCMS</span>
            </div>
          </div>
        </header>
        <main className="px-4 py-8">
          <div className="text-center mb-8">
            <div className="w-20 h-20 mx-auto mb-4 bg-neutral-800 rounded-full flex items-center justify-center">
              <i className="fa-solid fa-check text-white text-2xl"></i>
            </div>
            <h1 className="text-2xl text-neutral-900 mb-2">Welcome Back!</h1>
            <p className="text-neutral-600">Signed in as {userInfo?.email}</p>
          </div>

          <div className="bg-neutral-50 rounded-lg p-4 mb-6">
            <h3 className="text-sm text-neutral-800 mb-3">Account Status</h3>
            <div className="space-y-2 text-xs text-neutral-600">
              <div className="flex items-center justify-between">
                <span>Email Verification</span>
                <span className={userInfo?.emailVerified ? 'text-neutral-800' : 'text-neutral-500'}>
                  {userInfo?.emailVerified ? '✅ Verified' : '❌ Not Verified'}
                </span>
              </div>
              {userInfo?.phone && (
                <div className="flex items-center justify-between">
                  <span>Phone Verification</span>
                  <span className={userInfo?.phoneVerified ? 'text-neutral-800' : 'text-neutral-500'}>
                    {userInfo?.phoneVerified ? '✅ Verified' : '❌ Not Verified'}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span>Two-Factor Authentication</span>
                <span className={userInfo?.mfaEnabled ? 'text-neutral-800' : 'text-neutral-500'}>
                  {userInfo?.mfaEnabled ? '✅ Enabled' : '⚠️ Disabled'}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <Link 
              href="/dashboard"
              className="block w-full text-center bg-neutral-900 text-white py-3 px-4 rounded-lg hover:bg-neutral-800"
            >
              Go to Dashboard
            </Link>
            
            {!userInfo?.mfaEnabled && (
              <Link 
                href="/auth/mfa-setup"
                className="block w-full text-center border border-neutral-300 text-neutral-700 py-3 px-4 rounded-lg hover:bg-neutral-50"
              >
                Set Up Two-Factor Authentication
              </Link>
            )}
            
            <Link 
              href="/auth/change-password"
              className="block w-full text-center border border-neutral-300 text-neutral-700 py-3 px-4 rounded-lg hover:bg-neutral-50"
            >
              Change Password
            </Link>
          </div>
        </main>

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

  return (
    <div className="min-h-screen bg-white">
      <header className="bg-white border-b border-neutral-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Link href="/" className="p-2 -ml-2 text-neutral-600 hover:text-neutral-800">
              <i className="fa-solid fa-arrow-left text-lg"></i>
            </Link>
            <i className="fa-solid fa-church text-2xl text-neutral-800"></i>
            <span className="text-lg text-neutral-800">KCMS</span>
          </div>
        </div>
      </header>

      <main className="px-4 py-8">
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-4 bg-neutral-800 rounded-full flex items-center justify-center">
            <i className="fa-solid fa-sign-in-alt text-white text-2xl"></i>
          </div>
          <h1 className="text-2xl text-neutral-900 mb-2">Sign In</h1>
          <p className="text-neutral-600">Access your church community account</p>
        </div>

        <div className="space-y-6">
          <button
            onClick={() => signinRedirect()}
            className="w-full bg-neutral-900 text-white py-3 px-4 rounded-lg hover:bg-neutral-800 transition-colors flex items-center justify-center"
          >
            <i className="fa-solid fa-sign-in-alt mr-2"></i>
            Sign In to Your Account
          </button>
        </div>

        <div className="mt-8 space-y-3">
          <Link
            href="/auth/signup"
            className="block w-full text-center border border-neutral-300 text-neutral-700 py-3 px-4 rounded-lg hover:bg-neutral-50 transition-colors"
          >
            Don't have an account? Create one
          </Link>
          
          <Link
            href="/auth/forgot-password"
            className="block text-center text-sm text-neutral-600 hover:text-neutral-800"
          >
            Forgot your password?
          </Link>
        </div>
      </main>

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