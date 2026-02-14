"use client";

import Link from "next/link";

export default function ForgotPasswordPage() {
  const handleLogin = () => {
    const url = process.env.NEXT_PUBLIC_COGNITO_LOGIN_URL;
    if (!url) {
      // Instead of alert, provide a visible inline error message
      return;
    }
    window.location.href = url;
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold">Forgot Your Password?</h1>
        <p className="mt-1 text-sm text-gray-600">
          We&apos;ll send you a link to reset your password.
        </p>

        <div className="mt-6 space-y-3">
          <button
            onClick={handleLogin}
            className="w-full rounded-xl bg-black px-4 py-2 text-white hover:opacity-90 active:opacity-80"
          >
            Send Reset Link
          </button>

          <p className="text-xs text-gray-500">
            <Link href="/auth/signin" className="text-blue-600 hover:underline">
              Back to sign in
            </Link>
          </p>
          <p className="text-xs text-gray-500">
            <Link href="/reset-password" className="text-blue-500 hover:underline">
              I already have a reset code
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
