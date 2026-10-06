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
import {
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  CalendarDays,
  Users,
  CheckCircle2,
  Clock,
  ListChecks,
  Plus,
} from 'lucide-react-native';
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
import { CHURCH_SCOPE } from '@kairos/types';
import { api } from '@/lib/api-client';
import { alert } from '@/lib/alert';
import { useCapabilities } from '@/lib/capabilities';

/**
 * Membership classes.
 *
 * Cohorts are church-wide rather than branch-scoped, so every approved member
 * can open this screen. Two audiences share it:
 *
 *   - Any member: the cohorts on offer, their own progress, and a way onto
 *     the interest list. Enrolment is NOT self-service — joining the list is
 *     as far as anyone can take themselves; a membership admin admits from
 *     the pool into a cohort.
 *   - Membership admins: the interest pool, cohort creation, and every
 *     cohort's roster, register, scheduling and graduation. The programme
 *     runs end to end from a phone; nothing here needs a desk.
 *
 * The admin gate is `membership:admin` at CHURCH scope, not
 * `systemRole === 'admin'`: the people who run this class hold no platform
 * authority, and a branch grant cannot describe a church-wide cohort.
 *
 * Independent of the New Believers pipeline by design.
 */
export default function MembershipScreen() {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  const router = useRouter();
  const qc = useQueryClient();
  const caps = useCapabilities();
  const isAdmin = caps.has('membership:admin', CHURCH_SCOPE);
  // Champion holds `membership:branch:read` on some branch. The branch-view
  // endpoint returns the union across every branch they cover.
  const isChampion = caps.has('membership:branch:read');
  // A fellowship or department leader gets the same panel narrowed to their
  // own people — the endpoint does the narrowing.
  const isGroupLeader = caps.has('fellowship:read') || caps.has('department:read');

  const cohorts = useQuery({
    queryKey: ['membership', 'cohorts'],
    queryFn: async () => (await api.membership.cohorts.list()).data?.cohorts ?? [],
    // Non-admins don't see the cohort list — skip the fetch.
    enabled: isAdmin,
  });

  const mine = useQuery({
    queryKey: ['membership', 'me'],
    queryFn: async () => (await api.membership.me()).data ?? null,
  });

  const branchView = useQuery({
    queryKey: ['membership', 'branch-view'],
    queryFn: async () => (await api.membership.branchView()).data ?? null,
    enabled: isChampion || isAdmin || isGroupLeader,
  });

  const express = useMutation({
    mutationFn: async () => (await api.membership.interest.express()).data!,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['membership'] });
      alert.info('You are on the list', 'A membership admin will place you in a cohort.');
    },
    onError: (e: unknown) =>
      alert.info('Could not join', e instanceof Error ? e.message : 'Please try again.'),
  });

  const withdrawInterest = useMutation({
    mutationFn: async () => (await api.membership.interest.withdraw()).data!,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['membership'] });
      alert.info('Removed', 'You are no longer on the list.');
    },
    onError: (e: unknown) =>
      alert.info('Could not update', e instanceof Error ? e.message : 'Please try again.'),
  });

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
        <MyMembership
          mine={mine.data}
          styles={styles}
          c={c}
          onJoin={() => express.mutate()}
          onLeave={() => withdrawInterest.mutate()}
          joining={express.isPending}
          leaving={withdrawInterest.isPending}
        />

        {branchView.data ? (
          <ChampionBranchView
            view={branchView.data}
            scope={isChampion || isAdmin ? 'branch' : 'group'}
            styles={styles}
            c={c}
          />
        ) : null}

        {isAdmin ? (
          <>
            <Pressable
              style={styles.adminRow}
              onPress={() => router.push('/membership/interest' as never)}
            >
              <ListChecks color={c.primary} size={18} strokeWidth={1.5} />
              <View style={{ flex: 1 }}>
                <Text style={styles.adminRowLabel}>Interest pool</Text>
                <Text style={styles.metaText}>Admit people into a cohort</Text>
              </View>
              <ChevronRight color={c.inkFaded} size={18} strokeWidth={1.5} />
            </Pressable>
            <Pressable
              style={styles.adminRow}
              onPress={() => router.push('/membership/new' as never)}
            >
              <Plus color={c.primary} size={18} strokeWidth={1.5} />
              <View style={{ flex: 1 }}>
                <Text style={styles.adminRowLabel}>New cohort</Text>
                <Text style={styles.metaText}>Start the next membership class</Text>
              </View>
              <ChevronRight color={c.inkFaded} size={18} strokeWidth={1.5} />
            </Pressable>
          </>
        ) : null}

        {/* Cohort list is admin-only. Waitlist members shouldn't be sizing
            up intakes they can't join themselves — the admission call is
            made by the church membership admin team. Members currently
            enrolled in a cohort reach it via the link inside MyMembership. */}
        {!isAdmin ? null : cohorts.isLoading ? (
          <ActivityIndicator color={c.primary} style={{ marginTop: spacing.xxl }} />
        ) : (cohorts.data ?? []).length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No cohorts yet</Text>
            <Text style={styles.emptyMeta}>
              Create one from Interest pool to start admitting people.
            </Text>
          </View>
        ) : (
          (cohorts.data ?? []).map((co) => (
            <Pressable
              key={co.id}
              onPress={() => router.push(`/membership/${co.id}` as never)}
            >
              <Card style={styles.card}>
                <View style={styles.cardHead}>
                  <Text style={styles.cardTitle}>{co.name}</Text>
                  <Badge
                    label={co.status}
                    variant={co.status === 'active' ? 'primary' : 'neutral'}
                  />
                </View>

                <View style={styles.metaRow}>
                  <CalendarDays color={c.inkFaded} size={14} strokeWidth={1.5} />
                  <Text style={styles.metaText}>
                    Starts {formatShortDate(co.startDate)}
                    {co.graduationDate
                      ? ` · induction ${formatShortDate(co.graduationDate)}`
                      : ''}
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
                  <Text style={styles.metaText}>
                    {co.sessionCount} of 4 sessions scheduled
                  </Text>
                </View>
              </Card>
            </Pressable>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

/**
 * The caller's own state. Five cases in priority order: confirmed Member,
 * enrolled in a cohort, waiting in the pool, a pool entry that ended, or
 * nothing yet.
 *
 * The fourth case is why `me` returns the most recent entry of ANY status.
 * Showing the join button again as though nothing had happened is exactly the
 * silent drop the two-stage model exists to avoid.
 */
function MyMembership({
  mine,
  styles,
  c,
  onJoin,
  onLeave,
  joining,
  leaving,
}: {
  mine: Awaited<ReturnType<typeof api.membership.me>>['data'] | null | undefined;
  styles: ReturnType<typeof makeStyles>;
  c: ThemeColors;
  onJoin: () => void;
  onLeave: () => void;
  joining: boolean;
  leaving: boolean;
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

  if (mine.enrollment) {
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

  const interest = mine.interest;

  if (interest?.status === 'waiting') {
    return (
      <Card style={styles.card}>
        <View style={styles.metaRow}>
          <Clock color={c.primary} size={18} strokeWidth={1.6} />
          <Text style={styles.confirmedTitle}>You are on the list</Text>
        </View>
        <Text style={styles.metaText}>
          Added {formatShortDate(interest.expressedAt)}. A membership admin will place you
          in a cohort. Your place holds until {formatShortDate(interest.expiresAt)}.
        </Text>
        <Button
          label={leaving ? 'Removing…' : 'Take me off the list'}
          variant="secondary"
          onPress={onLeave}
          disabled={leaving}
        />
      </Card>
    );
  }

  const ended = interest?.status === 'lapsed' || interest?.status === 'withdrawn';

  return (
    <Card style={styles.card}>
      <Text style={styles.confirmedTitle}>
        {ended ? 'Your place on the list has ended' : 'Interested in becoming a Member?'}
      </Text>
      <Text style={styles.metaText}>
        {interest?.status === 'lapsed'
          ? `Your place lapsed on ${formatShortDate(interest.expiresAt)}. Join again and you will be considered for the next intake.`
          : interest?.status === 'withdrawn'
            ? 'You took yourself off the list. Join again whenever you are ready.'
            : 'Join the list and a membership admin will place you in an upcoming cohort.'}
      </Text>
      <Button
        label={joining ? 'Joining…' : ended ? 'Join again' : 'Join the list'}
        onPress={onJoin}
        disabled={joining}
      />
    </Card>
  );
}

/**
 * The waitlist and admitted members side by side, read-only. A Champion or
 * Membership Admin is reading a branch; a fellowship/department leader is
 * reading the people they lead, which `scope` labels.
 */
function ChampionBranchView({
  view,
  scope,
  styles,
  c,
}: {
  view: NonNullable<Awaited<ReturnType<typeof api.membership.branchView>>['data']>;
  scope: 'branch' | 'group';
  styles: ReturnType<typeof makeStyles>;
  c: ReturnType<typeof useColors>;
}) {
  const { waitlist, enrolled } = view;
  // A Champion is reading a branch; a group leader is reading the people they
  // lead. Say which, so a partial list is never mistaken for the whole one.
  const isGroup = scope === 'group';
  return (
    <Card style={styles.card}>
      <View style={styles.cardHead}>
        <Users color={c.primary} size={16} strokeWidth={1.8} />
        <Text style={styles.cardTitle}>
          {isGroup ? 'Your people waiting' : 'Branch waitlist'} ({waitlist.length})
        </Text>
      </View>
      {waitlist.length === 0 ? (
        <Text style={styles.metaText}>
          {isGroup
            ? 'Nobody you lead is currently waiting.'
            : 'Nobody from your branch is currently waiting.'}
        </Text>
      ) : (
        waitlist.map((row) => (
          <View key={row.id} style={styles.branchRow}>
            <Text style={styles.branchRowName}>
              {row.memberFirstName} {row.memberLastName}
            </Text>
            <Text style={styles.metaText}>
              Waiting {row.waitingDays}d · added {formatShortDate(row.expressedAt)}
            </Text>
          </View>
        ))
      )}

      <View style={[styles.cardHead, { marginTop: spacing.md }]}>
        <GraduationCap color={c.primary} size={16} strokeWidth={1.8} />
        <Text style={styles.cardTitle}>
          {isGroup ? 'Your people admitted' : 'Admitted from your branch'} ({enrolled.length})
        </Text>
      </View>
      {enrolled.length === 0 ? (
        <Text style={styles.metaText}>
          {isGroup
            ? 'No one you lead is currently enrolled.'
            : 'No one from your branch is currently enrolled.'}
        </Text>
      ) : (
        enrolled.map((row) => (
          <View key={row.enrollmentId} style={styles.branchRow}>
            <Text style={styles.branchRowName}>
              {row.memberFirstName} {row.memberLastName}
            </Text>
            <Text style={styles.metaText}>
              {row.cohortName} · admitted {formatShortDate(row.enrolledAt)}
            </Text>
          </View>
        ))
      )}
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
    branchRow: {
      paddingVertical: spacing.xs,
      borderTopWidth: 1,
      borderTopColor: c.divider,
      gap: 2,
    },
    branchRowName: { ...typography.body, color: c.ink, fontWeight: '500' },
    adminRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      padding: spacing.md,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.divider,
      backgroundColor: c.card,
    },
    adminRowLabel: { ...typography.body, color: c.ink, fontWeight: '600' },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    metaText: { ...typography.meta, color: c.inkMuted },
    outstanding: { ...typography.meta, color: c.inkFaded },
    empty: { alignItems: 'center', gap: spacing.xs, paddingVertical: spacing.xxl },
    emptyTitle: { ...typography.body, color: c.ink, fontWeight: '600' },
    emptyMeta: { ...typography.meta, color: c.inkMuted, textAlign: 'center' },
  });
}
