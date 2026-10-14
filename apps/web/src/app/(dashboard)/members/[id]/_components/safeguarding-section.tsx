'use client';

import { useState } from 'react';
import { Lock, ShieldCheck, Pencil } from 'lucide-react';
import { Button, CustomSelect, Textarea, Label, Card, CardContent, CardHeader, CardTitle, CardDescription } from '@kairos/ui';
import type { MemberHealthRecord, UpsertHealthRecordRequest } from '@kairos/types';
import { useMemberHealthRecord, useUpsertMemberHealthRecord } from '@/hooks/use-members';
import { useTranslation } from 'react-i18next';

interface SafeguardingSectionProps {
  memberId: string;
  /** true when the viewer LACKS safeguarding access. */
  redacted: boolean;
  /** whether the viewer may edit the record (admin/pastor/guardian/safeguarding lead). */
  canEdit: boolean;
}

// ── tri-state consent <-> CustomSelect string mapping ──────
type ConsentValue = 'unset' | 'granted' | 'declined';

const CONSENT_OPTIONS = [
  { value: 'unset', label: 'Not recorded' },
  { value: 'granted', label: 'Granted' },
  { value: 'declined', label: 'Declined' },
];

function consentToSelect(v: boolean | null | undefined): ConsentValue {
  if (v === true) return 'granted';
  if (v === false) return 'declined';
  return 'unset';
}

function selectToConsent(v: ConsentValue): boolean | null {
  if (v === 'granted') return true;
  if (v === 'declined') return false;
  return null;
}

function consentLabel(v: boolean | null | undefined): string {
  if (v === true) return 'Granted';
  if (v === false) return 'Declined';
  return 'Not recorded';
}

function consentCls(v: boolean | null | undefined): string {
  if (v === true) return 'bg-[#16A34A]/10 text-[#16A34A]';
  if (v === false) return 'bg-rose-100 text-rose-700';
  return 'bg-[#c9c4d7]/20 text-muted-foreground';
}

export function SafeguardingSection({ memberId, redacted, canEdit }: SafeguardingSectionProps) {  const { t } = useTranslation(['members', 'common']);

  // Only fetch when the viewer has access (not redacted).
  const { data: record, isLoading, error } = useMemberHealthRecord(memberId, !redacted);
  const [editing, setEditing] = useState(false);

  if (redacted) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-[#5D3FD3]" strokeWidth={1.5} />
            Safeguarding &amp; Health
          </CardTitle>
          <CardDescription>{t('members:sensitiveMinorData')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-3 rounded bg-[#f3f3f3] p-4">
            <Lock className="mt-0.5 h-5 w-5 shrink-0 text-[#5D3FD3]" strokeWidth={1.5} />
            <div className="text-sm">
              <p className="font-medium text-foreground">{t('members:hiddenSafeguardingProtected')}</p>
              <p className="mt-1 text-muted-foreground">
                This member is under 16. You need safeguarding access (admin, pastor, the
                member&apos;s guardian, or a Safeguarding Lead) to view their health record.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-[#5D3FD3]" strokeWidth={1.5} />
            Safeguarding &amp; Health
          </CardTitle>
          <CardDescription>{t('members:medicalDietaryAndConsentDetailsFor')}</CardDescription>
        </div>
        {canEdit && !editing && (
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            disabled={isLoading}
            onClick={() => setEditing(true)}
          >
            <Pencil className="h-4 w-4" strokeWidth={1.5} />{t('members:edit')}</Button>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            <div className="h-4 w-1/3 animate-pulse rounded bg-[#f3f3f3]" />
            <div className="h-4 w-2/3 animate-pulse rounded bg-[#f3f3f3]" />
            <div className="h-4 w-1/2 animate-pulse rounded bg-[#f3f3f3]" />
            <span className="sr-only">{t('members:loadingHealthRecord')}</span>
          </div>
        ) : error ? (
          <div className="rounded border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
            {error instanceof Error ? error.message : 'Failed to load health record.'}
          </div>
        ) : editing ? (
          <HealthRecordForm
            memberId={memberId}
            record={record ?? null}
            onDone={() => setEditing(false)}
          />
        ) : (
          <HealthRecordView record={record ?? null} />
        )}
      </CardContent>
    </Card>
  );
}

// ── Read-only view ─────────────────────────────────────────

function HealthRecordView({ record }: { record: MemberHealthRecord | null }) {  const { t } = useTranslation(['members', 'common']);

  if (!record) {
    return (
      <p className="text-sm text-muted-foreground">{t('members:noHealthRecordRecordedYet')}</p>
    );
  }

  return (
    <div className="space-y-5 text-sm">
      <div className="space-y-3">
        <TextField label={t('members:medicalConditions')} value={record.medicalConditions} />
        <TextField label={t('members:allergies')} value={record.allergies} />
        <TextField label={t('members:medications')} value={record.medications} />
        <TextField label={t('members:dietaryNeeds')} value={record.dietaryNeeds} />
        <TextField label={t('members:additionalNotes')} value={record.additionalNotes} />
      </div>

      <div className="space-y-2 border-t border-[#c9c4d7]/30 pt-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('members:consent')}</p>
        <ConsentRow label={t('members:photoMediaConsent')} value={record.photoMediaConsent} />
        <ConsentRow label={t('members:medicalTreatmentConsent')} value={record.medicalTreatmentConsent} />
        <ConsentRow label={t('members:dataProcessingConsent')} value={record.dataProcessingConsent} />
        {record.consentDate && (
          <p className="pt-1 text-xs text-muted-foreground">
            Consent last recorded {record.consentDate}.
          </p>
        )}
      </div>
    </div>
  );
}

function TextField({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <p className="text-muted-foreground">{label}</p>
      <p className="mt-0.5 whitespace-pre-wrap text-foreground">{value ?? '—'}</p>
    </div>
  );
}

function ConsentRow({ label, value }: { label: string; value: boolean | null }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={`rounded px-2 py-0.5 text-xs font-medium ${consentCls(value)}`}>
        {consentLabel(value)}
      </span>
    </div>
  );
}

// ── Edit form ──────────────────────────────────────────────

function HealthRecordForm({
  memberId,
  record,
  onDone,
}: {
  memberId: string;
  record: MemberHealthRecord | null;
  onDone: () => void;
}) {  const { t } = useTranslation(['members', 'common']);

  const upsert = useUpsertMemberHealthRecord(memberId);

  const [medicalConditions, setMedicalConditions] = useState(record?.medicalConditions ?? '');
  const [allergies, setAllergies] = useState(record?.allergies ?? '');
  const [medications, setMedications] = useState(record?.medications ?? '');
  const [dietaryNeeds, setDietaryNeeds] = useState(record?.dietaryNeeds ?? '');
  const [additionalNotes, setAdditionalNotes] = useState(record?.additionalNotes ?? '');
  const [photoMediaConsent, setPhotoMediaConsent] = useState<ConsentValue>(consentToSelect(record?.photoMediaConsent));
  const [medicalTreatmentConsent, setMedicalTreatmentConsent] = useState<ConsentValue>(consentToSelect(record?.medicalTreatmentConsent));
  const [dataProcessingConsent, setDataProcessingConsent] = useState<ConsentValue>(consentToSelect(record?.dataProcessingConsent));

  function trimOrNull(v: string): string | null {
    const t = v.trim();
    return t.length ? t : null;
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload: UpsertHealthRecordRequest = {
      medicalConditions: trimOrNull(medicalConditions),
      allergies: trimOrNull(allergies),
      medications: trimOrNull(medications),
      dietaryNeeds: trimOrNull(dietaryNeeds),
      additionalNotes: trimOrNull(additionalNotes),
      photoMediaConsent: selectToConsent(photoMediaConsent),
      medicalTreatmentConsent: selectToConsent(medicalTreatmentConsent),
      dataProcessingConsent: selectToConsent(dataProcessingConsent),
    };
    upsert.mutate(payload, { onSuccess: () => onDone() });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {upsert.error && (
        <div className="rounded border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          {upsert.error instanceof Error ? upsert.error.message : 'Failed to save health record.'}
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="medicalConditions">{t('members:medicalConditions')}</Label>
        <Textarea id="medicalConditions" value={medicalConditions} onChange={(e) => setMedicalConditions(e.target.value)} rows={2} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="allergies">{t('members:allergies')}</Label>
        <Textarea id="allergies" value={allergies} onChange={(e) => setAllergies(e.target.value)} rows={2} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="medications">{t('members:medications')}</Label>
        <Textarea id="medications" value={medications} onChange={(e) => setMedications(e.target.value)} rows={2} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="dietaryNeeds">{t('members:dietaryNeeds')}</Label>
        <Textarea id="dietaryNeeds" value={dietaryNeeds} onChange={(e) => setDietaryNeeds(e.target.value)} rows={2} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="additionalNotes">{t('members:additionalNotes')}</Label>
        <Textarea id="additionalNotes" value={additionalNotes} onChange={(e) => setAdditionalNotes(e.target.value)} rows={2} />
      </div>

      <div className="space-y-3 border-t border-[#c9c4d7]/30 pt-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('members:consent')}</p>
        <ConsentSelect label={t('members:photoMediaConsent')} value={photoMediaConsent} onChange={setPhotoMediaConsent} />
        <ConsentSelect label={t('members:medicalTreatmentConsent')} value={medicalTreatmentConsent} onChange={setMedicalTreatmentConsent} />
        <ConsentSelect label={t('members:dataProcessingConsent')} value={dataProcessingConsent} onChange={setDataProcessingConsent} />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" size="sm" onClick={onDone} disabled={upsert.isPending}>{t('members:cancel')}</Button>
        <Button
          type="submit"
          size="sm"
          disabled={upsert.isPending}
          className="bg-gradient-to-br from-[#451ebb] to-[#5d3fd3] text-white shadow-[#5d3fd3]/20"
        >
          {upsert.isPending ? 'Saving…' : 'Save'}
        </Button>
      </div>
    </form>
  );
}

function ConsentSelect({
  label,
  value,
  onChange,
}: {
  label: string;
  value: ConsentValue;
  onChange: (v: ConsentValue) => void;
}) {
  const id = label.replace(/[^a-z]/gi, '-').toLowerCase();
  return (
    <div className="flex items-center justify-between gap-4">
      <Label htmlFor={id} className="text-sm text-muted-foreground">{label}</Label>
      <div className="w-44">
        <CustomSelect
          id={id}
          size="sm"
          value={value}
          onValueChange={(v) => onChange(v as ConsentValue)}
          options={CONSENT_OPTIONS}
        />
      </div>
    </div>
  );
}
