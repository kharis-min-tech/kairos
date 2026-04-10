// Unit tests for the WebSocket disconnect Lambda handler (Task 20.2)
// Tests connection removal from database
//
// **Validates: Real-time notifications**

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockDelete = vi.fn();
const mockWhere = vi.fn();

vi.mock('@kairos/database', () => ({
  websocketConnections: { connectionId: 'connection_id', memberId: 'member_id' },
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((col, val) => ({ col, val })),
}));

vi.mock('@kairos/utils', async () => {
  const actual = await vi.importActual<typeof import('@kairos/utils')>('@kairos/utils');
  return {
    ...actual,
    getDb: () => ({
      delete: mockDelete,
    }),
    createLogger: () => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    }),
  };
});

import { handler, type WebSocketDisconnectEvent } from '../ws-disconnect';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createEvent(connectionId = 'conn-abc123'): WebSocketDisconnectEvent {
  return {
    requestContext: {
      connectionId,
      routeKey: '$disconnect',
      eventType: 'DISCONNECT',
      requestId: 'req-1',
    },
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ws-disconnect handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDelete.mockReturnValue({ where: mockWhere });
    mockWhere.mockResolvedValue(undefined);
  });

  it('should delete connection and return 200', async () => {
    const event = createEvent('conn-xyz');
    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    expect(mockDelete).toHaveBeenCalled();
    expect(mockWhere).toHaveBeenCalled();
  });

  it('should return 200 even if delete fails', async () => {
    mockWhere.mockRejectedValue(new Error('DB error'));

    const event = createEvent('conn-fail');
    const result = await handler(event);

    // Still returns 200 — connection is gone regardless
    expect(result.statusCode).toBe(200);
  });
});
