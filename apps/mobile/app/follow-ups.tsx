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
import {
  ChevronLeft,
  ChevronRight,
  Handshake,
  UsersRound,
  Building2,
  Sparkles,
} from 'lucide-react-native';
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
import type { MeActivityItem, MeFollowupItem } from '@kairos/types';
import { api } from '@/lib/api-client';

type FilterKind =
  | 'all'
  | 'soul'
  | 'fellowship_followup'
  | 'department_followup'
  | 'mentor_enrollment';

const KIND_META: Record<
  MeFollowupItem['kind'],
  { label: string; icon: typeof Handshake; variant: 'primary' | 'gold' | 'info' | 'success' }
> = {
  soul: { label: 'Soul', icon: Handshake, variant: 'primary' },
  fellowship_followup: { label: 'Fellowship', icon: UsersRound, variant: 'gold' },
  department_followup: { label: 'Department', icon: Building2, variant: 'info' },
  mentor_enrollment: { label: 'Mentee', icon: Sparkles, variant: 'success' },
};

const FILTERS: { key: FilterKind; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'soul', label: 'Souls' },
  { key: 'fellowship_followup', label: 'Fellowships' },
  { key: 'department_followup', label: 'Departments' },
  { key: 'mentor_enrollment', label: 'Mentees' },
];

function daysAgo(iso: string | null): number | null {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return null;
  return Math.max(0, Math.floor((Date.now() - then) / (1000 * 60 * 60 * 24)));
}

type Tab = 'todo' | 'activity';

export default function FollowUps() {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('todo');
  const [filter, setFilter] = useState<FilterKind>('all');

  const inbox = useQuery({
    queryKey: ['me', 'followups'],
    queryFn: async () => (await api.me.followups()).data ?? [],
    enabled: tab === 'todo',
  });

  const activity = useQuery({
    queryKey: ['me', 'activity'],
    queryFn: async () => (await api.me.activity()).data ?? [],
    enabled: tab === 'activity',
  });

  const rows = useMemo(() => {
    const all = inbox.data ?? [];
    if (filter === 'all') return all;
    return all.filter((i) => i.kind === filter);
  }, [inbox.data, filter]);

  function handlePress(item: MeFollowupItem) {
    // Land on the surface where the leader can record the next follow-up
    // right now — the followups tab for fellowship + department, the enrollment
    // detail page (with mentor followup form) for NB mentees, and the soul
    // detail page for evangelism followups.
    if (item.kind === 'soul') {
      router.push(`/souls/${item.id}`);
    } else if (item.kind === 'fellowship_followup') {
      router.push(`/fellowships/${item.fellowshipId}/followups` as never);
    } else if (item.kind === 'department_followup') {
      router.push(`/departments/${item.branchDeptId}/followups` as never);
    } else {
      // NB mentor followup — land on the enrollment detail (mentee context +
      // journey progress) rather than the member profile. Recording a followup
      // form on this screen is a follow-up ticket.
      router.push(`/new-believers/${item.id}` as never);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerBar}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ChevronLeft color={c.ink} size={24} strokeWidth={1.5} />
        </Pressable>
        <Text style={styles.headerTitle}>Follow-ups</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.tabsRow}>
        {(['todo', 'activity'] as Tab[]).map((t) => {
          const active = t === tab;
          return (
            <Pressable
              key={t}
              onPress={() => setTab(t)}
              style={[styles.tabBtn, active && styles.tabBtnActive]}
            >
              <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>
                {t === 'todo' ? 'To do' : 'My activity'}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.subHeader}>
        <Text style={styles.subTitle}>
          {tab === 'todo' ? 'Owe someone a call' : 'Recently recorded'}
        </Text>
        <Text style={styles.subMeta}>
          {tab === 'todo'
            ? 'Souls, meeting follow-ups, and new-believer mentees you look after.'
            : 'Every touchpoint you’ve personally logged, most recent first.'}
        </Text>
      </View>

      {tab === 'todo' ? (
        <>
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
                <Text style={[styles.chipLabel, filter === f.key && styles.chipLabelActive]}>
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
                      ? 'Nothing pending right now — enjoy the quiet.'
                      : 'Nothing in this filter.'}
                  </Text>
                </View>
              )
            }
            renderItem={({ item }) => (
              <FollowupRow item={item} onPress={() => handlePress(item)} />
            )}
          />
        </>
      ) : (
        <FlatList
          data={activity.data ?? []}
          keyExtractor={(i) => `${i.kind}:${i.id}`}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={activity.isFetching}
              onRefresh={() => activity.refetch()}
              tintColor={c.primary}
            />
          }
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
          ListEmptyComponent={
            activity.isLoading ? (
              <ActivityIndicator color={c.primary} style={{ marginTop: spacing.xl }} />
            ) : (
              <View style={styles.empty}>
                <Text style={styles.emptyTitle}>Nothing here yet</Text>
                <Text style={styles.emptyMeta}>
                  Follow-ups you record — fellowship, department, mentor, and
                  souls captured — will show up here.
                </Text>
              </View>
            )
          }
          renderItem={({ item }) => (
            <ActivityRow item={item} onPress={() => handleActivityPress(item)} />
          )}
        />
      )}
    </SafeAreaView>
  );

  function handleActivityPress(item: MeActivityItem) {
    if (item.kind === 'soul_capture') {
      router.push(`/souls/${item.id}`);
    } else if (item.kind === 'fellowship_followup') {
      router.push(`/fellowships/${item.fellowshipId}/followups` as never);
    } else if (item.kind === 'department_followup') {
      router.push(`/departments/${item.branchDeptId}/followups` as never);
    } else {
      router.push(`/new-believers/${item.enrollmentId}` as never);
    }
  }
}

function ActivityRow({
  item,
  onPress,
}: {
  item: MeActivityItem;
  onPress: () => void;
}) {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();

  const meta =
    item.kind === 'soul_capture'
      ? { label: 'Soul', icon: Handshake, variant: 'primary' as const }
      : item.kind === 'fellowship_followup'
        ? { label: 'Fellowship', icon: UsersRound, variant: 'gold' as const }
        : item.kind === 'department_followup'
          ? { label: 'Department', icon: Building2, variant: 'info' as const }
          : { label: 'Mentee', icon: Sparkles, variant: 'success' as const };
  const Icon = meta.icon;

  const contextLine =
    item.kind === 'soul_capture'
      ? item.status
      : item.kind === 'fellowship_followup'
        ? item.fellowshipName
        : item.kind === 'department_followup'
          ? item.departmentName
          : 'New Believer';

  const timestamp =
    item.kind === 'soul_capture' ? item.createdAt : item.contactedAt;

  const noteLine =
    item.kind === 'mentor_followup'
      ? item.note
      : 'notes' in item
        ? item.notes
        : null;

  return (
    <Pressable onPress={onPress} style={styles.row}>
      <View style={styles.iconTile}>
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
          {contextLine}
        </Text>
        <Text style={styles.rowMetaFaded}>
          {formatShortDate(timestamp)}
          {noteLine ? ` — ${noteLine}` : ''}
        </Text>
      </View>
      <ChevronRight color={c.inkVeryFaded} size={16} strokeWidth={1.5} />
    </Pressable>
  );
}

function FollowupRow({
  item,
  onPress,
}: {
  item: MeFollowupItem;
  onPress: () => void;
}) {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  const meta = KIND_META[item.kind];
  const Icon = meta.icon;
  const contextLabel =
    item.kind === 'soul'
      ? item.status
      : item.kind === 'fellowship_followup'
        ? item.fellowshipName
        : item.kind === 'department_followup'
          ? item.departmentName
          : 'New Believer';
  const tailLabel =
    item.kind === 'soul'
      ? `captured ${formatShortDate(item.createdAt)}`
      : item.kind === 'fellowship_followup' || item.kind === 'department_followup'
        ? `due ${formatShortDate(item.nextFollowUpDate)}`
        : item.lastContactedAt
          ? `last note ${daysAgo(item.lastContactedAt)}d ago`
          : 'no notes yet';

  return (
    <Pressable onPress={onPress} style={styles.row}>
      <View style={styles.iconTile}>
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
        <Text style={styles.rowMetaFaded}>{tailLabel}</Text>
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
  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    gap: spacing.xs,
    paddingBottom: spacing.sm,
  },
  tabBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: c.subtle,
  },
  tabBtnActive: { backgroundColor: 'rgba(93,63,211,0.1)', borderWidth: 1, borderColor: c.primary },
  tabLabel: { ...typography.body, color: c.inkMuted, fontWeight: '600' },
  tabLabelActive: { color: c.primary, fontWeight: '700' },
  subHeader: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    gap: 2,
  },
  subTitle: { ...typography.screenTitle, color: c.ink },
  subMeta: { ...typography.meta, color: c.inkMuted, lineHeight: 16 },
  chipsScroll: { flexGrow: 0, flexShrink: 0 },
  chipsRow: {
    flexDirection: 'row',
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
  emptyMeta: {
    ...typography.meta,
    color: c.inkMuted,
    textAlign: 'center',
  },
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
    backgroundColor: 'rgba(93,63,211,0.1)',
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

