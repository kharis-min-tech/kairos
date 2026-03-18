import type { PaginatedResponse } from '@kairos/types';

export function successResponse<T>(data: T, message?: string) {
  return { success: true as const, data, message };
}

export function errorResponse(message: string, code?: string) {
  return { success: false as const, message, code };
}

export function paginatedResponse<T>(
  data: T[],
  total: number,
  page: number,
  limit: number,
): PaginatedResponse<T> {
  return {
    data,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export function parsePagination(params: { page?: string; limit?: string }) {
  const page = Math.max(1, parseInt(params.page ?? '1', 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(params.limit ?? '20', 10) || 20));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}
