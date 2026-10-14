import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Switch,
} from 'react-native';
import { ChevronRight, Check } from 'lucide-react-native';
import {
  Button,
  Card,
  Input,
  DatePicker,
  radii,
  spacing,
  typography,
  useThemedStyles,
  type ThemeColors,
  useColors,
} from '@kairos/ui-native';
import type { CreateMembershipCohortRequest, MembershipCohortStatus } from '@kairos/types';
import { useTranslation } from 'react-i18next';

const STATUS_OPTIONS: MembershipCohortStatus[] = [
  'planned',
  'active',
  'completed',
  'cancelled',
];

export interface CohortFormValues {
  name: string;
  description: string;
  startDate: string;
  graduationDate: string;
  finalTestDeadline: string;
  status: MembershipCohortStatus;
  enrolmentOpen: boolean;
  homeworkPassMark: string;
  quizPassMark: string;
  finalTestPassMark: string;
  notes: string;
}

export const EMPTY_COHORT_FORM: CohortFormValues = {
  name: '',
  description: '',
  startDate: '',
  graduationDate: '',
  finalTestDeadline: '',
  status: 'planned',
  enrolmentOpen: true,
  homeworkPassMark: '50',
  quizPassMark: '50',
  finalTestPassMark: '50',
  notes: '',
};

interface CohortFormProps {
  initial?: Partial<CohortFormValues>;
  /** Status is meaningless before a cohort exists, so create hides it. */
  showStatus?: boolean;
  submitLabel: string;
  submitPendingLabel?: string;
  submitting: boolean;
  serverError?: string | null;
  onSubmit: (payload: CreateMembershipCohortRequest) => void | Promise<void>;
  /** Optional footer — e.g. the destructive Archive row on the edit form. */
  footer?: React.ReactNode;
}

/**
 * Create/edit form for a membership cohort. Shared by `new.tsx` and
 * `edit/[id].tsx`, matching the `_form.tsx` convention the other modules use.
 *
 * No branch picker: cohorts are church-wide and carry no `branchId`. That is
 * deliberate, not an omission — see packages/database/src/schema/membership.ts.
 */
export function CohortForm({
  initial,
  showStatus = false,
  submitLabel,
  submitPendingLabel,
  submitting,
  serverError,
  onSubmit,
  footer,
}: CohortFormProps) {  const { t } = useTranslation(['membership', 'common']);

  const styles = useThemedStyles(makeStyles);

  const [name, setName] = useState(initial?.name ?? EMPTY_COHORT_FORM.name);
  const [description, setDescription] = useState(
    initial?.description ?? EMPTY_COHORT_FORM.description,
  );
  const [startDate, setStartDate] = useState(initial?.startDate ?? '');
  const [graduationDate, setGraduationDate] = useState(initial?.graduationDate ?? '');
  const [finalTestDeadline, setFinalTestDeadline] = useState(
    initial?.finalTestDeadline ?? '',
  );
  const [status, setStatus] = useState<MembershipCohortStatus>(
    initial?.status ?? EMPTY_COHORT_FORM.status,
  );
  const [enrolmentOpen, setEnrolmentOpen] = useState(
    initial?.enrolmentOpen ?? EMPTY_COHORT_FORM.enrolmentOpen,
  );
  const [homeworkPassMark, setHomeworkPassMark] = useState(
    initial?.homeworkPassMark ?? EMPTY_COHORT_FORM.homeworkPassMark,
  );
  const [quizPassMark, setQuizPassMark] = useState(
    initial?.quizPassMark ?? EMPTY_COHORT_FORM.quizPassMark,
  );
  const [finalTestPassMark, setFinalTestPassMark] = useState(
    initial?.finalTestPassMark ?? EMPTY_COHORT_FORM.finalTestPassMark,
  );
  const [notes, setNotes] = useState(initial?.notes ?? EMPTY_COHORT_FORM.notes);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [statusOpen, setStatusOpen] = useState(false);

  function clearError(key: string) {
    setErrors((p) => {
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
    // Mirrors the DB CHECK, so the user sees this before the server 500s on it.
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
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Card padding="md" style={{ gap: spacing.md }}>
          <Text style={styles.sectionEyebrow}>{t('membership:details')}</Text>

          <FieldLabel label={t('membership:cohortName')} required />
          <Input
            value={name}
            onChangeText={(v) => {
              setName(v);
              clearError('name');
            }}
            placeholder={t('membership:eGAutumn')}
            autoCapitalize="words"
            error={errors['name']}
          />

          <FieldLabel label={t('membership:description')} />
          <Input
            value={description}
            onChangeText={setDescription}
            placeholder={t('membership:optional')}
            multiline
            numberOfLines={3}
          />

          <FieldLabel label={t('membership:startDate')} required />
          <DatePicker
            value={startDate}
            onChange={(v) => {
              setStartDate(v);
              clearError('startDate');
            }}
            placeholder={t('membership:whenTheFirstSessionRuns')}
            error={errors['startDate']}
          />

          <FieldLabel label={t('membership:inductionGraduationDate')} />
          <DatePicker
            value={graduationDate}
            onChange={(v) => {
              setGraduationDate(v);
              clearError('graduationDate');
            }}
            placeholder={t('membership:theCeremony')}
            error={errors['graduationDate']}
          />

          <FieldLabel label={t('membership:finalTestDeadline')} />
          <DatePicker
            value={finalTestDeadline}
            onChange={setFinalTestDeadline}
            placeholder={t('membership:sitAndPassByThisDate')}
          />

          {showStatus ? (
            <>
              <FieldLabel label={t('membership:status')} />
              <PickerField
                value={status}
                placeholder={t('membership:chooseAStatus')}
                onPress={() => setStatusOpen(true)}
              />
            </>
          ) : null}

          <View style={styles.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.fieldLabel}>{t('membership:openToAdmissions')}</Text>
              <Text style={styles.hint}>{t('membership:turnThisOffToStopAdmitting')}</Text>
            </View>
            <Switch value={enrolmentOpen} onValueChange={setEnrolmentOpen} />
          </View>
        </Card>

        <Card padding="md" style={{ gap: spacing.md }}>
          <Text style={styles.sectionEyebrow}>{t('membership:passMarks')}</Text>
          <Text style={styles.hint}>{t('membership:appliedToThisCohortOnlyA')}</Text>

          <FieldLabel label={t('membership:homework')} required />
          <Input
            value={homeworkPassMark}
            onChangeText={(v) => {
              setHomeworkPassMark(v);
              clearError('homeworkPassMark');
            }}
            keyboardType="number-pad"
            error={errors['homeworkPassMark']}
          />

          <FieldLabel label={t('membership:quiz')} required />
          <Input
            value={quizPassMark}
            onChangeText={(v) => {
              setQuizPassMark(v);
              clearError('quizPassMark');
            }}
            keyboardType="number-pad"
            error={errors['quizPassMark']}
          />

          <FieldLabel label={t('membership:finalTest')} required />
          <Input
            value={finalTestPassMark}
            onChangeText={(v) => {
              setFinalTestPassMark(v);
              clearError('finalTestPassMark');
            }}
            keyboardType="number-pad"
            error={errors['finalTestPassMark']}
          />
        </Card>

        <Card padding="md" style={{ gap: spacing.md }}>
          <Text style={styles.sectionEyebrow}>{t('membership:notes')}</Text>
          <Input
            value={notes}
            onChangeText={setNotes}
            placeholder={t('membership:anythingTheTeamShouldKnow')}
            multiline
            numberOfLines={3}
          />
        </Card>

        {serverError ? <Text style={styles.serverError}>{serverError}</Text> : null}

        <Button
          label={submitting ? (submitPendingLabel ?? 'Saving…') : submitLabel}
          onPress={handleSubmit}
          disabled={submitting}
        />

        {footer}
      </ScrollView>

      <PickerSheet
        open={statusOpen}
        title={t('membership:status')}
        onClose={() => setStatusOpen(false)}
        options={STATUS_OPTIONS.map((s) => ({ value: s, label: s }))}
        selected={status}
        onSelect={(v) => setStatus(v as MembershipCohortStatus)}
      />
    </KeyboardAvoidingView>
  );
}

function FieldLabel({ label, required }: { label: string; required?: boolean }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.fieldLabelRow}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {required ? <Text style={styles.requiredMark}>*</Text> : null}
    </View>
  );
}

function PickerField({
  value,
  placeholder,
  onPress,
  error,
}: {
  value: string;
  placeholder: string;
  onPress: () => void;
  error?: string;
}) {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  return (
    <View style={{ gap: 4 }}>
      <Pressable
        style={[styles.pickerField, error ? styles.pickerFieldError : null]}
        onPress={onPress}
      >
        <Text style={value ? styles.pickerValue : styles.pickerPlaceholder}>
          {value || placeholder}
        </Text>
        <ChevronRight color={c.inkFaded} size={16} strokeWidth={1.5} />
      </Pressable>
      {error ? <Text style={styles.errorLine}>{error}</Text> : null}
    </View>
  );
}

export function PickerSheet({
  open,
  title,
  onClose,
  options,
  selected,
  onSelect,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  options: { value: string; label: string }[];
  selected: string;
  onSelect: (value: string) => void;
}) {  const { t } = useTranslation(['membership', 'common']);

  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  return (
    <Modal visible={open} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>{title}</Text>
          <ScrollView style={{ maxHeight: 380 }}>
            {options.map((opt) => {
              const isSelected = opt.value === selected;
              return (
                <Pressable
                  key={opt.value}
                  style={[styles.sheetOption, isSelected && styles.sheetOptionActive]}
                  onPress={() => {
                    onSelect(opt.value);
                    onClose();
                  }}
                >
                  <Text
                    style={[
                      styles.sheetOptionLabel,
                      isSelected && styles.sheetOptionLabelActive,
                    ]}
                  >
                    {opt.label}
                  </Text>
                  {isSelected ? <Check color={c.primary} size={16} strokeWidth={2} /> : null}
                </Pressable>
              );
            })}
          </ScrollView>
          <Pressable style={styles.sheetCancel} onPress={onClose}>
            <Text style={styles.sheetCancelLabel}>{t('membership:cancel')}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md },
    sectionEyebrow: {
      ...typography.meta,
      color: c.inkFaded,
      letterSpacing: 0.6,
      fontWeight: '700',
    },
    fieldLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
    fieldLabel: { ...typography.meta, color: c.inkMuted, fontWeight: '600' },
    requiredMark: { ...typography.meta, color: c.danger },
    hint: { ...typography.meta, color: c.inkFaded, lineHeight: 15 },
    switchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    pickerField: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderWidth: 1,
      borderColor: c.divider,
      borderRadius: radii.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm + 2,
      backgroundColor: c.card,
    },
    pickerFieldError: { borderColor: c.danger },
    pickerValue: { ...typography.body, color: c.ink, textTransform: 'capitalize' },
    pickerPlaceholder: { ...typography.body, color: c.inkFaded },
    errorLine: { ...typography.meta, color: c.danger },
    serverError: { ...typography.meta, color: c.danger, textAlign: 'center' },
    modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
    sheet: {
      backgroundColor: c.card,
      borderTopLeftRadius: radii.lg,
      borderTopRightRadius: radii.lg,
      padding: spacing.lg,
      gap: spacing.sm,
    },
    sheetHandle: {
      alignSelf: 'center',
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: c.divider,
      marginBottom: spacing.sm,
    },
    sheetTitle: { ...typography.cardTitle, color: c.ink, marginBottom: spacing.xs },
    sheetOption: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: spacing.sm + 2,
      paddingHorizontal: spacing.xs,
    },
    sheetOptionActive: {},
    sheetOptionLabel: { ...typography.body, color: c.ink, textTransform: 'capitalize' },
    sheetOptionLabelActive: { color: c.primary, fontWeight: '600' },
    sheetCancel: { alignItems: 'center', paddingVertical: spacing.sm },
    sheetCancelLabel: { ...typography.body, color: c.inkMuted },
  });
}
