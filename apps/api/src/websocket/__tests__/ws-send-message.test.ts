// Unit tests for the WebSocket send-message Lambda handler (Task 20.3)
// Tests message routing to active connections and stale connection cleanup
//
// **Validates: Real-time notifications**

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockSend = vi.fn();

vi.mock('@aws-sdk/client-apigatewaymanagementapi', () => ({
  ApiGatewayManagementApiClient: class {
    send = mockSend;
  },
  PostToConnectionCommand: class {
    constructor(public input: unknown) {}
  },
  GoneException: class GoneException extends Error {
    constructor() {
      super('Gone');
      this.name = 'GoneException';
    }
  },
}));

const mockSelect = vi.fn();
const mockFrom = vi.fn();
const mockWhere = vi.fn();
const mockDeleteFn = vi.fn();
const mockDeleteWhere = vi.fn();

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
      select: mockSelect,
      delete: mockDeleteFn,
    }),
    createLogger: () => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    }),
  };
});

// Set env before importing handler
process.env['WEBSOCKET_API_ENDPOINT'] = 'https://ws.test.execute-api.eu-west-2.amazonaws.com/prod';

import { handler, type WsSendMessagePayload } from '../ws-send-message';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function setupConnections(connections: { connectionId: string }[]) {
  mockSelect.mockReturnValue({ from: mockFrom });
  mockFrom.mockReturnValue({ where: mockWhere });
  mockWhere.mockResolvedValue(connections);
  mockDeleteFn.mockReturnValue({ where: mockDeleteWhere });
  mockDeleteWhere.mockResolvedValue(undefined);
}

function createPayload(memberIds: string[]): WsSendMessagePayload {
  return {
    memberIds,
    notification: {
      notificationId: 1,
      title: 'Test',
      message: 'Hello',
      notificationType: 'Announcement',
      priority: 'Normal',
      sentAt: new Date().toISOString(),
    },
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ws-send-message handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should send message to active connections', async () => {
    setupConnections([{ connectionId: 'conn-1' }, { connectionId: 'conn-2' }]);
    mockSend.mockResolvedValue({});

    const payload = createPayload(['test-member-42']);
    const result = await handler(payload);
    const body = JSON.parse(result.body);

    expect(result.statusCode).toBe(200);
    expect(body.sent).toBe(2);
    expect(body.stale).toBe(0);
  });

  it('should clean up stale connections (GoneException)', async () => {
    setupConnections([{ connectionId: 'conn-stale' }]);
    const goneError = new Error('Gone');
    goneError.name = 'GoneException';
    mockSend.mockRejectedValue(goneError);

    const payload = createPayload(['test-member-42']);
    const result = await handler(payload);
    const body = JSON.parse(result.body);

    expect(result.statusCode).toBe(200);
    expect(body.sent).toBe(0);
    expect(body.stale).toBe(1);
    expect(mockDeleteFn).toHaveBeenCalled();
  });

  it('should handle members with no active connections', async () => {
    setupConnections([]);
    const payload = createPayload(['test-member-99']);
    const result = await handler(payload);
    const body = JSON.parse(result.body);

    expect(result.statusCode).toBe(200);
    expect(body.sent).toBe(0);
    expect(body.stale).toBe(0);
  });
});
