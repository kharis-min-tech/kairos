'use client';

import { useState } from 'react';
import {
  Button,
  CustomSelect,
  Card,
  CardContent,
  Badge,
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@kairos/ui';
import { DateSelect } from '@/components/date-select';
import { Download } from 'lucide-react';
import { formatShortDate } from '@/lib/date-format';
import {
  useFormSubmissions,
  useExportFormSubmissions,
  useMyFormCapabilities,
} from '@/hooks/use-forms';
import {
  FORM_META,
  FORM_TYPES,
  STATUS_META,
  STATUS_OPTIONS,
  subjectName,
} from '../_lib/form-meta';
import { ReviewDrawer } from './_components/review-drawer';
import type { FormSubmission, FormType, FormSubmissionStatus } from '@kairos/types';

export default function SubmissionsPage() {
  const { data: capabilities, isLoading: capLoading } = useMyFormCapabilities();
  const visibleSet = capabilities?.visibleFormTypes ?? [];
  const canSeeAny = visibleSet.length > 0;

  const [formType, setFormType] = useState<FormType | ''>('');
  const [status, setStatus] = useState<FormSubmissionStatus | ''>('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [selected, setSelected] = useState<FormSubmission | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const { data, isLoading, isError, error } = useFormSubmissions(
    {
      formType: formType || undefined,
      status: status || undefined,
      from: from || undefined,
      to: to || undefined,
    },
    { enabled: canSeeAny },
  );
  const exportCsv = useExportFormSubmissions();

  if (capLoading) {
    return (
      <div aria-busy="true" aria-live="polite" className="space-y-3">
        <div className="h-32 animate-pulse rounded-xl bg-muted/60" />
        <span className="sr-only">Loading submissions</span>
      </div>
    );
  }

  if (!canSeeAny) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <h1 className="text-2xl font-bold text-foreground">Not authorised</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Form review is restricted to the Admin-department members, NB-department leader, pastors, and admins.
        </p>
      </div>
    );
  }

  async function handleExport() {
    if (!formType) return;
    const blob = await exportCsv.mutateAsync({
      formType,
      status: status || undefined,
      from: from || undefined,
      to: to || undefined,
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${formType}-submissions.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function openReview(s: FormSubmission) {
    setSelected(s);
    setDrawerOpen(true);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Form Submissions</h1>
          <p className="mt-1 text-muted-foreground">Review and triage captured forms.</p>
        </div>
        <Button
          onClick={handleExport}
          disabled={!formType || exportCsv.isPending}
          title={!formType ? 'Select a form type to export' : undefined}
          className="bg-[#5D3FD3] hover:bg-[#451ebb]"
        >
          <Download className="mr-2 h-4 w-4" />
          {exportCsv.isPending ? 'Exporting…' : 'Export CSV'}
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="grid gap-4 py-5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Form type</label>
            <CustomSelect
              value={formType}
              onValueChange={(v) => setFormType(v as FormType | '')}
              placeholder="All forms"
              options={[
                { value: '', label: 'All forms' },
                ...FORM_TYPES
                  .filter((t) => visibleSet.includes(t))
                  .map((t) => ({ value: t, label: FORM_META[t].title })),
              ]}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Status</label>
            <CustomSelect
              value={status}
              onValueChange={(v) => setStatus(v as FormSubmissionStatus | '')}
              placeholder="All statuses"
              options={[{ value: '', label: 'All statuses' }, ...STATUS_OPTIONS]}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">From</label>
            <DateSelect value={from} onChange={setFrom} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">To</label>
            <DateSelect value={to} onChange={setTo} />
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-12 animate-pulse rounded-lg bg-foreground/5" />
          ))}
        </div>
      ) : isError ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-destructive">
            {error instanceof Error ? error.message : 'Failed to load submissions.'}
          </CardContent>
        </Card>
      ) : !data || data.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No submissions match these filters.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Subject</TableHead>
                <TableHead>Form</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Submitted</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((s) => {
                const payload = s.payload as unknown as Record<string, unknown>;
                const anonymous =
                  s.formType === 'testimony' && payload.shareAnonymously === true;
                const statusMeta = STATUS_META[s.status];
                return (
                  <TableRow
                    key={s.id}
                    onClick={() => openReview(s)}
                    className="cursor-pointer"
                  >
                    <TableCell className="font-medium">
                      {anonymous ? (
                        <span className="italic text-muted-foreground">(anonymous)</span>
                      ) : (
                        subjectName(payload)
                      )}
                    </TableCell>
                    <TableCell>{FORM_META[s.formType].title}</TableCell>
                    <TableCell>
                      <Badge className={statusMeta.className}>{statusMeta.label}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatShortDate(s.createdAt)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      <ReviewDrawer submission={selected} open={drawerOpen} onOpenChange={setDrawerOpen} />
    </div>
  );
}
