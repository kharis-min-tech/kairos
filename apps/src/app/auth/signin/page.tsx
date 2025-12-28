"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useCognitoAuth } from "../../../hooks/use-cognito-auth";
import { AuthLayout } from "../../../components/auth-layout";
import { AuthDebug } from "../../../components/auth-debug";

export default function SignInPage() {
  const { isAuthenticated, isLoading, error, signinRedirect, getUserInfo } = useCognitoAuth();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return (
      <AuthLayout title="Sign In" subtitle="Loading...">
        <div className="text-center">Loading...</div>
      </AuthLayout>
    );
  }

  if (isLoading) {
    return (
      <AuthLayout title="Sign In" subtitle="Authenticating...">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Checking authentication status...</p>
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
          <button 
            onClick={() => signinRedirect()} 
            className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            Sign In Again
          </button>
        </div>
      </AuthLayout>
    );
  }

  if (isAuthenticated) {
    const userInfo = getUserInfo();
    
    return (
      <AuthLayout title="Welcome Back!" subtitle={`Signed in as ${userInfo?.email}`}>
        <div className="space-y-4">
          <div className="p-4 bg-green-50 rounded-lg">
            <h3 className="font-medium text-green-800 mb-2">Account Status</h3>
            <div className="text-sm text-green-700 space-y-1">
              <p>Email: {userInfo?.email}</p>
              <p>Email Verified: {userInfo?.emailVerified ? '✅' : '❌'}</p>
              {userInfo?.phone && <p>Phone: {userInfo.phone}</p>}
              {userInfo?.phone && <p>Phone Verified: {userInfo?.phoneVerified ? '✅' : '❌'}</p>}
              <p>MFA Enabled: {userInfo?.mfaEnabled ? '✅' : '❌'}</p>
            </div>
          </div>

          <div className="space-y-3">
            <Link 
              href="/dashboard"
              className="block w-full text-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Go to Dashboard
            </Link>
            
            {!userInfo?.mfaEnabled && (
              <Link 
                href="/auth/mfa-setup"
                className="block w-full text-center px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
              >
                Set Up MFA (Recommended)
              </Link>
            )}
            
            <Link 
              href="/auth/change-password"
              className="block w-full text-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              Change Password
            </Link>
          </div>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Sign In" subtitle="Access your Kairos account">
      <div className="space-y-6">
        <AuthDebug />
        
        <div className="space-y-3">
          <button
            onClick={() => signinRedirect()}
            className="w-full px-4 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            Sign In with Amazon Cognito
          </button>
        </div>

        <div className="text-center space-y-2">
          <p className="text-sm text-gray-600">
            Don't have an account?{" "}
            <Link href="/auth/signup" className="text-blue-600 hover:underline font-medium">
              Sign up
            </Link>
          </p>
          
          <p className="text-sm text-gray-600">
            <Link href="/auth/forgot-password" className="text-blue-600 hover:underline">
              Forgot your password?
            </Link>
          </p>
        </div>
      </div>
    </AuthLayout>
  );
}