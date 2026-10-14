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
import { DateSelect } from '@/components/date-select';
import { formatShortDate } from '@kairos/core';
import type { DashboardOverview, DashboardAnalytics, FollowUpOverviewData, PaginatedDashboardData, DashboardSoul, DashboardFollowUp } from './types';
import { useTranslation } from 'react-i18next';

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

// (DateSelect from @/components/date-select replaces the inline DatePill.)

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
}: UnifiedDashboardProps) {  const { t } = useTranslation(['common']);

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
            <h1 className="text-4xl font-semibold text-primary tracking-tight">{t('common:soulsDashboard')}</h1>
            <p className="text-muted-foreground mt-2">{t('common:soulManagementAndAssimilationInsights')}</p>
          </div>
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#451ebb] to-[#5d3fd3] hover:from-[#3a17a0] hover:to-[#4f35b8] text-white rounded transition-colors shadow-md disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />{t('common:refresh')}</button>
        </div>

        {/* Date Filter Bar */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex items-center gap-1 rounded bg-[#f0f0f3] p-1.5 dark:bg-white/[0.06]">
            {([
              { key: 'week', label: t('common:week') },
              { key: '1M', label: '1M' },
              { key: '3M', label: '3M' },
              { key: '6M', label: '6M' },
              { key: 'custom', label: t('common:custom') },
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
                placeholder={t('common:startDate')}
                maxDate={customTo || formatDateInput(new Date())}
                onChange={(v) => applyCustomRange(v, customTo)}
              />
              <span className="text-sm font-medium text-muted-foreground">{t('common:to')}</span>
              <DateSelect
                variant="pill"
                value={customTo}
                placeholder={t('common:endDate')}
                minDate={customFrom}
                maxDate={formatDateInput(new Date())}
                onChange={(v) => applyCustomRange(customFrom, v)}
              />
            </div>
          )}
          {dateFrom && dateTo && (
            <p className="text-xs text-muted-foreground">
              {t('common:showingDataFromTo', {
                from: formatShortDate(dateFrom),
                to: formatShortDate(dateTo),
              })}
            </p>
          )}
          {onProgramChange && (
            <div className="ml-auto flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('common:program')}</span>
              <div className="min-w-[220px]">
                <CustomSelect
                  value={programId ?? ''}
                  onValueChange={(value) => onProgramChange(value === '' ? null : value)}
                  options={[
                    { value: '', label: t('common:allPrograms') },
                    ...programs.map((p) => ({ value: p.id, label: p.programName })),
                  ]}
                  placeholder={t('common:allPrograms')}
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
                <p className="text-muted-foreground text-sm">{t('common:totalSouls')}</p>
                <p className="text-4xl font-semibold text-foreground mt-2 tracking-tight">{overview?.totalSouls || 0}</p>
                <p className="text-muted-foreground text-xs mt-1">{t('common:clickToViewAll')}</p>
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
                <p className="text-muted-foreground text-sm">{t('common:critical')}</p>
                <p className="text-4xl font-semibold text-foreground mt-2 tracking-tight">{overview?.ragCounts?.RED || 0}</p>
                <p className="text-muted-foreground text-xs mt-1">{t('common:clickToView')}</p>
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
                <p className="text-muted-foreground text-sm">{t('common:monitor')}</p>
                <p className="text-4xl font-semibold text-foreground mt-2 tracking-tight">{overview?.ragCounts?.AMBER || 0}</p>
                <p className="text-muted-foreground text-xs mt-1">{t('common:clickToView')}</p>
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
                <p className="text-muted-foreground text-sm">{t('common:onTrack')}</p>
                <p className="text-4xl font-semibold text-foreground mt-2 tracking-tight">{overview?.ragCounts?.GREEN || 0}</p>
                <p className="text-muted-foreground text-xs mt-1">{t('common:clickToView')}</p>
              </div>
              <CheckCircle className="h-12 w-12 text-success/70" />
            </div>
          </div>
        </div>

        {/* Charts Row 1 - Souls Pipeline */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Souls RAG Status Pie Chart */}
          <div className="bg-card rounded p-6 shadow-ambient">
            <h3 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">{t('common:soulsPipelineStatus')}<InfoTooltip title={t('common:soulsPipelineRag')}>
                <p className="font-semibold text-foreground mb-2">{t('common:soulsPipelineRagCriteria')}</p>
                <div className="space-y-2">
                  <div>
                    <p className="text-destructive font-semibold">{t('common:redRedCritical')}</p>
                    <ul className="ml-4 text-xs space-y-1">
                      <li>{t('common:ragNoFollowUpYet')}</li>
                      <li>{t('common:ragNewFollowing3Days')}</li>
                      <li>{t('common:ragInterested5Days')}</li>
                    </ul>
                  </div>
                  <div>
                    <p className="text-accent font-semibold">{t('common:amberAmberMonitor')}</p>
                    <ul className="ml-4 text-xs space-y-1">
                      <li>{t('common:ragNewFollowing2Days')}</li>
                      <li>{t('common:ragInterested34Days')}</li>
                    </ul>
                  </div>
                  <div>
                    <p className="text-success font-semibold">{t('common:greenGreenOnTrack')}</p>
                    <ul className="ml-4 text-xs space-y-1">
                      <li>{t('common:ragNewFollowingUnder2')}</li>
                      <li>{t('common:ragInterestedUnder3')}</li>
                      <li>{t('common:ragConvertedNotInterestedLost')}</li>
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
            <h3 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">{t('common:soulsByStatus')}<InfoTooltip title={t('common:soulStatus')}>
                <p className="font-semibold text-foreground mb-2">{t('common:soulStatusDefinitions')}</p>
                <ul className="ml-4 text-xs space-y-1">
                  <li>• <span className="font-semibold">{t('common:new')}</span>{t('common:recentlyContactedInitialStage')}</li>
                  <li>• <span className="font-semibold">{t('common:followingUp')}</span>{t('common:activeEngagementInProgress')}</li>
                  <li>• <span className="font-semibold">{t('common:interested')}</span>{t('common:showingInterestInJoining')}</li>
                  <li>• <span className="font-semibold">{t('common:converted')}</span>{t('common:successfullyJoinedTheChurch')}</li>
                  <li>• <span className="font-semibold">{t('common:notInterested')}</span>{t('common:declinedToJoin')}</li>
                  <li>• <span className="font-semibold">{t('common:lostContact')}</span>{t('common:unableToReach')}</li>
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
            <div className="mt-4 text-center text-muted-foreground text-sm">{t('common:clickAnyBarToViewSouls')}</div>
          </div>
        </div>

        {/* Charts Row 2 - Follow-ups */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Follow-up RAG Status */}
          <div className="bg-card rounded p-6 shadow-ambient">
            <h3 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">{t('common:followUpStatus')}<InfoTooltip title={t('common:followUpRag')}>
                <p className="font-semibold text-foreground mb-2">{t('common:followUpRagCriteria')}</p>
                <div className="space-y-2">
                  <div>
                    <p className="text-destructive font-semibold">{t('common:redRedCritical')}</p>
                    <ul className="ml-4 text-xs space-y-1">
                      <li>{t('common:fuRagNoFollowUpLogged')}</li>
                      <li>{t('common:fuRagOverdue3Days')}</li>
                      <li>{t('common:fuRagOverdue5Days')}</li>
                      <li>{t('common:fuRagWrongNumberDeclined')}</li>
                    </ul>
                  </div>
                  <div>
                    <p className="text-accent font-semibold">{t('common:amberAmberMonitor')}</p>
                    <ul className="ml-4 text-xs space-y-1">
                      <li>{t('common:fuRagDueSoon2Days')}</li>
                      <li>{t('common:fuRagDueSoon34Days')}</li>
                      <li>{t('common:fuRagNoAnswerBusy')}</li>
                    </ul>
                  </div>
                  <div>
                    <p className="text-success font-semibold">{t('common:greenGreenOnTrack')}</p>
                    <ul className="ml-4 text-xs space-y-1">
                      <li>{t('common:fuRagOnTrackOrNotNeeded')}</li>
                      <li>{t('common:fuRagSuccessful')}</li>
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
            <h3 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">{t('common:conversionFunnel')}<InfoTooltip title={t('common:conversionFunnel')}>
                <p className="font-semibold text-foreground mb-2">{t('common:conversionFunnel2')}</p>
                <p className="text-xs mb-2">{t('common:showsTheProgressionOfSoulsThrough')}</p>
                <ul className="ml-4 text-xs space-y-1">
                  <li>• <span className="font-semibold">{t('common:new')}</span>{t('common:initialContacts')}</li>
                  <li>• <span className="font-semibold">{t('common:followingUp')}</span>{t('common:activeEngagement')}</li>
                  <li>• <span className="font-semibold">{t('common:interested')}</span>{t('common:showingCommitment')}</li>
                  <li>• <span className="font-semibold">{t('common:converted')}</span>{t('common:successfullyJoined')}</li>
                </ul>
                <p className="text-xs mt-2 text-muted-foreground">{t('common:higherNumbersAtEachStageIndicate')}</p>
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
            <div className="mt-4 text-center text-muted-foreground text-sm">{t('common:clickAnyBarToViewSouls2')}</div>
          </div>
        </div>

        {/* Stage Assimilation Rates */}
        {analytics?.assimilationRates && Object.keys(analytics.assimilationRates).length > 0 && (
          <div className="bg-card rounded p-6 shadow-ambient">
            <h3 className="text-xl font-semibold text-foreground mb-1 flex items-center gap-2">{t('common:stageAssimilationRates')}<InfoTooltip title={t('common:stageAssimilationRates')}>
                <p className="font-semibold text-foreground mb-2">{t('common:stageAssimilation')}</p>
                <p className="text-xs mb-2">{t('common:percentageOfSoulsWhoAdvancedFrom')}<em>{t('common:new2')}</em>{t('common:to')}<em>{t('common:converted2')}</em>.
                </p>
                <p className="text-xs text-muted-foreground mb-2">
                  {t('common:assimilationFormula')}
                </p>
                <p className="text-xs mt-2 text-success">{t('common:higherIsBetterMoreSoulsMoving')}</p>
                <p className="text-xs mt-2 text-muted-foreground">
                  {t('common:assimilationThresholds', {
                    green: ASSIMILATION_THRESHOLDS.green,
                    amber: ASSIMILATION_THRESHOLDS.amber,
                  })}
                </p>
              </InfoTooltip>
            </h3>
            <p className="text-sm text-muted-foreground mb-4">{t('common:howWellSoulsAreProgressingThrough')}</p>
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
                    <p className="mt-1 text-xs text-muted-foreground">{t('common:advancedToNextStage')}</p>
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
              <h4 className="text-muted-foreground text-sm">{t('common:responseRate')}</h4>
              <InfoTooltip title={t('common:responseRate')}>
                <p className="font-semibold text-foreground mb-2">{t('common:responseRate2')}</p>
                <p className="text-xs mb-2">{t('common:percentageOfSoulsThatHaveBeen')}</p>
                <p className="text-xs text-muted-foreground">{t('common:formulaConvertedSoulsTotalSouls100')}</p>
                <p className="text-xs mt-2 text-success">{t('common:higherIsBetterIndicatesEffectiveOutreach')}</p>
              </InfoTooltip>
            </div>
            <p className="text-3xl font-semibold text-foreground tracking-tight">{analytics?.overview?.conversionRate?.toFixed(1) || 0}%</p>
            <p className="text-muted-foreground text-xs mt-1">{t('common:conversionRate')}</p>
          </div>

          <div className="bg-card rounded p-6 shadow-ambient">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-muted-foreground text-sm">{t('common:activeFollowUps')}</h4>
              <InfoTooltip title={t('common:activeFollowUps')}>
                <p className="font-semibold text-foreground mb-2">{t('common:activeFollowUps2')}</p>
                <p className="text-xs mb-2">{t('common:numberSoulsCurrentlyActiveFollowUp')}</p>
                <p className="text-xs text-muted-foreground">{t('common:theseSoulsRequireOngoingEngagementAnd')}</p>
                <p className="text-xs mt-2 text-accent">{t('common:monitorRegularlyToEnsureTimelyFollow')}</p>
              </InfoTooltip>
            </div>
            <p className="text-3xl font-semibold text-foreground tracking-tight">{analytics?.overview?.activeFollowUps || 0}</p>
            <p className="text-muted-foreground text-xs mt-1">{t('common:inProgress')}</p>
          </div>

          <div className="bg-card rounded p-6 shadow-ambient">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-muted-foreground text-sm">{t('common:avgDaysToConvert')}</h4>
              <InfoTooltip title={t('common:avgDaysToConvert')}>
                <p className="font-semibold text-foreground mb-2">{t('common:averageDaysToConvert')}</p>
                <p className="text-xs mb-2">{t('common:averageNumberOfDaysFromFirst')}</p>
                <p className="text-xs text-muted-foreground">{t('common:calculatedFromSoulsWhoHaveBeen')}</p>
                <p className="text-xs mt-2 text-primary">{t('common:lowerIsBetterIndicatesEfficientConversion')}</p>
              </InfoTooltip>
            </div>
            <p className="text-3xl font-semibold text-foreground tracking-tight">{analytics?.overview?.avgDaysToConversion || 0}</p>
            <p className="text-muted-foreground text-xs mt-1">{t('common:daysAverage')}</p>
          </div>
        </div>
        {/* Recent Follow-up Activity */}
        <div className="bg-card rounded shadow-ambient overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-border/15">
            <h3 className="text-base font-semibold text-foreground tracking-wide">{t('common:recentFollowUpActivity')}</h3>
            <button
              type="button"
              onClick={() => router.push('/souls')}
              className="text-xs font-semibold text-primary tracking-wider uppercase hover:text-primary/80 transition-colors"
            >{t('common:viewAll')}</button>
          </div>
          {recentFollowUps.length === 0 ? (
            <p className="text-sm text-muted-foreground py-12 text-center">{t('common:noFollowUpActivityInThis')}</p>
          ) : (
            <div>
              {/* Column Headers */}
              <div className="grid grid-cols-[2fr_1fr_1.25fr_1fr_1fr] items-center gap-4 px-6 py-3 bg-muted/30 border-b border-border/10">
                <span className="text-[11px] font-semibold text-muted-foreground tracking-[0.12em] uppercase">{t('common:soulName')}</span>
                <span className="text-[11px] font-semibold text-muted-foreground tracking-[0.12em] uppercase">{t('common:status')}</span>
                <span className="text-[11px] font-semibold text-muted-foreground tracking-[0.12em] uppercase">{t('common:assignee')}</span>
                <span className="text-[11px] font-semibold text-muted-foreground tracking-[0.12em] uppercase">{t('common:method')}</span>
                <span className="text-[11px] font-semibold text-muted-foreground tracking-[0.12em] uppercase text-right">{t('common:lastAction')}</span>
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
                          <span className="text-sm text-muted-foreground italic">{t('common:unassigned')}</span>
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
            <ClipboardList className="h-5 w-5" />{t('common:quickGuide')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-destructive font-semibold mb-2">{t('common:criticalRed')}</p>
              <p className="text-muted-foreground">{t('common:theseSoulsNeedImmediateAttentionNo')}</p>
            </div>
            <div>
              <p className="text-accent font-semibold mb-2">{t('common:monitorAmber')}</p>
              <p className="text-muted-foreground">{t('common:followUpDueSoonKeepAn')}</p>
            </div>
            <div>
              <p className="text-success font-semibold mb-2">{t('common:onTrackGreen')}</p>
              <p className="text-muted-foreground">{t('common:recentContactMadeOrNoFollow')}</p>
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
              <p className="text-muted-foreground text-center py-8">{t('common:noSoulsInThisCategory')}</p>
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
                        <p className="text-muted-foreground">{t('common:status2')}<span className="text-foreground font-medium">{soul.status}</span>
                        </p>
                        <p className="text-muted-foreground">{t('common:assigned')}<span className="text-foreground">{soul.assignedMemberName || 'Unassigned'}</span>
                        </p>
                        {soul.assignedMemberBranchName && (
                          <p className="text-muted-foreground col-span-2">{t('common:branch')}<span className="text-primary font-medium">{soul.assignedMemberBranchName}</span>
                          </p>
                        )}
                      </div>
                      
                      {soul.lastFollowUpDate && (
                        <p className="text-muted-foreground text-xs mt-2">
                          {t('common:lastContactWhen', {
                            when: formatDistanceToNow(new Date(soul.lastFollowUpDate), { addSuffix: true }),
                          })}
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
              <p className="text-muted-foreground text-center py-8">{t('common:noFollowUpsInThisCategory')}</p>
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
                        <p className="text-muted-foreground">{t('common:contactStatus')}<span className="text-foreground font-medium">{followUp.contactStatus}</span>
                        </p>
                        <p className="text-muted-foreground">{t('common:followUpBy')}<span className="text-foreground">{followUp.memberName || 'Unknown'}</span>
                        </p>
                        <p className="text-muted-foreground col-span-2 flex items-center gap-1">
                          <Calendar className="h-3 w-3" />{t('common:followUpDate')}<span className="text-foreground">{formatDistanceToNow(new Date(followUp.followUpDate), { addSuffix: true })}</span>
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
