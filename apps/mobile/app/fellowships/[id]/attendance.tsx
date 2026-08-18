import { useMemo, useState } from 'react';
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
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft } from 'lucide-react-native';
import {
  Avatar,
  Badge,
  Card,
  radii,
  spacing,
  typography,
  useThemedStyles,
  type ThemeColors,
  useColors,
} from '@kairos/ui-native';
import { api } from '@/lib/api-client';

type Window = 4 | 8 | 12 | 26;

const WINDOW_LABELS: Record<Window, string> = {
  4: '4w',
  8: '8w',
  12: '12w',
  26: '26w',
};

export default function FellowshipAttendance() {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const fellowshipId = id!;
  const [weeks, setWeeks] = useState<Window>(8);

  const report = useQuery({
    queryKey: ['attendance', 'fellowship', fellowshipId, weeks],
    enabled: !!fellowshipId,
    queryFn: async () =>
      (await api.attendance.fellowshipReport(fellowshipId, { weeks })).data ?? null,
  });

  const membersSorted = useMemo(
    () =>
      (report.data?.members ?? [])
        .slice()
        .sort((a, b) => b.serviceRate - a.serviceRate),
    [report.data?.members],
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerBar}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ChevronLeft color={c.ink} size={24} strokeWidth={1.5} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          Attendance
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.tabs}>
        {(Object.keys(WINDOW_LABELS) as unknown as Window[]).map((w) => {
          const active = w == weeks;
          return (
            <Pressable
              key={w}
              onPress={() => setWeeks(w)}
              style={[styles.tab, active && styles.tabActive]}
            >
              <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>
                {WINDOW_LABELS[w]}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={report.isFetching}
            onRefresh={() => report.refetch()}
            tintColor={c.primary}
          />
        }
      >
        {report.isLoading ? (
          <ActivityIndicator color={c.primary} style={{ marginTop: spacing.xxl }} />
        ) : !report.data ? (
          <Card padding="md">
            <Text style={styles.emptyLine}>No attendance data yet.</Text>
          </Card>
        ) : (
          <>
            <Text style={styles.contextLine}>
              {report.data.fellowship.name} · {report.data.fellowship.branchName}
            </Text>

            <View style={styles.tileRow}>
              <StatTile label="Active members" value={report.data.activeMembers} tone={c.primary} />
              <StatTile
                label="Service rate"
                value={`${Math.round(report.data.services.rate * 100)}%`}
                tone={c.gold}
              />
              <StatTile
                label="Meeting rate"
                value={`${Math.round(report.data.meetings.rate * 100)}%`}
                tone={c.success}
              />
            </View>

            <Card padding="md" style={{ gap: 4 }}>
              <Text style={styles.eyebrow}>SUNDAY SERVICES</Text>
              <Text style={styles.summaryLine}>
                {report.data.services.distinctAttendees} distinct attendees across{' '}
                {report.data.services.totalServices} services · {weeks}w window
              </Text>
              {report.data.services.trend.length > 0 ? (
                <View style={styles.trendRow}>
                  {report.data.services.trend.slice(-8).map((t) => {
                    const max = Math.max(
                      1,
                      ...report.data!.services.trend.map((x) => x.attendees),
                    );
                    const h = Math.max(4, Math.round((t.attendees / max) * 60));
                    return (
                      <View key={t.weekStart} style={styles.trendCol}>
                        <View style={{ height: 60, justifyContent: 'flex-end' }}>
                          <View style={[styles.trendBar, { height: h }]} />
                        </View>
                        <Text style={styles.trendLabel}>
                          {new Date(t.weekStart).getDate()}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              ) : null}
            </Card>

            <Card padding="md" style={{ gap: 6 }}>
              <Text style={styles.eyebrow}>FELLOWSHIP MEETINGS</Text>
              <Text style={styles.summaryLine}>
                {report.data.meetings.distinctAttendees} distinct attendees across{' '}
                {report.data.meetings.totalMeetings} meetings
              </Text>
              {report.data.meetings.lastMeeting ? (
                <Text style={styles.metaFaded}>
                  Last meeting {report.data.meetings.lastMeeting.date}:{' '}
                  {report.data.meetings.lastMeeting.attended}/
                  {report.data.meetings.lastMeeting.total} present
                </Text>
              ) : (
                <Text style={styles.metaFaded}>No meetings logged in this window.</Text>
              )}
            </Card>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Members</Text>
                <Badge label={String(membersSorted.length)} variant="neutral" size="sm" />
              </View>
              {membersSorted.length === 0 ? (
                <Card padding="md">
                  <Text style={styles.emptyLine}>No active members.</Text>
                </Card>
              ) : (
                membersSorted.map((m) => (
                  <Card key={m.memberId} padding="md" style={styles.row}>
                    <Avatar size="sm" firstName={m.firstName} lastName={m.lastName} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.rowName}>
                        {m.firstName} {m.lastName}
                      </Text>
                      <Text style={styles.rowMeta}>
                        Services {m.serviceAttendedCount} ·{' '}
                        {Math.round(m.serviceRate * 100)}%
                      </Text>
                      <Text style={styles.rowMeta}>
                        Meetings {m.meetingAttendedCount} ·{' '}
                        {Math.round(m.meetingRate * 100)}%
                      </Text>
                    </View>
                  </Card>
                ))
              )}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function StatTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: number | string;
  tone: string;
}) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={[styles.statTile, { borderLeftColor: tone }]}>
      <Text style={[styles.statValue, { color: tone }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
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
    headerTitle: { ...typography.cardTitle, color: c.ink, flex: 1, textAlign: 'center' },
    tabs: {
      flexDirection: 'row',
      paddingHorizontal: spacing.lg,
      gap: spacing.xs,
      paddingBottom: spacing.sm,
    },
    tab: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: radii.pill,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
    },
    tabActive: {
      backgroundColor: 'rgba(93,63,211,0.1)',
      borderColor: c.primary,
    },
    tabLabel: { ...typography.body, color: c.inkMuted, fontWeight: '600' },
    tabLabelActive: { color: c.primary, fontWeight: '700' },
    container: {
      padding: spacing.lg,
      paddingBottom: spacing.xxl,
      gap: spacing.md,
    },
    contextLine: { ...typography.meta, color: c.inkMuted },
    emptyLine: { ...typography.body, color: c.inkMuted },
    tileRow: { flexDirection: 'row', gap: spacing.xs },
    statTile: {
      flex: 1,
      backgroundColor: c.card,
      borderRadius: radii.md,
      padding: spacing.sm,
      borderLeftWidth: 3,
      gap: 2,
    },
    statValue: { fontSize: 20, fontWeight: '800' },
    statLabel: { ...typography.meta, color: c.inkMuted, fontWeight: '600' },
    eyebrow: { ...typography.eyebrow, color: c.inkMuted },
    summaryLine: { ...typography.body, color: c.ink },
    metaFaded: { ...typography.meta, color: c.inkFaded },
    trendRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 4,
      paddingTop: spacing.sm,
    },
    trendCol: { flex: 1, alignItems: 'center', gap: 2 },
    trendBar: {
      width: '100%',
      backgroundColor: c.primary,
      borderRadius: 2,
    },
    trendLabel: { ...typography.meta, color: c.inkFaded, fontSize: 10 },
    section: { gap: spacing.sm },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    sectionTitle: { ...typography.cardTitle, color: c.ink, flex: 1 },
    row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    rowName: { ...typography.body, color: c.ink, fontWeight: '700' },
    rowMeta: { ...typography.meta, color: c.inkMuted },
  });
}
