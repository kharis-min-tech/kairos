'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Button,
  CustomSelect,
  Textarea,
  Badge,
} from '@kairos/ui';
import { formatShortDate } from '@kairos/core';
import { useUpdateFormSubmission } from '@/hooks/use-forms';
import { FORM_META, STATUS_META, STATUS_OPTIONS } from '../../_lib/form-meta';
import type { FormSubmission, FormSubmissionStatus } from '@kairos/types';

interface ReviewDrawerProps {
  submission: FormSubmission | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Pretty labels for known payload keys.
const FIELD_LABELS: Record<string, string> = {
  todaysDate: 'Today’s date',
  firstName: 'First name',
  lastName: 'Last name',
  phone: 'Phone',
  dateOfTestimony: 'Date of testimony',
  category: 'Category',
  details: 'Details',
  shareAnonymously: 'Share anonymously',
  happyToShareSunday: 'Happy to share on Sunday',
  // Retired from the form; still present on submissions captured before
  // 2026-10-07, which must not render as a raw key.
  acknowledged: 'Acknowledged',
  babyFullName: 'Baby’s full name',
  dateOfBirth: 'Date of birth',
  gender: 'Gender',
  fathersName: 'Father’s name',
  mothersName: 'Mother’s name',
  parentsAreMembers: 'Parents are members',
  parentContactPhone: 'Parent contact phone',
  parentContactEmail: 'Parent contact email',
  preferredCeremonyDate: 'Preferred ceremony date',
  preferredDedicationDate: 'Preferred dedication date',
  additionalNotes: 'Additional notes',
  // Member references and their free-text twins. The pair is deliberately
  // labelled so a reviewer sees which one they got without decoding the key.
  guardianMemberId: 'Guardian',
  guardianName: 'Guardian',
  guardianPhone: 'Guardian phone',
  guardianRelationship: 'Relationship to guardian',
  fatherMemberId: 'Father',
  motherMemberId: 'Mother',
  invitedByMemberId: 'Invited by',
  invitedBy: 'Invited by',
};

/**
 * A member-reference key. The convention is the field id, so a new reference
 * field is readable here without another entry being added by hand.
 */
function isMemberRefKey(key: string): boolean {
  return key.endsWith('MemberId');
}

/**
 * The free-text halves of the member-reference pairs. Marked explicitly because
 * the key alone ("guardianName") doesn't say that the matching reference was
 * offered and declined — which is exactly what a reviewer needs to know.
 */
const MEMBER_FREE_TEXT_KEYS = new Set([
  'guardianName',
  'fathersName',
  'mothersName',
  'invitedBy',
]);

function renderValue(value: unknown): string {
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (value === null || value === undefined || value === '') return '—';
  return String(value);
}

/**
 * A reference is a person who can be followed up; a typed name is only a name.
 * A raw UUID under `guardianMemberId` told a reviewer neither, so a reference
 * now reads as an openable record and a typed name is marked as name-only —
 * the distinction the two keys exist to carry, visible at a glance.
 */
function MemberRefValue({ id }: { id: string }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <Link
        href={`/members/${id}`}
        className="font-medium text-[#5D3FD3] hover:underline"
      >
        Open member record
      </Link>
      <Badge
        variant="outline"
        className="border-[#5D3FD3]/25 bg-[#5D3FD3]/10 text-[#5D3FD3]"
      >
        Directory member
      </Badge>
    </span>
  );
}

export function ReviewDrawer({ submission, open, onOpenChange }: ReviewDrawerProps) {
  const update = useUpdateFormSubmission();
  const [status, setStatus] = useState<FormSubmissionStatus>('new');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (submission) {
      setStatus(submission.status);
      setNotes(submission.notes ?? '');
    }
  }, [submission]);

  if (!submission) return null;

  const payload = submission.payload as unknown as Record<string, unknown>;
  const isTestimony = submission.formType === 'testimony';
  const anonymous = isTestimony && payload.shareAnonymously === true;
  const meta = FORM_META[submission.formType];
  const statusMeta = STATUS_META[submission.status];

  // Hide submitter identity for anonymous testimonies.
  const hiddenKeys = anonymous ? new Set(['firstName', 'lastName', 'phone']) : new Set<string>();

  async function handleSave() {
    if (!submission) return;
    try {
      await update.mutateAsync({ id: submission.id, data: { status, notes: notes || null } });
      onOpenChange(false);
    } catch {
      // surfaced below
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {meta.title}
            <Badge className={statusMeta.className}>{statusMeta.label}</Badge>
          </DialogTitle>
          <DialogDescription>
            Submitted {formatShortDate(submission.createdAt)}
            {submission.branchName ? ` · ${submission.branchName} branch` : ''}
            {anonymous ? ' · (anonymous)' : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Payload */}
          <dl className="grid gap-3 sm:grid-cols-2">
            {Object.entries(payload).map(([key, value]) => {
              if (hiddenKeys.has(key)) {
                return (
                  <div key={key}>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {FIELD_LABELS[key] ?? key}
                    </dt>
                    <dd className="text-sm text-muted-foreground italic">(anonymous)</dd>
                  </div>
                );
              }
              const isRef = isMemberRefKey(key) && typeof value === 'string' && value.length > 0;
              return (
                <div key={key}>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {FIELD_LABELS[key] ?? key}
                  </dt>
                  <dd className="text-sm text-foreground break-words">
                    {isRef ? (
                      <MemberRefValue id={value as string} />
                    ) : (
                      <>
                        {renderValue(value)}
                        {MEMBER_FREE_TEXT_KEYS.has(key) ? (
                          <span className="ml-1.5 text-xs text-muted-foreground">(name only)</span>
                        ) : null}
                      </>
                    )}
                  </dd>
                </div>
              );
            })}
          </dl>

          {/* Linked entity */}
          {submission.linkedEntityId ? (
            <div className="rounded-lg bg-[#5D3FD3]/5 p-3 text-sm">
              <span className="text-muted-foreground">Linked record: </span>
              {submission.linkedEntityType === 'new_believer_enrollment' ||
              submission.formType === 'altar_call' ? (
                <Link
                  href={`/new-believers?enrollment=${submission.linkedEntityId}`}
                  className="font-medium text-[#5D3FD3] hover:underline"
                >
                  View New Believers enrollment
                </Link>
              ) : (
                <span className="font-medium text-foreground">
                  {submission.linkedEntityType} · {submission.linkedEntityId}
                </span>
              )}
            </div>
          ) : null}

          {/* Status + notes */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Status
            </label>
            <CustomSelect
              value={status}
              onValueChange={(v) => setStatus(v as FormSubmissionStatus)}
              options={STATUS_OPTIONS}
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="review-notes"
              className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
            >
              Notes
            </label>
            <Textarea
              id="review-notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add internal notes…"
            />
          </div>

          {update.isError ? (
            <p className="text-sm text-destructive">
              {update.error instanceof Error ? update.error.message : 'Failed to save.'}
            </p>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={update.isPending}
            className="bg-[#5D3FD3] hover:bg-[#451ebb]"
          >
            {update.isPending ? 'Saving…' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
