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
import { formatShortDate } from '@kairos/core';
import {
  useFormSubmissions,
  useExportFormSubmissions,
  useMyFormCapabilities,
} from '@/hooks/use-forms';
import { STATUS_META, STATUS_OPTIONS, subjectName } from '../_lib/form-meta';
import { ReviewDrawer } from './_components/review-drawer';
import { FORM_DEFINITIONS, FORM_TYPES, localiseFormDefinition } from '@kairos/types';
import type { FormSubmission, FormType, FormSubmissionStatus } from '@kairos/types';
import { useTranslation } from 'react-i18next';
import { localiseOptions } from '@/lib/localise-options';

export default function SubmissionsPage() {  const { t } = useTranslation(['forms', 'common']);

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
        <span className="sr-only">{t('forms:loadingSubmissions')}</span>
      </div>
    );
  }

  if (!canSeeAny) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <h1 className="text-2xl font-bold text-foreground">{t('forms:notAuthorised')}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t('forms:formReviewIsRestrictedToThe')}</p>
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
          <h1 className="text-3xl font-bold text-foreground">{t('forms:formSubmissions')}</h1>
          <p className="mt-1 text-muted-foreground">{t('forms:reviewAndTriageCapturedForms')}</p>
        </div>
        <Button
          onClick={handleExport}
          disabled={!formType || exportCsv.isPending}
          title={!formType ? 'Select a form type to export' : undefined}
          className="bg-[#5D3FD3] hover:bg-[#451ebb]"
        >
          <Download className="mr-2 h-4 w-4" />
          {exportCsv.isPending ? t('forms:exporting') : t('forms:exportCsv')}
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="grid gap-4 py-5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">{t('forms:formType')}</label>
            <CustomSelect
              value={formType}
              onValueChange={(v) => setFormType(v as FormType | '')}
              placeholder={t('forms:allForms')}
              options={[
                { value: '', label: t('forms:allForms') },
                ...FORM_TYPES
                  .filter((t) => visibleSet.includes(t))
                  .map((formType) => ({
                    value: formType,
                    label: localiseFormDefinition(t, FORM_DEFINITIONS[formType]).title,
                  })),
              ]}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">{t('forms:status')}</label>
            <CustomSelect
              value={status}
              onValueChange={(v) => setStatus(v as FormSubmissionStatus | '')}
              placeholder={t('forms:allStatuses')}
              options={[
                  { value: '', label: t('forms:allStatuses') },
                  ...localiseOptions(t, 'forms:submissionStatus_', STATUS_OPTIONS),
                ]}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">{t('forms:from')}</label>
            <DateSelect value={from} onChange={setFrom} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">{t('forms:to')}</label>
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
          <CardContent className="py-10 text-center text-sm text-muted-foreground">{t('forms:noSubmissionsMatchTheseFilters')}</CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('forms:subject')}</TableHead>
                <TableHead>{t('forms:form')}</TableHead>
                <TableHead>{t('forms:branch')}</TableHead>
                <TableHead>{t('forms:status')}</TableHead>
                <TableHead>{t('forms:submitted')}</TableHead>
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
                    <TableCell>{localiseFormDefinition(t, FORM_DEFINITIONS[s.formType]).title}</TableCell>
                    <TableCell>
                      {s.branchName ? (
                        <span className="inline-flex items-center rounded-full bg-[#5D3FD3]/10 px-2 py-0.5 text-xs font-medium text-[#5D3FD3]">
                          {s.branchName}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={statusMeta.className}>
                        {t(`forms:submissionStatus_${s.status}`, { defaultValue: statusMeta.label })}
                      </Badge>
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
