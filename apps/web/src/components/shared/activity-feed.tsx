'use client';

import { cn } from '@/lib/utils';

interface ActivityItem {
  action: string;
  timestamp: string;
  actor: string;
}

interface ActivityFeedProps {
  items: ActivityItem[];
  maxItems?: number;
  className?: string;
}

function formatTimeAgo(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function ActivityFeed({ items, maxItems = 10, className }: ActivityFeedProps) {
  const visible = items.slice(0, maxItems);

  if (visible.length === 0) {
    return <p className="py-4 text-center text-sm text-muted-foreground">No recent activity</p>;
  }

  return (
    <ul className={cn('divide-y divide-border', className)} role="list" aria-label="Recent activity">
      {visible.map((item, i) => (
        <li key={i} className="flex items-start justify-between gap-2 py-3 first:pt-0 last:pb-0">
          <div className="min-w-0">
            <p className="text-sm text-foreground truncate">{item.action}</p>
            <p className="text-xs text-muted-foreground">{item.actor}</p>
          </div>
          <time className="shrink-0 text-xs text-muted-foreground" dateTime={item.timestamp}>
            {formatTimeAgo(item.timestamp)}
          </time>
        </li>
      ))}
    </ul>
  );
}

export type { ActivityItem };
