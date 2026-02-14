"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useCognitoAuth } from "../../../hooks/use-cognito-auth";
import { AuthGuard } from "../../../components/auth-guard";

export default function ProfilePage() {
  const { getUserInfo, signOutComplete, signOutLocal } = useCognitoAuth();
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
                <i className="fa-solid fa-user text-white text-2xl"></i>
              </div>
              <h1 className="text-2xl text-neutral-900 mb-2">Your Profile</h1>
              <p className="text-neutral-600">Manage your account settings</p>
            </div>

            <div className="space-y-6">
              {(() => {
                const userInfo = getUserInfo();
                
                if (!userInfo) {
                  return <div className="text-center text-neutral-600">Unable to load user information</div>;
                }

                return (
                  <>
                    {/* User Information */}
                    <div className="space-y-4">
                      <div className="p-4 bg-neutral-50 rounded-lg">
                        <h3 className="font-medium text-neutral-800 mb-3 flex items-center">
                          <i className="fa-solid fa-info-circle mr-2 text-neutral-600"></i>
                          Account Information
                        </h3>
                        <div className="space-y-3 text-sm">
                          <div className="flex justify-between items-center">
                            <span className="text-neutral-600">Email:</span>
                            <span className="font-medium text-neutral-900">{userInfo.email}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-neutral-600">Email Verified:</span>
                            <span className={userInfo.emailVerified ? 'text-neutral-600' : 'text-neutral-500'}>
                              {userInfo.emailVerified ? (
                                <i className="fa-solid fa-check-circle text-neutral-600"></i>
                              ) : (
                                <i className="fa-solid fa-times-circle text-neutral-400"></i>
                              )}
                            </span>
                          </div>
                          {userInfo.name && (
                            <div className="flex justify-between items-center">
                              <span className="text-neutral-600">Name:</span>
                              <span className="font-medium text-neutral-900">{userInfo.name}</span>
                            </div>
                          )}
                          {userInfo.phone && (
                            <>
                              <div className="flex justify-between items-center">
                                <span className="text-neutral-600">Phone:</span>
                                <span className="font-medium text-neutral-900">{userInfo.phone}</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-neutral-600">Phone Verified:</span>
                                <span className={userInfo.phoneVerified ? 'text-neutral-600' : 'text-neutral-500'}>
                                  {userInfo.phoneVerified ? (
                                    <i className="fa-solid fa-check-circle text-neutral-600"></i>
                                  ) : (
                                    <i className="fa-solid fa-times-circle text-neutral-400"></i>
                                  )}
                                </span>
                              </div>
                            </>
                          )}
                          <div className="flex justify-between items-center">
                            <span className="text-neutral-600">MFA Status:</span>
                            <span className={userInfo.mfaEnabled ? 'text-neutral-600' : 'text-neutral-500'}>
                              {userInfo.mfaEnabled ? (
                                <i className="fa-solid fa-shield-alt text-neutral-600"></i>
                              ) : (
                                <i className="fa-solid fa-exclamation-triangle text-neutral-400"></i>
                              )}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-neutral-600">User ID:</span>
                            <span className="font-mono text-xs text-neutral-500">{userInfo.sub}</span>
                          </div>
                        </div>
                      </div>

                      {/* Security Recommendations */}
                      {(!userInfo.emailVerified || !userInfo.mfaEnabled) && (
                        <div className="p-4 bg-neutral-50 rounded-lg">
                          <h3 className="font-medium text-neutral-800 mb-2 flex items-center">
                            <i className="fa-solid fa-shield-alt mr-2 text-neutral-600"></i>
                            Security Recommendations
                          </h3>
                          <ul className="text-sm text-neutral-700 space-y-1">
                            {!userInfo.emailVerified && (
                              <li className="flex items-center space-x-2">
                                <i className="fa-solid fa-dot-circle text-neutral-400 w-3"></i>
                                <span>Verify your email address for account recovery</span>
                              </li>
                            )}
                            {!userInfo.mfaEnabled && (
                              <li className="flex items-center space-x-2">
                                <i className="fa-solid fa-dot-circle text-neutral-400 w-3"></i>
                                <span>Enable multi-factor authentication for better security</span>
                              </li>
                            )}
                          </ul>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="space-y-3">
                        {!userInfo.mfaEnabled && (
                          <Link 
                            href="/auth/mfa-setup"
                            className="block w-full text-center px-4 py-3 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-colors flex items-center justify-center"
                          >
                            <i className="fa-solid fa-shield-alt mr-2"></i>
                            Set Up MFA (Recommended)
                          </Link>
                        )}
                        
                        <Link 
                          href="/auth/change-password"
                          className="block w-full text-center px-4 py-3 border border-neutral-300 text-neutral-700 rounded-lg hover:bg-neutral-50 transition-colors flex items-center justify-center"
                        >
                          <i className="fa-solid fa-key mr-2"></i>
                          Change Password
                        </Link>
                      </div>

                      {/* Sign Out Options */}}
                      <div className="border-t border-neutral-200 pt-4 space-y-3">
                        <h3 className="font-medium text-neutral-800">Sign Out Options</h3>
                        
                        <button
                          onClick={() => signOutLocal()}
                          className="w-full px-4 py-3 border border-neutral-300 text-neutral-700 rounded-lg hover:bg-neutral-50 transition-colors flex items-center justify-center"
                        >
                          <i className="fa-solid fa-sign-out-alt mr-2"></i>
                          Sign Out (Local Only)
                        </button>
                        
                        <button
                          onClick={() => signOutComplete()}
                          className="w-full px-4 py-3 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-colors flex items-center justify-center"
                        >
                          <i className="fa-solid fa-sign-out-alt mr-2"></i>
                          Sign Out (Complete)
                        </button>
                        
                        <p className="text-xs text-neutral-500 text-center">
                          "Complete" sign out will also sign you out from the authentication service and clear all sessions
                        </p>
                      </div>
                    </div>
                  </>
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