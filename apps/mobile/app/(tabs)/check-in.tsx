import { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { alert } from '@/lib/alert';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Clock, X as XIcon } from 'lucide-react-native';
import {
  Avatar,
  Card,
  spacing,
  typography,
  radii,
  gradients,
  shadows,
  useThemedStyles,
  type ThemeColors,
  useColors,
} from '@kairos/ui-native';
import type { SelfCheckInCandidate } from '@kairos/types';
import { api } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth';

function formatServiceTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function formatServiceLabel(c: SelfCheckInCandidate): string {
  const time = formatServiceTime(c.serviceDate);
  const label = c.serviceTitle ?? c.serviceType;
  return `${label} · ${time}`;
}

export default function CheckIn() {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();
  const [pickerOpen, setPickerOpen] = useState(false);

  const candidates = useQuery({
    queryKey: ['attendance', 'self-check-in', 'candidates'],
    queryFn: async () =>
      (await api.attendance.selfCheckInCandidates()).data ?? [],
    // Poll every 60s while the tab is mounted so a window that opens mid-view
    // flips to "open" without needing a manual refresh.
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });

  const stats = useQuery({
    queryKey: ['analytics', 'member'],
    queryFn: async () => (await api.analytics.memberStats()).data,
    enabled: !!user,
  });

  const rows = useMemo(() => candidates.data ?? [], [candidates.data]);
  const openRows = useMemo(() => rows.filter((r) => r.status === 'open'), [rows]);
  const openingSoonRows = useMemo(
    () => rows.filter((r) => r.status === 'opens-soon'),
    [rows],
  );
  const closedRows = useMemo(
    () => rows.filter((r) => r.status === 'closed'),
    [rows],
  );

  const nextOpening = openingSoonRows[0];
  const nextService = openRows[0] ?? nextOpening ?? closedRows[0];
  const canCheckIn = openRows.length > 0;

  const checkIn = useMutation({
    mutationFn: async (serviceId: string) => {
      const res = await api.attendance.selfCheckIn(serviceId);
      if (!res.success || !res.data) {
        throw new Error(res.message ?? 'Check-in failed');
      }
      return res.data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['attendance', 'self-check-in', 'candidates'] });
      qc.invalidateQueries({ queryKey: ['analytics', 'member'] });
      const title = data.alreadyCheckedIn
        ? "You're already checked in"
        : data.status === 'Late'
          ? "You're checked in — marked Late"
          : "You're in";
      const body = data.alreadyCheckedIn
        ? `Recorded as ${data.status}.`
        : data.status === 'Late'
          ? "The service already started, but you're recorded."
          : 'Have a great service.';
      alert.info(title, body);
    },
    onError: (e: Error) =>
      alert.info('Check-in failed', e.message ?? 'Please try again.'),
  });

  function handleCheckInPress() {
    if (!canCheckIn) return;
    if (openRows.length === 1) {
      checkIn.mutate(openRows[0]!.serviceId);
      return;
    }
    setPickerOpen(true);
  }

  const displayName = user ? `${user.firstName} ${user.lastName}` : 'Signed in';
  const attendanceTotal = stats.data?.recentAttendance?.total ?? 0;
  const attendancePresent = stats.data?.recentAttendance?.present ?? 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Check-in</Text>
          <Text style={styles.subtitle}>
            One tap marks you present at the live service.
          </Text>
        </View>

        <View style={styles.happeningCard}>
          <LinearGradient
            colors={gradients.brandDeep}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.happeningCardBg}
          />
          <View style={styles.happeningContent}>
            <View style={styles.happeningEyebrowRow}>
              <View
                style={[
                  styles.pulseDot,
                  canCheckIn ? null : styles.pulseDotDim,
                ]}
              />
              <Text style={styles.happeningEyebrow}>
                {canCheckIn
                  ? 'Happening now'
                  : nextOpening
                    ? 'Opening soon'
                    : 'Today'}
              </Text>
            </View>
            {candidates.isLoading ? (
              <ActivityIndicator color="#ffffff" style={{ marginTop: spacing.sm }} />
            ) : nextService ? (
              <>
                <Text style={styles.happeningTitle}>
                  {nextService.serviceTitle ?? nextService.serviceType}
                </Text>
                <Text style={styles.happeningMeta}>
                  {new Date(nextService.serviceDate).toLocaleDateString('en-GB', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                  })}{' '}
                  · {formatServiceTime(nextService.serviceDate)}
                </Text>
                {canCheckIn ? (
                  <View style={styles.windowPill}>
                    <Text style={styles.windowLabel}>Check-in window open</Text>
                  </View>
                ) : nextOpening ? (
                  <View style={styles.windowPill}>
                    <Clock color="#ffffff" size={12} strokeWidth={1.5} />
                    <Text style={styles.windowLabel}>
                      Opens in {nextOpening.minutesUntilOpen} min
                    </Text>
                  </View>
                ) : (
                  <View style={[styles.windowPill, styles.windowPillMuted]}>
                    <Text style={styles.windowLabel}>Check-in closed</Text>
                  </View>
                )}
              </>
            ) : (
              <>
                <Text style={styles.happeningTitle}>No service scheduled</Text>
                <Text style={styles.happeningMeta}>Check back closer to Sunday.</Text>
              </>
            )}
          </View>
        </View>

        <View style={styles.identityRow}>
          <Avatar
            size="sm"
            photoUrl={user?.photoUrl}
            firstName={user?.firstName}
            lastName={user?.lastName}
          />
          <View style={styles.identityText}>
            <Text style={styles.identityName}>{displayName}</Text>
            <Text style={styles.identityMeta}>Your home branch</Text>
          </View>
        </View>

        <Pressable
          onPress={handleCheckInPress}
          disabled={!canCheckIn || checkIn.isPending}
          style={({ pressed }) => [
            styles.checkinPill,
            shadows.buttonHero,
            (!canCheckIn || pressed || checkIn.isPending) && { opacity: 0.85 },
          ]}
        >
          <LinearGradient
            colors={gradients.brand}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.checkinPillBg}
          />
          {checkIn.isPending ? (
            <ActivityIndicator color="#ffffff" size="small" />
          ) : (
            <Check color="#ffffff" size={20} strokeWidth={2} />
          )}
          <Text style={styles.checkinLabel}>
            {checkIn.isPending ? 'Checking in…' : "I'm here"}
          </Text>
        </Pressable>

        <Text style={styles.caption}>
          {canCheckIn
            ? openRows.length > 1
              ? 'You have two services open — you\'ll be asked which one.'
              : 'Tap once to mark yourself present.'
            : nextOpening
              ? `Opens in ${nextOpening.minutesUntilOpen} minute${nextOpening.minutesUntilOpen === 1 ? '' : 's'}.`
              : closedRows.length > 0
                ? 'Ask a leader to record your attendance.'
                : 'Nothing scheduled to check into today.'}
        </Text>

        <Card padding="md" style={styles.statCard}>
          <Text style={styles.statEyebrow}>Recent attendance</Text>
          <Text style={styles.statNumber}>
            {attendanceTotal === 0
              ? '—'
              : `${attendancePresent} of ${attendanceTotal}`}
          </Text>
          <Text style={styles.statMeta}>
            {attendanceTotal > 0
              ? 'Present at recent services.'
              : 'Nothing recorded yet.'}
          </Text>
        </Card>
      </ScrollView>

      {/* Multi-service picker — only used when two services' windows overlap. */}
      <Modal
        visible={pickerOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setPickerOpen(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setPickerOpen(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Which service?</Text>
            <Text style={styles.sheetHint}>
              Two check-in windows are open right now. Pick the one you&apos;re at.
            </Text>
            {openRows.map((r) => (
              <Pressable
                key={r.serviceId}
                onPress={() => {
                  setPickerOpen(false);
                  checkIn.mutate(r.serviceId);
                }}
                style={styles.sheetRow}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.sheetRowLabel}>{formatServiceLabel(r)}</Text>
                </View>
                <Check color={c.primary} size={16} strokeWidth={2} />
              </Pressable>
            ))}
            <Pressable style={styles.sheetCancel} onPress={() => setPickerOpen(false)}>
              <XIcon color={c.inkMuted} size={16} strokeWidth={1.5} />
              <Text style={styles.sheetCancelLabel}>Cancel</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.page },
  container: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  header: { paddingTop: spacing.md, gap: 2 },
  title: { ...typography.screenTitle, color: c.ink },
  subtitle: { ...typography.meta, color: c.inkMuted },

  happeningCard: {
    borderRadius: radii.lg,
    overflow: 'hidden',
  },
  happeningCardBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  happeningContent: {
    padding: spacing.lg,
    gap: spacing.xs,
  },
  happeningEyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: c.success,
  },
  pulseDotDim: { backgroundColor: 'rgba(255,255,255,0.5)' },
  happeningEyebrow: {
    ...typography.eyebrow,
    color: 'rgba(255,255,255,0.7)',
  },
  happeningTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
  },
  happeningMeta: {
    ...typography.body,
    color: 'rgba(255,255,255,0.75)',
  },
  windowPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.16)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.pill,
    marginTop: spacing.sm,
  },
  windowPillMuted: { backgroundColor: 'rgba(255,255,255,0.08)' },
  windowLabel: {
    ...typography.meta,
    color: '#ffffff',
    fontWeight: '600',
  },

  identityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  identityText: { gap: 2 },
  identityName: { ...typography.cardTitle, color: c.ink },
  identityMeta: { ...typography.meta, color: c.inkMuted },

  checkinPill: {
    height: 56,
    borderRadius: radii.lg,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  checkinPillBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  checkinLabel: {
    ...typography.button,
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '700',
  },
  caption: {
    ...typography.meta,
    color: c.inkMuted,
    textAlign: 'center',
    marginTop: -spacing.xs,
  },

  statCard: { gap: spacing.xs },
  statEyebrow: { ...typography.eyebrow, color: c.inkMuted },
  statNumber: { fontSize: 26, fontWeight: '800', color: c.ink },
  statMeta: { ...typography.meta, color: c.inkMuted },

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
  sheetTitle: { ...typography.cardTitle, color: c.ink },
  sheetHint: {
    ...typography.meta,
    color: c.inkMuted,
    marginBottom: spacing.sm,
  },
  sheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.md,
  },
  sheetRowLabel: { ...typography.body, color: c.ink },
  sheetCancel: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
  },
  sheetCancelLabel: { ...typography.button, color: c.inkMuted },
});
}

