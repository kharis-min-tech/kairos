'use client';

import { useState, useEffect, useRef } from 'react';
import { MessageSquare, ExternalLink, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';

const MM_URL = process.env.NEXT_PUBLIC_MATTERMOST_URL ?? 'http://localhost:8065';

type State = 'loading' | 'ready' | 'not-provisioned' | 'error';

export default function MessagesPage() {
  const [state, setState] = useState<State>('loading');
  const didLogin = useRef(false);

  useEffect(() => {
    if (didLogin.current) return;
    didLogin.current = true;

    (async () => {
      try {
        // 1. Get this member's MM credentials from Kairos API
        const res = await api.messaging.getCredentials();
        if (!res.data) {
          setState('not-provisioned');
          return;
        }
        const { email, password } = res.data;

        // 2. POST to Mattermost's login endpoint — sets MMAUTHTOKEN cookie on MM origin
        const mmRes = await fetch(`${MM_URL}/api/v4/users/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include', // stores the session cookie for localhost:8065
          body: JSON.stringify({ login_id: email, password }),
        });

        if (!mmRes.ok) {
          // May be logged in as a different user — logout then retry
          await fetch(`${MM_URL}/api/v4/users/logout`, {
            method: 'POST',
            credentials: 'include',
          });
          const retry = await fetch(`${MM_URL}/api/v4/users/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ login_id: email, password }),
          });
          if (!retry.ok) {
            setState('error');
            return;
          }
        }

        setState('ready');
      } catch {
        setState('error');
      }
    })();
  }, []);

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

      {state === 'loading' && (
        <div className="flex flex-1 items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Connecting to Messages…</span>
        </div>
      )}

      {state === 'not-provisioned' && (
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center max-w-sm">
            <MessageSquare className="h-10 w-10 text-violet-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-700">Messaging not set up yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Your messaging account is created automatically once your membership is approved. Contact your admin if you think this is a mistake.
            </p>
          </div>
        </div>
      )}

      {state === 'error' && (
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center max-w-sm">
            <p className="text-sm font-medium text-gray-700">Could not connect to Messages</p>
            <p className="text-xs text-muted-foreground mt-1">
              The messaging service may be temporarily unavailable. Try refreshing the page.
            </p>
          </div>
        </div>
      )}

      {state === 'ready' && (
        <div className="flex-1 relative">
          <iframe
            src={MM_URL}
            className="w-full h-full border-0"
            title="Kairos Messages"
            allow="clipboard-write; microphone"
          />
        </div>
      )}
    </div>
  );
}
