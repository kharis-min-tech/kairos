'use client';

import { useState, useEffect } from 'react';
import { BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { AlertCircle, TrendingUp, Users, Phone, CheckCircle, Clock, RefreshCw, Info, AlertTriangle, Circle, Mail, Lightbulb, ClipboardList, Calendar } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@kairos/ui';
import { formatDistanceToNow } from 'date-fns';

interface UnifiedDashboardProps {
  overview: any;
  analytics: any;
  followUpOverview: any;
  soulsData: any;
  followUpsData: any;
  onRefresh: () => void;
}

const COLORS = {
  RED: '#E11D48',
  AMBER: '#D97706',
  GREEN: '#059669',
  PURPLE: '#6D28D9',
  BLUE: '#3B82F6',
};

// Hook to detect theme
function useTheme() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const checkTheme = () => {
      setIsDark(document.documentElement.classList.contains('dark'));
    };
    
    checkTheme();
    
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    
    return () => observer.disconnect();
  }, []);

  return isDark;
}

// Info Tooltip Component
function InfoTooltip({ title, children }: { title: string; children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative inline-block">
      <button
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        onClick={() => setIsOpen(!isOpen)}
        className="ml-2 text-slate-600 dark:text-slate-400 hover:text-purple-600 dark:text-purple-400 transition-colors"
        aria-label={`Information about ${title}`}
      >
        <Info className="h-4 w-4" />
      </button>
      {isOpen && (
        <div className="absolute z-[100] right-0 bottom-full mb-2 w-80 p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-2xl text-sm">
          <div className="space-y-2 text-slate-700 dark:text-slate-300">
            {children}
          </div>
          {/* Arrow pointing down */}
          <div className="absolute top-full right-4 w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-slate-800"></div>
        </div>
      )}
    </div>
  );
}

export function UnifiedDashboard({
  overview,
  analytics,
  followUpOverview,
  soulsData,
  followUpsData,
  onRefresh,
}: UnifiedDashboardProps) {
  const [selectedSouls, setSelectedSouls] = useState<any[]>([]);
  const [selectedFollowUps, setSelectedFollowUps] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [followUpDialogOpen, setFollowUpDialogOpen] = useState(false);
  const [dialogTitle, setDialogTitle] = useState('');
  const isDark = useTheme();
  
  // Theme-aware colors for charts
  const axisColor = isDark ? '#94a3b8' : '#475569'; // slate-400 for dark, slate-600 for light
  const tooltipBg = isDark ? '#1e293b' : '#ffffff';
  const tooltipBorder = isDark ? '#475569' : '#e2e8f0';

  console.log('UnifiedDashboard Props:', {
    overview,
    analytics,
    followUpOverview,
    soulsData,
    followUpsData,
    soulsDataKeys: soulsData ? Object.keys(soulsData) : 'null',
    soulsDataData: soulsData?.data,
    soulsDataDataLength: soulsData?.data?.length,
  });

  const showSouls = (souls: any[], title: string) => {
    console.log('showSouls called with:', { souls, title, soulsLength: souls?.length });
    setSelectedSouls(souls || []);
    setDialogTitle(title);
    setDialogOpen(true);
  };

  const showFollowUps = (followUps: any[], title: string) => {
    console.log('showFollowUps called with:', { followUps, title, followUpsLength: followUps?.length });
    setSelectedFollowUps(followUps || []);
    setDialogTitle(title);
    setFollowUpDialogOpen(true);
  };

  // Prepare data for charts
  const ragPieData = [
    { name: 'Critical', value: overview?.ragCounts?.RED || 0, color: COLORS.RED },
    { name: 'Monitor', value: overview?.ragCounts?.AMBER || 0, color: COLORS.AMBER },
    { name: 'All Good', value: overview?.ragCounts?.GREEN || 0, color: COLORS.GREEN },
  ];

  const statusBarData = [
    { name: 'New', count: overview?.statusCounts?.New || 0 },
    { name: 'Following Up', count: overview?.statusCounts?.['Following Up'] || 0 },
    { name: 'Interested', count: overview?.statusCounts?.Interested || 0 },
    { name: 'Converted', count: overview?.statusCounts?.Converted || 0 },
    { name: 'Not Interested', count: overview?.statusCounts?.['Not Interested'] || 0 },
  ];

  const followUpRagData = [
    { name: 'Critical', value: followUpOverview?.ragCounts?.RED || 0, color: COLORS.RED },
    { name: 'Monitor', value: followUpOverview?.ragCounts?.AMBER || 0, color: COLORS.AMBER },
    { name: 'All Good', value: followUpOverview?.ragCounts?.GREEN || 0, color: COLORS.GREEN },
  ];

  const conversionFunnelData = analytics?.conversionFunnel ? [
    { stage: 'New', count: analytics.conversionFunnel.New || 0 },
    { stage: 'Following Up', count: analytics.conversionFunnel['Following Up'] || 0 },
    { stage: 'Interested', count: analytics.conversionFunnel.Interested || 0 },
    { stage: 'Converted', count: analytics.conversionFunnel.Converted || 0 },
  ] : [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-slate-100 dark:from-slate-950 dark:via-purple-950 dark:to-slate-900 p-6">
      <div className="max-w-[1800px] mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 dark:from-purple-400 dark:via-pink-400 dark:to-purple-400 bg-clip-text text-transparent">
              Souls Dashboard
            </h1>
            <p className="text-slate-600 dark:text-slate-300 mt-2">Monitor and manage your souls pipeline at a glance</p>
          </div>
          <button
            onClick={onRefresh}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-slate-900 dark:text-white rounded-lg transition-colors shadow-md"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>

        {/* Top Stats - Big Numbers */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div 
            className="bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-900/50 dark:to-purple-800/30 backdrop-blur-sm border border-purple-300 dark:border-purple-300 dark:border-purple-500/20 rounded-xl p-6 shadow-xl cursor-pointer hover:scale-105 transition-transform"
            onClick={() => showSouls(soulsData?.data || [], 'All Souls')}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 dark:text-slate-300 text-sm">Total Souls</p>
                <p className="text-4xl font-bold text-purple-900 dark:text-white mt-2">{overview?.totalSouls || 0}</p>
                <p className="text-purple-700 dark:text-purple-200 text-xs mt-1">Click to view all</p>
              </div>
              <Users className="h-12 w-12 text-purple-600 dark:text-purple-400" />
            </div>
          </div>

          <div
            className="bg-gradient-to-br from-rose-100 to-rose-200 dark:from-rose-900/50 dark:to-rose-800/30 backdrop-blur-sm border border-rose-300 dark:border-rose-500/20 rounded-xl p-6 shadow-xl cursor-pointer hover:scale-105 transition-transform"
            onClick={() => showSouls(soulsData?.data?.filter((s: any) => s.ragStatus === 'RED') || [], 'RED Critical Souls - Need Immediate Attention')}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 dark:text-slate-400 text-sm">RED Critical</p>
                <p className="text-4xl font-bold text-slate-900 dark:text-white mt-2">{overview?.ragCounts?.RED || 0}</p>
                <p className="text-rose-700 dark:text-rose-200 text-xs mt-1">Click to view</p>
              </div>
              <AlertCircle className="h-12 w-12 text-rose-600 dark:text-rose-400 animate-pulse" />
            </div>
          </div>

          <div
            className="bg-gradient-to-br from-amber-100 to-amber-200 dark:from-amber-900/50 dark:to-amber-800/30 backdrop-blur-sm border border-amber-300 dark:border-amber-500/20 rounded-xl p-6 shadow-xl cursor-pointer hover:scale-105 transition-transform"
            onClick={() => showSouls(soulsData?.data?.filter((s: any) => s.ragStatus === 'AMBER') || [], 'AMBER Monitor - Needs Attention Soon')}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 dark:text-slate-400 text-sm">AMBER Monitor</p>
                <p className="text-4xl font-bold text-slate-900 dark:text-white mt-2">{overview?.ragCounts?.AMBER || 0}</p>
                <p className="text-amber-700 dark:text-amber-200 text-xs mt-1">Click to view</p>
              </div>
              <Clock className="h-12 w-12 text-amber-600 dark:text-amber-400" />
            </div>
          </div>

          <div
            className="bg-gradient-to-br from-emerald-100 to-emerald-200 dark:from-emerald-900/50 dark:to-emerald-800/30 backdrop-blur-sm border border-emerald-300 dark:border-emerald-500/20 rounded-xl p-6 shadow-xl cursor-pointer hover:scale-105 transition-transform"
            onClick={() => showSouls(soulsData?.data?.filter((s: any) => s.ragStatus === 'GREEN') || [], 'GREEN All Good - On Track')}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 dark:text-slate-400 text-sm">GREEN All Good</p>
                <p className="text-4xl font-bold text-slate-900 dark:text-white mt-2">{overview?.ragCounts?.GREEN || 0}</p>
                <p className="text-emerald-700 dark:text-emerald-200 text-xs mt-1">Click to view</p>
              </div>
              <CheckCircle className="h-12 w-12 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
        </div>

        {/* Charts Row 1 - Souls Pipeline */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Souls RAG Status Pie Chart */}
          <div className="bg-white dark:bg-slate-900/50 backdrop-blur-sm border border-slate-200 dark:border-slate-700/50 rounded-xl p-6 shadow-xl">
            <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <Users className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              Souls Pipeline Status
              <InfoTooltip title="Souls Pipeline RAG">
                <p className="font-semibold text-slate-900 dark:text-white mb-2">Souls Pipeline RAG Criteria:</p>
                <div className="space-y-2">
                  <div>
                    <p className="text-rose-600 dark:text-rose-400 font-semibold">RED RED - Critical:</p>
                    <ul className="ml-4 text-xs space-y-1">
                      <li>• No follow-up logged yet</li>
                      <li>• New/Following Up: 3+ days since last contact</li>
                      <li>• Interested: 5+ days since last contact</li>
                    </ul>
                  </div>
                  <div>
                    <p className="text-amber-600 dark:text-amber-400 font-semibold">AMBER AMBER - Monitor:</p>
                    <ul className="ml-4 text-xs space-y-1">
                      <li>• New/Following Up: 2 days since last contact</li>
                      <li>• Interested: 3-4 days since last contact</li>
                    </ul>
                  </div>
                  <div>
                    <p className="text-emerald-600 dark:text-emerald-400 font-semibold">GREEN GREEN - All Good:</p>
                    <ul className="ml-4 text-xs space-y-1">
                      <li>• New/Following Up: &lt; 2 days since last contact</li>
                      <li>• Interested: &lt; 3 days since last contact</li>
                      <li>• Converted/Not Interested/Lost Contact</li>
                    </ul>
                  </div>
                </div>
              </InfoTooltip>
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={ragPieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {ragPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-4 text-center text-slate-600 dark:text-slate-400 text-sm">
              Total: {overview?.totalSouls || 0} souls in pipeline
            </div>
          </div>

          {/* Status Breakdown Bar Chart */}
          <div className="bg-white dark:bg-slate-900/50 backdrop-blur-sm border border-slate-200 dark:border-slate-700/50 rounded-xl p-6 shadow-xl">
            <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-400" />
              Souls by Status
              <InfoTooltip title="Soul Status">
                <p className="font-semibold text-slate-900 dark:text-white mb-2">Soul Status Definitions:</p>
                <ul className="ml-4 text-xs space-y-1">
                  <li>• <span className="font-semibold">New:</span> Recently contacted, initial stage</li>
                  <li>• <span className="font-semibold">Following Up:</span> Active engagement in progress</li>
                  <li>• <span className="font-semibold">Interested:</span> Showing interest in joining</li>
                  <li>• <span className="font-semibold">Converted:</span> Successfully joined the church</li>
                  <li>• <span className="font-semibold">Not Interested:</span> Declined to join</li>
                  <li>• <span className="font-semibold">Lost Contact:</span> Unable to reach</li>
                </ul>
              </InfoTooltip>
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={statusBarData}>
                <XAxis dataKey="name" stroke={axisColor} angle={-35} textAnchor="end" height={100} interval={0} />
                <YAxis stroke={axisColor} />
                <Tooltip contentStyle={{ backgroundColor: tooltipBg, border: `1px solid ${tooltipBorder}` }} />
                <Bar 
                  dataKey="count" 
                  fill={COLORS.PURPLE}
                  onClick={(data) => {
                    showSouls(
                      soulsData?.data?.filter((s: any) => s.status === data.name) || [],
                      `${data.name} Souls`
                    );
                  }}
                  style={{ cursor: 'pointer' }}
                />
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-4 text-center text-slate-600 dark:text-slate-400 text-sm">
              Click any bar to view souls in that status
            </div>
          </div>
        </div>

        {/* Charts Row 2 - Follow-ups */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Follow-up RAG Status */}
          <div className="bg-white dark:bg-slate-900/50 backdrop-blur-sm border border-slate-200 dark:border-slate-700/50 rounded-xl p-6 shadow-xl">
            <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <Phone className="h-5 w-5 text-green-400" />
              Follow-up Status
              <InfoTooltip title="Follow-up RAG">
                <p className="font-semibold text-slate-900 dark:text-white mb-2">Follow-up RAG Criteria:</p>
                <div className="space-y-2">
                  <div>
                    <p className="text-rose-600 dark:text-rose-400 font-semibold">RED RED - Critical:</p>
                    <ul className="ml-4 text-xs space-y-1">
                      <li>• No follow-up logged</li>
                      <li>• Overdue: 3+ days (New/Following Up)</li>
                      <li>• Overdue: 5+ days (Interested)</li>
                      <li>• Contact Status: Wrong Number, Declined</li>
                    </ul>
                  </div>
                  <div>
                    <p className="text-amber-600 dark:text-amber-400 font-semibold">AMBER AMBER - Monitor:</p>
                    <ul className="ml-4 text-xs space-y-1">
                      <li>• Due soon: 2 days (New/Following Up)</li>
                      <li>• Due soon: 3-4 days (Interested)</li>
                      <li>• Contact Status: No Answer, Busy</li>
                    </ul>
                  </div>
                  <div>
                    <p className="text-emerald-600 dark:text-emerald-400 font-semibold">GREEN GREEN - All Good:</p>
                    <ul className="ml-4 text-xs space-y-1">
                      <li>• On track or no follow-up needed</li>
                      <li>• Contact Status: Successful</li>
                    </ul>
                  </div>
                </div>
              </InfoTooltip>
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={followUpRagData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                  onClick={(data) => {
                    const ragStatus = data.name.includes('Critical') ? 'RED' : 
                                     data.name.includes('Monitor') ? 'AMBER' : 'GREEN';
                    showFollowUps(
                      followUpsData?.data?.filter((f: any) => f.ragStatus === ragStatus) || [],
                      data.name
                    );
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  {followUpRagData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-4 text-center text-slate-600 dark:text-slate-400 text-sm">
              Total: {followUpOverview?.totalFollowUps || 0} follow-ups (Click chart to view details)
            </div>
          </div>

          {/* Conversion Funnel */}
          <div className="bg-white dark:bg-slate-900/50 backdrop-blur-sm border border-slate-200 dark:border-slate-700/50 rounded-xl p-6 shadow-xl">
            <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              Conversion Funnel
              <InfoTooltip title="Conversion Funnel">
                <p className="font-semibold text-slate-900 dark:text-white mb-2">Conversion Funnel:</p>
                <p className="text-xs mb-2">Shows the progression of souls through the pipeline stages.</p>
                <ul className="ml-4 text-xs space-y-1">
                  <li>• <span className="font-semibold">New:</span> Initial contacts</li>
                  <li>• <span className="font-semibold">Following Up:</span> Active engagement</li>
                  <li>• <span className="font-semibold">Interested:</span> Showing commitment</li>
                  <li>• <span className="font-semibold">Converted:</span> Successfully joined</li>
                </ul>
                <p className="text-xs mt-2 text-slate-600 dark:text-slate-400">Higher numbers at each stage indicate better retention.</p>
              </InfoTooltip>
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={conversionFunnelData} layout="vertical">
                <XAxis type="number" stroke={axisColor} />
                <YAxis dataKey="stage" type="category" stroke={axisColor} width={120} />
                <Tooltip contentStyle={{ backgroundColor: tooltipBg, border: `1px solid ${tooltipBorder}` }} />
                <Bar 
                  dataKey="count" 
                  fill={COLORS.BLUE}
                  onClick={(data) => {
                    showSouls(
                      soulsData?.data?.filter((s: any) => s.status === data.stage) || [],
                      `${data.stage} Souls`
                    );
                  }}
                  style={{ cursor: 'pointer' }}
                />
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-4 text-center text-slate-600 dark:text-slate-400 text-sm">
              Click any bar to view souls in that stage
            </div>
          </div>
        </div>

        {/* Key Metrics Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-slate-900/50 backdrop-blur-sm border border-slate-200 dark:border-slate-700/50 rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-slate-600 dark:text-slate-400 text-sm">Response Rate</h4>
              <InfoTooltip title="Response Rate">
                <p className="font-semibold text-slate-900 dark:text-white mb-2">Response Rate:</p>
                <p className="text-xs mb-2">Percentage of souls that have been successfully converted out of the total souls in the pipeline.</p>
                <p className="text-xs text-slate-600 dark:text-slate-400">Formula: (Converted Souls / Total Souls) × 100</p>
                <p className="text-xs mt-2 text-emerald-600 dark:text-emerald-400">Higher is better - indicates effective outreach and follow-up.</p>
              </InfoTooltip>
            </div>
            <p className="text-3xl font-bold text-slate-900 dark:text-white">{analytics?.overview?.conversionRate?.toFixed(1) || 0}%</p>
            <p className="text-slate-600 dark:text-slate-500 text-xs mt-1">Conversion rate</p>
          </div>

          <div className="bg-white dark:bg-slate-900/50 backdrop-blur-sm border border-slate-200 dark:border-slate-700/50 rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-slate-600 dark:text-slate-400 text-sm">Active Follow-ups</h4>
              <InfoTooltip title="Active Follow-ups">
                <p className="font-semibold text-slate-900 dark:text-white mb-2">Active Follow-ups:</p>
                <p className="text-xs mb-2">Number of souls currently in active follow-up stages (New, Following Up, or Interested).</p>
                <p className="text-xs text-slate-600 dark:text-slate-400">These souls require ongoing engagement and attention.</p>
                <p className="text-xs mt-2 text-amber-600 dark:text-amber-400">Monitor regularly to ensure timely follow-ups.</p>
              </InfoTooltip>
            </div>
            <p className="text-3xl font-bold text-slate-900 dark:text-white">{analytics?.overview?.activeFollowUps || 0}</p>
            <p className="text-slate-600 dark:text-slate-500 text-xs mt-1">In progress</p>
          </div>

          <div className="bg-white dark:bg-slate-900/50 backdrop-blur-sm border border-slate-200 dark:border-slate-700/50 rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-slate-600 dark:text-slate-400 text-sm">Avg Days to Convert</h4>
              <InfoTooltip title="Avg Days to Convert">
                <p className="font-semibold text-slate-900 dark:text-white mb-2">Average Days to Convert:</p>
                <p className="text-xs mb-2">Average number of days from first contact to successful conversion.</p>
                <p className="text-xs text-slate-600 dark:text-slate-400">Calculated from souls who have been converted.</p>
                <p className="text-xs mt-2 text-blue-400">Lower is better - indicates efficient conversion process.</p>
              </InfoTooltip>
            </div>
            <p className="text-3xl font-bold text-slate-900 dark:text-white">{analytics?.overview?.avgDaysToConversion || 0}</p>
            <p className="text-slate-600 dark:text-slate-500 text-xs mt-1">Days average</p>
          </div>
        </div>

        {/* Instructions Panel */}
        <div className="bg-gradient-to-r from-purple-900/30 to-pink-900/30 backdrop-blur-sm border border-purple-500/30 rounded-xl p-6">
          <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            Quick Guide
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-rose-600 dark:text-rose-400 font-semibold mb-2">RED Critical (Red)</p>
              <p className="text-slate-700 dark:text-slate-300">These souls need immediate attention! No follow-up logged or overdue contacts. Click the red card above to see the list.</p>
            </div>
            <div>
              <p className="text-amber-600 dark:text-amber-400 font-semibold mb-2">AMBER Monitor (Amber)</p>
              <p className="text-slate-700 dark:text-slate-300">Follow-up due soon. Keep an eye on these souls and schedule contact within 1-2 days.</p>
            </div>
            <div>
              <p className="text-emerald-600 dark:text-emerald-400 font-semibold mb-2">GREEN All Good (Green)</p>
              <p className="text-slate-700 dark:text-slate-300">Recent contact made or no follow-up needed. These souls are on track!</p>
            </div>
          </div>
        </div>
      </div>

      {/* Souls List Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto bg-slate-900 border-slate-200 dark:border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-2xl text-slate-900 dark:text-white">{dialogTitle}</DialogTitle>
            <p className="text-slate-600 dark:text-slate-400 mt-2">Total: {selectedSouls.length} souls</p>
          </DialogHeader>
          <div className="space-y-3 mt-4">
            {selectedSouls.length === 0 ? (
              <p className="text-slate-600 dark:text-slate-400 text-center py-8">No souls in this category</p>
            ) : (
              selectedSouls.map((soul: any) => (
                <div
                  key={soul.id}
                  className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg p-4 hover:bg-white dark:bg-slate-800 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="text-lg font-semibold text-slate-900 dark:text-white">
                          {soul.firstName} {soul.lastName}
                        </h4>
                        <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          soul.ragStatus === 'RED' ? 'bg-rose-900/50 text-rose-700 dark:text-rose-200' :
                          soul.ragStatus === 'AMBER' ? 'bg-amber-900/50 text-amber-700 dark:text-amber-200' :
                          'bg-emerald-900/50 text-emerald-700 dark:text-emerald-200'
                        }`}>
                          {soul.ragStatus === 'RED' ? <AlertCircle className="w-3 h-3 inline" /> : soul.ragStatus === 'AMBER' ? <AlertTriangle className="w-3 h-3 inline" /> : <CheckCircle className="w-3 h-3 inline" />} {soul.ragStatus}
                        </div>
                      </div>
                      
                      {/* Branch/Outreach Info */}
                      {soul.outreachName && (
                        <div className="mb-2 pb-2 border-b border-slate-200 dark:border-slate-700">
                          <p className="text-slate-600 dark:text-slate-400 text-sm">
                            <span className="text-purple-600 dark:text-purple-400 font-medium">{soul.outreachName}</span>
                          </p>
                        </div>
                      )}
                      
                      <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                        <p className="text-slate-600 dark:text-slate-400">
                          <span className="text-slate-900 dark:text-white">{soul.phone || 'No phone'}</span>
                        </p>
                        <p className="text-slate-600 dark:text-slate-400">
                          <span className="text-slate-900 dark:text-white">{soul.email || 'No email'}</span>
                        </p>
                        <p className="text-slate-600 dark:text-slate-400">
                          Status: <span className="text-slate-900 dark:text-white font-medium">{soul.status}</span>
                        </p>
                        <p className="text-slate-600 dark:text-slate-400">
                          Assigned: <span className="text-slate-900 dark:text-white">{soul.assignedMemberName || 'Unassigned'}</span>
                        </p>
                        {soul.assignedMemberBranchName && (
                          <p className="text-slate-600 dark:text-slate-400 col-span-2">
                            Branch: <span className="text-purple-600 dark:text-purple-400 font-medium">{soul.assignedMemberBranchName}</span>
                          </p>
                        )}
                      </div>
                      
                      {soul.lastFollowUpDate && (
                        <p className="text-slate-600 dark:text-slate-500 text-xs mt-2">
                          Last contact: {formatDistanceToNow(new Date(soul.lastFollowUpDate), { addSuffix: true })}
                        </p>
                      )}
                      
                      {soul.ragReason && (
                        <div className="mt-2 p-2 bg-white dark:bg-slate-900/50 rounded border-l-2 border-slate-600">
                          <p className="text-slate-600 dark:text-slate-400 text-xs italic">
                            {soul.ragReason}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Follow-ups List Dialog */}
      <Dialog open={followUpDialogOpen} onOpenChange={setFollowUpDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto bg-slate-900 border-slate-200 dark:border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-2xl text-slate-900 dark:text-white">{dialogTitle}</DialogTitle>
            <p className="text-slate-600 dark:text-slate-400 mt-2">Total: {selectedFollowUps.length} follow-ups</p>
          </DialogHeader>
          <div className="space-y-3 mt-4">
            {selectedFollowUps.length === 0 ? (
              <p className="text-slate-600 dark:text-slate-400 text-center py-8">No follow-ups in this category</p>
            ) : (
              selectedFollowUps.map((followUp: any) => (
                <div
                  key={followUp.id}
                  className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg p-4 hover:bg-white dark:bg-slate-800 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="text-lg font-semibold text-slate-900 dark:text-white">
                          {followUp.soulName}
                        </h4>
                        <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          followUp.ragStatus === 'RED' ? 'bg-rose-900/50 text-rose-700 dark:text-rose-200' :
                          followUp.ragStatus === 'AMBER' ? 'bg-amber-900/50 text-amber-700 dark:text-amber-200' :
                          'bg-emerald-900/50 text-emerald-700 dark:text-emerald-200'
                        }`}>
                          {followUp.ragStatus === 'RED' ? <AlertCircle className="w-3 h-3 inline" /> : followUp.ragStatus === 'AMBER' ? <AlertTriangle className="w-3 h-3 inline" /> : <CheckCircle className="w-3 h-3 inline" />} {followUp.ragStatus}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                        <p className="text-slate-600 dark:text-slate-400">
                          Contact Status: <span className="text-slate-900 dark:text-white font-medium">{followUp.contactStatus}</span>
                        </p>
                        <p className="text-slate-600 dark:text-slate-400">
                          Follow-up by: <span className="text-slate-900 dark:text-white">{followUp.memberName || 'Unknown'}</span>
                        </p>
                        <p className="text-slate-600 dark:text-slate-400 col-span-2 flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Follow-up Date: <span className="text-slate-900 dark:text-white">{formatDistanceToNow(new Date(followUp.followUpDate), { addSuffix: true })}</span>
                        </p>
                      </div>
                      
                      {followUp.ragReason && (
                        <div className="mt-2 p-2 bg-white dark:bg-slate-900/50 rounded border-l-2 border-slate-600">
                          <p className="text-slate-600 dark:text-slate-400 text-xs italic">
                            {followUp.ragReason}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
