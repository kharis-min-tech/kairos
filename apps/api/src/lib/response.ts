/**
 * Hono-compatible response helpers for API routers.
 *
 * Usage in routers:
 *   import { successResponse } from '../lib/response';
 *   return c.json(successResponse(data, 'Optional message'));
 *
 * NOTE: Lambda handlers should continue using successResponse / createdResponse
 *       from '@kairos/utils' (which returns the Lambda proxy format).
 */

export function successResponse<T>(data: T, message?: string) {
  return { success: true as const, data, message };
}

export function createdResponse<T>(data: T, message?: string) {
  return { success: true as const, data, message };
}

export function errorResponse(message: string, code?: string) {
  return { success: false as const, message, code };
}
