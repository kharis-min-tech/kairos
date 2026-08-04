import { useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft } from 'lucide-react-native';
import { Card, Badge, Button, colors, spacing, typography, radii, gradients } from '@kairos/ui-native';
import { api } from '@/lib/api-client';

export default function MyRota() {
  const router = useRouter();

  const rota = useQuery({
    queryKey: ['me', 'rota', 'all'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0]!;
      const in180 = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0]!;
      const res = await api.me.rota({ from: today, to: in180 });
      return res.data ?? [];
    },
  });

  const sorted = useMemo(
    () =>
      (rota.data ?? []).slice().sort(
        (a, b) => new Date(a.serviceDate).getTime() - new Date(b.serviceDate).getTime(),
      ),
    [rota.data],
  );

  const [next, ...upcoming] = sorted;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerBar}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ChevronLeft color={colors.ink} size={24} strokeWidth={1.5} />
        </Pressable>
        <Text style={styles.headerTitle}>My rota</Text>
        <View style={{ width: 24 }} />
      </View>

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
        {rota.isLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xxl }} />
        ) : null}

        {next ? (
          <View style={styles.heroCard}>
            <LinearGradient
              colors={gradients.brandDeep}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.heroBg}
            />
            <View style={styles.heroContent}>
              <Text style={styles.heroEyebrow}>Next duty · {relativeLabel(next.serviceDate)}</Text>
              <Text style={styles.heroDate}>{longDate(next.serviceDate)}</Text>
              <View style={styles.heroFieldRow}>
                <HeroField label="Role" value={next.slotRoleName} />
                <HeroField label="Time" value={next.startTime ?? '—'} />
                <HeroField label="Status" value={next.status} />
              </View>
              <View style={styles.heroActions}>
                <Button
                  label="Confirm"
                  size="sm"
                  variant="secondary"
                  onPress={() =>
                    Alert.alert('Confirm duty', 'Confirm/swap flow lands with the backend endpoint.')
                  }
                  style={styles.heroButton}
                />
                <Button
                  label="Request swap"
                  size="sm"
                  variant="outline"
                  onPress={() =>
                    Alert.alert('Swap', 'Swap-request flow lands in a follow-up.')
                  }
                  style={styles.heroButton}
                />
              </View>
            </View>
          </View>
        ) : (
          !rota.isLoading && (
            <Card padding="lg" style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No upcoming duties</Text>
              <Text style={styles.emptyMeta}>
                Nothing scheduled in the next 180 days.
              </Text>
            </Card>
          )
        )}

        {upcoming.length ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Upcoming</Text>
            <View style={styles.upcomingList}>
              {upcoming.map((d) => (
                <Card key={d.assignmentId} padding="md" style={styles.dutyCard}>
                  <View style={styles.dateTile}>
                    <Text style={styles.dateTileMonth}>{shortMonth(d.serviceDate)}</Text>
                    <Text style={styles.dateTileDay}>{dayOfMonth(d.serviceDate)}</Text>
                  </View>
                  <View style={styles.dutyText}>
                    <Text style={styles.dutyTitle}>{d.slotRoleName}</Text>
                    <Text style={styles.dutyMeta}>
                      {d.templateName}
                      {d.startTime ? ` · ${d.startTime}` : ''}
                    </Text>
                  </View>
                  <Badge label={d.status} variant={badgeVariant(d.status)} size="sm" />
                </Card>
              ))}
            </View>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function HeroField({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.heroField}>
      <Text style={styles.heroFieldLabel}>{label}</Text>
      <Text style={styles.heroFieldValue}>{value}</Text>
    </View>
  );
}

function longDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}
function shortMonth(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { month: 'short' }).toUpperCase();
}
function dayOfMonth(iso: string): string {
  return String(new Date(iso).getDate());
}
function relativeLabel(iso: string): string {
  const days = Math.round((new Date(iso).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (days <= 0) return 'today';
  if (days === 1) return 'tomorrow';
  return `in ${days} days`;
}
function badgeVariant(status: string): 'primary' | 'success' | 'gold' | 'neutral' {
  const s = status.toLowerCase();
  if (s.includes('confirm')) return 'success';
  if (s.includes('pending')) return 'gold';
  if (s.includes('assigned')) return 'primary';
  return 'neutral';
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
  heroCard: {
    borderRadius: radii.lg,
    overflow: 'hidden',
  },
  heroBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  heroContent: {
    padding: spacing.lg,
    gap: spacing.sm,
  },
  heroEyebrow: {
    ...typography.eyebrow,
    color: 'rgba(255,255,255,0.7)',
  },
  heroDate: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
  },
  heroFieldRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  heroField: { gap: 2 },
  heroFieldLabel: {
    ...typography.eyebrow,
    color: 'rgba(255,255,255,0.5)',
  },
  heroFieldValue: {
    ...typography.body,
    color: '#ffffff',
    fontWeight: '600',
  },
  heroActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  heroButton: { flex: 1, backgroundColor: 'rgba(255,255,255,0.14)' },

  emptyCard: { alignItems: 'center', gap: spacing.xs },
  emptyTitle: { ...typography.cardTitle, color: colors.ink },
  emptyMeta: { ...typography.meta, color: 'rgba(26,28,28,0.55)' },

  section: { gap: spacing.sm },
  sectionTitle: { ...typography.eyebrow, color: 'rgba(26,28,28,0.55)' },
  upcomingList: { gap: spacing.sm },
  dutyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  dateTile: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    backgroundColor: 'rgba(93,63,211,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateTileMonth: {
    fontSize: 8,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 0.8,
  },
  dateTileDay: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
    lineHeight: 20,
  },
  dutyText: { flex: 1, gap: 2 },
  dutyTitle: { ...typography.cardTitle, color: colors.ink },
  dutyMeta: { ...typography.meta, color: 'rgba(26,28,28,0.6)' },
});
