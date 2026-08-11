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
import { ChevronLeft, ChevronRight, Search, X, Users } from 'lucide-react-native';
import { Avatar, Badge, Card, Input, colors, radii, spacing, typography } from '@kairos/ui-native';
import type { MemberWithBranchProtected } from '@kairos/types';
import { api } from '@/lib/api-client';

type TypeFilter = 'all' | 'member' | 'attendee';

const PAGE_SIZE = 25;

function useDebounced<T>(value: T, delay: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

export default function MembersDirectory() {
  const router = useRouter();
  const [searchInput, setSearchInput] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const debouncedSearch = useDebounced(searchInput.trim(), 300);

  const members = useInfiniteQuery({
    queryKey: ['members', 'list-infinite', { search: debouncedSearch, memberType: typeFilter }],
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => {
      const res = await api.members.list({
        search: debouncedSearch || undefined,
        memberType: typeFilter === 'all' ? undefined : typeFilter,
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

  const rows: MemberWithBranchProtected[] = useMemo(
    () => (members.data?.pages ?? []).flatMap((p) => p.data),
    [members.data],
  );
  const total = members.data?.pages[0]?.meta?.total ?? 0;
  const showEmpty = !members.isLoading && rows.length === 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerBar}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ChevronLeft color={colors.ink} size={24} strokeWidth={1.5} />
        </Pressable>
        <Text style={styles.headerTitle}>Members</Text>
        <View style={{ width: 24 }} />
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
            placeholder="Search by name or email"
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
          {(['all', 'member', 'attendee'] as TypeFilter[]).map((f) => {
            const selected = typeFilter === f;
            return (
              <Pressable
                key={f}
                onPress={() => setTypeFilter(f)}
                style={[styles.filterChip, selected && styles.filterChipActive]}
              >
                <Text style={[styles.filterLabel, selected && styles.filterLabelActive]}>
                  {f === 'all' ? 'All' : f === 'member' ? 'Members' : 'Attendees'}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <FlatList
        data={rows}
        keyExtractor={(m) => m.id}
        contentContainerStyle={styles.container}
        initialNumToRender={16}
        maxToRenderPerBatch={16}
        windowSize={10}
        removeClippedSubviews
        onEndReached={() => {
          if (members.hasNextPage && !members.isFetchingNextPage) {
            members.fetchNextPage();
          }
        }}
        onEndReachedThreshold={0.4}
        refreshControl={
          <RefreshControl
            refreshing={members.isRefetching}
            onRefresh={() => members.refetch()}
            tintColor={colors.primary}
          />
        }
        ListHeaderComponent={
          <View style={{ marginBottom: spacing.md }}>
            {members.isLoading ? (
              <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.xl }} />
            ) : null}

            {members.isError ? (
              <Card padding="md">
                <Text style={styles.errorLine}>
                  Couldn&apos;t load members:{' '}
                  {members.error instanceof Error ? members.error.message : 'Unknown error'}
                </Text>
              </Card>
            ) : null}

            {rows.length > 0 ? (
              <Text style={styles.countLabel}>
                {total} {total === 1 ? 'result' : 'results'}
              </Text>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          showEmpty ? (
            <Card padding="md" style={styles.emptyCard}>
              <View style={styles.emptyIconTile}>
                <Users color={colors.primary} size={22} strokeWidth={1.5} />
              </View>
              <Text style={styles.emptyTitle}>No members found</Text>
              <Text style={styles.emptyMeta}>
                {debouncedSearch
                  ? `Nothing matched "${debouncedSearch}". Try a different name or email.`
                  : 'Your directory is empty for this filter.'}
              </Text>
            </Card>
          ) : null
        }
        renderItem={({ item: m }) => (
          <Pressable onPress={() => router.push(`/members/${m.id}`)} style={styles.rowWrap}>
            <Card padding="md" style={styles.rowCard}>
              <Avatar
                size="sm"
                photoUrl={m.photoUrl ?? undefined}
                firstName={m.firstName}
                lastName={m.lastName}
              />
              <View style={{ flex: 1, gap: 2 }}>
                <View style={styles.rowTitleLine}>
                  <Text style={styles.rowName} numberOfLines={1}>
                    {m.honorific ? `${m.honorific} ` : ''}
                    {m.firstName} {m.lastName}
                  </Text>
                  {m.memberType === 'attendee' ? (
                    <Badge label="Attendee" variant="gold" size="sm" />
                  ) : m.memberType === 'child' ? (
                    <Badge label="Child" variant="info" size="sm" />
                  ) : m.memberType === 'visitor' ? (
                    <Badge label="Visitor" variant="neutral" size="sm" />
                  ) : null}
                </View>
                <Text style={styles.rowMeta} numberOfLines={1}>
                  {m.branchName ?? '—'}
                </Text>
                {m.email && !m.redacted ? (
                  <Text style={styles.rowSubMeta} numberOfLines={1}>
                    {m.email}
                  </Text>
                ) : null}
              </View>
              <ChevronRight color="rgba(26,28,28,0.3)" size={18} strokeWidth={1.5} />
            </Card>
          </Pressable>
        )}
        ListFooterComponent={
          members.isFetchingNextPage ? (
            <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.md }} />
          ) : members.hasNextPage ? (
            <View style={{ height: spacing.md }} />
          ) : rows.length > 0 ? (
            <Text style={styles.endOfList}>End of list · {total} members</Text>
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
    paddingBottom: spacing.md,
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
  rowTitleLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  rowName: { ...typography.body, color: colors.ink, fontWeight: '600', flex: 1 },
  rowMeta: { ...typography.meta, color: 'rgba(26,28,28,0.6)' },
  rowSubMeta: { ...typography.meta, color: 'rgba(26,28,28,0.45)' },
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
