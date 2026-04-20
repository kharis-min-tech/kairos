'use client';

import { useState, useEffect } from 'react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { AlertCircle, TrendingUp, Users, Phone, CheckCircle, Clock, RefreshCw, Info, AlertTriangle, ClipboardList, Calendar } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@kairos/ui';
import { formatDistanceToNow } from 'date-fns';
import type { DashboardOverview, DashboardAnalytics, FollowUpOverviewData, PaginatedDashboardData, DashboardSoul, DashboardFollowUp } from './types';

interface UnifiedDashboardProps {
  overview: DashboardOverview | null;
  analytics: DashboardAnalytics | null;
  followUpOverview: FollowUpOverviewData | null;
  soulsData: PaginatedDashboardData<DashboardSoul> | null;
  followUpsData: PaginatedDashboardData<DashboardFollowUp> | null;
  onRefresh: () => void;
}

const COLORS = {
  RED: '#be123c',
  AMBER: '#b45309',
  GREEN: '#047857',
  PURPLE: '#5D3FD3',
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
        className="ml-2 text-muted-foreground hover:text-primary transition-colors"
        aria-label={`Information about ${title}`}
      >
        <Info className="h-4 w-4" />
      </button>
      {isOpen && (
        <div className="absolute z-[100] right-0 bottom-full mb-2 w-80 p-4 bg-card border border-border/15 rounded-lg shadow-ambient text-sm">
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
}: UnifiedDashboardProps) {
  const [selectedSouls, setSelectedSouls] = useState<DashboardSoul[]>([]);
  const [selectedFollowUps, setSelectedFollowUps] = useState<DashboardFollowUp[]>([]);
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

  const showSouls = (souls: DashboardSoul[], title: string) => {
    console.log('showSouls called with:', { souls, title, soulsLength: souls?.length });
    setSelectedSouls(souls || []);
    setDialogTitle(title);
    setDialogOpen(true);
  };

  const showFollowUps = (followUps: DashboardFollowUp[], title: string) => {
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
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-[1800px] mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-semibold text-primary tracking-tight">
              Souls Dashboard
            </h1>
            <p className="text-muted-foreground mt-2">Monitor and manage your souls pipeline at a glance</p>
          </div>
          <button
            onClick={onRefresh}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#451ebb] to-[#5d3fd3] hover:from-[#3a17a0] hover:to-[#4f35b8] text-white rounded-lg transition-colors shadow-md"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
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
            onClick={() => showSouls(soulsData?.data?.filter((s) => s.ragStatus === 'RED') || [], 'RED Critical Souls - Need Immediate Attention')}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm">RED Critical</p>
                <p className="text-4xl font-semibold text-foreground mt-2 tracking-tight">{overview?.ragCounts?.RED || 0}</p>
                <p className="text-muted-foreground text-xs mt-1">Click to view</p>
              </div>
              <AlertCircle className="h-12 w-12 text-destructive/70" />
            </div>
          </div>

          <div
            className="bg-card rounded p-6 shadow-ambient cursor-pointer hover:shadow-ambient-lg transition-shadow"
            onClick={() => showSouls(soulsData?.data?.filter((s) => s.ragStatus === 'AMBER') || [], 'AMBER Monitor - Needs Attention Soon')}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm">AMBER Monitor</p>
                <p className="text-4xl font-semibold text-foreground mt-2 tracking-tight">{overview?.ragCounts?.AMBER || 0}</p>
                <p className="text-muted-foreground text-xs mt-1">Click to view</p>
              </div>
              <Clock className="h-12 w-12 text-accent/70" />
            </div>
          </div>

          <div
            className="bg-card rounded p-6 shadow-ambient cursor-pointer hover:shadow-ambient-lg transition-shadow"
            onClick={() => showSouls(soulsData?.data?.filter((s) => s.ragStatus === 'GREEN') || [], 'GREEN All Good - On Track')}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm">GREEN All Good</p>
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
              <Users className="h-5 w-5 text-primary" />
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
                    <p className="text-success font-semibold">GREEN GREEN - All Good:</p>
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
            <div className="mt-4 text-center text-muted-foreground text-sm">
              Total: {overview?.totalSouls || 0} souls in pipeline
            </div>
          </div>

          {/* Status Breakdown Bar Chart */}
          <div className="bg-card rounded p-6 shadow-ambient">
            <h3 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
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
              <Phone className="h-5 w-5 text-primary" />
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
                    <p className="text-success font-semibold">GREEN GREEN - All Good:</p>
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
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-4 text-center text-muted-foreground text-sm">
              Total: {followUpOverview?.totalFollowUps || 0} follow-ups (Click chart to view details)
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
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={conversionFunnelData} layout="vertical">
                <XAxis type="number" stroke={axisColor} />
                <YAxis dataKey="stage" type="category" stroke={axisColor} width={120} />
                <Tooltip contentStyle={{ backgroundColor: tooltipBg, border: `1px solid ${tooltipBorder}` }} />
                <Bar 
                  dataKey="count" 
                  fill={COLORS.PURPLE}
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

        {/* Instructions Panel */}
        <div className="bg-muted rounded p-6">
          <h3 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            Quick Guide
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-destructive font-semibold mb-2">RED Critical (Red)</p>
              <p className="text-muted-foreground">These souls need immediate attention! No follow-up logged or overdue contacts. Click the red card above to see the list.</p>
            </div>
            <div>
              <p className="text-accent font-semibold mb-2">AMBER Monitor (Amber)</p>
              <p className="text-muted-foreground">Follow-up due soon. Keep an eye on these souls and schedule contact within 1-2 days.</p>
            </div>
            <div>
              <p className="text-success font-semibold mb-2">GREEN All Good (Green)</p>
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
