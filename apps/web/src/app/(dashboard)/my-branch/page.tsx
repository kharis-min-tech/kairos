'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useBranch, useBranchLeadership } from '@/hooks/use-branches';
import { useCapabilities } from '@/hooks/use-capabilities';
import { useMembers } from '@/hooks/use-members';
import { useAuthStore } from '@/lib/auth-store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@kairos/ui';
import { Button } from '@kairos/ui';
import { useTranslation } from 'react-i18next';

export default function MyBranchPage() {  const { t } = useTranslation(['branches', 'common']);

  const caps = useCapabilities();
  const router = useRouter();
  const { user, activeRole } = useAuthStore();
  const branchId = user?.homeBranchId ?? '';
  const isAdminOrPastor = caps.has('branch:write');

  // Second-level guard — sidebar gates to pastor; mirror that here for direct-URL access.
  useEffect(() => {
    if (activeRole && !isAdminOrPastor) router.replace('/');
  }, [activeRole, isAdminOrPastor, router]);

  const { data: branch, isLoading: branchLoading } = useBranch(branchId);
  const { data: leadership, isLoading: leadershipLoading } = useBranchLeadership(branchId);
  const { data: membersData } = useMembers(branchId ? { branchId, limit: 1 } : undefined);

  if (!branchId) {
    return (
      <div role="alert" className="rounded-lg bg-[#f8b537]/10 p-4">
        <p className="text-sm font-medium text-[#9a6b04] dark:text-[#f8b537]">{t('branches:noHomeBranchAssignedToYour')}</p>
      </div>
    );
  }

  if (branchLoading) {
    return (
      <div aria-busy="true" aria-live="polite" className="space-y-3">
        <div className="h-9 w-56 animate-pulse rounded bg-muted/60" />
        <div className="h-56 animate-pulse rounded-lg bg-muted/60" />
        <div className="h-40 animate-pulse rounded-lg bg-muted/60" />
        <span className="sr-only">{t('branches:loadingBranch')}</span>
      </div>
    );
  }

  if (!branch) {
    return (
      <div role="alert" className="rounded-lg bg-destructive/10 p-4">
        <p className="text-sm font-medium text-destructive">{t('branches:branchNotFound')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between pb-6">
        <div>
          <p className="text-xs font-medium text-muted-foreground">{t('branches:myBranch')}</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">{branch.branchName}</h1>
          <p className="mt-0.5 text-sm text-muted-foreground capitalize">{branch.branchType}</p>
        </div>
        {isAdminOrPastor && (
          <Link href={`/admin/branches/${branchId}`}>
            <Button variant="outline" size="sm">{t('branches:manage')}</Button>
          </Link>
        )}
      </div>

      {/* Branch Info */}
      <Card>
        <CardHeader>
          <CardTitle>{t('branches:branchDetails')}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          {branch.city && (
            <div>
              <p className="text-sm font-medium text-muted-foreground">{t('branches:city')}</p>
              <p>{branch.city}</p>
            </div>
          )}
          {branch.address && (
            <div>
              <p className="text-sm font-medium text-muted-foreground">{t('branches:address')}</p>
              <p>{branch.address}</p>
            </div>
          )}
          {branch.phone && (
            <div>
              <p className="text-sm font-medium text-muted-foreground">{t('branches:phone')}</p>
              <p>{branch.phone}</p>
            </div>
          )}
          {branch.email && (
            <div>
              <p className="text-sm font-medium text-muted-foreground">{t('branches:email')}</p>
              <p>{branch.email}</p>
            </div>
          )}
          <div>
            <p className="text-sm font-medium text-muted-foreground">{t('branches:totalMembers')}</p>
            <p>{membersData?.meta?.total ?? '—'}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">{t('branches:status')}</p>
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
              branch.isActive ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
            }`}>
              {branch.isActive ? t('common:active') : t('common:inactive')}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Leadership */}
      <Card>
        <CardHeader>
          <CardTitle>{t('branches:currentLeadership')}</CardTitle>
          <CardDescription>{t('branches:branchLeadershipTeam')}</CardDescription>
        </CardHeader>
        <CardContent>
          {leadershipLoading ? (
            <p className="text-sm text-muted-foreground">{t('branches:loading')}</p>
          ) : !leadership || leadership.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('branches:noLeadershipAssignedYet')}</p>
          ) : (
            <div className="space-y-3">
              {leadership.map((leader) => {
                const initials = ((leader.memberFirstName?.[0] ?? '') + (leader.memberLastName?.[0] ?? '')).toUpperCase() || '?';
                return (
                  <div key={leader.id} className="flex items-center gap-3 rounded-lg bg-muted p-3">
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[#5D3FD3]/15 text-sm font-bold text-[#5D3FD3] dark:text-[#a78bfa]">
                      {initials}
                    </div>
                    <div>
                      <p className="font-medium">{leader.memberFirstName} {leader.memberLastName}</p>
                      <p className="text-sm text-muted-foreground">{leader.role}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pastor Quick Actions */}
      {isAdminOrPastor && (
        <Card>
          <CardHeader>
            <CardTitle>{t('branches:quickActions')}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Link
              href="/members"
              className="inline-flex items-center gap-1.5 rounded-lg border border-input/15 bg-background px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >{t('branches:viewMembers')}</Link>
            <Link
              href="/fellowships"
              className="inline-flex items-center gap-1.5 rounded-lg border border-input/15 bg-background px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >{t('branches:viewFellowships')}</Link>
            <Link
              href="/reports"
              className="inline-flex items-center gap-1.5 rounded-lg border border-input/15 bg-background px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >{t('branches:reports')}</Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
