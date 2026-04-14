export { ApiClient } from './client';
export { ApiClientError, ApiClientError as ApiError } from './errors';
export { createApiClient, configureClient, getApiInstance } from './api';
export type { KairosApi } from './api';

// Convenience exports for direct API calls using singleton instance
// Example: import { members, branches } from '@kairos/api-client';
// Then: await members.get(id);
export { members, branches, regions, leadership, fellowships, analytics, reports, newBelievers, attendance, outreach, souls, departments, donations, forms, dashboard } from './api';
export type { LeaderDashboard, PastorDashboard, AdminDashboard } from './api';
