import { useEffect, useMemo } from 'react';
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
import { ChevronLeft, ChevronRight, UsersRound, ClipboardList } from 'lucide-react-native';
import {
  Card,
  radii,
  spacing,
  typography,
  useThemedStyles,
  type ThemeColors,
  useColors,
} from '@kairos/ui-native';
import { api } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth';

export default function RollcallLanding() {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const memberId = user?.id;

  const fellowships = useQuery({
    queryKey: ['fellowships', 'mine', memberId],
    enabled: !!memberId,
    queryFn: async () => {
      const res = await api.fellowships.list({ memberId: memberId!, limit: 20 });
      return res.data?.data ?? [];
    },
  });

  const rows = useMemo(() => fellowships.data ?? [], [fellowships.data]);

  // Single-fellowship users skip straight to the meeting picker.
  useEffect(() => {
    if (rows.length === 1) {
      router.replace(`/rollcall/${rows[0]!.id}`);
    }
  }, [rows, router]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerBar}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ChevronLeft color={c.ink} size={24} strokeWidth={1.5} />
        </Pressable>
        <Text style={styles.headerTitle}>Fellowship attendance</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={fellowships.isFetching}
            onRefresh={() => fellowships.refetch()}
            tintColor={c.primary}
          />
        }
      >
        <View style={styles.introBlock}>
          <Text style={styles.introTitle}>Take rollcall</Text>
          <Text style={styles.introMeta}>
            Pick a fellowship, then mark attendance for its next meeting.
          </Text>
        </View>

        {fellowships.isLoading ? (
          <ActivityIndicator color={c.primary} style={{ marginVertical: spacing.xl }} />
        ) : null}

        {!fellowships.isLoading && rows.length === 0 ? (
          <Card padding="md" style={styles.emptyCard}>
            <View style={styles.emptyIconTile}>
              <ClipboardList color={c.primary} size={22} strokeWidth={1.5} />
            </View>
            <Text style={styles.emptyTitle}>No fellowships to lead</Text>
            <Text style={styles.emptyMeta}>
              Fellowship attendance becomes available once you&apos;re assigned to a fellowship. Leaders
              and members alike can record attendance for their group.
            </Text>
          </Card>
        ) : null}

        {rows.length > 1 ? (
          <View style={styles.list}>
            {rows.map((f) => (
              <Pressable key={f.id} onPress={() => router.push(`/rollcall/${f.id}`)}>
                <Card padding="md" style={styles.rowCard}>
                  <View style={styles.iconTile}>
                    <UsersRound color={c.primary} size={18} strokeWidth={1.5} />
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={styles.rowTitle} numberOfLines={1}>
                      {f.fellowshipName}
                    </Text>
                    {f.branchName ? (
                      <Text style={styles.rowMeta} numberOfLines={1}>
                        {f.branchName}
                      </Text>
                    ) : null}
                  </View>
                  <ChevronRight color={c.inkVeryFaded} size={18} strokeWidth={1.5} />
                </Card>
              </Pressable>
            ))}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.page },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  headerTitle: { ...typography.cardTitle, color: c.ink },
  container: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  introBlock: { gap: 2 },
  introTitle: { ...typography.screenTitle, color: c.ink },
  introMeta: { ...typography.meta, color: c.inkMuted },
  list: { gap: spacing.sm },
  rowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  iconTile: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    backgroundColor: 'rgba(93,63,211,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitle: { ...typography.body, color: c.ink, fontWeight: '600' },
  rowMeta: { ...typography.meta, color: c.inkMuted },
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
  emptyTitle: { ...typography.cardTitle, color: c.ink },
  emptyMeta: {
    ...typography.body,
    color: c.inkMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
});
}

