'use client';

import Link from 'next/link';
import {
  ArrowLeft,
  ShieldCheck,
  ShieldAlert,
  KeyRound,
  UserPlus,
  UserMinus,
  Mail,
  MailWarning,
} from 'lucide-react';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@kairos/ui';
import {
  AUDIT_ACTION_LABEL,
  AuditAction,
  type AuditLogRow,
} from '@kairos/types';
import { useMyAuditLog } from '@/hooks/use-audit-log';

function actionIcon(action: AuditAction) {
  switch (action) {
    case AuditAction.SigninSuccess:
      return <ShieldCheck className="h-4 w-4 text-[#5D3FD3]" />;
    case AuditAction.SigninFailure:
      return <ShieldAlert className="h-4 w-4 text-destructive" />;
    case AuditAction.PasswordChange:
      return <KeyRound className="h-4 w-4 text-[#5D3FD3]" />;
    case AuditAction.RoleGranted:
      return <UserPlus className="h-4 w-4 text-[#5D3FD3]" />;
    case AuditAction.RoleRevoked:
      return <UserMinus className="h-4 w-4 text-destructive" />;
    case AuditAction.EmailChangeRequested:
    case AuditAction.EmailChangeConfirmed:
      return <Mail className="h-4 w-4 text-[#5D3FD3]" />;
    case AuditAction.EmailChangeReverted:
      return <MailWarning className="h-4 w-4 text-destructive" />;
    default:
      return <ShieldCheck className="h-4 w-4 text-muted-foreground" />;
  }
}

function formatLocation(entry: AuditLogRow): string {
  return [entry.country, entry.ip].filter(Boolean).join(' · ') || '—';
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString('en-GB');
}

export default function SecuritySettingsPage() {
  const { data, isLoading, isError, error } = useMyAuditLog();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 pb-2">
        <Link href="/profile/settings">
          <Button variant="ghost" size="sm" className="gap-1">
            <ArrowLeft className="h-4 w-4" /> Settings
          </Button>
        </Link>
      </div>

      <div className="pb-4">
        <h1 className="text-2xl font-bold tracking-tight">Recent security activity</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Your last 50 sign-ins, password changes, and role updates.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="h-4 w-4 text-[#5D3FD3]" aria-hidden /> Activity log
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {isLoading && (
            <div className="py-8 text-center text-sm text-muted-foreground">
              Loading activity…
            </div>
          )}
          {isError && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              Couldn&apos;t load activity: {error instanceof Error ? error.message : 'Unknown error'}
            </div>
          )}
          {data && data.entries.length === 0 && (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No activity recorded yet.
            </div>
          )}
          {data?.entries.map((entry, idx) => (
            <div
              key={entry.id}
              className={`flex items-start gap-3 py-3 ${idx > 0 ? 'border-t' : ''}`}
            >
              <div className="mt-0.5 shrink-0">{actionIcon(entry.action)}</div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">{AUDIT_ACTION_LABEL[entry.action]}</p>
                  {entry.outcome === 'failure' && (
                    <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-destructive">
                      Failed
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{formatTime(entry.createdAt)}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{formatLocation(entry)}</p>
                {entry.userAgent && (
                  <p className="mt-0.5 truncate text-[11px] text-muted-foreground/80">
                    {entry.userAgent}
                  </p>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
