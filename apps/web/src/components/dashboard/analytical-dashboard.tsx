'use client';

import { Card } from '@kairos/ui';
import { TrendingUp, Activity, BarChart3 } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
  RadarChart,
  PolarGrid,
  PolarAngleAxis as PolarAngleAxisRaw,
  PolarRadiusAxis,
  Radar,
} from 'recharts';
import type { FC } from 'react';

// recharts 3.x ships a return type (ReactNode) that React 19's JSX runtime
// rejects (expects ReactElement | null). Other Polar* exports compile clean;
// only PolarAngleAxis trips TS2786. Cast to a permissive FC to satisfy JSX.
const PolarAngleAxis = PolarAngleAxisRaw as unknown as FC<{
  dataKey?: string;
  stroke?: string;
}>;

import { formatDate, formatShortDate } from '@/lib/date-format';
import type { DashboardAnalytics, RagCounts } from './types';

interface AnalyticalDashboardProps {
  analytics: DashboardAnalytics | null;
}

const RAG_COLORS = {
  RED: '#E11D48',
  AMBER: '#D97706',
  GREEN: '#059669',
};

export function AnalyticalDashboard({ analytics }: AnalyticalDashboardProps) {
  // Prepare trend data
  const trendData = analytics?.ragTrend || [];

  // Prepare conversion funnel data
  const funnelData = [
    { stage: 'New', count: analytics?.conversionFunnel?.New || 0, fill: '#5D3FD3' },
    { stage: 'Following Up', count: analytics?.conversionFunnel?.['Following Up'] || 0, fill: '#8B5CF6' },
    { stage: 'Interested', count: analytics?.conversionFunnel?.Interested || 0, fill: '#3B82F6' },
    { stage: 'Converted', count: analytics?.conversionFunnel?.Converted || 0, fill: '#059669' },
  ];

  // Prepare response rate data
  const responseRateData = analytics?.responseRates?.map((item) => ({
    method: item.method,
    rate: Math.round(item.rate * 10) / 10,
    total: item.total,
  })) || [];

  // Prepare radar chart data for RAG distribution
  const radarData = Object.entries(analytics?.ragByStatus || {}).map(([status, counts]: [string, unknown]) => {
    const c = counts as RagCounts;
    return {
      status: status.substring(0, 10),
      RED: c.RED || 0,
      AMBER: c.AMBER || 0,
      GREEN: c.GREEN || 0,
    };
  });

  return (
    <div className="space-y-6">
      {/* Trend Analysis */}
      <Card className="bg-slate-900/50 border-slate-700 p-6">
        <h3 className="text-2xl font-semibold text-white mb-4 flex items-center gap-2">
          <TrendingUp className="h-6 w-6 text-blue-400" />
          30-Day RAG Trend Analysis
        </h3>
        <ResponsiveContainer width="100%" height={400}>
          <AreaChart data={trendData}>
            <defs>
              <linearGradient id="colorRED" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={RAG_COLORS.RED} stopOpacity={0.8} />
                <stop offset="95%" stopColor={RAG_COLORS.RED} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorAMBER" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={RAG_COLORS.AMBER} stopOpacity={0.8} />
                <stop offset="95%" stopColor={RAG_COLORS.AMBER} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorGREEN" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={RAG_COLORS.GREEN} stopOpacity={0.8} />
                <stop offset="95%" stopColor={RAG_COLORS.GREEN} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis
              dataKey="date"
              stroke="#94a3b8"
              tickFormatter={(value) => formatDate(value, { month: 'short', day: 'numeric' })}
            />
            <YAxis stroke="#94a3b8" />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1e293b',
                border: '1px solid #475569',
                borderRadius: '8px',
                color: '#fff',
              }}
              labelFormatter={(value) => formatShortDate(value)}
            />
            <Legend />
            <Area
              type="monotone"
              dataKey="RED"
              stroke={RAG_COLORS.RED}
              fillOpacity={1}
              fill="url(#colorRED)"
              name="Critical"
            />
            <Area
              type="monotone"
              dataKey="AMBER"
              stroke={RAG_COLORS.AMBER}
              fillOpacity={1}
              fill="url(#colorAMBER)"
              name="Monitor"
            />
            <Area
              type="monotone"
              dataKey="GREEN"
              stroke={RAG_COLORS.GREEN}
              fillOpacity={1}
              fill="url(#colorGREEN)"
              name="On Track"
            />
          </AreaChart>
        </ResponsiveContainer>
      </Card>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Conversion Funnel */}
        <Card className="bg-slate-900/50 border-slate-700 p-6">
          <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <Activity className="h-5 w-5 text-emerald-400" />
            Conversion Funnel
          </h3>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={funnelData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis type="number" stroke="#94a3b8" />
              <YAxis dataKey="stage" type="category" stroke="#94a3b8" width={100} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1e293b',
                  border: '1px solid #475569',
                  borderRadius: '8px',
                  color: '#fff',
                }}
              />
              <Bar dataKey="count" radius={[0, 8, 8, 0]}>
                {funnelData.map((entry, index) => (
                  <rect key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Response Rate by Method */}
        <Card className="bg-slate-900/50 border-slate-700 p-6">
          <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-purple-400" />
            Response Rate by Contact Method
          </h3>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={responseRateData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="method" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" label={{ value: 'Success Rate (%)', angle: -90, position: 'insideLeft', fill: '#94a3b8' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1e293b',
                  border: '1px solid #475569',
                  borderRadius: '8px',
                  color: '#fff',
                }}
              />
              <Bar dataKey="rate" fill="#8B5CF6" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* RAG Distribution Radar */}
      <Card className="bg-slate-900/50 border-slate-700 p-6">
        <h3 className="text-2xl font-semibold text-white mb-4 text-center">
          RAG Distribution Across Soul Statuses
        </h3>
        <ResponsiveContainer width="100%" height={500}>
          <RadarChart data={radarData}>
            <PolarGrid stroke="#475569" />
            <PolarAngleAxis dataKey="status" stroke="#94a3b8" />
            <PolarRadiusAxis stroke="#94a3b8" />
            <Radar name="Critical" dataKey="RED" stroke={RAG_COLORS.RED} fill={RAG_COLORS.RED} fillOpacity={0.6} />
            <Radar name="Monitor" dataKey="AMBER" stroke={RAG_COLORS.AMBER} fill={RAG_COLORS.AMBER} fillOpacity={0.6} />
            <Radar name="On Track" dataKey="GREEN" stroke={RAG_COLORS.GREEN} fill={RAG_COLORS.GREEN} fillOpacity={0.6} />
            <Legend />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1e293b',
                border: '1px solid #475569',
                borderRadius: '8px',
                color: '#fff',
              }}
            />
          </RadarChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}
