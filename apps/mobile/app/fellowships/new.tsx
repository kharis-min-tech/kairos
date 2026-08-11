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
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react-native';
import {
  Button,
  Card,
  Input,
  colors,
  radii,
  spacing,
  typography,
} from '@kairos/ui-native';
import type { CreateFellowshipRequest, FellowshipType } from '@kairos/types';
import { FellowshipType as FellowshipTypeEnum } from '@kairos/types';
import { api } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth';

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

export default function NewFellowship() {
  const router = useRouter();
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);

  const branches = useQuery({
    queryKey: ['branches', 'listPublic'],
    queryFn: async () => (await api.branches.listPublic()).data ?? [],
    staleTime: 5 * 60 * 1000,
  });

  const [name, setName] = useState('');
  const [branchId, setBranchId] = useState<string>(user?.homeBranchId ?? '');
  const [fellowshipType, setFellowshipType] = useState<FellowshipType | ''>('');
  const [description, setDescription] = useState('');
  const [meetingDay, setMeetingDay] = useState<string>('');
  const [meetingTime, setMeetingTime] = useState('');
  const [meetingSchedule, setMeetingSchedule] = useState<string>('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

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

  const create = useMutation({
    mutationFn: async (data: CreateFellowshipRequest) =>
      (await api.fellowships.create(data)).data!,
    onSuccess: (row) => {
      qc.invalidateQueries({ queryKey: ['fellowships'] });
      router.replace(`/fellowships/${row.id}`);
    },
  });

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!name.trim()) next['name'] = 'Fellowship name is required';
    if (!branchId) next['branchId'] = 'Choose a branch';
    if (!fellowshipType) next['fellowshipType'] = 'Choose a type';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit() {
    setSubmitError(null);
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

    try {
      await create.mutateAsync(payload);
    } catch (err) {
      setSubmitError(
        err instanceof Error
          ? err.message
          : 'Could not create fellowship. Please try again.',
      );
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerBar}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ChevronLeft color={colors.ink} size={24} strokeWidth={1.5} />
        </Pressable>
        <Text style={styles.headerTitle}>New fellowship</Text>
        <View style={{ width: 24 }} />
      </View>

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
              onChangeText={setName}
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

          {submitError ? (
            <Text style={styles.errorLine}>{submitError}</Text>
          ) : null}

          <Button
            label={create.isPending ? 'Creating…' : 'Create fellowship'}
            variant="primary"
            size="lg"
            fullWidth
            loading={create.isPending}
            onPress={handleSubmit}
          />

          <Text style={styles.footnote}>
            Members and meetings can be added after the fellowship is created. You&apos;ll
            need the FellowshipLeader capability on the chosen branch, or admin/pastor
            access.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>

      <PickerSheet
        open={openPicker === 'branch'}
        title="Branch"
        onClose={() => setOpenPicker(null)}
        options={branchOptions}
        selected={branchId}
        onSelect={(v) => {
          setBranchId(v);
          setErrors((p) => {
            const next = { ...p };
            delete next['branchId'];
            return next;
          });
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
          setErrors((p) => {
            const next = { ...p };
            delete next['fellowshipType'];
            return next;
          });
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
    </SafeAreaView>
  );
}

function FieldLabel({ label, required }: { label: string; required?: boolean }) {
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
  return (
    <View style={{ gap: 4 }}>
      <Pressable
        style={[styles.pickerField, error ? styles.pickerFieldError : null]}
        onPress={onPress}
      >
        <Text style={value ? styles.pickerValue : styles.pickerPlaceholder}>
          {value || placeholder}
        </Text>
        <ChevronRight color="rgba(26,28,28,0.4)" size={16} strokeWidth={1.5} />
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
                    <Check color={colors.primary} size={16} strokeWidth={2} />
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

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.pageLight },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  headerTitle: { ...typography.cardTitle, color: colors.ink },
  container: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  sectionEyebrow: {
    ...typography.eyebrow,
    color: 'rgba(26,28,28,0.55)',
  },
  fieldLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  fieldLabel: {
    ...typography.eyebrow,
    color: colors.ink,
    opacity: 0.6,
  },
  requiredMark: {
    ...typography.eyebrow,
    color: colors.danger,
  },
  pickerField: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardLight,
    borderWidth: 1,
    borderColor: 'rgba(26,28,28,0.12)',
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    minHeight: 44,
  },
  pickerFieldError: {
    borderColor: colors.danger,
    borderWidth: 1.5,
  },
  pickerValue: { ...typography.body, color: colors.ink, flex: 1 },
  pickerPlaceholder: {
    ...typography.body,
    color: 'rgba(26,28,28,0.4)',
    flex: 1,
  },
  errorLine: {
    ...typography.meta,
    color: colors.danger,
  },
  footnote: {
    ...typography.meta,
    color: 'rgba(26,28,28,0.5)',
    paddingHorizontal: spacing.xs,
    lineHeight: 15,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(10,10,15,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.cardLight,
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
    backgroundColor: 'rgba(26,28,28,0.15)',
    alignSelf: 'center',
  },
  sheetTitle: {
    ...typography.cardTitle,
    color: colors.ink,
  },
  sheetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(26,28,28,0.08)',
  },
  sheetOptionActive: {
    backgroundColor: 'rgba(93,63,211,0.06)',
  },
  sheetOptionLabel: { ...typography.body, color: colors.ink },
  sheetOptionLabelActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  sheetCancel: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  sheetCancelLabel: {
    ...typography.button,
    color: colors.primary,
  },
});
