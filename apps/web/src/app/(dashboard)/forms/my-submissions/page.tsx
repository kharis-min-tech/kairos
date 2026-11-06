'use client';

export const runtime = 'edge';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { Card, CardContent, EmptyState, StatusText } from '@kairos/ui';
import {
  FORM_DEFINITIONS,
  isAwaitingAction,
  type FormSubmission,
  type FormType,
} from '@kairos/types';
import { formatShortDate } from '@kairos/core';
import { useMyFormSubmissions } from '@/hooks/use-forms';

/*
 * Deliberately not the triage labels from @kairos/types. A member is being
 * told what happened to the form they sent, not what job it is: "Received"
 * rather than "New", "Actioned" rather than "Converted".
 */
const STATUS_LABEL: Record<string, string> = {
  new: 'Received',
  reviewed: 'Reviewed',
  converted: 'Actioned',
  dismissed: 'Closed',
};

/**
 * Your own form submissions.
 *
 * Web had no equivalent of the mobile screen, so somebody who filled a form on
 * a laptop had no way to see what they had sent or what became of it. The
 * endpoint and the client method were already there; nothing called them.
 *
 * No capability gate: the list is `submittedBy = me`, so it cannot show
 * anybody else's. Opening a row is the same rule, enforced server-side.
 */
export default function MyFormSubmissionsPage() {
  const { data, isLoading } = useMyFormSubmissions();
  const [openId, setOpenId] = useState<string | null>(null);

  const rows = data ?? [];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href="/forms"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" /> Back to forms
      </Link>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">My submissions</h1>
        <p className="text-sm text-muted-foreground">
          Everything you have submitted, and where each one has got to.
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-3" aria-busy="true">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-muted/40" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          variant="screen"
          title="Nothing submitted yet"
          message="Forms you fill in will appear here so you can check back on them."
        />
      ) : (
        <div className="space-y-3">
          {rows.map((row) => (
            <SubmissionRow
              key={row.id}
              row={row}
              expanded={openId === row.id}
              onToggle={() => setOpenId(openId === row.id ? null : row.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SubmissionRow({
  row,
  expanded,
  onToggle,
}: {
  row: FormSubmission;
  expanded: boolean;
  onToggle: () => void;
}) {
  const definition = FORM_DEFINITIONS[row.formType as FormType];
  const statusLabel = STATUS_LABEL[row.status] ?? row.status;
  const payload = (row.payload ?? {}) as unknown as Record<string, unknown>;
  // Member ids are plumbing; the typed name sits beside them under its own key.
  const entries = Object.entries(payload).filter(([k]) => !/MemberId$/.test(k));

  function labelFor(key: string): string {
    const field = definition?.blocks
      .flatMap((b) => b.fields)
      .find((f) => f.id === key || f.freeTextFieldId === key);
    if (field) return field.id === key ? field.label : `${field.label} (typed in)`;
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (ch) => ch.toUpperCase())
      .trim();
  }

  function renderValue(value: unknown): string {
    if (value === null || value === undefined || value === '') return '—';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (Array.isArray(value)) return value.length ? `${value.length} entered` : '—';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  }

  return (
    <Card>
      <CardContent className="p-0">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={expanded}
          className="flex w-full items-center gap-3 p-4 text-left hover:bg-muted/40"
        >
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-2">
              <span className="truncate text-sm font-medium">
                {definition?.title ?? row.formType}
              </span>
              <StatusText
                label={statusLabel}
                awaiting={isAwaitingAction('formSubmission', row.status)}
              />
            </span>
            <span className="block text-xs text-muted-foreground">
              {formatShortDate(row.createdAt as unknown as string)}
              {row.branchName ? ` · ${row.branchName}` : ''}
            </span>
          </span>
        </button>

        {expanded ? (
          <dl className="grid gap-3 border-t border-border/60 p-4 sm:grid-cols-2">
            {entries.length === 0 ? (
              <p className="text-sm text-muted-foreground">No answers recorded.</p>
            ) : (
              entries.map(([key, value]) => (
                <div key={key}>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {labelFor(key)}
                  </dt>
                  <dd className="text-sm text-foreground">{renderValue(value)}</dd>
                </div>
              ))
            )}
          </dl>
        ) : null}
      </CardContent>
    </Card>
  );
}
