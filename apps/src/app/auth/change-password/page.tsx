"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useCognitoAuth } from "../../../hooks/use-cognito-auth";
import { AuthGuard } from "../../../components/auth-guard";
import { cognitoAuthConfig, cognitoDomain, getBaseUrl } from "../../../lib/auth-config";

export default function ChangePasswordPage() {
  const { getUserInfo } = useCognitoAuth();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const redirectToChangePassword = () => {
    const redirectUri = encodeURIComponent(`${getBaseUrl()}/auth/profile`);
    
    window.location.href = `${cognitoDomain}/login?client_id=${cognitoAuthConfig.client_id}&response_type=code&scope=openid+email+phone+profile&redirect_uri=${redirectUri}&prompt=login`;
  };

  if (!isClient) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  return (
    <AuthGuard>
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
                <i className="fa-solid fa-key text-white text-2xl"></i>
              </div>
              <h1 className="text-2xl text-neutral-900 mb-2">Change Password</h1>
              <p className="text-neutral-600">Update your account password</p>
            </div>

            <div className="space-y-6">
              {(() => {
                const userInfo = getUserInfo();
                
                return (
                  <div className="space-y-4">
                    <div className="p-4 bg-neutral-50 rounded-lg">
                      <h3 className="font-medium text-neutral-800 mb-2 flex items-center">
                        <i className="fa-solid fa-info-circle mr-2 text-neutral-600"></i>
                        Password Change Process
                      </h3>
                      <p className="text-sm text-neutral-700 mb-3">
                        To change your password, you'll be redirected to a secure page where you can update your credentials.
                      </p>
                      <ol className="text-sm text-neutral-700 space-y-1 list-decimal list-inside">
                        <li>Click "Change Password" below</li>
                        <li>Sign in again to verify your identity</li>
                        <li>Navigate to account settings</li>
                        <li>Update your password</li>
                        <li>You'll be redirected back to your profile</li>
                      </ol>
                    </div>

                    {/* Password Requirements */}
                    <div className="p-4 bg-neutral-50 rounded-lg">
                      <h3 className="font-medium text-neutral-800 mb-2 flex items-center">
                        <i className="fa-solid fa-shield-alt mr-2 text-neutral-600"></i>
                        Password Requirements
                      </h3>
                      <div className="space-y-2 text-sm text-neutral-700">
                        <div className="flex items-center space-x-2">
                          <i className="fa-solid fa-check-circle text-neutral-400 w-4"></i>
                          <span>At least 8 characters long</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <i className="fa-solid fa-check-circle text-neutral-400 w-4"></i>
                          <span>Include uppercase and lowercase letters</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <i className="fa-solid fa-check-circle text-neutral-400 w-4"></i>
                          <span>Include at least one number</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <i className="fa-solid fa-check-circle text-neutral-400 w-4"></i>
                          <span>Special characters are optional but recommended</span>
                        </div>
                      </div>
                    </div>
                    
                    <button
                      onClick={redirectToChangePassword}
                      className="w-full px-4 py-3 bg-neutral-900 text-white font-medium rounded-lg hover:bg-neutral-800 transition-colors flex items-center justify-center"
                    >
                      <i className="fa-solid fa-key mr-2"></i>
                      Change Password
                    </button>

                    <div className="text-center space-y-2">
                      <Link 
                        href="/auth/profile"
                        className="block text-sm text-neutral-600 hover:underline"
                      >
                        ← Back to Profile
                      </Link>
                      
                      <p className="text-sm text-neutral-600">
                        Forgot your current password?{" "}
                        <Link href="/auth/forgot-password" className="text-neutral-800 hover:underline font-medium">
                          Reset it instead
                        </Link>
                      </p>
                    </div>
                  </div>
                );
              })()}
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
    </AuthGuard>
  );
}