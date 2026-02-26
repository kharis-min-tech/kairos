import { describe, it, expect } from 'vitest';
import type { APIGatewayProxyEvent } from 'aws-lambda';
import { getAuthContext } from './context';
import { UnauthorizedError } from '../error-handler/errors';

/** Helper to create a mock API Gateway event with authorizer context */
function createMockEvent(
  authorizer?: Record<string, unknown>
): APIGatewayProxyEvent {
  return {
    requestContext: {
      authorizer: authorizer ?? null,
    },
  } as unknown as APIGatewayProxyEvent;
}

describe('getAuthContext', () => {
  it('should extract auth context from authorizer', () => {
    const event = createMockEvent({
      userId: '42',
      branchId: '5',
      roles: '["Admin","Pastor"]',
      email: 'admin@kairos.church',
    });

    const ctx = getAuthContext(event);
    expect(ctx.memberId).toBe(42);
    expect(ctx.branchId).toBe(5);
    expect(ctx.roles).toEqual(['Admin', 'Pastor']);
    expect(ctx.email).toBe('admin@kairos.church');
  });

  it('should handle numeric values (not just strings)', () => {
    const event = createMockEvent({
      userId: 42,
      branchId: 5,
      roles: 'Admin',
    });

    const ctx = getAuthContext(event);
    expect(ctx.memberId).toBe(42);
    expect(ctx.branchId).toBe(5);
  });

  it('should handle comma-separated roles', () => {
    const event = createMockEvent({
      userId: '1',
      branchId: '1',
      roles: 'Admin,Pastor',
    });

    const ctx = getAuthContext(event);
    expect(ctx.roles).toEqual(['Admin', 'Pastor']);
  });

  it('should handle single role string', () => {
    const event = createMockEvent({
      userId: '1',
      branchId: '1',
      roles: 'Member',
    });

    const ctx = getAuthContext(event);
    expect(ctx.roles).toEqual(['Member']);
  });

  it('should handle alternative field names (member_id, branch_id)', () => {
    const event = createMockEvent({
      member_id: '10',
      branch_id: '3',
      role: 'Leader',
    });

    const ctx = getAuthContext(event);
    expect(ctx.memberId).toBe(10);
    expect(ctx.branchId).toBe(3);
    expect(ctx.roles).toEqual(['Leader']);
  });

  it('should throw UnauthorizedError when authorized flag is false (CORS-safe denial)', () => {
    const event = createMockEvent({
      authorized: 'false',
      sub: '',
      email: '',
      role: '',
      branch_id: '',
    });
    expect(() => getAuthContext(event)).toThrow(UnauthorizedError);
    expect(() => getAuthContext(event)).toThrow('Invalid or missing authentication token');
  });

  it('should throw UnauthorizedError when authorizer is missing', () => {
    const event = createMockEvent(undefined);
    expect(() => getAuthContext(event)).toThrow(UnauthorizedError);
  });

  it('should throw UnauthorizedError when memberId is missing', () => {
    const event = createMockEvent({
      branchId: '1',
      roles: 'Member',
    });
    expect(() => getAuthContext(event)).toThrow(UnauthorizedError);
  });

  it('should throw UnauthorizedError when branchId is missing', () => {
    const event = createMockEvent({
      userId: '1',
      roles: 'Member',
    });
    expect(() => getAuthContext(event)).toThrow(UnauthorizedError);
  });

  it('should default to Member role when roles are missing', () => {
    const event = createMockEvent({
      userId: '1',
      branchId: '1',
    });
    const ctx = getAuthContext(event);
    expect(ctx.roles).toEqual(['Member']);
  });

  it('should filter out invalid roles', () => {
    const event = createMockEvent({
      userId: '1',
      branchId: '1',
      roles: '["Admin","InvalidRole"]',
    });

    const ctx = getAuthContext(event);
    expect(ctx.roles).toEqual(['Admin']);
  });
});
