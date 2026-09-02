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
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, GraduationCap, CalendarDays, Users, CheckCircle2 } from 'lucide-react-native';
import {
  Card,
  Badge,
  Button,
  spacing,
  typography,
  useThemedStyles,
  type ThemeColors,
  useColors,
} from '@kairos/ui-native';
import { formatShortDate } from '@kairos/core';
import { api } from '@/lib/api-client';
import { alert } from '@/lib/alert';

/**
 * Membership classes.
 *
 * Cohorts are church-wide rather than branch-scoped, so every approved member
 * can open this screen: they see the cohorts on offer, their own progress, and
 * can self-enrol. Nothing here is gated on a branch capability.
 *
 * Independent of the New Believers pipeline by design — people sign up for the
 * membership class whenever they want.
 */
export default function MembershipScreen() {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  const router = useRouter();
  const qc = useQueryClient();

  const cohorts = useQuery({
    queryKey: ['membership', 'cohorts'],
    queryFn: async () => (await api.membership.cohorts.list()).data?.cohorts ?? [],
  });

  const mine = useQuery({
    queryKey: ['membership', 'me'],
    queryFn: async () => (await api.membership.me()).data ?? null,
  });

  const enrol = useMutation({
    mutationFn: async (cohortId: string) =>
      (await api.membership.cohorts.enrolSelf(cohortId)).data!,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['membership'] });
      alert.info('Enrolled', 'You are on the list for this cohort.');
    },
    onError: (e: unknown) =>
      alert.info('Could not enrol', e instanceof Error ? e.message : 'Please try again.'),
  });

  const alreadyIn = !!mine.data?.enrollment || !!mine.data?.confirmedAt;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerBar}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ChevronLeft color={c.ink} size={24} strokeWidth={1.5} />
        </Pressable>
        <Text style={styles.headerTitle}>Membership classes</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={cohorts.isFetching}
            onRefresh={() => {
              void cohorts.refetch();
              void mine.refetch();
            }}
            tintColor={c.primary}
          />
        }
      >
        <MyProgress mine={mine.data} styles={styles} c={c} />

        {cohorts.isLoading ? (
          <ActivityIndicator color={c.primary} style={{ marginTop: spacing.xxl }} />
        ) : (cohorts.data ?? []).length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No cohorts yet</Text>
            <Text style={styles.emptyMeta}>
              When the next membership class is scheduled it will show up here.
            </Text>
          </View>
        ) : (
          (cohorts.data ?? []).map((co) => (
            <Card key={co.id} style={styles.card}>
              <View style={styles.cardHead}>
                <Text style={styles.cardTitle}>{co.name}</Text>
                <Badge label={co.status} variant={co.status === 'active' ? 'primary' : 'neutral'} />
              </View>

              <View style={styles.metaRow}>
                <CalendarDays color={c.inkFaded} size={14} strokeWidth={1.5} />
                <Text style={styles.metaText}>
                  Starts {formatShortDate(co.startDate)}
                  {co.graduationDate ? ` · induction ${formatShortDate(co.graduationDate)}` : ''}
                </Text>
              </View>
              <View style={styles.metaRow}>
                <Users color={c.inkFaded} size={14} strokeWidth={1.5} />
                <Text style={styles.metaText}>
                  {co.enrolledCount} enrolled · {co.graduatedCount} graduated
                </Text>
              </View>
              <View style={styles.metaRow}>
                <GraduationCap color={c.inkFaded} size={14} strokeWidth={1.5} />
                <Text style={styles.metaText}>{co.sessionCount} of 4 sessions scheduled</Text>
              </View>

              {!alreadyIn && co.enrolmentOpen && co.status !== 'completed' ? (
                <Button
                  label={enrol.isPending ? 'Enrolling…' : 'Enrol me'}
                  variant="secondary"
                  onPress={() => enrol.mutate(co.id)}
                  disabled={enrol.isPending}
                />
              ) : null}
            </Card>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function MyProgress({
  mine,
  styles,
  c,
}: {
  mine: Awaited<ReturnType<typeof api.membership.me>>['data'] | null | undefined;
  styles: ReturnType<typeof makeStyles>;
  c: ThemeColors;
}) {
  if (!mine) return null;

  if (mine.confirmedAt) {
    return (
      <Card style={styles.confirmedCard}>
        <View style={styles.metaRow}>
          <CheckCircle2 color={c.success} size={18} strokeWidth={1.6} />
          <Text style={styles.confirmedTitle}>You are a confirmed Member</Text>
        </View>
        <Text style={styles.metaText}>
          Membership class completed on {formatShortDate(mine.confirmedAt)}.
        </Text>
      </Card>
    );
  }

  if (!mine.enrollment) return null;

  return (
    <Card style={styles.card}>
      <View style={styles.cardHead}>
        <Text style={styles.cardTitle}>Your progress</Text>
        <Badge
          label={mine.readiness?.eligible ? 'Ready to graduate' : 'In progress'}
          variant={mine.readiness?.eligible ? 'success' : 'neutral'}
        />
      </View>
      <Text style={styles.metaText}>{mine.enrollment.cohortName}</Text>
      {mine.readiness && mine.readiness.outstanding.length > 0 ? (
        <View style={{ gap: 2, marginTop: spacing.xs }}>
          {mine.readiness.outstanding.map((o) => (
            <Text key={o} style={styles.outstanding}>
              • {o}
            </Text>
          ))}
        </View>
      ) : null}
    </Card>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.page },
    headerBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    headerTitle: { ...typography.screenTitle, color: c.ink },
    container: { padding: spacing.md, gap: spacing.md },
    card: { gap: spacing.xs, padding: spacing.md },
    confirmedCard: {
      gap: spacing.xs,
      padding: spacing.md,
      borderColor: c.primary,
      borderWidth: 1,
    },
    confirmedTitle: { ...typography.body, color: c.ink, fontWeight: '600' },
    cardHead: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.sm,
    },
    cardTitle: { ...typography.body, color: c.ink, fontWeight: '600', flex: 1 },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    metaText: { ...typography.meta, color: c.inkMuted },
    outstanding: { ...typography.meta, color: c.inkFaded },
    empty: { alignItems: 'center', gap: spacing.xs, paddingVertical: spacing.xxl },
    emptyTitle: { ...typography.body, color: c.ink, fontWeight: '600' },
    emptyMeta: { ...typography.meta, color: c.inkMuted, textAlign: 'center' },
  });
}
