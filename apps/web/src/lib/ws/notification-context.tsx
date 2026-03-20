'use client';

import { createContext, useContext, useEffect, useCallback, useRef, useState, type ReactNode } from 'react';
import { WSManager, type WSMessage } from './ws-manager';
import { useAuth } from '@/lib/auth';

export interface Notification {
  id: string;
  type: 'Announcement' | 'Reminder' | 'Alert';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  priority?: 'Low' | 'Normal' | 'High' | 'Urgent';
  link?: string;
}

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
}

interface NotificationContextValue extends NotificationState {
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
  isConnected: boolean;
  toast: Notification | null;
  dismissToast: () => void;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

function getWsUrl(): string {
  return process.env.NEXT_PUBLIC_WS_URL || '';
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, getToken } = useAuth();
  const wsRef = useRef<WSManager | null>(null);
  const [state, setState] = useState<NotificationState>({ notifications: [], unreadCount: 0 });
  const [isConnected, setIsConnected] = useState(false);

  // Toast state for high-priority notifications
  const [toast, setToast] = useState<Notification | null>(null);

  const dismissToast = useCallback(() => setToast(null), []);

  // Handle incoming WebSocket messages
  const handleMessage = useCallback((msg: WSMessage) => {
    // Only process notification-type messages
    if (msg.type !== 'Announcement' && msg.type !== 'Reminder' && msg.type !== 'Alert') return;

    const data = msg.data as Record<string, unknown>;
    const notification: Notification = {
      id: (data.id as string) || crypto.randomUUID(),
      type: msg.type as Notification['type'],
      title: (data.title as string) || '',
      message: (data.message as string) || '',
      timestamp: (data.timestamp as string) || new Date().toISOString(),
      read: false,
      priority: (data.priority as Notification['priority']) || 'Normal',
      link: (data.link as string) || undefined,
    };

    setState((prev) => ({
      notifications: [notification, ...prev.notifications],
      unreadCount: prev.unreadCount + 1,
    }));

    // Show toast for high-priority and urgent notifications
    if (notification.priority === 'High' || notification.priority === 'Urgent') {
      setToast(notification);
      setTimeout(() => setToast(null), 8000);
    }
  }, []);

  // Connect/disconnect based on auth state
  useEffect(() => {
    const wsUrl = getWsUrl();
    if (!isAuthenticated || !wsUrl) return;

    const manager = new WSManager({ url: wsUrl, getToken });
    wsRef.current = manager;

    const unsubMsg = manager.onMessage(handleMessage);
    const unsubConnect = manager.onConnect(() => setIsConnected(true));
    const unsubDisconnect = manager.onDisconnect(() => setIsConnected(false));

    manager.connect();

    return () => {
      unsubMsg();
      unsubConnect();
      unsubDisconnect();
      manager.disconnect();
      wsRef.current = null;
    };
  }, [isAuthenticated, getToken, handleMessage]);

  const markAsRead = useCallback((id: string) => {
    setState((prev) => {
      const updated = prev.notifications.map((n) =>
        n.id === id && !n.read ? { ...n, read: true } : n,
      );
      const wasUnread = prev.notifications.find((n) => n.id === id && !n.read);
      return {
        notifications: updated,
        unreadCount: wasUnread ? prev.unreadCount - 1 : prev.unreadCount,
      };
    });
  }, []);

  const markAllAsRead = useCallback(() => {
    setState((prev) => ({
      notifications: prev.notifications.map((n) => ({ ...n, read: true })),
      unreadCount: 0,
    }));
  }, []);

  const clearNotifications = useCallback(() => {
    setState({ notifications: [], unreadCount: 0 });
  }, []);

  return (
    <NotificationContext.Provider
      value={{ ...state, markAsRead, markAllAsRead, clearNotifications, isConnected, toast, dismissToast }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications(): NotificationContextValue {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
