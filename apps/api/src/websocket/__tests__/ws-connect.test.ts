// Unit tests for the WebSocket connect Lambda handler (Task 20.1)
// Tests JWT validation from query string and connection storage
//
// **Validates: Real-time notifications**

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockInsert = vi.fn();
const mockValues = vi.fn();

vi.mock('@kairos/database', () => ({
  websocketConnections: { connectionId: 'connection_id', memberId: 'member_id' },
}));

vi.mock('@kairos/utils', async () => {
  const actual = await vi.importActual<typeof import('@kairos/utils')>('@kairos/utils');
  return {
    ...actual,
    getDb: () => ({
      insert: mockInsert,
    }),
    createLogger: () => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    }),
  };
});

const mockVerifyCognitoToken = vi.fn();
vi.mock('../../auth/cognito', () => ({
  verifyCognitoToken: (...args: unknown[]) => mockVerifyCognitoToken(...args),
}));

const mockLookupMember = vi.fn();
vi.mock('../../auth/member-lookup', () => ({
  lookupMember: (...args: unknown[]) => mockLookupMember(...args),
}));

import { handler, type WebSocketConnectEvent } from '../ws-connect';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createEvent(token?: string): WebSocketConnectEvent {
  return {
    requestContext: {
      connectionId: 'conn-abc123',
      routeKey: '$connect',
      eventType: 'CONNECT',
      requestId: 'req-1',
    },
    queryStringParameters: token ? { token } : null,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ws-connect handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInsert.mockReturnValue({ values: mockValues });
    mockValues.mockResolvedValue(undefined);
  });

  it('should return 401 when no token in query string', async () => {
    const event = createEvent();
    const result = await handler(event);

    expect(result.statusCode).toBe(401);
    expect(result.body).toContain('missing token');
  });

  it('should return 401 when JWT verification fails', async () => {
    mockVerifyCognitoToken.mockRejectedValue(new Error('Invalid token'));

    const event = createEvent('bad-token');
    const result = await handler(event);

    expect(result.statusCode).toBe(401);
  });

  it('should return 401 when JWT has no email claim', async () => {
    mockVerifyCognitoToken.mockResolvedValue({ sub: 'user-1', token_use: 'access' });

    const event = createEvent('valid-token');
    const result = await handler(event);

    expect(result.statusCode).toBe(401);
    expect(result.body).toContain('missing email');
  });

  it('should store connection and return 200 on valid token', async () => {
    mockVerifyCognitoToken.mockResolvedValue({
      sub: 'user-1',
      email: 'test@kairos.church',
      'custom:role': 'Member',
      token_use: 'access',
    });
    mockLookupMember.mockResolvedValue({
      memberId: 42,
      branchId: 10,
      roles: ['Member'],
      email: 'test@kairos.church',
    });

    const event = createEvent('valid-token');
    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    expect(mockInsert).toHaveBeenCalled();
    expect(mockValues).toHaveBeenCalledWith({
      connectionId: 'conn-abc123',
      memberId: 42,
    });
  });

  it('should return 401 when member lookup fails (inactive user)', async () => {
    mockVerifyCognitoToken.mockResolvedValue({
      sub: 'user-1',
      email: 'inactive@kairos.church',
      'custom:role': 'Member',
      token_use: 'access',
    });
    mockLookupMember.mockRejectedValue(new Error('User not active'));

    const event = createEvent('valid-token');
    const result = await handler(event);

    expect(result.statusCode).toBe(401);
  });
});
