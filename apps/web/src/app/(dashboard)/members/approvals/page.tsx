'use client';

import { useState, useEffect, useCallback } from 'react';
import { CheckCircle, XCircle, Eye } from 'lucide-react';
import { Button, Alert, Spinner, Card, CardBody, Modal } from '@/components/ui';
import { Breadcrumbs } from '@/components/layout';
import { members } from '@kairos/api-client';
import type { Member } from '@kairos/types';

const formatDate = (date: Date | string) =>
  new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });

export default function PendingApprovalsPage() {
  const [pending, setPending] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [preview, setPreview] = useState<Member | null>(null);

  const fetchPending = useCallback(async () => {
    try {
      const res = await members.list({ status: 'pending', limit: 100 });
      setPending(res.data ?? []);
    } catch {
      setError('Failed to load pending members.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPending(); }, [fetchPending]);

  const handleApprove = async (id: number) => {
    setActionLoading(id);
    setError('');
    try {
      await members.approve(id);
      setPending((prev) => prev.filter((m) => m.memberId !== id));
      setSuccess('Member approved successfully.');
    } catch {
      setError('Failed to approve member.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (id: number) => {
    setActionLoading(id);
    setError('');
    try {
      await members.delete(id);
      setPending((prev) => prev.filter((m) => m.memberId !== id));
      setSuccess('Member rejected.');
    } catch {
      setError('Failed to reject member.');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <>
      <Breadcrumbs items={[{ label: 'Members', href: '/members' }, { label: 'Pending Approvals' }]} />
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Pending Approvals</h1>

      {error && <Alert variant="error" className="mb-4">{error}</Alert>}
      {success && <Alert variant="success" className="mb-4">{success}</Alert>}

      {loading ? (
        <div className="flex justify-center py-12"><Spinner size="lg" /></div>
      ) : pending.length === 0 ? (
        <Card><CardBody><p className="text-gray-500 text-center py-8">No pending approvals.</p></CardBody></Card>
      ) : (
        <div className="space-y-3">
          {pending.map((member) => (
            <Card key={member.memberId}>
              <CardBody>
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
                      onClick={() => handleReject(member.memberId)}
                      disabled={actionLoading === member.memberId}
                    >
                      <XCircle size={16} className="mr-1" /> Reject
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleApprove(member.memberId)}
                      disabled={actionLoading === member.memberId}
                    >
                      <CheckCircle size={16} className="mr-1" /> Approve
                    </Button>
                  </div>
                </div>
              </CardBody>
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
              <div><span className="text-gray-500">Branch ID:</span> {preview.homeBranchId}</div>
            </div>
            <div className="flex gap-2 pt-4 border-t">
              <Button variant="secondary" size="sm" onClick={() => { handleReject(preview.memberId); setPreview(null); }}>
                Reject
              </Button>
              <Button size="sm" onClick={() => { handleApprove(preview.memberId); setPreview(null); }}>
                Approve
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
