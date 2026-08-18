import { useState } from 'react';
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
import { ChevronLeft, UserX } from 'lucide-react-native';
import { Card, colors, radii, spacing, typography } from '@kairos/ui-native';
import { api } from '@/lib/api-client';

const WINDOW_CHOICES = [3, 4, 6, 8, 12] as const;
type WindowChoice = (typeof WINDOW_CHOICES)[number];

export default function MissingMembersFullList() {
  const router = useRouter();
  const [services, setServices] = useState<WindowChoice>(3);

  const rows = useQuery({
    queryKey: ['attendance', 'reports', 'missing-members', 'full', services],
    queryFn: async () =>
      (await api.attendance.missingMembers({ services })).data ?? [],
  });

  const data = rows.data ?? [];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerBar}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ChevronLeft color={colors.ink} size={24} strokeWidth={1.5} />
        </Pressable>
        <Text style={styles.headerTitle}>Not seen recently</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.filterRow}>
        <Text style={styles.filterLabel}>Missing across the last</Text>
        <View style={styles.chipRow}>
          {WINDOW_CHOICES.map((n) => {
            const active = n === services;
            return (
              <Pressable
                key={n}
                onPress={() => setServices(n)}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>
                  {n} services
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={rows.isFetching}
            onRefresh={() => rows.refetch()}
            tintColor={colors.primary}
          />
        }
      >
        {rows.isLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xxl }} />
        ) : data.length === 0 ? (
          <Card padding="lg" style={styles.empty}>
            <View style={styles.emptyIcon}>
              <UserX color={colors.primary} size={22} strokeWidth={1.5} />
            </View>
            <Text style={styles.emptyTitle}>All accounted for</Text>
            <Text style={styles.emptyMeta}>
              Everyone attended in the last {services} services.
            </Text>
          </Card>
        ) : (
          <>
            <Text style={styles.countLabel}>
              {data.length} member{data.length === 1 ? '' : 's'} · sorted by streak
            </Text>
            {data.map((m, idx) => (
              <Pressable
                key={m.memberId}
                onPress={() => router.push(`/members/${m.memberId}` as never)}
              >
                <Card padding="md" style={styles.row}>
                  <View style={styles.rank}>
                    <Text style={styles.rankNum}>{idx + 1}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name}>
                      {m.firstName} {m.lastName}
                    </Text>
                    <Text style={styles.meta}>
                      {m.missedStreak === 1
                        ? 'missed the last service'
                        : `missed ${m.missedStreak} in a row`}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.streakPill,
                      m.missedStreak >= 3 ? styles.streakPillHot : null,
                    ]}
                  >
                    <Text
                      style={[
                        styles.streakLabel,
                        m.missedStreak >= 3 ? styles.streakLabelHot : null,
                      ]}
                    >
                      {m.missedStreak}
                    </Text>
                  </View>
                </Card>
              </Pressable>
            ))}
          </>
        )}
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
  headerTitle: { ...typography.cardTitle, color: colors.ink },
  filterRow: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.xs,
  },
  filterLabel: { ...typography.eyebrow, color: 'rgba(26,28,28,0.55)' },
  chipRow: { flexDirection: 'row', gap: spacing.xs, flexWrap: 'wrap' },
  chip: {
    paddingHorizontal: spacing.md,
    height: 32,
    justifyContent: 'center',
    borderRadius: radii.pill,
    backgroundColor: colors.subtleLight,
  },
  chipActive: { backgroundColor: colors.primary },
  chipLabel: { ...typography.meta, color: colors.ink, fontWeight: '600' },
  chipLabelActive: { color: '#ffffff' },
  container: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.sm,
  },
  countLabel: {
    ...typography.meta,
    color: 'rgba(26,28,28,0.6)',
    paddingHorizontal: spacing.xs,
    marginBottom: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  rank: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(26,28,28,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankNum: { fontSize: 11, fontWeight: '700', color: 'rgba(26,28,28,0.6)' },
  name: { ...typography.body, color: colors.ink, fontWeight: '600' },
  meta: { ...typography.meta, color: 'rgba(26,28,28,0.6)' },
  streakPill: {
    minWidth: 36,
    height: 28,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(26,28,28,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  streakPillHot: { backgroundColor: colors.danger },
  streakLabel: { fontSize: 13, fontWeight: '700', color: colors.ink },
  streakLabelHot: { color: '#ffffff' },
  empty: { alignItems: 'center', gap: spacing.xs },
  emptyIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(93,63,211,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  emptyTitle: { ...typography.cardTitle, color: colors.ink },
  emptyMeta: {
    ...typography.body,
    color: 'rgba(26,28,28,0.6)',
    textAlign: 'center',
  },
});
