// API response type definitions for consistent response structure

// Base API response structure
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: ApiError;
  timestamp: string;
}

// Error response structure
export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, any>;
  stack?: string;
}

// Paginated response structure
export interface PaginatedResponse<T = any> {
  items: T[];
  pagination: PaginationMeta;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

// Authentication responses
export interface LoginResponse {
  user: {
    id: string;
    email: string;
    userType: string;
    isActive: boolean;
  };
  tokens: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  };
}

export interface RefreshTokenResponse {
  accessToken: string;
  expiresIn: number;
}

// Dashboard responses
export interface DashboardStatsResponse {
  totalMembers: number;
  activeMembers: number;
  newMembersThisMonth: number;
  totalEvents: number;
  upcomingEvents: number;
  totalDepartments: number;
  totalFellowships: number;
  totalPaymentsThisMonth: number;
  totalPaymentAmountThisMonth: number;
}

export interface MemberDashboardResponse {
  member: {
    id: string;
    firstName: string;
    lastName: string;
    membershipNumber: string;
    soulStatus: string;
  };
  upcomingEvents: Array<{
    id: string;
    name: string;
    startDate: string;
    location?: string;
  }>;
  recentPayments: Array<{
    id: string;
    amount: number;
    paymentType: string;
    paymentDate: string;
  }>;
  notifications: Array<{
    id: string;
    title: string;
    message: string;
    type: string;
    isRead: boolean;
    createdAt: string;
  }>;
}

// Report responses
export interface AttendanceReportResponse {
  period: {
    startDate: string;
    endDate: string;
  };
  summary: {
    totalSessions: number;
    averageAttendance: number;
    highestAttendance: number;
    lowestAttendance: number;
  };
  attendanceData: Array<{
    date: string;
    attendanceCount: number;
    totalMembers: number;
    attendanceRate: number;
  }>;
}

export interface FinancialReportResponse {
  period: {
    startDate: string;
    endDate: string;
  };
  summary: {
    totalIncome: number;
    totalTithes: number;
    totalOfferings: number;
    totalDonations: number;
    totalPledges: number;
    currency: string;
  };
  breakdown: Array<{
    paymentType: string;
    amount: number;
    percentage: number;
  }>;
  monthlyTrend: Array<{
    month: string;
    amount: number;
  }>;
}

export interface MembershipReportResponse {
  summary: {
    totalMembers: number;
    activeMembers: number;
    inactiveMembers: number;
    newMembersThisYear: number;
  };
  byStatus: Array<{
    soulStatus: string;
    count: number;
    percentage: number;
  }>;
  byDepartment: Array<{
    departmentName: string;
    memberCount: number;
  }>;
  byFellowship: Array<{
    fellowshipName: string;
    memberCount: number;
  }>;
  growthTrend: Array<{
    month: string;
    newMembers: number;
    totalMembers: number;
  }>;
}

// Bulk operation responses
export interface BulkOperationResponse {
  totalProcessed: number;
  successful: number;
  failed: number;
  errors: Array<{
    index: number;
    error: string;
  }>;
}

// File upload responses
export interface FileUploadResponse {
  fileName: string;
  originalName: string;
  size: number;
  mimeType: string;
  url: string;
  uploadedAt: string;
}

// Search responses
export interface SearchResponse<T = any> {
  query: string;
  results: T[];
  totalResults: number;
  searchTime: number;
  suggestions?: string[];
}

// Validation error response
export interface ValidationErrorResponse {
  message: string;
  errors: Array<{
    field: string;
    message: string;
    value?: any;
  }>;
}

// Health check response
export interface HealthCheckResponse {
  status: 'ok' | 'error';
  timestamp: string;
  uptime: number;
  version: string;
  services: {
    database: 'connected' | 'disconnected';
    redis?: 'connected' | 'disconnected';
    email?: 'connected' | 'disconnected';
  };
}

// Notification responses
export interface NotificationResponse {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  readAt?: string;
  actionUrl?: string;
  createdAt: string;
}

export interface NotificationSummaryResponse {
  totalNotifications: number;
  unreadCount: number;
  notifications: NotificationResponse[];
}

// Export responses
export interface ExportResponse {
  exportId: string;
  fileName: string;
  format: 'csv' | 'xlsx' | 'pdf';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  downloadUrl?: string;
  createdAt: string;
  expiresAt: string;
}

// Audit log responses
export interface AuditLogResponse {
  id: string;
  userId: string;
  userName: string;
  action: string;
  entityType: string;
  entityId: string;
  changes?: {
    field: string;
    oldValue: any;
    newValue: any;
  }[];
  ipAddress?: string;
  userAgent?: string;
  timestamp: string;
}

// System settings responses
export interface SystemSettingsResponse {
  general: {
    organizationName: string;
    timezone: string;
    dateFormat: string;
    currency: string;
  };
  features: {
    enableMemberRegistration: boolean;
    enableOnlineGiving: boolean;
    enableEventRegistration: boolean;
    enableMobileApp: boolean;
  };
  notifications: {
    emailEnabled: boolean;
    smsEnabled: boolean;
    pushEnabled: boolean;
  };
}

// Statistics responses
export interface StatisticsResponse {
  members: {
    total: number;
    active: number;
    newThisMonth: number;
    byStatus: Record<string, number>;
  };
  events: {
    total: number;
    upcoming: number;
    thisMonth: number;
    averageAttendance: number;
  };
  finances: {
    totalThisMonth: number;
    totalThisYear: number;
    averageMonthly: number;
    currency: string;
  };
  departments: {
    total: number;
    averageMembers: number;
  };
  fellowships: {
    total: number;
    averageMembers: number;
  };
}
