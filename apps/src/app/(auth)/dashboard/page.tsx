"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useCognitoAuth } from "../../../hooks/use-cognito-auth";

export default function DashboardPage() {
  const { getUserInfo, signOutRedirect } = useCognitoAuth();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  const userInfo = getUserInfo();

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-600">
          Welcome back, {userInfo?.email || 'User'}
        </p>
      </div>

      {/* User Status Card */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Account Status</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-medium text-blue-900">Email Status</h3>
            <p className="text-sm text-blue-700 mt-1">
              {userInfo?.emailVerified ? '✅ Verified' : '❌ Not Verified'}
            </p>
            <p className="text-xs text-blue-600 mt-1">{userInfo?.email}</p>
          </div>
          
          <div className="bg-green-50 p-4 rounded-lg">
            <h3 className="font-medium text-green-900">Security</h3>
            <p className="text-sm text-green-700 mt-1">
              MFA: {userInfo?.mfaEnabled ? '✅ Enabled' : '⚠️ Disabled'}
            </p>
            {userInfo?.phone && (
              <p className="text-xs text-green-600 mt-1">
                Phone: {userInfo?.phoneVerified ? '✅ Verified' : '❌ Not Verified'}
              </p>
            )}
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

      {/* Security Recommendations */}
      {(!userInfo?.emailVerified || !userInfo?.mfaEnabled) && (
        <div className="bg-orange-50 border border-orange-200 rounded-2xl p-6">
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

      {/* Church Management Features */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Church Management</p>
              <p className="mt-2 text-lg font-semibold text-gray-900">Coming Soon</p>
              <p className="mt-1 text-xs text-gray-500">Member management</p>
            </div>
            <div className="rounded-full bg-blue-100 p-3">
              <svg
                className="h-6 w-6 text-blue-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Events</p>
              <p className="mt-2 text-lg font-semibold text-gray-900">Coming Soon</p>
              <p className="mt-1 text-xs text-gray-500">Event scheduling</p>
            </div>
            <div className="rounded-full bg-purple-100 p-3">
              <svg
                className="h-6 w-6 text-purple-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Giving</p>
              <p className="mt-2 text-lg font-semibold text-gray-900">Coming Soon</p>
              <p className="mt-1 text-xs text-gray-500">Donation tracking</p>
            </div>
            <div className="rounded-full bg-green-100 p-3">
              <svg
                className="h-6 w-6 text-green-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Reports</p>
              <p className="mt-2 text-lg font-semibold text-gray-900">Coming Soon</p>
              <p className="mt-1 text-xs text-gray-500">Analytics & insights</p>
            </div>
            <div className="rounded-full bg-orange-100 p-3">
              <svg
                className="h-6 w-6 text-orange-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2-2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Getting Started */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Getting Started</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            href="/auth/profile"
            className="flex items-center gap-3 rounded-xl border border-gray-200 p-4 hover:bg-gray-50 transition-colors"
          >
            <div className="rounded-lg bg-blue-600 p-2">
              <svg
                className="h-5 w-5 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
            </div>
            <div>
              <p className="font-medium text-gray-900">View Profile</p>
              <p className="text-xs text-gray-500">Manage your account</p>
            </div>
          </Link>

          {!userInfo?.mfaEnabled && (
            <Link
              href="/auth/mfa-setup"
              className="flex items-center gap-3 rounded-xl border border-gray-200 p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="rounded-lg bg-orange-600 p-2">
                <svg
                  className="h-5 w-5 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
              </div>
              <div>
                <p className="font-medium text-gray-900">Set Up MFA</p>
                <p className="text-xs text-gray-500">Secure your account</p>
              </div>
            </Link>
          )}

          <Link
            href="/auth/change-password"
            className="flex items-center gap-3 rounded-xl border border-gray-200 p-4 hover:bg-gray-50 transition-colors"
          >
            <div className="rounded-lg bg-gray-600 p-2">
              <svg
                className="h-5 w-5 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                />
              </svg>
            </div>
            <div>
              <p className="font-medium text-gray-900">Change Password</p>
              <p className="text-xs text-gray-500">Update your password</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
