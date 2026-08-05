import { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery } from '@tanstack/react-query';
import { Bell } from 'lucide-react-native';
import { Avatar, Card, Badge, colors, spacing, typography, radii, gradients } from '@kairos/ui-native';
import { api } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth';

export default function Home() {
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
            tintColor={colors.primary}
          />
        }
      >
        <View style={styles.greetingRow}>
          <View style={styles.greetingText}>
            <Text style={styles.dateLabel}>{dateHeader}</Text>
            <Text style={styles.greeting}>Good day, {user?.firstName ?? 'friend'}</Text>
          </View>
          <View style={styles.avatarWrap}>
            <Avatar
              size="md"
              photoUrl={user?.photoUrl}
              firstName={user?.firstName}
              lastName={user?.lastName}
              notificationDot
            />
          </View>
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

          <Card padding="md" style={styles.fellowshipCard}>
            <View style={[styles.dutyDot, { backgroundColor: colors.gold }]} />
            <Text style={styles.dutyEyebrow}>FELLOWSHIP</Text>
            <Text style={styles.dutyTitle}>Your K-Group</Text>
            <Text style={styles.dutyMeta}>Wire in Phase 6</Text>
            <Text style={styles.dutySub}>Leader tools coming next</Text>
          </Card>
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

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.pageLight },
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
  dateLabel: { ...typography.meta, color: 'rgba(26,28,28,0.5)' },
  greeting: { ...typography.screenTitle, color: colors.ink },
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
    backgroundColor: colors.gold,
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
    backgroundColor: colors.primary,
  },
  dutyEyebrow: { ...typography.eyebrow, color: 'rgba(26,28,28,0.5)' },
  dutyTitle: { ...typography.cardTitle, color: colors.ink },
  dutyMeta: { ...typography.meta, color: 'rgba(26,28,28,0.6)' },
  dutySub: { ...typography.meta, color: 'rgba(26,28,28,0.5)' },

  verseCard: {
    backgroundColor: colors.cardLight,
    borderRadius: radii.md,
    padding: spacing.lg,
    borderLeftWidth: 3,
    borderLeftColor: colors.gold,
    gap: spacing.xs,
  },
  verseEyebrow: { ...typography.eyebrow, color: colors.goldDark },
  verseText: {
    ...typography.body,
    color: colors.ink,
    fontStyle: 'italic',
    lineHeight: 20,
  },
  verseRef: { ...typography.meta, color: 'rgba(26,28,28,0.55)' },

  announcementCard: { gap: spacing.xs },
  announcementHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  announcementEyebrow: { ...typography.eyebrow, color: 'rgba(26,28,28,0.5)' },
  announcementTitle: { ...typography.cardTitle, color: colors.ink },
  announcementBody: { ...typography.body, color: 'rgba(26,28,28,0.65)' },
});
