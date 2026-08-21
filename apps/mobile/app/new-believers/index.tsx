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
import { ChevronLeft, Check, Circle, CalendarClock } from 'lucide-react-native';
import {
  Avatar,
  Card,
  Badge,
  ProgressBar,
  spacing,
  typography,
  radii,
  useThemedStyles,
  type ThemeColors,
  useColors,
} from '@kairos/ui-native';
import { formatShortDate } from '@kairos/core';
import { api } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth';
import { useCapabilities } from '@/lib/capabilities';
import { useEffect } from 'react';

const SESSION_TITLES = [
  '1 · Foundations of Faith',
  '2 · Who is a Christian',
  '3 · Working out your Salvation',
  '4 · The Importance of Fellowship',
];

const TOTAL_SESSIONS = SESSION_TITLES.length;

export default function NewBelievers() {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  const router = useRouter();
  const params = useLocalSearchParams<{ scope?: 'mine' | 'all' }>();
  const userId = useAuthStore((s) => s.user?.id);
  const branchId = useAuthStore((s) => s.user?.homeBranchId ?? null);
  const personalScope = params.scope === 'mine';

  // Only the NB team (mentors, teachers, branch admins) sees the pipeline.
  // Everyone else lands on the personal "my journey" view. This mirrors the
  // web /new-believers surface and stops plain members seeing other people's
  // enrollments.
  const caps = useCapabilities();
  const canSeeTeamView =
    caps.systemRole === 'admin' ||
    caps.has('newbelievers:mentor') ||
    caps.has('newbelievers:teach') ||
    (!!branchId && caps.has('branch:write', { kind: 'branch', id: branchId }));
  useEffect(() => {
    if (!personalScope && !canSeeTeamView) {
      router.replace('/new-believers?scope=mine' as never);
    }
  }, [personalScope, canSeeTeamView, router]);

  const enrollments = useQuery({
    queryKey: ['new-believers', 'enrollments', personalScope ? 'mine' : 'all'],
    queryFn: async () => {
      const res = await api.newBelievers.enrollments.list();
      const payload = res.data;
      if (!payload) return [];
      const rows = Array.isArray(payload) ? payload : (payload.data ?? []);
      return personalScope && userId ? rows.filter((e) => e.memberId === userId) : rows;
    },
  });

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerBar}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ChevronLeft color={c.ink} size={24} strokeWidth={1.5} />
        </Pressable>
        <Text style={styles.headerTitle}>
          {personalScope ? 'My New Believer journey' : 'New Believers pipeline'}
        </Text>
        {personalScope ? (
          <View style={{ width: 24 }} />
        ) : (
          <Pressable
            onPress={() => router.push('/new-believers/sessions' as never)}
            hitSlop={8}
            accessibilityLabel="Open sessions"
          >
            <CalendarClock color={c.primary} size={22} strokeWidth={1.5} />
          </Pressable>
        )}
      </View>

      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={enrollments.isFetching}
            onRefresh={() => enrollments.refetch()}
            tintColor={c.primary}
          />
        }
      >
        {enrollments.isLoading ? (
          <ActivityIndicator color={c.primary} style={{ marginTop: spacing.xxl }} />
        ) : (enrollments.data ?? []).length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>
              {personalScope ? 'You’re not enrolled' : 'No active enrollments'}
            </Text>
            <Text style={styles.emptyMeta}>
              {personalScope
                ? 'Enrol in the New Believers class via your branch team to track your journey here.'
                : 'New Believers you teach or mentor will appear here.'}
            </Text>
          </View>
        ) : (
          (enrollments.data ?? []).map((e) => (
            <EnrollmentCard
              key={e.id}
              firstName={e.memberFirstName}
              lastName={e.memberLastName}
              enrolledAt={e.enrolledAt}
              stage={e.stage}
              completed={countCompleted(e.sessionCompletedAt)}
              teacherName={
                e.teacherFirstName
                  ? `${e.teacherFirstName} ${e.teacherLastName ?? ''}`.trim()
                  : null
              }
              mentorName={
                e.mentorFirstName
                  ? `${e.mentorFirstName} ${e.mentorLastName ?? ''}`.trim()
                  : null
              }
              onPress={
                personalScope
                  ? undefined
                  : () => router.push(`/new-believers/${e.id}` as never)
              }
            />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

interface EnrollmentCardProps {
  firstName: string;
  lastName: string;
  enrolledAt: string;
  stage: string;
  completed: number;
  teacherName: string | null;
  mentorName: string | null;
  onPress?: () => void;
}

function EnrollmentCard({
  firstName,
  lastName,
  enrolledAt,
  stage,
  completed,
  teacherName,
  mentorName,
  onPress,
}: EnrollmentCardProps) {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  const progressValue = Math.min(1, completed / TOTAL_SESSIONS);
  const Wrapper = onPress ? Pressable : View;
  return (
    <Wrapper onPress={onPress}>
      <Card padding="md" style={styles.enrollmentCard}>
      <View style={styles.enrollmentHeader}>
        <Avatar size="md" firstName={firstName} lastName={lastName} />
        <View style={styles.enrollmentText}>
          <Text style={styles.enrollmentName}>
            {firstName} {lastName}
          </Text>
          <Text style={styles.enrollmentMeta}>
            Enrolled {formatShortDate(enrolledAt)}
          </Text>
        </View>
        <Badge label={stage} variant="primary" size="sm" />
      </View>

      <View style={styles.progressBlock}>
        <View style={styles.progressLabelRow}>
          <Text style={styles.progressLabel}>
            {completed} of {TOTAL_SESSIONS} sessions
          </Text>
          <Text style={styles.progressPercent}>
            {Math.round(progressValue * 100)}%
          </Text>
        </View>
        <ProgressBar value={progressValue} color={c.gold} height={6} />
      </View>

      <View style={styles.timeline}>
        {SESSION_TITLES.map((title, index) => {
          const isDone = index < completed;
          const isActive = index === completed;
          return (
            <View key={title} style={styles.timelineRow}>
              <View
                style={[
                  styles.timelineDot,
                  isDone && styles.timelineDotDone,
                  isActive && styles.timelineDotActive,
                ]}
              >
                {isDone ? (
                  <Check color="#ffffff" size={10} strokeWidth={2.5} />
                ) : isActive ? (
                  <Circle color={c.goldDark} size={8} strokeWidth={2} />
                ) : null}
              </View>
              <Text
                style={[
                  styles.timelineLabel,
                  isDone && styles.timelineLabelDone,
                  isActive && styles.timelineLabelActive,
                ]}
              >
                {title}
              </Text>
            </View>
          );
        })}
      </View>

      {teacherName || mentorName ? (
        <View style={styles.rolesRow}>
          {teacherName ? (
            <RoleTile label="Teacher" value={teacherName} />
          ) : null}
          {mentorName ? <RoleTile label="Mentor" value={mentorName} /> : null}
        </View>
      ) : null}
      </Card>
    </Wrapper>
  );
}

function RoleTile({ label, value }: { label: string; value: string }) {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  return (
    <View style={styles.roleTile}>
      <Text style={styles.roleLabel}>{label}</Text>
      <Text style={styles.roleValue}>{value}</Text>
    </View>
  );
}

function countCompleted(sessionCompletedAt: Record<string, string> | null | undefined): number {
  if (!sessionCompletedAt) return 0;
  return Object.keys(sessionCompletedAt).length;
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
    gap: spacing.md,
  },
  empty: {
    alignItems: 'center',
    marginTop: spacing.xxl,
    gap: spacing.xs,
  },
  emptyTitle: { ...typography.cardTitle, color: c.ink },
  emptyMeta: {
    ...typography.body,
    color: c.inkMuted,
    textAlign: 'center',
    marginHorizontal: spacing.xl,
  },

  enrollmentCard: { gap: spacing.md },
  enrollmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  enrollmentText: { flex: 1, gap: 2 },
  enrollmentName: { ...typography.cardTitle, color: c.ink },
  enrollmentMeta: { ...typography.meta, color: c.inkMuted },

  progressBlock: { gap: spacing.xs },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressLabel: { ...typography.meta, color: c.inkMuted },
  progressPercent: {
    ...typography.meta,
    color: c.goldDark,
    fontWeight: '700',
  },

  timeline: { gap: spacing.sm, marginTop: spacing.xs },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  timelineDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: c.borderStrong,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineDotDone: {
    backgroundColor: c.success,
    borderColor: c.success,
    borderStyle: 'solid',
  },
  timelineDotActive: {
    borderColor: c.gold,
    borderStyle: 'solid',
  },
  timelineLabel: {
    ...typography.body,
    color: c.inkFaded,
    flex: 1,
  },
  timelineLabelDone: { color: c.ink },
  timelineLabelActive: { color: c.ink, fontWeight: '600' },

  rolesRow: { flexDirection: 'row', gap: spacing.sm },
  roleTile: {
    flex: 1,
    backgroundColor: c.subtle,
    borderRadius: radii.md,
    padding: spacing.sm,
    gap: 2,
  },
  roleLabel: { ...typography.eyebrow, color: c.inkMuted },
  roleValue: { ...typography.meta, color: c.ink, fontWeight: '600' },
});
}

