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
import { ChevronLeft, Plus, ChevronRight, Calendar, MapPin, User } from 'lucide-react-native';
import {
  Badge,
  Card,
  colors,
  radii,
  spacing,
  typography,
} from '@kairos/ui-native';
import { formatShortDate } from '@kairos/core';
import type { NewBelieverSession } from '@kairos/types';
import { api } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth';

const STAGE_LABELS: Record<string, string> = {
  'session-1': 'Session 1 · Foundations of Faith',
  'session-2': 'Session 2 · Who is a Christian',
  'session-3': 'Session 3 · Working out your Salvation',
  'session-4': 'Session 4 · The Importance of Fellowship',
};

function isUpcoming(sessionDate: string): boolean {
  const d = new Date(sessionDate).getTime();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return d >= today.getTime();
}

export default function NewBelieverSessionsIndex() {
  const router = useRouter();
  const branchId = useAuthStore((s) => s.user?.homeBranchId);

  const sessions = useQuery({
    queryKey: ['new-believers', 'sessions', branchId],
    enabled: !!branchId,
    queryFn: async () => (await api.newBelievers.sessions.list({ branchId })).data ?? [],
  });

  const rows = sessions.data ?? [];
  const upcoming = useMemo(
    () =>
      rows
        .filter((s) => isUpcoming(s.sessionDate))
        .sort(
          (a, b) =>
            new Date(a.sessionDate).getTime() - new Date(b.sessionDate).getTime(),
        ),
    [rows],
  );
  const past = useMemo(
    () =>
      rows
        .filter((s) => !isUpcoming(s.sessionDate))
        .sort(
          (a, b) =>
            new Date(b.sessionDate).getTime() - new Date(a.sessionDate).getTime(),
        ),
    [rows],
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerBar}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ChevronLeft color={colors.ink} size={24} strokeWidth={1.5} />
        </Pressable>
        <Text style={styles.headerTitle}>Sessions</Text>
        <Pressable
          onPress={() => router.push('/new-believers/sessions/new' as never)}
          hitSlop={8}
          accessibilityLabel="Create new session"
        >
          <Plus color={colors.primary} size={22} strokeWidth={1.5} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={sessions.isFetching}
            onRefresh={() => sessions.refetch()}
            tintColor={colors.primary}
          />
        }
      >
        {sessions.isLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xxl }} />
        ) : rows.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No sessions yet</Text>
            <Text style={styles.emptyMeta}>
              Create the first session to start taking attendance for your
              New Believers class.
            </Text>
          </View>
        ) : (
          <>
            {upcoming.length > 0 ? (
              <View style={styles.group}>
                <Text style={styles.groupHeader}>Upcoming</Text>
                {upcoming.map((s) => (
                  <SessionRow key={s.id} session={s} onPress={() => router.push(`/new-believers/sessions/${s.id}` as never)} />
                ))}
              </View>
            ) : null}

            {past.length > 0 ? (
              <View style={styles.group}>
                <Text style={styles.groupHeader}>Past</Text>
                {past.map((s) => (
                  <SessionRow key={s.id} session={s} onPress={() => router.push(`/new-believers/sessions/${s.id}` as never)} />
                ))}
              </View>
            ) : null}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function SessionRow({
  session,
  onPress,
}: {
  session: NewBelieverSession;
  onPress: () => void;
}) {
  const stageLabel = STAGE_LABELS[session.sessionStage] ?? session.sessionStage;
  return (
    <Pressable onPress={onPress}>
      <Card padding="md" style={styles.row}>
        <View style={{ flex: 1, gap: 4 }}>
          <View style={styles.rowTitleLine}>
            <Text style={styles.rowTitle} numberOfLines={1}>
              {stageLabel}
            </Text>
            <Badge label={session.sessionStage} variant="primary" size="sm" />
          </View>
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Calendar color="rgba(26,28,28,0.55)" size={12} strokeWidth={1.5} />
              <Text style={styles.metaText}>{formatShortDate(session.sessionDate)}</Text>
            </View>
            {session.location ? (
              <View style={styles.metaItem}>
                <MapPin color="rgba(26,28,28,0.55)" size={12} strokeWidth={1.5} />
                <Text style={styles.metaText} numberOfLines={1}>
                  {session.location}
                </Text>
              </View>
            ) : null}
            {session.teacherFirstName ? (
              <View style={styles.metaItem}>
                <User color="rgba(26,28,28,0.55)" size={12} strokeWidth={1.5} />
                <Text style={styles.metaText} numberOfLines={1}>
                  {session.teacherFirstName} {session.teacherLastName ?? ''}
                </Text>
              </View>
            ) : null}
          </View>
        </View>
        <ChevronRight color="rgba(26,28,28,0.3)" size={16} strokeWidth={1.5} />
      </Card>
    </Pressable>
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
  empty: {
    marginTop: spacing.xxl,
    alignItems: 'center',
    gap: spacing.xs,
  },
  emptyTitle: { ...typography.cardTitle, color: colors.ink },
  emptyMeta: {
    ...typography.body,
    color: 'rgba(26,28,28,0.55)',
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
  },
  group: {
    gap: spacing.sm,
  },
  groupHeader: {
    ...typography.eyebrow,
    color: 'rgba(26,28,28,0.55)',
    paddingHorizontal: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  rowTitleLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  rowTitle: { ...typography.body, color: colors.ink, fontWeight: '600', flex: 1 },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    ...typography.meta,
    color: 'rgba(26,28,28,0.65)',
  },
});
