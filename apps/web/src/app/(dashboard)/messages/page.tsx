'use client';

import { useEffect, useState, useCallback } from 'react';
import { MessageSquare, ExternalLink, RefreshCw, AlertCircle } from 'lucide-react';
import { useAuthStore } from '@/lib/auth-store';
import { Spinner } from '@/components/ui';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const MM_URL = process.env.NEXT_PUBLIC_MATTERMOST_URL ?? 'http://localhost:8065';

export default function MessagesPage() {
  const { token } = useAuthStore();
  const [loginToken, setLoginToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLoginToken = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/messaging/login-token`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 404) {
        setError('Your messaging account is being set up. Please check back shortly.');
        return;
      }
      if (!res.ok) {
        setError('Messaging service is temporarily unavailable. Please try again later.');
        return;
      }
      const data = await res.json() as { data: { token: string } };
      setLoginToken(data.data.token);
    } catch {
      setError('Could not connect to the messaging service.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchLoginToken();
  }, [fetchLoginToken]);

  // Build the Mattermost SSO URL
  const mattermostUrl = loginToken
    ? `${MM_URL}/login/sso/token/${loginToken}`
    : null;

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-violet-600" />
          <h1 className="text-lg font-semibold text-gray-900">Messages</h1>
        </div>
        <div className="flex items-center gap-2">
          {mattermostUrl && (
            <a
              href={mattermostUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-sm text-violet-600 hover:text-violet-700 font-medium"
            >
              Open in new tab
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
          <button
            onClick={fetchLoginToken}
            disabled={loading}
            className="p-1.5 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 relative bg-gray-50">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white">
            <div className="flex flex-col items-center gap-3 text-gray-500">
              <Spinner />
              <p className="text-sm">Loading messages…</p>
            </div>
          </div>
        )}

        {!loading && error && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="max-w-sm text-center space-y-3">
              <div className="mx-auto w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center">
                <AlertCircle className="h-6 w-6 text-amber-500" />
              </div>
              <p className="text-sm text-gray-600">{error}</p>
              <button
                onClick={fetchLoginToken}
                className="text-sm text-violet-600 hover:text-violet-700 font-medium"
              >
                Try again
              </button>
            </div>
          </div>
        )}

        {!loading && mattermostUrl && (
          <iframe
            src={mattermostUrl}
            className="w-full h-full border-0"
            title="Kairos Messages"
            allow="clipboard-write; microphone"
          />
        )}
      </div>
    </div>
  );
}
