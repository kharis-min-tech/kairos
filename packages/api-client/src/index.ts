// @kairos/api-client - Type-safe API client for the Kairos platform

export { configureClient } from './client';
export type { ClientConfig, GetTokenFn } from './client';
export { ApiError } from './errors';
export type { ApiErrorBody, ApiErrorDetail } from './errors';
export {
  members,
  branches,
  departments,
  fellowships,
  attendance,
  outreach,
  souls,
  donations,
  forms,
  notifications,
  dashboard,
  reports,
} from './api';
export type { AdminDashboard, PastorDashboard, LeaderDashboard } from './api';
