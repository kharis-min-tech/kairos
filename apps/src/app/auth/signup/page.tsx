"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useCognitoAuth } from "../../../hooks/use-cognito-auth";
import { AuthLayout } from "../../../components/auth-layout";
import { AuthDebug } from "../../../components/auth-debug";

export default function SignUpPage() {
  const { isAuthenticated, isLoading, error, signUpRedirect, getUserInfo } = useCognitoAuth();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return (
      <AuthLayout title="Create Account" subtitle="Loading...">
        <div className="text-center">Loading...</div>
      </AuthLayout>
    );
  }

  if (isLoading) {
    return (
      <AuthLayout title="Create Account" subtitle="Checking authentication...">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p>Please wait...</p>
        </div>
        <AuthDebug />
      </AuthLayout>
    );
  }

  if (error) {
    return (
      <AuthLayout title="Authentication Error">
        <div className="text-center text-red-600 mb-4">
          <p className="text-sm mb-4">{error.message}</p>
        </div>
        
        <AuthDebug />
        
        <div className="space-y-3 mt-6">
          <button 
            onClick={() => window.location.reload()} 
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </AuthLayout>
    );
  }

  if (isAuthenticated) {
    const userInfo = getUserInfo();
    
    return (
      <AuthLayout title="Already Signed In" subtitle={`Welcome back, ${userInfo?.email}`}>
        <div className="space-y-4">
          <div className="p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-700">
              You're already signed in. You can manage your account or sign out to create a new one.
            </p>
          </div>

          <div className="space-y-3">
            <Link 
              href="/dashboard"
              className="block w-full text-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Go to Dashboard
            </Link>
            
            <Link 
              href="/"
              className="block w-full text-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              Go to Home
            </Link>
          </div>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Create Account" subtitle="Join Kairos today">
      <div className="space-y-6">
        <AuthDebug />
        
        <div className="space-y-4">
          <div className="p-4 bg-green-50 rounded-lg">
            <h3 className="font-medium text-green-800 mb-2">What you'll get:</h3>
            <ul className="text-sm text-green-700 space-y-1">
              <li>✅ Secure account with email verification</li>
              <li>✅ Optional multi-factor authentication</li>
              <li>✅ Password recovery options</li>
              <li>✅ Full access to Kairos features</li>
            </ul>
          </div>
          
          <button
            onClick={() => signUpRedirect()}
            className="w-full px-4 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors"
          >
            Create Account with Amazon Cognito
          </button>
        </div>

        <div className="text-center space-y-2">
          <p className="text-sm text-gray-600">
            Already have an account?{" "}
            <Link href="/auth/signin" className="text-blue-600 hover:underline font-medium">
              Sign in
            </Link>
          </p>
          
          <p className="text-xs text-gray-500">
            By creating an account, you agree to our{" "}
            <Link href="/terms" className="text-blue-600 hover:underline">Terms of Service</Link>
            {" "}and{" "}
            <Link href="/privacy" className="text-blue-600 hover:underline">Privacy Policy</Link>
          </p>
        </div>
      </div>
    </AuthLayout>
  );
}