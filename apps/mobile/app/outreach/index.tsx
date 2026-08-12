import { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  FlatList,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useInfiniteQuery } from '@tanstack/react-query';
import {
  ChevronLeft,
  ChevronRight,
  Search,
  X,
  Heart,
  Plus,
  MapPin,
  Calendar,
} from 'lucide-react-native';
import { Badge, Card, Input, colors, radii, spacing, typography } from '@kairos/ui-native';
import type { OutreachProgramWithDetails } from '@kairos/types';
import { formatShortDate } from '@kairos/core';
import { api } from '@/lib/api-client';

const PAGE_SIZE = 25;
type CompletedFilter = 'active' | 'completed' | 'all';

function useDebounced<T>(value: T, delay: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

export default function OutreachDirectory() {
  const router = useRouter();
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState<CompletedFilter>('active');
  const debouncedSearch = useDebounced(searchInput.trim(), 250);

  const list = useInfiniteQuery({
    queryKey: [
      'outreach',
      'programs',
      { search: debouncedSearch, statusFilter },
    ],
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => {
      const res = await api.outreach.programs.list({
        search: debouncedSearch || undefined,
        isCompleted:
          statusFilter === 'active'
            ? false
            : statusFilter === 'completed'
              ? true
              : undefined,
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
    () =>
      (list.data?.pages ?? []).flatMap(
        (p) => p.data as OutreachProgramWithDetails[],
      ),
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
        <Text style={styles.headerTitle}>Outreach</Text>
        <Pressable onPress={() => router.push('/outreach/new')} hitSlop={8}>
          <Plus color={colors.primary} size={22} strokeWidth={1.5} />
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
            placeholder="Search programs"
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

        <View style={styles.filterRow}>
          {(['active', 'completed', 'all'] as CompletedFilter[]).map((f) => {
            const selected = statusFilter === f;
            return (
              <Pressable
                key={f}
                onPress={() => setStatusFilter(f)}
                style={[styles.filterChip, selected && styles.filterChipActive]}
              >
                <Text
                  style={[styles.filterLabel, selected && styles.filterLabelActive]}
                >
                  {f === 'active' ? 'Active' : f === 'completed' ? 'Completed' : 'All'}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <FlatList
        data={rows}
        keyExtractor={(p) => p.id}
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
                  Couldn&apos;t load programs:{' '}
                  {list.error instanceof Error ? list.error.message : 'Unknown error'}
                </Text>
              </Card>
            ) : null}
            {rows.length > 0 ? (
              <Text style={styles.countLabel}>
                {rows.length}
                {rows.length < total ? ` of ${total}` : ''}{' '}
                {rows.length === 1 ? 'program' : 'programs'}
              </Text>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          showEmpty ? (
            <Card padding="md" style={styles.emptyCard}>
              <View style={styles.emptyIconTile}>
                <Heart color={colors.primary} size={22} strokeWidth={1.5} />
              </View>
              <Text style={styles.emptyTitle}>No outreach programs</Text>
              <Text style={styles.emptyMeta}>
                {debouncedSearch
                  ? `Nothing matched "${debouncedSearch}".`
                  : 'No programs in this scope. Tap + to schedule one.'}
              </Text>
            </Card>
          ) : null
        }
        renderItem={({ item: p }) => (
          <Pressable onPress={() => router.push(`/outreach/${p.id}`)} style={styles.rowWrap}>
            <Card padding="md" style={styles.rowCard}>
              <View style={styles.rowIconTile}>
                <Heart color={colors.primary} size={18} strokeWidth={1.5} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <View style={styles.rowTitleLine}>
                  <Text style={styles.rowName} numberOfLines={1}>
                    {p.programName}
                  </Text>
                  {p.isCompleted ? (
                    <Badge label="Done" variant="success" size="sm" />
                  ) : null}
                </View>
                <View style={styles.rowMetaLine}>
                  <Calendar color="rgba(26,28,28,0.45)" size={12} strokeWidth={1.5} />
                  <Text style={styles.rowMeta}>{formatShortDate(p.programDate)}</Text>
                  {p.location ? (
                    <>
                      <MapPin
                        color="rgba(26,28,28,0.45)"
                        size={12}
                        strokeWidth={1.5}
                      />
                      <Text style={styles.rowMeta} numberOfLines={1}>
                        {p.location}
                      </Text>
                    </>
                  ) : null}
                </View>
                {p.branchName ? (
                  <Text style={styles.rowSubMeta} numberOfLines={1}>
                    {p.branchName}
                    {typeof p.totalSoulsReached === 'number'
                      ? ` · ${p.totalSoulsReached} soul${p.totalSoulsReached === 1 ? '' : 's'}`
                      : ''}
                  </Text>
                ) : null}
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
  filterRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    backgroundColor: colors.subtleLight,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
  },
  filterLabel: {
    ...typography.meta,
    color: colors.ink,
    fontWeight: '500',
  },
  filterLabelActive: {
    color: '#ffffff',
    fontWeight: '600',
  },
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
  rowIconTile: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    backgroundColor: 'rgba(93,63,211,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitleLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  rowName: {
    ...typography.body,
    color: colors.ink,
    fontWeight: '600',
    flex: 1,
  },
  rowMetaLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexWrap: 'wrap',
  },
  rowMeta: {
    ...typography.meta,
    color: 'rgba(26,28,28,0.6)',
  },
  rowSubMeta: {
    ...typography.meta,
    color: 'rgba(26,28,28,0.5)',
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
