import { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Bell } from 'lucide-react-native';
import {
  Avatar,
  Card,
  Badge,
  spacing,
  typography,
  radii,
  gradients,
  useThemedStyles,
  type ThemeColors,
  useColors,
} from '@kairos/ui-native';
import { api } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth';

export default function Home() {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const rota = useQuery({
    queryKey: ['me', 'rota', 'next'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0]!;
      const in90 = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]!;
      const res = await api.me.rota({ from: today, to: in90 });
      return res.data ?? [];
    },
    enabled: !!user,
  });

  const myFellowship = useQuery({
    queryKey: ['home', 'my-fellowship', user?.id],
    queryFn: async () => {
      const res = await api.fellowships.list({ memberId: user!.id, limit: 1 });
      return res.data?.data?.[0] ?? null;
    },
    enabled: !!user?.id,
  });

  const dateHeader = useMemo(() => {
    const d = new Date();
    return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
  }, []);

  const nextDuty = rota.data?.[0] ?? null;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={rota.isFetching}
            onRefresh={() => rota.refetch()}
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
            style={styles.avatarWrap}
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

        <View style={styles.serviceCard}>
          <LinearGradient
            colors={gradients.brandDeep}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.serviceCardBg}
          />
          <View style={styles.serviceContent}>
            <Text style={styles.serviceEyebrow}>Upcoming service</Text>
            <Text style={styles.serviceTitle}>Sunday Service</Text>
            <Text style={styles.serviceMeta}>
              Kharis {user?.homeBranchId ? '· Home branch' : ''}
            </Text>
            <View style={styles.serviceFooter}>
              <View style={styles.pastorRow}>
                <View style={styles.goldAvatar}>
                  <Text style={styles.goldAvatarInitials}>DA</Text>
                </View>
                <Text style={styles.pastorName}>Rev Dr David Antwi</Text>
              </View>
              <View style={styles.remindPill}>
                <Bell color="#ffffff" size={12} strokeWidth={1.5} />
                <Text style={styles.remindLabel}>Remind me</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.dutyRow}>
          <Card padding="md" style={styles.dutyCard}>
            <View style={styles.dutyDot} />
            <Text style={styles.dutyEyebrow}>NEXT ROTA</Text>
            {nextDuty ? (
              <>
                <Text style={styles.dutyTitle}>{nextDuty.templateName}</Text>
                <Text style={styles.dutyMeta}>
                  {new Date(nextDuty.serviceDate).toLocaleDateString('en-GB', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                  })}
                  {nextDuty.startTime ? ` · ${nextDuty.startTime}` : ''}
                </Text>
                <Text style={styles.dutySub}>{nextDuty.slotRoleName}</Text>
              </>
            ) : (
              <>
                <Text style={styles.dutyTitle}>No duty yet</Text>
                <Text style={styles.dutyMeta}>Nothing scheduled in the next 90 days.</Text>
              </>
            )}
          </Card>

          <Pressable
            style={{ flex: 1 }}
            onPress={() => router.push('/my-fellowship')}
          >
            <Card padding="md" style={styles.fellowshipCard}>
              <View style={[styles.dutyDot, { backgroundColor: c.gold }]} />
              <Text style={styles.dutyEyebrow}>FELLOWSHIP</Text>
              {myFellowship.data ? (
                <>
                  <Text style={styles.dutyTitle}>{myFellowship.data.fellowshipName}</Text>
                  <Text style={styles.dutyMeta}>
                    {[myFellowship.data.meetingDay, myFellowship.data.meetingTime]
                      .filter(Boolean)
                      .join(' · ') || myFellowship.data.fellowshipType}
                  </Text>
                  <Text style={styles.dutySub}>Tap to view members</Text>
                </>
              ) : (
                <>
                  <Text style={styles.dutyTitle}>No fellowship yet</Text>
                  <Text style={styles.dutyMeta}>Ask your pastor to add you</Text>
                  <Text style={styles.dutySub}>Tap for details</Text>
                </>
              )}
            </Card>
          </Pressable>
        </View>

        <View style={styles.verseCard}>
          <Text style={styles.verseEyebrow}>Daily verse</Text>
          <Text style={styles.verseText}>
            &ldquo;Be still, and know that I am God.&rdquo;
          </Text>
          <Text style={styles.verseRef}>— Psalm 46:10</Text>
        </View>

        <Card padding="md" style={styles.announcementCard}>
          <View style={styles.announcementHeader}>
            <Text style={styles.announcementEyebrow}>Announcement</Text>
            <Badge label="Pastoral" variant="gold" size="sm" />
          </View>
          <Text style={styles.announcementTitle}>Welcome to Kairos Mobile</Text>
          <Text style={styles.announcementBody}>
            More live announcements land once the announcements API is wired.
          </Text>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.page },
  container: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },

  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
  },
  greetingText: { flex: 1, gap: 2 },
  dateLabel: { ...typography.meta, color: c.inkFaded },
  greeting: { ...typography.screenTitle, color: c.ink },
  avatarWrap: {},

  serviceCard: {
    borderRadius: radii.lg,
    overflow: 'hidden',
    marginTop: spacing.sm,
  },
  serviceCardBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  serviceContent: {
    padding: spacing.lg,
    gap: spacing.xs,
  },
  serviceEyebrow: {
    ...typography.eyebrow,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: spacing.xs,
  },
  serviceTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
  },
  serviceMeta: { ...typography.body, color: 'rgba(255,255,255,0.75)' },
  serviceFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
  },
  pastorRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  goldAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: c.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goldAvatarInitials: {
    fontSize: 10,
    fontWeight: '700',
    color: '#1a1c1c',
  },
  pastorName: { ...typography.meta, color: '#ffffff', fontWeight: '600' },
  remindPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.16)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.pill,
  },
  remindLabel: { ...typography.meta, color: '#ffffff', fontWeight: '600' },

  dutyRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  dutyCard: { flex: 1, gap: spacing.xs },
  fellowshipCard: { flex: 1, gap: spacing.xs },
  dutyDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: c.primary,
  },
  dutyEyebrow: { ...typography.eyebrow, color: c.inkFaded },
  dutyTitle: { ...typography.cardTitle, color: c.ink },
  dutyMeta: { ...typography.meta, color: c.inkMuted },
  dutySub: { ...typography.meta, color: c.inkFaded },

  verseCard: {
    backgroundColor: c.card,
    borderRadius: radii.md,
    padding: spacing.lg,
    borderLeftWidth: 3,
    borderLeftColor: c.gold,
    gap: spacing.xs,
  },
  verseEyebrow: { ...typography.eyebrow, color: c.goldDark },
  verseText: {
    ...typography.body,
    color: c.ink,
    fontStyle: 'italic',
    lineHeight: 20,
  },
  verseRef: { ...typography.meta, color: c.inkMuted },

  announcementCard: { gap: spacing.xs },
  announcementHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  announcementEyebrow: { ...typography.eyebrow, color: c.inkFaded },
  announcementTitle: { ...typography.cardTitle, color: c.ink },
  announcementBody: { ...typography.body, color: c.inkMuted },
});
}

