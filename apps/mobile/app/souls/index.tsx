import { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  FlatList,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useInfiniteQuery } from '@tanstack/react-query';
import {
  ChevronLeft,
  ChevronRight,
  Search,
  X,
  Handshake,
  Phone,
  AlertCircle,
} from 'lucide-react-native';
import {
  Badge,
  Card,
  Input,
  colors,
  radii,
  spacing,
  typography,
} from '@kairos/ui-native';
import { formatShortDate } from '@kairos/core';
import { api } from '@/lib/api-client';

const PAGE_SIZE = 25;

// Backend enum uses spaces + capitals — do not lowercase or snake_case.
const STATUS_FILTERS = [
  'All',
  'New',
  'Following Up',
  'Interested',
  'Converted',
  'Not Interested',
  'Lost Contact',
] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

const STATUS_VARIANT: Record<
  string,
  'primary' | 'gold' | 'info' | 'success' | 'danger' | 'neutral'
> = {
  New: 'primary',
  'Following Up': 'gold',
  Interested: 'info',
  Converted: 'success',
  'Not Interested': 'danger',
  'Lost Contact': 'neutral',
};

function useDebounced<T>(value: T, delay: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

interface SoulRow {
  id: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  status: string;
  createdAt: string | Date;
  outreachProgramName?: string | null;
  isOverdue?: boolean;
  assignedMemberFirstName?: string | null;
  assignedMemberLastName?: string | null;
}

export default function SoulsDirectory() {
  const router = useRouter();
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All');
  const [overdueOnly, setOverdueOnly] = useState(false);
  const debouncedSearch = useDebounced(searchInput.trim(), 250);

  const list = useInfiniteQuery({
    queryKey: ['souls', 'list-infinite', { search: debouncedSearch, statusFilter, overdueOnly }],
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => {
      const res = await api.souls.list({
        search: debouncedSearch || undefined,
        status: statusFilter === 'All' ? undefined : statusFilter,
        overdueOnly: overdueOnly || undefined,
        page: pageParam,
        limit: PAGE_SIZE,
      });
      return res.data!;
    },
    getNextPageParam: (last) => {
      const page = last.meta?.page ?? 1;
      const totalPages = last.meta?.totalPages ?? 1;
      return page < totalPages ? page + 1 : undefined;
    },
  });

  const rows = useMemo(
    () => (list.data?.pages ?? []).flatMap((p) => p.data as SoulRow[]),
    [list.data],
  );
  const total = list.data?.pages[0]?.meta?.total ?? rows.length;
  const showEmpty = !list.isLoading && rows.length === 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerBar}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ChevronLeft color={colors.ink} size={24} strokeWidth={1.5} />
        </Pressable>
        <Text style={styles.headerTitle}>Souls</Text>
        <Pressable onPress={() => router.push('/follow-ups')} hitSlop={8}>
          <Handshake color={colors.primary} size={22} strokeWidth={1.5} />
        </Pressable>
      </View>

      <View style={styles.controlsBlock}>
        <View style={styles.searchWrap}>
          <Search
            color="rgba(26,28,28,0.4)"
            size={16}
            strokeWidth={1.5}
            style={styles.searchIcon}
          />
          <Input
            value={searchInput}
            onChangeText={setSearchInput}
            placeholder="Search souls"
            autoCapitalize="none"
            autoCorrect={false}
            containerStyle={{ flex: 1 }}
          />
          {searchInput.length > 0 ? (
            <Pressable onPress={() => setSearchInput('')} style={styles.clearBtn} hitSlop={8}>
              <X color="rgba(26,28,28,0.5)" size={14} strokeWidth={1.5} />
            </Pressable>
          ) : null}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.statusChipRow}
        >
          {STATUS_FILTERS.map((s) => {
            const active = statusFilter === s;
            return (
              <Pressable
                key={s}
                onPress={() => setStatusFilter(s)}
                style={[styles.statusChip, active && styles.statusChipActive]}
              >
                <Text
                  style={[styles.statusChipLabel, active && styles.statusChipLabelActive]}
                >
                  {s}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <Pressable
          style={styles.overdueToggle}
          onPress={() => setOverdueOnly((p) => !p)}
        >
          <View
            style={[
              styles.overdueBox,
              overdueOnly && styles.overdueBoxChecked,
            ]}
          >
            {overdueOnly ? (
              <AlertCircle color="#ffffff" size={12} strokeWidth={2} />
            ) : null}
          </View>
          <Text style={styles.overdueLabel}>Only show overdue follow-ups</Text>
        </Pressable>
      </View>

      <FlatList
        data={rows}
        keyExtractor={(s) => s.id}
        contentContainerStyle={styles.container}
        initialNumToRender={16}
        maxToRenderPerBatch={16}
        windowSize={10}
        removeClippedSubviews
        onEndReached={() => {
          if (list.hasNextPage && !list.isFetchingNextPage) {
            list.fetchNextPage();
          }
        }}
        onEndReachedThreshold={0.4}
        refreshControl={
          <RefreshControl
            refreshing={list.isRefetching}
            onRefresh={() => list.refetch()}
            tintColor={colors.primary}
          />
        }
        ListHeaderComponent={
          <View style={{ marginBottom: spacing.md }}>
            {list.isLoading ? (
              <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.xl }} />
            ) : null}
            {list.isError ? (
              <Card padding="md">
                <Text style={styles.errorLine}>
                  Couldn&apos;t load souls:{' '}
                  {list.error instanceof Error ? list.error.message : 'Unknown error'}
                </Text>
              </Card>
            ) : null}
            {rows.length > 0 ? (
              <Text style={styles.countLabel}>
                {rows.length}
                {rows.length < total ? ` of ${total}` : ''}{' '}
                {rows.length === 1 ? 'soul' : 'souls'}
              </Text>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          showEmpty ? (
            <Card padding="md" style={styles.emptyCard}>
              <View style={styles.emptyIconTile}>
                <Handshake color={colors.primary} size={22} strokeWidth={1.5} />
              </View>
              <Text style={styles.emptyTitle}>No souls found</Text>
              <Text style={styles.emptyMeta}>
                {debouncedSearch
                  ? `Nothing matched "${debouncedSearch}".`
                  : 'No souls match this filter. Capture happens on the web or during outreach.'}
              </Text>
            </Card>
          ) : null
        }
        renderItem={({ item: s }) => (
          <Pressable onPress={() => router.push(`/souls/${s.id}`)} style={styles.rowWrap}>
            <Card padding="md" style={styles.rowCard}>
              <View style={{ flex: 1, gap: 2 }}>
                <View style={styles.rowTitleLine}>
                  <Text style={styles.rowName} numberOfLines={1}>
                    {s.firstName} {s.lastName}
                  </Text>
                  <Badge
                    label={s.status}
                    variant={STATUS_VARIANT[s.status] ?? 'neutral'}
                    size="sm"
                  />
                </View>
                <View style={styles.rowMetaLine}>
                  {s.phone ? (
                    <>
                      <Phone color="rgba(26,28,28,0.45)" size={12} strokeWidth={1.5} />
                      <Text style={styles.rowMeta}>{s.phone}</Text>
                    </>
                  ) : (
                    <Text style={styles.rowMeta}>No phone</Text>
                  )}
                  <Text style={styles.rowMetaDot}>·</Text>
                  <Text style={styles.rowMeta}>{formatShortDate(s.createdAt)}</Text>
                  {s.isOverdue ? (
                    <>
                      <Text style={styles.rowMetaDot}>·</Text>
                      <AlertCircle color={colors.danger} size={12} strokeWidth={1.5} />
                      <Text style={[styles.rowMeta, { color: colors.danger }]}>Overdue</Text>
                    </>
                  ) : null}
                </View>
                {s.assignedMemberFirstName ? (
                  <Text style={styles.rowSubMeta}>
                    Assigned to {s.assignedMemberFirstName} {s.assignedMemberLastName ?? ''}
                  </Text>
                ) : (
                  <Text style={styles.rowSubMeta}>Unassigned</Text>
                )}
              </View>
              <ChevronRight color="rgba(26,28,28,0.3)" size={18} strokeWidth={1.5} />
            </Card>
          </Pressable>
        )}
        ListFooterComponent={
          list.isFetchingNextPage ? (
            <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.md }} />
          ) : list.hasNextPage ? (
            <View style={{ height: spacing.md }} />
          ) : rows.length > 0 ? (
            <Text style={styles.endOfList}>End of list</Text>
          ) : null
        }
      />
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
  controlsBlock: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  searchWrap: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchIcon: {
    position: 'absolute',
    left: spacing.md,
    top: '50%',
    marginTop: -8,
    zIndex: 1,
  },
  clearBtn: {
    position: 'absolute',
    right: spacing.md,
    padding: 4,
  },
  statusChipRow: {
    gap: spacing.xs,
    paddingRight: spacing.lg,
  },
  statusChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.pill,
    backgroundColor: colors.subtleLight,
  },
  statusChipActive: {
    backgroundColor: colors.primary,
  },
  statusChipLabel: {
    ...typography.meta,
    color: colors.ink,
    fontWeight: '500',
  },
  statusChipLabelActive: {
    color: '#ffffff',
    fontWeight: '600',
  },
  overdueToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  overdueBox: {
    width: 18,
    height: 18,
    borderRadius: radii.xs,
    borderWidth: 1.5,
    borderColor: 'rgba(26,28,28,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  overdueBoxChecked: {
    backgroundColor: colors.danger,
    borderColor: colors.danger,
  },
  overdueLabel: { ...typography.meta, color: colors.ink },
  container: {
    padding: spacing.lg,
    paddingTop: 0,
    paddingBottom: spacing.xxl,
  },
  countLabel: {
    ...typography.meta,
    color: 'rgba(26,28,28,0.6)',
    paddingHorizontal: spacing.xs,
  },
  rowWrap: {
    marginBottom: spacing.sm,
  },
  rowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  rowTitleLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  rowName: { ...typography.body, color: colors.ink, fontWeight: '600', flex: 1 },
  rowMetaLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexWrap: 'wrap',
    marginTop: 2,
  },
  rowMeta: {
    ...typography.meta,
    color: 'rgba(26,28,28,0.6)',
  },
  rowMetaDot: {
    ...typography.meta,
    color: 'rgba(26,28,28,0.5)',
  },
  rowSubMeta: {
    ...typography.meta,
    color: 'rgba(26,28,28,0.5)',
    marginTop: 2,
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
  errorLine: {
    ...typography.body,
    color: colors.danger,
  },
  endOfList: {
    ...typography.meta,
    color: 'rgba(26,28,28,0.4)',
    textAlign: 'center',
    marginTop: spacing.md,
  },
});
