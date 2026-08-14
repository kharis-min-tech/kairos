import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, Flame, Calendar } from 'lucide-react-native';
import {
  Badge,
  Card,
  colors,
  gradients,
  radii,
  spacing,
  typography,
} from '@kairos/ui-native';
import { formatShortDate } from '@kairos/core';
import { api } from '@/lib/api-client';

type Window = 4 | 12 | 26;
const WINDOWS: { value: Window; label: string }[] = [
  { value: 4, label: '4 weeks' },
  { value: 12, label: '3 months' },
  { value: 26, label: '6 months' },
];

const STATUS_LABEL: Record<string, string> = {
  Present: 'Present',
  Late: 'Late',
  Virtual: 'Virtual',
  Excused: 'Excused',
  Absent: 'Absent',
};

const STATUS_VARIANT: Record<
  string,
  'success' | 'gold' | 'info' | 'neutral' | 'danger'
> = {
  Present: 'success',
  Late: 'gold',
  Virtual: 'info',
  Excused: 'info',
  Absent: 'danger',
};

function formatPct(rate: number): string {
  return `${Math.round(rate * 100)}%`;
}

export default function MyAttendance() {
  const router = useRouter();
  const [weeks, setWeeks] = useState<Window>(12);

  const snapshot = useQuery({
    queryKey: ['attendance', 'mine', weeks],
    queryFn: async () => (await api.attendance.mine({ weeks })).data ?? null,
  });

  const s = snapshot.data;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerBar}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ChevronLeft color={colors.ink} size={24} strokeWidth={1.5} />
        </Pressable>
        <Text style={styles.headerTitle}>My attendance</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={snapshot.isFetching}
            onRefresh={() => snapshot.refetch()}
            tintColor={colors.primary}
          />
        }
      >
        <View style={styles.windowRow}>
          {WINDOWS.map((w) => {
            const active = weeks === w.value;
            return (
              <Pressable
                key={w.value}
                onPress={() => setWeeks(w.value)}
                style={[styles.windowChip, active && styles.windowChipActive]}
              >
                <Text
                  style={[styles.windowLabel, active && styles.windowLabelActive]}
                >
                  {w.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {snapshot.isLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xxl }} />
        ) : null}

        {snapshot.isError ? (
          <Card padding="md">
            <Text style={styles.errorLine}>
              Couldn&apos;t load your attendance:{' '}
              {snapshot.error instanceof Error
                ? snapshot.error.message
                : 'Unknown error'}
            </Text>
          </Card>
        ) : null}

        {s ? (
          <>
            <LinearGradient
              colors={gradients.brand}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.heroCard}
            >
              <Text style={styles.heroEyebrow}>YOUR RATE · LAST {s.windowWeeks} WEEKS</Text>
              <Text style={styles.heroBig}>{formatPct(s.rate)}</Text>
              <Text style={styles.heroSub}>
                {s.attendedCount} of {s.servicesInWindow} services
              </Text>
              <View style={styles.streakRow}>
                <View style={styles.streakIconTile}>
                  <Flame
                    color={s.currentStreak.kind === 'attended' ? colors.gold : '#ffffff'}
                    size={16}
                    strokeWidth={1.5}
                  />
                </View>
                <Text style={styles.streakLabel}>
                  {s.currentStreak.length === 0
                    ? 'No streak yet'
                    : s.currentStreak.kind === 'attended'
                      ? `${s.currentStreak.length}-service attending streak`
                      : `Missed ${s.currentStreak.length} in a row`}
                </Text>
              </View>
            </LinearGradient>

            <Card padding="md" style={{ gap: spacing.sm }}>
              <Text style={styles.sectionEyebrow}>BREAKDOWN</Text>
              <View style={styles.miniStatsRow}>
                <MiniStat label="Present" value={s.presentOnTimeCount} tone={colors.successText} />
                <MiniStat label="Late" value={s.lateCount} tone={colors.goldDark} />
                <MiniStat label="Virtual" value={s.virtualCount} tone={colors.info} />
                <MiniStat label="Missed" value={s.missedCount} tone={colors.danger} />
              </View>
            </Card>

            {s.lastService ? (
              <Card padding="md" style={{ gap: spacing.xs }}>
                <Text style={styles.sectionEyebrow}>LAST SERVICE</Text>
                <View style={styles.lastServiceRow}>
                  <View style={styles.lastServiceIconTile}>
                    <Calendar color={colors.primary} size={16} strokeWidth={1.5} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.lastServiceLabel}>
                      {s.lastService.serviceTitle ?? s.lastService.serviceType}
                    </Text>
                    <Text style={styles.lastServiceMeta}>
                      {formatShortDate(s.lastService.serviceDate)}
                      {s.lastAttendedAt
                        ? ` · attended ${formatShortDate(s.lastAttendedAt)}`
                        : ' · missed'}
                    </Text>
                  </View>
                </View>
              </Card>
            ) : null}

            {s.history.length > 0 ? (
              <View style={styles.section}>
                <Text style={styles.sectionEyebrow}>HISTORY</Text>
                <Card padding="md" style={{ gap: spacing.xs }}>
                  {s.history.map((h, idx) => (
                    <View
                      key={h.serviceId}
                      style={[
                        styles.historyRow,
                        idx > 0 ? styles.rowDivider : null,
                      ]}
                    >
                      <Text style={styles.historyDate}>
                        {formatShortDate(h.serviceDate)}
                      </Text>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.historyLabel} numberOfLines={1}>
                          {h.serviceType}
                        </Text>
                      </View>
                      <Badge
                        label={
                          h.status
                            ? STATUS_LABEL[h.status] ?? h.status
                            : 'Absent'
                        }
                        variant={h.status ? STATUS_VARIANT[h.status] ?? 'neutral' : 'danger'}
                        size="sm"
                      />
                    </View>
                  ))}
                </Card>
              </View>
            ) : (
              <Card padding="md">
                <Text style={styles.emptyLine}>
                  No service history in this window. Your attendance shows up here as
                  soon as a leader records you at a service.
                </Text>
              </Card>
            )}
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function MiniStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: string;
}) {
  return (
    <View style={styles.miniStat}>
      <Text style={[styles.miniStatValue, { color: tone }]}>{value}</Text>
      <Text style={styles.miniStatLabel}>{label}</Text>
    </View>
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
  windowRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  windowChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.pill,
    backgroundColor: colors.subtleLight,
  },
  windowChipActive: {
    backgroundColor: colors.primary,
  },
  windowLabel: { ...typography.meta, color: colors.ink, fontWeight: '600' },
  windowLabelActive: { color: '#ffffff' },
  heroCard: {
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  heroEyebrow: {
    ...typography.eyebrow,
    color: 'rgba(255,255,255,0.75)',
  },
  heroBig: {
    fontSize: 44,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -1,
    marginTop: 2,
  },
  heroSub: {
    ...typography.body,
    color: 'rgba(255,255,255,0.85)',
  },
  streakRow: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.2)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  streakIconTile: {
    width: 32,
    height: 32,
    borderRadius: radii.sm,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  streakLabel: {
    ...typography.body,
    color: '#ffffff',
    fontWeight: '600',
    flex: 1,
  },
  sectionEyebrow: {
    ...typography.eyebrow,
    color: 'rgba(26,28,28,0.55)',
  },
  section: { gap: spacing.sm },
  miniStatsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
  },
  miniStat: {
    flex: 1,
    alignItems: 'flex-start',
  },
  miniStatValue: {
    fontSize: 22,
    fontWeight: '800',
  },
  miniStatLabel: {
    ...typography.meta,
    color: 'rgba(26,28,28,0.55)',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  lastServiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  lastServiceIconTile: {
    width: 32,
    height: 32,
    borderRadius: radii.sm,
    backgroundColor: 'rgba(93,63,211,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lastServiceLabel: {
    ...typography.body,
    color: colors.ink,
    fontWeight: '600',
  },
  lastServiceMeta: {
    ...typography.meta,
    color: 'rgba(26,28,28,0.6)',
    marginTop: 2,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  rowDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(26,28,28,0.08)',
  },
  historyDate: {
    ...typography.meta,
    color: colors.primary,
    fontWeight: '700',
    minWidth: 60,
  },
  historyLabel: { ...typography.body, color: colors.ink },
  emptyLine: {
    ...typography.body,
    color: 'rgba(26,28,28,0.55)',
    textAlign: 'center',
    lineHeight: 20,
  },
  errorLine: {
    ...typography.body,
    color: colors.danger,
  },
});
