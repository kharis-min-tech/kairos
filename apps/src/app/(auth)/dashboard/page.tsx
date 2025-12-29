"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useCognitoAuth } from "../../../hooks/use-cognito-auth";

export default function DashboardPage() {
  const { getUserInfo } = useCognitoAuth();
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

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-neutral-900 text-white px-4 py-6 rounded-lg -mx-4">
        <div className="flex items-center space-x-3 mb-3">
          <div className="w-12 h-12 bg-neutral-700 rounded-full flex items-center justify-center">
            <i className="fa-solid fa-user text-white text-lg"></i>
          </div>
          <div>
            <h1 className="text-xl">Welcome back!</h1>
            <p className="text-neutral-300 text-sm">
              {userInfo?.email || 'Member'}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-4 text-sm">
          <div className="flex items-center space-x-1">
            <i className="fa-solid fa-shield-alt text-neutral-300"></i>
            <span className="text-neutral-300">
              {userInfo?.emailVerified ? 'Verified Account' : 'Pending Verification'}
            </span>
          </div>
          {userInfo?.mfaEnabled && (
            <div className="flex items-center space-x-1">
              <i className="fa-solid fa-lock text-neutral-300"></i>
              <span className="text-neutral-300">2FA Enabled</span>
            </div>
          )}
        </div>
      </div>

      {/* Account Status */}
      <div>
        <h2 className="text-lg text-neutral-900 mb-4">Account Summary</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white border border-neutral-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <i className="fa-solid fa-envelope text-neutral-600"></i>
              <span className={`text-sm ${userInfo?.emailVerified ? 'text-neutral-800' : 'text-neutral-500'}`}>
                {userInfo?.emailVerified ? 'Verified' : 'Pending'}
              </span>
            </div>
            <p className="text-sm text-neutral-600">Email Status</p>
          </div>
          
          <div className="bg-white border border-neutral-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <i className="fa-solid fa-shield-alt text-neutral-600"></i>
              <span className={`text-sm ${userInfo?.mfaEnabled ? 'text-neutral-800' : 'text-neutral-500'}`}>
                {userInfo?.mfaEnabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>
            <p className="text-sm text-neutral-600">Two-Factor Auth</p>
          </div>

          {userInfo?.phone && (
            <div className="bg-white border border-neutral-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <i className="fa-solid fa-phone text-neutral-600"></i>
                <span className={`text-sm ${userInfo?.phoneVerified ? 'text-neutral-800' : 'text-neutral-500'}`}>
                  {userInfo?.phoneVerified ? 'Verified' : 'Pending'}
                </span>
              </div>
              <p className="text-sm text-neutral-600">Phone Status</p>
            </div>
          )}

          <div className="bg-white border border-neutral-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <i className="fa-solid fa-calendar text-neutral-600"></i>
              <span className="text-sm text-neutral-800">Active</span>
            </div>
            <p className="text-sm text-neutral-600">Membership</p>
          </div>
        </div>
      </div>

      {/* Security Recommendations */}
      {userInfo && (!userInfo?.emailVerified || !userInfo?.mfaEnabled) && (
        <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-4">
          <h3 className="text-sm text-neutral-800 mb-3 flex items-center">
            <i className="fa-solid fa-exclamation-triangle mr-2 text-neutral-600"></i>
            Security Recommendations
          </h3>
          <div className="space-y-2 text-xs text-neutral-600">
            {!userInfo?.emailVerified && (
              <div className="flex items-center space-x-2">
                <i className="fa-solid fa-dot-circle text-neutral-400 w-4"></i>
                <span>Verify your email address for account recovery</span>
              </div>
            )}
            {!userInfo?.mfaEnabled && (
              <div className="flex items-center space-x-2">
                <i className="fa-solid fa-dot-circle text-neutral-400 w-4"></i>
                <span>Enable two-factor authentication for better security</span>
              </div>
            )}
          </div>
          <div className="mt-3">
            {!userInfo?.mfaEnabled && (
              <Link 
                href="/auth/mfa-setup"
                className="inline-flex items-center px-3 py-2 border border-neutral-300 shadow-sm text-sm leading-4 font-medium rounded-md text-neutral-700 bg-white hover:bg-neutral-50"
              >
                <i className="fa-solid fa-shield-alt mr-2"></i>
                Set Up Two-Factor Auth
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Church Management Features */}
      <div>
        <h2 className="text-lg text-neutral-900 mb-4">Church Features</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white border border-neutral-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <i className="fa-solid fa-users text-neutral-600"></i>
              <span className="text-sm text-neutral-500">Soon</span>
            </div>
            <p className="text-sm text-neutral-600">Community</p>
          </div>

          <div className="bg-white border border-neutral-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <i className="fa-solid fa-calendar text-neutral-600"></i>
              <span className="text-sm text-neutral-500">Soon</span>
            </div>
            <p className="text-sm text-neutral-600">Events</p>
          </div>

          <div className="bg-white border border-neutral-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <i className="fa-solid fa-heart text-neutral-600"></i>
              <span className="text-sm text-neutral-500">Soon</span>
            </div>
            <p className="text-sm text-neutral-600">Giving</p>
          </div>

          <div className="bg-white border border-neutral-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <i className="fa-solid fa-chart-line text-neutral-600"></i>
              <span className="text-sm text-neutral-500">Soon</span>
            </div>
            <p className="text-sm text-neutral-600">Reports</p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg text-neutral-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-3">
          <Link
            href="/profile"
            className="bg-white border border-neutral-200 rounded-lg p-4 text-center hover:bg-neutral-50 transition-colors"
          >
            <i className="fa-solid fa-user text-neutral-600 text-2xl mb-2"></i>
            <p className="text-sm text-neutral-900">Profile</p>
          </Link>

          {userInfo && !userInfo?.mfaEnabled && (
            <Link
              href="/auth/mfa-setup"
              className="bg-white border border-neutral-200 rounded-lg p-4 text-center hover:bg-neutral-50 transition-colors"
            >
              <i className="fa-solid fa-shield-alt text-neutral-600 text-2xl mb-2"></i>
              <p className="text-sm text-neutral-900">Security</p>
            </Link>
          )}

          <Link
            href="/auth/change-password"
            className="bg-white border border-neutral-200 rounded-lg p-4 text-center hover:bg-neutral-50 transition-colors"
          >
            <i className="fa-solid fa-key text-neutral-600 text-2xl mb-2"></i>
            <p className="text-sm text-neutral-900">Password</p>
          </Link>

          <button className="bg-white border border-neutral-200 rounded-lg p-4 text-center hover:bg-neutral-50 transition-colors">
            <i className="fa-solid fa-cog text-neutral-600 text-2xl mb-2"></i>
            <p className="text-sm text-neutral-900">Settings</p>
          </button>
        </div>
      </div>

      {/* Getting Started */}
      <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-4">
        <h3 className="text-sm text-neutral-800 mb-3 flex items-center">
          <i className="fa-solid fa-lightbulb mr-2 text-neutral-600"></i>
          Getting Started
        </h3>
        <div className="space-y-2 text-xs text-neutral-600">
          <div className="flex items-start space-x-2">
            <i className="fa-solid fa-dot-circle text-neutral-400 mt-0.5 w-3"></i>
            <span>Complete your profile information</span>
          </div>
          <div className="flex items-start space-x-2">
            <i className="fa-solid fa-dot-circle text-neutral-400 mt-0.5 w-3"></i>
            <span>Verify your email address</span>
          </div>
          <div className="flex items-start space-x-2">
            <i className="fa-solid fa-dot-circle text-neutral-400 mt-0.5 w-3"></i>
            <span>Set up two-factor authentication</span>
          </div>
          <div className="flex items-start space-x-2">
            <i className="fa-solid fa-dot-circle text-neutral-400 mt-0.5 w-3"></i>
            <span>Explore church community features</span>
          </div>
        </div>
      </div>
    </div>
  );
}
