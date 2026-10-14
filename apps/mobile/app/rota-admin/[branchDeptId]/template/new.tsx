import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft } from 'lucide-react-native';
import {
  Button,
  Card,
  Input,
  TimePicker,
  radii,
  spacing,
  typography,
  useThemedStyles,
  type ThemeColors,
} from '@kairos/ui-native';
import { api } from '@/lib/api-client';
import { alert } from '@/lib/alert';
import { useTranslation } from 'react-i18next';

const WEEKDAYS = [
  { value: 0, label: 'Sun' },
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
];

export default function NewRotaTemplate() {  const { t } = useTranslation(['rota', 'common']);

  const styles = useThemedStyles(makeStyles);
  const router = useRouter();
  const qc = useQueryClient();
  const { branchDeptId } = useLocalSearchParams<{ branchDeptId: string }>();

  const [name, setName] = useState('');
  const [weekday, setWeekday] = useState<number>(0);
  const [defaultStartTime, setDefaultStartTime] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const create = useMutation({
    mutationFn: async () => {
      const payload: Parameters<typeof api.departments.rota.createTemplate>[1] = {
        name: name.trim(),
        weekday,
      };
      if (defaultStartTime) payload.defaultStartTime = defaultStartTime;
      if (notes.trim()) payload.notes = notes.trim();
      const res = await api.departments.rota.createTemplate(branchDeptId!, payload);
      if (!res.success) throw new Error(res.message ?? 'Could not create template.');
      return res.data!;
    },
    onSuccess: (row) => {
      qc.invalidateQueries({ queryKey: ['rota', 'templates', branchDeptId] });
      router.replace(`/rota-admin/${branchDeptId}/template/${row.id}` as never);
    },
    onError: (e: Error) =>
      alert.info('Could not create', e.message ?? 'Please try again.'),
  });

  function submit() {
    const next: Record<string, string> = {};
    if (!name.trim()) next['name'] = 'Give the template a name';
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    create.mutate();
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerBar}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ChevronLeft color="#111" size={24} strokeWidth={1.5} />
        </Pressable>
        <Text style={styles.headerTitle}>{t('rota:newRotaTemplate')}</Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.container}>
          <Card padding="md" style={{ gap: spacing.md }}>
            <View style={{ gap: 4 }}>
              <Text style={styles.label}>{t('rota:templateName')}</Text>
              <Input
                value={name}
                onChangeText={(v) => {
                  setName(v);
                  setErrors((p) => {
                    const n = { ...p };
                    delete n['name'];
                    return n;
                  });
                }}
                placeholder={t('rota:eGSundayFirstService')}
                autoCapitalize="words"
                error={errors['name']}
              />
            </View>

            <View style={{ gap: 4 }}>
              <Text style={styles.label}>{t('rota:serviceDay')}</Text>
              <View style={styles.weekdayRow}>
                {WEEKDAYS.map((d) => {
                  const active = d.value === weekday;
                  return (
                    <Pressable
                      key={d.value}
                      onPress={() => setWeekday(d.value)}
                      style={[styles.weekdayBtn, active && styles.weekdayBtnActive]}
                    >
                      <Text
                        style={[
                          styles.weekdayLabel,
                          active && styles.weekdayLabelActive,
                        ]}
                      >
                        {d.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <TimePicker
              label={t('rota:defaultStartTimeOptional')}
              value={defaultStartTime}
              onChange={setDefaultStartTime}
            />

            <View style={{ gap: 4 }}>
              <Text style={styles.label}>Notes (optional)</Text>
              <Input
                value={notes}
                onChangeText={setNotes}
                placeholder={t('rota:anythingTheTeamShouldKnow')}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                containerStyle={{ minHeight: 80 }}
              />
            </View>
          </Card>

          <Text style={styles.footnote}>{t('rota:afterCreatingTheTemplateAddRole')}</Text>

          <Button
            label={create.isPending ? t('rota:creating') : t('rota:createTemplate')}
            size="lg"
            fullWidth
            loading={create.isPending}
            onPress={submit}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
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
    label: { ...typography.eyebrow, color: c.ink, opacity: 0.6 },
    weekdayRow: { flexDirection: 'row', gap: 4 },
    weekdayBtn: {
      flex: 1,
      paddingVertical: spacing.sm,
      alignItems: 'center',
      backgroundColor: c.card,
      borderRadius: radii.sm,
      borderWidth: 1,
      borderColor: c.border,
    },
    weekdayBtnActive: {
      backgroundColor: 'rgba(93,63,211,0.1)',
      borderColor: c.primary,
    },
    weekdayLabel: { ...typography.meta, color: c.inkMuted, fontWeight: '600' },
    weekdayLabelActive: { color: c.primary, fontWeight: '700' },
    footnote: {
      ...typography.meta,
      color: c.inkFaded,
      paddingHorizontal: spacing.xs,
      lineHeight: 15,
    },
  });
}
