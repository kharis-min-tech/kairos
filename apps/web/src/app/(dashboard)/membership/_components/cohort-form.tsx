'use client';

import { useState, type ReactNode } from 'react';
import {
  Card,
  CardContent,
  Button,
  Input,
  Label,
  Textarea,
  CustomSelect,
  Checkbox,
} from '@kairos/ui';
import { DateSelect } from '@/components/date-select';
import type {
  CreateMembershipCohortRequest,
  MembershipCohortStatus,
} from '@kairos/types';
import { useTranslation } from 'react-i18next';

/**
 * Create / edit form for a membership cohort. Shared by `/membership/new` and
 * `/membership/edit/[id]` the same way `_form.tsx` is shared on mobile — the
 * two surfaces have identical fields, validation, and submit shape.
 *
 * No branch picker: cohorts are church-wide and carry no `branchId`. That is
 * deliberate, not an omission — see packages/database/src/schema/membership.ts
 * and the design notes in packages/types/src/membership.ts.
 */
export interface CohortFormInitial {
  name?: string;
  description?: string;
  startDate?: string;
  graduationDate?: string;
  finalTestDeadline?: string;
  status?: MembershipCohortStatus;
  enrolmentOpen?: boolean;
  homeworkPassMark?: number;
  quizPassMark?: number;
  finalTestPassMark?: number;
  notes?: string;
}

interface CohortFormProps {
  initial?: CohortFormInitial;
  /** Status is meaningless before a cohort exists, so create hides it. */
  showStatus?: boolean;
  submitLabel: string;
  submitPendingLabel?: string;
  submitting: boolean;
  serverError?: string | null;
  onCancel: () => void;
  onSubmit: (payload: CreateMembershipCohortRequest) => void | Promise<void>;
  footer?: ReactNode;
}

const STATUSES: ReadonlyArray<MembershipCohortStatus> = [
  'planned',
  'active',
  'completed',
  'cancelled',
];

export function CohortForm({
  initial,
  showStatus = false,
  submitLabel,
  submitPendingLabel,
  submitting,
  serverError,
  onCancel,
  onSubmit,
  footer,
}: CohortFormProps) {  const { t } = useTranslation(['membership', 'common']);

  const [name, setName] = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [startDate, setStartDate] = useState(initial?.startDate ?? '');
  const [graduationDate, setGraduationDate] = useState(initial?.graduationDate ?? '');
  const [finalTestDeadline, setFinalTestDeadline] = useState(initial?.finalTestDeadline ?? '');
  const [status, setStatus] = useState<MembershipCohortStatus>(initial?.status ?? 'planned');
  const [enrolmentOpen, setEnrolmentOpen] = useState(initial?.enrolmentOpen ?? true);
  const [homeworkPassMark, setHomeworkPassMark] = useState(
    initial?.homeworkPassMark?.toString() ?? '50',
  );
  const [quizPassMark, setQuizPassMark] = useState(initial?.quizPassMark?.toString() ?? '50');
  const [finalTestPassMark, setFinalTestPassMark] = useState(
    initial?.finalTestPassMark?.toString() ?? '50',
  );
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});

  function clearError(key: string) {
    setErrors((p) => {
      if (!p[key]) return p;
      const next = { ...p };
      delete next[key];
      return next;
    });
  }

  function markError(mark: string): string | null {
    if (!mark.trim()) return 'Required';
    const n = Number(mark);
    if (!Number.isInteger(n) || n < 0 || n > 100) return 'Must be a whole number 0-100';
    return null;
  }

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (name.trim().length < 2) next['name'] = 'Give the cohort a name, e.g. "Autumn 2026"';
    if (!startDate) next['startDate'] = 'A start date is required';
    if (graduationDate && startDate && graduationDate < startDate) {
      next['graduationDate'] = 'The induction cannot be before the start date';
    }
    const hw = markError(homeworkPassMark);
    if (hw) next['homeworkPassMark'] = hw;
    const qz = markError(quizPassMark);
    if (qz) next['quizPassMark'] = qz;
    const ft = markError(finalTestPassMark);
    if (ft) next['finalTestPassMark'] = ft;
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit() {
    if (!validate()) return;
    const payload: CreateMembershipCohortRequest = {
      name: name.trim(),
      startDate,
      homeworkPassMark: Number(homeworkPassMark),
      quizPassMark: Number(quizPassMark),
      finalTestPassMark: Number(finalTestPassMark),
      enrolmentOpen,
    };
    if (description.trim()) payload.description = description.trim();
    if (graduationDate) payload.graduationDate = graduationDate;
    if (finalTestDeadline) payload.finalTestDeadline = finalTestDeadline;
    if (notes.trim()) payload.notes = notes.trim();
    if (showStatus) payload.status = status;
    void onSubmit(payload);
  }

  return (
    <Card>
      <CardContent className="space-y-5 py-5">
        <section className="space-y-4">
          <h2 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{t('membership:details')}</h2>
          <div className="grid gap-1.5">
            <Label htmlFor="cohort-name">{t('membership:cohortName')}</Label>
            <Input
              id="cohort-name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                clearError('name');
              }}
              placeholder={t('membership:autumn')}
            />
            {errors['name'] ? <p className="text-xs text-destructive">{errors['name']}</p> : null}
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="cohort-description">Description (optional)</Label>
            <Textarea
              id="cohort-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="grid gap-1.5">
              <Label>{t('membership:startDate')}</Label>
              <DateSelect
                value={startDate}
                onChange={(v) => {
                  setStartDate(v);
                  clearError('startDate');
                }}
              />
              {errors['startDate'] ? (
                <p className="text-xs text-destructive">{errors['startDate']}</p>
              ) : null}
            </div>
            <div className="grid gap-1.5">
              <Label>{t('membership:inductionCeremony')}</Label>
              <DateSelect
                value={graduationDate}
                onChange={(v) => {
                  setGraduationDate(v);
                  clearError('graduationDate');
                }}
              />
              {errors['graduationDate'] ? (
                <p className="text-xs text-destructive">{errors['graduationDate']}</p>
              ) : null}
            </div>
            <div className="grid gap-1.5">
              <Label>{t('membership:finalTestDeadline')}</Label>
              <DateSelect value={finalTestDeadline} onChange={setFinalTestDeadline} />
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{t('membership:passMarks')}</h2>
          <p className="text-xs text-muted-foreground">{t('membership:wholeNumberDefaultsAreForEach')}</p>
          <div className="grid gap-4 sm:grid-cols-3">
            <PassMarkField
              label={t('membership:homework')}
              value={homeworkPassMark}
              onChange={(v) => {
                setHomeworkPassMark(v);
                clearError('homeworkPassMark');
              }}
              error={errors['homeworkPassMark']}
            />
            <PassMarkField
              label={t('membership:quiz')}
              value={quizPassMark}
              onChange={(v) => {
                setQuizPassMark(v);
                clearError('quizPassMark');
              }}
              error={errors['quizPassMark']}
            />
            <PassMarkField
              label={t('membership:finalTest')}
              value={finalTestPassMark}
              onChange={(v) => {
                setFinalTestPassMark(v);
                clearError('finalTestPassMark');
              }}
              error={errors['finalTestPassMark']}
            />
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{t('membership:admission')}</h2>
          <label className="flex items-start gap-3 rounded-md border border-border bg-muted/30 px-4 py-3 cursor-pointer">
            <Checkbox
              id="cohort-enrolment-open"
              checked={enrolmentOpen}
              onChange={(e) => setEnrolmentOpen(e.target.checked)}
            />
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">{t('membership:enrolmentOpen')}</p>
              <p className="text-xs text-muted-foreground">{t('membership:whenOffAdminCannotAdmitMembers')}</p>
            </div>
          </label>

          {showStatus ? (
            <div className="grid gap-1.5">
              <Label>{t('membership:cohortStatus')}</Label>
              <CustomSelect
                value={status}
                onValueChange={(v) => setStatus(v as MembershipCohortStatus)}
                options={STATUSES.map((s) => ({
                  value: s,
                  label: t(`membership:cohortStatus_${s}`),
                }))}
              />
            </div>
          ) : null}
        </section>

        <section className="space-y-4">
          <h2 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{t('membership:adminNotesOptional')}</h2>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
        </section>

        {serverError ? (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            {serverError}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onCancel} disabled={submitting}>{t('membership:cancel')}</Button>
          <Button
            className="bg-[#5D3FD3] hover:bg-[#451ebb]"
            disabled={submitting}
            onClick={handleSubmit}
          >
            {submitting ? (submitPendingLabel ?? `${submitLabel}…`) : submitLabel}
          </Button>
        </div>

        {footer}
      </CardContent>
    </Card>
  );
}

function PassMarkField({
  label,
  value,
  onChange,
  error,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
}) {
  return (
    <div className="grid gap-1.5">
      <Label>{label}</Label>
      <Input
        type="number"
        inputMode="numeric"
        min={0}
        max={100}
        step={1}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
