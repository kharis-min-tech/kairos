'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { useEnrollments, useEnrollmentAlerts, useCreateEnrollment } from '@/hooks/use-new-believers';
import { useAuthStore } from '@/lib/auth-store';
import { useMembers } from '@/hooks/use-members';
import { Card, CardContent } from '@kairos/ui';
import type { NewBelieverStageValue, EnrollmentListParams } from '@kairos/types';

const STAGES: { value: NewBelieverStageValue; label: string }[] = [
  { value: 'enrolled', label: 'Enrolled' },
  { value: 'session-1', label: 'Session 1' },
  { value: 'session-2', label: 'Session 2' },
  { value: 'session-3', label: 'Session 3' },
  { value: 'session-4', label: 'Session 4' },
  { value: 'completed', label: 'Completed' },
  { value: 'integrated', label: 'Integrated' },
];

const STAGE_COLORS: Record<NewBelieverStageValue, string> = {
  enrolled: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
  'session-1': 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/50 dark:text-blue-300 dark:border-blue-800',
  'session-2': 'bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-900/50 dark:text-indigo-300 dark:border-indigo-800',
  'session-3': 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/50 dark:text-purple-300 dark:border-purple-800',
  'session-4': 'bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-900/50 dark:text-violet-300 dark:border-violet-800',
  completed: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/50 dark:text-emerald-300 dark:border-emerald-800',
  integrated: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/50 dark:text-amber-300 dark:border-amber-800',
};

function StageColumn({
  stage,
  enrollments,
}: {
  stage: { value: NewBelieverStageValue; label: string };
  enrollments: Array<{
    id: string;
    memberFirstName: string;
    memberLastName: string;
    teacherFirstName?: string | null;
    teacherLastName?: string | null;
    enrolledAt: string | Date;
    updatedAt: string | Date;
  }>;
}) {
  const colorClass = STAGE_COLORS[stage.value];
  return (
    <div className="flex min-w-[220px] flex-col gap-2">
      <div className={`rounded-lg border px-3 py-2 text-sm font-semibold ${colorClass}`}>
        {stage.label}
        <span className="ml-2 rounded-full bg-black/10 px-1.5 py-0.5 text-xs font-bold dark:bg-white/20">
          {enrollments.length}
        </span>
      </div>
      <div className="flex flex-col gap-2">
        {enrollments.length === 0 ? (
          <p className="rounded-lg border border-dashed p-3 text-center text-xs text-muted-foreground">
            No enrollments
          </p>
        ) : (
          enrollments.map((e) => (
            <Link key={e.id} href={`/new-believers/${e.id}`}>
              <Card className="cursor-pointer transition-shadow hover:shadow-md">
                <CardContent className="p-3">
                  <p className="text-sm font-medium">
                    {e.memberFirstName} {e.memberLastName}
                  </p>
                  {(e.teacherFirstName || e.teacherLastName) && (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Teacher: {e.teacherFirstName} {e.teacherLastName}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-muted-foreground">
                    Enrolled {new Date(e.enrolledAt).toLocaleDateString()}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}

function NewBelieversContent() {
  const { activeRole, user } = useAuthStore();
  const isAdminOrPastor = activeRole === 'admin' || activeRole === 'pastor';

  const [filterStage, setFilterStage] = useState<NewBelieverStageValue | ''>('');
  const [showEnrollDialog, setShowEnrollDialog] = useState(false);
  const [enrollForm, setEnrollForm] = useState({ memberId: '', teacherId: '', notes: '' });
  const [memberSearch, setMemberSearch] = useState('');

  const fetchParams: EnrollmentListParams = {
    page: 1,
    limit: 200,
    branchId: activeRole === 'admin' ? undefined : user?.homeBranchId,
    stage: filterStage || undefined,
  };

  const { data: result, isLoading } = useEnrollments(fetchParams);
  const { data: alertsResult } = useEnrollmentAlerts();
  const createEnrollment = useCreateEnrollment();

  const { data: memberData } = useMembers(
    user?.homeBranchId
      ? { branchId: user.homeBranchId, limit: 200, search: memberSearch || undefined }
      : undefined
  );
  const branchMembers = memberData?.data ?? [];

  const enrollments = result?.data ?? [];
  const alerts = alertsResult?.data ?? [];

  // Group enrollments by stage for the pipeline board
  const byStage = STAGES.reduce<Record<string, typeof enrollments>>(
    (acc, s) => {
      acc[s.value] = enrollments.filter((e) => e.stage === s.value);
      return acc;
    },
    {}
  );

  async function handleEnroll() {
    if (!enrollForm.memberId || !user?.homeBranchId) return;
    try {
      await createEnrollment.mutateAsync({
        memberId: enrollForm.memberId,
        branchId: user.homeBranchId,
        teacherId: enrollForm.teacherId || undefined,
        notes: enrollForm.notes || undefined,
      });
      toast.success('Member enrolled in New Believers programme');
      setShowEnrollDialog(false);
      setEnrollForm({ memberId: '', teacherId: '', notes: '' });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to enroll member');
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="-mx-6 -mt-6 rounded-b-2xl bg-gradient-to-br from-purple-900 to-purple-700 px-6 py-7 text-white">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">New Believers</h1>
            <p className="mt-1 text-sm text-purple-200">
              Journey tracking from enrolment to integration
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/new-believers/sessions"
              className="rounded-lg border border-white/30 bg-white/10 px-3 py-2 text-sm font-medium transition-colors hover:bg-white/20"
            >
              Sessions
            </Link>
            {isAdminOrPastor && (
              <button
                onClick={() => setShowEnrollDialog(true)}
                className="rounded-lg bg-white px-3 py-2 text-sm font-medium text-purple-900 transition-colors hover:bg-purple-50"
              >
                + Enrol Member
              </button>
            )}
          </div>
        </div>

        {/* Stats row */}
        <div className="mt-4 flex flex-wrap gap-4">
          <div className="rounded-lg bg-white/10 px-4 py-2 text-center">
            <p className="text-lg font-bold">{result?.total ?? 0}</p>
            <p className="text-xs text-purple-200">Active</p>
          </div>
          <div className="rounded-lg bg-white/10 px-4 py-2 text-center">
            <p className="text-lg font-bold text-amber-300">{alerts.length}</p>
            <p className="text-xs text-purple-200">Stale (&gt;7 days)</p>
          </div>
          <div className="rounded-lg bg-white/10 px-4 py-2 text-center">
            <p className="text-lg font-bold">{byStage['integrated']?.length ?? 0}</p>
            <p className="text-xs text-purple-200">Integrated</p>
          </div>
        </div>
      </div>

      {/* Stale alert banner */}
      {alerts.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-sm font-medium text-amber-800">
            ⚠️ {alerts.length} enrolment{alerts.length !== 1 ? 's have' : ' has'} had no progress in over 7 days.
          </p>
          <div className="mt-1 flex flex-wrap gap-1">
            {alerts.slice(0, 5).map((e) => (
              <Link
                key={e.id}
                href={`/new-believers/${e.id}`}
                className="rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-700 hover:bg-amber-200"
              >
                {e.memberFirstName} {e.memberLastName}
              </Link>
            ))}
            {alerts.length > 5 && (
              <span className="text-xs text-amber-600">+{alerts.length - 5} more</span>
            )}
          </div>
        </div>
      )}

      {/* Stage filter chips */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilterStage('')}
          className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
            filterStage === ''
              ? 'bg-purple-700 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
          }`}
        >
          All
        </button>
        {STAGES.map((s) => (
          <button
            key={s.value}
            onClick={() => setFilterStage(s.value)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              filterStage === s.value
                ? 'bg-purple-700 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Loading pipeline…</p>
        </div>
      ) : filterStage ? (
        /* Flat list when a stage is filtered */
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {enrollments.map((e) => (
            <Link key={e.id} href={`/new-believers/${e.id}`}>
              <Card className="cursor-pointer transition-shadow hover:shadow-md">
                <CardContent className="p-4">
                  <p className="font-medium">
                    {e.memberFirstName} {e.memberLastName}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground capitalize">{e.stage}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        /* Pipeline board */
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-4" style={{ minWidth: STAGES.length * 240 + 'px' }}>
            {STAGES.map((s) => (
              <StageColumn
                key={s.value}
                stage={s}
                enrollments={byStage[s.value] ?? []}
              />
            ))}
          </div>
        </div>
      )}

      {/* Enrol Member Dialog */}
      {showEnrollDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-gray-900 dark:text-gray-100">
            <h2 className="mb-4 text-lg font-semibold">Enrol Member in New Believers</h2>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium">Search Member</label>
                <input
                  className="w-full rounded-lg border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500"
                  placeholder="Type name to search…"
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">Select Member</label>
                <select
                  className="w-full rounded-lg border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                  value={enrollForm.memberId}
                  onChange={(e) => setEnrollForm((f) => ({ ...f, memberId: e.target.value }))}
                >
                  <option value="">Choose a member…</option>
                  {branchMembers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.firstName} {m.lastName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">Assign Teacher (optional)</label>
                <select
                  className="w-full rounded-lg border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                  value={enrollForm.teacherId}
                  onChange={(e) => setEnrollForm((f) => ({ ...f, teacherId: e.target.value }))}
                >
                  <option value="">— unassigned —</option>
                  {branchMembers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.firstName} {m.lastName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">Notes (optional)</label>
                <textarea
                  className="w-full rounded-lg border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                  rows={2}
                  value={enrollForm.notes}
                  onChange={(e) => setEnrollForm((f) => ({ ...f, notes: e.target.value }))}
                />
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setShowEnrollDialog(false)}
                className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                Cancel
              </button>
              <button
                disabled={!enrollForm.memberId || createEnrollment.isPending}
                onClick={handleEnroll}
                className="rounded-lg bg-purple-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-800 disabled:opacity-50"
              >
                {createEnrollment.isPending ? 'Enrolling…' : 'Enrol'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function NewBelieversPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Loading…</p>
        </div>
      }
    >
      <NewBelieversContent />
    </Suspense>
  );
}
