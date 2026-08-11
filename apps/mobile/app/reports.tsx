import { useMemo, useState } from 'react';
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
import {
  ChevronLeft,
  TrendingDown,
  TrendingUp,
  UserX,
  BarChart3,
  Sparkles,
  PieChart,
} from 'lucide-react-native';
import Svg, { Rect, Circle, Line as SvgLine, Text as SvgText, G } from 'react-native-svg';
import { Card, colors, radii, spacing, typography } from '@kairos/ui-native';
import type { FrequencyBucketKey } from '@kairos/types';
import { api } from '@/lib/api-client';
import { formatShortDate } from '@kairos/core';

type WindowMonths = 3 | 6 | 12;
type WindowChoice = { value: WindowMonths; label: string };

const WINDOW_CHOICES: WindowChoice[] = [
  { value: 3, label: '3 mo' },
  { value: 6, label: '6 mo' },
  { value: 12, label: '12 mo' },
];

const BUCKET_ORDER: FrequencyBucketKey[] = [
  'weekly',
  'biweekly',
  'monthly',
  'occasional',
  'dormant',
];

const BUCKET_TONE: Record<FrequencyBucketKey, { fill: string; tint: string }> = {
  weekly: { fill: colors.primary, tint: 'rgba(93,63,211,0.14)' },
  biweekly: { fill: '#7c5ce3', tint: 'rgba(124,92,227,0.14)' },
  monthly: { fill: colors.gold, tint: 'rgba(248,181,55,0.18)' },
  occasional: { fill: '#f19c1c', tint: 'rgba(241,156,28,0.18)' },
  dormant: { fill: colors.danger, tint: 'rgba(225,29,72,0.12)' },
};

function formatPct(rate: number): string {
  const pct = Math.round(rate * 100);
  return `${pct}%`;
}

export default function Reports() {
  const router = useRouter();
  const [engagedWindowMonths, setEngagedWindowMonths] = useState<WindowMonths>(3);

  const summary = useQuery({
    queryKey: ['attendance', 'reports', 'summary', { weeks: 4 }],
    queryFn: async () =>
      (await api.attendance.summary({ weeks: 4 })).data ?? null,
  });

  const trends = useQuery({
    queryKey: ['attendance', 'reports', 'trends', { weeks: 12 }],
    queryFn: async () =>
      (await api.attendance.trends({ weeks: 12 })).data ?? [],
  });

  const frequency = useQuery({
    queryKey: ['attendance', 'reports', 'frequency-buckets', { engagedWindowMonths }],
    queryFn: async () =>
      (await api.attendance.frequencyBuckets({ engagedWindowMonths })).data ??
      null,
  });

  const firstTime = useQuery({
    queryKey: ['attendance', 'reports', 'first-time-returning', { weeks: 8 }],
    queryFn: async () =>
      (await api.attendance.firstTimeReturning({ weeks: 8 })).data ?? [],
  });

  const missing = useQuery({
    queryKey: ['attendance', 'reports', 'missing-members', { services: 3 }],
    queryFn: async () =>
      (await api.attendance.missingMembers({ services: 3 })).data ?? [],
  });

  const isFetching =
    summary.isFetching ||
    trends.isFetching ||
    frequency.isFetching ||
    firstTime.isFetching ||
    missing.isFetching;

  const refresh = () => {
    summary.refetch();
    trends.refetch();
    frequency.refetch();
    firstTime.refetch();
    missing.refetch();
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerBar}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ChevronLeft color={colors.ink} size={24} strokeWidth={1.5} />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Reports</Text>
          <Text style={styles.headerSub}>Attendance analytics</Text>
        </View>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl refreshing={isFetching} onRefresh={refresh} tintColor={colors.primary} />
        }
      >
        <SummaryTile summary={summary.data} loading={summary.isLoading} error={summary.error} />

        <TrendsCard
          data={trends.data ?? []}
          loading={trends.isLoading}
          error={trends.error}
        />

        <View>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconTile}>
              <PieChart color={colors.primary} size={14} strokeWidth={1.5} />
            </View>
            <Text style={styles.sectionTitle}>How often people show up</Text>
          </View>
          <View style={styles.windowRow}>
            {WINDOW_CHOICES.map((w) => {
              const active = engagedWindowMonths === w.value;
              return (
                <Pressable
                  key={w.value}
                  onPress={() => setEngagedWindowMonths(w.value)}
                  style={[styles.windowChip, active && styles.windowChipActive]}
                >
                  <Text
                    style={[styles.windowChipLabel, active && styles.windowChipLabelActive]}
                  >
                    {w.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <FrequencyBucketsCard
            data={frequency.data}
            loading={frequency.isLoading}
            error={frequency.error}
          />
        </View>

        <FirstTimeReturningCard
          data={firstTime.data ?? []}
          loading={firstTime.isLoading}
          error={firstTime.error}
        />

        <MissingMembersCard
          data={missing.data ?? []}
          loading={missing.isLoading}
          error={missing.error}
        />

        <Text style={styles.footnote}>
          Reports are scoped to your branch. Admins with cross-branch access see all
          branches; use the web to filter by department or fellowship.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function SummaryTile({
  summary,
  loading,
  error,
}: {
  summary: {
    statusBreakdown: { present: number; late: number; virtual: number; total: number };
    rate: { distinctAttendees: number; activeMembers: number; rate: number };
  } | null | undefined;
  loading: boolean;
  error: unknown;
}) {
  if (loading) {
    return (
      <Card padding="md">
        <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.md }} />
      </Card>
    );
  }
  if (error || !summary) {
    return (
      <Card padding="md">
        <Text style={styles.errorLine}>
          {error instanceof Error ? error.message : 'Could not load summary.'}
        </Text>
      </Card>
    );
  }
  const rate = formatPct(summary.rate.rate);
  const bd = summary.statusBreakdown;
  return (
    <Card padding="md" style={{ gap: spacing.sm }}>
      <View style={styles.summaryHeader}>
        <Text style={styles.sectionEyebrow}>ATTENDANCE · LAST 4 WEEKS</Text>
      </View>
      <View style={styles.summaryRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headlineNumber}>{rate}</Text>
          <Text style={styles.headlineSub}>
            {summary.rate.distinctAttendees.toLocaleString()} of{' '}
            {summary.rate.activeMembers.toLocaleString()} members
          </Text>
        </View>
        <View style={styles.miniStats}>
          <MiniStat label="Present" value={bd.present} tone={colors.successText} />
          <MiniStat label="Late" value={bd.late} tone={colors.goldDark} />
          <MiniStat label="Virtual" value={bd.virtual} tone={colors.info} />
        </View>
      </View>
    </Card>
  );
}

function MiniStat({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <View style={styles.miniStat}>
      <Text style={[styles.miniStatValue, { color: tone }]}>{value.toLocaleString()}</Text>
      <Text style={styles.miniStatLabel}>{label}</Text>
    </View>
  );
}

function TrendsCard({
  data,
  loading,
  error,
}: {
  data: { weekStart: string; attendees: number; distinctAttendees: number }[];
  loading: boolean;
  error: unknown;
}) {
  const priorAvg = useMemo(() => {
    if (data.length < 2) return 0;
    const prior = data.slice(0, -1);
    return prior.length
      ? Math.round(prior.reduce((s, p) => s + p.attendees, 0) / prior.length)
      : 0;
  }, [data]);
  const latest = data[data.length - 1];
  const delta =
    latest && priorAvg > 0
      ? Math.round(((latest.attendees - priorAvg) / priorAvg) * 100)
      : 0;
  const trendUp = delta >= 0;

  return (
    <View>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionIconTile}>
          <BarChart3 color={colors.primary} size={14} strokeWidth={1.5} />
        </View>
        <Text style={styles.sectionTitle}>Weekly attendance</Text>
      </View>
      <Card padding="md" style={{ gap: spacing.md }}>
        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.md }} />
        ) : error ? (
          <Text style={styles.errorLine}>
            {error instanceof Error ? error.message : 'Could not load trends.'}
          </Text>
        ) : data.length === 0 ? (
          <Text style={styles.emptyLine}>No attendance recorded yet.</Text>
        ) : (
          <>
            {latest ? (
              <View style={styles.summaryRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.headlineNumber}>{latest.attendees.toLocaleString()}</Text>
                  <Text style={styles.headlineSub}>
                    check-ins · {latest.distinctAttendees.toLocaleString()} distinct members
                  </Text>
                </View>
                {priorAvg > 0 ? (
                  <View
                    style={[
                      styles.deltaChip,
                      {
                        backgroundColor: trendUp ? 'rgba(16,185,129,0.14)' : 'rgba(225,29,72,0.12)',
                      },
                    ]}
                  >
                    {trendUp ? (
                      <TrendingUp color={colors.successText} size={14} strokeWidth={2} />
                    ) : (
                      <TrendingDown color={colors.danger} size={14} strokeWidth={2} />
                    )}
                    <Text
                      style={[
                        styles.deltaLabel,
                        { color: trendUp ? colors.successText : colors.danger },
                      ]}
                    >
                      {delta > 0 ? `+${delta}%` : `${delta}%`}
                    </Text>
                  </View>
                ) : null}
              </View>
            ) : null}
            <TrendsChart data={data} />
          </>
        )}
      </Card>
    </View>
  );
}

function TrendsChart({
  data,
}: {
  data: { weekStart: string; attendees: number; distinctAttendees: number }[];
}) {
  const width = Dimensions.get('window').width - spacing.lg * 2 - spacing.md * 2;
  const height = 140;
  const paddingLeft = 28;
  const paddingRight = 4;
  const paddingTop = 8;
  const paddingBottom = 22;
  const innerW = width - paddingLeft - paddingRight;
  const innerH = height - paddingTop - paddingBottom;
  const maxVal = Math.max(1, ...data.map((p) => Math.max(p.attendees, p.distinctAttendees)));
  const barGroupW = innerW / Math.max(1, data.length);
  const barW = Math.max(3, barGroupW * 0.55);

  const gridLines = [0, 0.5, 1];

  return (
    <View>
      <Svg width={width} height={height}>
        <G>
          {gridLines.map((g, i) => {
            const y = paddingTop + innerH * (1 - g);
            return (
              <SvgLine
                key={i}
                x1={paddingLeft}
                x2={paddingLeft + innerW}
                y1={y}
                y2={y}
                stroke="rgba(26,28,28,0.08)"
                strokeWidth={1}
              />
            );
          })}
          {gridLines.map((g, i) => {
            const y = paddingTop + innerH * (1 - g);
            const value = Math.round(maxVal * g);
            return (
              <SvgText
                key={`lbl${i}`}
                x={paddingLeft - 4}
                y={y + 3}
                fontSize={9}
                fill="rgba(26,28,28,0.45)"
                textAnchor="end"
              >
                {value}
              </SvgText>
            );
          })}
        </G>
        <G>
          {data.map((p, i) => {
            const groupX = paddingLeft + i * barGroupW + (barGroupW - barW) / 2;
            const barH = (p.attendees / maxVal) * innerH;
            const y = paddingTop + innerH - barH;
            return (
              <Rect
                key={p.weekStart}
                x={groupX}
                y={y}
                width={barW}
                height={barH}
                rx={2}
                fill={colors.primary}
                opacity={0.85}
              />
            );
          })}
        </G>
        <G>
          {data.map((p, i) => {
            const cx = paddingLeft + i * barGroupW + barGroupW / 2;
            const cy = paddingTop + innerH - (p.distinctAttendees / maxVal) * innerH;
            return (
              <Circle
                key={`d${p.weekStart}`}
                cx={cx}
                cy={cy}
                r={2.5}
                fill={colors.gold}
              />
            );
          })}
          {data.slice(1).map((p, i) => {
            const prev = data[i]!;
            const x1 = paddingLeft + i * barGroupW + barGroupW / 2;
            const x2 = paddingLeft + (i + 1) * barGroupW + barGroupW / 2;
            const y1 = paddingTop + innerH - (prev.distinctAttendees / maxVal) * innerH;
            const y2 = paddingTop + innerH - (p.distinctAttendees / maxVal) * innerH;
            return (
              <SvgLine
                key={`ln${p.weekStart}`}
                x1={x1}
                x2={x2}
                y1={y1}
                y2={y2}
                stroke={colors.gold}
                strokeWidth={1.5}
              />
            );
          })}
        </G>
        <G>
          {data.map((p, i) => {
            const cx = paddingLeft + i * barGroupW + barGroupW / 2;
            if (i % Math.max(1, Math.ceil(data.length / 6)) !== 0 && i !== data.length - 1) {
              return null;
            }
            return (
              <SvgText
                key={`x${p.weekStart}`}
                x={cx}
                y={height - 6}
                fontSize={8}
                fill="rgba(26,28,28,0.45)"
                textAnchor="middle"
              >
                {formatShortDate(p.weekStart, '')}
              </SvgText>
            );
          })}
        </G>
      </Svg>
      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.legendSwatch, { backgroundColor: colors.primary }]} />
          <Text style={styles.legendLabel}>Check-ins</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendSwatch, { backgroundColor: colors.gold }]} />
          <Text style={styles.legendLabel}>Distinct members</Text>
        </View>
      </View>
    </View>
  );
}

function FrequencyBucketsCard({
  data,
  loading,
  error,
}: {
  data:
    | {
        engagedMembers: number;
        servicesConsidered: number;
        windowMonths: number;
        buckets: {
          key: FrequencyBucketKey;
          label: string;
          members: number;
          description: string;
        }[];
      }
    | null
    | undefined;
  loading: boolean;
  error: unknown;
}) {
  if (loading) {
    return (
      <Card padding="md">
        <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.md }} />
      </Card>
    );
  }
  if (error) {
    return (
      <Card padding="md">
        <Text style={styles.errorLine}>
          {error instanceof Error ? error.message : 'Could not load frequency.'}
        </Text>
      </Card>
    );
  }
  if (!data) {
    return (
      <Card padding="md">
        <Text style={styles.emptyLine}>No attendance recorded yet.</Text>
      </Card>
    );
  }
  const bucketByKey = new Map(data.buckets.map((b) => [b.key, b]));
  const denom = Math.max(1, data.engagedMembers);
  return (
    <Card padding="md" style={{ gap: spacing.sm }}>
      <Text style={styles.subMeta}>
        {data.engagedMembers.toLocaleString()} engaged members ·{' '}
        {data.servicesConsidered} services in the last {data.windowMonths} months
      </Text>
      {BUCKET_ORDER.map((key) => {
        const b = bucketByKey.get(key);
        if (!b) return null;
        const pct = b.members / denom;
        const tone = BUCKET_TONE[key];
        return (
          <View key={key} style={{ gap: 4, marginTop: spacing.xs }}>
            <View style={styles.freqRowTop}>
              <Text style={styles.freqLabel}>{b.label}</Text>
              <Text style={styles.freqCount}>
                {b.members} <Text style={styles.freqPct}>· {Math.round(pct * 100)}%</Text>
              </Text>
            </View>
            <View style={[styles.freqTrack, { backgroundColor: tone.tint }]}>
              <View
                style={[
                  styles.freqFill,
                  { backgroundColor: tone.fill, width: `${Math.max(2, pct * 100)}%` },
                ]}
              />
            </View>
            <Text style={styles.freqDesc}>{b.description}</Text>
          </View>
        );
      })}
    </Card>
  );
}

function FirstTimeReturningCard({
  data,
  loading,
  error,
}: {
  data: { weekStart: string; firstTime: number; returning: number }[];
  loading: boolean;
  error: unknown;
}) {
  const totals = useMemo(() => {
    let ft = 0;
    let ret = 0;
    for (const p of data) {
      ft += p.firstTime;
      ret += p.returning;
    }
    return { ft, ret };
  }, [data]);

  return (
    <View>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionIconTile}>
          <Sparkles color={colors.primary} size={14} strokeWidth={1.5} />
        </View>
        <Text style={styles.sectionTitle}>First-time vs returning</Text>
      </View>
      <Card padding="md" style={{ gap: spacing.md }}>
        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.md }} />
        ) : error ? (
          <Text style={styles.errorLine}>
            {error instanceof Error ? error.message : 'Could not load this report.'}
          </Text>
        ) : data.length === 0 ? (
          <Text style={styles.emptyLine}>No attendance recorded yet.</Text>
        ) : (
          <>
            <View style={styles.summaryRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.headlineNumber}>{totals.ft.toLocaleString()}</Text>
                <Text style={styles.headlineSub}>first-timers · last 8 weeks</Text>
              </View>
              <View style={styles.miniStats}>
                <MiniStat label="Returning" value={totals.ret} tone={colors.primary} />
              </View>
            </View>
            <FirstTimeChart data={data} />
          </>
        )}
      </Card>
    </View>
  );
}

function FirstTimeChart({
  data,
}: {
  data: { weekStart: string; firstTime: number; returning: number }[];
}) {
  const width = Dimensions.get('window').width - spacing.lg * 2 - spacing.md * 2;
  const height = 120;
  const paddingLeft = 28;
  const paddingRight = 4;
  const paddingTop = 8;
  const paddingBottom = 22;
  const innerW = width - paddingLeft - paddingRight;
  const innerH = height - paddingTop - paddingBottom;
  const stackedMax = Math.max(1, ...data.map((p) => p.firstTime + p.returning));
  const barGroupW = innerW / Math.max(1, data.length);
  const barW = Math.max(4, barGroupW * 0.65);

  return (
    <View>
      <Svg width={width} height={height}>
        <G>
          {[0, 0.5, 1].map((g, i) => {
            const y = paddingTop + innerH * (1 - g);
            return (
              <SvgLine
                key={i}
                x1={paddingLeft}
                x2={paddingLeft + innerW}
                y1={y}
                y2={y}
                stroke="rgba(26,28,28,0.08)"
                strokeWidth={1}
              />
            );
          })}
          {[0, 0.5, 1].map((g, i) => {
            const y = paddingTop + innerH * (1 - g);
            const value = Math.round(stackedMax * g);
            return (
              <SvgText
                key={`lbl${i}`}
                x={paddingLeft - 4}
                y={y + 3}
                fontSize={9}
                fill="rgba(26,28,28,0.45)"
                textAnchor="end"
              >
                {value}
              </SvgText>
            );
          })}
        </G>
        <G>
          {data.map((p, i) => {
            const x = paddingLeft + i * barGroupW + (barGroupW - barW) / 2;
            const retH = (p.returning / stackedMax) * innerH;
            const ftH = (p.firstTime / stackedMax) * innerH;
            const retY = paddingTop + innerH - retH;
            const ftY = retY - ftH;
            return (
              <G key={p.weekStart}>
                <Rect
                  x={x}
                  y={retY}
                  width={barW}
                  height={retH}
                  fill={colors.primary}
                  opacity={0.85}
                  rx={2}
                />
                {p.firstTime > 0 ? (
                  <Rect x={x} y={ftY} width={barW} height={ftH} fill={colors.gold} rx={2} />
                ) : null}
              </G>
            );
          })}
        </G>
        <G>
          {data.map((p, i) => {
            const cx = paddingLeft + i * barGroupW + barGroupW / 2;
            if (i % Math.max(1, Math.ceil(data.length / 6)) !== 0 && i !== data.length - 1) {
              return null;
            }
            return (
              <SvgText
                key={`x${p.weekStart}`}
                x={cx}
                y={height - 6}
                fontSize={8}
                fill="rgba(26,28,28,0.45)"
                textAnchor="middle"
              >
                {formatShortDate(p.weekStart, '')}
              </SvgText>
            );
          })}
        </G>
      </Svg>
      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.legendSwatch, { backgroundColor: colors.gold }]} />
          <Text style={styles.legendLabel}>First-time</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendSwatch, { backgroundColor: colors.primary }]} />
          <Text style={styles.legendLabel}>Returning</Text>
        </View>
      </View>
    </View>
  );
}

function MissingMembersCard({
  data,
  loading,
  error,
}: {
  data: { memberId: string; firstName: string; lastName: string; missedStreak: number }[];
  loading: boolean;
  error: unknown;
}) {
  const router = useRouter();
  return (
    <View>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionIconTile}>
          <UserX color={colors.primary} size={14} strokeWidth={1.5} />
        </View>
        <Text style={styles.sectionTitle}>Not seen recently</Text>
      </View>
      <Card padding="md" style={{ gap: spacing.sm }}>
        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.md }} />
        ) : error ? (
          <Text style={styles.errorLine}>
            {error instanceof Error ? error.message : 'Could not load this report.'}
          </Text>
        ) : data.length === 0 ? (
          <Text style={styles.emptyLine}>Everyone attended the most recent service.</Text>
        ) : (
          data.slice(0, 5).map((m, idx) => (
            <Pressable
              key={m.memberId}
              onPress={() => router.push(`/members/${m.memberId}`)}
              style={[styles.missingRow, idx > 0 ? styles.rowDivider : null]}
            >
              <Text style={styles.missingName}>
                {m.firstName} {m.lastName}
              </Text>
              <Text style={styles.missingMeta}>
                {m.missedStreak === 1
                  ? 'missed last service'
                  : `missed ${m.missedStreak} in a row`}
              </Text>
            </Pressable>
          ))
        )}
        {data.length > 5 ? (
          <Text style={styles.subMeta}>
            + {data.length - 5} more · open on web for the full list
          </Text>
        ) : null}
      </Card>
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
  headerText: { flex: 1, alignItems: 'center' },
  headerTitle: { ...typography.cardTitle, color: colors.ink },
  headerSub: { ...typography.meta, color: 'rgba(26,28,28,0.55)' },
  container: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  sectionIconTile: {
    width: 24,
    height: 24,
    borderRadius: radii.sm,
    backgroundColor: 'rgba(93,63,211,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: { ...typography.cardTitle, color: colors.ink, flex: 1 },
  sectionEyebrow: { ...typography.eyebrow, color: 'rgba(26,28,28,0.55)' },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  headlineNumber: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.ink,
    letterSpacing: -0.4,
  },
  headlineSub: {
    ...typography.meta,
    color: 'rgba(26,28,28,0.6)',
    marginTop: 2,
  },
  miniStats: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  miniStat: {
    alignItems: 'flex-end',
    minWidth: 44,
  },
  miniStatValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  miniStatLabel: {
    ...typography.meta,
    color: 'rgba(26,28,28,0.55)',
    fontSize: 10,
  },
  deltaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.pill,
  },
  deltaLabel: {
    ...typography.meta,
    fontWeight: '700',
  },
  windowRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.sm,
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
  windowChipLabel: {
    ...typography.meta,
    color: colors.ink,
    fontWeight: '600',
  },
  windowChipLabelActive: {
    color: '#ffffff',
  },
  subMeta: {
    ...typography.meta,
    color: 'rgba(26,28,28,0.55)',
  },
  freqRowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  freqLabel: {
    ...typography.body,
    color: colors.ink,
    fontWeight: '600',
  },
  freqCount: {
    ...typography.body,
    color: colors.ink,
    fontWeight: '700',
  },
  freqPct: {
    ...typography.meta,
    color: 'rgba(26,28,28,0.55)',
    fontWeight: '500',
  },
  freqTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  freqFill: {
    height: '100%',
    borderRadius: 4,
  },
  freqDesc: {
    ...typography.meta,
    color: 'rgba(26,28,28,0.55)',
    fontSize: 10,
    lineHeight: 14,
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.lg,
    marginTop: spacing.xs,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendSwatch: {
    width: 8,
    height: 8,
    borderRadius: 2,
  },
  legendLabel: {
    ...typography.meta,
    color: 'rgba(26,28,28,0.6)',
  },
  missingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  rowDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(26,28,28,0.08)',
  },
  missingName: {
    ...typography.body,
    color: colors.ink,
    fontWeight: '500',
    flex: 1,
  },
  missingMeta: {
    ...typography.meta,
    color: colors.danger,
  },
  errorLine: {
    ...typography.body,
    color: colors.danger,
  },
  emptyLine: {
    ...typography.body,
    color: 'rgba(26,28,28,0.55)',
    textAlign: 'center',
    paddingVertical: spacing.sm,
  },
  footnote: {
    ...typography.meta,
    color: 'rgba(26,28,28,0.5)',
    paddingHorizontal: spacing.xs,
    lineHeight: 15,
  },
});
