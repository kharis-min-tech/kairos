'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useBranches, useDeleteBranch, useRegions } from '@/hooks/use-branches';
import { Button, CustomSelect } from '@kairos/ui';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@kairos/ui';
import { useAuthStore } from '@/lib/auth-store';
import { useConfirm } from '@/components/confirm-dialog';

export default function BranchesPage() {
  const router = useRouter();
  const activeRole = useAuthStore((s) => s.activeRole);
  const { data: branches, isLoading, error } = useBranches();
  const { data: regions } = useRegions();
  const deleteBranch = useDeleteBranch();
  const isAdmin = activeRole === 'admin';
  const [regionFilter, setRegionFilter] = useState('');
  const { confirm, dialog: confirmDialog } = useConfirm();

  // Second-level guard — admin-only page (sidebar already filters, this catches
  // direct URL access / stale bookmarks / programmatic redirects).
  useEffect(() => {
    if (activeRole && activeRole !== 'admin') router.replace('/');
  }, [activeRole, router]);

  if (isLoading) {
    return (
      <div aria-busy="true" aria-live="polite" className="space-y-3">
        <div className="h-9 w-40 animate-pulse rounded bg-muted/60" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-44 animate-pulse rounded-lg bg-muted/60" />
          ))}
        </div>
        <span className="sr-only">Loading branches</span>
      </div>
    );
  }

  if (error) {
    return (
      <div role="alert" className="rounded-lg bg-destructive/10 p-4">
        <p className="text-sm font-medium text-destructive">Failed to load branches. Please try again.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Branches</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Manage church branches and locations</p>
        </div>
        {isAdmin && (
          <Link href="/admin/branches/new">
            <Button size="sm">+ New Branch</Button>
          </Link>
        )}
      </div>

      {/* Region Filter */}
      <div className="flex items-center gap-2">
        <CustomSelect
          size="sm"
          value={regionFilter}
          onValueChange={setRegionFilter}
          placeholder="All Regions"
          options={[
            { value: '', label: 'All Regions' },
            ...(regions ?? []).map((r) => ({ value: r.id, label: r.regionName })),
          ]}
        />
      </div>

      {!branches || branches.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground">No branches found.</p>
            {isAdmin && (
              <Link href="/admin/branches/new" className="mt-4">
                <Button variant="outline">Create your first branch</Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {branches
            .filter((b) => !regionFilter || b.regionId === regionFilter)
            .map((branch) => (
            <Link key={branch.id} href={`/admin/branches/${branch.id}`}>
              <Card className="transition-all hover:shadow-md hover:-translate-y-0.5">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base leading-snug">{branch.branchName}</CardTitle>
                    <span className="flex-shrink-0 rounded-full bg-[#5D3FD3]/15 px-2.5 py-0.5 text-xs font-medium text-[#5D3FD3] dark:text-[#a78bfa]">
                      {branch.branchType}
                    </span>
                  </div>
                  <CardDescription>{branch.regionName ?? 'No region'}</CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-1 text-sm text-muted-foreground">
                    {branch.city && <p>{branch.city}</p>}
                    {branch.email && <p className="truncate">{branch.email}</p>}
                    {branch.phone && <p>{branch.phone}</p>}
                  </div>
                  {isAdmin && (
                    <div className="mt-4">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={async (e) => {
                          e.preventDefault();
                          const ok = await confirm({
                            title: `Deactivate ${branch.branchName}?`,
                            description: 'The branch will be hidden from active lists. You can reactivate it later.',
                            confirmLabel: 'Deactivate',
                            variant: 'destructive',
                          });
                          if (!ok) return;
                          deleteBranch.mutate(branch.id, {
                            onSuccess: () => toast.success('Branch deactivated.'),
                            onError: () => toast.error('Failed to deactivate branch. Please try again.'),
                          });
                        }}
                      >
                        Deactivate
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {confirmDialog}
    </div>
  );
}
