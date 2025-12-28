"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useCognitoAuth } from "../../hooks/use-cognito-auth";
import { AuthGuard } from "../../components/auth-guard";

export default function DashboardPage() {
  const { getUserInfo, signOutRedirect } = useCognitoAuth();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center">
                <h1 className="text-2xl font-bold text-gray-900">Kairos Dashboard</h1>
              </div>
              
              <div className="flex items-center space-x-4">
                <Link 
                  href="/auth/profile"
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Profile
                </Link>
                <button
                  onClick={() => signOutRedirect()}
                  className="bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-red-700"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            {(() => {
              const userInfo = getUserInfo();
              
              return (
                <div className="space-y-6">
                  {/* Welcome Section */}
                  <div className="bg-white overflow-hidden shadow rounded-lg">
                    <div className="px-4 py-5 sm:p-6">
                      <h2 className="text-lg font-medium text-gray-900 mb-2">
                        Welcome to Kairos!
                      </h2>
                      <p className="text-gray-600 mb-4">
                        Hello {userInfo?.email}, you have successfully signed in to your account.
                      </p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-blue-50 p-4 rounded-lg">
                          <h3 className="font-medium text-blue-900">Account Status</h3>
                          <p className="text-sm text-blue-700 mt-1">
                            Email: {userInfo?.emailVerified ? '✅ Verified' : '❌ Not Verified'}
                          </p>
                          {userInfo?.phone && (
                            <p className="text-sm text-blue-700">
                              Phone: {userInfo?.phoneVerified ? '✅ Verified' : '❌ Not Verified'}
                            </p>
                          )}
                        </div>
                        
                        <div className="bg-green-50 p-4 rounded-lg">
                          <h3 className="font-medium text-green-900">Security</h3>
                          <p className="text-sm text-green-700 mt-1">
                            MFA: {userInfo?.mfaEnabled ? '✅ Enabled' : '⚠️ Disabled'}
                          </p>
                        </div>
                        
                        <div className="bg-purple-50 p-4 rounded-lg">
                          <h3 className="font-medium text-purple-900">Quick Actions</h3>
                          <div className="mt-2 space-y-1">
                            <Link 
                              href="/auth/profile"
                              className="block text-sm text-purple-700 hover:underline"
                            >
                              View Profile
                            </Link>
                            {!userInfo?.mfaEnabled && (
                              <Link 
                                href="/auth/mfa-setup"
                                className="block text-sm text-purple-700 hover:underline"
                              >
                                Set Up MFA
                              </Link>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Security Recommendations */}
                  {(!userInfo?.emailVerified || !userInfo?.mfaEnabled) && (
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                      <h3 className="font-medium text-orange-900 mb-2">🔒 Security Recommendations</h3>
                      <ul className="text-sm text-orange-800 space-y-1">
                        {!userInfo?.emailVerified && (
                          <li>• Please verify your email address for account recovery</li>
                        )}
                        {!userInfo?.mfaEnabled && (
                          <li>• Enable multi-factor authentication for better security</li>
                        )}
                      </ul>
                      <div className="mt-3 space-x-3">
                        {!userInfo?.mfaEnabled && (
                          <Link 
                            href="/auth/mfa-setup"
                            className="inline-flex items-center px-3 py-2 border border-orange-300 shadow-sm text-sm leading-4 font-medium rounded-md text-orange-700 bg-white hover:bg-orange-50"
                          >
                            Set Up MFA
                          </Link>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Main Dashboard Content */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="bg-white overflow-hidden shadow rounded-lg">
                      <div className="p-5">
                        <h3 className="text-lg font-medium text-gray-900">Church Management</h3>
                        <p className="mt-1 text-sm text-gray-600">
                          Manage your church operations and activities.
                        </p>
                        <div className="mt-3">
                          <button className="text-indigo-600 hover:text-indigo-500 text-sm font-medium">
                            Coming Soon →
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white overflow-hidden shadow rounded-lg">
                      <div className="p-5">
                        <h3 className="text-lg font-medium text-gray-900">Member Directory</h3>
                        <p className="mt-1 text-sm text-gray-600">
                          View and manage church member information.
                        </p>
                        <div className="mt-3">
                          <button className="text-indigo-600 hover:text-indigo-500 text-sm font-medium">
                            Coming Soon →
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white overflow-hidden shadow rounded-lg">
                      <div className="p-5">
                        <h3 className="text-lg font-medium text-gray-900">Events & Calendar</h3>
                        <p className="mt-1 text-sm text-gray-600">
                          Schedule and manage church events.
                        </p>
                        <div className="mt-3">
                          <button className="text-indigo-600 hover:text-indigo-500 text-sm font-medium">
                            Coming Soon →
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </main>
      </div>
    </AuthGuard>
  );
}