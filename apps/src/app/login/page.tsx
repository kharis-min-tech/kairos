"use client";

import Link from "next/link";

export default function LoginPage() {
  const handleLogin = () => {
    const url = process.env.NEXT_PUBLIC_COGNITO_LOGIN_URL;
    if (!url) {
      alert("Missing NEXT_PUBLIC_COGNITO_LOGIN_URL in .env.local");
      return;
    }
    window.location.href = url;
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold">Sign in</h1>
        <p className="mt-1 text-sm text-gray-600">
          You’ll be redirected to the secure Kairos sign-in page.
        </p>

        <div className="mt-6 space-y-3">
<button
  onClick={handleLogin}
  className="w-full rounded-xl bg-black px-4 py-2 text-white hover:opacity-90 active:opacity-80"
>
  Continue
</button>

<p className="mt-4 text-sm text-gray-600">
  <Link href="/forgot-password" className="text-blue-600 hover:underline">
    Forgot password?
  </Link>
</p>

          <p className="text-xs text-gray-500">
            If you don’t have an account, speak to your admin.
          </p>
        </div>
      </div>
    </main>
  );
}
