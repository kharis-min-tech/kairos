import { useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, Check } from 'lucide-react-native';
import {
  Button,
  Card,
  Input,
  radii,
  spacing,
  typography,
  useThemedStyles,
  type ThemeColors,
  useColors,
} from '@kairos/ui-native';
import type { CreateFellowshipRequest, FellowshipType } from '@kairos/types';
import { FellowshipType as FellowshipTypeEnum } from '@kairos/types';
import { api } from '@/lib/api-client';

const DAY_OPTIONS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

const SCHEDULE_OPTIONS = ['Weekly', 'Fortnightly', 'Monthly'] as const;

export interface FellowshipFormValues {
  fellowshipName: string;
  branchId: string;
  fellowshipType: FellowshipType | '';
  description: string;
  meetingDay: string;
  meetingTime: string;
  meetingSchedule: string;
}

export const EMPTY_FELLOWSHIP_FORM: FellowshipFormValues = {
  fellowshipName: '',
  branchId: '',
  fellowshipType: '',
  description: '',
  meetingDay: '',
  meetingTime: '',
  meetingSchedule: '',
};

interface FellowshipFormProps {
  initial?: Partial<FellowshipFormValues>;
  submitLabel: string;
  submitPendingLabel?: string;
  submitting: boolean;
  serverError?: string | null;
  onSubmit: (payload: CreateFellowshipRequest) => void | Promise<void>;
  /** Optional footer content — e.g. a destructive Delete row on the edit form. */
  footer?: React.ReactNode;
}

export function FellowshipForm({
  initial,
  submitLabel,
  submitPendingLabel,
  submitting,
  serverError,
  onSubmit,
  footer,
}: FellowshipFormProps) {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  const branches = useQuery({
    queryKey: ['branches', 'listPublic'],
    queryFn: async () => (await api.branches.listPublic()).data ?? [],
    staleTime: 5 * 60 * 1000,
  });

  const [name, setName] = useState(initial?.fellowshipName ?? '');
  const [branchId, setBranchId] = useState(initial?.branchId ?? '');
  const [fellowshipType, setFellowshipType] = useState<FellowshipType | ''>(
    initial?.fellowshipType ?? '',
  );
  const [description, setDescription] = useState(initial?.description ?? '');
  const [meetingDay, setMeetingDay] = useState(initial?.meetingDay ?? '');
  const [meetingTime, setMeetingTime] = useState(initial?.meetingTime ?? '');
  const [meetingSchedule, setMeetingSchedule] = useState(initial?.meetingSchedule ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [openPicker, setOpenPicker] = useState<
    'branch' | 'type' | 'day' | 'schedule' | null
  >(null);

  const branchOptions = useMemo(
    () => (branches.data ?? []).map((b) => ({ value: b.id, label: b.branchName })),
    [branches.data],
  );

  const branchLabel = useMemo(
    () => branchOptions.find((b) => b.value === branchId)?.label ?? '',
    [branchOptions, branchId],
  );

  function clearError(key: string) {
    setErrors((p) => {
      const next = { ...p };
      delete next[key];
      return next;
    });
  }

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!name.trim()) next['name'] = 'Fellowship name is required';
    if (!branchId) next['branchId'] = 'Choose a branch';
    if (!fellowshipType) next['fellowshipType'] = 'Choose a type';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit() {
    if (!validate()) return;
    const payload: CreateFellowshipRequest = {
      fellowshipName: name.trim(),
      branchId,
      fellowshipType: fellowshipType as string,
    };
    if (description.trim()) payload.description = description.trim();
    if (meetingDay) payload.meetingDay = meetingDay;
    if (meetingTime.trim()) payload.meetingTime = meetingTime.trim();
    if (meetingSchedule) payload.meetingSchedule = meetingSchedule;
    void onSubmit(payload);
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Card padding="md" style={{ gap: spacing.md }}>
          <Text style={styles.sectionEyebrow}>DETAILS</Text>

          <FieldLabel label="Fellowship name" required />
          <Input
            value={name}
            onChangeText={(v) => {
              setName(v);
              clearError('name');
            }}
            placeholder="e.g. Central K-Group"
            autoCapitalize="words"
            error={errors['name']}
          />

          <FieldLabel label="Branch" required />
          <PickerField
            value={branchLabel}
            placeholder="Choose a branch"
            onPress={() => setOpenPicker('branch')}
            error={errors['branchId']}
          />

          <FieldLabel label="Type" required />
          <PickerField
            value={fellowshipType}
            placeholder="Choose a fellowship type"
            onPress={() => setOpenPicker('type')}
            error={errors['fellowshipType']}
          />

          <FieldLabel label="Description" />
          <Input
            value={description}
            onChangeText={setDescription}
            placeholder="Short description shown on the fellowship page"
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            containerStyle={{ minHeight: 80 }}
          />
        </Card>

        <Card padding="md" style={{ gap: spacing.md }}>
          <Text style={styles.sectionEyebrow}>MEETING</Text>

          <FieldLabel label="Meeting day" />
          <PickerField
            value={meetingDay}
            placeholder="Choose a day"
            onPress={() => setOpenPicker('day')}
          />

          <FieldLabel label="Meeting time" />
          <Input
            value={meetingTime}
            onChangeText={setMeetingTime}
            placeholder="e.g. 18:30"
            keyboardType="numbers-and-punctuation"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <FieldLabel label="Schedule" />
          <PickerField
            value={meetingSchedule}
            placeholder="Choose a cadence"
            onPress={() => setOpenPicker('schedule')}
          />
        </Card>

        {serverError ? <Text style={styles.errorLine}>{serverError}</Text> : null}

        <Button
          label={submitting ? submitPendingLabel ?? 'Saving…' : submitLabel}
          variant="primary"
          size="lg"
          fullWidth
          loading={submitting}
          onPress={handleSubmit}
        />

        {footer}
      </ScrollView>

      <PickerSheet
        open={openPicker === 'branch'}
        title="Branch"
        onClose={() => setOpenPicker(null)}
        options={branchOptions}
        selected={branchId}
        onSelect={(v) => {
          setBranchId(v);
          clearError('branchId');
        }}
      />

      <PickerSheet
        open={openPicker === 'type'}
        title="Fellowship type"
        onClose={() => setOpenPicker(null)}
        options={Object.values(FellowshipTypeEnum).map((t) => ({ value: t, label: t }))}
        selected={fellowshipType}
        onSelect={(v) => {
          setFellowshipType(v as FellowshipType);
          clearError('fellowshipType');
        }}
      />

      <PickerSheet
        open={openPicker === 'day'}
        title="Meeting day"
        onClose={() => setOpenPicker(null)}
        options={DAY_OPTIONS.map((d) => ({ value: d, label: d }))}
        selected={meetingDay}
        onSelect={setMeetingDay}
      />

      <PickerSheet
        open={openPicker === 'schedule'}
        title="Schedule"
        onClose={() => setOpenPicker(null)}
        options={SCHEDULE_OPTIONS.map((s) => ({ value: s, label: s }))}
        selected={meetingSchedule}
        onSelect={setMeetingSchedule}
      />
    </KeyboardAvoidingView>
  );
}

function FieldLabel({ label, required }: { label: string; required?: boolean }) {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
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

function PickerSheet({
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
}) {
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
                  {isSelected ? (
                    <Check color={c.primary} size={16} strokeWidth={2} />
                  ) : null}
                </Pressable>
              );
            })}
          </ScrollView>
          <Pressable style={styles.sheetCancel} onPress={onClose}>
            <Text style={styles.sheetCancelLabel}>Cancel</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
  container: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  sectionEyebrow: {
    ...typography.eyebrow,
    color: c.inkMuted,
  },
  fieldLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  fieldLabel: {
    ...typography.eyebrow,
    color: c.ink,
    opacity: 0.6,
  },
  requiredMark: {
    ...typography.eyebrow,
    color: c.danger,
  },
  pickerField: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.card,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    minHeight: 44,
  },
  pickerFieldError: {
    borderColor: c.danger,
    borderWidth: 1.5,
  },
  pickerValue: { ...typography.body, color: c.ink, flex: 1 },
  pickerPlaceholder: {
    ...typography.body,
    color: c.inkFaded,
    flex: 1,
  },
  errorLine: {
    ...typography.meta,
    color: c.danger,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(10,10,15,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: c.card,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    paddingTop: spacing.md,
    gap: spacing.md,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: c.inkGhost,
    alignSelf: 'center',
  },
  sheetTitle: {
    ...typography.cardTitle,
    color: c.ink,
  },
  sheetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.divider,
  },
  sheetOptionActive: {
    backgroundColor: 'rgba(93,63,211,0.06)',
  },
  sheetOptionLabel: { ...typography.body, color: c.ink },
  sheetOptionLabelActive: {
    color: c.primary,
    fontWeight: '600',
  },
  sheetCancel: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  sheetCancelLabel: {
    ...typography.button,
    color: c.primary,
  },
});
}

