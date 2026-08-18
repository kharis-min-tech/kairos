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
  DatePicker,
  Input,
  radii,
  spacing,
  typography,
  useThemedStyles,
  type ThemeColors,
  useColors,
} from '@kairos/ui-native';
import { api } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth';

export default function NewOutreachProgram() {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  const router = useRouter();
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const [serverError, setServerError] = useState<string | null>(null);

  const branches = useQuery({
    queryKey: ['branches', 'listPublic'],
    queryFn: async () => (await api.branches.listPublic()).data ?? [],
    staleTime: 5 * 60 * 1000,
  });

  const [programName, setProgramName] = useState('');
  const [programDate, setProgramDate] = useState('');
  const [location, setLocation] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [description, setDescription] = useState('');
  const [branchId, setBranchId] = useState(user?.homeBranchId ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [branchPickerOpen, setBranchPickerOpen] = useState(false);

  const branchOptions = useMemo(
    () => (branches.data ?? []).map((b) => ({ value: b.id, label: b.branchName })),
    [branches.data],
  );
  const branchLabel =
    branchOptions.find((b) => b.value === branchId)?.label ?? '';

  const create = useMutation({
    mutationFn: async (data: {
      programName: string;
      programDate: string;
      location: string;
      branchId: string;
      address?: string;
      city?: string;
      description?: string;
    }) => (await api.outreach.programs.create(data)).data,
    onSuccess: (row) => {
      qc.invalidateQueries({ queryKey: ['outreach'] });
      if (row?.id) {
        router.replace(`/outreach/${row.id}`);
      } else {
        router.back();
      }
    },
  });

  function clearError(key: string) {
    setErrors((p) => {
      const n = { ...p };
      delete n[key];
      return n;
    });
  }

  async function handleSubmit() {
    setServerError(null);
    const next: Record<string, string> = {};
    if (!programName.trim()) next['programName'] = 'Program name is required';
    if (!programDate.trim()) next['programDate'] = 'Date is required (YYYY-MM-DD)';
    if (!location.trim()) next['location'] = 'Location is required';
    if (!branchId) next['branchId'] = 'Choose a branch';
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    try {
      await create.mutateAsync({
        programName: programName.trim(),
        programDate: programDate.trim(),
        location: location.trim(),
        branchId,
        ...(address.trim() ? { address: address.trim() } : {}),
        ...(city.trim() ? { city: city.trim() } : {}),
        ...(description.trim() ? { description: description.trim() } : {}),
      });
    } catch (err) {
      setServerError(
        err instanceof Error ? err.message : 'Could not create program. Please try again.',
      );
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerBar}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ChevronLeft color={c.ink} size={24} strokeWidth={1.5} />
        </Pressable>
        <Text style={styles.headerTitle}>New program</Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <Card padding="md" style={{ gap: spacing.md }}>
            <Text style={styles.sectionEyebrow}>PROGRAM</Text>

            <FieldLabel label="Program name" required />
            <Input
              value={programName}
              onChangeText={(v) => {
                setProgramName(v);
                clearError('programName');
              }}
              placeholder="e.g. Central Market outreach"
              autoCapitalize="words"
              error={errors['programName']}
            />

            <DatePicker
              label="Program date"
              value={programDate}
              onChange={(v) => {
                setProgramDate(v);
                clearError('programDate');
              }}
              error={errors['programDate']}
            />

            <FieldLabel label="Location" required />
            <Input
              value={location}
              onChangeText={(v) => {
                setLocation(v);
                clearError('location');
              }}
              placeholder="e.g. Central Market square"
              autoCapitalize="words"
              error={errors['location']}
            />

            <FieldLabel label="Description" />
            <Input
              value={description}
              onChangeText={setDescription}
              placeholder="What are you doing at this outreach?"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              containerStyle={{ minHeight: 80 }}
            />
          </Card>

          <Card padding="md" style={{ gap: spacing.md }}>
            <Text style={styles.sectionEyebrow}>ADDRESS &amp; BRANCH</Text>

            <FieldLabel label="Address" />
            <Input value={address} onChangeText={setAddress} autoCapitalize="words" />

            <FieldLabel label="City" />
            <Input value={city} onChangeText={setCity} autoCapitalize="words" />

            <FieldLabel label="Owning branch" required />
            <Pressable
              style={[
                styles.pickerField,
                errors['branchId'] ? styles.pickerFieldError : null,
              ]}
              onPress={() => setBranchPickerOpen(true)}
            >
              <Text style={branchLabel ? styles.pickerValue : styles.pickerPlaceholder}>
                {branchLabel || 'Choose a branch'}
              </Text>
              <ChevronRight color={c.inkFaded} size={16} strokeWidth={1.5} />
            </Pressable>
            {errors['branchId'] ? (
              <Text style={styles.errorLine}>{errors['branchId']}</Text>
            ) : null}
          </Card>

          {serverError ? <Text style={styles.errorLine}>{serverError}</Text> : null}

          <Button
            label={create.isPending ? 'Creating…' : 'Create program'}
            variant="primary"
            size="lg"
            fullWidth
            loading={create.isPending}
            onPress={handleSubmit}
          />

          <Text style={styles.footnote}>
            After creating the program you can register workers and start capturing
            souls reached during the outreach.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={branchPickerOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setBranchPickerOpen(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setBranchPickerOpen(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Owning branch</Text>
            <ScrollView style={{ maxHeight: 380 }}>
              {branchOptions.map((opt) => {
                const isSelected = opt.value === branchId;
                return (
                  <Pressable
                    key={opt.value}
                    style={[styles.sheetOption, isSelected && styles.sheetOptionActive]}
                    onPress={() => {
                      setBranchId(opt.value);
                      clearError('branchId');
                      setBranchPickerOpen(false);
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
            <Pressable
              style={styles.sheetCancel}
              onPress={() => setBranchPickerOpen(false)}
            >
              <Text style={styles.sheetCancelLabel}>Cancel</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
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

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.page },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  headerTitle: { ...typography.cardTitle, color: c.ink },
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
  footnote: {
    ...typography.meta,
    color: c.inkFaded,
    paddingHorizontal: spacing.xs,
    lineHeight: 15,
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

