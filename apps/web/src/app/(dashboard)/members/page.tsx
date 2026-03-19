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
      <div className="rounded-md border border-rose-200 bg-rose-50 p-4">
        <p className="text-sm text-rose-700">Failed to load members. Please try again.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Purple gradient header */}
      <div className="-mx-6 -mt-6 rounded-b-2xl bg-gradient-to-br from-purple-900 to-purple-700 px-6 py-7 text-white">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">Members</h1>
            <p className="mt-0.5 text-sm text-purple-200">
              Church member directory{pagination ? ` \u2014 ${pagination.total} total` : ''}
            </p>
          </div>
          {isAdmin && (
            <Link href="/members/approval">
              <button className="rounded-lg border border-white/30 bg-white/10 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-white/20">
                Approval Queue
              </button>
            </Link>
          )}
        </div>
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
        <Button onClick={handleSearch} className="bg-purple-600 text-white hover:bg-purple-700">
          Search
        </Button>
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
            {members.map((member) => {
              const initials = ((member.firstName?.[0] ?? '') + (member.lastName?.[0] ?? '')).toUpperCase() || '?';
              const statusCls =
                member.approvalStatus === 'approved' ? 'bg-emerald-100 text-emerald-700'
                : member.approvalStatus === 'pending' ? 'bg-amber-100 text-amber-700'
                : 'bg-rose-100 text-rose-700';
              return (
                <Link key={member.id} href={`/members/${member.id}`}>
                  <Card className="transition-all hover:shadow-md hover:-translate-y-0.5">
                    <CardHeader className="pb-3">
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-purple-100 text-sm font-bold text-purple-700">
                          {initials}
                        </div>
                        <div className="min-w-0 flex-1">
                          <CardTitle className="truncate text-base">
                            {member.firstName} {member.lastName}
                          </CardTitle>
                          <CardDescription className="truncate">{member.branchName}</CardDescription>
                        </div>
                        <span className={`flex-shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${statusCls}`}>
                          {member.approvalStatus}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="space-y-1 text-sm text-muted-foreground">
                        <p className="truncate">{member.email}</p>
                        {member.phone && <p>{member.phone}</p>}
                        <p className="text-xs capitalize">{member.systemRole}</p>
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
              );
            })}
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
