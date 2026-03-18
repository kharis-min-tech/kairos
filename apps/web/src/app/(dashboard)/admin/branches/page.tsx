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
      <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4">
        <p className="text-sm text-destructive">Failed to load branches. Please try again.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Branches</h1>
          <p className="text-muted-foreground">Manage church branches and locations</p>
        </div>
        {isAdmin && (
          <Link href="/admin/branches/new">
            <Button>Create Branch</Button>
          </Link>
        )}
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
              <Card className="transition-shadow hover:shadow-md">
                <CardHeader>
                  <CardTitle className="text-lg">{branch.branchName}</CardTitle>
                  <CardDescription>
                    {branch.regionName ?? 'No region'} &middot; {branch.branchType}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    {branch.city && <p>{branch.city}</p>}
                    {branch.email && <p>{branch.email}</p>}
                    {branch.phone && <p>{branch.phone}</p>}
                  </div>
                  {isAdmin && (
                    <div className="mt-4 flex gap-2">
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
