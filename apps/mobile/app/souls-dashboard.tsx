import { useMemo } from 'react';
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
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import Svg, { G, Path, Text as SvgText, Circle } from 'react-native-svg';
import { ChevronLeft, ChevronRight, Handshake, Sparkles, Users, Flame } from 'lucide-react-native';
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
import { api } from '@/lib/api-client';

const STATUS_LABEL: Record<string, string> = {
  New: 'New',
  'Following Up': 'Following up',
  Interested: 'Interested',
  Converted: 'Converted',
  'Not Interested': 'Not interested',
  'Lost Contact': 'Lost contact',
};

const STATUS_TONE: Record<string, string> = {
  New: colors.primary,
  'Following Up': colors.gold,
  Interested: colors.info,
  Converted: colors.success,
  'Not Interested': colors.danger,
  'Lost Contact': 'rgba(120,120,128,0.5)',
};

interface Overview {
  totalSouls: number;
  ragCounts: { RED: number; AMBER: number; GREEN: number };
  statusCounts: Record<string, number>;
}

interface FollowUpsOverview {
  totalOverdue?: number;
  totalDueThisWeek?: number;
  totalUpcoming?: number;
  ragCounts?: { RED: number; AMBER: number; GREEN: number };
}

export default function SoulsDashboard() {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  const router = useRouter();

  const overview = useQuery({
    queryKey: ['souls-dashboard', 'overview'],
    queryFn: async () => (await api.dashboard.overview()).data as Overview | null,
  });
  const followUps = useQuery({
    queryKey: ['souls-dashboard', 'follow-ups-overview'],
    queryFn: async () =>
      (await api.dashboard.followUpsOverview()).data as FollowUpsOverview | null,
  });

  const isFetching = overview.isFetching || followUps.isFetching;
  const refresh = () => {
    overview.refetch();
    followUps.refetch();
  };

  const rag = overview.data?.ragCounts ?? { RED: 0, AMBER: 0, GREEN: 0 };
  const total = overview.data?.totalSouls ?? 0;
  const statusRows = useMemo(
    () =>
      Object.entries(overview.data?.statusCounts ?? {})
        .map(([status, count]) => ({
          status,
          count: Number(count) || 0,
        }))
        .sort((a, b) => b.count - a.count),
    [overview.data?.statusCounts],
  );
  const followUpsOverdue = followUps.data?.totalOverdue ?? 0;
  const followUpsDueThisWeek = followUps.data?.totalDueThisWeek ?? 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerBar}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ChevronLeft color={c.ink} size={24} strokeWidth={1.5} />
        </Pressable>
        <Text style={styles.headerTitle}>Souls dashboard</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl refreshing={isFetching} onRefresh={refresh} tintColor={c.primary} />
        }
      >
        {overview.isLoading ? (
          <ActivityIndicator color={c.primary} style={{ marginTop: spacing.xxl }} />
        ) : (
          <>
            <Card padding="md" style={{ gap: spacing.md }}>
              <View style={styles.headline}>
                <View style={styles.headlineIcon}>
                  <Users color={c.primary} size={18} strokeWidth={1.5} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.headlineNum}>{total}</Text>
                  <Text style={styles.headlineLabel}>
                    total soul{total === 1 ? '' : 's'} in the pipeline
                  </Text>
                </View>
              </View>

              <View style={styles.donutRow}>
                <Donut
                  segments={[
                    { value: rag.RED, color: c.danger, label: 'Red' },
                    { value: rag.AMBER, color: c.gold, label: 'Amber' },
                    { value: rag.GREEN, color: c.success, label: 'Green' },
                  ]}
                  centerLabel={String(total)}
                  centerSub="total"
                />
                <View style={{ flex: 1, gap: spacing.xs }}>
                  <RagLegendRow label="Red" value={rag.RED} tone={c.danger} />
                  <RagLegendRow label="Amber" value={rag.AMBER} tone={c.gold} />
                  <RagLegendRow label="Green" value={rag.GREEN} tone={c.success} />
                </View>
              </View>
              <Text style={styles.ragHint}>
                RAG reflects follow-up freshness. Red = missed &gt; 14 days.
              </Text>
            </Card>

            {statusRows.length > 0 ? (
              <Card padding="md" style={{ gap: spacing.md }}>
                <Text style={styles.sectionTitle}>By status</Text>
                <View style={styles.donutRow}>
                  <Donut
                    segments={statusRows.map((r) => ({
                      value: r.count,
                      color: STATUS_TONE[r.status] ?? c.inkFaded,
                      label: STATUS_LABEL[r.status] ?? r.status,
                    }))}
                    centerLabel={String(total)}
                    centerSub="souls"
                  />
                  <View style={{ flex: 1, gap: spacing.xs }}>
                    {statusRows.map((r) => {
                      const pct = total > 0 ? Math.round((r.count / total) * 100) : 0;
                      const tone = STATUS_TONE[r.status] ?? c.inkFaded;
                      return (
                        <View key={r.status} style={styles.legendRow}>
                          <View style={[styles.legendSwatch, { backgroundColor: tone }]} />
                          <Text style={styles.legendLabel} numberOfLines={1}>
                            {STATUS_LABEL[r.status] ?? r.status}
                          </Text>
                          <Text style={styles.statusCountText}>
                            {r.count} · {pct}%
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
              </Card>
            ) : null}

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Follow-ups</Text>
              <View style={styles.tileRow}>
                <StatTile
                  label="Overdue"
                  value={String(followUpsOverdue)}
                  tone={followUpsOverdue > 0 ? c.danger : c.inkFaded}
                  icon={<Flame color="#ffffff" size={14} strokeWidth={2} />}
                />
                <StatTile
                  label="Due this week"
                  value={String(followUpsDueThisWeek)}
                  tone={c.primary}
                />
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Jump to</Text>
              <LinkRow
                label="Capture a soul"
                sub="Log an evangelism encounter"
                onPress={() => router.push('/souls/capture' as never)}
                iconTone={c.primary}
                icon={<Sparkles color={c.primary} size={16} strokeWidth={1.5} />}
              />
              <LinkRow
                label="All souls"
                sub={`${total} in scope`}
                onPress={() => router.push('/souls')}
              />
              <LinkRow
                label="Follow-ups queue"
                sub={
                  followUpsOverdue + followUpsDueThisWeek > 0
                    ? `${followUpsOverdue + followUpsDueThisWeek} awaiting`
                    : 'You\'re clear'
                }
                onPress={() => router.push('/follow-ups')}
                iconTone={c.gold}
                icon={<Handshake color={c.gold} size={16} strokeWidth={1.5} />}
              />
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

interface DonutSegment {
  value: number;
  color: string;
  label: string;
}

/**
 * Compact donut chart — 120px, colour-per-segment, centre label. Renders
 * empty-state (grey ring) when total is 0 so the block never disappears.
 */
function Donut({
  segments,
  centerLabel,
  centerSub,
}: {
  segments: DonutSegment[];
  centerLabel: string;
  centerSub?: string;
}) {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  const size = 120;
  const strokeWidth = 18;
  const radius = (size - strokeWidth) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const total = segments.reduce((sum, s) => sum + s.value, 0);

  if (total === 0) {
    return (
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <Svg width={size} height={size}>
          <Circle
            cx={cx}
            cy={cy}
            r={radius}
            stroke={c.divider}
            strokeWidth={strokeWidth}
            fill="none"
          />
          <SvgText
            x={cx}
            y={cy + 5}
            fontSize={18}
            fontWeight="700"
            fill={c.inkMuted}
            textAnchor="middle"
          >
            0
          </SvgText>
        </Svg>
      </View>
    );
  }

  let cumulative = 0;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        <G rotation={-90} originX={cx} originY={cy}>
          {segments.map((seg, i) => {
            if (seg.value === 0) return null;
            const fraction = seg.value / total;
            const startAngle = cumulative * 2 * Math.PI;
            const endAngle = (cumulative + fraction) * 2 * Math.PI;
            cumulative += fraction;
            const path = arcPath(cx, cy, radius, startAngle, endAngle);
            return (
              <Path
                key={i}
                d={path}
                stroke={seg.color}
                strokeWidth={strokeWidth}
                fill="none"
                strokeLinecap="butt"
              />
            );
          })}
        </G>
        <SvgText
          x={cx}
          y={cy - 2}
          fontSize={20}
          fontWeight="800"
          fill={c.ink}
          textAnchor="middle"
        >
          {centerLabel}
        </SvgText>
        {centerSub ? (
          <SvgText
            x={cx}
            y={cy + 16}
            fontSize={9}
            fontWeight="600"
            fill={c.inkMuted}
            textAnchor="middle"
          >
            {centerSub.toUpperCase()}
          </SvgText>
        ) : null}
      </Svg>
    </View>
  );
}

/** SVG arc path — degrees expressed in radians; returns a stroke-only arc. */
function arcPath(cx: number, cy: number, r: number, start: number, end: number): string {
  // A full circle drawn as one arc is a special case — SVG needs two arcs.
  const isFull = end - start >= 2 * Math.PI - 0.001;
  if (isFull) {
    return `M ${cx - r} ${cy} A ${r} ${r} 0 1 1 ${cx + r} ${cy} A ${r} ${r} 0 1 1 ${cx - r} ${cy}`;
  }
  const x1 = cx + r * Math.cos(start);
  const y1 = cy + r * Math.sin(start);
  const x2 = cx + r * Math.cos(end);
  const y2 = cy + r * Math.sin(end);
  const largeArc = end - start > Math.PI ? 1 : 0;
  return `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`;
}

function RagLegendRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: string;
}) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.legendRow}>
      <View style={[styles.legendSwatch, { backgroundColor: tone }]} />
      <Text style={styles.legendLabel}>{label}</Text>
      <Text style={[styles.legendValue, { color: tone }]}>{value}</Text>
    </View>
  );
}

function StatTile({
  label,
  value,
  tone,
  icon,
}: {
  label: string;
  value: string;
  tone: string;
  icon?: React.ReactNode;
}) {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  return (
    <View style={[styles.statTile, { borderLeftColor: tone }]}>
      <View style={styles.statTileHead}>
        {icon ? (
          <View style={[styles.statTileIcon, { backgroundColor: tone }]}>{icon}</View>
        ) : null}
        <Text style={styles.statTileLabel}>{label}</Text>
      </View>
      <Text style={[styles.statTileValue, { color: tone }]}>{value}</Text>
    </View>
  );
}

function LinkRow({
  label,
  sub,
  onPress,
  icon,
  iconTone,
}: {
  label: string;
  sub: string;
  onPress: () => void;
  icon?: React.ReactNode;
  iconTone?: string;
}) {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  return (
    <Pressable onPress={onPress}>
      <Card padding="md" style={styles.linkRow}>
        {icon ? (
          <View style={[styles.linkIcon, { backgroundColor: `${iconTone ?? c.primary}20` }]}>
            {icon}
          </View>
        ) : null}
        <View style={{ flex: 1 }}>
          <Text style={styles.linkLabel}>{label}</Text>
          <Text style={styles.linkSub}>{sub}</Text>
        </View>
        <ChevronRight color={c.inkVeryFaded} size={16} strokeWidth={1.5} />
      </Card>
    </Pressable>
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

  headline: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  headlineIcon: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    backgroundColor: 'rgba(93,63,211,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headlineNum: { fontSize: 28, fontWeight: '800', color: c.ink },
  headlineLabel: { ...typography.meta, color: c.inkMuted },

  donutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 2,
  },
  legendSwatch: {
    width: 12,
    height: 12,
    borderRadius: 3,
  },
  legendLabel: { ...typography.body, color: c.ink, flex: 1, fontWeight: '500' },
  legendValue: { ...typography.body, fontWeight: '800' },
  statusCountText: { ...typography.meta, color: c.inkMuted, fontWeight: '600' },
  ragHint: { ...typography.meta, color: c.inkFaded, lineHeight: 14 },

  section: { gap: spacing.sm },
  sectionTitle: {
    ...typography.eyebrow,
    color: c.inkMuted,
    paddingHorizontal: spacing.xs,
  },

  tileRow: { flexDirection: 'row', gap: spacing.sm },
  statTile: {
    flex: 1,
    backgroundColor: c.card,
    borderRadius: radii.md,
    padding: spacing.md,
    borderLeftWidth: 3,
    gap: spacing.xs,
  },
  statTileHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  statTileIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statTileLabel: { ...typography.meta, color: c.inkMuted, fontWeight: '600' },
  statTileValue: { fontSize: 22, fontWeight: '800' },

  linkRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  linkIcon: {
    width: 32,
    height: 32,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkLabel: { ...typography.body, color: c.ink, fontWeight: '600' },
  linkSub: { ...typography.meta, color: c.inkMuted },
});
}

