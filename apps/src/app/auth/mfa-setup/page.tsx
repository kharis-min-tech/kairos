"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useCognitoAuth } from "../../../hooks/use-cognito-auth";
import { AuthGuard } from "../../../components/auth-guard";

export default function MFASetupPage() {
  const { isAuthenticated, isLoading, mfaSetupRedirect, getUserInfo } = useCognitoAuth();
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
                <i className="fa-solid fa-shield-alt text-white text-2xl"></i>
              </div>
              <h1 className="text-2xl text-neutral-900 mb-2">Multi-Factor Authentication</h1>
              <p className="text-neutral-600">Secure your account with MFA</p>
            </div>

            <div className="space-y-6">
              {(() => {
                const userInfo = getUserInfo();
                
                if (userInfo?.mfaEnabled) {
                  return (
                    <div className="space-y-4">
                      <div className="p-4 bg-neutral-50 rounded-lg">
                        <h3 className="font-medium text-neutral-800 mb-2 flex items-center">
                          <i className="fa-solid fa-check-circle mr-2 text-neutral-600"></i>
                          MFA Already Enabled
                        </h3>
                        <p className="text-sm text-neutral-700">
                          Your account is already protected with multi-factor authentication.
                        </p>
                      </div>

                      <div className="space-y-3">
                        <button
                          onClick={() => mfaSetupRedirect()}
                          className="w-full px-4 py-3 bg-neutral-900 text-white font-medium rounded-lg hover:bg-neutral-800 transition-colors"
                        >
                          Manage MFA Settings
                        </button>
                        
                        <Link 
                          href="/auth/profile"
                          className="block w-full text-center px-4 py-3 border border-neutral-300 text-neutral-700 rounded-lg hover:bg-neutral-50 transition-colors"
                        >
                          Back to Profile
                        </Link>
                      </div>
                    </div>
                  );
                }

                return (
                  <div className="space-y-4">
                    <div className="p-4 bg-neutral-50 rounded-lg">
                      <h3 className="font-medium text-neutral-800 mb-2 flex items-center">
                        <i className="fa-solid fa-shield-alt mr-2 text-neutral-600"></i>
                        Enhance Your Security
                      </h3>
                      <p className="text-sm text-neutral-700 mb-3">
                        Multi-factor authentication adds an extra layer of security to your account.
                      </p>
                      <ul className="text-sm text-neutral-700 space-y-1 list-disc list-inside">
                        <li>SMS verification codes</li>
                        <li>Authenticator app support (TOTP)</li>
                        <li>Backup recovery codes</li>
                      </ul>
                    </div>
                    
                    <div className="p-4 bg-neutral-50 rounded-lg">
                      <h3 className="font-medium text-neutral-800 mb-2 flex items-center">
                        <i className="fa-solid fa-list-ol mr-2 text-neutral-600"></i>
                        Setup Process
                      </h3>
                      <ol className="text-sm text-neutral-700 space-y-1 list-decimal list-inside">
                        <li>Click "Set Up MFA" below</li>
                        <li>Choose your preferred MFA method</li>
                        <li>Follow the setup instructions</li>
                        <li>Verify your setup with a test code</li>
                      </ol>
                    </div>
                    
                    <button
                      onClick={() => mfaSetupRedirect()}
                      className="w-full px-4 py-3 bg-neutral-900 text-white font-medium rounded-lg hover:bg-neutral-800 transition-colors flex items-center justify-center"
                    >
                      <i className="fa-solid fa-shield-alt mr-2"></i>
                      Set Up MFA
                    </button>
                    
                    <div className="text-center">
                      <Link 
                        href="/auth/profile"
                        className="text-sm text-neutral-600 hover:underline"
                      >
                        Skip for now (not recommended)
                      </Link>
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