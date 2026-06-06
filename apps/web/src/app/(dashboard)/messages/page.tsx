'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Megaphone, Loader2, Send, ChevronDown } from 'lucide-react';
import { useAuthStore } from '@/lib/auth-store';
import { useAnnouncements, useSendAnnouncement } from '@/hooks/use-announcements';
import { Button } from '@kairos/ui';
import { Card, CardContent } from '@kairos/ui';
import type { Announcement } from '@kairos/types';

// ── Schema ─────────────────────────────────────────────────

const composeSchema = z.object({
  target: z.enum(['branch', 'fellowship', 'department']),
  title: z.string().trim().max(200).optional(),
  message: z.string().trim().min(1, 'Message is required').max(4000),
});

type ComposeForm = z.infer<typeof composeSchema>;

// ── Helpers ────────────────────────────────────────────────

function formatRelativeTime(date: Date): string {
  const now = Date.now();
  const diff = now - new Date(date).getTime();
  const mins = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function targetLabel(a: Announcement): string {
  if (a.target === 'branch') return 'Branch';
  if (a.target === 'fellowship') return 'Fellowship';
  return 'Department';
}

const TARGET_BADGE: Record<string, string> = {
  branch: 'bg-violet-100 text-violet-700',
  fellowship: 'bg-blue-100 text-blue-700',
  department: 'bg-emerald-100 text-emerald-700',
};

// ── Compose panel ──────────────────────────────────────────

function ComposePanel() {
  const [open, setOpen] = useState(false);
  const { mutateAsync, isPending } = useSendAnnouncement();

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ComposeForm>({
    resolver: zodResolver(composeSchema),
    defaultValues: { target: 'branch' },
  });

  async function onSubmit(data: ComposeForm) {
    try {
      await mutateAsync({
        target: data.target,
        title: data.title || undefined,
        message: data.message,
      });
      toast.success('Announcement sent');
      reset();
      setOpen(false);
    } catch {
      toast.error('Failed to send announcement');
    }
  }

  return (
    <div className="border-b border-border bg-white">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-6 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
      >
        <span className="flex items-center gap-2">
          <Send className="h-4 w-4 text-violet-500" />
          New Announcement
        </span>
        <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <form onSubmit={handleSubmit(onSubmit)} className="px-6 pb-5 pt-1 space-y-4 bg-gray-50 border-t border-border">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Send to</label>
            <select
              {...register('target')}
              className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
            >
              <option value="branch">Entire Branch</option>
              <option value="fellowship">Fellowship</option>
              <option value="department">Department</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Title <span className="text-gray-400">(optional)</span></label>
            <input
              {...register('title')}
              placeholder="e.g. Sunday Service Reminder"
              className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Message</label>
            <textarea
              {...register('message')}
              rows={4}
              placeholder="Write your announcement here…"
              className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 resize-none"
            />
            {errors.message && <p className="mt-1 text-xs text-red-500">{errors.message.message}</p>}
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => { setOpen(false); reset(); }}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isPending}>
              {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Send className="h-4 w-4 mr-1" />}
              Send
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

// ── Announcement card ──────────────────────────────────────

function AnnouncementCard({ item }: { item: Announcement }) {
  return (
    <Card className="border-border shadow-none">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            {item.title && (
              <p className="text-sm font-semibold text-gray-900 mb-1">{item.title}</p>
            )}
            <p className="text-sm text-gray-700 whitespace-pre-line">{item.message}</p>
          </div>
          <span className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${TARGET_BADGE[item.target] ?? 'bg-gray-100 text-gray-600'}`}>
            {targetLabel(item)}
          </span>
        </div>
        <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
          <span className="font-medium text-gray-600">{item.authorName}</span>
          <span>·</span>
          <span>{formatRelativeTime(item.createdAt)}</span>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Page ───────────────────────────────────────────────────

export default function MessagesPage() {
  const user = useAuthStore((s) => s.user);
  const canCompose = user?.systemRole === 'admin' || user?.systemRole === 'pastor' || user?.systemRole === 'leader';

  const { data: announcements = [], isLoading, isError } = useAnnouncements({ limit: 50 });

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-white shrink-0">
        <div className="flex items-center gap-2">
          <Megaphone className="h-5 w-5 text-violet-600" />
          <h1 className="text-lg font-semibold text-gray-900">Announcements</h1>
        </div>
        {announcements.length > 0 && (
          <span className="text-xs text-muted-foreground">{announcements.length} message{announcements.length !== 1 ? 's' : ''}</span>
        )}
      </div>

      {/* Compose (admin / pastor / leader only) */}
      {canCompose && <ComposePanel />}

      {/* Feed */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3 bg-gray-50">
        {isLoading && (
          <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">Loading announcements…</span>
          </div>
        )}

        {isError && (
          <div className="flex items-center justify-center py-16">
            <p className="text-sm text-red-500">Could not load announcements. Try refreshing the page.</p>
          </div>
        )}

        {!isLoading && !isError && announcements.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
            <Megaphone className="h-10 w-10 text-gray-300" />
            <p className="text-sm font-medium text-gray-500">No announcements yet</p>
            {canCompose && (
              <p className="text-xs text-muted-foreground">Use the compose panel above to send your first announcement.</p>
            )}
          </div>
        )}

        {!isLoading && announcements.map((item: Announcement) => (
          <AnnouncementCard key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}
