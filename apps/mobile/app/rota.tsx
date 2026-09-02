import { useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { alert } from '@/lib/alert';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft } from 'lucide-react-native';
import {
  Card,
  Badge,
  Button,
  spacing,
  typography,
  radii,
  gradients,
  useThemedStyles,
  type ThemeColors,
  useColors,
} from '@kairos/ui-native';
import { api } from '@/lib/api-client';

type DutyRow = NonNullable<Awaited<ReturnType<typeof api.me.rota>>['data']>[number];

export default function MyRota() {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  const router = useRouter();
  const qc = useQueryClient();

  const rota = useQuery({
    queryKey: ['me', 'rota', 'all'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0]!;
      const in180 = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0]!;
      const res = await api.me.rota({ from: today, to: in180 });
      return res.data ?? [];
    },
  });

  const [swapDuty, setSwapDuty] = useState<DutyRow | null>(null);
  const [swapReason, setSwapReason] = useState('');

  const confirm = useMutation({
    mutationFn: async (duty: DutyRow) => {
      const res = await api.departments.rota.updateAssignment(
        duty.branchDepartmentId,
        duty.instanceId,
        duty.assignmentId,
        { status: 'Confirmed' },
      );
      if (!res.success) throw new Error(res.message ?? 'Confirm failed');
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['me', 'rota'] });
      alert.info("You're confirmed", 'Thanks for letting the team know.');
    },
    onError: (e: Error) =>
      alert.info('Could not confirm', e.message ?? 'Please try again.'),
  });

  const requestSwap = useMutation({
    mutationFn: async ({ duty, reason }: { duty: DutyRow; reason: string }) => {
      const res = await api.departments.rota.createSwapRequest(
        duty.branchDepartmentId,
        duty.instanceId,
        duty.assignmentId,
        { reason: reason.trim() || undefined },
      );
      if (!res.success) throw new Error(res.message ?? 'Swap request failed');
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['me', 'rota'] });
      setSwapDuty(null);
      setSwapReason('');
      alert.info(
        'Swap requested',
        'Your rota lead has been notified. Someone from the pool can pick it up.',
      );
    },
    onError: (e: Error) =>
      alert.info('Could not request swap', e.message ?? 'Please try again.'),
  });

  function openSwapSheet(duty: DutyRow) {
    setSwapDuty(duty);
    setSwapReason('');
  }

  const sorted = useMemo(
    () =>
      (rota.data ?? []).slice().sort(
        (a, b) => new Date(a.serviceDate).getTime() - new Date(b.serviceDate).getTime(),
      ),
    [rota.data],
  );

  const [next, ...upcoming] = sorted;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerBar}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ChevronLeft color={c.ink} size={24} strokeWidth={1.5} />
        </Pressable>
        <Text style={styles.headerTitle}>My rota</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={rota.isFetching}
            onRefresh={() => rota.refetch()}
            tintColor={c.primary}
          />
        }
      >
        {rota.isLoading ? (
          <ActivityIndicator color={c.primary} style={{ marginTop: spacing.xxl }} />
        ) : null}

        {next ? (
          <View style={styles.heroCard}>
            <LinearGradient
              colors={gradients.brandDeep}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.heroBg}
            />
            <View style={styles.heroContent}>
              <Text style={styles.heroEyebrow}>Next duty · {relativeLabel(next.serviceDate)}</Text>
              <Text style={styles.heroDate}>{longDate(next.serviceDate)}</Text>
              <View style={styles.heroFieldRow}>
                <HeroField label="Role" value={next.slotRoleName} />
                <HeroField label="Time" value={next.startTime ?? '—'} />
                <HeroField label="Status" value={next.status} />
              </View>
              <View style={styles.heroActions}>
                <Button
                  label={next.status.toLowerCase().includes('confirm') ? 'Confirmed' : 'Confirm'}
                  size="sm"
                  variant="secondary"
                  loading={confirm.isPending}
                  disabled={
                    confirm.isPending || next.status.toLowerCase().includes('confirm')
                  }
                  onPress={() => confirm.mutate(next)}
                  style={styles.heroButton}
                />
                <Button
                  label="Request swap"
                  size="sm"
                  variant="outline"
                  onPress={() => openSwapSheet(next)}
                  style={styles.heroButton}
                />
              </View>
            </View>
          </View>
        ) : (
          !rota.isLoading && (
            <Card padding="lg" style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No upcoming duties</Text>
              <Text style={styles.emptyMeta}>
                Nothing scheduled in the next 180 days.
              </Text>
            </Card>
          )
        )}

        {swapDuty ? (
          <SwapRequestSheet
            duty={swapDuty}
            reason={swapReason}
            onReasonChange={setSwapReason}
            onCancel={() => {
              setSwapDuty(null);
              setSwapReason('');
            }}
            onConfirm={() => requestSwap.mutate({ duty: swapDuty, reason: swapReason })}
            submitting={requestSwap.isPending}
          />
        ) : null}

        {upcoming.length ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Upcoming</Text>
            <View style={styles.upcomingList}>
              {upcoming.map((d) => (
                <Card key={d.assignmentId} padding="md" style={styles.dutyCard}>
                  <View style={styles.dateTile}>
                    <Text style={styles.dateTileMonth}>{shortMonth(d.serviceDate)}</Text>
                    <Text style={styles.dateTileDay}>{dayOfMonth(d.serviceDate)}</Text>
                  </View>
                  <View style={styles.dutyText}>
                    <Text style={styles.dutyTitle}>{d.slotRoleName}</Text>
                    <Text style={styles.dutyMeta}>
                      {d.templateName}
                      {d.startTime ? ` · ${d.startTime}` : ''}
                    </Text>
                  </View>
                  <Badge label={d.status} variant={badgeVariant(d.status)} size="sm" />
                </Card>
              ))}
            </View>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function SwapRequestSheet({
  duty,
  reason,
  onReasonChange,
  onCancel,
  onConfirm,
  submitting,
}: {
  duty: DutyRow;
  reason: string;
  onReasonChange: (v: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
  submitting: boolean;
}) {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onCancel}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Pressable style={styles.backdrop} onPress={submitting ? undefined : onCancel}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Request a swap</Text>
            <Text style={styles.sheetMeta}>
              {duty.slotRoleName} · {longDate(duty.serviceDate)}
              {duty.startTime ? ` · ${duty.startTime}` : ''}
            </Text>
            <Text style={styles.sheetHint}>
              Your rota lead is notified and can offer this slot to another
              member of the pool. Add a note if there&apos;s context that helps.
            </Text>
            <TextInput
              multiline
              value={reason}
              onChangeText={onReasonChange}
              placeholder="Optional: why you can't make it"
              placeholderTextColor={c.inkFaded}
              style={styles.sheetInput}
              editable={!submitting}
            />
            <View style={styles.sheetFooter}>
              <View style={{ flex: 1 }}>
                <Button
                  label="Cancel"
                  variant="ghost"
                  onPress={onCancel}
                  disabled={submitting}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Button
                  label={submitting ? 'Sending…' : 'Request swap'}
                  onPress={onConfirm}
                  loading={submitting}
                />
              </View>
            </View>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function HeroField({ label, value }: { label: string; value: string }) {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  return (
    <View style={styles.heroField}>
      <Text style={styles.heroFieldLabel}>{label}</Text>
      <Text style={styles.heroFieldValue}>{value}</Text>
    </View>
  );
}

function longDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}
function shortMonth(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { month: 'short' }).toUpperCase();
}
function dayOfMonth(iso: string): string {
  return String(new Date(iso).getDate());
}
function relativeLabel(iso: string): string {
  const days = Math.round((new Date(iso).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (days <= 0) return 'today';
  if (days === 1) return 'tomorrow';
  return `in ${days} days`;
}
function badgeVariant(status: string): 'primary' | 'success' | 'gold' | 'neutral' {
  const s = status.toLowerCase();
  if (s.includes('confirm')) return 'success';
  if (s.includes('pending')) return 'gold';
  if (s.includes('assigned')) return 'primary';
  return 'neutral';
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
  heroCard: {
    borderRadius: radii.lg,
    overflow: 'hidden',
  },
  heroBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  heroContent: {
    padding: spacing.lg,
    gap: spacing.sm,
  },
  heroEyebrow: {
    ...typography.eyebrow,
    color: 'rgba(255,255,255,0.7)',
  },
  heroDate: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
  },
  heroFieldRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  heroField: { gap: 2 },
  heroFieldLabel: {
    ...typography.eyebrow,
    color: 'rgba(255,255,255,0.5)',
  },
  heroFieldValue: {
    ...typography.body,
    color: '#ffffff',
    fontWeight: '600',
  },
  heroActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  heroButton: { flex: 1, backgroundColor: 'rgba(255,255,255,0.14)' },

  emptyCard: { alignItems: 'center', gap: spacing.xs },
  emptyTitle: { ...typography.cardTitle, color: c.ink },
  emptyMeta: { ...typography.meta, color: c.inkMuted },

  section: { gap: spacing.sm },
  sectionTitle: { ...typography.eyebrow, color: c.inkMuted },
  upcomingList: { gap: spacing.sm },
  dutyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  dateTile: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    backgroundColor: 'rgba(93,63,211,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateTileMonth: {
    fontSize: 8,
    fontWeight: '700',
    color: c.primary,
    letterSpacing: 0.8,
  },
  dateTileDay: {
    fontSize: 18,
    fontWeight: '700',
    color: c.primary,
    lineHeight: 20,
  },
  dutyText: { flex: 1, gap: 2 },
  dutyTitle: { ...typography.cardTitle, color: c.ink },
  dutyMeta: { ...typography.meta, color: c.inkMuted },

  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
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
  sheetTitle: { ...typography.cardTitle, color: c.ink },
  sheetMeta: { ...typography.meta, color: c.inkMuted },
  sheetHint: {
    ...typography.meta,
    color: c.inkMuted,
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
    lineHeight: 16,
  },
  sheetInput: {
    minHeight: 96,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: radii.md,
    padding: spacing.md,
    ...typography.body,
    color: c.ink,
    textAlignVertical: 'top',
  },
  sheetFooter: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
});
}

