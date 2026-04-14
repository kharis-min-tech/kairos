// Property-based tests for the Custom Authorizer Lambda
// Uses fast-check to verify invariants across many random inputs
//
// **Validates: Requirements 1.5, 1.6-1.9**

import { describe, it, expect, vi, beforeEach } from 'vitest';
import fc from 'fast-check';
import type { APIGatewayRequestAuthorizerEventV2 } from 'aws-lambda';

// Mock the cognito module
vi.mock('../cognito', () => ({
  verifyCognitoToken: vi.fn(),
}));

// Mock the logger
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

// ---------------------------------------------------------------------------
// Smart Generators
// ---------------------------------------------------------------------------

const branchIdArb = fc.integer({ min: 1, max: 500 });
const emailArb = fc.emailAddress();
const subArb = fc.uuid();

/** Generate a Cognito role (Admin, Pastor, or empty) */
const cognitoRoleArb = fc.constantFrom('Admin', 'Pastor', 'Leader', '');

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

describe('Property-Based Tests: Authorizer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // Property 1: Branch-Level Data Isolation
  // **Validates: Req 1.5, 1.7**
  // =========================================================================
  describe('Property 1: Branch-Level Data Isolation', () => {
    it('context branch_id ALWAYS matches the JWT custom:branchId claim', () => {
      return fc.assert(
        fc.asyncProperty(subArb, emailArb, branchIdArb, cognitoRoleArb, async (sub, email, branchId, role) => {
          mockedVerify.mockResolvedValue({
            sub,
            email,
            'custom:role': role || undefined,
            'custom:branchId': String(branchId),
            token_use: 'access',
          });

          const event = createEvent('Bearer valid-token');
          const result = await handler(event);

          expect(result.isAuthorized).toBe(true);
          expect(result.context.branch_id).toBe(String(branchId));
        }),
        { numRuns: 100 }
      );
    });

    it('a pastor context contains ONLY their assigned branch_id, never another branch', () => {
      return fc.assert(
        fc.asyncProperty(
          subArb,
          emailArb,
          branchIdArb,
          branchIdArb,
          async (sub, email, pastorBranchId, otherBranchId) => {
            mockedVerify.mockResolvedValue({
              sub,
              email,
              'custom:role': 'Pastor',
              'custom:branchId': String(pastorBranchId),
              token_use: 'access',
            });

            const event = createEvent('Bearer valid-token');
            const result = await handler(event);

            expect(result.isAuthorized).toBe(true);
            expect(result.context.branch_id).toBe(String(pastorBranchId));

            if (pastorBranchId !== otherBranchId) {
              expect(result.context.branch_id).not.toBe(String(otherBranchId));
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // =========================================================================
  // Property 2: JWT Claims Passthrough
  // **Validates: Req 1.5, 1.6-1.9**
  // =========================================================================
  describe('Property 2: JWT Claims Passthrough', () => {
    it('context sub ALWAYS matches the JWT sub claim', () => {
      return fc.assert(
        fc.asyncProperty(subArb, emailArb, branchIdArb, cognitoRoleArb, async (sub, email, branchId, role) => {
          mockedVerify.mockResolvedValue({
            sub,
            email,
            'custom:role': role || undefined,
            'custom:branchId': String(branchId),
            token_use: 'access',
          });

          const event = createEvent('Bearer valid-token');
          const result = await handler(event);

          expect(result.isAuthorized).toBe(true);
          expect(result.context.sub).toBe(sub);
        }),
        { numRuns: 100 }
      );
    });

    it('context email ALWAYS matches the JWT email claim', () => {
      return fc.assert(
        fc.asyncProperty(subArb, emailArb, branchIdArb, cognitoRoleArb, async (sub, email, branchId, role) => {
          mockedVerify.mockResolvedValue({
            sub,
            email,
            'custom:role': role || undefined,
            'custom:branchId': String(branchId),
            token_use: 'access',
          });

          const event = createEvent('Bearer valid-token');
          const result = await handler(event);

          expect(result.isAuthorized).toBe(true);
          expect(result.context.email).toBe(email);
        }),
        { numRuns: 100 }
      );
    });

    it('context role ALWAYS matches the JWT custom:role claim (or empty string)', () => {
      return fc.assert(
        fc.asyncProperty(subArb, emailArb, branchIdArb, cognitoRoleArb, async (sub, email, branchId, role) => {
          mockedVerify.mockResolvedValue({
            sub,
            email,
            'custom:role': role || undefined,
            'custom:branchId': String(branchId),
            token_use: 'access',
          });

          const event = createEvent('Bearer valid-token');
          const result = await handler(event);

          expect(result.isAuthorized).toBe(true);
          expect(result.context.role).toBe(role);
        }),
        { numRuns: 100 }
      );
    });

    it('missing Authorization header ALWAYS results in denied response', () => {
      return fc.assert(
        fc.asyncProperty(fc.constant(undefined), async () => {
          const event = createEvent(undefined);
          const result = await handler(event);

          expect(result.isAuthorized).toBe(false);
          expect(result.context.sub).toBe('');
          expect(result.context.email).toBe('');
          expect(result.context.role).toBe('');
          expect(result.context.branch_id).toBe('');
        }),
        { numRuns: 10 }
      );
    });
  });
});
