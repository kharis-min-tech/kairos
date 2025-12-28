"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useCognitoAuth } from "../../../hooks/use-cognito-auth";
import { AuthLayout } from "../../../components/auth-layout";
import { AuthDebug } from "../../../components/auth-debug";
import { AuthGuard } from "../../../components/auth-guard";

export default function MFASetupPage() {
  const { isAuthenticated, isLoading, mfaSetupRedirect, getUserInfo } = useCognitoAuth();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return (
      <AuthLayout title="MFA Setup" subtitle="Loading...">
        <div className="text-center">Loading...</div>
      </AuthLayout>
    );
  }

  return (
    <AuthGuard>
      <AuthLayout title="Multi-Factor Authentication" subtitle="Secure your account with MFA">
        <div className="space-y-6">
          <AuthDebug />
          
          {(() => {
            const userInfo = getUserInfo();
            
            if (userInfo?.mfaEnabled) {
              return (
                <div className="space-y-4">
                  <div className="p-4 bg-green-50 rounded-lg">
                    <h3 className="font-medium text-green-800 mb-2">✅ MFA Already Enabled</h3>
                    <p className="text-sm text-green-700">
                      Your account is already protected with multi-factor authentication.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <button
                      onClick={() => mfaSetupRedirect()}
                      className="w-full px-4 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Manage MFA Settings
                    </button>
                    
                    <Link 
                      href="/auth/profile"
                      className="block w-full text-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                    >
                      Back to Profile
                    </Link>
                  </div>
                </div>
              );
            }

            return (
              <div className="space-y-4">
                <div className="p-4 bg-orange-50 rounded-lg">
                  <h3 className="font-medium text-orange-800 mb-2">🔐 Enhance Your Security</h3>
                  <p className="text-sm text-orange-700 mb-3">
                    Multi-factor authentication adds an extra layer of security to your account.
                  </p>
                  <ul className="text-sm text-orange-700 space-y-1 list-disc list-inside">
                    <li>SMS verification codes</li>
                    <li>Authenticator app support (TOTP)</li>
                    <li>Backup recovery codes</li>
                  </ul>
                </div>
                
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h3 className="font-medium text-blue-800 mb-2">Setup Process:</h3>
                  <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
                    <li>Click "Set Up MFA" below</li>
                    <li>Choose your preferred MFA method</li>
                    <li>Follow the setup instructions</li>
                    <li>Verify your setup with a test code</li>
                  </ol>
                </div>
                
                <button
                  onClick={() => mfaSetupRedirect()}
                  className="w-full px-4 py-3 bg-orange-600 text-white font-medium rounded-lg hover:bg-orange-700 transition-colors"
                >
                  Set Up MFA with Amazon Cognito
                </button>
                
                <div className="text-center">
                  <Link 
                    href="/auth/profile"
                    className="text-sm text-gray-600 hover:underline"
                  >
                    Skip for now (not recommended)
                  </Link>
                </div>
              </div>
            );
          })()}
        </div>
      </AuthLayout>
    </AuthGuard>
  );
}