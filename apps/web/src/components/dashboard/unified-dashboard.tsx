'use client';

import { useMemo, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { AlertCircle, RefreshCw, Info, AlertTriangle, ClipboardList, Calendar, CheckCircle, Users, Clock } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, CustomSelect } from '@kairos/ui';
import {
  formatDistanceToNow,
  subDays,
  subMonths,
} from 'date-fns';
import { DateSelect } from '@kairos/ui';
import { formatShortDate } from '@/lib/date-format';
import type { DashboardOverview, DashboardAnalytics, FollowUpOverviewData, PaginatedDashboardData, DashboardSoul, DashboardFollowUp } from './types';

type DatePreset = 'week' | '1M' | '3M' | '6M' | 'custom';

interface UnifiedDashboardProps {
  overview: DashboardOverview | null;
  analytics: DashboardAnalytics | null;
  followUpOverview: FollowUpOverviewData | null;
  soulsData: PaginatedDashboardData<DashboardSoul> | null;
  followUpsData: PaginatedDashboardData<DashboardFollowUp> | null;
  onRefresh: () => void;
  dateFrom: string | null;
  dateTo: string | null;
  onDateRangeChange: (from: string | null, to: string | null) => void;
  programId?: string | null;
  onProgramChange?: (programId: string | null) => void;
  programs?: Array<{ id: string; programName: string }>;
  isRefreshing?: boolean;
}

const COLORS = {
  RED: '#be123c',
  AMBER: '#b45309',
  GREEN: '#047857',
  PURPLE: '#5D3FD3',
};

// Thresholds for the Stage Assimilation Rates card. Higher = healthier.
// Tweak these to recalibrate the RAG colouring without touching component logic.
const ASSIMILATION_THRESHOLDS = {
  /** At or above this %, the stage is GREEN (healthy hand-off). */
  green: 60,
  /** At or above this % (but below `green`), the stage is AMBER. Below = RED. */
  amber: 30,
} as const;

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
        className="ml-2 text-muted-foreground hover:text-primary transition-colors"
        aria-label={`Information about ${title}`}
      >
        <Info className="h-4 w-4" />
      </button>
      {isOpen && (
        <div className="absolute z-[100] right-0 bottom-full mb-2 w-80 p-4 bg-card border border-border/15 rounded shadow-ambient text-sm">
          <div className="space-y-2 text-muted-foreground">
            {children}
          </div>
          {/* Arrow pointing down */}
          <div className="absolute top-full right-4 w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-card"></div>
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
  dateFrom,
  dateTo,
  onDateRangeChange,
  programId = null,
  onProgramChange,
  programs = [],
  isRefreshing,
}: UnifiedDashboardProps) {
  const router = useRouter();
  const [selectedSouls, setSelectedSouls] = useState<DashboardSoul[]>([]);
  const [selectedFollowUps, setSelectedFollowUps] = useState<DashboardFollowUp[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [followUpDialogOpen, setFollowUpDialogOpen] = useState(false);
  const [dialogTitle, setDialogTitle] = useState('');
  const [datePreset, setDatePreset] = useState<DatePreset>('1M');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const isDark = useTheme();
  
  // Theme-aware colors for charts
  const axisColor = isDark ? '#94a3b8' : '#475569'; // slate-400 for dark, slate-600 for light
  const tooltipBg = isDark ? '#1e293b' : '#ffffff';
  const tooltipBorder = isDark ? '#475569' : '#e2e8f0';

  // Compute date range from preset
  const formatDateInput = (d: Date) => d.toISOString().split('T')[0] ?? '';

  const applyPreset = (preset: DatePreset) => {
    setDatePreset(preset);
    if (preset === 'custom') {
      // Don't fire change until user picks both dates
      return;
    }
    const now = new Date();
    let from: Date;
    switch (preset) {
      case 'week':
        from = subDays(now, 7);
        break;
      case '1M':
        from = subMonths(now, 1);
        break;
      case '3M':
        from = subMonths(now, 3);
        break;
      case '6M':
        from = subMonths(now, 6);
        break;
      default:
        from = subMonths(now, 1);
    }
    onDateRangeChange(from.toISOString(), now.toISOString());
  };

  const applyCustomRange = (from: string, to: string) => {
    setCustomFrom(from);
    setCustomTo(to);
    if (from && to) {
      const fromDate = new Date(from);
      const toDate = new Date(to);
      // Set toDate to end-of-day for inclusive filtering
      toDate.setHours(23, 59, 59, 999);
      onDateRangeChange(fromDate.toISOString(), toDate.toISOString());
    }
  };

  // Initialize default range (1M) on mount if no range provided
  useEffect(() => {
    if (dateFrom === null && dateTo === null) {
      applyPreset('1M');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const showSouls = (souls: DashboardSoul[], title: string) => {
    setSelectedSouls(souls || []);
    setDialogTitle(title);
    setDialogOpen(true);
  };

  const showFollowUps = (followUps: DashboardFollowUp[], title: string) => {
    setSelectedFollowUps(followUps || []);
    setDialogTitle(title);
    setFollowUpDialogOpen(true);
  };

  const recentFollowUps = useMemo(
    () => (followUpsData?.data ?? []).slice(0, 10),
    [followUpsData],
  );

  // Prepare data for charts
  const ragPieData = [
    { name: 'Critical', value: overview?.ragCounts?.RED || 0, color: COLORS.RED },
    { name: 'Monitor', value: overview?.ragCounts?.AMBER || 0, color: COLORS.AMBER },
    { name: 'On Track', value: overview?.ragCounts?.GREEN || 0, color: COLORS.GREEN },
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
    { name: 'On Track', value: followUpOverview?.ragCounts?.GREEN || 0, color: COLORS.GREEN },
  ];

  const conversionFunnelData = analytics?.conversionFunnel ? [
    { stage: 'New', count: analytics.conversionFunnel.New || 0 },
    { stage: 'Following Up', count: analytics.conversionFunnel['Following Up'] || 0 },
    { stage: 'Interested', count: analytics.conversionFunnel.Interested || 0 },
    { stage: 'Converted', count: analytics.conversionFunnel.Converted || 0 },
  ] : [];

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-[1800px] mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-semibold text-primary tracking-tight">
              Souls Dashboard
            </h1>
            <p className="text-muted-foreground mt-2">Soul management and assimilation insights</p>
          </div>
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#451ebb] to-[#5d3fd3] hover:from-[#3a17a0] hover:to-[#4f35b8] text-white rounded transition-colors shadow-md disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Date Filter Bar */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex items-center gap-1 rounded bg-[#f0f0f3] p-1.5 dark:bg-white/[0.06]">
            {([
              { key: 'week', label: 'Week' },
              { key: '1M', label: '1M' },
              { key: '3M', label: '3M' },
              { key: '6M', label: '6M' },
              { key: 'custom', label: 'Custom' },
            ] as Array<{ key: DatePreset; label: string }>).map((opt) => {
              const active = datePreset === opt.key;
              return (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => applyPreset(opt.key)}
                  className={`inline-flex items-center justify-center min-w-[64px] px-5 py-2 rounded text-sm font-semibold transition-all duration-150 ${
                    active
                      ? 'bg-white text-foreground shadow-sm dark:bg-[#5D3FD3] dark:text-white'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
          {datePreset === 'custom' && (
            <div className="inline-flex items-center gap-2">
              <DateSelect
                variant="pill"
                value={customFrom}
                placeholder="Start date"
                maxDate={customTo || formatDateInput(new Date())}
                onChange={(v) => applyCustomRange(v, customTo)}
              />
              <span className="text-sm font-medium text-muted-foreground">to</span>
              <DateSelect
                variant="pill"
                value={customTo}
                placeholder="End date"
                minDate={customFrom}
                maxDate={formatDateInput(new Date())}
                onChange={(v) => applyCustomRange(customFrom, v)}
              />
            </div>
          )}
          {dateFrom && dateTo && (
            <p className="text-xs text-muted-foreground">
              Showing data from {formatShortDate(dateFrom)} to {formatShortDate(dateTo)}
            </p>
          )}
          {onProgramChange && (
            <div className="ml-auto flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Program
              </span>
              <div className="min-w-[220px]">
                <CustomSelect
                  value={programId ?? ''}
                  onValueChange={(value) => onProgramChange(value === '' ? null : value)}
                  options={[
                    { value: '', label: 'All programs' },
                    ...programs.map((p) => ({ value: p.id, label: p.programName })),
                  ]}
                  placeholder="All programs"
                  size="sm"
                />
              </div>
            </div>
          )}
        </div>

        {/* Top Stats - Big Numbers */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div 
            className="bg-card rounded p-6 shadow-ambient cursor-pointer hover:shadow-ambient-lg transition-shadow"
            onClick={() => showSouls(soulsData?.data || [], 'All Souls')}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm">Total Souls</p>
                <p className="text-4xl font-semibold text-foreground mt-2 tracking-tight">{overview?.totalSouls || 0}</p>
                <p className="text-muted-foreground text-xs mt-1">Click to view all</p>
              </div>
              <Users className="h-12 w-12 text-primary/60" />
            </div>
          </div>

          <div
            className="bg-card rounded p-6 shadow-ambient cursor-pointer hover:shadow-ambient-lg transition-shadow"
            onClick={() => showSouls(soulsData?.data?.filter((s) => s.ragStatus === 'RED') || [], 'Critical Souls - Need Immediate Attention')}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm">Critical</p>
                <p className="text-4xl font-semibold text-foreground mt-2 tracking-tight">{overview?.ragCounts?.RED || 0}</p>
                <p className="text-muted-foreground text-xs mt-1">Click to view</p>
              </div>
              <AlertCircle className="h-12 w-12 text-destructive/70" />
            </div>
          </div>

          <div
            className="bg-card rounded p-6 shadow-ambient cursor-pointer hover:shadow-ambient-lg transition-shadow"
            onClick={() => showSouls(soulsData?.data?.filter((s) => s.ragStatus === 'AMBER') || [], 'Monitor - Needs Attention Soon')}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm">Monitor</p>
                <p className="text-4xl font-semibold text-foreground mt-2 tracking-tight">{overview?.ragCounts?.AMBER || 0}</p>
                <p className="text-muted-foreground text-xs mt-1">Click to view</p>
              </div>
              <Clock className="h-12 w-12 text-accent/70" />
            </div>
          </div>

          <div
            className="bg-card rounded p-6 shadow-ambient cursor-pointer hover:shadow-ambient-lg transition-shadow"
            onClick={() => showSouls(soulsData?.data?.filter((s) => s.ragStatus === 'GREEN') || [], 'On Track - On Track')}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm">On Track</p>
                <p className="text-4xl font-semibold text-foreground mt-2 tracking-tight">{overview?.ragCounts?.GREEN || 0}</p>
                <p className="text-muted-foreground text-xs mt-1">Click to view</p>
              </div>
              <CheckCircle className="h-12 w-12 text-success/70" />
            </div>
          </div>
        </div>

        {/* Charts Row 1 - Souls Pipeline */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Souls RAG Status Pie Chart */}
          <div className="bg-card rounded p-6 shadow-ambient">
            <h3 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
              Souls Pipeline Status
              <InfoTooltip title="Souls Pipeline RAG">
                <p className="font-semibold text-foreground mb-2">Souls Pipeline RAG Criteria:</p>
                <div className="space-y-2">
                  <div>
                    <p className="text-destructive font-semibold">RED RED - Critical:</p>
                    <ul className="ml-4 text-xs space-y-1">
                      <li>• No follow-up logged yet</li>
                      <li>• New/Following Up: 3+ days since last contact</li>
                      <li>• Interested: 5+ days since last contact</li>
                    </ul>
                  </div>
                  <div>
                    <p className="text-accent font-semibold">AMBER AMBER - Monitor:</p>
                    <ul className="ml-4 text-xs space-y-1">
                      <li>• New/Following Up: 2 days since last contact</li>
                      <li>• Interested: 3-4 days since last contact</li>
                    </ul>
                  </div>
                  <div>
                    <p className="text-success font-semibold">GREEN GREEN - On Track:</p>
                    <ul className="ml-4 text-xs space-y-1">
                      <li>• New/Following Up: &lt; 2 days since last contact</li>
                      <li>• Interested: &lt; 3 days since last contact</li>
                      <li>• Converted/Not Interested/Lost Contact</li>
                    </ul>
                  </div>
                </div>
              </InfoTooltip>
            </h3>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={ragPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={72}
                  outerRadius={96}
                  paddingAngle={4}
                  cornerRadius={4}
                  stroke="none"
                  dataKey="value"
                >
                  {ragPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: tooltipBg, border: `1px solid ${tooltipBorder}`, borderRadius: 4 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-4 flex items-center justify-center gap-4 text-sm">
              {ragPieData.map((entry) => (
                <div key={entry.name} className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
                  <span className="text-muted-foreground">{entry.name}</span>
                  <span className="font-semibold text-foreground">{entry.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Status Breakdown Bar Chart */}
          <div className="bg-card rounded p-6 shadow-ambient">
            <h3 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
              Souls by Status
              <InfoTooltip title="Soul Status">
                <p className="font-semibold text-foreground mb-2">Soul Status Definitions:</p>
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
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={statusBarData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={axisColor} strokeOpacity={0.15} vertical={false} />
                <XAxis dataKey="name" stroke={axisColor} angle={-25} textAnchor="end" height={70} interval={0} tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                <YAxis stroke={axisColor} tickLine={false} axisLine={false} tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip cursor={{ fill: axisColor, fillOpacity: 0.06 }} contentStyle={{ backgroundColor: tooltipBg, border: `1px solid ${tooltipBorder}`, borderRadius: 4 }} />
                <Bar 
                  dataKey="count" 
                  fill={COLORS.PURPLE}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={36}
                  onClick={(data) => {
                    showSouls(
                      soulsData?.data?.filter((s) => s.status === data.name) || [],
                      `${data.name} Souls`
                    );
                  }}
                  style={{ cursor: 'pointer' }}
                />
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-4 text-center text-muted-foreground text-sm">
              Click any bar to view souls in that status
            </div>
          </div>
        </div>

        {/* Charts Row 2 - Follow-ups */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Follow-up RAG Status */}
          <div className="bg-card rounded p-6 shadow-ambient">
            <h3 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
              Follow-up Status
              <InfoTooltip title="Follow-up RAG">
                <p className="font-semibold text-foreground mb-2">Follow-up RAG Criteria:</p>
                <div className="space-y-2">
                  <div>
                    <p className="text-destructive font-semibold">RED RED - Critical:</p>
                    <ul className="ml-4 text-xs space-y-1">
                      <li>• No follow-up logged</li>
                      <li>• Overdue: 3+ days (New/Following Up)</li>
                      <li>• Overdue: 5+ days (Interested)</li>
                      <li>• Contact Status: Wrong Number, Declined</li>
                    </ul>
                  </div>
                  <div>
                    <p className="text-accent font-semibold">AMBER AMBER - Monitor:</p>
                    <ul className="ml-4 text-xs space-y-1">
                      <li>• Due soon: 2 days (New/Following Up)</li>
                      <li>• Due soon: 3-4 days (Interested)</li>
                      <li>• Contact Status: No Answer, Busy</li>
                    </ul>
                  </div>
                  <div>
                    <p className="text-success font-semibold">GREEN GREEN - On Track:</p>
                    <ul className="ml-4 text-xs space-y-1">
                      <li>• On track or no follow-up needed</li>
                      <li>• Contact Status: Successful</li>
                    </ul>
                  </div>
                </div>
              </InfoTooltip>
            </h3>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={followUpRagData}
                  cx="50%"
                  cy="50%"
                  innerRadius={72}
                  outerRadius={96}
                  paddingAngle={4}
                  cornerRadius={4}
                  stroke="none"
                  dataKey="value"
                  onClick={(data) => {
                    const name = data.name ?? '';
                    const ragStatus = name.includes('Critical') ? 'RED' : 
                                     name.includes('Monitor') ? 'AMBER' : 'GREEN';
                    showFollowUps(
                      followUpsData?.data?.filter((f) => f.ragStatus === ragStatus) || [],
                      name
                    );
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  {followUpRagData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: tooltipBg, border: `1px solid ${tooltipBorder}`, borderRadius: 4 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-4 flex items-center justify-center gap-4 text-sm">
              {followUpRagData.map((entry) => (
                <div key={entry.name} className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
                  <span className="text-muted-foreground">{entry.name}</span>
                  <span className="font-semibold text-foreground">{entry.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Conversion Funnel */}
          <div className="bg-card rounded p-6 shadow-ambient">
            <h3 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
              Conversion Funnel
              <InfoTooltip title="Conversion Funnel">
                <p className="font-semibold text-foreground mb-2">Conversion Funnel:</p>
                <p className="text-xs mb-2">Shows the progression of souls through the pipeline stages.</p>
                <ul className="ml-4 text-xs space-y-1">
                  <li>• <span className="font-semibold">New:</span> Initial contacts</li>
                  <li>• <span className="font-semibold">Following Up:</span> Active engagement</li>
                  <li>• <span className="font-semibold">Interested:</span> Showing commitment</li>
                  <li>• <span className="font-semibold">Converted:</span> Successfully joined</li>
                </ul>
                <p className="text-xs mt-2 text-muted-foreground">Higher numbers at each stage indicate better retention.</p>
              </InfoTooltip>
            </h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={conversionFunnelData} layout="vertical" margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={axisColor} strokeOpacity={0.15} horizontal={false} />
                <XAxis type="number" stroke={axisColor} tickLine={false} axisLine={false} tick={{ fontSize: 11 }} allowDecimals={false} />
                <YAxis dataKey="stage" type="category" stroke={axisColor} width={110} tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
                <Tooltip cursor={{ fill: axisColor, fillOpacity: 0.06 }} contentStyle={{ backgroundColor: tooltipBg, border: `1px solid ${tooltipBorder}`, borderRadius: 4 }} />
                <Bar 
                  dataKey="count" 
                  fill={COLORS.PURPLE}
                  radius={[0, 4, 4, 0]}
                  maxBarSize={28}
                  onClick={(data) => {
                    const stage = (data as unknown as Record<string, unknown>).stage as string;
                    showSouls(
                      soulsData?.data?.filter((s) => s.status === stage) || [],
                      `${stage} Souls`
                    );
                  }}
                  style={{ cursor: 'pointer' }}
                />
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-4 text-center text-muted-foreground text-sm">
              Click any bar to view souls in that stage
            </div>
          </div>
        </div>

        {/* Stage Assimilation Rates */}
        {analytics?.assimilationRates && Object.keys(analytics.assimilationRates).length > 0 && (
          <div className="bg-card rounded p-6 shadow-ambient">
            <h3 className="text-xl font-semibold text-foreground mb-1 flex items-center gap-2">
              Stage Assimilation Rates
              <InfoTooltip title="Stage Assimilation Rates">
                <p className="font-semibold text-foreground mb-2">Stage Assimilation:</p>
                <p className="text-xs mb-2">
                  Percentage of souls who advanced from one funnel stage to the next.
                  Tells the optimistic story of how people are progressing through our
                  assimilation pipeline from <em>New</em> to <em>Converted</em>.
                </p>
                <p className="text-xs text-muted-foreground mb-2">
                  Formula: souls reaching stage B / souls reaching stage A &times; 100
                </p>
                <p className="text-xs mt-2 text-success">
                  Higher is better &mdash; more souls moving forward.
                </p>
                <p className="text-xs mt-2 text-muted-foreground">
                  Thresholds: &ge;{ASSIMILATION_THRESHOLDS.green}% green &middot; &ge;{ASSIMILATION_THRESHOLDS.amber}% amber &middot; below = red.
                </p>
              </InfoTooltip>
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              How well souls are progressing through each stage of the pipeline.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Object.entries(analytics.assimilationRates).map(([stage, rate]) => {
                const tone =
                  rate >= ASSIMILATION_THRESHOLDS.green
                    ? 'success'
                    : rate >= ASSIMILATION_THRESHOLDS.amber
                      ? 'accent'
                      : 'destructive';
                const toneClasses =
                  tone === 'success'
                    ? 'text-success'
                    : tone === 'accent'
                      ? 'text-accent'
                      : 'text-destructive';
                const barClasses =
                  tone === 'success'
                    ? 'bg-success'
                    : tone === 'accent'
                      ? 'bg-accent'
                      : 'bg-destructive';
                return (
                  <div key={stage} className="rounded border border-border/15 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {stage}
                    </p>
                    <p className={`mt-2 text-3xl font-semibold tracking-tight ${toneClasses}`}>
                      {rate.toFixed(1)}%
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">advanced to next stage</p>
                    <div className="mt-3 h-1.5 w-full overflow-hidden rounded bg-muted">
                      <div
                        className={`h-full ${barClasses}`}
                        style={{ width: `${Math.min(100, Math.max(0, rate))}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Key Metrics Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-card rounded p-6 shadow-ambient">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-muted-foreground text-sm">Response Rate</h4>
              <InfoTooltip title="Response Rate">
                <p className="font-semibold text-foreground mb-2">Response Rate:</p>
                <p className="text-xs mb-2">Percentage of souls that have been successfully converted out of the total souls in the pipeline.</p>
                <p className="text-xs text-muted-foreground">Formula: (Converted Souls / Total Souls) × 100</p>
                <p className="text-xs mt-2 text-success">Higher is better - indicates effective outreach and follow-up.</p>
              </InfoTooltip>
            </div>
            <p className="text-3xl font-semibold text-foreground tracking-tight">{analytics?.overview?.conversionRate?.toFixed(1) || 0}%</p>
            <p className="text-muted-foreground text-xs mt-1">Conversion rate</p>
          </div>

          <div className="bg-card rounded p-6 shadow-ambient">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-muted-foreground text-sm">Active Follow-ups</h4>
              <InfoTooltip title="Active Follow-ups">
                <p className="font-semibold text-foreground mb-2">Active Follow-ups:</p>
                <p className="text-xs mb-2">Number of souls currently in active follow-up stages (New, Following Up, or Interested).</p>
                <p className="text-xs text-muted-foreground">These souls require ongoing engagement and attention.</p>
                <p className="text-xs mt-2 text-accent">Monitor regularly to ensure timely follow-ups.</p>
              </InfoTooltip>
            </div>
            <p className="text-3xl font-semibold text-foreground tracking-tight">{analytics?.overview?.activeFollowUps || 0}</p>
            <p className="text-muted-foreground text-xs mt-1">In progress</p>
          </div>

          <div className="bg-card rounded p-6 shadow-ambient">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-muted-foreground text-sm">Avg Days to Convert</h4>
              <InfoTooltip title="Avg Days to Convert">
                <p className="font-semibold text-foreground mb-2">Average Days to Convert:</p>
                <p className="text-xs mb-2">Average number of days from first contact to successful conversion.</p>
                <p className="text-xs text-muted-foreground">Calculated from souls who have been converted.</p>
                <p className="text-xs mt-2 text-primary">Lower is better - indicates efficient conversion process.</p>
              </InfoTooltip>
            </div>
            <p className="text-3xl font-semibold text-foreground tracking-tight">{analytics?.overview?.avgDaysToConversion || 0}</p>
            <p className="text-muted-foreground text-xs mt-1">Days average</p>
          </div>
        </div>
        {/* Recent Follow-up Activity */}
        <div className="bg-card rounded shadow-ambient overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-border/15">
            <h3 className="text-base font-semibold text-foreground tracking-wide">Recent Follow-up Activity</h3>
            <button
              type="button"
              onClick={() => router.push('/souls')}
              className="text-xs font-semibold text-primary tracking-wider uppercase hover:text-primary/80 transition-colors"
            >
              View All
            </button>
          </div>
          {recentFollowUps.length === 0 ? (
            <p className="text-sm text-muted-foreground py-12 text-center">No follow-up activity in this date range.</p>
          ) : (
            <div>
              {/* Column Headers */}
              <div className="grid grid-cols-[2fr_1fr_1.25fr_1fr_1fr] items-center gap-4 px-6 py-3 bg-muted/30 border-b border-border/10">
                <span className="text-[11px] font-semibold text-muted-foreground tracking-[0.12em] uppercase">Soul Name</span>
                <span className="text-[11px] font-semibold text-muted-foreground tracking-[0.12em] uppercase">Status</span>
                <span className="text-[11px] font-semibold text-muted-foreground tracking-[0.12em] uppercase">Assignee</span>
                <span className="text-[11px] font-semibold text-muted-foreground tracking-[0.12em] uppercase">Method</span>
                <span className="text-[11px] font-semibold text-muted-foreground tracking-[0.12em] uppercase text-right">Last Action</span>
              </div>
              {/* Rows */}
              <div className="divide-y divide-border/10">
                {recentFollowUps.map((followUp) => {
                  const statusLabel =
                    followUp.ragStatus === 'RED' ? 'Critical' :
                    followUp.ragStatus === 'AMBER' ? 'Monitor' : 'On Track';
                  const statusClasses =
                    followUp.ragStatus === 'RED' ? 'bg-destructive/10 text-destructive' :
                    followUp.ragStatus === 'AMBER' ? 'bg-accent/15 text-accent' :
                    'bg-success/10 text-success';
                  const assigneeInitials = followUp.memberName
                    ? followUp.memberName
                        .split(' ')
                        .filter(Boolean)
                        .slice(0, 2)
                        .map((p) => p[0]?.toUpperCase() ?? '')
                        .join('') || '?'
                    : '?';
                  return (
                    <button
                      key={followUp.id}
                      type="button"
                      onClick={() => router.push(`/souls/${followUp.soulId}`)}
                      className="w-full grid grid-cols-[2fr_1fr_1.25fr_1fr_1fr] items-center gap-4 px-6 py-4 text-left hover:bg-muted/30 transition-colors"
                    >
                      {/* Soul Name */}
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{followUp.soulName}</p>
                        <p className="text-xs text-muted-foreground truncate">{followUp.contactStatus}</p>
                      </div>
                      {/* Status pill */}
                      <div>
                        <span className={`inline-flex items-center rounded px-2.5 py-1 text-[11px] font-semibold ${statusClasses}`}>
                          {statusLabel}
                        </span>
                      </div>
                      {/* Assignee */}
                      <div className="flex items-center gap-2 min-w-0">
                        {followUp.memberName ? (
                          <>
                            <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary/15 text-[9px] font-bold text-primary">
                              {assigneeInitials}
                            </span>
                            <span className="text-sm text-foreground truncate">{followUp.memberName}</span>
                          </>
                        ) : (
                          <span className="text-sm text-muted-foreground italic">Unassigned</span>
                        )}
                      </div>
                      {/* Method */}
                      <div>
                        <span className="text-sm text-muted-foreground">{followUp.contactMethod ?? '—'}</span>
                      </div>
                      {/* Last Action */}
                      <div className="text-right">
                        <span className="text-sm text-muted-foreground whitespace-nowrap">
                          {formatDistanceToNow(new Date(followUp.followUpDate), { addSuffix: true })}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
        {/* Instructions Panel */}
        <div className="bg-muted rounded p-6">
          <h3 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            Quick Guide
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-destructive font-semibold mb-2">Critical (Red)</p>
              <p className="text-muted-foreground">These souls need immediate attention! No follow-up logged or overdue contacts. Click the red card above to see the list.</p>
            </div>
            <div>
              <p className="text-accent font-semibold mb-2">Monitor (Amber)</p>
              <p className="text-muted-foreground">Follow-up due soon. Keep an eye on these souls and schedule contact within 1-2 days.</p>
            </div>
            <div>
              <p className="text-success font-semibold mb-2">On Track (Green)</p>
              <p className="text-muted-foreground">Recent contact made or no follow-up needed. These souls are on track!</p>
            </div>
          </div>
        </div>
      </div>

      {/* Souls List Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto bg-card border-border/15">
          <DialogHeader>
            <DialogTitle className="text-2xl text-foreground">{dialogTitle}</DialogTitle>
            <p className="text-muted-foreground mt-2">Total: {selectedSouls.length} souls</p>
          </DialogHeader>
          <div className="space-y-3 mt-4">
            {selectedSouls.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No souls in this category</p>
            ) : (
              selectedSouls.map((soul) => (
                <div
                  key={soul.id}
                  className="bg-muted rounded p-4 hover:bg-muted/80 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="text-lg font-semibold text-foreground">
                          {soul.firstName} {soul.lastName}
                        </h4>
                        <div className={`px-3 py-1 rounded text-xs font-semibold ${
                          soul.ragStatus === 'RED' ? 'bg-destructive/10 text-destructive' :
                          soul.ragStatus === 'AMBER' ? 'bg-accent/10 text-accent' :
                          'bg-success/10 text-success'
                        }`}>
                          {soul.ragStatus === 'RED' ? <AlertCircle className="w-3 h-3 inline" /> : soul.ragStatus === 'AMBER' ? <AlertTriangle className="w-3 h-3 inline" /> : <CheckCircle className="w-3 h-3 inline" />} {soul.ragStatus}
                        </div>
                      </div>
                      
                      {/* Branch/Outreach Info */}
                      {soul.outreachName && (
                        <div className="mb-2 pb-2 border-b border-border">
                          <p className="text-muted-foreground text-sm">
                            <span className="text-primary font-medium">{soul.outreachName}</span>
                          </p>
                        </div>
                      )}
                      
                      <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                        <p className="text-muted-foreground">
                          <span className="text-foreground">{soul.phone || 'No phone'}</span>
                        </p>
                        <p className="text-muted-foreground">
                          <span className="text-foreground">{soul.email || 'No email'}</span>
                        </p>
                        <p className="text-muted-foreground">
                          Status: <span className="text-foreground font-medium">{soul.status}</span>
                        </p>
                        <p className="text-muted-foreground">
                          Assigned: <span className="text-foreground">{soul.assignedMemberName || 'Unassigned'}</span>
                        </p>
                        {soul.assignedMemberBranchName && (
                          <p className="text-muted-foreground col-span-2">
                            Branch: <span className="text-primary font-medium">{soul.assignedMemberBranchName}</span>
                          </p>
                        )}
                      </div>
                      
                      {soul.lastFollowUpDate && (
                        <p className="text-muted-foreground text-xs mt-2">
                          Last contact: {formatDistanceToNow(new Date(soul.lastFollowUpDate), { addSuffix: true })}
                        </p>
                      )}
                      
                      {soul.ragReason && (
                        <div className="mt-2 p-2 bg-muted rounded border-l-2 border-muted-foreground">
                          <p className="text-muted-foreground text-xs italic">
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
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto bg-card border-border/15">
          <DialogHeader>
            <DialogTitle className="text-2xl text-foreground">{dialogTitle}</DialogTitle>
            <p className="text-muted-foreground mt-2">Total: {selectedFollowUps.length} follow-ups</p>
          </DialogHeader>
          <div className="space-y-3 mt-4">
            {selectedFollowUps.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No follow-ups in this category</p>
            ) : (
              selectedFollowUps.map((followUp) => (
                <div
                  key={followUp.id}
                  className="bg-muted rounded p-4 hover:bg-muted/80 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="text-lg font-semibold text-foreground">
                          {followUp.soulName}
                        </h4>
                        <div className={`px-3 py-1 rounded text-xs font-semibold ${
                          followUp.ragStatus === 'RED' ? 'bg-destructive/10 text-destructive' :
                          followUp.ragStatus === 'AMBER' ? 'bg-accent/10 text-accent' :
                          'bg-success/10 text-success'
                        }`}>
                          {followUp.ragStatus === 'RED' ? <AlertCircle className="w-3 h-3 inline" /> : followUp.ragStatus === 'AMBER' ? <AlertTriangle className="w-3 h-3 inline" /> : <CheckCircle className="w-3 h-3 inline" />} {followUp.ragStatus}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                        <p className="text-muted-foreground">
                          Contact Status: <span className="text-foreground font-medium">{followUp.contactStatus}</span>
                        </p>
                        <p className="text-muted-foreground">
                          Follow-up by: <span className="text-foreground">{followUp.memberName || 'Unknown'}</span>
                        </p>
                        <p className="text-muted-foreground col-span-2 flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Follow-up Date: <span className="text-foreground">{formatDistanceToNow(new Date(followUp.followUpDate), { addSuffix: true })}</span>
                        </p>
                      </div>
                      
                      {followUp.ragReason && (
                        <div className="mt-2 p-2 bg-muted rounded border-l-2 border-muted-foreground">
                          <p className="text-muted-foreground text-xs italic">
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
