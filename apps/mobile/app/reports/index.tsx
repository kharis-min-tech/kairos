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
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import {
  ChevronLeft,
  ChevronRight,
  Check,
  TrendingDown,
  TrendingUp,
  UserX,
  BarChart3,
  Sparkles,
  PieChart,
  LayoutGrid,
  Filter,
} from 'lucide-react-native';
import Svg, { Rect, Circle, Line as SvgLine, Text as SvgText, G } from 'react-native-svg';
import {
  Card,
  colors,
  radii,
  spacing,
  typography,
  useThemedStyles,
  type ThemeColors,
  useColors,
} from '@kairos/ui-native';
import type { AttendanceHeatmap, FrequencyBucketKey } from '@kairos/types';
import { api } from '@/lib/api-client';
import { formatShortDate } from '@kairos/core';
import { useAuthStore } from '@/store/auth';

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

type ScopeKind = 'branch' | 'department' | 'fellowship';

export default function Reports() {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  const router = useRouter();
  const [engagedWindowMonths, setEngagedWindowMonths] = useState<WindowMonths>(3);
  const branchId = useAuthStore((s) => s.user?.homeBranchId ?? null);

  // Scope filter — reports default to the whole branch. Picking a dept or
  // fellowship narrows every downstream report to that group's members.
  const [scopeKind, setScopeKind] = useState<ScopeKind>('branch');
  const [scopeId, setScopeId] = useState<string | null>(null);
  const [scopePickerOpen, setScopePickerOpen] = useState<ScopeKind | null>(null);

  const departments = useQuery({
    queryKey: ['reports', 'scope', 'departments', branchId],
    enabled: !!branchId,
    queryFn: async () => {
      const res = await api.departments.list({ branchId: branchId!, limit: 100 });
      return res.data?.data ?? [];
    },
  });
  const fellowships = useQuery({
    queryKey: ['reports', 'scope', 'fellowships', branchId],
    enabled: !!branchId,
    queryFn: async () => {
      const res = await api.fellowships.list({ branchId: branchId!, limit: 100 });
      return res.data?.data ?? [];
    },
  });

  const scope = useMemo(() => {
    if (scopeKind === 'branch' || !scopeId) return null;
    return { kind: scopeKind, id: scopeId } as const;
  }, [scopeKind, scopeId]);

  const scopeParams = useMemo(
    () =>
      scope?.kind === 'department'
        ? { departmentId: scope.id }
        : scope?.kind === 'fellowship'
          ? { fellowshipId: scope.id }
          : {},
    [scope],
  );

  const scopeLabel = useMemo(() => {
    if (!scope) return 'Whole branch';
    if (scope.kind === 'department') {
      const d = departments.data?.find((x) => x.id === scope.id);
      return d ? `Dept · ${d.departmentName}` : 'Department';
    }
    const f = fellowships.data?.find((x) => x.id === scope.id);
    return f ? `Fellowship · ${f.fellowshipName}` : 'Fellowship';
  }, [scope, departments.data, fellowships.data]);

  const summary = useQuery({
    queryKey: ['attendance', 'reports', 'summary', { weeks: 4, ...scopeParams }],
    queryFn: async () =>
      (await api.attendance.summary({ weeks: 4, ...scopeParams })).data ?? null,
  });

  const heatmap = useQuery({
    queryKey: ['attendance', 'reports', 'heatmap', { branchId, weeks: 8, engagedWindowMonths, ...scopeParams }],
    enabled: !!branchId,
    queryFn: async () =>
      (
        await api.attendance.heatmap({
          branchId: branchId!,
          weeks: 8,
          engagedWindowMonths,
          engagedOnly: true,
          ...scopeParams,
        })
      ).data ?? null,
  });

  const trends = useQuery({
    queryKey: ['attendance', 'reports', 'trends', { weeks: 12, ...scopeParams }],
    queryFn: async () =>
      (await api.attendance.trends({ weeks: 12, ...scopeParams })).data ?? [],
  });

  const frequency = useQuery({
    queryKey: ['attendance', 'reports', 'frequency-buckets', { engagedWindowMonths, ...scopeParams }],
    queryFn: async () =>
      (await api.attendance.frequencyBuckets({ engagedWindowMonths, ...scopeParams })).data ??
      null,
  });

  const firstTime = useQuery({
    queryKey: ['attendance', 'reports', 'first-time-returning', { weeks: 8, ...scopeParams }],
    queryFn: async () =>
      (await api.attendance.firstTimeReturning({ weeks: 8, ...scopeParams })).data ?? [],
  });

  const missing = useQuery({
    queryKey: ['attendance', 'reports', 'missing-members', { services: 3, ...scopeParams }],
    queryFn: async () =>
      (await api.attendance.missingMembers({ services: 3, ...scopeParams })).data ?? [],
  });

  const isFetching =
    summary.isFetching ||
    trends.isFetching ||
    frequency.isFetching ||
    firstTime.isFetching ||
    missing.isFetching ||
    heatmap.isFetching;

  const refresh = () => {
    summary.refetch();
    trends.refetch();
    frequency.refetch();
    firstTime.refetch();
    missing.refetch();
    heatmap.refetch();
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerBar}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ChevronLeft color={c.ink} size={24} strokeWidth={1.5} />
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
          <RefreshControl refreshing={isFetching} onRefresh={refresh} tintColor={c.primary} />
        }
      >
        <View style={styles.scopeRow}>
          <Pressable
            onPress={() => setScopePickerOpen('branch')}
            style={[
              styles.scopeChip,
              scopeKind === 'branch' && styles.scopeChipActive,
            ]}
          >
            <Filter
              color={scopeKind === 'branch' ? '#ffffff' : c.primary}
              size={12}
              strokeWidth={1.5}
            />
            <Text
              style={[
                styles.scopeChipLabel,
                scopeKind === 'branch' && styles.scopeChipLabelActive,
              ]}
              numberOfLines={1}
            >
              {scopeLabel}
            </Text>
          </Pressable>
          {scope ? (
            <Pressable
              onPress={() => {
                setScopeKind('branch');
                setScopeId(null);
              }}
              hitSlop={6}
              style={styles.scopeClear}
            >
              <Text style={styles.scopeClearLabel}>Clear</Text>
            </Pressable>
          ) : null}
        </View>

        <SummaryTile summary={summary.data} loading={summary.isLoading} error={summary.error} />

        <TrendsCard
          data={trends.data ?? []}
          loading={trends.isLoading}
          error={trends.error}
        />

        <HeatmapCard
          data={heatmap.data}
          loading={heatmap.isLoading}
          error={heatmap.error}
          hasBranch={!!branchId}
        />

        <View>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconTile}>
              <PieChart color={c.primary} size={14} strokeWidth={1.5} />
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
          Reports are scoped to your branch. Filter by department or fellowship
          from the chip above.
        </Text>
      </ScrollView>

      <ScopePickerModal
        open={!!scopePickerOpen}
        onClose={() => setScopePickerOpen(null)}
        departments={departments.data ?? []}
        fellowships={fellowships.data ?? []}
        scopeKind={scopeKind}
        scopeId={scopeId}
        onPick={(kind, id) => {
          setScopeKind(kind);
          setScopeId(id);
          setScopePickerOpen(null);
        }}
      />
    </SafeAreaView>
  );
}

function ScopePickerModal({
  open,
  onClose,
  departments,
  fellowships,
  scopeKind,
  scopeId,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  departments: { id: string; departmentName: string }[];
  fellowships: { id: string; fellowshipName: string }[];
  scopeKind: ScopeKind;
  scopeId: string | null;
  onPick: (kind: ScopeKind, id: string | null) => void;
}) {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.scopeBackdrop} onPress={onClose}>
        <Pressable style={styles.scopeSheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.scopeSheetHandle} />
          <Text style={styles.scopeSheetTitle}>Filter reports by…</Text>

          <Pressable
            onPress={() => onPick('branch', null)}
            style={[
              styles.scopeSheetRow,
              scopeKind === 'branch' && styles.scopeSheetRowActive,
            ]}
          >
            <Text style={styles.scopeSheetRowLabel}>Whole branch</Text>
            {scopeKind === 'branch' ? (
              <Check color={c.primary} size={16} strokeWidth={2} />
            ) : null}
          </Pressable>

          <Text style={styles.scopeSheetHeader}>Departments</Text>
          <ScrollView style={{ maxHeight: 200 }}>
            {departments.length === 0 ? (
              <Text style={styles.scopeEmpty}>No departments in this branch.</Text>
            ) : (
              departments.map((d) => {
                const active = scopeKind === 'department' && scopeId === d.id;
                return (
                  <Pressable
                    key={d.id}
                    onPress={() => onPick('department', d.id)}
                    style={[styles.scopeSheetRow, active && styles.scopeSheetRowActive]}
                  >
                    <Text style={styles.scopeSheetRowLabel}>{d.departmentName}</Text>
                    {active ? (
                      <Check color={c.primary} size={16} strokeWidth={2} />
                    ) : (
                      <ChevronRight
                        color={c.inkVeryFaded}
                        size={14}
                        strokeWidth={1.5}
                      />
                    )}
                  </Pressable>
                );
              })
            )}
          </ScrollView>

          <Text style={styles.scopeSheetHeader}>Fellowships</Text>
          <ScrollView style={{ maxHeight: 200 }}>
            {fellowships.length === 0 ? (
              <Text style={styles.scopeEmpty}>No fellowships in this branch.</Text>
            ) : (
              fellowships.map((f) => {
                const active = scopeKind === 'fellowship' && scopeId === f.id;
                return (
                  <Pressable
                    key={f.id}
                    onPress={() => onPick('fellowship', f.id)}
                    style={[styles.scopeSheetRow, active && styles.scopeSheetRowActive]}
                  >
                    <Text style={styles.scopeSheetRowLabel}>{f.fellowshipName}</Text>
                    {active ? (
                      <Check color={c.primary} size={16} strokeWidth={2} />
                    ) : (
                      <ChevronRight
                        color={c.inkVeryFaded}
                        size={14}
                        strokeWidth={1.5}
                      />
                    )}
                  </Pressable>
                );
              })
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
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
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  if (loading) {
    return (
      <Card padding="md">
        <ActivityIndicator color={c.primary} style={{ marginVertical: spacing.md }} />
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
          <MiniStat label="Present" value={bd.present} tone={c.successText} />
          <MiniStat label="Late" value={bd.late} tone={c.goldDark} />
          <MiniStat label="Virtual" value={bd.virtual} tone={c.info} />
        </View>
      </View>
    </Card>
  );
}

function MiniStat({ label, value, tone }: { label: string; value: number; tone: string }) {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
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
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
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
          <BarChart3 color={c.primary} size={14} strokeWidth={1.5} />
        </View>
        <Text style={styles.sectionTitle}>Weekly attendance</Text>
      </View>
      <Card padding="md" style={{ gap: spacing.md }}>
        {loading ? (
          <ActivityIndicator color={c.primary} style={{ marginVertical: spacing.md }} />
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
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
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
                stroke={c.divider}
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
                fill={c.inkFaded}
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
                fill={c.primary}
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
                fill={c.gold}
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
                stroke={c.gold}
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
                fill={c.inkFaded}
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
          <View style={[styles.legendSwatch, { backgroundColor: c.primary }]} />
          <Text style={styles.legendLabel}>Check-ins</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendSwatch, { backgroundColor: c.gold }]} />
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
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  if (loading) {
    return (
      <Card padding="md">
        <ActivityIndicator color={c.primary} style={{ marginVertical: spacing.md }} />
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
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
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
          <Sparkles color={c.primary} size={14} strokeWidth={1.5} />
        </View>
        <Text style={styles.sectionTitle}>First-time vs returning</Text>
      </View>
      <Card padding="md" style={{ gap: spacing.md }}>
        {loading ? (
          <ActivityIndicator color={c.primary} style={{ marginVertical: spacing.md }} />
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
                <MiniStat label="Returning" value={totals.ret} tone={c.primary} />
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
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
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
                stroke={c.divider}
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
                fill={c.inkFaded}
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
                  fill={c.primary}
                  opacity={0.85}
                  rx={2}
                />
                {p.firstTime > 0 ? (
                  <Rect x={x} y={ftY} width={barW} height={ftH} fill={c.gold} rx={2} />
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
                fill={c.inkFaded}
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
          <View style={[styles.legendSwatch, { backgroundColor: c.gold }]} />
          <Text style={styles.legendLabel}>First-time</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendSwatch, { backgroundColor: c.primary }]} />
          <Text style={styles.legendLabel}>Returning</Text>
        </View>
      </View>
    </View>
  );
}

function HeatmapCard({
  data,
  loading,
  error,
  hasBranch,
}: {
  data: AttendanceHeatmap | null | undefined;
  loading: boolean;
  error: unknown;
  hasBranch: boolean;
}) {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  return (
    <View>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionIconTile}>
          <LayoutGrid color={c.primary} size={14} strokeWidth={1.5} />
        </View>
        <Text style={styles.sectionTitle}>Attendance heatmap</Text>
      </View>
      <Card padding="md" style={{ gap: spacing.sm }}>
        {!hasBranch ? (
          <Text style={styles.emptyLine}>
            Set a home branch on your profile to see the heatmap.
          </Text>
        ) : loading ? (
          <ActivityIndicator color={c.primary} style={{ marginVertical: spacing.md }} />
        ) : error ? (
          <Text style={styles.errorLine}>
            {error instanceof Error ? error.message : 'Could not load this report.'}
          </Text>
        ) : !data || data.services.length === 0 || data.members.length === 0 ? (
          <Text style={styles.emptyLine}>
            Not enough attendance data to draw the heatmap yet.
          </Text>
        ) : (
          <HeatmapGrid data={data} />
        )}
      </Card>
    </View>
  );
}

// Heatmap palette — matched to the web version so the two views feel like the
// same tool. present=emerald-500, virtual=sky-500, late=amber-500, absent is a
// hollow dashed red outline (fills through shape as well as colour for
// red-green colour-vision users).
const HEATMAP_PRESENT = '#10b981';
const HEATMAP_VIRTUAL = '#0ea5e9';
const HEATMAP_LATE = '#f59e0b';
const HEATMAP_ABSENT_BG = 'rgba(254,226,226,0.6)'; // red-100 @ 60%
const HEATMAP_ABSENT_BORDER = '#fca5a5'; // red-300

function HeatmapGrid({ data }: { data: AttendanceHeatmap }) {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  // Render the last 8 services (most recent on the right) and the top 15
  // members by attendancePct. Anything beyond falls off the grid — the full
  // heatmap lives on web.
  const services = data.services.slice(-8);
  const startIdx = data.services.length - services.length;
  const members = [...data.members]
    .sort((a, b) => b.attendancePct - a.attendancePct)
    .slice(0, 15);

  const nameW = 92;
  const cellSize = 22;
  const cellGap = 3;

  return (
    <View style={{ gap: spacing.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
        <View style={{ width: nameW }} />
        {services.map((s) => {
          const d = new Date(s.serviceDate);
          const label = `${d.getDate()}/${d.getMonth() + 1}`;
          return (
            <Text
              key={s.id}
              style={[
                styles.heatmapAxisLabel,
                { width: cellSize, marginRight: cellGap },
              ]}
            >
              {label}
            </Text>
          );
        })}
      </View>
      {members.map((m) => (
        <View key={m.memberId} style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={[styles.heatmapNameLabel, { width: nameW }]} numberOfLines={1}>
            {m.firstName} {m.lastName[0] ?? ''}.
          </Text>
          {services.map((s, i) => {
            const cellStatus = m.cells[startIdx + i] ?? 'absent';
            return (
              <HeatmapCell
                key={s.id}
                status={cellStatus}
                size={cellSize}
                marginRight={cellGap}
              />
            );
          })}
        </View>
      ))}
      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.legendSwatch, { backgroundColor: HEATMAP_PRESENT }]} />
          <Text style={styles.legendLabel}>Present</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendSwatch, { backgroundColor: HEATMAP_VIRTUAL }]} />
          <Text style={styles.legendLabel}>Virtual</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendSwatch, { backgroundColor: HEATMAP_LATE }]} />
          <Text style={styles.legendLabel}>Late</Text>
        </View>
        <View style={styles.legendItem}>
          <View
            style={[
              styles.legendSwatch,
              {
                backgroundColor: HEATMAP_ABSENT_BG,
                borderWidth: 1,
                borderStyle: 'dashed',
                borderColor: HEATMAP_ABSENT_BORDER,
              },
            ]}
          />
          <Text style={styles.legendLabel}>Absent</Text>
        </View>
      </View>
    </View>
  );
}

function HeatmapCell({
  status,
  size,
  marginRight,
}: {
  status: string;
  size: number;
  marginRight: number;
}) {
  if (status === 'absent') {
    return (
      <View
        style={{
          width: size,
          height: size,
          marginRight,
          borderRadius: 4,
          backgroundColor: HEATMAP_ABSENT_BG,
          borderWidth: 1,
          borderStyle: 'dashed',
          borderColor: HEATMAP_ABSENT_BORDER,
        }}
      />
    );
  }
  const bg =
    status === 'present'
      ? HEATMAP_PRESENT
      : status === 'virtual'
        ? HEATMAP_VIRTUAL
        : HEATMAP_LATE;
  return (
    <View
      style={{
        width: size,
        height: size,
        marginRight,
        borderRadius: 4,
        backgroundColor: bg,
      }}
    />
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
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  const router = useRouter();
  return (
    <View>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionIconTile}>
          <UserX color={c.primary} size={14} strokeWidth={1.5} />
        </View>
        <Text style={styles.sectionTitle}>Not seen recently</Text>
      </View>
      <Card padding="md" style={{ gap: spacing.sm }}>
        {loading ? (
          <ActivityIndicator color={c.primary} style={{ marginVertical: spacing.md }} />
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
          <Pressable
            onPress={() => router.push('/reports/missing-members' as never)}
            style={styles.missingSeeMore}
          >
            <Text style={styles.missingSeeMoreLabel}>
              See all {data.length} →
            </Text>
          </Pressable>
        ) : null}
      </Card>
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
  headerText: { flex: 1, alignItems: 'center' },
  headerTitle: { ...typography.cardTitle, color: c.ink },
  headerSub: { ...typography.meta, color: c.inkMuted },
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
  sectionTitle: { ...typography.cardTitle, color: c.ink, flex: 1 },
  sectionEyebrow: { ...typography.eyebrow, color: c.inkMuted },
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
    color: c.ink,
    letterSpacing: -0.4,
  },
  headlineSub: {
    ...typography.meta,
    color: c.inkMuted,
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
    color: c.inkMuted,
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
    backgroundColor: c.subtle,
  },
  windowChipActive: {
    backgroundColor: c.primary,
  },
  windowChipLabel: {
    ...typography.meta,
    color: c.ink,
    fontWeight: '600',
  },
  windowChipLabelActive: {
    color: '#ffffff',
  },
  subMeta: {
    ...typography.meta,
    color: c.inkMuted,
  },
  freqRowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  freqLabel: {
    ...typography.body,
    color: c.ink,
    fontWeight: '600',
  },
  freqCount: {
    ...typography.body,
    color: c.ink,
    fontWeight: '700',
  },
  freqPct: {
    ...typography.meta,
    color: c.inkMuted,
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
    color: c.inkMuted,
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
  heatmapAxisLabel: {
    ...typography.meta,
    fontSize: 9,
    color: c.inkMuted,
    textAlign: 'center',
  },
  heatmapNameLabel: {
    ...typography.meta,
    color: c.ink,
  },
  legendLabel: {
    ...typography.meta,
    color: c.inkMuted,
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
    borderTopColor: c.divider,
  },
  missingName: {
    ...typography.body,
    color: c.ink,
    fontWeight: '500',
    flex: 1,
  },
  missingMeta: {
    ...typography.meta,
    color: c.danger,
  },
  missingSeeMore: {
    alignSelf: 'flex-end',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    marginTop: spacing.xs,
  },
  missingSeeMoreLabel: {
    ...typography.meta,
    color: c.primary,
    fontWeight: '600',
  },
  errorLine: {
    ...typography.body,
    color: c.danger,
  },
  emptyLine: {
    ...typography.body,
    color: c.inkMuted,
    textAlign: 'center',
    paddingVertical: spacing.sm,
  },
  footnote: {
    ...typography.meta,
    color: c.inkFaded,
    paddingHorizontal: spacing.xs,
    lineHeight: 15,
  },

  scopeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  scopeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    height: 32,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(93,63,211,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(93,63,211,0.15)',
    flexShrink: 1,
    maxWidth: '80%',
  },
  scopeChipActive: {
    backgroundColor: c.primary,
    borderColor: c.primary,
  },
  scopeChipLabel: {
    ...typography.meta,
    color: c.primary,
    fontWeight: '600',
  },
  scopeChipLabelActive: { color: '#ffffff' },
  scopeClear: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  scopeClearLabel: {
    ...typography.meta,
    color: c.inkMuted,
    fontWeight: '600',
  },

  scopeBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  scopeSheet: {
    backgroundColor: c.card,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  scopeSheetHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: c.inkGhost,
    marginBottom: spacing.sm,
  },
  scopeSheetTitle: { ...typography.cardTitle, color: c.ink, marginBottom: spacing.xs },
  scopeSheetHeader: {
    ...typography.eyebrow,
    color: c.inkMuted,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  scopeSheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.md,
  },
  scopeSheetRowActive: { backgroundColor: 'rgba(93,63,211,0.08)' },
  scopeSheetRowLabel: { ...typography.body, color: c.ink, flex: 1 },
  scopeEmpty: {
    ...typography.meta,
    color: c.inkMuted,
    padding: spacing.md,
  },
});
}

