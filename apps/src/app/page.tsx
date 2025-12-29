"use client";

import { useRouter } from "next/navigation";
import { useCognitoAuth } from "../hooks/use-cognito-auth";
import { useEffect } from "react";

export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated, isLoading, getUserInfo, signinRedirect } = useCognitoAuth();

  useEffect(() => {
    // Redirect authenticated users to dashboard
    if (isAuthenticated) {
      router.push("/dashboard");
    }
  }, [isAuthenticated, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neutral-800 mx-auto mb-4"></div>
          <p className="text-neutral-600">Loading...</p>
        </div>
      </div>
    );
  }

  const userInfo = getUserInfo();

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b border-neutral-200 px-4 py-3">
        <div className="flex items-center justify-center">
          <div className="flex items-center space-x-2">
            <i className="fa-solid fa-church text-2xl text-neutral-800"></i>
            <span className="text-lg text-neutral-800">KCMS</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 py-8">
        {isAuthenticated && userInfo ? (
          <div className="text-center">
            <div className="w-24 h-24 mx-auto mb-6 bg-neutral-800 rounded-full flex items-center justify-center">
              <i className="fa-solid fa-check text-white text-3xl"></i>
            </div>
            
            <h1 className="text-2xl text-neutral-900 mb-4">Welcome back!</h1>
            <p className="text-neutral-600 mb-6 leading-relaxed">
              You're signed in as {userInfo.email}
            </p>

            <div className="space-y-3">
              <button
                onClick={() => router.push("/dashboard")}
                className="w-full bg-neutral-900 text-white py-3 px-4 rounded-lg hover:bg-neutral-800 transition-colors"
              >
                Go to Dashboard
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center">
            <div className="w-24 h-24 mx-auto mb-6 bg-neutral-100 rounded-full flex items-center justify-center">
              <i className="fa-solid fa-hands-praying text-neutral-800 text-3xl"></i>
            </div>
            
            <h1 className="text-2xl text-neutral-900 mb-4">Welcome to KCMS</h1>
            <p className="text-neutral-600 mb-6 leading-relaxed">
              Your digital home for church community, spiritual growth, and meaningful connections. Let's get you started on your journey.
            </p>

            {/* Key Features Preview */}
            <div className="space-y-4 mb-8">
              <div className="flex items-center space-x-3 text-left">
                <div className="w-10 h-10 bg-neutral-800 rounded-lg flex items-center justify-center flex-shrink-0">
                  <i className="fa-solid fa-users text-white text-sm"></i>
                </div>
                <div>
                  <h3 className="text-sm text-neutral-800">Connect with Community</h3>
                  <p className="text-xs text-neutral-600">Join departments and house groups</p>
                </div>
              </div>

              <div className="flex items-center space-x-3 text-left">
                <div className="w-10 h-10 bg-neutral-800 rounded-lg flex items-center justify-center flex-shrink-0">
                  <i className="fa-solid fa-calendar text-white text-sm"></i>
                </div>
                <div>
                  <h3 className="text-sm text-neutral-800">Stay Updated</h3>
                  <p className="text-xs text-neutral-600">Events, services, and announcements</p>
                </div>
              </div>

              <div className="flex items-center space-x-3 text-left">
                <div className="w-10 h-10 bg-neutral-800 rounded-lg flex items-center justify-center flex-shrink-0">
                  <i className="fa-solid fa-heart text-white text-sm"></i>
                </div>
                <div>
                  <h3 className="text-sm text-neutral-800">Track Your Journey</h3>
                  <p className="text-xs text-neutral-600">Giving, attendance, and growth</p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => signinRedirect()}
                className="w-full bg-neutral-900 text-white py-3 px-4 rounded-lg hover:bg-neutral-800 transition-colors"
              >
                Sign In
              </button>

              <button
                onClick={() => router.push("/auth/signup")}
                className="w-full border border-neutral-300 text-neutral-700 py-3 px-4 rounded-lg hover:bg-neutral-50 transition-colors"
              >
                Create Account
              </button>
            </div>
          </div>
        )}
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
  );
}