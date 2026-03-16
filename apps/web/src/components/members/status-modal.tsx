'use client';

import { useState } from 'react';
import { Button, Modal, Textarea } from '@/components/ui';
import { useDeleteMember } from '@/hooks/use-members';
import type { Member } from '@kairos/types';

interface StatusModalProps {
  open: boolean;
  onClose: () => void;
  member: Member;
  onSuccess: () => void;
}

export function StatusModal({ open, onClose, member, onSuccess }: StatusModalProps) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const deleteMember = useDeleteMember();

  const handleDeactivate = async () => {
    setError('');
    try {
      await deleteMember.mutateAsync(member.memberId);
      setReason('');
      onSuccess();
    } catch {
      setError('Failed to deactivate member. Please try again.');
    }
  };

  const handleClose = () => {
    setReason('');
    setError('');
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={member.isActive ? 'Deactivate Member' : 'Member Inactive'}
      footer={
        member.isActive ? (
          <>
            <Button variant="secondary" size="sm" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDeactivate}
              disabled={deleteMember.isPending}
            >
              {deleteMember.isPending ? 'Deactivating…' : 'Deactivate'}
            </Button>
          </>
        ) : (
          <Button variant="secondary" size="sm" onClick={handleClose}>
            Close
          </Button>
        )
      }
    >
      <div className="space-y-4">
        {member.isActive ? (
          <>
            <p className="text-sm text-gray-600">
              Are you sure you want to deactivate{' '}
              <span className="font-medium">{member.firstName} {member.lastName}</span>?
              Their data will be retained for reporting purposes.
            </p>
            <Textarea
              name="reason"
              label="Reason (optional)"
              placeholder="Enter reason for deactivation…"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </>
        ) : (
          <p className="text-sm text-gray-600">
            This member is currently inactive.
          </p>
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    </Modal>
  );
}
