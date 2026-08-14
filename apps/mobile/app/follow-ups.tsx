import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  FlatList,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { Avatar, Badge, colors, spacing, typography, radii } from '@kairos/ui-native';
import { formatShortDate } from '@kairos/core';
import { api } from '@/lib/api-client';

// SoulStatus values are capitalized-with-spaces per the API enum
// (`New` / `Following Up` / `Interested` / `Converted`). Do NOT lowercase or
// snake_case them — the server filters strictly on this shape.
const STATUSES = ['New', 'Following Up', 'Interested', 'Converted'] as const;
type Status = (typeof STATUSES)[number];

const STATUS_VARIANT: Record<Status, 'primary' | 'gold' | 'info' | 'success'> = {
  New: 'primary',
  'Following Up': 'gold',
  Interested: 'info',
  Converted: 'success',
};

export default function FollowUps() {
  const router = useRouter();
  const [activeStatus, setActiveStatus] = useState<Status | 'All'>('All');

  const list = useQuery({
    queryKey: ['souls', 'follow-ups', activeStatus],
    queryFn: async () => {
      const params: { status?: Status; limit: number } = { limit: 100 };
      if (activeStatus !== 'All') params.status = activeStatus;
      const res = await api.souls.list(params);
      return res.data?.data ?? [];
    },
  });

  const rows = (list.data ?? []) as {
    id: string;
    firstName: string;
    lastName: string;
    status: Status;
    createdAt: string | Date;
  }[];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerBar}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ChevronLeft color={colors.ink} size={24} strokeWidth={1.5} />
        </Pressable>
        <Text style={styles.headerTitle}>Follow-ups</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.subHeader}>
        <Text style={styles.subTitle}>Souls pipeline</Text>
        <Text style={styles.subMeta}>Tap a soul to update their status.</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsRow}
      >
        <FilterChip
          label="All"
          active={activeStatus === 'All'}
          onPress={() => setActiveStatus('All')}
        />
        {STATUSES.map((s) => (
          <FilterChip
            key={s}
            label={s}
            active={activeStatus === s}
            onPress={() => setActiveStatus(s)}
          />
        ))}
      </ScrollView>

      <FlatList
        data={rows}
        keyExtractor={(r) => r.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={list.isFetching}
            onRefresh={() => list.refetch()}
            tintColor={colors.primary}
          />
        }
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        ListEmptyComponent={
          list.isLoading ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />
          ) : (
            <Text style={styles.emptyText}>
              {activeStatus === 'All'
                ? 'No souls in the pipeline yet.'
                : `No souls in “${activeStatus}” yet.`}
            </Text>
          )
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push(`/souls/${item.id}`)}
            style={styles.row}
          >
            <Avatar size="sm" firstName={item.firstName} lastName={item.lastName} />
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>
                {item.firstName} {item.lastName}
              </Text>
              <Text style={styles.rowMeta}>
                Captured {formatShortDate(item.createdAt as string)}
              </Text>
            </View>
            <Badge
              label={item.status}
              variant={STATUS_VARIANT[item.status] ?? 'neutral'}
              size="sm"
            />
            <ChevronRight color="rgba(26,28,28,0.3)" size={16} strokeWidth={1.5} />
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}

function FilterChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, active && styles.chipActive]}
    >
      <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>{label}</Text>
    </Pressable>
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
  subHeader: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    gap: 2,
  },
  subTitle: { ...typography.screenTitle, color: colors.ink },
  subMeta: { ...typography.meta, color: 'rgba(26,28,28,0.55)' },
  chipsRow: {
    paddingHorizontal: spacing.lg,
    gap: spacing.xs,
    paddingBottom: spacing.md,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.pill,
    backgroundColor: colors.subtleLight,
  },
  chipActive: { backgroundColor: colors.primary },
  chipLabel: {
    ...typography.meta,
    color: colors.ink,
    fontWeight: '600',
  },
  chipLabelActive: { color: '#ffffff' },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.cardLight,
    borderRadius: radii.md,
    padding: spacing.md,
  },
  rowText: { flex: 1, gap: 2 },
  rowTitle: { ...typography.body, color: colors.ink, fontWeight: '600' },
  rowMeta: { ...typography.meta, color: 'rgba(26,28,28,0.55)' },
  emptyText: {
    ...typography.body,
    color: 'rgba(26,28,28,0.5)',
    textAlign: 'center',
    marginTop: spacing.xl,
  },
});
