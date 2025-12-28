"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useCognitoAuth } from "../../../hooks/use-cognito-auth";
import { AuthLayout } from "../../../components/auth-layout";
import { AuthDebug } from "../../../components/auth-debug";

export default function ForgotPasswordPage() {
  const { isAuthenticated, isLoading, forgotPasswordRedirect, getUserInfo } = useCognitoAuth();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return (
      <AuthLayout title="Reset Password" subtitle="Loading...">
        <div className="text-center">Loading...</div>
      </AuthLayout>
    );
  }

  if (isLoading) {
    return (
      <AuthLayout title="Reset Password" subtitle="Checking authentication...">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <p>Please wait...</p>
        </div>
        <AuthDebug />
      </AuthLayout>
    );
  }

  if (isAuthenticated) {
    const userInfo = getUserInfo();
    
    return (
      <AuthLayout title="Already Signed In" subtitle={`Signed in as ${userInfo?.email}`}>
        <div className="space-y-4">
          <div className="p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-700">
              You're already signed in. If you want to change your password, use the change password option instead.
            </p>
          </div>

          <div className="space-y-3">
            <Link 
              href="/auth/change-password"
              className="block w-full text-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Change Password
            </Link>
            
            <Link 
              href="/auth/profile"
              className="block w-full text-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              Go to Profile
            </Link>
          </div>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Reset Password" subtitle="We'll help you get back into your account">
      <div className="space-y-6">
        <AuthDebug />
        
        <div className="space-y-4">
          <div className="p-4 bg-orange-50 rounded-lg">
            <h3 className="font-medium text-orange-800 mb-2">Password Reset Process:</h3>
            <ol className="text-sm text-orange-700 space-y-1 list-decimal list-inside">
              <li>Click the button below to start the reset process</li>
              <li>Enter your email address on the Cognito page</li>
              <li>Check your email for a verification code</li>
              <li>Enter the code and set your new password</li>
              <li>Sign in with your new password</li>
            </ol>
          </div>
          
          <button
            onClick={() => forgotPasswordRedirect()}
            className="w-full px-4 py-3 bg-orange-600 text-white font-medium rounded-lg hover:bg-orange-700 transition-colors"
          >
            Reset Password with Amazon Cognito
          </button>
        </div>

        <div className="text-center space-y-2">
          <p className="text-sm text-gray-600">
            Remember your password?{" "}
            <Link href="/auth/signin" className="text-blue-600 hover:underline font-medium">
              Sign in
            </Link>
          </p>
          
          <p className="text-sm text-gray-600">
            Don't have an account?{" "}
            <Link href="/auth/signup" className="text-blue-600 hover:underline font-medium">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </AuthLayout>
  );
}