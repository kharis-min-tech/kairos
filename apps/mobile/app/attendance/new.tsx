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
import { useMutation, useQueryClient } from '@tanstack/react-query';
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
import type { ServiceType } from '@kairos/types';
import { api } from '@/lib/api-client';
import { alert } from '@/lib/alert';

const TYPE_OPTIONS: ServiceType[] = ['Sunday', 'Midweek', 'Special'];

export default function CreateService() {
  const router = useRouter();
  const qc = useQueryClient();

  const [serviceType, setServiceType] = useState<ServiceType>('Sunday');
  const [serviceDate, setServiceDate] = useState<string>(
    new Date().toISOString().slice(0, 10),
  );
  const [serviceTime, setServiceTime] = useState<string>('09:00');
  const [serviceTitle, setServiceTitle] = useState('');
  const [topic, setTopic] = useState('');
  const [expectedAttendance, setExpectedAttendance] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const create = useMutation({
    mutationFn: async () => {
      // Server expects a full ISO datetime; combine the date + time fields.
      const iso = `${serviceDate}T${serviceTime.length === 5 ? `${serviceTime}:00` : serviceTime}`;
      const expected = expectedAttendance.trim()
        ? Number(expectedAttendance.trim())
        : undefined;
      const res = await api.attendance.createService({
        serviceDate: iso,
        serviceType,
        serviceTitle: serviceType === 'Special' ? serviceTitle.trim() : undefined,
        topic: topic.trim() || undefined,
        expectedAttendance: Number.isFinite(expected) ? expected : undefined,
      });
      if (!res.success) throw new Error(res.message ?? 'Could not create service');
      return res.data!;
    },
    onSuccess: (row) => {
      qc.invalidateQueries({ queryKey: ['attendance', 'services'] });
      router.replace(`/attendance/${row.id}` as never);
    },
    onError: (e: Error) =>
      alert.info('Could not create service', e.message ?? 'Please try again.'),
  });

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!/^\d{4}-\d{2}-\d{2}$/.test(serviceDate)) next['date'] = 'Use YYYY-MM-DD';
    if (!/^\d{2}:\d{2}(:\d{2})?$/.test(serviceTime)) next['time'] = 'Use HH:MM';
    if (serviceType === 'Special' && !serviceTitle.trim())
      next['title'] = 'Special services need a title';
    if (
      expectedAttendance.trim() &&
      !/^\d+$/.test(expectedAttendance.trim())
    )
      next['expected'] = 'Whole number';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerBar}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ChevronLeft color={colors.ink} size={24} strokeWidth={1.5} />
        </Pressable>
        <Text style={styles.headerTitle}>New service</Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
        >
          <Card padding="md" style={{ gap: spacing.md }}>
            <Text style={styles.fieldLabel}>Service type</Text>
            <PickerField
              value={serviceType}
              onPress={() => setPickerOpen(true)}
            />

            <View style={styles.rowFields}>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Date</Text>
                <Input
                  value={serviceDate}
                  onChangeText={setServiceDate}
                  placeholder="YYYY-MM-DD"
                  autoCapitalize="none"
                  autoCorrect={false}
                  error={errors['date']}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Time</Text>
                <Input
                  value={serviceTime}
                  onChangeText={setServiceTime}
                  placeholder="09:00"
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="numbers-and-punctuation"
                  error={errors['time']}
                />
              </View>
            </View>

            {serviceType === 'Special' ? (
              <>
                <Text style={styles.fieldLabel}>Title (required for Special)</Text>
                <Input
                  value={serviceTitle}
                  onChangeText={setServiceTitle}
                  placeholder="e.g. Watch-night service"
                  autoCapitalize="words"
                  error={errors['title']}
                />
              </>
            ) : null}

            <Text style={styles.fieldLabel}>Topic (optional)</Text>
            <Input
              value={topic}
              onChangeText={setTopic}
              placeholder="e.g. Faith that moves"
              autoCapitalize="sentences"
            />

            <Text style={styles.fieldLabel}>Expected attendance (optional)</Text>
            <Input
              value={expectedAttendance}
              onChangeText={setExpectedAttendance}
              placeholder="e.g. 120"
              keyboardType="number-pad"
              error={errors['expected']}
            />
          </Card>

          <Button
            label={create.isPending ? 'Creating…' : 'Create service'}
            size="lg"
            fullWidth
            loading={create.isPending}
            onPress={() => {
              if (validate()) create.mutate();
            }}
          />
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={pickerOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setPickerOpen(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setPickerOpen(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Service type</Text>
            {TYPE_OPTIONS.map((t) => {
              const active = t === serviceType;
              return (
                <Pressable
                  key={t}
                  onPress={() => {
                    setServiceType(t);
                    setPickerOpen(false);
                  }}
                  style={[styles.sheetRow, active && styles.sheetRowActive]}
                >
                  <Text
                    style={[
                      styles.sheetRowLabel,
                      active && styles.sheetRowLabelActive,
                    ]}
                  >
                    {t}
                  </Text>
                  {active ? <Check color={colors.primary} size={16} strokeWidth={2} /> : null}
                </Pressable>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

function PickerField({
  value,
  onPress,
}: {
  value: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.pickerField}>
      <Text style={styles.pickerValue}>{value}</Text>
      <ChevronRight color="rgba(26,28,28,0.4)" size={16} strokeWidth={1.5} />
    </Pressable>
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
  fieldLabel: {
    ...typography.eyebrow,
    color: colors.ink,
    opacity: 0.6,
    marginBottom: 4,
  },
  rowFields: { flexDirection: 'row', gap: spacing.md },
  pickerField: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.cardLight,
    borderWidth: 1,
    borderColor: 'rgba(26,28,28,0.12)',
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    minHeight: 44,
  },
  pickerValue: { ...typography.body, color: colors.ink, flex: 1 },
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  sheet: {
    backgroundColor: colors.cardLight,
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
    backgroundColor: 'rgba(26,28,28,0.15)',
    marginBottom: spacing.sm,
  },
  sheetTitle: { ...typography.cardTitle, color: colors.ink, marginBottom: spacing.xs },
  sheetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.md,
  },
  sheetRowActive: { backgroundColor: 'rgba(93,63,211,0.08)' },
  sheetRowLabel: { ...typography.body, color: colors.ink },
  sheetRowLabelActive: { color: colors.primary, fontWeight: '600' },
});
