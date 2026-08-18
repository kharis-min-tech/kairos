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
import { useQuery } from '@tanstack/react-query';
import {
  ChevronLeft,
  ChevronRight,
  Search,
  X,
  Building2,
  Plus,
  MapPin,
} from 'lucide-react-native';
import {
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
import { api } from '@/lib/api-client';

function useDebounced<T>(value: T, delay: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

export default function BranchesDirectory() {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  const router = useRouter();
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebounced(searchInput.trim().toLowerCase(), 250);

  const branches = useQuery({
    queryKey: ['branches', 'list'],
    queryFn: async () => (await api.branches.list()).data ?? [],
  });

  const filtered = useMemo(() => {
    const rows = branches.data ?? [];
    if (!debouncedSearch) return rows;
    return rows.filter((r) => {
      const hay = `${r.branchName} ${r.regionName ?? ''} ${r.city ?? ''}`.toLowerCase();
      return hay.includes(debouncedSearch);
    });
  }, [branches.data, debouncedSearch]);

  const showEmpty = !branches.isLoading && filtered.length === 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerBar}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ChevronLeft color={c.ink} size={24} strokeWidth={1.5} />
        </Pressable>
        <Text style={styles.headerTitle}>Branches</Text>
        <Pressable
          onPress={() => router.push('/branches/new')}
          hitSlop={8}
          testID="new-branch-btn"
          accessibilityLabel="New branch"
        >
          <Plus color={c.primary} size={22} strokeWidth={1.5} />
        </Pressable>
      </View>

      <View style={styles.controlsBlock}>
        <Input
          value={searchInput}
          onChangeText={setSearchInput}
          placeholder="Search branches"
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
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(b) => b.id}
        contentContainerStyle={styles.container}
        initialNumToRender={16}
        maxToRenderPerBatch={16}
        windowSize={10}
        removeClippedSubviews
        refreshControl={
          <RefreshControl
            refreshing={branches.isRefetching}
            onRefresh={() => branches.refetch()}
            tintColor={c.primary}
          />
        }
        ListHeaderComponent={
          <View style={{ marginBottom: spacing.md }}>
            {branches.isLoading ? (
              <ActivityIndicator color={c.primary} style={{ marginVertical: spacing.xl }} />
            ) : null}
            {branches.isError ? (
              <Card padding="md">
                <Text style={styles.errorLine}>
                  Couldn&apos;t load branches:{' '}
                  {branches.error instanceof Error ? branches.error.message : 'Unknown error'}
                </Text>
              </Card>
            ) : null}
            {filtered.length > 0 ? (
              <Text style={styles.countLabel}>
                {filtered.length} {filtered.length === 1 ? 'branch' : 'branches'}
              </Text>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          showEmpty ? (
            <Card padding="md" style={styles.emptyCard}>
              <View style={styles.emptyIconTile}>
                <Building2 color={c.primary} size={22} strokeWidth={1.5} />
              </View>
              <Text style={styles.emptyTitle}>No branches</Text>
              <Text style={styles.emptyMeta}>
                {debouncedSearch
                  ? `Nothing matched "${debouncedSearch}".`
                  : 'No branches yet. Tap + to create one.'}
              </Text>
            </Card>
          ) : null
        }
        renderItem={({ item: b }) => (
          <Pressable
            onPress={() => router.push(`/branches/edit/${b.id}`)}
            style={styles.rowWrap}
          >
            <Card padding="md" style={styles.rowCard}>
              <View style={styles.rowIconTile}>
                <Building2 color={c.primary} size={18} strokeWidth={1.5} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <View style={styles.rowTitleLine}>
                  <Text style={styles.rowName} numberOfLines={1}>
                    {b.branchName}
                  </Text>
                  <Badge label={b.branchType} variant="primary" size="sm" />
                </View>
                <View style={styles.rowMetaLine}>
                  <MapPin color={c.inkFaded} size={12} strokeWidth={1.5} />
                  <Text style={styles.rowMeta} numberOfLines={1}>
                    {[b.regionName, b.city].filter(Boolean).join(' · ') || '—'}
                  </Text>
                </View>
              </View>
              <ChevronRight color={c.inkVeryFaded} size={18} strokeWidth={1.5} />
            </Card>
          </Pressable>
        )}
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
  controlsBlock: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
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
  rowName: { ...typography.body, color: c.ink, fontWeight: '600', flex: 1 },
  rowMetaLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rowMeta: {
    ...typography.meta,
    color: c.inkMuted,
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
});
}

