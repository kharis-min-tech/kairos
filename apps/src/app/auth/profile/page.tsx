"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useCognitoAuth } from "../../../hooks/use-cognito-auth";
import { AuthLayout } from "../../../components/auth-layout";
import { AuthDebug } from "../../../components/auth-debug";
import { AuthGuard } from "../../../components/auth-guard";

export default function ProfilePage() {
  const { getUserInfo, signOutRedirect, removeUser } = useCognitoAuth();
  const [isClient, setIsClient] = useState(false);
  const [showTokens, setShowTokens] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return (
      <AuthLayout title="Profile" subtitle="Loading...">
        <div className="text-center">Loading...</div>
      </AuthLayout>
    );
  }

  return (
    <AuthGuard>
      <AuthLayout title="Your Profile" subtitle="Manage your account settings">
        <div className="space-y-6">
          {(() => {
            const userInfo = getUserInfo();
            
            if (!userInfo) {
              return <div className="text-center text-red-600">Unable to load user information</div>;
            }

            return (
              <>
                {/* User Information */}
                <div className="space-y-4">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h3 className="font-medium text-gray-800 mb-3">Account Information</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Email:</span>
                        <span className="font-medium">{userInfo.email}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Email Verified:</span>
                        <span className={userInfo.emailVerified ? 'text-green-600' : 'text-red-600'}>
                          {userInfo.emailVerified ? '✅ Verified' : '❌ Not Verified'}
                        </span>
                      </div>
                      {userInfo.name && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Name:</span>
                          <span className="font-medium">{userInfo.name}</span>
                        </div>
                      )}
                      {userInfo.phone && (
                        <>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Phone:</span>
                            <span className="font-medium">{userInfo.phone}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Phone Verified:</span>
                            <span className={userInfo.phoneVerified ? 'text-green-600' : 'text-red-600'}>
                              {userInfo.phoneVerified ? '✅ Verified' : '❌ Not Verified'}
                            </span>
                          </div>
                        </>
                      )}
                      <div className="flex justify-between">
                        <span className="text-gray-600">MFA Status:</span>
                        <span className={userInfo.mfaEnabled ? 'text-green-600' : 'text-orange-600'}>
                          {userInfo.mfaEnabled ? '✅ Enabled' : '⚠️ Disabled'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">User ID:</span>
                        <span className="font-mono text-xs">{userInfo.sub}</span>
                      </div>
                    </div>
                  </div>

                  {/* Security Recommendations */}
                  {(!userInfo.emailVerified || !userInfo.mfaEnabled) && (
                    <div className="p-4 bg-orange-50 rounded-lg">
                      <h3 className="font-medium text-orange-800 mb-2">🔒 Security Recommendations</h3>
                      <ul className="text-sm text-orange-700 space-y-1">
                        {!userInfo.emailVerified && (
                          <li>• Verify your email address for account recovery</li>
                        )}
                        {!userInfo.mfaEnabled && (
                          <li>• Enable multi-factor authentication for better security</li>
                        )}
                      </ul>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="space-y-3">
                    {!userInfo.mfaEnabled && (
                      <Link 
                        href="/auth/mfa-setup"
                        className="block w-full text-center px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
                      >
                        Set Up MFA (Recommended)
                      </Link>
                    )}
                    
                    <Link 
                      href="/auth/change-password"
                      className="block w-full text-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Change Password
                    </Link>
                    
                    <button
                      onClick={() => setShowTokens(!showTokens)}
                      className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                    >
                      {showTokens ? 'Hide' : 'Show'} Debug Tokens
                    </button>
                  </div>

                  {/* Debug Tokens */}
                  {showTokens && <AuthDebug />}

                  {/* Sign Out Options */}
                  <div className="border-t pt-4 space-y-3">
                    <h3 className="font-medium text-gray-800">Sign Out Options</h3>
                    
                    <button
                      onClick={() => removeUser()}
                      className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                    >
                      Sign Out (Local Only)
                    </button>
                    
                    <button
                      onClick={() => signOutRedirect()}
                      className="w-full px-4 py-2 bg-red-700 text-white rounded-lg hover:bg-red-800"
                    >
                      Sign Out (Complete)
                    </button>
                    
                    <p className="text-xs text-gray-500 text-center">
                      "Complete" sign out will also sign you out from Cognito
                    </p>
                  </div>
                </div>
              </>
            );
          })()}
        </div>
      </AuthLayout>
    </AuthGuard>
  );
}