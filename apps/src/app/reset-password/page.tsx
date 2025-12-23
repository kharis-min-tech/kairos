"use client";

import Link from "next/link";

export default function ResetPasswordPage() {
  const handleResetPassword = () => {
    // UI-only for now (backend later)
    alert("Reset password (UI only). Backend will be wired later.");
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold">Reset password</h1>
        <p className="mt-1 text-sm text-gray-600">
          Enter the code you received and set a new password.
        </p>

        <div className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Reset code
            </label>
            <input
              className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:ring"
              placeholder="123456"
              inputMode="numeric"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              New password
            </label>
            <input
              className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:ring"
              type="password"
              placeholder="••••••••"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Confirm password
            </label>
            <input
              className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:ring"
              type="password"
              placeholder="••••••••"
            />
          </div>

          <button
            onClick={handleResetPassword}
            className="w-full rounded-xl bg-black px-4 py-2 text-white hover:opacity-90 active:opacity-80"
          >
            Reset password
          </button>

          <p className="text-xs text-gray-500">
            <Link href="/login" className="text-blue-600 hover:underline">
              Back to sign in
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
