"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useCognitoAuth } from "../../../hooks/use-cognito-auth";

export default function SignUpPage() {
  const { isAuthenticated, isLoading, error, signUpRedirect, getUserInfo } = useCognitoAuth();
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
            <p className="text-neutral-600">Please wait...</p>
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
            <p className="text-neutral-600">{error.message}</p>
          </div>
          
          <div className="space-y-3">
            <button 
              onClick={() => window.location.reload()} 
              className="w-full bg-neutral-900 text-white py-3 px-4 rounded-lg hover:bg-neutral-800"
            >
              Try Again
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
            <h1 className="text-2xl text-neutral-900 mb-2">Already Signed In</h1>
            <p className="text-neutral-600">Welcome back, {userInfo?.email}</p>
          </div>

          <div className="bg-neutral-50 rounded-lg p-4 mb-6">
            <p className="text-sm text-neutral-700">
              You're already signed in. You can manage your account or sign out to create a new one.
            </p>
          </div>

          <div className="space-y-3">
            <Link 
              href="/dashboard"
              className="block w-full text-center bg-neutral-900 text-white py-3 px-4 rounded-lg hover:bg-neutral-800"
            >
              Go to Dashboard
            </Link>
            
            <Link 
              href="/"
              className="block w-full text-center border border-neutral-300 text-neutral-700 py-3 px-4 rounded-lg hover:bg-neutral-50"
            >
              Go to Home
            </Link>
          </div>
        </main>
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
            <i className="fa-solid fa-user-plus text-white text-2xl"></i>
          </div>
          <h1 className="text-2xl text-neutral-900 mb-2">Create Account</h1>
          <p className="text-neutral-600">Join the Kharis Church community today</p>
        </div>

        <div className="bg-neutral-50 rounded-lg p-4 mb-6">
          <h3 className="text-sm text-neutral-800 mb-3 flex items-center">
            <i className="fa-solid fa-gift mr-2 text-neutral-600"></i>
            What you'll get:
          </h3>
          <div className="space-y-2 text-xs text-neutral-600">
            <div className="flex items-center space-x-2">
              <i className="fa-solid fa-check-circle text-neutral-400 w-4"></i>
              <span>Secure account with email verification</span>
            </div>
            <div className="flex items-center space-x-2">
              <i className="fa-solid fa-check-circle text-neutral-400 w-4"></i>
              <span>Access to church events and community</span>
            </div>
            <div className="flex items-center space-x-2">
              <i className="fa-solid fa-check-circle text-neutral-400 w-4"></i>
              <span>Track your spiritual journey and giving</span>
            </div>
            <div className="flex items-center space-x-2">
              <i className="fa-solid fa-check-circle text-neutral-400 w-4"></i>
              <span>Connect with departments and house groups</span>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <button
            onClick={() => signUpRedirect()}
            className="w-full bg-neutral-900 text-white py-3 px-4 rounded-lg hover:bg-neutral-800 transition-colors flex items-center justify-center"
          >
            <i className="fa-solid fa-user-plus mr-2"></i>
            Create Your Account
          </button>
        </div>

        <div className="mt-8 space-y-3">
          <Link
            href="/auth/signin"
            className="block w-full text-center border border-neutral-300 text-neutral-700 py-3 px-4 rounded-lg hover:bg-neutral-50 transition-colors"
          >
            Already have an account? Sign in
          </Link>
        </div>

        <div className="mt-6 text-center">
          <p className="text-xs text-neutral-500">
            By creating an account, you agree to our{" "}
            <a href="#" className="text-neutral-700 hover:underline">Terms of Service</a>
            {" "}and{" "}
            <a href="#" className="text-neutral-700 hover:underline">Privacy Policy</a>
          </p>
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