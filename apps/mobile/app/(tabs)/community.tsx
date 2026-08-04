import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Search, ChevronRight } from 'lucide-react-native';
import { Avatar, Badge, colors, spacing, typography, radii } from '@kairos/ui-native';
import { api } from '@/lib/api-client';

type Segment = 'people' | 'fellowships' | 'departments';

const SEGMENTS: { key: Segment; label: string }[] = [
  { key: 'people', label: 'People' },
  { key: 'fellowships', label: 'Fellowships' },
  { key: 'departments', label: 'Departments' },
];

export default function Community() {
  const [segment, setSegment] = useState<Segment>('people');
  const [search, setSearch] = useState('');

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Community</Text>
        <Text style={styles.subtitle}>People, fellowships and departments across Kharis.</Text>
      </View>

      <View style={styles.segmentedControl}>
        {SEGMENTS.map((s) => {
          const active = segment === s.key;
          return (
            <Pressable
              key={s.key}
              onPress={() => setSegment(s.key)}
              style={[styles.segment, active && styles.segmentActive]}
            >
              <Text style={[styles.segmentLabel, active && styles.segmentLabelActive]}>
                {s.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.searchField}>
        <Search color="rgba(26,28,28,0.4)" size={18} strokeWidth={1.5} />
        <TextInput
          style={styles.searchInput}
          placeholder={`Search ${SEGMENTS.find((s) => s.key === segment)?.label.toLowerCase()}`}
          placeholderTextColor="rgba(26,28,28,0.4)"
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      {segment === 'people' ? <PeopleList search={search} /> : null}
      {segment === 'fellowships' ? <FellowshipsList search={search} /> : null}
      {segment === 'departments' ? <DepartmentsList search={search} /> : null}
    </SafeAreaView>
  );
}

function PeopleList({ search }: { search: string }) {
  const query = useQuery({
    queryKey: ['members', 'community', search],
    queryFn: async () => {
      const res = await api.members.list({
        limit: 50,
        search: search.trim() || undefined,
        approvalStatus: 'approved',
      });
      return res.data?.data ?? [];
    },
  });

  return (
    <FlatList
      data={query.data ?? []}
      keyExtractor={(m) => m.id}
      contentContainerStyle={styles.listContent}
      refreshControl={
        <RefreshControl
          refreshing={query.isFetching}
          onRefresh={() => query.refetch()}
          tintColor={colors.primary}
        />
      }
      ListEmptyComponent={
        query.isLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />
        ) : (
          <Text style={styles.emptyText}>No members found.</Text>
        )
      }
      ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
      renderItem={({ item }) => (
        <View style={styles.row}>
          <Avatar
            size="sm"
            photoUrl={item.photoUrl}
            firstName={item.firstName}
            lastName={item.lastName}
          />
          <View style={styles.rowText}>
            <Text style={styles.rowTitle}>
              {item.firstName} {item.lastName}
            </Text>
            <Text style={styles.rowMeta}>{item.branchName ?? item.email}</Text>
          </View>
          <ChevronRight color="rgba(26,28,28,0.3)" size={18} strokeWidth={1.5} />
        </View>
      )}
    />
  );
}

function FellowshipsList({ search }: { search: string }) {
  const query = useQuery({
    queryKey: ['fellowships', 'community'],
    queryFn: async () => {
      const res = await api.fellowships.list({ limit: 50 });
      return res.data?.data ?? [];
    },
  });

  const filtered = (query.data ?? []).filter((f) =>
    search ? f.fellowshipName.toLowerCase().includes(search.toLowerCase()) : true,
  );

  return (
    <FlatList
      data={filtered}
      keyExtractor={(f) => f.id}
      contentContainerStyle={styles.listContent}
      refreshControl={
        <RefreshControl
          refreshing={query.isFetching}
          onRefresh={() => query.refetch()}
          tintColor={colors.primary}
        />
      }
      ListEmptyComponent={
        query.isLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />
        ) : (
          <Text style={styles.emptyText}>No fellowships found.</Text>
        )
      }
      ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
      renderItem={({ item }) => (
        <View style={styles.row}>
          <View style={styles.groupDot} />
          <View style={styles.rowText}>
            <View style={styles.rowTitleLine}>
              <Text style={styles.rowTitle}>{item.fellowshipName}</Text>
              <Badge label={item.fellowshipType} variant="gold" size="sm" />
            </View>
            <Text style={styles.rowMeta}>{item.branchName ?? '—'}</Text>
          </View>
          <ChevronRight color="rgba(26,28,28,0.3)" size={18} strokeWidth={1.5} />
        </View>
      )}
    />
  );
}

function DepartmentsList({ search }: { search: string }) {
  const query = useQuery({
    queryKey: ['departments', 'community'],
    queryFn: async () => {
      const res = await api.departments.list({ limit: 50 });
      return res.data?.data ?? [];
    },
  });

  const filtered = (query.data ?? []).filter((d) =>
    search
      ? d.departmentName.toLowerCase().includes(search.toLowerCase())
      : true,
  );

  return (
    <FlatList
      data={filtered}
      keyExtractor={(d) => d.id}
      contentContainerStyle={styles.listContent}
      refreshControl={
        <RefreshControl
          refreshing={query.isFetching}
          onRefresh={() => query.refetch()}
          tintColor={colors.primary}
        />
      }
      ListEmptyComponent={
        query.isLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />
        ) : (
          <Text style={styles.emptyText}>No departments found.</Text>
        )
      }
      ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
      renderItem={({ item }) => (
        <View style={styles.row}>
          <View style={[styles.groupDot, { backgroundColor: colors.info }]} />
          <View style={styles.rowText}>
            <Text style={styles.rowTitle}>{item.departmentName}</Text>
            <Text style={styles.rowMeta}>{item.branchName ?? '—'}</Text>
          </View>
          <ChevronRight color="rgba(26,28,28,0.3)" size={18} strokeWidth={1.5} />
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.pageLight },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    gap: 2,
  },
  title: { ...typography.screenTitle, color: colors.ink },
  subtitle: { ...typography.meta, color: 'rgba(26,28,28,0.55)' },

  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: colors.subtleLight,
    borderRadius: radii.md,
    padding: 3,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    gap: 2,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radii.sm,
  },
  segmentActive: {
    backgroundColor: colors.cardLight,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  segmentLabel: {
    ...typography.meta,
    color: 'rgba(26,28,28,0.55)',
    fontWeight: '600',
  },
  segmentLabelActive: { color: colors.ink },

  searchField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    backgroundColor: colors.cardLight,
    borderWidth: 1,
    borderColor: 'rgba(26,28,28,0.08)',
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    height: 40,
  },
  searchInput: {
    flex: 1,
    ...typography.body,
    color: colors.ink,
  },

  listContent: {
    padding: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
  emptyText: {
    ...typography.body,
    color: 'rgba(26,28,28,0.5)',
    textAlign: 'center',
    marginTop: spacing.xl,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.cardLight,
    borderRadius: radii.md,
    padding: spacing.md,
  },
  groupDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  rowText: { flex: 1, gap: 2 },
  rowTitleLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  rowTitle: { ...typography.cardTitle, color: colors.ink },
  rowMeta: { ...typography.meta, color: 'rgba(26,28,28,0.55)' },
});
