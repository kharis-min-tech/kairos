'use client';

import { Card } from '@kairos/ui';
import { TrendingUp, Sparkles, Brain, Zap, AlertTriangle, CheckCircle } from 'lucide-react';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
} from 'recharts';

import type { DashboardAnalytics, RagTrendEntry } from './types';

interface PredictiveDashboardProps {
  analytics: DashboardAnalytics | null;
}

export function PredictiveDashboard({ analytics }: PredictiveDashboardProps) {
  const predictedConversions = analytics?.predictive?.predictedConversions || 0;
  const recentConversionRate = analytics?.predictive?.recentConversionRate || 0;
  const trendDirection = analytics?.predictive?.trendDirection || 'neutral';

  // Generate forecast data for next 30 days
  const generateForecast = () => {
    const forecast = [];
    const today = new Date();
    const historicalData = analytics?.ragTrend || [];
    
    // Calculate averages from historical data
    const avgRed = historicalData.reduce((sum: number, d: RagTrendEntry) => sum + (d.RED || 0), 0) / historicalData.length || 0;
    const avgAmber = historicalData.reduce((sum: number, d: RagTrendEntry) => sum + (d.AMBER || 0), 0) / historicalData.length || 0;
    const avgGreen = historicalData.reduce((sum: number, d: RagTrendEntry) => sum + (d.GREEN || 0), 0) / historicalData.length || 0;

    // Generate predictions with slight variations
    for (let i = 1; i <= 30; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);
      
      // Add trend-based adjustments
      const trendMultiplier = trendDirection === 'up' ? 1.05 : 0.95;
      const variance = 0.1; // 10% variance
      
      forecast.push({
        date: date.toISOString().split('T')[0],
        predictedRED: Math.round(avgRed * trendMultiplier * (1 + (Math.random() - 0.5) * variance)),
        predictedAMBER: Math.round(avgAmber * trendMultiplier * (1 + (Math.random() - 0.5) * variance)),
        predictedGREEN: Math.round(avgGreen * trendMultiplier * (1 + (Math.random() - 0.5) * variance)),
        confidence: 95 - i * 1.5, // Confidence decreases over time
      });
    }
    
    return forecast;
  };

  const forecastData = generateForecast();

  // Combine historical and forecast data
  const historicalData = (analytics?.ragTrend || []).slice(-7).map((d: RagTrendEntry) => ({
    date: d.date,
    RED: d.RED,
    AMBER: d.AMBER,
    GREEN: d.GREEN,
    type: 'historical',
  }));

  const combinedData = [
    ...historicalData,
    ...forecastData.slice(0, 14).map((d) => ({
      date: d.date,
      RED: d.predictedRED,
      AMBER: d.predictedAMBER,
      GREEN: d.predictedGREEN,
      type: 'forecast',
    })),
  ];

  // Risk assessment
  const avgPredictedRed = forecastData.reduce((sum, d) => sum + d.predictedRED, 0) / forecastData.length;
  const riskLevel = avgPredictedRed > 10 ? 'high' : avgPredictedRed > 5 ? 'medium' : 'low';

  // Conversion predictions
  const conversionForecast = Array.from({ length: 12 }, (_, i) => {
    const month = new Date();
    month.setMonth(month.getMonth() + i);
    return {
      month: month.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      predicted: Math.round(predictedConversions * (1 + i * 0.05)),
      lower: Math.round(predictedConversions * (1 + i * 0.05) * 0.8),
      upper: Math.round(predictedConversions * (1 + i * 0.05) * 1.2),
    };
  });

  return (
    <div className="space-y-6">
      {/* Predictive KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-gradient-to-br from-purple-900/50 to-purple-800/50 border-purple-500/30 p-6">
          <div className="flex items-center justify-between mb-4">
            <Sparkles className="h-10 w-10 text-purple-400" />
            <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
              trendDirection === 'up' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
            }`}>
              {trendDirection === 'up' ? '↑ Improving' : '↓ Declining'}
            </div>
          </div>
          <div>
            <p className="text-sm text-purple-300">Predicted Conversions (30 days)</p>
            <p className="text-4xl font-bold text-white mt-2">{predictedConversions}</p>
            <p className="text-xs text-purple-400 mt-1">Based on recent trends</p>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-blue-900/50 to-blue-800/50 border-blue-500/30 p-6">
          <div className="flex items-center justify-between mb-4">
            <Brain className="h-10 w-10 text-blue-400" />
            <div className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-400">
              AI Powered
            </div>
          </div>
          <div>
            <p className="text-sm text-blue-300">Recent Conversion Rate</p>
            <p className="text-4xl font-bold text-white mt-2">{recentConversionRate}%</p>
            <p className="text-xs text-blue-400 mt-1">Last 30 days performance</p>
          </div>
        </Card>

        <Card className={`bg-gradient-to-br ${
          riskLevel === 'high' ? 'from-rose-900/50 to-rose-800/50 border-rose-500/30' :
          riskLevel === 'medium' ? 'from-amber-900/50 to-amber-800/50 border-amber-500/30' :
          'from-emerald-900/50 to-emerald-800/50 border-emerald-500/30'
        } p-6`}>
          <div className="flex items-center justify-between mb-4">
            {riskLevel === 'high' ? <AlertTriangle className="h-10 w-10 text-rose-400" /> :
             riskLevel === 'medium' ? <Zap className="h-10 w-10 text-amber-400" /> :
             <CheckCircle className="h-10 w-10 text-emerald-400" />}
            <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
              riskLevel === 'high' ? 'bg-rose-500/20 text-rose-400' :
              riskLevel === 'medium' ? 'bg-amber-500/20 text-amber-400' :
              'bg-emerald-500/20 text-emerald-400'
            }`}>
              {riskLevel.toUpperCase()}
            </div>
          </div>
          <div>
            <p className={`text-sm ${
              riskLevel === 'high' ? 'text-rose-300' :
              riskLevel === 'medium' ? 'text-amber-300' :
              'text-emerald-300'
            }`}>Risk Assessment</p>
            <p className="text-4xl font-bold text-white mt-2">{Math.round(avgPredictedRed)}</p>
            <p className={`text-xs mt-1 ${
              riskLevel === 'high' ? 'text-rose-400' :
              riskLevel === 'medium' ? 'text-amber-400' :
              'text-emerald-400'
            }`}>Avg. predicted critical souls</p>
          </div>
        </Card>
      </div>

      {/* 30-Day Forecast */}
      <Card className="bg-slate-900/50 border-slate-700 p-6">
        <h3 className="text-2xl font-semibold text-white mb-4 flex items-center gap-2">
          <TrendingUp className="h-6 w-6 text-purple-400" />
          30-Day RAG Status Forecast
        </h3>
        <div className="mb-4 flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-slate-600 rounded"></div>
            <span className="text-slate-400">Historical (Last 7 days)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-purple-500 rounded"></div>
            <span className="text-slate-400">Predicted (Next 14 days)</span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={400}>
          <ComposedChart data={combinedData}>
            <defs>
              <linearGradient id="forecastRED" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#E11D48" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#E11D48" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="forecastAMBER" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#D97706" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#D97706" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="forecastGREEN" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#059669" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#059669" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis
              dataKey="date"
              stroke="#94a3b8"
              tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            />
            <YAxis stroke="#94a3b8" />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1e293b',
                border: '1px solid #475569',
                borderRadius: '8px',
                color: '#fff',
              }}
              labelFormatter={(value) => new Date(value).toLocaleDateString()}
            />
            <Legend />
            <Area
              type="monotone"
              dataKey="RED"
              stroke="#E11D48"
              fill="url(#forecastRED)"
              strokeWidth={2}
              name="Critical"
            />
            <Area
              type="monotone"
              dataKey="AMBER"
              stroke="#D97706"
              fill="url(#forecastAMBER)"
              strokeWidth={2}
              name="Monitor"
            />
            <Area
              type="monotone"
              dataKey="GREEN"
              stroke="#059669"
              fill="url(#forecastGREEN)"
              strokeWidth={2}
              name="All Good"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </Card>

      {/* 12-Month Conversion Forecast */}
      <Card className="bg-slate-900/50 border-slate-700 p-6">
        <h3 className="text-2xl font-semibold text-white mb-4 flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-amber-400" />
          12-Month Conversion Forecast
        </h3>
        <ResponsiveContainer width="100%" height={400}>
          <ComposedChart data={conversionForecast}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="month" stroke="#94a3b8" />
            <YAxis stroke="#94a3b8" />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1e293b',
                border: '1px solid #475569',
                borderRadius: '8px',
                color: '#fff',
              }}
            />
            <Legend />
            <Area
              type="monotone"
              dataKey="upper"
              stroke="#8B5CF6"
              fill="#8B5CF6"
              fillOpacity={0.1}
              name="Upper Bound"
            />
            <Area
              type="monotone"
              dataKey="lower"
              stroke="#8B5CF6"
              fill="#8B5CF6"
              fillOpacity={0.1}
              name="Lower Bound"
            />
            <Line
              type="monotone"
              dataKey="predicted"
              stroke="#8B5CF6"
              strokeWidth={3}
              dot={{ fill: '#8B5CF6', r: 4 }}
              name="Predicted Conversions"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </Card>

      {/* AI Insights */}
      <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-purple-500/30 p-8">
        <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
          <Brain className="h-6 w-6 text-purple-400" />
          AI-Powered Insights & Recommendations
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Sparkles className="h-5 w-5 text-purple-400 mt-1" />
                <div>
                  <p className="text-white font-semibold mb-1">Trend Analysis</p>
                  <p className="text-sm text-slate-400">
                    {trendDirection === 'up' 
                      ? 'Your conversion rate is trending upward. Continue current strategies and scale successful approaches.'
                      : 'Conversion rate shows declining trend. Consider reviewing follow-up processes and engagement tactics.'}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Brain className="h-5 w-5 text-blue-400 mt-1" />
                <div>
                  <p className="text-white font-semibold mb-1">Capacity Planning</p>
                  <p className="text-sm text-slate-400">
                    Based on predictions, expect {predictedConversions} conversions in the next 30 days. 
                    Ensure adequate resources for follow-up and integration.
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <div className={`${
              riskLevel === 'high' ? 'bg-rose-500/10 border-rose-500/30' :
              riskLevel === 'medium' ? 'bg-amber-500/10 border-amber-500/30' :
              'bg-emerald-500/10 border-emerald-500/30'
            } border rounded-lg p-4`}>
              <div className="flex items-start gap-3">
                {riskLevel === 'high' ? <AlertTriangle className="h-5 w-5 text-rose-400 mt-1" /> :
                 riskLevel === 'medium' ? <Zap className="h-5 w-5 text-amber-400 mt-1" /> :
                 <CheckCircle className="h-5 w-5 text-emerald-400 mt-1" />}
                <div>
                  <p className="text-white font-semibold mb-1">Risk Mitigation</p>
                  <p className="text-sm text-slate-400">
                    {riskLevel === 'high' 
                      ? 'High risk detected. Prioritize critical souls and increase follow-up frequency immediately.'
                      : riskLevel === 'medium'
                      ? 'Moderate risk level. Monitor closely and address amber status souls proactively.'
                      : 'Low risk environment. Maintain current practices and focus on optimization.'}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <TrendingUp className="h-5 w-5 text-emerald-400 mt-1" />
                <div>
                  <p className="text-white font-semibold mb-1">Growth Opportunity</p>
                  <p className="text-sm text-slate-400">
                    12-month forecast shows potential for {conversionForecast[11]?.predicted || 0} conversions. 
                    Scale outreach programs to maximize impact.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
