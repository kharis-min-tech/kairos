import { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import {
  Avatar,
  spacing,
  typography,
  radii,
  useThemedStyles,
  type ThemeColors,
  useColors,
} from '@kairos/ui-native';
import type {
  HomeAgendaItem,
  HomeGettingStartedItem,
  HomeGroupSummary,
  HomePulseWarning,
  HomeTaskItem,
} from '@kairos/types';
import { api } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth';
import {
  AgendaBlock,
  GettingStartedBlock,
  GroupsBlock,
  HomeError,
  HomeSkeleton,
  NeedsYouBlock,
  PulseBlock,
  StreakBlock,
} from '@/components/home-blocks';

/**
 * The control centre. One set of blocks for every lens — `altitude` from
 * GET /api/me/home decides which appear and in what order, so adding a role
 * never means adding a branch here.
 *
 *   personal → agenda, streak, getting started
 *   group    → agenda, needs you, my groups
 *   branch   → agenda, needs you, pulse, this week
 *   church   → pulse first (no personal duties), then needs you, branches
 *
 * Payload items carry ids, not routes; the mapping onto this app's route
 * tree lives in the handlers below.
 */
export default function Home() {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const home = useQuery({
    queryKey: ['me', 'home'],
    queryFn: async () => (await api.me.home()).data ?? null,
    enabled: !!user,
  });

  // Branch leadership is still its own request — the Main Pastor's name rides
  // on the service row and isn't worth a join in the home endpoint yet.
  const leadership = useQuery({
    queryKey: ['home', 'branch-leadership', user?.homeBranchId],
    queryFn: async () => (await api.leadership.list(user!.homeBranchId)).data ?? [],
    enabled: !!user?.homeBranchId,
  });
  const mainPastorName = useMemo(() => {
    const pastor = (leadership.data ?? []).find((l) => l.role === 'Main Pastor' && l.isCurrent);
    if (!pastor) return null;
    return `${pastor.memberFirstName ?? ''} ${pastor.memberLastName ?? ''}`.trim() || null;
  }, [leadership.data]);

  const dateHeader = useMemo(
    () =>
      new Date().toLocaleDateString('en-GB', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      }),
    [],
  );

  const data = home.data;
  const altitude = data?.altitude ?? 'personal';

  // The pastor's name belongs on the service, nowhere else.
  const today = useMemo(
    () =>
      (data?.today ?? []).map((item) =>
        item.kind === 'service' && mainPastorName
          ? { ...item, subtitle: [item.subtitle, mainPastorName].filter(Boolean).join(' · ') }
          : item,
      ),
    [data?.today, mainPastorName],
  );

  function openAgendaItem(item: HomeAgendaItem) {
    switch (item.kind) {
      case 'service':
        router.push(`/attendance/${item.refs.serviceId}` as never);
        return;
      case 'rota':
        router.push('/rota');
        return;
      case 'fellowship_meeting':
        router.push(`/fellowships/${item.refs.fellowshipId}` as never);
        return;
      case 'membership_session':
        router.push('/membership' as never);
        return;
    }
  }

  function openTask(item: HomeTaskItem) {
    switch (item.kind) {
      case 'register_missing':
        router.push(`/rollcall/${item.refs.fellowshipId}/${item.refs.meetingId}` as never);
        return;
      case 'welfare_concern':
      case 'safeguarding_concern':
        router.push('/concerns' as never);
        return;
      case 'followup_due':
        router.push('/follow-ups');
        return;
      case 'membership_interest':
        router.push('/membership/interest' as never);
        return;
      case 'rota_swap':
        router.push('/rota');
        return;
      default:
        router.push('/approvals');
    }
  }

  function openGroup(group: HomeGroupSummary) {
    if (group.kind === 'fellowship') router.push(`/fellowships/${group.id}` as never);
    else if (group.kind === 'department') router.push(`/departments/${group.id}` as never);
    else router.push('/branches');
  }

  function openGettingStarted(item: HomeGettingStartedItem) {
    if (item.key === 'join_fellowship') router.push('/fellowships');
    else if (item.key === 'membership_interest') router.push('/membership/interest' as never);
    else router.push('/profile');
  }

  function openWarning(warning: HomePulseWarning) {
    if (warning.kind === 'members_drifting') router.push('/reports/missing-members' as never);
    else if (warning.kind === 'attendance_unrecorded') router.push('/attendance' as never);
    else router.push('/branches');
  }

  const agendaBlocks = (
    <>
      <AgendaBlock label="Today" items={today} onPress={openAgendaItem} />
      <AgendaBlock
        label="This week"
        items={data?.thisWeek ?? []}
        withDay
        onPress={openAgendaItem}
      />
    </>
  );

  const queueBlock = <NeedsYouBlock items={data?.needsYou ?? []} onPress={openTask} />;
  const pulseBlock = data?.pulse ? (
    <PulseBlock pulse={data.pulse} onWarningPress={openWarning} />
  ) : null;
  const tailBlock = (
    <GroupsBlock
      label={altitude === 'church' ? 'All branches' : 'My groups'}
      groups={data?.groups ?? []}
      onPress={openGroup}
    />
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={home.isFetching}
            onRefresh={() => {
              home.refetch();
              leadership.refetch();
            }}
            tintColor={c.primary}
          />
        }
      >
        <View style={styles.greetingRow}>
          <View style={styles.greetingText}>
            <Text style={styles.dateLabel}>{dateHeader}</Text>
            <Text style={styles.greeting}>Good day, {user?.firstName ?? 'friend'}</Text>
          </View>
          <Pressable
            onPress={() => router.push('/profile')}
            accessibilityRole="button"
            accessibilityLabel="Open profile"
            hitSlop={8}
          >
            <Avatar
              size="md"
              photoUrl={user?.photoUrl}
              firstName={user?.firstName}
              lastName={user?.lastName}
              notificationDot
            />
          </Pressable>
        </View>

        {home.isLoading ? (
          <HomeSkeleton />
        ) : home.isError || !data ? (
          <HomeError
            message={
              home.error instanceof Error
                ? home.error.message
                : 'Please check your connection and try again.'
            }
            onRetry={() => home.refetch()}
          />
        ) : altitude === 'church' ? (
          // A system admin has no personal duties, so the numbers lead and the
          // agenda — usually one line, often none — goes last.
          <>
            {pulseBlock}
            {queueBlock}
            {tailBlock}
            {agendaBlocks}
          </>
        ) : (
          <>
            {agendaBlocks}
            {queueBlock}
            {pulseBlock}
            {tailBlock}
            {data?.streakWeeks ? (
              <StreakBlock
                weeks={data.streakWeeks}
                onPress={() => router.push('/my-attendance')}
              />
            ) : null}
            <GettingStartedBlock
              items={data?.gettingStarted ?? []}
              onPress={openGettingStarted}
            />
          </>
        )}

        <View style={styles.verseCard}>
          <Text style={styles.verseEyebrow}>Daily verse</Text>
          <Text style={styles.verseText}>
            &ldquo;Be still, and know that I am God.&rdquo;
          </Text>
          <Text style={styles.verseRef}>— Psalm 46:10</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: c.page,
    },
    container: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.lg,
      paddingBottom: spacing.xxl * 2,
    },
    greetingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.md,
    },
    greetingText: {
      flex: 1,
    },
    dateLabel: {
      ...typography.meta,
      color: c.inkFaded,
    },
    greeting: {
      ...typography.screenTitle,
      color: c.ink,
      marginTop: 2,
    },
    verseCard: {
      marginTop: spacing.xxl,
      padding: spacing.lg,
      borderRadius: radii.lg,
      backgroundColor: c.subtle,
    },
    verseEyebrow: {
      ...typography.eyebrow,
      color: c.inkFaded,
    },
    verseText: {
      ...typography.cardTitle,
      color: c.ink,
      marginTop: spacing.sm,
    },
    verseRef: {
      ...typography.meta,
      color: c.inkFaded,
      marginTop: spacing.xs,
    },
  });
}
