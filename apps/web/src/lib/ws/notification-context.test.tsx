import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NotificationProvider, useNotifications } from './notification-context';
import type { WSMessage, MessageHandler } from './ws-manager';

// Capture the message handler registered by NotificationProvider
let capturedMessageHandler: MessageHandler | null = null;
let capturedConnectHandler: (() => void) | null = null;

vi.mock('./ws-manager', () => {
  class MockWSManager {
    connect = vi.fn().mockResolvedValue(undefined);
    disconnect = vi.fn();
    isConnected = false;

    onMessage(handler: MessageHandler) {
      capturedMessageHandler = handler;
      return () => { capturedMessageHandler = null; };
    }

    onConnect(handler: () => void) {
      capturedConnectHandler = handler;
      return () => { capturedConnectHandler = null; };
    }

    onDisconnect() {
      return () => {};
    }
  }

  return { WSManager: MockWSManager };
});

// Mock auth — authenticated by default
vi.mock('@/lib/auth', () => ({
  useAuth: vi.fn().mockReturnValue({
    isAuthenticated: true,
    getToken: vi.fn().mockResolvedValue('mock-token'),
  }),
}));

function TestConsumer() {
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearNotifications, isConnected } =
    useNotifications();

  return (
    <div>
      <span data-testid="unread-count">{unreadCount}</span>
      <span data-testid="total-count">{notifications.length}</span>
      <span data-testid="connected">{String(isConnected)}</span>
      <ul data-testid="notification-list">
        {notifications.map((n) => (
          <li key={n.id} data-testid={`notification-${n.id}`}>
            {n.type}: {n.title} (read: {String(n.read)})
          </li>
        ))}
      </ul>
      <button onClick={() => notifications[0] && markAsRead(notifications[0].id)}>
        Mark First Read
      </button>
      <button onClick={markAllAsRead}>Mark All Read</button>
      <button onClick={clearNotifications}>Clear</button>
    </div>
  );
}

describe('NotificationProvider', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_WS_URL = 'wss://test.example.com';
    capturedMessageHandler = null;
    capturedConnectHandler = null;
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    delete process.env.NEXT_PUBLIC_WS_URL;
  });

  it('starts with empty notifications and zero unread count', () => {
    render(
      <NotificationProvider>
        <TestConsumer />
      </NotificationProvider>,
    );

    expect(screen.getByTestId('unread-count').textContent).toBe('0');
    expect(screen.getByTestId('total-count').textContent).toBe('0');
  });

  it('adds notification on receiving a valid WebSocket message', async () => {
    render(
      <NotificationProvider>
        <TestConsumer />
      </NotificationProvider>,
    );

    // Wait for useEffect to fire and register the handler
    await waitFor(() => expect(capturedMessageHandler).not.toBeNull());

    // Simulate incoming message
    act(() => {
      capturedMessageHandler!({
        type: 'Alert',
        data: { id: 'n1', title: 'Test Alert', message: 'Something happened', timestamp: '2025-01-01T00:00:00Z' },
      });
    });

    expect(screen.getByTestId('unread-count').textContent).toBe('1');
    expect(screen.getByTestId('total-count').textContent).toBe('1');
    expect(screen.getByTestId('notification-n1').textContent).toContain('Alert: Test Alert');
  });

  it('ignores messages with unknown types', async () => {
    render(
      <NotificationProvider>
        <TestConsumer />
      </NotificationProvider>,
    );

    await waitFor(() => expect(capturedMessageHandler).not.toBeNull());

    act(() => {
      capturedMessageHandler!({ type: 'UnknownType', data: {} });
    });

    expect(screen.getByTestId('total-count').textContent).toBe('0');
  });

  it('increments unread count for each new notification', async () => {
    render(
      <NotificationProvider>
        <TestConsumer />
      </NotificationProvider>,
    );

    await waitFor(() => expect(capturedMessageHandler).not.toBeNull());

    act(() => {
      capturedMessageHandler!({
        type: 'Announcement',
        data: { id: 'n1', title: 'First', message: '' },
      });
    });
    act(() => {
      capturedMessageHandler!({
        type: 'Reminder',
        data: { id: 'n2', title: 'Second', message: '' },
      });
    });

    expect(screen.getByTestId('unread-count').textContent).toBe('2');
    expect(screen.getByTestId('total-count').textContent).toBe('2');
  });

  it('prepends new notifications (newest first)', async () => {
    render(
      <NotificationProvider>
        <TestConsumer />
      </NotificationProvider>,
    );

    await waitFor(() => expect(capturedMessageHandler).not.toBeNull());

    act(() => {
      capturedMessageHandler!({
        type: 'Alert',
        data: { id: 'n1', title: 'First', message: '' },
      });
    });
    act(() => {
      capturedMessageHandler!({
        type: 'Alert',
        data: { id: 'n2', title: 'Second', message: '' },
      });
    });

    const items = screen.getByTestId('notification-list').querySelectorAll('li');
    expect(items[0].textContent).toContain('Second');
    expect(items[1].textContent).toContain('First');
  });

  it('marks a single notification as read', async () => {
    const user = userEvent.setup();
    render(
      <NotificationProvider>
        <TestConsumer />
      </NotificationProvider>,
    );

    await waitFor(() => expect(capturedMessageHandler).not.toBeNull());

    act(() => {
      capturedMessageHandler!({
        type: 'Alert',
        data: { id: 'n1', title: 'Test', message: '' },
      });
    });
    expect(screen.getByTestId('unread-count').textContent).toBe('1');

    await user.click(screen.getByText('Mark First Read'));

    expect(screen.getByTestId('unread-count').textContent).toBe('0');
    expect(screen.getByTestId('notification-n1').textContent).toContain('read: true');
  });

  it('marks all notifications as read', async () => {
    const user = userEvent.setup();
    render(
      <NotificationProvider>
        <TestConsumer />
      </NotificationProvider>,
    );

    await waitFor(() => expect(capturedMessageHandler).not.toBeNull());

    act(() => {
      capturedMessageHandler!({
        type: 'Alert',
        data: { id: 'n1', title: 'A', message: '' },
      });
      capturedMessageHandler!({
        type: 'Reminder',
        data: { id: 'n2', title: 'B', message: '' },
      });
    });
    expect(screen.getByTestId('unread-count').textContent).toBe('2');

    await user.click(screen.getByText('Mark All Read'));

    expect(screen.getByTestId('unread-count').textContent).toBe('0');
  });

  it('clears all notifications', async () => {
    const user = userEvent.setup();
    render(
      <NotificationProvider>
        <TestConsumer />
      </NotificationProvider>,
    );

    await waitFor(() => expect(capturedMessageHandler).not.toBeNull());

    act(() => {
      capturedMessageHandler!({
        type: 'Alert',
        data: { id: 'n1', title: 'Test', message: '' },
      });
    });

    await user.click(screen.getByText('Clear'));

    expect(screen.getByTestId('total-count').textContent).toBe('0');
    expect(screen.getByTestId('unread-count').textContent).toBe('0');
  });

  it('does not decrement unread count when marking already-read notification', async () => {
    const user = userEvent.setup();
    render(
      <NotificationProvider>
        <TestConsumer />
      </NotificationProvider>,
    );

    await waitFor(() => expect(capturedMessageHandler).not.toBeNull());

    act(() => {
      capturedMessageHandler!({
        type: 'Alert',
        data: { id: 'n1', title: 'Test', message: '' },
      });
    });

    await user.click(screen.getByText('Mark First Read'));
    expect(screen.getByTestId('unread-count').textContent).toBe('0');

    // Mark again — should stay at 0
    await user.click(screen.getByText('Mark First Read'));
    expect(screen.getByTestId('unread-count').textContent).toBe('0');
  });
});

describe('useNotifications', () => {
  it('throws when used outside NotificationProvider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    function BadConsumer() {
      useNotifications();
      return null;
    }

    expect(() => render(<BadConsumer />)).toThrow(
      'useNotifications must be used within a NotificationProvider',
    );
    spy.mockRestore();
  });
});
