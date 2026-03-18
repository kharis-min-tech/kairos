'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMembers, useDeactivateMember } from '@/hooks/use-members';
import { Button } from '@kairos/ui';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@kairos/ui';
import { Input } from '@kairos/ui';
import { useAuthStore } from '@/lib/auth-store';
import type { MemberListParams } from '@kairos/types';

export default function MembersPage() {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.systemRole === 'admin';
  const [params, setParams] = useState<MemberListParams>({ page: 1, limit: 20 });
  const [searchInput, setSearchInput] = useState('');
  const { data: result, isLoading, error } = useMembers(params);
  const deactivate = useDeactivateMember();

  const members = result?.data;
  const pagination = result?.meta;

  function handleSearch() {
    setParams((prev) => ({ ...prev, search: searchInput || undefined, page: 1 }));
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Loading members...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4">
        <p className="text-sm text-destructive">Failed to load members. Please try again.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Members</h1>
          <p className="text-muted-foreground">
            Church member directory{pagination ? ` \u2014 ${pagination.total} total` : ''}
          </p>
        </div>
        {isAdmin && (
          <Link href="/members/approval">
            <Button variant="outline">Approval Queue</Button>
          </Link>
        )}
      </div>

      {/* Search */}
      <div className="flex gap-2">
        <Input
          placeholder="Search by name or email..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          className="max-w-sm"
        />
        <Button variant="outline" onClick={handleSearch}>Search</Button>
        {params.search && (
          <Button variant="ghost" onClick={() => { setSearchInput(''); setParams((p) => ({ ...p, search: undefined, page: 1 })); }}>
            Clear
          </Button>
        )}
      </div>

      {!members || members.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground">No members found.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {members.map((member) => (
              <Link key={member.id} href={`/members/${member.id}`}>
                <Card className="transition-shadow hover:shadow-md">
                  <CardHeader>
                    <CardTitle className="text-lg">
                      {member.firstName} {member.lastName}
                    </CardTitle>
                    <CardDescription>
                      {member.branchName} &middot;{' '}
                      <span className={
                        member.approvalStatus === 'approved' ? 'text-emerald-600' :
                        member.approvalStatus === 'pending' ? 'text-amber-600' :
                        'text-rose-600'
                      }>
                        {member.approvalStatus}
                      </span>
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <p>{member.email}</p>
                      {member.phone && <p>{member.phone}</p>}
                      <p className="capitalize">{member.systemRole}</p>
                    </div>
                    {isAdmin && (
                      <div className="mt-4">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={(e) => {
                            e.preventDefault();
                            if (confirm(`Deactivate ${member.firstName} ${member.lastName}?`)) {
                              deactivate.mutate(member.id);
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

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page <= 1}
                onClick={() => setParams((p) => ({ ...p, page: (p.page ?? 1) - 1 }))}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => setParams((p) => ({ ...p, page: (p.page ?? 1) + 1 }))}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
