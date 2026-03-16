'use client';

import { useState, useMemo } from 'react';
import {
  Bell,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Megaphone,
} from 'lucide-react';
import { formatDistanceToNow, isToday, isYesterday, isThisWeek } from 'date-fns';
import { PageHeader, FilterTabs } from '@/components/shared';
import { Breadcrumbs } from '@/components/layout';
import { Button, Badge, Card, CardContent } from '@/components/ui';
import { useNotificationsList, useMarkNotificationRead } from '@/hooks/use-notifications';
import { useAuth } from '@/lib/auth';
import { BroadcastModal } from '@/components/notifications/broadcast-modal';

type NotificationTab = 'all' | 'events' | 'messages' | 'reminders';

const TABS: { label: string; value: NotificationTab }[] = [
  { label: 'All', value: 'all' },
  { label: 'Events', value: 'events' },
  { label: 'Messages', value: 'messages' },
  { label: 'Reminders', value: 'reminders' },
];

const TYPE_ICONS: Record<string, React.ReactNode> = {
  Announcement: <Megaphone className="h-4 w-4" />,
  Reminder: <Clock className="h-4 w-4" />,
  Alert: <AlertCircle className="h-4 w-4" />,
  Event: <Calendar className="h-4 w-4" />,
  General: <Bell className="h-4 w-4" />,
};

const PRIORITY_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  Low: 'outline',
  Normal: 'secondary',
  High: 'default',
  Urgent: 'destructive',
};

function tabMatchesType(tab: NotificationTab, type: string): boolean {
  switch (tab) {
    case 'events':
      return type === 'Event';
    case 'messages':
      return type === 'Announcement' || type === 'General';
    case 'reminders':
      return type === 'Reminder' || type === 'Alert';
    default:
      return true;
  }
}

interface NotificationItem {
  notification: {
    notificationId: number;
    title: string;
    message: string;
    notificationType: string;
    priority: string;
    sentAt: string;
  };
  isRead: boolean;
  readAt: string | null;
}

function groupByTime(items: NotificationItem[]) {
  const groups: { label: string; items: NotificationItem[] }[] = [];
  const today: NotificationItem[] = [];
  const yesterday: NotificationItem[] = [];
  const thisWeek: NotificationItem[] = [];
  const older: NotificationItem[] = [];

  for (const item of items) {
    const date = new Date(item.notification.sentAt);
    if (isToday(date)) today.push(item);
    else if (isYesterday(date)) yesterday.push(item);
    else if (isThisWeek(date)) thisWeek.push(item);
    else older.push(item);
  }

  if (today.length) groups.push({ label: 'Today', items: today });
  if (yesterday.length) groups.push({ label: 'Yesterday', items: yesterday });
  if (thisWeek.length) groups.push({ label: 'This Week', items: thisWeek });
  if (older.length) groups.push({ label: 'Earlier', items: older });

  return groups;
}

export default function NotificationsPage() {
  const [activeTab, setActiveTab] = useState<string>('all');
  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const { user } = useAuth();
  const isAdminOrPastor = user?.role === 'Admin' || user?.role === 'Pastor';

  const { data, isLoading } = useNotificationsList({ limit: 50 });
  const markRead = useMarkNotificationRead();

  const notifications = (data as unknown as { data: NotificationItem[] })?.data ?? [];

  const filtered = useMemo(
    () =>
      notifications.filter((n) =>
        tabMatchesType(activeTab as NotificationTab, n.notification.notificationType),
      ),
    [notifications, activeTab],
  );

  const groups = useMemo(() => groupByTime(filtered), [filtered]);
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Notifications' }]} />
      <PageHeader
        title="Notifications"
        description={unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
        actions={
          isAdminOrPastor ? (
            <Button onClick={() => setBroadcastOpen(true)}>
              <Megaphone className="mr-2 h-4 w-4" />
              Broadcast
            </Button>
          ) : undefined
        }
      />

      <FilterTabs
        tabs={TABS}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="h-16 animate-pulse rounded bg-muted" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Bell className="mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="text-lg font-semibold">No notifications</h3>
            <p className="text-sm text-muted-foreground">
              {activeTab === 'all'
                ? "You're all caught up!"
                : `No ${activeTab} notifications right now.`}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {groups.map((group) => (
            <div key={group.label}>
              <h3 className="mb-3 text-sm font-medium text-muted-foreground">{group.label}</h3>
              <div className="space-y-2">
                {group.items.map((item) => {
                  const n = item.notification;
                  return (
                    <Card
                      key={n.notificationId}
                      className={item.isRead ? 'opacity-60' : ''}
                    >
                      <CardContent className="flex items-start gap-4 p-4">
                        <div className="mt-0.5 rounded-full bg-primary/10 p-2 text-primary">
                          {TYPE_ICONS[n.notificationType] ?? <Bell className="h-4 w-4" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="font-medium leading-tight">{n.title}</p>
                              <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                                {n.message}
                              </p>
                            </div>
                            <div className="flex shrink-0 items-center gap-2">
                              {n.priority !== 'Normal' && (
                                <Badge variant={PRIORITY_VARIANT[n.priority] ?? 'secondary'}>
                                  {n.priority}
                                </Badge>
                              )}
                              {!item.isRead && (
                                <div className="h-2 w-2 rounded-full bg-primary" />
                              )}
                            </div>
                          </div>
                          <div className="mt-2 flex items-center gap-3">
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(n.sentAt), { addSuffix: true })}
                            </span>
                            {!item.isRead && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-auto px-2 py-1 text-xs"
                                onClick={() => markRead.mutate(n.notificationId)}
                              >
                                <CheckCircle2 className="mr-1 h-3 w-3" />
                                Mark read
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {isAdminOrPastor && (
        <BroadcastModal open={broadcastOpen} onClose={() => setBroadcastOpen(false)} />
      )}
    </div>
  );
}
