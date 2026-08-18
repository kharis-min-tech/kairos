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
  Users,
  Plus,
  ShieldCheck,
} from 'lucide-react-native';
import {
  Avatar,
  Badge,
  Card,
  Input,
  radii,
  spacing,
  typography,
  useThemedStyles,
  type ThemeColors,
  useColors,
} from '@kairos/ui-native';
import type { MemberWithBranchProtected } from '@kairos/types';
import { api } from '@/lib/api-client';
import { useCapabilities } from '@/lib/capabilities';

type TypeFilter = 'all' | 'member' | 'attendee';
type StatusFilter = 'all' | 'approved' | 'pending' | 'rejected';

const STATUS_LABEL: Record<StatusFilter, string> = {
  all: 'All statuses',
  approved: 'Approved',
  pending: 'Pending',
  rejected: 'Rejected',
};

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
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  const router = useRouter();
  const [searchInput, setSearchInput] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const debouncedSearch = useDebounced(searchInput.trim(), 300);
  const caps = useCapabilities();
  const canAdmin = caps.has('signup:approve') || caps.has('branch:write');

  const members = useInfiniteQuery({
    queryKey: [
      'members',
      'list-infinite',
      { search: debouncedSearch, memberType: typeFilter, approvalStatus: statusFilter },
    ],
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => {
      const res = await api.members.list({
        search: debouncedSearch || undefined,
        memberType: typeFilter === 'all' ? undefined : typeFilter,
        approvalStatus: statusFilter === 'all' ? undefined : statusFilter,
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
          <ChevronLeft color={c.ink} size={24} strokeWidth={1.5} />
        </Pressable>
        <Text style={styles.headerTitle}>Members</Text>
        <View style={styles.headerActions}>
          {canAdmin ? (
            <Pressable
              onPress={() => router.push('/members/admin')}
              hitSlop={8}
              accessibilityLabel="Members admin"
            >
              <ShieldCheck color={c.primary} size={20} strokeWidth={1.5} />
            </Pressable>
          ) : null}
          <Pressable
            onPress={() => router.push('/members/new')}
            hitSlop={8}
            testID="new-member-btn"
            accessibilityLabel="New member"
          >
            <Plus color={c.primary} size={22} strokeWidth={1.5} />
          </Pressable>
        </View>
      </View>

      <View style={styles.controlsBlock}>
        <Input
          value={searchInput}
          onChangeText={setSearchInput}
          placeholder="Search by name or email"
          autoCapitalize="none"
          autoCorrect={false}
          leadingSlot={
            <Search color={c.inkFaded} size={16} strokeWidth={1.5} />
          }
          trailingSlot={
            searchInput.length > 0 ? (
              <Pressable onPress={() => setSearchInput('')} hitSlop={8}>
                <X color={c.inkFaded} size={14} strokeWidth={1.5} />
              </Pressable>
            ) : null
          }
        />

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

        {canAdmin ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRow}
          >
            {(Object.keys(STATUS_LABEL) as StatusFilter[]).map((s) => {
              const selected = statusFilter === s;
              return (
                <Pressable
                  key={s}
                  onPress={() => setStatusFilter(s)}
                  style={[styles.filterChip, selected && styles.filterChipActive]}
                >
                  <Text
                    style={[styles.filterLabel, selected && styles.filterLabelActive]}
                  >
                    {STATUS_LABEL[s]}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        ) : null}
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
            tintColor={c.primary}
          />
        }
        ListHeaderComponent={
          <View style={{ marginBottom: spacing.md }}>
            {members.isLoading ? (
              <ActivityIndicator color={c.primary} style={{ marginVertical: spacing.xl }} />
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
                <Users color={c.primary} size={22} strokeWidth={1.5} />
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
              <ChevronRight color={c.inkVeryFaded} size={18} strokeWidth={1.5} />
            </Card>
          </Pressable>
        )}
        ListFooterComponent={
          members.isFetchingNextPage ? (
            <ActivityIndicator color={c.primary} style={{ marginVertical: spacing.md }} />
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
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  controlsBlock: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  filterRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    backgroundColor: c.subtle,
  },
  filterChipActive: {
    backgroundColor: c.primary,
  },
  filterLabel: {
    ...typography.meta,
    color: c.ink,
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
    color: c.inkMuted,
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
  rowName: { ...typography.body, color: c.ink, fontWeight: '600', flex: 1 },
  rowMeta: { ...typography.meta, color: c.inkMuted },
  rowSubMeta: { ...typography.meta, color: c.inkFaded },
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
  errorLine: {
    ...typography.body,
    color: c.danger,
  },
  endOfList: {
    ...typography.meta,
    color: c.inkFaded,
    textAlign: 'center',
    marginTop: spacing.md,
  },
});
}

