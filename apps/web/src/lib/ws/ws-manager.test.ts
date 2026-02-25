import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WSManager } from './ws-manager';

// --- Mock WebSocket ---
type WSEventHandler = ((event?: unknown) => void) | null;

class MockWebSocket {
  static OPEN = 1;
  static CLOSED = 3;
  static instances: MockWebSocket[] = [];

  url: string;
  readyState = 0; // CONNECTING
  onopen: WSEventHandler = null;
  onclose: WSEventHandler = null;
  onmessage: WSEventHandler = null;
  onerror: WSEventHandler = null;
  closeCalled = false;

  constructor(url: string) {
    this.url = url;
    MockWebSocket.instances.push(this);
  }

  close() {
    this.closeCalled = true;
    this.readyState = MockWebSocket.CLOSED;
  }

  // Test helpers
  simulateOpen() {
    this.readyState = MockWebSocket.OPEN;
    this.onopen?.();
  }

  simulateMessage(data: string) {
    this.onmessage?.({ data } as unknown);
  }

  simulateClose() {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.();
  }

  simulateError() {
    this.onerror?.();
  }
}

// Replace global WebSocket
const OriginalWebSocket = globalThis.WebSocket;

beforeEach(() => {
  MockWebSocket.instances = [];
  (globalThis as unknown as Record<string, unknown>).WebSocket = MockWebSocket as unknown as typeof WebSocket;
  vi.useFakeTimers();
});

afterEach(() => {
  (globalThis as unknown as Record<string, unknown>).WebSocket = OriginalWebSocket;
  vi.useRealTimers();
});

function createManager(overrides?: Partial<ConstructorParameters<typeof WSManager>[0]>) {
  return new WSManager({
    url: 'wss://test.example.com',
    getToken: vi.fn().mockResolvedValue('test-token'),
    ...overrides,
  });
}

describe('WSManager', () => {
  describe('connect', () => {
    it('creates a WebSocket with token as query param', async () => {
      const manager = createManager();
      await manager.connect();

      expect(MockWebSocket.instances).toHaveLength(1);
      expect(MockWebSocket.instances[0].url).toBe(
        'wss://test.example.com?token=test-token',
      );
    });

    it('does not connect if getToken returns null', async () => {
      const manager = createManager({ getToken: vi.fn().mockResolvedValue(null) });
      await manager.connect();

      expect(MockWebSocket.instances).toHaveLength(0);
      expect(manager.isConnected).toBe(false);
    });

    it('sets isConnected to true on open', async () => {
      const manager = createManager();
      await manager.connect();

      expect(manager.isConnected).toBe(false);
      MockWebSocket.instances[0].simulateOpen();
      expect(manager.isConnected).toBe(true);
    });

    it('does not create a new connection if already open', async () => {
      const manager = createManager();
      await manager.connect();
      MockWebSocket.instances[0].simulateOpen();

      await manager.connect();
      expect(MockWebSocket.instances).toHaveLength(1);
    });
  });

  describe('disconnect', () => {
    it('closes the WebSocket and resets state', async () => {
      const manager = createManager();
      await manager.connect();
      MockWebSocket.instances[0].simulateOpen();

      manager.disconnect();
      expect(MockWebSocket.instances[0].closeCalled).toBe(true);
      expect(manager.isConnected).toBe(false);
    });

    it('does not attempt reconnect after intentional disconnect', async () => {
      const manager = createManager();
      await manager.connect();
      MockWebSocket.instances[0].simulateOpen();

      manager.disconnect();
      // Simulate the close event that follows
      MockWebSocket.instances[0].simulateClose();

      // Advance timers — no reconnect should happen
      await vi.advanceTimersByTimeAsync(60_000);
      expect(MockWebSocket.instances).toHaveLength(1);
    });
  });

  describe('message handling', () => {
    it('calls message handlers with parsed JSON', async () => {
      const manager = createManager();
      const handler = vi.fn();
      manager.onMessage(handler);

      await manager.connect();
      MockWebSocket.instances[0].simulateOpen();
      MockWebSocket.instances[0].simulateMessage(
        JSON.stringify({ type: 'Alert', data: { title: 'Test' } }),
      );

      expect(handler).toHaveBeenCalledWith({ type: 'Alert', data: { title: 'Test' } });
    });

    it('ignores malformed messages', async () => {
      const manager = createManager();
      const handler = vi.fn();
      manager.onMessage(handler);

      await manager.connect();
      MockWebSocket.instances[0].simulateOpen();
      MockWebSocket.instances[0].simulateMessage('not-json');

      expect(handler).not.toHaveBeenCalled();
    });

    it('unsubscribes when cleanup function is called', async () => {
      const manager = createManager();
      const handler = vi.fn();
      const unsub = manager.onMessage(handler);

      await manager.connect();
      MockWebSocket.instances[0].simulateOpen();

      unsub();
      MockWebSocket.instances[0].simulateMessage(
        JSON.stringify({ type: 'Alert', data: {} }),
      );

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('connection/disconnection handlers', () => {
    it('calls connect handlers on open', async () => {
      const manager = createManager();
      const handler = vi.fn();
      manager.onConnect(handler);

      await manager.connect();
      MockWebSocket.instances[0].simulateOpen();

      expect(handler).toHaveBeenCalledOnce();
    });

    it('calls disconnect handlers on close', async () => {
      const manager = createManager();
      const handler = vi.fn();
      manager.onDisconnect(handler);

      await manager.connect();
      MockWebSocket.instances[0].simulateOpen();
      manager.disconnect();
      MockWebSocket.instances[0].simulateClose();

      expect(handler).toHaveBeenCalledOnce();
    });
  });

  describe('auto-reconnect', () => {
    it('reconnects with exponential backoff on unexpected close', async () => {
      const getToken = vi.fn().mockResolvedValue('test-token');
      const manager = createManager({ getToken, initialBackoffMs: 100, maxBackoffMs: 1600 });

      await manager.connect();
      MockWebSocket.instances[0].simulateOpen();

      // Simulate unexpected close
      MockWebSocket.instances[0].simulateClose();
      expect(MockWebSocket.instances).toHaveLength(1);

      // First reconnect after 100ms
      await vi.advanceTimersByTimeAsync(100);
      expect(MockWebSocket.instances).toHaveLength(2);

      // Simulate another close
      MockWebSocket.instances[1].simulateClose();

      // Second reconnect after 200ms (2^1 * 100)
      await vi.advanceTimersByTimeAsync(200);
      expect(MockWebSocket.instances).toHaveLength(3);
    });

    it('resets reconnect attempts on successful connection', async () => {
      const getToken = vi.fn().mockResolvedValue('test-token');
      const manager = createManager({ getToken, initialBackoffMs: 100 });

      await manager.connect();
      MockWebSocket.instances[0].simulateOpen();
      MockWebSocket.instances[0].simulateClose();

      // Reconnect
      await vi.advanceTimersByTimeAsync(100);
      expect(MockWebSocket.instances).toHaveLength(2);

      // Successful reconnect
      MockWebSocket.instances[1].simulateOpen();

      // Close again — should use initial backoff (100ms), not 200ms
      MockWebSocket.instances[1].simulateClose();
      await vi.advanceTimersByTimeAsync(100);
      expect(MockWebSocket.instances).toHaveLength(3);
    });

    it('stops reconnecting after max attempts', async () => {
      const getToken = vi.fn().mockResolvedValue('test-token');
      const manager = createManager({
        getToken,
        maxReconnectAttempts: 2,
        initialBackoffMs: 50,
      });

      await manager.connect();
      MockWebSocket.instances[0].simulateClose();

      // Attempt 1
      await vi.advanceTimersByTimeAsync(50);
      expect(MockWebSocket.instances).toHaveLength(2);
      MockWebSocket.instances[1].simulateClose();

      // Attempt 2
      await vi.advanceTimersByTimeAsync(100);
      expect(MockWebSocket.instances).toHaveLength(3);
      MockWebSocket.instances[2].simulateClose();

      // No more attempts
      await vi.advanceTimersByTimeAsync(60_000);
      expect(MockWebSocket.instances).toHaveLength(3);
    });

    it('caps backoff delay at maxBackoffMs', async () => {
      const getToken = vi.fn().mockResolvedValue('test-token');
      const manager = createManager({
        getToken,
        initialBackoffMs: 1000,
        maxBackoffMs: 2000,
        maxReconnectAttempts: 5,
      });

      await manager.connect();
      MockWebSocket.instances[0].simulateClose();

      // Attempt 1: 1000ms
      await vi.advanceTimersByTimeAsync(1000);
      expect(MockWebSocket.instances).toHaveLength(2);
      MockWebSocket.instances[1].simulateClose();

      // Attempt 2: min(2000, 2000) = 2000ms
      await vi.advanceTimersByTimeAsync(1999);
      expect(MockWebSocket.instances).toHaveLength(2); // not yet
      await vi.advanceTimersByTimeAsync(1);
      expect(MockWebSocket.instances).toHaveLength(3);
      MockWebSocket.instances[2].simulateClose();

      // Attempt 3: min(4000, 2000) = 2000ms (capped)
      await vi.advanceTimersByTimeAsync(2000);
      expect(MockWebSocket.instances).toHaveLength(4);
    });
  });
});
