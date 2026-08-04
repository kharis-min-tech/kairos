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
import { ChevronLeft, Check, Circle } from 'lucide-react-native';
import { Avatar, Card, Badge, ProgressBar, colors, spacing, typography, radii } from '@kairos/ui-native';
import { formatShortDate } from '@kairos/core';
import { api } from '@/lib/api-client';

const SESSION_TITLES = [
  '1 · Foundations of Faith',
  '2 · Who is a Christian',
  '3 · Working out your Salvation',
  '4 · The Importance of Fellowship',
];

const TOTAL_SESSIONS = SESSION_TITLES.length;

export default function NewBelievers() {
  const router = useRouter();

  const enrollments = useQuery({
    queryKey: ['new-believers', 'enrollments'],
    queryFn: async () => {
      const res = await api.newBelievers.enrollments.list();
      const payload = res.data;
      if (!payload) return [];
      return Array.isArray(payload) ? payload : (payload.data ?? []);
    },
  });

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerBar}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ChevronLeft color={colors.ink} size={24} strokeWidth={1.5} />
        </Pressable>
        <Text style={styles.headerTitle}>New Believer journey</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={enrollments.isFetching}
            onRefresh={() => enrollments.refetch()}
            tintColor={colors.primary}
          />
        }
      >
        {enrollments.isLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xxl }} />
        ) : (enrollments.data ?? []).length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No active enrollments</Text>
            <Text style={styles.emptyMeta}>
              New Believers you teach or mentor will appear here.
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
}

function EnrollmentCard({
  firstName,
  lastName,
  enrolledAt,
  stage,
  completed,
  teacherName,
  mentorName,
}: EnrollmentCardProps) {
  const progressValue = Math.min(1, completed / TOTAL_SESSIONS);
  return (
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
        <ProgressBar value={progressValue} color={colors.gold} height={6} />
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
                  <Circle color={colors.goldDark} size={8} strokeWidth={2} />
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
  );
}

function RoleTile({ label, value }: { label: string; value: string }) {
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
    gap: spacing.md,
  },
  empty: {
    alignItems: 'center',
    marginTop: spacing.xxl,
    gap: spacing.xs,
  },
  emptyTitle: { ...typography.cardTitle, color: colors.ink },
  emptyMeta: {
    ...typography.body,
    color: 'rgba(26,28,28,0.55)',
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
  enrollmentName: { ...typography.cardTitle, color: colors.ink },
  enrollmentMeta: { ...typography.meta, color: 'rgba(26,28,28,0.55)' },

  progressBlock: { gap: spacing.xs },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressLabel: { ...typography.meta, color: 'rgba(26,28,28,0.6)' },
  progressPercent: {
    ...typography.meta,
    color: colors.goldDark,
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
    borderColor: 'rgba(26,28,28,0.2)',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineDotDone: {
    backgroundColor: colors.success,
    borderColor: colors.success,
    borderStyle: 'solid',
  },
  timelineDotActive: {
    borderColor: colors.gold,
    borderStyle: 'solid',
  },
  timelineLabel: {
    ...typography.body,
    color: 'rgba(26,28,28,0.5)',
    flex: 1,
  },
  timelineLabelDone: { color: colors.ink },
  timelineLabelActive: { color: colors.ink, fontWeight: '600' },

  rolesRow: { flexDirection: 'row', gap: spacing.sm },
  roleTile: {
    flex: 1,
    backgroundColor: colors.subtleLight,
    borderRadius: radii.md,
    padding: spacing.sm,
    gap: 2,
  },
  roleLabel: { ...typography.eyebrow, color: 'rgba(26,28,28,0.55)' },
  roleValue: { ...typography.meta, color: colors.ink, fontWeight: '600' },
});
