'use client';

import { CustomSelect } from '@kairos/ui';
import { useAuthStore } from '@/lib/auth-store';
import { useBranches } from '@/hooks/use-branches';

interface BranchPickerProps {
  /**
   * Currently-selected branch (undefined → server defaults to the caller's
   * home branch on the API). Only meaningful for admin/pastor.
   */
  value: string | undefined;
  onChange: (branchId: string | undefined) => void;
}

/**
 * Cross-branch desk capture picker (Phase 3). Only renders for admin / pastor —
 * everyone else is pinned to their own branch by the API and sees nothing here.
 * Pastor only sees their own branch in the list as a confirmation; admin sees all.
 */
export function BranchPicker({ value, onChange }: BranchPickerProps) {
  const user = useAuthStore((s) => s.user);
  const homeBranchId = (user as { homeBranchId?: string } | null)?.homeBranchId;
  const canPickBranch = user?.systemRole === 'admin';
  const { data: branches } = useBranches();

  if (!canPickBranch) return null;
  if (!branches || branches.length === 0) return null;

  const options = branches.map((b) => ({ value: b.id, label: b.branchName }));

  return (
    <div className="space-y-1.5 rounded-lg border bg-card p-3">
      <label className="text-xs font-medium text-muted-foreground">
        Capturing for branch
      </label>
      <CustomSelect
        value={value ?? homeBranchId ?? ''}
        onValueChange={(v) => onChange(v || undefined)}
        options={options}
      />
      <p className="text-xs text-muted-foreground">
        Pick a different branch if this person belongs elsewhere. Defaults to your home branch.
      </p>
    </div>
  );
}
