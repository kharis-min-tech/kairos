'use client';

import { useState, useEffect } from 'react';
import { MessageSquare, ExternalLink, X, Info } from 'lucide-react';
import { useAuthStore } from '@/lib/auth-store';

const MM_URL = process.env.NEXT_PUBLIC_MATTERMOST_URL ?? 'http://localhost:8065';
const ONBOARDING_KEY = 'kairos-mm-onboarded';

export default function MessagesPage() {
  const user = useAuthStore((s) => s.user);
  const [bannerDismissed, setBannerDismissed] = useState(true); // start hidden to avoid flash

  // Read localStorage after mount to avoid hydration mismatch
  useEffect(() => {
    const dismissed = localStorage.getItem(ONBOARDING_KEY) === 'true';
    setBannerDismissed(dismissed);
  }, []);

  const dismissBanner = () => {
    localStorage.setItem(ONBOARDING_KEY, 'true');
    setBannerDismissed(true);
  };

  // Show banner if not dismissed, regardless of provisioning state
  const showBanner = !bannerDismissed;

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-violet-600" />
          <h1 className="text-lg font-semibold text-gray-900">Messages</h1>
        </div>
        <a
          href={MM_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-violet-600"
        >
          Open in new tab
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>

      {/* First-time onboarding banner */}
      {showBanner && (
        <div className="flex items-start gap-3 px-6 py-3 bg-violet-50 border-b border-violet-100">
          <Info className="h-4 w-4 text-violet-500 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-violet-900">First time here?</p>
            <p className="text-xs text-violet-700 mt-0.5">
              Log in to Mattermost with your Kairos email
              {user?.email ? (
                <> (<span className="font-mono">{user.email}</span>)</>
              ) : null}
              {' '}and your account password. Your messaging account is created automatically when
              your membership is approved.
            </p>
            <a
              href={`${MM_URL}/login`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 mt-2 text-xs font-medium text-violet-700 hover:text-violet-900 underline underline-offset-2"
            >
              Open Mattermost login
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
          <button
            onClick={dismissBanner}
            className="shrink-0 text-violet-400 hover:text-violet-700"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Mattermost iframe */}
      <div className="flex-1 relative">
        <iframe
          src={MM_URL}
          className="w-full h-full border-0"
          title="Kairos Messages"
          allow="clipboard-write; microphone"
        />
      </div>
    </div>
  );
}

