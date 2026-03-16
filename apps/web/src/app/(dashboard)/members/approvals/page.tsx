'use client';

import { useState } from 'react';
import { CheckCircle, XCircle, Eye } from 'lucide-react';
import { Button, Alert, Card, CardContent, Modal } from '@/components/ui';
import { PageHeader } from '@/components/shared';
import { LoadingSkeleton } from '@/components/shared';
import { EmptyState } from '@/components/shared';
import { useMembers, useApproveMember, useDeleteMember } from '@/hooks/use-members';
import { useBranches } from '@/hooks/use-branches';
import type { Member } from '@kairos/types';

const formatDate = (date: Date | string) =>
  new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });

export default function PendingApprovalsPage() {
  const { data: pendingRes, isLoading, error } = useMembers({ status: 'pending' as never, limit: 100 });
  const { data: branchesRes } = useBranches({ limit: 100 });
  const approveMember = useApproveMember();
  const deleteMember = useDeleteMember();

  const [preview, setPreview] = useState<Member | null>(null);
  const [rejectConfirm, setRejectConfirm] = useState<Member | null>(null);
  const [actionId, setActionId] = useState<number | null>(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const pending = (pendingRes?.data ?? []) as Member[];
  const branches = (branchesRes?.data ?? []) as Array<{ branchId: number; branchName: string }>;

  const resolveBranchName = (branchId: number) =>
    branches.find((b) => b.branchId === branchId)?.branchName ?? `Branch ${branchId}`;

  const handleApprove = async (id: number) => {
    setActionId(id);
    setErrorMsg('');
    try {
      await approveMember.mutateAsync(id);
      setSuccessMsg('Member approved. Welcome email sent.');
    } catch {
      setErrorMsg('Failed to approve member.');
    } finally {
      setActionId(null);
    }
  };

  const handleReject = async (id: number) => {
    setActionId(id);
    setErrorMsg('');
    try {
      await deleteMember.mutateAsync(id);
      setSuccessMsg('Member rejected.');
    } catch {
      setErrorMsg('Failed to reject member.');
    } finally {
      setActionId(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Pending Approvals" />

      {errorMsg && <Alert variant="error">{errorMsg}</Alert>}
      {successMsg && <Alert variant="success">{successMsg}</Alert>}
      {error && <Alert variant="error">{error.message}</Alert>}

      {isLoading ? (
        <LoadingSkeleton variant="list" count={4} />
      ) : pending.length === 0 ? (
        <EmptyState title="No Pending Approvals" description="All members have been reviewed." />
      ) : (
        <div className="space-y-3">
          {pending.map((member) => (
            <Card key={member.memberId}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900">
                      {member.firstName} {member.lastName}
                    </p>
                    <p className="text-sm text-gray-500">{member.email} · {member.phone}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Registered: {member.membershipDate ? formatDate(member.membershipDate) : '—'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setPreview(member)}
                      aria-label={`Preview ${member.firstName}`}
                    >
                      <Eye size={16} />
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setRejectConfirm(member)}
                      disabled={actionId === member.memberId}
                    >
                      <XCircle size={16} className="mr-1" /> Reject
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleApprove(member.memberId)}
                      disabled={actionId === member.memberId}
                    >
                      <CheckCircle size={16} className="mr-1" /> Approve
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Member Preview Modal */}
      <Modal open={!!preview} onClose={() => setPreview(null)} title="Member Details">
        {preview && (
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div><span className="text-gray-500">Name:</span> <span className="font-medium">{preview.firstName} {preview.lastName}</span></div>
              <div><span className="text-gray-500">Email:</span> {preview.email || '—'}</div>
              <div><span className="text-gray-500">Phone:</span> {preview.phone || '—'}</div>
              <div><span className="text-gray-500">Gender:</span> {preview.gender || '—'}</div>
              <div><span className="text-gray-500">Date of Birth:</span> {preview.dateOfBirth ? formatDate(preview.dateOfBirth) : '—'}</div>
              <div><span className="text-gray-500">Address:</span> {preview.address || '—'}</div>
              <div><span className="text-gray-500">City:</span> {preview.city || '—'}</div>
              <div><span className="text-gray-500">Branch:</span> {resolveBranchName(preview.homeBranchId)}</div>
            </div>
            <div className="flex gap-2 pt-4 border-t">
              <Button variant="secondary" size="sm" onClick={() => { setRejectConfirm(preview); setPreview(null); }}>
                Reject
              </Button>
              <Button size="sm" onClick={() => { handleApprove(preview.memberId); setPreview(null); }}>
                Approve
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Reject Confirmation Modal */}
      <Modal open={!!rejectConfirm} onClose={() => setRejectConfirm(null)} title="Confirm Rejection">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Are you sure you want to reject this member? This action cannot be undone.
          </p>
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" size="sm" onClick={() => setRejectConfirm(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                if (rejectConfirm) {
                  handleReject(rejectConfirm.memberId);
                  setRejectConfirm(null);
                }
              }}
            >
              Reject
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
