'use client';

import Link from 'next/link';
import { useAuthStore } from '@/lib/auth-store';
import { KharisCardHeader } from '../kharis-logo';

export default function WelcomePage() {
  const user = useAuthStore((s) => s.user);
  const firstName = user?.firstName ?? 'Friend';

  return (
    <>
      {/* Heading — outside card */}
      <KharisCardHeader heading={<>Welcome, {firstName}!</>} subtitle="You're now part of Kharis Church" />

      <div className="rounded-2xl bg-card p-8 shadow-[0_8px_40px_rgba(26,28,28,0.06)] dark:shadow-[0_8px_40px_rgba(0,0,0,0.3)]">
        <div className="space-y-6">
          {/* What's next */}
          <div className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">What&#39;s next</h2>
            <div className="space-y-2">
              {[
                {
                  icon: (
                    <svg className="h-5 w-5 text-[#5D3FD3]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                    </svg>
                  ),
                  title: 'Complete your profile',
                  desc: 'Add a photo and fill in your contact details',
                },
                {
                  icon: (
                    <svg className="h-5 w-5 text-[#f8b537]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                    </svg>
                  ),
                  title: 'Join a Fellowship',
                  desc: 'Connect with a small group that fits your schedule',
                },
                {
                  icon: (
                    <svg className="h-5 w-5 text-[#5D3FD3]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                    </svg>
                  ),
                  title: 'Explore upcoming events',
                  desc: "See what's happening in your branch this season",
                },
              ].map((item) => (
                <div key={item.title} className="flex items-start gap-3 rounded-lg bg-muted/40 p-3">
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
          <div className="rounded-lg bg-[#f8b537]/10 p-4">
            <p className="text-xs font-medium text-[#9a6b04] dark:text-[#f8b537]">Getting Started</p>
            <p className="mt-0.5 text-xs text-[#9a6b04]/80 dark:text-[#f8b537]/80">
              Your account has been activated. Reach out to your branch administrator if you need any help navigating the platform.
            </p>
          </div>

          <Link href="/dashboard" className="block">
            <button className="flex h-11 w-full items-center justify-center rounded-lg bg-gradient-to-br from-[#451ebb] to-[#5d3fd3] text-sm font-semibold text-white shadow-md shadow-[#5d3fd3]/20 transition-opacity hover:opacity-90">
              Go to Dashboard
            </button>
          </Link>
        </div>
      </div>
    </>
  );
}
