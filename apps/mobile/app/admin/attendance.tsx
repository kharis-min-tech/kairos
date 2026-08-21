import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, TrendingDown, TrendingUp } from 'lucide-react-native';
import Svg, { Rect, Text as SvgText, G } from 'react-native-svg';
import {
  Avatar,
  Card,
  colors,
  spacing,
  typography,
  radii,
  useThemedStyles,
  type ThemeColors,
  useColors,
} from '@kairos/ui-native';
import { api } from '@/lib/api-client';
import { useCapabilities, useRequireCapability } from '@/lib/capabilities';
import { useAuthStore } from '@/store/auth';

type Range = '6w' | '3m' | 'ytd';

const RANGE_WEEKS: Record<Range, number> = {
  '6w': 6,
  '3m': 13,
  ytd: 52,
};
const RANGE_LABELS: Record<Range, string> = {
  '6w': '6 weeks',
  '3m': '3 months',
  ytd: 'YTD',
};

export default function AttendanceComparison() {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  const router = useRouter();
  const [range, setRange] = useState<Range>('6w');
  const weeks = RANGE_WEEKS[range];

  const caps = useCapabilities();
  const branchId = useAuthStore((s) => s.user?.homeBranchId ?? null);
  const canAccess =
    caps.systemRole === 'admin' ||
    (!!branchId && caps.has('branch:read', { kind: 'branch', id: branchId }));
  useRequireCapability(canAccess);

  const trends = useQuery({
    queryKey: ['attendance', 'trends', weeks],
    queryFn: async () => (await api.attendance.trends({ weeks })).data ?? [],
  });

  const missing = useQuery({
    queryKey: ['attendance', 'missing'],
    queryFn: async () =>
      (await api.attendance.missingMembers({ services: 3 })).data ?? [],
  });

  const today = trends.data?.[trends.data.length - 1] ?? null;
  const priorWindow = (trends.data ?? []).slice(0, -1);
  const priorAvg =
    priorWindow.length > 0
      ? Math.round(
          priorWindow.reduce((sum, p) => sum + p.attendees, 0) / priorWindow.length,
        )
      : 0;
  const delta = today && priorAvg > 0
    ? Math.round(((today.attendees - priorAvg) / priorAvg) * 100)
    : 0;
  const trendUp = delta >= 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerBar}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ChevronLeft color={c.ink} size={24} strokeWidth={1.5} />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Service attendance</Text>
          <Text style={styles.headerSub}>Sundays across recent weeks</Text>
        </View>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={trends.isFetching || missing.isFetching}
            onRefresh={() => {
              trends.refetch();
              missing.refetch();
            }}
            tintColor={c.primary}
          />
        }
      >
        <View style={styles.rangeRow}>
          {(Object.keys(RANGE_LABELS) as Range[]).map((r) => {
            const active = range === r;
            return (
              <Pressable
                key={r}
                onPress={() => setRange(r)}
                style={[styles.rangeChip, active && styles.rangeChipActive]}
              >
                <Text style={[styles.rangeLabel, active && styles.rangeLabelActive]}>
                  {RANGE_LABELS[r]}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {trends.isLoading ? (
          <ActivityIndicator color={c.primary} style={{ marginTop: spacing.xl }} />
        ) : (
          <Card padding="lg" style={styles.heroCard}>
            <Text style={styles.heroEyebrow}>This week</Text>
            <Text style={styles.heroNumber}>
              {today?.attendees ?? 0}
              <Text style={styles.heroUnit}> attending</Text>
            </Text>
            {priorAvg > 0 ? (
              <View style={[styles.deltaRow, !trendUp && styles.deltaDown]}>
                {trendUp ? (
                  <TrendingUp color={c.successText} size={14} strokeWidth={2} />
                ) : (
                  <TrendingDown color={c.danger} size={14} strokeWidth={2} />
                )}
                <Text
                  style={[
                    styles.deltaLabel,
                    { color: trendUp ? c.successText : c.danger },
                  ]}
                >
                  {trendUp ? '+' : ''}
                  {delta}% vs. {RANGE_LABELS[range].toLowerCase()} avg
                </Text>
              </View>
            ) : null}
            <Text style={styles.heroMeta}>
              {missing.data?.length ?? 0} member
              {missing.data?.length === 1 ? '' : 's'} not seen recently
            </Text>
          </Card>
        )}

        {trends.data && trends.data.length > 0 ? (
          <Card padding="md" style={styles.chartCard}>
            <Text style={styles.chartLabel}>Weekly attendance</Text>
            <BarChart data={trends.data} />
          </Card>
        ) : null}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Missing recently</Text>
            {missing.data && missing.data.length > 0 ? (
              <Text style={styles.sectionCount}>{missing.data.length}</Text>
            ) : null}
          </View>

          {missing.isLoading ? (
            <ActivityIndicator color={c.primary} style={{ marginTop: spacing.md }} />
          ) : (missing.data ?? []).length === 0 ? (
            <Card padding="md">
              <Text style={styles.emptyText}>Everyone accounted for.</Text>
            </Card>
          ) : (
            <Card padding="none" style={styles.missingCard}>
              {(missing.data ?? []).slice(0, 15).map((m, i) => (
                <View
                  key={m.memberId}
                  style={[
                    styles.missingRow,
                    i > 0 && styles.missingRowDivider,
                  ]}
                >
                  <Avatar size="sm" firstName={m.firstName} lastName={m.lastName} />
                  <View style={styles.missingText}>
                    <Text style={styles.missingName}>
                      {m.firstName} {m.lastName}
                    </Text>
                    <Text style={styles.missingMeta}>
                      Away {m.missedStreak} service{m.missedStreak === 1 ? '' : 's'}
                    </Text>
                  </View>
                </View>
              ))}
            </Card>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function BarChart({
  data,
}: {
  data: { weekStart: string; attendees: number }[];
}) {
  const c = useColors();
  const screenWidth = Dimensions.get('window').width;
  const chartWidth = screenWidth - spacing.lg * 2 - spacing.md * 2;
  const chartHeight = 120;
  const barPadding = 6;
  const labelHeight = 18;

  const max = Math.max(...data.map((d) => d.attendees), 1);
  const barSlot = chartWidth / data.length;
  const barWidth = barSlot - barPadding;

  return (
    <Svg width={chartWidth} height={chartHeight} accessibilityRole="image">
      {data.map((point, i) => {
        const barHeight = (point.attendees / max) * (chartHeight - labelHeight);
        const x = i * barSlot + barPadding / 2;
        const y = chartHeight - barHeight - labelHeight;
        const isCurrent = i === data.length - 1;
        return (
          <G key={point.weekStart}>
            <Rect
              x={x}
              y={y}
              width={barWidth}
              height={barHeight}
              rx={2}
              fill={isCurrent ? colors.primary : 'rgba(93,63,211,0.25)'}
            />
            <SvgText
              x={x + barWidth / 2}
              y={chartHeight - 4}
              fontSize={9}
              fill={c.inkMuted}
              textAnchor="middle"
            >
              {weekShortLabel(point.weekStart)}
            </SvgText>
          </G>
        );
      })}
    </Svg>
  );
}

function weekShortLabel(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.page },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  headerText: { flex: 1, gap: 2 },
  headerTitle: { ...typography.cardTitle, color: c.ink },
  headerSub: { ...typography.meta, color: c.inkMuted },

  container: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },

  rangeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  rangeChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    backgroundColor: c.subtle,
  },
  rangeChipActive: {
    backgroundColor: c.primary,
  },
  rangeLabel: {
    ...typography.meta,
    color: c.inkMuted,
    fontWeight: '600',
  },
  rangeLabelActive: { color: '#ffffff' },

  heroCard: { gap: spacing.xs },
  heroEyebrow: { ...typography.eyebrow, color: c.inkMuted },
  heroNumber: {
    fontSize: 32,
    fontWeight: '800',
    color: c.ink,
  },
  heroUnit: {
    fontSize: 15,
    fontWeight: '500',
    color: c.inkFaded,
  },
  deltaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  deltaDown: {},
  deltaLabel: { ...typography.meta, fontWeight: '600' },
  heroMeta: {
    ...typography.meta,
    color: c.inkMuted,
    marginTop: spacing.xs,
  },

  chartCard: { gap: spacing.sm },
  chartLabel: {
    ...typography.eyebrow,
    color: c.inkMuted,
  },

  section: { gap: spacing.sm, marginTop: spacing.sm },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    ...typography.cardTitle,
    color: c.ink,
  },
  sectionCount: {
    ...typography.eyebrow,
    color: c.primary,
  },

  missingCard: {
    overflow: 'hidden',
  },
  missingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
  },
  missingRowDivider: {
    borderTopWidth: 1,
    borderTopColor: c.divider,
  },
  missingText: { flex: 1, gap: 2 },
  missingName: { ...typography.cardTitle, color: c.ink, fontSize: 13 },
  missingMeta: { ...typography.meta, color: c.inkMuted },

  emptyText: {
    ...typography.body,
    color: c.inkMuted,
    textAlign: 'center',
  },
});
}

