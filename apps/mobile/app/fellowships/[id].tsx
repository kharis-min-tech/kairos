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
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, Calendar, Users, Pencil } from 'lucide-react-native';
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

function formatMeetingDate(iso: string | Date): string {
  const d = iso instanceof Date ? iso : new Date(iso);
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

export default function FellowshipDetail() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const id = params.id!;

  const fellowship = useQuery({
    queryKey: ['fellowships', id],
    enabled: !!id,
    queryFn: async () => (await api.fellowships.get(id)).data ?? null,
  });

  const members = useQuery({
    queryKey: ['fellowships', id, 'members'],
    enabled: !!id,
    queryFn: async () => (await api.fellowships.members.list(id)).data ?? [],
  });

  const meetings = useQuery({
    queryKey: ['fellowships', id, 'meetings'],
    enabled: !!id,
    queryFn: async () => (await api.fellowships.meetings.list(id)).data ?? [],
  });

  const refresh = () => {
    fellowship.refetch();
    members.refetch();
    meetings.refetch();
  };

  const f = fellowship.data;
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const upcoming = (meetings.data ?? [])
    .filter((m) => new Date(m.meetingDate) >= startOfToday)
    .sort((a, b) => new Date(a.meetingDate).getTime() - new Date(b.meetingDate).getTime());
  const nextMeeting = upcoming[0] ?? null;
  const recentPast = (meetings.data ?? [])
    .filter((m) => new Date(m.meetingDate) < startOfToday)
    .sort((a, b) => new Date(b.meetingDate).getTime() - new Date(a.meetingDate).getTime())
    .slice(0, 4);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerBar}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ChevronLeft color={colors.ink} size={24} strokeWidth={1.5} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {f?.fellowshipName ?? 'Fellowship'}
        </Text>
        {f ? (
          <Pressable
            onPress={() => router.push(`/fellowships/edit/${f.id}`)}
            hitSlop={8}
            accessibilityLabel="Edit fellowship"
          >
            <Pencil color={colors.primary} size={20} strokeWidth={1.5} />
          </Pressable>
        ) : (
          <View style={{ width: 24 }} />
        )}
      </View>

      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={
              fellowship.isFetching || members.isFetching || meetings.isFetching
            }
            onRefresh={refresh}
            tintColor={colors.primary}
          />
        }
      >
        {fellowship.isLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xxl }} />
        ) : null}

        {fellowship.isError || (!fellowship.isLoading && !f) ? (
          <Card padding="md">
            <Text style={styles.errorLine}>
              {fellowship.error instanceof Error
                ? fellowship.error.message
                : "Couldn't load this fellowship."}
            </Text>
          </Card>
        ) : null}

        {f ? (
          <>
            <LinearGradient
              colors={gradients.brand}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.heroCard}
            >
              <Text style={styles.heroEyebrow}>{f.fellowshipType?.toUpperCase()}</Text>
              <Text style={styles.heroTitle}>{f.fellowshipName}</Text>
              {f.branchName ? <Text style={styles.heroBranch}>{f.branchName}</Text> : null}
              {f.description ? (
                <Text style={styles.heroDescription}>{f.description}</Text>
              ) : null}
              {(f.meetingDay || f.meetingTime) ? (
                <View style={styles.heroMetaRow}>
                  <Calendar color="rgba(255,255,255,0.85)" size={14} strokeWidth={1.5} />
                  <Text style={styles.heroMetaLabel}>
                    {[f.meetingDay, f.meetingTime].filter(Boolean).join(' · ')}
                  </Text>
                </View>
              ) : null}
              {f.leaderFirstName ? (
                <View style={styles.leaderRow}>
                  <Text style={styles.leaderEyebrow}>LEADER</Text>
                  <Text style={styles.leaderName}>
                    {f.leaderFirstName} {f.leaderLastName ?? ''}
                  </Text>
                </View>
              ) : null}
            </LinearGradient>

            {nextMeeting ? (
              <Card padding="md" style={styles.nextCard}>
                <Text style={styles.sectionEyebrow}>NEXT MEETING</Text>
                <Text style={styles.nextDate}>
                  {formatMeetingDate(nextMeeting.meetingDate)}
                </Text>
                {nextMeeting.meetingTitle ? (
                  <Text style={styles.nextTitle}>{nextMeeting.meetingTitle}</Text>
                ) : null}
                {nextMeeting.location ? (
                  <Text style={styles.nextMeta}>{nextMeeting.location}</Text>
                ) : null}
              </Card>
            ) : null}

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionIconTile}>
                  <Users color={colors.primary} size={14} strokeWidth={1.5} />
                </View>
                <Text style={styles.sectionTitle}>Members</Text>
                <Badge
                  label={String(members.data?.length ?? 0)}
                  variant="neutral"
                  size="sm"
                />
              </View>
              {members.isLoading ? (
                <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.sm }} />
              ) : (members.data ?? []).length === 0 ? (
                <Text style={styles.emptyLine}>No members recorded yet.</Text>
              ) : (
                <View style={styles.memberList}>
                  {(members.data ?? []).map((m) => (
                    <Pressable
                      key={m.id}
                      onPress={() => router.push(`/members/${m.memberId}`)}
                      style={styles.memberRow}
                    >
                      <Avatar
                        size="sm"
                        photoUrl={m.memberPhotoUrl ?? undefined}
                        firstName={m.memberFirstName}
                        lastName={m.memberLastName}
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.memberName} numberOfLines={1}>
                          {m.memberFirstName} {m.memberLastName}
                        </Text>
                      </View>
                      {m.nbStage ? (
                        <Badge label={m.nbStage} variant="gold" size="sm" />
                      ) : null}
                    </Pressable>
                  ))}
                </View>
              )}
            </View>

            {recentPast.length > 0 ? (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionIconTile}>
                    <Calendar color={colors.primary} size={14} strokeWidth={1.5} />
                  </View>
                  <Text style={styles.sectionTitle}>Recent meetings</Text>
                </View>
                <View style={styles.meetingList}>
                  {recentPast.map((m) => (
                    <View key={m.id} style={styles.meetingRow}>
                      <View style={styles.meetingDateTile}>
                        <Text style={styles.meetingDateLabel}>
                          {formatMeetingDate(m.meetingDate)}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.meetingTitle} numberOfLines={1}>
                          {m.meetingTitle ?? 'Meeting'}
                        </Text>
                        {m.location ? (
                          <Text style={styles.meetingMeta} numberOfLines={1}>
                            {m.location}
                          </Text>
                        ) : null}
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
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
  headerTitle: { ...typography.cardTitle, color: colors.ink, flex: 1, textAlign: 'center' },
  container: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
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
  heroTitle: { ...typography.screenTitle, color: '#ffffff' },
  heroBranch: { ...typography.meta, color: 'rgba(255,255,255,0.75)' },
  heroDescription: {
    ...typography.body,
    color: 'rgba(255,255,255,0.85)',
    marginTop: spacing.sm,
    lineHeight: 20,
  },
  heroMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  heroMetaLabel: {
    ...typography.body,
    color: 'rgba(255,255,255,0.85)',
  },
  leaderRow: {
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
    marginTop: 2,
  },
  nextCard: {
    gap: spacing.xs,
  },
  sectionEyebrow: {
    ...typography.eyebrow,
    color: 'rgba(26,28,28,0.55)',
  },
  nextDate: {
    ...typography.screenTitle,
    color: colors.ink,
    fontSize: 20,
  },
  nextTitle: {
    ...typography.body,
    color: colors.ink,
    fontWeight: '600',
  },
  nextMeta: {
    ...typography.meta,
    color: 'rgba(26,28,28,0.6)',
  },
  section: { gap: spacing.sm },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sectionIconTile: {
    width: 24,
    height: 24,
    borderRadius: radii.sm,
    backgroundColor: 'rgba(93,63,211,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: { ...typography.cardTitle, color: colors.ink, flex: 1 },
  memberList: { gap: spacing.xs },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.cardLight,
    borderRadius: radii.md,
    padding: spacing.md,
  },
  memberName: { ...typography.body, color: colors.ink },
  emptyLine: {
    ...typography.body,
    color: 'rgba(26,28,28,0.55)',
    padding: spacing.md,
  },
  meetingList: { gap: spacing.xs },
  meetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.cardLight,
    borderRadius: radii.md,
    padding: spacing.md,
  },
  meetingDateTile: {
    minWidth: 60,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.sm,
    backgroundColor: 'rgba(93,63,211,0.1)',
    alignItems: 'center',
  },
  meetingDateLabel: {
    ...typography.meta,
    color: colors.primary,
    fontWeight: '700',
  },
  meetingTitle: { ...typography.body, color: colors.ink, fontWeight: '500' },
  meetingMeta: { ...typography.meta, color: 'rgba(26,28,28,0.6)' },
  errorLine: {
    ...typography.body,
    color: colors.danger,
  },
});
