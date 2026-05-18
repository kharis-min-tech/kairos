'use client';

import { Card } from '@kairos/ui';
import { Target, TrendingUp, Clock, Award, Zap, Users } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import type { DashboardAnalytics, DashboardOverview } from './types';

interface StrategicDashboardProps {
  analytics: DashboardAnalytics | null;
  overview: DashboardOverview | null;
}

export function StrategicDashboard({ analytics, overview }: StrategicDashboardProps) {
  const conversionRate = analytics?.overview?.conversionRate || 0;
  const avgDaysToConversion = analytics?.overview?.avgDaysToConversion || 0;
  const activeFollowUps = analytics?.overview?.activeFollowUps || 0;
  const totalSouls = analytics?.overview?.totalSouls || 0;
  const converted = analytics?.overview?.converted || 0;

  // Calculate strategic KPIs
  const engagementRate = totalSouls > 0 ? ((activeFollowUps / totalSouls) * 100).toFixed(1) : 0;
  const dropOffRate = totalSouls > 0 ? (((analytics?.conversionFunnel?.['Not Interested'] || 0) + (analytics?.conversionFunnel?.['Lost Contact'] || 0)) / totalSouls * 100).toFixed(1) : 0;

  // Big Picture KPIs
  const kpis = [
    {
      title: 'Conversion Rate',
      value: `${conversionRate}%`,
      icon: Target,
      color: 'from-purple-600 to-pink-600',
      trend: conversionRate > 15 ? 'up' : 'down',
      target: '20%',
    },
    {
      title: 'Avg. Days to Convert',
      value: avgDaysToConversion,
      icon: Clock,
      color: 'from-blue-600 to-cyan-600',
      trend: avgDaysToConversion < 30 ? 'up' : 'down',
      target: '< 30 days',
    },
    {
      title: 'Engagement Rate',
      value: `${engagementRate}%`,
      icon: Zap,
      color: 'from-emerald-600 to-teal-600',
      trend: Number(engagementRate) > 60 ? 'up' : 'down',
      target: '> 60%',
    },
    {
      title: 'Total Conversions',
      value: converted,
      icon: Award,
      color: 'from-amber-600 to-orange-600',
      trend: 'up',
      target: 'Growing',
    },
  ];

  // Pipeline health data
  const pipelineHealthData = [
    { name: 'Active', value: activeFollowUps, fill: '#059669' },
    { name: 'Converted', value: converted, fill: '#5D3FD3' },
    { name: 'Dropped', value: (analytics?.conversionFunnel?.['Not Interested'] || 0) + (analytics?.conversionFunnel?.['Lost Contact'] || 0), fill: '#E11D48' },
  ];

  // Status progression data
  const progressionData = [
    { stage: 'New', count: analytics?.conversionFunnel?.New || 0 },
    { stage: 'Following Up', count: analytics?.conversionFunnel?.['Following Up'] || 0 },
    { stage: 'Interested', count: analytics?.conversionFunnel?.Interested || 0 },
    { stage: 'Converted', count: analytics?.conversionFunnel?.Converted || 0 },
  ];

  return (
    <div className="space-y-6">
      {/* Big Picture KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpis.map((kpi, index) => (
          <Card
            key={index}
            className={`bg-gradient-to-br ${kpi.color} border-0 p-6 text-white shadow-xl hover:scale-105 transition-transform`}
          >
            <div className="flex items-start justify-between mb-4">
              <kpi.icon className="h-10 w-10 opacity-80" />
              {kpi.trend === 'up' ? (
                <TrendingUp className="h-6 w-6 text-white/80" />
              ) : (
                <TrendingUp className="h-6 w-6 text-white/80 rotate-180" />
              )}
            </div>
            <div className="space-y-2">
              <p className="text-sm opacity-90">{kpi.title}</p>
              <p className="text-4xl font-bold">{kpi.value}</p>
              <p className="text-xs opacity-75">Target: {kpi.target}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* Strategic Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="bg-slate-900/50 border-slate-700 p-6">
          <div className="text-center space-y-4">
            <Users className="h-12 w-12 text-purple-400 mx-auto" />
            <div>
              <p className="text-3xl font-bold text-white">{totalSouls}</p>
              <p className="text-sm text-slate-400 mt-1">Total Souls Reached</p>
            </div>
            <div className="pt-4 border-t border-slate-700">
              <p className="text-lg text-emerald-400 font-semibold">{converted} Converted</p>
              <p className="text-xs text-slate-500">Lifetime Achievement</p>
            </div>
          </div>
        </Card>

        <Card className="bg-slate-900/50 border-slate-700 p-6">
          <div className="text-center space-y-4">
            <Target className="h-12 w-12 text-blue-400 mx-auto" />
            <div>
              <p className="text-3xl font-bold text-white">{activeFollowUps}</p>
              <p className="text-sm text-slate-400 mt-1">Active in Pipeline</p>
            </div>
            <div className="pt-4 border-t border-slate-700">
              <p className="text-lg text-blue-400 font-semibold">{engagementRate}% Engaged</p>
              <p className="text-xs text-slate-500">Engagement Rate</p>
            </div>
          </div>
        </Card>

        <Card className="bg-slate-900/50 border-slate-700 p-6">
          <div className="text-center space-y-4">
            <Award className="h-12 w-12 text-amber-400 mx-auto" />
            <div>
              <p className="text-3xl font-bold text-white">{dropOffRate}%</p>
              <p className="text-sm text-slate-400 mt-1">Drop-off Rate</p>
            </div>
            <div className="pt-4 border-t border-slate-700">
              <p className="text-lg text-rose-400 font-semibold">Needs Attention</p>
              <p className="text-xs text-slate-500">Retention Focus Area</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pipeline Health */}
        <Card className="bg-slate-900/50 border-slate-700 p-6">
          <h3 className="text-xl font-semibold text-white mb-4 text-center">Pipeline Health Overview</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pipelineHealthData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }: { name?: string; percent?: number }) => `${name ?? ''}: ${((percent || 0) * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {pipelineHealthData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1e293b',
                  border: '1px solid #475569',
                  borderRadius: '8px',
                  color: '#fff',
                }}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        {/* Status Progression */}
        <Card className="bg-slate-900/50 border-slate-700 p-6">
          <h3 className="text-xl font-semibold text-white mb-4 text-center">Soul Journey Progression</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={progressionData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="stage" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1e293b',
                  border: '1px solid #475569',
                  borderRadius: '8px',
                  color: '#fff',
                }}
              />
              <Bar dataKey="count" fill="#8B5CF6" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Strategic Recommendations */}
      <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-purple-500/30 p-8">
        <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
          <Target className="h-6 w-6 text-purple-400" />
          Strategic Recommendations
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-emerald-400 rounded-full mt-2"></div>
              <div>
                <p className="text-white font-semibold">Optimize Conversion Rate</p>
                <p className="text-sm text-slate-400">
                  Current: {conversionRate}% | Target: 20%+ | Focus on nurturing interested souls
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-blue-400 rounded-full mt-2"></div>
              <div>
                <p className="text-white font-semibold">Reduce Time to Conversion</p>
                <p className="text-sm text-slate-400">
                  Current: {avgDaysToConversion} days | Target: &lt;30 days | Increase follow-up frequency
                </p>
              </div>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-amber-400 rounded-full mt-2"></div>
              <div>
                <p className="text-white font-semibold">Address Critical Souls</p>
                <p className="text-sm text-slate-400">
                  {overview?.ragCounts?.RED || 0} souls need immediate intervention
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-purple-400 rounded-full mt-2"></div>
              <div>
                <p className="text-white font-semibold">Improve Engagement</p>
                <p className="text-sm text-slate-400">
                  Current: {engagementRate}% | Target: 60%+ | Enhance outreach strategies
                </p>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
