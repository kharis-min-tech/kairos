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
import { ChevronLeft, ChevronRight, Handshake, Users, Flame } from 'lucide-react-native';
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
            <Card padding="md" style={{ gap: spacing.sm }}>
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

              <View style={styles.ragRow}>
                <RagTile label="Red" count={rag.RED} color={c.danger} />
                <RagTile label="Amber" count={rag.AMBER} color={c.gold} />
                <RagTile label="Green" count={rag.GREEN} color={c.success} />
              </View>
              <Text style={styles.ragHint}>
                RAG reflects follow-up freshness. Red = missed &gt; 14 days.
              </Text>
            </Card>

            {statusRows.length > 0 ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>By status</Text>
                <View style={{ gap: spacing.xs }}>
                  {statusRows.map((r) => {
                    const pct = total > 0 ? Math.round((r.count / total) * 100) : 0;
                    const tone = STATUS_TONE[r.status] ?? c.inkFaded;
                    return (
                      <View key={r.status} style={styles.statusRow}>
                        <View style={styles.statusHeader}>
                          <View style={[styles.statusDot, { backgroundColor: tone }]} />
                          <Text style={styles.statusLabel}>
                            {STATUS_LABEL[r.status] ?? r.status}
                          </Text>
                          <Text style={styles.statusCount}>{r.count}</Text>
                        </View>
                        <View style={styles.statusBarTrack}>
                          <View
                            style={[
                              styles.statusBarFill,
                              { backgroundColor: tone, width: `${pct}%` },
                            ]}
                          />
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
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

function RagTile({ label, count, color }: { label: string; count: number; color: string }) {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  return (
    <View style={[styles.ragTile, { backgroundColor: `${color}20` }]}>
      <Text style={[styles.ragNum, { color }]}>{count}</Text>
      <Text style={styles.ragLabel}>{label}</Text>
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

  ragRow: { flexDirection: 'row', gap: spacing.sm },
  ragTile: {
    flex: 1,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    gap: 2,
  },
  ragNum: { fontSize: 22, fontWeight: '800' },
  ragLabel: { ...typography.meta, color: c.inkMuted, fontWeight: '600' },
  ragHint: { ...typography.meta, color: c.inkFaded, lineHeight: 14 },

  section: { gap: spacing.sm },
  sectionTitle: {
    ...typography.eyebrow,
    color: c.inkMuted,
    paddingHorizontal: spacing.xs,
  },

  statusRow: { gap: 4 },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusLabel: { ...typography.body, color: c.ink, fontWeight: '600', flex: 1 },
  statusCount: { ...typography.body, color: c.ink, fontWeight: '700' },
  statusBarTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: c.divider,
    overflow: 'hidden',
  },
  statusBarFill: { height: '100%', borderRadius: 3 },

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

