"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useCognitoAuth } from "../../../hooks/use-cognito-auth";
import { AuthLayout } from "../../../components/auth-layout";
import { AuthDebug } from "../../../components/auth-debug";
import { AuthGuard } from "../../../components/auth-guard";
import { cognitoDomain } from "../../../lib/auth-config";

export default function ChangePasswordPage() {
  const { getUserInfo } = useCognitoAuth();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const redirectToChangePassword = () => {
    // Cognito doesn't have a direct change password URL, so we redirect to the user settings
    // This would typically be handled through the Cognito Hosted UI or a custom implementation
    const clientId = "7mqmc57sb18ideegj293pk81ib";
    const redirectUri = encodeURIComponent("http://localhost:3001/auth/profile");
    
    // For now, redirect to the main Cognito domain where users can manage their account
    // In a production app, you might implement this with AWS SDK directly
    window.location.href = `${cognitoDomain}/login?client_id=${clientId}&response_type=code&scope=openid+email+phone+profile&redirect_uri=${redirectUri}&prompt=login`;
  };

  if (!isClient) {
    return (
      <AuthLayout title="Change Password" subtitle="Loading...">
        <div className="text-center">Loading...</div>
      </AuthLayout>
    );
  }

  return (
    <AuthGuard>
      <AuthLayout title="Change Password" subtitle="Update your account password">
        <div className="space-y-6">
          <AuthDebug />
          
          {(() => {
            const userInfo = getUserInfo();
            
            return (
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h3 className="font-medium text-blue-800 mb-2">Password Change Process</h3>
                  <p className="text-sm text-blue-700 mb-3">
                    To change your password, you'll be redirected to Amazon Cognito where you can securely update your credentials.
                  </p>
                  <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
                    <li>Click "Change Password" below</li>
                    <li>Sign in again to verify your identity</li>
                    <li>Navigate to account settings</li>
                    <li>Update your password</li>
                    <li>You'll be redirected back to your profile</li>
                  </ol>
                </div>

                <div className="p-4 bg-yellow-50 rounded-lg">
                  <h3 className="font-medium text-yellow-800 mb-2">Password Requirements</h3>
                  <ul className="text-sm text-yellow-700 space-y-1 list-disc list-inside">
                    <li>At least 8 characters long</li>
                    <li>Must contain uppercase letters</li>
                    <li>Must contain lowercase letters</li>
                    <li>Must contain numbers</li>
                    <li>Special characters are optional but recommended</li>
                  </ul>
                </div>
                
                <button
                  onClick={redirectToChangePassword}
                  className="w-full px-4 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Change Password with Amazon Cognito
                </button>

                <div className="text-center space-y-2">
                  <Link 
                    href="/auth/profile"
                    className="block text-sm text-gray-600 hover:underline"
                  >
                    ← Back to Profile
                  </Link>
                  
                  <p className="text-sm text-gray-600">
                    Forgot your current password?{" "}
                    <Link href="/auth/forgot-password" className="text-blue-600 hover:underline">
                      Reset it instead
                    </Link>
                  </p>
                </div>
              </div>
            );
          })()}
        </div>
      </AuthLayout>
    </AuthGuard>
  );
}