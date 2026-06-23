'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, Button } from '@kairos/ui';
import { useBranches } from '@/hooks/use-branches';
import { useFellowships } from '@/hooks/use-fellowships';
import { useMyDepartments } from '@/hooks/use-departments';

// ── Derived "friendly role line" ───────────────────────────────────────────
// Replaces the raw `systemRole: "member"` exposure on /profile with a sentence
// that reads naturally in a church-app context.
export function useFriendlyRoleLines(opts: {
  systemRole?: string | null;
  memberId?: string | null;
  homeBranchId?: string | null;
}): string[] {
  const { systemRole, memberId, homeBranchId } = opts;
  const { data: branches } = useBranches();
  const { data: fellowshipsRes } = useFellowships(memberId ? { memberId, limit: 100 } : undefined);
  const { data: myDepts } = useMyDepartments();

  const homeBranchName = branches?.find((b) => b.id === homeBranchId)?.branchName ?? null;

  // Top-level church role lines
  const lines: string[] = [];
  if (systemRole === 'admin') {
    lines.push('Church administrator');
  } else if ((systemRole as string) === 'pastor') {
    lines.push(homeBranchName ? `Pastor of ${homeBranchName} branch` : 'Pastor');
  }

  // Fellowship leadership
  const fellowships = (fellowshipsRes?.data ?? []) as Array<{
    id: string;
    fellowshipName: string;
    leaderId?: string | null;
    coLeaderId?: string | null;
  }>;
  for (const f of fellowships) {
    if (memberId && f.leaderId === memberId) lines.push(`Lead of ${f.fellowshipName} fellowship`);
    else if (memberId && f.coLeaderId === memberId) lines.push(`Co-lead of ${f.fellowshipName} fellowship`);
  }

  // Department leadership
  const depts = (myDepts ?? []) as Array<{
    id: string;
    departmentName?: string;
    leadMemberId?: string | null;
    deputyMemberId?: string | null;
  }>;
  for (const d of depts) {
    const name = d.departmentName ?? 'Department';
    if (memberId && d.leadMemberId === memberId) lines.push(`Lead of ${name} department`);
    else if (memberId && d.deputyMemberId === memberId) lines.push(`Deputy of ${name} department`);
  }

  // Plain member fallback — only when no other role line exists at all
  if (lines.length === 0) {
    lines.push(
      homeBranchName
        ? `Member of Kharis Church — ${homeBranchName} branch`
        : 'Member of Kharis Church',
    );
  }

  return lines;
}

// ── "Where I belong" — home branch + secondary branch ─────────────────────
export function WhereIBelongCard({
  homeBranchId,
  secondaryBranchId,
  isAtSecondaryBranch,
  onSwitchBranch,
  switchPending,
  switchError,
}: {
  homeBranchId?: string | null;
  secondaryBranchId?: string | null;
  isAtSecondaryBranch?: boolean;
  onSwitchBranch?: () => void;
  switchPending?: boolean;
  switchError?: string | null;
}) {
  const { data: branches } = useBranches();
  const home = branches?.find((b) => b.id === homeBranchId);
  const secondary = branches?.find((b) => b.id === secondaryBranchId);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Where I belong</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-sm text-muted-foreground">Home branch</p>
          <p className="mt-0.5 font-medium">{home?.branchName ?? '—'}</p>
        </div>

        {secondary && (
          <>
            <div className="border-t pt-3">
              <p className="text-sm text-muted-foreground">Secondary branch</p>
              <p className="mt-0.5 font-medium">{secondary.branchName}</p>
            </div>
            <div className="flex items-center justify-between border-t pt-3">
              <div>
                <p className="text-sm font-medium">Active branch</p>
                <p className="text-xs text-muted-foreground">
                  {isAtSecondaryBranch
                    ? `Currently at ${secondary.branchName} (secondary)`
                    : `Currently at ${home?.branchName ?? 'home branch'}`}
                </p>
              </div>
              {onSwitchBranch && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-lg"
                  onClick={onSwitchBranch}
                  disabled={switchPending}
                >
                  {switchPending ? 'Switching…' : 'Switch'}
                </Button>
              )}
            </div>
            {switchError && (
              <p role="alert" className="text-sm font-medium text-destructive">{switchError}</p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ── "My community" — fellowships + departments ────────────────────────────
export function MyCommunityCard({ memberId }: { memberId?: string | null }) {
  const { data: fellowshipsRes } = useFellowships(memberId ? { memberId, limit: 100 } : undefined);
  const { data: myDepts } = useMyDepartments();

  const fellowships = (fellowshipsRes?.data ?? []) as Array<{
    id: string;
    fellowshipName: string;
    fellowshipType?: string;
  }>;
  const depts = (myDepts ?? []) as Array<{
    id: string;
    departmentName?: string;
  }>;

  if (fellowships.length === 0 && depts.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">My community</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {fellowships.length > 0 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              My Fellowships ({fellowships.length})
            </p>
            <ul className="mt-2 space-y-1.5">
              {fellowships.map((f) => (
                <li key={f.id}>
                  <Link
                    href={`/fellowships/${f.id}`}
                    className="inline-flex items-center gap-2 text-sm font-medium hover:underline"
                  >
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#5D3FD3]" aria-hidden />
                    {f.fellowshipName}
                    {f.fellowshipType && (
                      <span className="text-xs text-muted-foreground">
                        · {f.fellowshipType}
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        {depts.length > 0 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              My Departments ({depts.length})
            </p>
            <ul className="mt-2 space-y-1.5">
              {depts.map((d) => (
                <li key={d.id}>
                  <Link
                    href={`/departments/${d.id}`}
                    className="inline-flex items-center gap-2 text-sm font-medium hover:underline"
                  >
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#f8b537]" aria-hidden />
                    {d.departmentName ?? 'Department'}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── "My leadership" — only renders when the user has any leadership role ──
export function MyLeadershipCard({
  memberId,
  showAdminRole = false,
  showPastorRole = false,
  homeBranchName,
}: {
  memberId?: string | null;
  showAdminRole?: boolean;
  showPastorRole?: boolean;
  homeBranchName?: string | null;
}) {
  const { data: fellowshipsRes } = useFellowships(memberId ? { memberId, limit: 100 } : undefined);
  const { data: myDepts } = useMyDepartments();

  const fellowships = (fellowshipsRes?.data ?? []) as Array<{
    id: string;
    fellowshipName: string;
    leaderId?: string | null;
    coLeaderId?: string | null;
  }>;
  const depts = (myDepts ?? []) as Array<{
    id: string;
    departmentName?: string;
    leadMemberId?: string | null;
    deputyMemberId?: string | null;
  }>;

  const fellowshipRoles = fellowships.flatMap((f) => {
    if (!memberId) return [];
    if (f.leaderId === memberId) return [{ key: f.id, label: `Lead — ${f.fellowshipName} fellowship`, href: `/fellowships/${f.id}` }];
    if (f.coLeaderId === memberId) return [{ key: f.id, label: `Co-lead — ${f.fellowshipName} fellowship`, href: `/fellowships/${f.id}` }];
    return [];
  });

  const deptRoles = depts.flatMap((d) => {
    if (!memberId) return [];
    const name = d.departmentName ?? 'Department';
    if (d.leadMemberId === memberId) return [{ key: d.id, label: `Lead — ${name} department`, href: `/departments/${d.id}` }];
    if (d.deputyMemberId === memberId) return [{ key: d.id, label: `Deputy — ${name} department`, href: `/departments/${d.id}` }];
    return [];
  });

  const churchRoles: { key: string; label: string; href?: string }[] = [];
  if (showAdminRole) churchRoles.push({ key: 'admin', label: 'Church administrator' });
  if (showPastorRole) {
    churchRoles.push({
      key: 'pastor',
      label: homeBranchName ? `Pastor — ${homeBranchName} branch` : 'Pastor',
    });
  }

  const total = churchRoles.length + fellowshipRoles.length + deptRoles.length;
  if (total === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">My leadership</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2 text-sm">
          {churchRoles.map((r) => (
            <li key={r.key} className="flex items-center gap-2 font-medium">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#5D3FD3]" aria-hidden />
              {r.label}
            </li>
          ))}
          {fellowshipRoles.map((r) => (
            <li key={`f-${r.key}`}>
              <Link href={r.href} className="inline-flex items-center gap-2 font-medium hover:underline">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#5D3FD3]" aria-hidden />
                {r.label}
              </Link>
            </li>
          ))}
          {deptRoles.map((r) => (
            <li key={`d-${r.key}`}>
              <Link href={r.href} className="inline-flex items-center gap-2 font-medium hover:underline">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#f8b537]" aria-hidden />
                {r.label}
              </Link>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
