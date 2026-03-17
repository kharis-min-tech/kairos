'use client';

import { useState, useEffect, useCallback } from 'react';
import { Clock, CheckCircle, Search, AlertTriangle, Phone, Mail, MessageSquare, User, Calendar } from 'lucide-react';
import { Breadcrumbs } from '@/components/layout';
import { Button, TextInput, SelectInput, Textarea, Modal, Badge, Alert, Spinner, Card, CardHeader, CardContent, StatCard } from '@/components/ui';
import { souls } from '@kairos/api-client';
import type { ContactMethod, ContactStatus, FollowUpTrackerItem } from '@kairos/types';

type Tab = 'all' | 'pending' | 'overdue';

const CONTACT_METHODS = [
  { value: '', label: 'All Methods' },
  { value: 'Phone Call', label: 'Phone Call' },
  { value: 'Text Message', label: 'Text Message' },
  { value: 'Email', label: 'Email' },
  { value: 'Home Visit', label: 'Home Visit' },
  { value: 'In-Person Meeting', label: 'In-Person Meeting' },
];

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'Pending', label: 'Pending' },
  { value: 'Completed', label: 'Completed' },
  { value: 'Overdue', label: 'Overdue' },
];

const LOG_CONTACT_METHODS = [
  { value: 'Phone Call', label: 'Phone Call' },
  { value: 'Text Message', label: 'Text Message' },
  { value: 'Email', label: 'Email' },
  { value: 'Home Visit', label: 'Home Visit' },
  { value: 'In-Person Meeting', label: 'In-Person Meeting' },
  { value: 'Other', label: 'Other' },
];

const LOG_CONTACT_STATUSES = [
  { value: 'Successful', label: 'Successful' },
  { value: 'No Answer', label: 'No Answer' },
  { value: 'Wrong Number', label: 'Wrong Number' },
  { value: 'Call Back Later', label: 'Call Back Later' },
  { value: 'Not Interested', label: 'Not Interested' },
  { value: 'Interested', label: 'Interested' },
];

const formatDate = (d: string | Date) =>
  new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });

function deriveStatus(item: FollowUpTrackerItem): 'Pending' | 'Completed' | 'Overdue' {
  if (item.status === 'Completed') return 'Completed';
  if (item.dueDate && new Date(item.dueDate) < new Date()) return 'Overdue';
  return 'Pending';
}

export default function FollowUpTrackerPage() {
  const [items, setItems] = useState<FollowUpTrackerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState<Tab>('all');
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterMethod, setFilterMethod] = useState('');
  const [pendingCount, setPendingCount] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);

  // Log Follow-Up modal state
  const [showLogModal, setShowLogModal] = useState(false);
  const [logSoulId, setLogSoulId] = useState<number | null>(null);
  const [logSoulName, setLogSoulName] = useState('');
  const [logForm, setLogForm] = useState({ contactMethod: '', contactStatus: '', notes: '', nextFollowUpDate: '', durationMinutes: '' });
  const [logErrors, setLogErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await souls.getFollowUpTracker({
        tab: activeTab,
        search: search || undefined,
        status: filterStatus || undefined,
        contactMethod: filterMethod || undefined,
      });
      const data = res as unknown as { pending: number; completed: number; items: FollowUpTrackerItem[] };
      setItems(data.items || []);
      setPendingCount(data.pending ?? 0);
      setCompletedCount(data.completed ?? 0);
    } catch {
      setError('Failed to load follow-up data.');
    } finally {
      setLoading(false);
    }
  }, [activeTab, search, filterStatus, filterMethod]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const tabClass = (tab: Tab) =>
    `px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 ${
      activeTab === tab
        ? 'border-primary text-primary bg-white'
        : 'border-transparent text-gray-500 hover:text-gray-700'
    }`;

  const filtered = items.filter((item) => {
    const derivedStatus = deriveStatus(item);
    if (activeTab === 'pending' && derivedStatus !== 'Pending') return false;
    if (activeTab === 'overdue' && derivedStatus !== 'Overdue') return false;
    if (filterStatus && derivedStatus !== filterStatus) return false;
    if (filterMethod && item.contactMethod !== filterMethod) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!item.soulName.toLowerCase().includes(q) && !item.assignedWorker.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const openLogModal = (soulId: number, soulName: string) => {
    setLogSoulId(soulId);
    setLogSoulName(soulName);
    setLogForm({ contactMethod: '', contactStatus: '', notes: '', nextFollowUpDate: '', durationMinutes: '' });
    setLogErrors({});
    setShowLogModal(true);
  };

  const validateLog = () => {
    const e: Record<string, string> = {};
    if (!logForm.contactMethod) e.contactMethod = 'Contact method is required';
    if (!logForm.contactStatus) e.contactStatus = 'Contact status is required';
    setLogErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleLogFollowUp = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setError('');
    if (!validateLog() || !logSoulId) return;
    setSubmitting(true);
    try {
      await souls.addFollowup(logSoulId, {
        contactMethod: logForm.contactMethod as ContactMethod,
        contactStatus: logForm.contactStatus as ContactStatus,
        notes: logForm.notes || undefined,
        nextFollowUpDate: logForm.nextFollowUpDate ? new Date(logForm.nextFollowUpDate) : undefined,
        durationMinutes: logForm.durationMinutes ? Number(logForm.durationMinutes) : undefined,
      });
      setShowLogModal(false);
      setSuccess('Follow-up logged successfully!');
      setLoading(true);
      fetchData();
    } catch {
      setError('Failed to log follow-up.');
    } finally {
      setSubmitting(false);
    }
  };

  const getMethodIcon = (method: string | null) => {
    switch (method) {
      case 'Phone Call': return <Phone size={14} />;
      case 'Email': return <Mail size={14} />;
      case 'Text Message': return <MessageSquare size={14} />;
      default: return <User size={14} />;
    }
  };

  return (
    <>
      <Breadcrumbs items={[{ label: 'Evangelism' }, { label: 'Follow-Up Tracker' }]} />
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Follow-Up Tracker</h1>
      </div>

      {error && <Alert variant="error" className="mb-4" onDismiss={() => setError('')}>{error}</Alert>}
      {success && <Alert variant="success" className="mb-4" onDismiss={() => setSuccess('')}>{success}</Alert>}

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <StatCard icon={<Clock size={20} />} label="Pending Follow-Ups Due This Week" value={pendingCount} />
        <StatCard icon={<CheckCircle size={20} />} label="Completed Follow-Ups This Month" value={completedCount} />
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by soul or worker name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white pl-9 pr-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-700 focus-visible:ring-offset-2 min-h-[44px]"
            aria-label="Search follow-ups"
          />
        </div>
        <SelectInput name="filterStatus" options={STATUS_OPTIONS} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} aria-label="Filter by status" />
        <SelectInput name="filterMethod" options={CONTACT_METHODS} value={filterMethod} onChange={(e) => setFilterMethod(e.target.value)} aria-label="Filter by contact method" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 mb-4" role="tablist">
        <button role="tab" aria-selected={activeTab === 'all'} className={tabClass('all')} onClick={() => setActiveTab('all')}>All</button>
        <button role="tab" aria-selected={activeTab === 'pending'} className={tabClass('pending')} onClick={() => setActiveTab('pending')}>Pending</button>
        <button role="tab" aria-selected={activeTab === 'overdue'} className={tabClass('overdue')} onClick={() => setActiveTab('overdue')}>Overdue</button>
      </div>

      {/* Follow-Up Cards */}
      {loading ? (
        <div className="flex justify-center py-12"><Spinner size="lg" /></div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent>
            <p className="text-gray-500 text-center py-8">No follow-ups found.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((item) => {
            const derivedStatus = deriveStatus(item);
            const isOverdue = derivedStatus === 'Overdue';
            return (
              <Card
                key={item.followUpId}
                className={`relative ${isOverdue ? 'border-amber-400 border-2' : ''}`}
              >
                {isOverdue && (
                  <div className="absolute top-2 right-2" title="Overdue">
                    <AlertTriangle size={18} className="text-amber-500" />
                  </div>
                )}
                <CardHeader>
                  <div className="flex items-center justify-between pr-6">
                    <h3 className="font-semibold text-gray-900 truncate">{item.soulName}</h3>
                    <Badge variant={derivedStatus === 'Completed' ? 'default' : isOverdue ? 'destructive' : 'secondary'}>
                      {derivedStatus}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <p className="flex items-center gap-1 text-gray-600">
                      <User size={14} /> {item.assignedWorker}
                    </p>
                    {item.dueDate && (
                      <p className={`flex items-center gap-1 ${isOverdue ? 'text-amber-600 font-medium' : 'text-gray-600'}`}>
                        <Calendar size={14} /> Due: {formatDate(item.dueDate)}
                      </p>
                    )}
                    {item.contactMethod && (
                      <p className="flex items-center gap-1 text-gray-600">
                        {getMethodIcon(item.contactMethod)} {item.contactMethod}
                      </p>
                    )}
                    <div className="pt-2 border-t border-gray-100">
                      <Button
                        variant="secondary"
                        size="sm"
                        className="w-full"
                        onClick={() => openLogModal(item.soulId, item.soulName)}
                      >
                        Log Follow-Up
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Log Follow-Up Modal */}
      <Modal open={showLogModal} onClose={() => setShowLogModal(false)} title={`Log Follow-Up — ${logSoulName}`}>
        <form onSubmit={handleLogFollowUp} className="space-y-4">
          <SelectInput
            label="Contact Method *"
            name="contactMethod"
            options={LOG_CONTACT_METHODS}
            placeholder="Select method..."
            value={logForm.contactMethod}
            onChange={(e) => setLogForm((p) => ({ ...p, contactMethod: e.target.value }))}
            error={logErrors.contactMethod}
          />
          <SelectInput
            label="Contact Status *"
            name="contactStatus"
            options={LOG_CONTACT_STATUSES}
            placeholder="Select status..."
            value={logForm.contactStatus}
            onChange={(e) => setLogForm((p) => ({ ...p, contactStatus: e.target.value }))}
            error={logErrors.contactStatus}
          />
          <TextInput
            label="Duration (minutes)"
            name="durationMinutes"
            type="number"
            min="1"
            value={logForm.durationMinutes}
            onChange={(e) => setLogForm((p) => ({ ...p, durationMinutes: e.target.value }))}
          />
          <TextInput
            label="Next Follow-Up Date"
            name="nextFollowUpDate"
            type="date"
            value={logForm.nextFollowUpDate}
            onChange={(e) => setLogForm((p) => ({ ...p, nextFollowUpDate: e.target.value }))}
          />
          <Textarea
            label="Notes"
            name="notes"
            value={logForm.notes}
            onChange={(e) => setLogForm((p) => ({ ...p, notes: e.target.value }))}
            placeholder="Follow-up notes..."
          />
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" type="button" onClick={() => setShowLogModal(false)}>Cancel</Button>
            <Button type="submit" disabled={submitting}>{submitting ? 'Saving…' : 'Log Follow-Up'}</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
