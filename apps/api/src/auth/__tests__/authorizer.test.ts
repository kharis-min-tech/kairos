// Unit tests for the Custom Authorizer Lambda handler
// Tests JWT extraction, verification flow, and authorization response

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { APIGatewayRequestAuthorizerEventV2 } from 'aws-lambda';

// Mock the cognito module before importing the handler
vi.mock('../cognito', () => ({
  verifyCognitoToken: vi.fn(),
}));

// Mock the logger to suppress output during tests
vi.mock('@kairos/utils', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

import { handler } from '../authorizer';
import { verifyCognitoToken } from '../cognito';

const mockedVerify = vi.mocked(verifyCognitoToken);

/** Helper to create a minimal API Gateway HTTP API v2 authorizer event */
function createEvent(
  authHeader?: string
): APIGatewayRequestAuthorizerEventV2 {
  return {
    version: '2.0',
    type: 'REQUEST',
    routeArn:
      'arn:aws:execute-api:eu-west-2:123456789:abc123/staging/GET/v1/members',
    identitySource: authHeader ? [authHeader] : [],
    routeKey: 'GET /v1/members',
    rawPath: '/v1/members',
    rawQueryString: '',
    cookies: [],
    headers: authHeader ? { authorization: authHeader } : {},
    requestContext: {
      accountId: '123456789',
      apiId: 'abc123',
      domainName: 'abc123.execute-api.eu-west-2.amazonaws.com',
      domainPrefix: 'abc123',
      http: {
        method: 'GET',
        path: '/v1/members',
        protocol: 'HTTP/1.1',
        sourceIp: '127.0.0.1',
        userAgent: 'test',
      },
      requestId: 'test-request-id',
      routeKey: 'GET /v1/members',
      stage: 'staging',
      time: '01/Jan/2025:00:00:00 +0000',
      timeEpoch: 1735689600000,
    },
  };
}

describe('Authorizer Lambda handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Test 1: Valid token returns isAuthorized=true with JWT claims as context
  it('should return isAuthorized=true with correct context for a valid token', async () => {
    mockedVerify.mockResolvedValue({
      sub: 'cognito-user-123',
      email: 'pastor@kairos.church',
      'custom:role': 'Pastor',
      'custom:branchId': '5',
      token_use: 'access',
    });

    const event = createEvent('Bearer valid-jwt-token');
    const result = await handler(event);

    expect(result.isAuthorized).toBe(true);
    expect(result.context).toEqual({
      sub: 'cognito-user-123',
      email: 'pastor@kairos.church',
      role: 'Pastor',
      branch_id: '5',
    });

    expect(mockedVerify).toHaveBeenCalledWith('valid-jwt-token');
  });

  // Test 2: Missing Authorization header returns Deny
  it('should return isAuthorized=false when Authorization header is missing', async () => {
    const event = createEvent();
    const result = await handler(event);

    expect(result.isAuthorized).toBe(false);
    expect(result.context.sub).toBe('');
    expect(result.context.email).toBe('');
    expect(result.context.role).toBe('');
    expect(result.context.branch_id).toBe('');

    expect(mockedVerify).not.toHaveBeenCalled();
  });

  // Test 3: Invalid token format (no "Bearer " prefix) returns Deny
  it('should return isAuthorized=false when Authorization header lacks Bearer prefix', async () => {
    const event = createEvent('Basic some-credentials');
    const result = await handler(event);

    expect(result.isAuthorized).toBe(false);
    expect(mockedVerify).not.toHaveBeenCalled();
  });

  // Test 4: Expired/invalid token returns Deny
  it('should return isAuthorized=false when token verification fails', async () => {
    mockedVerify.mockRejectedValue(new Error('Token expired'));

    const event = createEvent('Bearer expired-jwt-token');
    const result = await handler(event);

    expect(result.isAuthorized).toBe(false);
    expect(result.context.sub).toBe('');
  });

  // Test 5: Missing email claim returns Deny
  it('should return isAuthorized=false when member has no email in JWT', async () => {
    mockedVerify.mockResolvedValue({
      sub: 'cognito-user-456',
      email: undefined,
      'custom:role': undefined,
      'custom:branchId': '3',
      token_use: 'access',
    });

    const event = createEvent('Bearer valid-but-no-email-token');
    const result = await handler(event);

    expect(result.isAuthorized).toBe(false);
  });

  // Test 6: Bearer token with empty string after prefix
  it('should return isAuthorized=false when Bearer token is empty', async () => {
    const event = createEvent('Bearer ');
    const result = await handler(event);

    expect(result.isAuthorized).toBe(false);
    expect(mockedVerify).not.toHaveBeenCalled();
  });

  // Test 7: custom:role is passed through in context
  it('should pass cognitoRole through in context when present', async () => {
    mockedVerify.mockResolvedValue({
      sub: 'cognito-admin-001',
      email: 'admin@kairos.church',
      'custom:role': 'Admin',
      'custom:branchId': '1',
      token_use: 'access',
    });

    const event = createEvent('Bearer admin-jwt-token');
    const result = await handler(event);

    expect(result.isAuthorized).toBe(true);
    expect(result.context.role).toBe('Admin');
    expect(result.context.email).toBe('admin@kairos.church');
  });

  // Test 8: Missing custom claims default to empty strings
  it('should default role and branch_id to empty when custom claims missing', async () => {
    mockedVerify.mockResolvedValue({
      sub: 'cognito-user-new',
      email: 'new@kairos.church',
      token_use: 'access',
    });

    const event = createEvent('Bearer new-user-token');
    const result = await handler(event);

    expect(result.isAuthorized).toBe(true);
    expect(result.context.role).toBe('');
    expect(result.context.branch_id).toBe('');
  });
});
