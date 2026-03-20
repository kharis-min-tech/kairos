'use client';

import Link from 'next/link';
import { useBranches, useDeleteBranch } from '@/hooks/use-branches';
import { Button } from '@kairos/ui';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@kairos/ui';
import { useAuthStore } from '@/lib/auth-store';

export default function BranchesPage() {
  const { data: branches, isLoading, error } = useBranches();
  const deleteBranch = useDeleteBranch();
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.systemRole === 'admin';

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Loading branches...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md border border-rose-200 bg-rose-50 p-4">
        <p className="text-sm text-rose-700">Failed to load branches. Please try again.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Purple gradient header */}
      <div className="-mx-6 -mt-6 rounded-b-2xl bg-gradient-to-br from-purple-900 to-purple-700 px-6 py-7 text-white">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">Branches</h1>
            <p className="mt-0.5 text-sm text-purple-200">Manage church branches and locations</p>
          </div>
          {isAdmin && (
            <Link href="/admin/branches/new">
              <button className="rounded-lg border border-white/30 bg-white/10 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-white/20">
                + New Branch
              </button>
            </Link>
          )}
        </div>
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
          {branches.map((branch) => (
            <Link key={branch.id} href={`/admin/branches/${branch.id}`}>
              <Card className="transition-all hover:shadow-md hover:-translate-y-0.5">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base leading-snug">{branch.branchName}</CardTitle>
                    <span className="flex-shrink-0 rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-700">
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
                        onClick={(e) => {
                          e.preventDefault();
                          if (confirm('Deactivate this branch?')) {
                            deleteBranch.mutate(branch.id);
                          }
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
    </div>
  );
}
