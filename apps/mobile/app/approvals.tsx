import { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, UserPlus, UsersRound, Building2 } from 'lucide-react-native';
import {
  Badge,
  spacing,
  typography,
  radii,
  useThemedStyles,
  type ThemeColors,
  useColors,
} from '@kairos/ui-native';
import { formatShortDate } from '@kairos/core';
import type { MeApprovalItem } from '@kairos/types';
import { api } from '@/lib/api-client';

type FilterKind = 'all' | 'member_signup' | 'fellowship_join' | 'department_join';

const KIND_META: Record<
  MeApprovalItem['kind'],
  { label: string; icon: typeof UserPlus; variant: 'primary' | 'gold' | 'info' }
> = {
  member_signup: { label: 'Member signup', icon: UserPlus, variant: 'primary' },
  fellowship_join: { label: 'Fellowship request', icon: UsersRound, variant: 'gold' },
  department_join: { label: 'Department request', icon: Building2, variant: 'info' },
};

const FILTERS: { key: FilterKind; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'member_signup', label: 'Signups' },
  { key: 'fellowship_join', label: 'Fellowships' },
  { key: 'department_join', label: 'Departments' },
];

export default function Approvals() {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  const router = useRouter();
  const [filter, setFilter] = useState<FilterKind>('all');

  const inbox = useQuery({
    queryKey: ['me', 'approvals'],
    queryFn: async () => (await api.me.approvals()).data ?? [],
  });

  const rows = useMemo(() => {
    const all = inbox.data ?? [];
    if (filter === 'all') return all;
    return all.filter((i) => i.kind === filter);
  }, [inbox.data, filter]);

  function handlePress(item: MeApprovalItem) {
    if (item.kind === 'member_signup') {
      router.push(`/members/${item.subjectMemberId}`);
    } else if (item.kind === 'fellowship_join') {
      router.push(`/fellowships/${item.fellowshipId}`);
    } else {
      router.push(`/departments/${item.branchDeptId}`);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerBar}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ChevronLeft color={c.ink} size={24} strokeWidth={1.5} />
        </Pressable>
        <Text style={styles.headerTitle}>Approvals</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.subHeader}>
        <Text style={styles.subTitle}>Waiting on you</Text>
        <Text style={styles.subMeta}>
          {(inbox.data ?? []).length} item{(inbox.data ?? []).length === 1 ? '' : 's'} across your
          fellowships, departments and branch signups.
        </Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipsScroll}
        contentContainerStyle={styles.chipsRow}
      >
        {FILTERS.map((f) => (
          <Pressable
            key={f.key}
            onPress={() => setFilter(f.key)}
            style={[styles.chip, filter === f.key && styles.chipActive]}
          >
            <Text
              style={[styles.chipLabel, filter === f.key && styles.chipLabelActive]}
            >
              {f.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <FlatList
        data={rows}
        keyExtractor={(i) => `${i.kind}:${i.id}`}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={inbox.isFetching}
            onRefresh={() => inbox.refetch()}
            tintColor={c.primary}
          />
        }
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        ListEmptyComponent={
          inbox.isLoading ? (
            <ActivityIndicator color={c.primary} style={{ marginTop: spacing.xl }} />
          ) : (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>All caught up</Text>
              <Text style={styles.emptyMeta}>
                {filter === 'all'
                  ? 'Nothing needs your approval right now.'
                  : 'Nothing in this filter.'}
              </Text>
            </View>
          )
        }
        renderItem={({ item }) => <ApprovalRow item={item} onPress={() => handlePress(item)} />}
      />
    </SafeAreaView>
  );
}

function ApprovalRow({
  item,
  onPress,
}: {
  item: MeApprovalItem;
  onPress: () => void;
}) {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  const meta = KIND_META[item.kind];
  const Icon = meta.icon;
  const contextLabel =
    item.kind === 'member_signup'
      ? (item.branchName ?? 'Branch')
      : item.kind === 'fellowship_join'
        ? item.fellowshipName
        : `${item.departmentName} · ${item.status}`;

  return (
    <Pressable onPress={onPress} style={styles.row}>
      <View style={[styles.iconTile, { backgroundColor: 'rgba(93,63,211,0.1)' }]}>
        <Icon color={c.primary} size={16} strokeWidth={1.5} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <View style={styles.rowTitleLine}>
          <Text style={styles.rowTitle} numberOfLines={1}>
            {item.subjectName}
          </Text>
          <Badge label={meta.label} variant={meta.variant} size="sm" />
        </View>
        <Text style={styles.rowMeta} numberOfLines={1}>
          {contextLabel}
        </Text>
        <Text style={styles.rowMetaFaded}>
          {formatShortDate(item.createdAt)}
        </Text>
      </View>
      <ChevronRight color={c.inkVeryFaded} size={16} strokeWidth={1.5} />
    </Pressable>
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
  subHeader: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    gap: 2,
  },
  subTitle: { ...typography.screenTitle, color: c.ink },
  subMeta: { ...typography.meta, color: c.inkMuted, lineHeight: 16 },
  chipsScroll: { flexGrow: 0, flexShrink: 0 },
  chipsRow: {
    paddingHorizontal: spacing.lg,
    gap: spacing.xs,
    paddingBottom: spacing.md,
    alignItems: 'center',
  },
  chip: {
    paddingHorizontal: spacing.md,
    height: 32,
    justifyContent: 'center',
    borderRadius: radii.pill,
    backgroundColor: c.subtle,
  },
  chipActive: { backgroundColor: c.primary },
  chipLabel: { ...typography.meta, color: c.ink, fontWeight: '600' },
  chipLabelActive: { color: '#ffffff' },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  empty: {
    alignItems: 'center',
    marginTop: spacing.xxl,
    gap: spacing.xs,
  },
  emptyTitle: { ...typography.cardTitle, color: c.ink },
  emptyMeta: { ...typography.meta, color: c.inkMuted },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: c.card,
    borderRadius: radii.md,
    padding: spacing.md,
  },
  iconTile: {
    width: 32,
    height: 32,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitleLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  rowTitle: { ...typography.body, color: c.ink, fontWeight: '600', flex: 1 },
  rowMeta: { ...typography.meta, color: c.inkMuted },
  rowMetaFaded: { ...typography.meta, color: c.inkFaded, fontSize: 11 },
});
}

