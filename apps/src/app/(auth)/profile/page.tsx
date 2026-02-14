"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useCognitoAuth } from "../../../hooks/use-cognito-auth";

export default function ProfilePage() {
  const { getUserInfo, signOutComplete, signOutLocal } = useCognitoAuth();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-neutral-200 rounded w-1/4 mb-2"></div>
          <div className="h-4 bg-neutral-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  const userInfo = getUserInfo();

  if (!userInfo) {
    return (
      <div className="text-center py-8">
        <div className="text-neutral-600">Unable to load user information</div>
        <Link 
          href="/dashboard" 
          className="mt-4 inline-block text-neutral-800 hover:underline"
        >
          ← Back to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="text-center">
        <div className="w-20 h-20 mx-auto mb-4 bg-neutral-800 rounded-full flex items-center justify-center">
          <i className="fa-solid fa-user text-white text-2xl"></i>
        </div>
        <h1 className="text-2xl text-neutral-900 mb-2">Your Profile</h1>
        <p className="text-neutral-600">Manage your account settings and preferences</p>
      </div>

      {/* User Information Card */}
      <div className="bg-white border border-neutral-200 rounded-lg p-6">
        <h3 className="font-medium text-neutral-800 mb-4 flex items-center">
          <i className="fa-solid fa-info-circle mr-2 text-neutral-600"></i>
          Account Information
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-neutral-600">Email:</span>
              <span className="font-medium text-neutral-900">{userInfo.email}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-neutral-600">Email Verified:</span>
              <span className={userInfo.emailVerified ? 'text-green-600' : 'text-orange-600'}>
                {userInfo.emailVerified ? (
                  <span className="flex items-center">
                    <i className="fa-solid fa-check-circle mr-1"></i>
                    Verified
                  </span>
                ) : (
                  <span className="flex items-center">
                    <i className="fa-solid fa-exclamation-triangle mr-1"></i>
                    Pending
                  </span>
                )}
              </span>
            </div>
            {userInfo.name && (
              <div className="flex justify-between items-center">
                <span className="text-neutral-600">Name:</span>
                <span className="font-medium text-neutral-900">{userInfo.name}</span>
              </div>
            )}
          </div>
          <div className="space-y-3">
            {userInfo.phone && (
              <>
                <div className="flex justify-between items-center">
                  <span className="text-neutral-600">Phone:</span>
                  <span className="font-medium text-neutral-900">{userInfo.phone}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-neutral-600">Phone Verified:</span>
                  <span className={userInfo.phoneVerified ? 'text-green-600' : 'text-orange-600'}>
                    {userInfo.phoneVerified ? (
                      <span className="flex items-center">
                        <i className="fa-solid fa-check-circle mr-1"></i>
                        Verified
                      </span>
                    ) : (
                      <span className="flex items-center">
                        <i className="fa-solid fa-exclamation-triangle mr-1"></i>
                        Pending
                      </span>
                    )}
                  </span>
                </div>
              </>
            )}
            <div className="flex justify-between items-center">
              <span className="text-neutral-600">Two-Factor Auth:</span>
              <span className={userInfo.mfaEnabled ? 'text-green-600' : 'text-orange-600'}>
                {userInfo.mfaEnabled ? (
                  <span className="flex items-center">
                    <i className="fa-solid fa-shield-alt mr-1"></i>
                    Enabled
                  </span>
                ) : (
                  <span className="flex items-center">
                    <i className="fa-solid fa-exclamation-triangle mr-1"></i>
                    Disabled
                  </span>
                )}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-neutral-600">User ID:</span>
              <span className="font-mono text-xs text-neutral-500 break-all">{userInfo.sub}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Security Recommendations */}
      {(!userInfo.emailVerified || !userInfo.mfaEnabled) && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <h3 className="font-medium text-orange-800 mb-2 flex items-center">
            <i className="fa-solid fa-shield-alt mr-2 text-orange-600"></i>
            Security Recommendations
          </h3>
          <ul className="text-sm text-orange-700 space-y-1 mb-4">
            {!userInfo.emailVerified && (
              <li className="flex items-center space-x-2">
                <i className="fa-solid fa-dot-circle text-orange-400 w-3"></i>
                <span>Verify your email address for account recovery</span>
              </li>
            )}
            {!userInfo.mfaEnabled && (
              <li className="flex items-center space-x-2">
                <i className="fa-solid fa-dot-circle text-orange-400 w-3"></i>
                <span>Enable two-factor authentication for better security</span>
              </li>
            )}
          </ul>
          {!userInfo.mfaEnabled && (
            <Link 
              href="/auth/mfa-setup"
              className="inline-flex items-center px-4 py-2 bg-orange-600 text-white text-sm rounded-lg hover:bg-orange-700 transition-colors"
            >
              <i className="fa-solid fa-shield-alt mr-2"></i>
              Set Up Two-Factor Auth
            </Link>
          )}
        </div>
      )}

      {/* Account Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white border border-neutral-200 rounded-lg p-4">
          <h3 className="font-medium text-neutral-800 mb-3">Security Settings</h3>
          <div className="space-y-3">
            <Link 
              href="/auth/change-password"
              className="flex items-center justify-between p-3 border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors"
            >
              <div className="flex items-center">
                <i className="fa-solid fa-key mr-3 text-neutral-600"></i>
                <span className="text-sm text-neutral-700">Change Password</span>
              </div>
              <i className="fa-solid fa-chevron-right text-neutral-400"></i>
            </Link>
            
            {!userInfo.mfaEnabled && (
              <Link 
                href="/auth/mfa-setup"
                className="flex items-center justify-between p-3 border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors"
              >
                <div className="flex items-center">
                  <i className="fa-solid fa-shield-alt mr-3 text-neutral-600"></i>
                  <span className="text-sm text-neutral-700">Set Up 2FA</span>
                </div>
                <i className="fa-solid fa-chevron-right text-neutral-400"></i>
              </Link>
            )}
          </div>
        </div>

        <div className="bg-white border border-neutral-200 rounded-lg p-4">
          <h3 className="font-medium text-neutral-800 mb-3">Account Management</h3>
          <div className="space-y-3">
            <Link 
              href="/dashboard"
              className="flex items-center justify-between p-3 border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors"
            >
              <div className="flex items-center">
                <i className="fa-solid fa-home mr-3 text-neutral-600"></i>
                <span className="text-sm text-neutral-700">Back to Dashboard</span>
              </div>
              <i className="fa-solid fa-chevron-right text-neutral-400"></i>
            </Link>
          </div>
        </div>
      </div>

      {/* Sign Out Section */}
      <div className="bg-white border border-neutral-200 rounded-lg p-4">
        <h3 className="font-medium text-neutral-800 mb-3 flex items-center">
          <i className="fa-solid fa-sign-out-alt mr-2 text-neutral-600"></i>
          Sign Out Options
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <button
            onClick={() => signOutLocal()}
            className="flex items-center justify-center px-4 py-3 border border-neutral-300 text-neutral-700 rounded-lg hover:bg-neutral-50 transition-colors"
          >
            <i className="fa-solid fa-sign-out-alt mr-2"></i>
            Sign Out (Local Only)
          </button>
          
          <button
            onClick={() => signOutComplete()}
            className="flex items-center justify-center px-4 py-3 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-colors"
          >
            <i className="fa-solid fa-sign-out-alt mr-2"></i>
            Sign Out (Complete)
          </button>
        </div>
        <p className="text-xs text-neutral-500 text-center mt-3">
          "Complete" sign out will clear all sessions and sign you out from the authentication service
        </p>
      </div>
    </div>
  );
}