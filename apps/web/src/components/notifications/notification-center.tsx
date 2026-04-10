'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Bell } from 'lucide-react';
import { useNotifications, type Notification } from '@/lib/ws';

function formatTimeAgo(timestamp: string): string {
  const now = Date.now();
  const then = new Date(timestamp).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}

function NotificationItem({
  notification,
  onSelect,
}: {
  notification: Notification;
  onSelect: (n: Notification) => void;
}) {
  return (
    <button
      onClick={() => onSelect(notification)}
      className={`flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors min-h-[44px] focus-visible:ring-2 focus-visible:ring-purple-700 focus-visible:outline-none ${
        !notification.read ? 'bg-blue-50/50' : ''
      }`}
      aria-label={`${notification.read ? '' : 'Unread: '}${notification.title}`}
    >
      {/* Unread indicator */}
      <span className="mt-1.5 flex-shrink-0">
        {!notification.read ? (
          <span className="block h-2.5 w-2.5 rounded-full bg-primary" aria-hidden="true" />
        ) : (
          <span className="block h-2.5 w-2.5" aria-hidden="true" />
        )}
      </span>

      <div className="min-w-0 flex-1">
        <p className={`text-sm truncate ${!notification.read ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
          {notification.title}
        </p>
        <p className="text-xs text-gray-500 truncate mt-0.5">{notification.message}</p>
        <p className="text-xs text-gray-500 mt-1">{formatTimeAgo(notification.timestamp)}</p>
      </div>
    </button>
  );
}

export function NotificationCenter() {
  const { notifications, unreadCount, markAsRead, markAllAsRead, toast, dismissToast } = useNotifications();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const displayCount = unreadCount > 99 ? '99+' : unreadCount;

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close on Escape
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    if (open) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [open]);

  const handleSelect = useCallback(
    (notification: Notification) => {
      if (!notification.read) {
        markAsRead(notification.id);
      }
      setOpen(false);
      if (notification.link) {
        window.location.href = notification.link;
      }
    },
    [markAsRead],
  );

  const handleMarkAllRead = useCallback(() => {
    markAllAsRead();
  }, [markAllAsRead]);

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="relative rounded-lg p-2 text-gray-600 hover:bg-gray-100 min-h-[44px] min-w-[44px] focus-visible:ring-2 focus-visible:ring-purple-700 focus-visible:ring-offset-2 focus-visible:outline-none"
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
        aria-expanded={open}
        aria-haspopup="true"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-highlight px-1 text-[10px] font-bold text-white"
            aria-hidden="true"
          >
            {displayCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 mt-1 w-80 rounded-lg border border-gray-200 bg-white shadow-lg"
          role="region"
          aria-label="Notifications panel"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
            <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs text-primary hover:text-primary/80 font-medium min-h-[44px] flex items-center focus-visible:ring-2 focus-visible:ring-purple-700 focus-visible:outline-none"
              >
                Mark all as read
              </button>
            )}
          </div>

          {/* Notification list */}
          <div className="max-h-80 overflow-y-auto" role="list">
            {notifications.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-gray-500">No notifications</p>
            ) : (
              notifications.map((n) => (
                <NotificationItem key={n.id} notification={n} onSelect={handleSelect} />
              ))
            )}
          </div>
        </div>
      )}

      {/* High-priority toast */}
      {toast && (
        <div
          className="fixed top-4 right-4 z-50 w-80 rounded-lg border border-red-200 bg-white shadow-xl"
          role="alert"
          aria-live="assertive"
        >
          <div className="flex items-start gap-3 p-4">
            <span className="mt-0.5 flex h-2.5 w-2.5 shrink-0 rounded-full bg-red-500" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-gray-900">{toast.title}</p>
              <p className="text-xs text-gray-600 mt-0.5 truncate">{toast.message}</p>
            </div>
            <button
              onClick={dismissToast}
              className="shrink-0 text-gray-400 hover:text-gray-600 text-sm min-h-[44px] min-w-[44px] flex items-center justify-center focus-visible:ring-2 focus-visible:ring-purple-700 focus-visible:outline-none"
              aria-label="Dismiss notification"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
