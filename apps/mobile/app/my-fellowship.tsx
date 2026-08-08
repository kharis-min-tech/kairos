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
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, Calendar, MapPin, Users, UsersRound } from 'lucide-react-native';
import {
  Avatar,
  Badge,
  Card,
  colors,
  gradients,
  radii,
  spacing,
  typography,
} from '@kairos/ui-native';
import { api } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth';

export default function MyFellowship() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const memberId = user?.id;

  const list = useQuery({
    queryKey: ['my-fellowships', memberId],
    enabled: !!memberId,
    queryFn: async () => {
      const res = await api.fellowships.list({ memberId, limit: 20 });
      return res.data?.data ?? [];
    },
  });

  const fellowships = list.data ?? [];
  const [activeId, setActiveId] = useState<string | null>(null);
  const active = fellowships.find((f) => f.id === activeId) ?? fellowships[0] ?? null;

  const members = useQuery({
    queryKey: ['fellowship-members', active?.id],
    enabled: !!active?.id,
    queryFn: async () => (await api.fellowships.members.list(active!.id)).data ?? [],
  });

  const meetings = useQuery({
    queryKey: ['fellowship-meetings', active?.id],
    enabled: !!active?.id,
    queryFn: async () => (await api.fellowships.meetings.list(active!.id)).data ?? [],
  });

  const sortedMeetings = useMemo(
    () =>
      (meetings.data ?? [])
        .slice()
        .sort((a, b) => new Date(b.meetingDate).getTime() - new Date(a.meetingDate).getTime()),
    [meetings.data],
  );
  const [nextMeeting, ...pastMeetings] = sortedMeetings.filter((m) => {
    return new Date(m.meetingDate).getTime() >= Date.now() - 24 * 60 * 60 * 1000;
  });
  const recentPast = pastMeetings.length > 0
    ? pastMeetings.slice(0, 4)
    : sortedMeetings.slice(0, 4);

  const refresh = () => {
    list.refetch();
    members.refetch();
    meetings.refetch();
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerBar}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ChevronLeft color={colors.ink} size={24} strokeWidth={1.5} />
        </Pressable>
        <Text style={styles.headerTitle}>My fellowship</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={list.isFetching || members.isFetching || meetings.isFetching}
            onRefresh={refresh}
            tintColor={colors.primary}
          />
        }
      >
        {list.isLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xxl }} />
        ) : null}

        {!list.isLoading && fellowships.length === 0 ? (
          <EmptyState />
        ) : null}

        {fellowships.length > 1 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsRow}
          >
            {fellowships.map((f) => {
              const isActive = (active?.id ?? fellowships[0]?.id) === f.id;
              return (
                <Pressable
                  key={f.id}
                  onPress={() => setActiveId(f.id)}
                  style={[styles.chip, isActive && styles.chipActive]}
                >
                  <Text style={[styles.chipLabel, isActive && styles.chipLabelActive]}>
                    {f.fellowshipName}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        ) : null}

        {active ? (
          <>
            <LinearGradient
              colors={gradients.brand}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.heroCard}
            >
              <Text style={styles.heroEyebrow}>
                {active.fellowshipType.toUpperCase()}
              </Text>
              <Text style={styles.heroTitle}>{active.fellowshipName}</Text>
              {active.branchName ? (
                <Text style={styles.heroBranch}>{active.branchName}</Text>
              ) : null}

              <View style={styles.heroMetaRow}>
                {active.meetingDay || active.meetingTime ? (
                  <View style={styles.heroMetaItem}>
                    <Calendar color="rgba(255,255,255,0.85)" size={14} strokeWidth={1.5} />
                    <Text style={styles.heroMetaText}>
                      {[active.meetingDay, active.meetingTime].filter(Boolean).join(' · ')}
                    </Text>
                  </View>
                ) : null}
                {active.meetingSchedule ? (
                  <View style={styles.heroMetaItem}>
                    <MapPin color="rgba(255,255,255,0.85)" size={14} strokeWidth={1.5} />
                    <Text style={styles.heroMetaText}>{active.meetingSchedule}</Text>
                  </View>
                ) : null}
              </View>

              {active.leaderFirstName ? (
                <View style={styles.leaderRow}>
                  <Avatar
                    size="sm"
                    firstName={active.leaderFirstName ?? undefined}
                    lastName={active.leaderLastName ?? undefined}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.leaderEyebrow}>LEADER</Text>
                    <Text style={styles.leaderName}>
                      {active.leaderFirstName} {active.leaderLastName ?? ''}
                    </Text>
                  </View>
                </View>
              ) : null}
            </LinearGradient>

            {nextMeeting ? (
              <Card padding="md" style={styles.section}>
                <Text style={styles.sectionEyebrow}>NEXT MEETING</Text>
                <Text style={styles.sectionTitle}>
                  {nextMeeting.meetingTitle ?? 'Fellowship meeting'}
                </Text>
                <Text style={styles.sectionMeta}>
                  {new Date(nextMeeting.meetingDate).toLocaleDateString(undefined, {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                  })}
                </Text>
                {nextMeeting.location ? (
                  <Text style={styles.sectionMeta}>{nextMeeting.location}</Text>
                ) : null}
              </Card>
            ) : null}

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionIconTile}>
                  <UsersRound color={colors.primary} size={16} strokeWidth={1.5} />
                </View>
                <Text style={styles.sectionHeaderText}>
                  Members
                </Text>
                <Badge label={String(members.data?.length ?? 0)} variant="neutral" size="sm" />
              </View>
              {members.isLoading ? (
                <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.md }} />
              ) : (members.data ?? []).length === 0 ? (
                <Text style={styles.emptyLine}>No members recorded yet.</Text>
              ) : (
                <View style={styles.memberList}>
                  {(members.data ?? []).map((m) => (
                    <View key={m.id} style={styles.memberRow}>
                      <Avatar
                        size="sm"
                        photoUrl={m.memberPhotoUrl ?? undefined}
                        firstName={m.memberFirstName}
                        lastName={m.memberLastName}
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.memberName}>
                          {m.memberFirstName} {m.memberLastName}
                        </Text>
                        {m.nbStage ? (
                          <Text style={styles.memberMeta}>New Believer · {m.nbStage}</Text>
                        ) : null}
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {recentPast.length > 0 ? (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionIconTile}>
                    <Calendar color={colors.primary} size={16} strokeWidth={1.5} />
                  </View>
                  <Text style={styles.sectionHeaderText}>Recent meetings</Text>
                </View>
                {recentPast.map((m) => (
                  <View key={m.id} style={styles.meetingRow}>
                    <Text style={styles.meetingDate}>
                      {new Date(m.meetingDate).toLocaleDateString(undefined, {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </Text>
                    <Text style={styles.meetingTitle}>
                      {m.meetingTitle ?? 'Fellowship meeting'}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function EmptyState() {
  return (
    <Card padding="md" style={styles.emptyCard}>
      <View style={styles.emptyIconTile}>
        <Users color={colors.primary} size={22} strokeWidth={1.5} />
      </View>
      <Text style={styles.emptyTitle}>You&apos;re not in a fellowship yet</Text>
      <Text style={styles.emptyMeta}>
        Ask your pastor or branch admin to add you to a K-Group or fellowship.
        Once added, your fellowship details, members, and upcoming meetings show
        up here.
      </Text>
    </Card>
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
  chipsRow: {
    gap: spacing.sm,
    paddingRight: spacing.lg,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    backgroundColor: colors.subtleLight,
  },
  chipActive: { backgroundColor: colors.primary },
  chipLabel: { ...typography.meta, color: colors.ink, fontWeight: '500' },
  chipLabelActive: { color: '#ffffff' },
  heroCard: {
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  heroEyebrow: {
    ...typography.eyebrow,
    color: colors.gold,
    letterSpacing: 1.2,
  },
  heroTitle: {
    ...typography.screenTitle,
    color: '#ffffff',
  },
  heroBranch: {
    ...typography.meta,
    color: 'rgba(255,255,255,0.75)',
  },
  heroMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  heroMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  heroMetaText: {
    ...typography.meta,
    color: 'rgba(255,255,255,0.85)',
  },
  leaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.2)',
  },
  leaderEyebrow: {
    ...typography.eyebrow,
    color: 'rgba(255,255,255,0.7)',
  },
  leaderName: {
    ...typography.body,
    color: '#ffffff',
    fontWeight: '600',
  },
  section: {
    gap: spacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sectionIconTile: {
    width: 28,
    height: 28,
    borderRadius: radii.sm,
    backgroundColor: 'rgba(93,63,211,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeaderText: {
    ...typography.cardTitle,
    color: colors.ink,
    flex: 1,
  },
  sectionEyebrow: {
    ...typography.eyebrow,
    color: 'rgba(26,28,28,0.55)',
  },
  sectionTitle: {
    ...typography.cardTitle,
    color: colors.ink,
  },
  sectionMeta: {
    ...typography.body,
    color: 'rgba(26,28,28,0.7)',
  },
  memberList: {
    gap: spacing.xs,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.cardLight,
    borderRadius: radii.md,
    padding: spacing.md,
  },
  memberName: { ...typography.body, color: colors.ink },
  memberMeta: { ...typography.meta, color: 'rgba(26,28,28,0.55)' },
  meetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.cardLight,
    borderRadius: radii.md,
    padding: spacing.md,
  },
  meetingDate: {
    ...typography.meta,
    color: colors.primary,
    fontWeight: '600',
    width: 56,
  },
  meetingTitle: {
    ...typography.body,
    color: colors.ink,
    flex: 1,
  },
  emptyLine: {
    ...typography.body,
    color: 'rgba(26,28,28,0.55)',
    padding: spacing.md,
  },
  emptyCard: {
    alignItems: 'center',
    gap: spacing.md,
  },
  emptyIconTile: {
    width: 56,
    height: 56,
    borderRadius: radii.lg,
    backgroundColor: 'rgba(93,63,211,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: { ...typography.cardTitle, color: colors.ink },
  emptyMeta: {
    ...typography.body,
    color: 'rgba(26,28,28,0.6)',
    textAlign: 'center',
    lineHeight: 20,
  },
});
