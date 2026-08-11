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
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import {
  ChevronLeft,
  ChevronRight,
  Search,
  X,
  Building2,
  Plus,
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
import type { BranchDepartmentWithDetails } from '@kairos/types';
import { api } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth';

const PAGE_SIZE = 25;

type BranchScope = 'home' | 'all';

function useDebounced<T>(value: T, delay: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

export default function DepartmentsDirectory() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const homeBranchId = user?.homeBranchId ?? undefined;

  const [searchInput, setSearchInput] = useState('');
  const [branchScope, setBranchScope] = useState<BranchScope>('home');
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const debouncedSearch = useDebounced(searchInput.trim().toLowerCase(), 250);

  const branchIdParam = branchScope === 'home' ? homeBranchId : undefined;

  const globalDepts = useQuery({
    queryKey: ['departments', 'listGlobal'],
    queryFn: async () => (await api.departments.listGlobal()).data ?? [],
    staleTime: 5 * 60 * 1000,
  });

  const list = useInfiniteQuery({
    queryKey: [
      'departments',
      'list-infinite',
      { branchId: branchIdParam, departmentId: typeFilter },
    ],
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => {
      const res = await api.departments.list({
        branchId: branchIdParam,
        departmentId: typeFilter ?? undefined,
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
    () => (list.data?.pages ?? []).flatMap((p) => p.data as BranchDepartmentWithDetails[]),
    [list.data],
  );

  const filtered = useMemo(() => {
    if (!debouncedSearch) return rows;
    return rows.filter((r) => {
      const hay = `${r.departmentName} ${r.branchName ?? ''} ${r.description ?? ''}`.toLowerCase();
      return hay.includes(debouncedSearch);
    });
  }, [rows, debouncedSearch]);

  const total = list.data?.pages[0]?.meta?.total ?? rows.length;
  const showEmpty = !list.isLoading && filtered.length === 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerBar}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ChevronLeft color={colors.ink} size={24} strokeWidth={1.5} />
        </Pressable>
        <Text style={styles.headerTitle}>Departments</Text>
        <Pressable onPress={() => router.push('/departments/new')} hitSlop={8}>
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
            placeholder="Search departments"
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
          <ScopeChip
            active={branchScope === 'home'}
            onPress={() => setBranchScope('home')}
            label="My branch"
          />
          <ScopeChip
            active={branchScope === 'all'}
            onPress={() => setBranchScope('all')}
            label="All"
          />
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.typeChipRow}
        >
          <TypeChip
            active={typeFilter === null}
            onPress={() => setTypeFilter(null)}
            label="Any dept"
          />
          {(globalDepts.data ?? []).map((d) => (
            <TypeChip
              key={d.id}
              active={typeFilter === d.id}
              onPress={() => setTypeFilter(d.id)}
              label={d.departmentName}
            />
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(d) => d.id}
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
                  Couldn&apos;t load departments:{' '}
                  {list.error instanceof Error ? list.error.message : 'Unknown error'}
                </Text>
              </Card>
            ) : null}

            {filtered.length > 0 ? (
              <Text style={styles.countLabel}>
                {filtered.length}
                {filtered.length < total ? ` of ${total}` : ''}{' '}
                {filtered.length === 1 ? 'department' : 'departments'}
              </Text>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          showEmpty ? (
            <Card padding="md" style={styles.emptyCard}>
              <View style={styles.emptyIconTile}>
                <Building2 color={colors.primary} size={22} strokeWidth={1.5} />
              </View>
              <Text style={styles.emptyTitle}>No departments found</Text>
              <Text style={styles.emptyMeta}>
                {debouncedSearch
                  ? `Nothing matched "${debouncedSearch}". Try a different query or clear filters.`
                  : 'No departments in this scope. Tap + to create one.'}
              </Text>
            </Card>
          ) : null
        }
        renderItem={({ item: d }) => (
          <Pressable onPress={() => router.push(`/departments/${d.id}`)} style={styles.rowWrap}>
            <Card padding="md" style={styles.rowCard}>
              <View style={styles.rowIconTile}>
                <Building2 color={colors.primary} size={18} strokeWidth={1.5} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.rowName} numberOfLines={1}>
                  {d.departmentName}
                </Text>
                <View style={styles.rowMetaLine}>
                  {d.branchName ? (
                    <Text style={styles.rowMeta} numberOfLines={1}>
                      {d.branchName}
                    </Text>
                  ) : null}
                  {typeof d.memberCount === 'number' ? (
                    <Badge label={`${d.memberCount} members`} variant="neutral" size="sm" />
                  ) : null}
                  {d.pendingJoinRequestCount ? (
                    <Badge
                      label={`${d.pendingJoinRequestCount} pending`}
                      variant="gold"
                      size="sm"
                    />
                  ) : null}
                </View>
                {d.leadFirstName ? (
                  <Text style={styles.rowSubMeta} numberOfLines={1}>
                    Lead: {d.leadFirstName} {d.leadLastName ?? ''}
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
          ) : filtered.length > 0 ? (
            <Text style={styles.endOfList}>End of list</Text>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

function ScopeChip({
  active,
  onPress,
  label,
}: {
  active: boolean;
  onPress: () => void;
  label: string;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.scopeChip, active && styles.scopeChipActive]}>
      <Text style={[styles.scopeChipLabel, active && styles.scopeChipLabelActive]}>{label}</Text>
    </Pressable>
  );
}

function TypeChip({
  active,
  onPress,
  label,
}: {
  active: boolean;
  onPress: () => void;
  label: string;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.typeChip, active && styles.typeChipActive]}>
      <Text
        style={[styles.typeChipLabel, active && styles.typeChipLabelActive]}
        numberOfLines={1}
      >
        {label}
      </Text>
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
  scopeChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    backgroundColor: colors.subtleLight,
  },
  scopeChipActive: {
    backgroundColor: colors.primary,
  },
  scopeChipLabel: {
    ...typography.meta,
    color: colors.ink,
    fontWeight: '500',
  },
  scopeChipLabelActive: {
    color: '#ffffff',
    fontWeight: '600',
  },
  typeChipRow: {
    gap: spacing.xs,
    paddingRight: spacing.lg,
  },
  typeChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radii.sm,
    backgroundColor: colors.cardLight,
    borderWidth: 1,
    borderColor: 'rgba(26,28,28,0.1)',
  },
  typeChipActive: {
    backgroundColor: 'rgba(93,63,211,0.1)',
    borderColor: colors.primary,
  },
  typeChipLabel: {
    ...typography.meta,
    color: colors.ink,
  },
  typeChipLabelActive: {
    color: colors.primary,
    fontWeight: '700',
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
  rowName: {
    ...typography.body,
    color: colors.ink,
    fontWeight: '600',
  },
  rowMetaLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
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
