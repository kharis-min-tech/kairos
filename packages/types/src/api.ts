// @kairos/types - API request/response types for the Kairos platform

import type { UserRole } from './enums';

/** Standard error response format */
export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Array<{
      field?: string;
      message: string;
    }>;
  };
}

/** Standard pagination parameters */
export interface PaginationParams {
  page?: number;
  limit?: number;
}

/** Standard paginated response */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/** Auth context extracted from API Gateway authorizer */
export interface AuthContext {
  memberId: number;
  branchId: number;
  roles: UserRole[];
  email?: string;
}

/** Standard API response wrapper */
export interface ApiResponse<T = unknown> {
  statusCode: number;
  body: T;
}

/** Sort parameters */
export interface SortParams {
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
