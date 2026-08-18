import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Modal,
  KeyboardAvoidingView,
  Platform,
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
import { alert } from '@/lib/alert';
import { useAuthStore } from '@/store/auth';

const STAGE_OPTIONS = [
  { value: 'session-1', label: 'Session 1 · Foundations of Faith' },
  { value: 'session-2', label: 'Session 2 · Who is a Christian' },
  { value: 'session-3', label: 'Session 3 · Working out your Salvation' },
  { value: 'session-4', label: 'Session 4 · The Importance of Fellowship' },
];

export default function CreateSession() {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  const router = useRouter();
  const qc = useQueryClient();
  const branchId = useAuthStore((s) => s.user?.homeBranchId);

  const [stage, setStage] = useState<string>('session-1');
  const [sessionDate, setSessionDate] = useState<string>(
    new Date().toISOString().slice(0, 10),
  );
  const [location, setLocation] = useState('');
  const [teacherId, setTeacherId] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [pickerOpen, setPickerOpen] = useState<'stage' | 'teacher' | null>(null);

  const branchMembers = useQuery({
    queryKey: ['members', 'branch-picker', branchId],
    enabled: !!branchId,
    queryFn: async () =>
      (await api.members.list({ branchId, limit: 500 })).data?.data ?? [],
  });

  const existingSessions = useQuery({
    queryKey: ['new-believers', 'sessions', branchId],
    enabled: !!branchId,
    queryFn: async () =>
      (await api.newBelievers.sessions.list({ branchId })).data ?? [],
  });

  const duplicate = (existingSessions.data ?? []).find(
    (s) => s.sessionStage === stage && s.sessionDate.slice(0, 10) === sessionDate,
  );

  const teacherName = branchMembers.data?.find((m) => m.id === teacherId);
  const teacherLabel = teacherName
    ? `${teacherName.firstName} ${teacherName.lastName}`
    : '';

  const stageLabel = STAGE_OPTIONS.find((s) => s.value === stage)?.label ?? stage;

  const create = useMutation({
    mutationFn: async () =>
      (
        await api.newBelievers.sessions.create({
          branchId: branchId!,
          sessionStage: stage,
          sessionDate,
          location: location.trim(),
          teacherId,
          notes: notes.trim() || undefined,
        })
      ).data!,
    onSuccess: (created) => {
      qc.invalidateQueries({ queryKey: ['new-believers', 'sessions'] });
      router.replace(`/new-believers/sessions/${created.id}` as never);
    },
    onError: (e) =>
      alert.info('Could not create session', e instanceof Error ? e.message : 'Please try again.'),
  });

  function validate() {
    const next: Record<string, string> = {};
    if (!sessionDate) next['sessionDate'] = 'Choose a date';
    if (!location.trim()) next['location'] = 'Location is required';
    if (!teacherId) next['teacherId'] = 'Pick a teacher';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerBar}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ChevronLeft color={c.ink} size={24} strokeWidth={1.5} />
        </Pressable>
        <Text style={styles.headerTitle}>New session</Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.container}>
          <Card padding="md" style={{ gap: spacing.md }}>
            <FieldLabel label="Session stage" required />
            <PickerField
              value={stageLabel}
              onPress={() => setPickerOpen('stage')}
            />

            <DatePicker
              label="Date"
              value={sessionDate}
              onChange={setSessionDate}
              error={errors['sessionDate']}
            />

            <FieldLabel label="Location" required />
            <Input
              value={location}
              onChangeText={(v) => {
                setLocation(v);
                setErrors((p) => {
                  const n = { ...p };
                  delete n['location'];
                  return n;
                });
              }}
              placeholder="e.g. Main hall"
              autoCapitalize="words"
              error={errors['location']}
            />

            <FieldLabel label="Teacher" required />
            <PickerField
              value={teacherLabel}
              placeholder="Pick a teacher"
              onPress={() => setPickerOpen('teacher')}
              error={errors['teacherId']}
            />

            <FieldLabel label="Notes" />
            <Input
              value={notes}
              onChangeText={setNotes}
              placeholder="Optional teacher notes"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              containerStyle={{ minHeight: 80 }}
            />
          </Card>

          {duplicate ? (
            <View style={styles.dupBanner}>
              <Text style={styles.dupTitle}>Session already exists</Text>
              <Text style={styles.dupBody}>
                A {stageLabel} session on {sessionDate} is already on the books for
                this branch. Creating another will result in a duplicate. Pick a
                different stage or date if you didn&apos;t mean to.
              </Text>
            </View>
          ) : null}

          <Button
            label={create.isPending ? 'Creating…' : 'Create session'}
            size="lg"
            fullWidth
            loading={create.isPending}
            onPress={async () => {
              if (!branchId) {
                alert.info(
                  'No home branch',
                  'Set a home branch on your profile before creating a session.',
                );
                return;
              }
              if (!validate()) return;
              if (duplicate) {
                const ok = await alert.confirm({
                  title: 'Create anyway?',
                  message: `A ${stageLabel} session on ${sessionDate} already exists in this branch. Are you sure you want to create a duplicate?`,
                  confirmLabel: 'Create anyway',
                  destructive: true,
                });
                if (!ok) return;
              }
              create.mutate();
            }}
          />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Stage picker */}
      <Modal
        visible={pickerOpen === 'stage'}
        animationType="slide"
        transparent
        onRequestClose={() => setPickerOpen(null)}
      >
        <Pressable style={styles.backdrop} onPress={() => setPickerOpen(null)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Session stage</Text>
            {STAGE_OPTIONS.map((opt) => {
              const active = opt.value === stage;
              return (
                <Pressable
                  key={opt.value}
                  onPress={() => {
                    setStage(opt.value);
                    setPickerOpen(null);
                  }}
                  style={[styles.sheetRow, active && styles.sheetRowActive]}
                >
                  <Text
                    style={[
                      styles.sheetRowLabel,
                      active && styles.sheetRowLabelActive,
                    ]}
                  >
                    {opt.label}
                  </Text>
                  {active ? <Check color={c.primary} size={16} strokeWidth={2} /> : null}
                </Pressable>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Teacher picker */}
      <Modal
        visible={pickerOpen === 'teacher'}
        animationType="slide"
        transparent
        onRequestClose={() => setPickerOpen(null)}
      >
        <Pressable style={styles.backdrop} onPress={() => setPickerOpen(null)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Teacher</Text>
            <ScrollView style={{ maxHeight: 400 }}>
              {(branchMembers.data ?? []).map((m) => {
                const active = m.id === teacherId;
                return (
                  <Pressable
                    key={m.id}
                    onPress={() => {
                      setTeacherId(m.id);
                      setErrors((p) => {
                        const n = { ...p };
                        delete n['teacherId'];
                        return n;
                      });
                      setPickerOpen(null);
                    }}
                    style={[styles.sheetRow, active && styles.sheetRowActive]}
                  >
                    <Text
                      style={[
                        styles.sheetRowLabel,
                        active && styles.sheetRowLabelActive,
                      ]}
                    >
                      {m.firstName} {m.lastName}
                    </Text>
                    {active ? <Check color={c.primary} size={16} strokeWidth={2} /> : null}
                  </Pressable>
                );
              })}
            </ScrollView>
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
    <Text style={styles.fieldLabel}>
      {label}
      {required ? <Text style={{ color: c.danger }}> *</Text> : null}
    </Text>
  );
}

function PickerField({
  value,
  placeholder,
  onPress,
  error,
}: {
  value: string;
  placeholder?: string;
  onPress: () => void;
  error?: string;
}) {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  return (
    <View style={{ gap: 4 }}>
      <Pressable
        onPress={onPress}
        style={[styles.pickerField, error ? styles.pickerFieldError : null]}
      >
        <Text style={value ? styles.pickerValue : styles.pickerPlaceholder}>
          {value || placeholder || 'Choose…'}
        </Text>
        <ChevronRight color={c.inkFaded} size={16} strokeWidth={1.5} />
      </Pressable>
      {error ? <Text style={styles.errorLine}>{error}</Text> : null}
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
  fieldLabel: {
    ...typography.eyebrow,
    color: c.ink,
    opacity: 0.6,
  },
  pickerField: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: c.card,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    minHeight: 44,
  },
  pickerFieldError: { borderColor: c.danger, borderWidth: 1.5 },
  pickerValue: { ...typography.body, color: c.ink, flex: 1 },
  pickerPlaceholder: {
    ...typography.body,
    color: c.inkFaded,
    flex: 1,
  },
  errorLine: { ...typography.meta, color: c.danger },
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  sheet: {
    backgroundColor: c.card,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: c.inkGhost,
    marginBottom: spacing.sm,
  },
  sheetTitle: { ...typography.cardTitle, color: c.ink, marginBottom: spacing.xs },
  sheetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.md,
  },
  sheetRowActive: { backgroundColor: 'rgba(93,63,211,0.08)' },
  sheetRowLabel: { ...typography.body, color: c.ink },
  sheetRowLabelActive: { color: c.primary, fontWeight: '600' },
  dupBanner: {
    backgroundColor: 'rgba(248,181,55,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(248,181,55,0.35)',
    padding: spacing.md,
    borderRadius: radii.md,
    gap: 4,
  },
  dupTitle: { ...typography.body, color: c.goldDark, fontWeight: '700' },
  dupBody: { ...typography.meta, color: c.goldDark, lineHeight: 15 },
});
}

