'use client';

import { useState, useEffect, useRef } from 'react';
import { MessageSquare, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';

// /mm is proxied by Next.js to localhost:8065/mm (same origin — cookies work)
const MM_PROXY = '/mm';
// Deep path that avoids the /mm/ root redirect loop.
// MM's client-side router will navigate to the correct team/channel after auth.
const MM_SRC = `${MM_PROXY}/channels/town-square`;

type State = 'loading' | 'ready' | 'not-provisioned' | 'error';

export default function MessagesPage() {
  const [state, setState] = useState<State>('loading');
  const didInit = useRef(false);

  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;

    (async () => {
      try {
        // Check if already authenticated with MM — skip re-login
        const meRes = await fetch(`${MM_PROXY}/api/v4/users/me`, { credentials: 'include' });
        if (meRes.ok) {
          setState('ready');
          return;
        }

        // Get credentials from Kairos API
        const res = await api.messaging.getCredentials();
        if (!res.data) {
          setState('not-provisioned');
          return;
        }

        // Log into MM via the same-origin proxy
        const loginRes = await fetch(`${MM_PROXY}/api/v4/users/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ login_id: res.data.email, password: res.data.password }),
        });

        if (!loginRes.ok) { setState('error'); return; }

        // MM returns the session token in a `Token` response header (not Set-Cookie).
        // Manually plant it as a cookie on this origin so the iframe picks it up.
        const mmToken = loginRes.headers.get('Token');
        if (mmToken) {
          const userData: { id?: string } = await loginRes.json().catch(() => ({}));
          document.cookie = `MMAUTHTOKEN=${mmToken}; path=/mm; SameSite=Lax`;
          if (userData.id) {
            document.cookie = `MMUSERID=${userData.id}; path=/mm; SameSite=Lax`;
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
      <div className="flex items-center px-6 py-4 border-b border-gray-200 bg-white">
        <MessageSquare className="h-5 w-5 text-violet-600 mr-2" />
        <h1 className="text-lg font-semibold text-gray-900">Messages</h1>
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
              Your messaging account is created automatically once your membership is approved.
              Contact your admin if you think this is a mistake.
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
            src={MM_SRC}
            className="w-full h-full border-0"
            title="Kairos Messages"
            allow="clipboard-write; microphone"
          />
        </div>
      )}
    </div>
  );
}
