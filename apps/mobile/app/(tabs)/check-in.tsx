import { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { alert } from '@/lib/alert';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery } from '@tanstack/react-query';
import { Check } from 'lucide-react-native';
import { Avatar, Card, colors, spacing, typography, radii, gradients, shadows } from '@kairos/ui-native';
import { api } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth';

export default function CheckIn() {
  const user = useAuthStore((s) => s.user);

  const services = useQuery({
    queryKey: ['attendance', 'services', 'upcoming'],
    queryFn: async () => {
      const res = await api.attendance.listServices({ limit: 5 });
      return res.data?.data ?? [];
    },
  });

  const stats = useQuery({
    queryKey: ['analytics', 'member'],
    queryFn: async () => (await api.analytics.memberStats()).data,
    enabled: !!user,
  });

  const nextService = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return (services.data ?? [])
      .filter((s) => new Date(s.serviceDate) >= today)
      .sort(
        (a, b) => new Date(a.serviceDate).getTime() - new Date(b.serviceDate).getTime(),
      )[0];
  }, [services.data]);

  const handleCheckIn = () => {
    alert.info(
      "You're in — almost",
      'Self check-in from mobile needs a backend endpoint that isn\'t shipped yet. In the meantime, see the desk or a leader to be marked in.',
    );
  };

  const displayName = user ? `${user.firstName} ${user.lastName}` : 'Signed in';
  const attendanceTotal = stats.data?.recentAttendance?.total ?? 0;
  const attendancePresent = stats.data?.recentAttendance?.present ?? 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Check-in</Text>
          <Text style={styles.subtitle}>One tap marks you present at the live service.</Text>
        </View>

        <View style={styles.happeningCard}>
          <LinearGradient
            colors={gradients.brandDeep}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.happeningCardBg}
          />
          <View style={styles.happeningContent}>
            <View style={styles.happeningEyebrowRow}>
              <View style={styles.pulseDot} />
              <Text style={styles.happeningEyebrow}>Happening now</Text>
            </View>
            {services.isLoading ? (
              <ActivityIndicator color="#ffffff" style={{ marginTop: spacing.sm }} />
            ) : nextService ? (
              <>
                <Text style={styles.happeningTitle}>{nextService.serviceTitle ?? nextService.serviceType}</Text>
                <Text style={styles.happeningMeta}>
                  {nextService.branchName ?? 'Kharis'} ·{' '}
                  {new Date(nextService.serviceDate).toLocaleDateString('en-GB', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                  })}
                </Text>
                <View style={styles.windowPill}>
                  <Text style={styles.windowLabel}>Check-in window open</Text>
                </View>
              </>
            ) : (
              <>
                <Text style={styles.happeningTitle}>No service scheduled</Text>
                <Text style={styles.happeningMeta}>Check back closer to Sunday.</Text>
              </>
            )}
          </View>
        </View>

        <View style={styles.identityRow}>
          <Avatar
            size="sm"
            photoUrl={user?.photoUrl}
            firstName={user?.firstName}
            lastName={user?.lastName}
          />
          <View style={styles.identityText}>
            <Text style={styles.identityName}>{displayName}</Text>
            <Text style={styles.identityMeta}>Your home branch</Text>
          </View>
        </View>

        <Pressable
          onPress={handleCheckIn}
          disabled={!nextService}
          style={({ pressed }) => [
            styles.checkinPill,
            shadows.buttonHero,
            (!nextService || pressed) && { opacity: 0.9 },
          ]}
        >
          <LinearGradient
            colors={gradients.brand}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.checkinPillBg}
          />
          <Check color="#ffffff" size={20} strokeWidth={2} />
          <Text style={styles.checkinLabel}>I&apos;m here</Text>
        </Pressable>

        <Text style={styles.caption}>Tap once to mark yourself present.</Text>

        <Card padding="md" style={styles.statCard}>
          <Text style={styles.statEyebrow}>Recent attendance</Text>
          <Text style={styles.statNumber}>
            {attendanceTotal === 0
              ? '—'
              : `${attendancePresent} of ${attendanceTotal}`}
          </Text>
          <Text style={styles.statMeta}>
            {attendanceTotal > 0
              ? 'Present at recent services.'
              : 'Nothing recorded yet.'}
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
    gap: spacing.lg,
  },
  header: { paddingTop: spacing.md, gap: 2 },
  title: { ...typography.screenTitle, color: colors.ink },
  subtitle: { ...typography.meta, color: 'rgba(26,28,28,0.55)' },

  happeningCard: {
    borderRadius: radii.lg,
    overflow: 'hidden',
  },
  happeningCardBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  happeningContent: {
    padding: spacing.lg,
    gap: spacing.xs,
  },
  happeningEyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success,
  },
  happeningEyebrow: {
    ...typography.eyebrow,
    color: 'rgba(255,255,255,0.7)',
  },
  happeningTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
  },
  happeningMeta: {
    ...typography.body,
    color: 'rgba(255,255,255,0.75)',
  },
  windowPill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.16)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.pill,
    marginTop: spacing.sm,
  },
  windowLabel: {
    ...typography.meta,
    color: '#ffffff',
    fontWeight: '600',
  },

  identityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  identityText: { gap: 2 },
  identityName: {
    ...typography.cardTitle,
    color: colors.ink,
  },
  identityMeta: {
    ...typography.meta,
    color: 'rgba(26,28,28,0.55)',
  },

  checkinPill: {
    height: 56,
    borderRadius: radii.lg,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  checkinPillBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  checkinLabel: {
    ...typography.button,
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '700',
  },
  caption: {
    ...typography.meta,
    color: 'rgba(26,28,28,0.55)',
    textAlign: 'center',
    marginTop: -spacing.xs,
  },

  statCard: { gap: spacing.xs },
  statEyebrow: { ...typography.eyebrow, color: 'rgba(26,28,28,0.55)' },
  statNumber: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.ink,
  },
  statMeta: { ...typography.meta, color: 'rgba(26,28,28,0.6)' },
});
