'use client';

import { useState } from 'react';
import { Card, Dialog, DialogContent, DialogHeader, DialogTitle } from '@kairos/ui';
import { AlertCircle, AlertTriangle, CheckCircle, TrendingUp, Users, Target, Phone, Mail, User, Calendar } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { formatShortDate, formatShortDateTime } from '@/lib/date-format';
import type { DashboardOverview, DashboardAnalytics, FollowUpOverviewData, PaginatedDashboardData, DashboardSoul, DashboardFollowUp } from './types';

interface OperationalDashboardProps {
  overview: DashboardOverview | null;
  analytics: DashboardAnalytics | null;
  followUpOverview: FollowUpOverviewData | null;
  soulsData: PaginatedDashboardData<DashboardSoul> | null;
  followUpsData: PaginatedDashboardData<DashboardFollowUp> | null;
}

const RAG_COLORS = {
  RED: '#E11D48',
  AMBER: '#D97706',
  GREEN: '#059669',
};

export function OperationalDashboard({ overview, analytics, followUpOverview, soulsData, followUpsData }: OperationalDashboardProps) {
  const [selectedRAG, setSelectedRAG] = useState<'RED' | 'AMBER' | 'GREEN' | null>(null);
  const [selectedSoul, setSelectedSoul] = useState<DashboardSoul | null>(null);
  const [selectedFollowUpRAG, setSelectedFollowUpRAG] = useState<'RED' | 'AMBER' | 'GREEN' | null>(null);
  const [selectedFollowUp, setSelectedFollowUp] = useState<DashboardFollowUp | null>(null);

  // Filter souls by RAG status
  const filteredSouls = selectedRAG && soulsData?.data
    ? soulsData.data.filter((soul) => soul.ragStatus === selectedRAG)
    : [];

  // Filter follow-ups by RAG status
  const filteredFollowUps = selectedFollowUpRAG && followUpsData?.data
    ? followUpsData.data.filter((fu) => fu.ragStatus === selectedFollowUpRAG)
    : [];

  // Prepare RAG status data for bar chart
  const ragData = [
    {
      name: 'Critical',
      count: overview?.ragCounts?.RED || 0,
      fill: RAG_COLORS.RED,
    },
    {
      name: 'Monitor',
      count: overview?.ragCounts?.AMBER || 0,
      fill: RAG_COLORS.AMBER,
    },
    {
      name: 'On Track',
      count: overview?.ragCounts?.GREEN || 0,
      fill: RAG_COLORS.GREEN,
    },
  ];

  // Prepare status distribution for pie chart
  const statusData = Object.entries(analytics?.statusDistribution || {}).map(([name, value]) => ({
    name,
    value: value as number,
  }));

  const COLORS = ['#5D3FD3', '#f8b537', '#059669', '#E11D48', '#3B82F6', '#8B5CF6'];

  // Prepare RAG by status data
  const ragByStatusData = Object.entries(analytics?.ragByStatus || {}).map(([status, counts]: [string, unknown]) => {
    const c = counts as Record<string, number>;
    return {
      status,
      RED: c.RED || 0,
      AMBER: c.AMBER || 0,
      GREEN: c.GREEN || 0,
    };
  });

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-purple-900/50 to-purple-800/50 border-purple-500/30 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-purple-300">Total Souls</p>
              <p className="text-4xl font-bold text-white mt-2">{overview?.totalSouls || 0}</p>
            </div>
            <Users className="h-12 w-12 text-purple-400" />
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-rose-900/50 to-rose-800/50 border-rose-500/30 p-6 animate-pulse">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-rose-300">Critical</p>
              <p className="text-4xl font-bold text-white mt-2">{overview?.ragCounts?.RED || 0}</p>
            </div>
            <AlertCircle className="h-12 w-12 text-rose-400" />
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-amber-900/50 to-amber-800/50 border-amber-500/30 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-amber-300">Monitor</p>
              <p className="text-4xl font-bold text-white mt-2">{overview?.ragCounts?.AMBER || 0}</p>
            </div>
            <AlertTriangle className="h-12 w-12 text-amber-400" />
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-900/50 to-emerald-800/50 border-emerald-500/30 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-emerald-300">On Track</p>
              <p className="text-4xl font-bold text-white mt-2">{overview?.ragCounts?.GREEN || 0}</p>
            </div>
            <CheckCircle className="h-12 w-12 text-emerald-400" />
          </div>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* RAG Status Bar Chart */}
        <Card className="bg-slate-900/50 border-slate-700 p-6">
          <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <Target className="h-5 w-5 text-purple-400" />
            RAG Status Overview
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={ragData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="name" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1e293b',
                  border: '1px solid #475569',
                  borderRadius: '8px',
                  color: '#fff',
                }}
              />
              <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                {ragData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Status Distribution Pie Chart */}
        <Card className="bg-slate-900/50 border-slate-700 p-6">
          <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-400" />
            Status Distribution
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }: { name?: string; percent?: number }) => `${name ?? ''}: ${((percent || 0) * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {statusData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
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
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* RAG by Status Stacked Bar Chart */}
      <Card className="bg-slate-900/50 border-slate-700 p-6">
        <h3 className="text-xl font-semibold text-white mb-4">RAG Status by Soul Status</h3>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={ragByStatusData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="status" stroke="#94a3b8" />
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
            <Bar dataKey="RED" stackId="a" fill={RAG_COLORS.RED} name="Critical" />
            <Bar dataKey="AMBER" stackId="a" fill={RAG_COLORS.AMBER} name="Monitor" />
            <Bar dataKey="GREEN" stackId="a" fill={RAG_COLORS.GREEN} name="On Track" />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Follow-up Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card 
          className="bg-gradient-to-br from-rose-900/30 to-rose-800/30 border-rose-500/20 p-6 cursor-pointer hover:scale-105 transition-transform"
          onClick={() => setSelectedFollowUpRAG(selectedFollowUpRAG === 'RED' ? null : 'RED')}
        >
          <div className="text-center">
            <p className="text-sm text-rose-300">Critical Follow-ups</p>
            <p className="text-3xl font-bold text-white mt-2">{followUpOverview?.ragCounts?.RED || 0}</p>
            <p className="text-xs text-rose-400 mt-1">Wrong Number / Declined</p>
            {selectedFollowUpRAG === 'RED' && (
              <p className="text-xs text-rose-300 mt-2">Click to hide details</p>
            )}
          </div>
        </Card>

        <Card 
          className="bg-gradient-to-br from-amber-900/30 to-amber-800/30 border-amber-500/20 p-6 cursor-pointer hover:scale-105 transition-transform"
          onClick={() => setSelectedFollowUpRAG(selectedFollowUpRAG === 'AMBER' ? null : 'AMBER')}
        >
          <div className="text-center">
            <p className="text-sm text-amber-300">Monitor Follow-ups</p>
            <p className="text-3xl font-bold text-white mt-2">{followUpOverview?.ragCounts?.AMBER || 0}</p>
            <p className="text-xs text-amber-400 mt-1">No Answer / Busy</p>
            {selectedFollowUpRAG === 'AMBER' && (
              <p className="text-xs text-amber-300 mt-2">Click to hide details</p>
            )}
          </div>
        </Card>

        <Card 
          className="bg-gradient-to-br from-emerald-900/30 to-emerald-800/30 border-emerald-500/20 p-6 cursor-pointer hover:scale-105 transition-transform"
          onClick={() => setSelectedFollowUpRAG(selectedFollowUpRAG === 'GREEN' ? null : 'GREEN')}
        >
          <div className="text-center">
            <p className="text-sm text-emerald-300">Successful Follow-ups</p>
            <p className="text-3xl font-bold text-white mt-2">{followUpOverview?.ragCounts?.GREEN || 0}</p>
            <p className="text-xs text-emerald-400 mt-1">Completed Successfully</p>
            {selectedFollowUpRAG === 'GREEN' && (
              <p className="text-xs text-emerald-300 mt-2">Click to hide details</p>
            )}
          </div>
        </Card>
      </div>

      {/* Souls List by RAG Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card 
          className="bg-gradient-to-br from-rose-900/50 to-rose-800/50 border-rose-500/30 p-6 cursor-pointer hover:scale-105 transition-transform animate-pulse"
          onClick={() => setSelectedRAG(selectedRAG === 'RED' ? null : 'RED')}
        >
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-rose-400 mx-auto mb-3" />
            <p className="text-sm text-rose-300">View Critical Souls</p>
            <p className="text-4xl font-bold text-white mt-2">{overview?.ragCounts?.RED || 0}</p>
            <p className="text-xs text-rose-400 mt-1">Click to see names</p>
          </div>
        </Card>

        <Card 
          className="bg-gradient-to-br from-amber-900/50 to-amber-800/50 border-amber-500/30 p-6 cursor-pointer hover:scale-105 transition-transform"
          onClick={() => setSelectedRAG(selectedRAG === 'AMBER' ? null : 'AMBER')}
        >
          <div className="text-center">
            <AlertTriangle className="h-12 w-12 text-amber-400 mx-auto mb-3" />
            <p className="text-sm text-amber-300">View Monitor Souls</p>
            <p className="text-4xl font-bold text-white mt-2">{overview?.ragCounts?.AMBER || 0}</p>
            <p className="text-xs text-amber-400 mt-1">Click to see names</p>
          </div>
        </Card>

        <Card 
          className="bg-gradient-to-br from-emerald-900/50 to-emerald-800/50 border-emerald-500/30 p-6 cursor-pointer hover:scale-105 transition-transform"
          onClick={() => setSelectedRAG(selectedRAG === 'GREEN' ? null : 'GREEN')}
        >
          <div className="text-center">
            <CheckCircle className="h-12 w-12 text-emerald-400 mx-auto mb-3" />
            <p className="text-sm text-emerald-300">View On Track Souls</p>
            <p className="text-4xl font-bold text-white mt-2">{overview?.ragCounts?.GREEN || 0}</p>
            <p className="text-xs text-emerald-400 mt-1">Click to see names</p>
          </div>
        </Card>
      </div>

      {/* Souls Details List */}
      {selectedRAG && filteredSouls.length > 0 && (
        <Card className="bg-slate-900/50 border-slate-700 p-6">
          <h3 className="text-2xl font-semibold text-white mb-4 flex items-center gap-2">
            {selectedRAG === 'RED' && <AlertCircle className="h-6 w-6 text-rose-400" />}
            {selectedRAG === 'AMBER' && <AlertTriangle className="h-6 w-6 text-amber-400" />}
            {selectedRAG === 'GREEN' && <CheckCircle className="h-6 w-6 text-emerald-400" />}
            {selectedRAG} Status Souls ({filteredSouls.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[600px] overflow-y-auto">
            {filteredSouls.map((soul) => (
              <Card
                key={soul.id}
                className={`p-4 cursor-pointer hover:scale-105 transition-transform ${
                  selectedRAG === 'RED' ? 'bg-rose-900/20 border-rose-500/30 hover:bg-rose-900/30' :
                  selectedRAG === 'AMBER' ? 'bg-amber-900/20 border-amber-500/30 hover:bg-amber-900/30' :
                  'bg-emerald-900/20 border-emerald-500/30 hover:bg-emerald-900/30'
                }`}
                onClick={() => setSelectedSoul(soul)}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-white text-lg">
                      {soul.firstName} {soul.lastName}
                    </h4>
                    <span className={`px-2 py-1 rounded text-xs font-bold ${
                      selectedRAG === 'RED' ? 'bg-rose-500/20 text-rose-300' :
                      selectedRAG === 'AMBER' ? 'bg-amber-500/20 text-amber-300' :
                      'bg-emerald-500/20 text-emerald-300'
                    }`}>
                      {soul.status}
                    </span>
                  </div>
                  <div className="space-y-1 text-sm text-slate-400">
                    {soul.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-3 w-3" />
                        <span>{soul.phone}</span>
                      </div>
                    )}
                    {soul.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="h-3 w-3" />
                        <span className="truncate">{soul.email}</span>
                      </div>
                    )}
                    {soul.assignedMemberName && (
                      <div className="flex items-center gap-2">
                        <User className="h-3 w-3" />
                        <span>{soul.assignedMemberName}</span>
                      </div>
                    )}
                    {soul.daysSinceLastFollowUp !== null && (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3 w-3" />
                        <span>{soul.daysSinceLastFollowUp} days since contact</span>
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 border-t border-slate-700 pt-2">
                    {soul.ragReason}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </Card>
      )}

      {/* Follow-ups Details List */}
      {selectedFollowUpRAG && filteredFollowUps.length > 0 && (
        <Card className="bg-slate-900/50 border-slate-700 p-6">
          <h3 className="text-2xl font-semibold text-white mb-4 flex items-center gap-2">
            {selectedFollowUpRAG === 'RED' && <AlertCircle className="h-6 w-6 text-rose-400" />}
            {selectedFollowUpRAG === 'AMBER' && <AlertTriangle className="h-6 w-6 text-amber-400" />}
            {selectedFollowUpRAG === 'GREEN' && <CheckCircle className="h-6 w-6 text-emerald-400" />}
            {selectedFollowUpRAG} Status Follow-ups ({filteredFollowUps.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[600px] overflow-y-auto">
            {filteredFollowUps.map((fu) => (
              <Card
                key={fu.id}
                className={`p-4 cursor-pointer hover:scale-105 transition-transform ${
                  selectedFollowUpRAG === 'RED' ? 'bg-rose-900/20 border-rose-500/30 hover:bg-rose-900/30' :
                  selectedFollowUpRAG === 'AMBER' ? 'bg-amber-900/20 border-amber-500/30 hover:bg-amber-900/30' :
                  'bg-emerald-900/20 border-emerald-500/30 hover:bg-emerald-900/30'
                }`}
                onClick={() => setSelectedFollowUp(fu)}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-white text-lg">{fu.soulName}</h4>
                    <span className={`px-2 py-1 rounded text-xs font-bold ${
                      selectedFollowUpRAG === 'RED' ? 'bg-rose-500/20 text-rose-300' :
                      selectedFollowUpRAG === 'AMBER' ? 'bg-amber-500/20 text-amber-300' :
                      'bg-emerald-500/20 text-emerald-300'
                    }`}>
                      {fu.contactStatus}
                    </span>
                  </div>
                  <div className="space-y-1 text-sm text-slate-400">
                    {fu.memberName && (
                      <div className="flex items-center gap-2">
                        <User className="h-3 w-3" />
                        <span>{fu.memberName}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3 w-3" />
                      <span>{formatShortDate(fu.followUpDate)}</span>
                    </div>
                  </div>
                  <div className="text-xs text-slate-500 border-t border-slate-700 pt-2">
                    {fu.ragReason}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </Card>
      )}

      {/* Soul Detail Modal */}
      <Dialog open={!!selectedSoul} onOpenChange={() => setSelectedSoul(null)}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl">
              {selectedSoul?.firstName} {selectedSoul?.lastName}
            </DialogTitle>
          </DialogHeader>
          {selectedSoul && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                  selectedSoul.ragStatus === 'RED' ? 'bg-rose-500/20 text-rose-300 border border-rose-500' :
                  selectedSoul.ragStatus === 'AMBER' ? 'bg-amber-500/20 text-amber-300 border border-amber-500' :
                  'bg-emerald-500/20 text-emerald-300 border border-emerald-500'
                }`}>
                  {selectedSoul.ragStatus === 'RED' ? 'Critical' :
                   selectedSoul.ragStatus === 'AMBER' ? 'Monitor' :
                   'On Track'}
                </span>
                <span className="px-3 py-1 rounded-full text-sm font-semibold bg-purple-500/20 text-purple-300 border border-purple-500">
                  {selectedSoul.status}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-slate-400">Phone</div>
                  <div className="font-medium">{selectedSoul.phone || 'N/A'}</div>
                </div>
                {selectedSoul.email && (
                  <div>
                    <div className="text-slate-400">Email</div>
                    <div className="font-medium">{selectedSoul.email}</div>
                  </div>
                )}
                {selectedSoul.assignedMemberName && (
                  <div>
                    <div className="text-slate-400">Assigned To</div>
                    <div className="font-medium">{selectedSoul.assignedMemberName}</div>
                  </div>
                )}
                {selectedSoul.outreachName && (
                  <div>
                    <div className="text-slate-400">Outreach Program</div>
                    <div className="font-medium">{selectedSoul.outreachName}</div>
                  </div>
                )}
                {selectedSoul.daysSinceLastFollowUp !== null && (
                  <div>
                    <div className="text-slate-400">Days Since Last Contact</div>
                    <div className="font-medium">{selectedSoul.daysSinceLastFollowUp} days</div>
                  </div>
                )}
                <div>
                  <div className="text-slate-400">Created</div>
                  <div className="font-medium">
                    {selectedSoul.createdAt ? formatShortDate(selectedSoul.createdAt) : 'N/A'}
                  </div>
                </div>
              </div>

              <div className="bg-slate-800/50 p-4 rounded-lg">
                <div className="text-sm text-slate-400 mb-1">RAG Reason</div>
                <div className="text-white">{selectedSoul.ragReason}</div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Follow-up Detail Modal */}
      <Dialog open={!!selectedFollowUp} onOpenChange={() => setSelectedFollowUp(null)}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl">Follow-up Details</DialogTitle>
          </DialogHeader>
          {selectedFollowUp && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                  selectedFollowUp.ragStatus === 'RED' ? 'bg-rose-500/20 text-rose-300 border border-rose-500' :
                  selectedFollowUp.ragStatus === 'AMBER' ? 'bg-amber-500/20 text-amber-300 border border-amber-500' :
                  'bg-emerald-500/20 text-emerald-300 border border-emerald-500'
                }`}>
                  {selectedFollowUp.ragStatus === 'RED' ? 'Critical' :
                   selectedFollowUp.ragStatus === 'AMBER' ? 'Monitor' :
                   'GREEN Successful'}
                </span>
                <span className="px-3 py-1 rounded-full text-sm font-semibold bg-blue-500/20 text-blue-300 border border-blue-500">
                  {selectedFollowUp.contactStatus}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-slate-400">Soul Name</div>
                  <div className="font-medium">{selectedFollowUp.soulName}</div>
                </div>
                {selectedFollowUp.memberName && (
                  <div>
                    <div className="text-slate-400">Follow-up By</div>
                    <div className="font-medium">{selectedFollowUp.memberName}</div>
                  </div>
                )}
                <div>
                  <div className="text-slate-400">Follow-up Date</div>
                  <div className="font-medium">
                    {formatShortDateTime(selectedFollowUp.followUpDate)}
                  </div>
                </div>
                <div>
                  <div className="text-slate-400">Contact Status</div>
                  <div className="font-medium">{selectedFollowUp.contactStatus}</div>
                </div>
              </div>

              <div className="bg-slate-800/50 p-4 rounded-lg">
                <div className="text-sm text-slate-400 mb-1">Status Reason</div>
                <div className="text-white">{selectedFollowUp.ragReason}</div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
