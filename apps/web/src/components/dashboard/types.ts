export interface DashboardSoul {
  id: string;
  firstName: string;
  lastName: string;
  phone?: string;
  email?: string;
  status: string;
  ragStatus: 'RED' | 'AMBER' | 'GREEN';
  ragReason?: string;
  outreachName?: string;
  assignedMemberName?: string;
  assignedMemberBranchName?: string;
  lastFollowUpDate?: string;
  daysSinceLastFollowUp?: number | null;
  createdAt?: string;
}

export interface DashboardFollowUp {
  id: string;
  soulId: string;
  soulName: string;
  ragStatus: 'RED' | 'AMBER' | 'GREEN';
  ragReason?: string;
  contactStatus: string;
  contactMethod?: string;
  memberName?: string;
  followUpDate: string;
  durationMinutes?: number;
  notes?: string;
}

export interface RagCounts {
  RED: number;
  AMBER: number;
  GREEN: number;
}

export interface DashboardOverview {
  totalSouls: number;
  ragCounts: RagCounts;
  statusCounts: Record<string, number>;
}

export interface AnalyticsOverviewSection {
  conversionRate: number;
  activeFollowUps: number;
  avgDaysToConversion: number;
  totalSouls: number;
  converted: number;
}

export interface RagTrendEntry {
  date: string;
  RED: number;
  AMBER: number;
  GREEN: number;
}

export interface ResponseRateEntry {
  method: string;
  rate: number;
  total: number;
}

export interface PredictiveData {
  predictedConversions: number;
  recentConversionRate: number;
  trendDirection: string;
}

export interface DashboardAnalytics {
  overview?: AnalyticsOverviewSection;
  conversionFunnel?: Record<string, number>;
  statusDistribution?: Record<string, number>;
  ragByStatus?: Record<string, RagCounts>;
  ragTrend?: RagTrendEntry[];
  responseRates?: ResponseRateEntry[];
  predictive?: PredictiveData;
}

export interface FollowUpOverviewData {
  totalFollowUps: number;
  ragCounts: RagCounts;
}

export interface PaginatedDashboardData<T> {
  data: T[];
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
