'use client';

import Link from 'next/link';
import { useAuthStore } from '@/lib/auth-store';
import { Button } from '@kairos/ui';

export default function WelcomePage() {
  const user = useAuthStore((s) => s.user);
  const firstName = user?.firstName ?? 'Friend';

  return (
    <div className="rounded-2xl bg-white shadow-xl overflow-hidden">
      {/* Purple gradient header */}
      <div className="bg-gradient-to-br from-purple-900 to-purple-800 px-8 py-10 text-white text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 mb-4">
          <svg className="h-9 w-9" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold">Welcome, {firstName}!</h1>
        <p className="mt-2 text-purple-200 text-sm">
          You&apos;re now part of Kharis Church
        </p>
      </div>

      {/* Body */}
      <div className="px-8 py-6 space-y-6">
        {/* What's next */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">What&#39;s next</h2>
          <div className="space-y-2">
            {[
              {
                icon: (
                  <svg className="h-5 w-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                  </svg>
                ),
                title: 'Complete your profile',
                desc: 'Add a photo and fill in your contact details',
              },
              {
                icon: (
                  <svg className="h-5 w-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                  </svg>
                ),
                title: 'Join a Fellowship',
                desc: 'Connect with a small group that fits your schedule',
              },
              {
                icon: (
                  <svg className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                  </svg>
                ),
                title: 'Explore upcoming events',
                desc: "See what's happening in your branch this season",
              },
            ].map((item) => (
              <div key={item.title} className="flex items-start gap-3 rounded-xl bg-muted/30 p-3">
                <span className="mt-0.5 shrink-0">{item.icon}</span>
                <div>
                  <p className="text-sm font-medium">{item.title}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Gold accent info */}
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-xs font-medium text-amber-800">Getting Started</p>
          <p className="mt-0.5 text-xs text-amber-700">
            Your account has been activated. Reach out to your branch administrator if you need any help navigating the platform.
          </p>
        </div>

        <Link href="/dashboard">
          <Button className="h-11 w-full rounded-xl font-semibold">
            Go to Dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
}
