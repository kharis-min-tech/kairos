import { useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, FileText } from 'lucide-react-native';
import {
  Badge,
  Card,
  radii,
  spacing,
  typography,
  useThemedStyles,
  type ThemeColors,
  useColors,
} from '@kairos/ui-native';
import { formatShortDate } from '@kairos/core';
import type { FormSubmission, FormType } from '@kairos/types';
import { api } from '@/lib/api-client';

const FORM_LABEL: Record<string, string> = {
  altar_call: 'Altar call',
  baptism: 'Baptism',
  testimony: 'Testimony',
  baby_naming: 'Baby naming',
  baby_dedication: 'Baby dedication',
  first_time_visitor: 'First-timer',
};

const STATUS_TONE: Record<string, 'primary' | 'gold' | 'success' | 'neutral'> = {
  new: 'primary',
  reviewed: 'gold',
  converted: 'success',
  dismissed: 'neutral',
};

const FORM_FILTERS: { key: FormType | 'all'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'altar_call' as FormType, label: 'Altar' },
  { key: 'baptism' as FormType, label: 'Baptism' },
  { key: 'testimony' as FormType, label: 'Testimony' },
  { key: 'baby_naming' as FormType, label: 'Baby name' },
  { key: 'baby_dedication' as FormType, label: 'Baby ded.' },
  { key: 'first_time_visitor' as FormType, label: 'First-timer' },
];

const STATUS_FILTERS: { key: 'all' | 'new' | 'reviewed' | 'converted' | 'dismissed'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'new', label: 'New' },
  { key: 'reviewed', label: 'Reviewed' },
  { key: 'converted', label: 'Converted' },
  { key: 'dismissed', label: 'Dismissed' },
];

export default function FormsSubmissions() {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  const router = useRouter();
  const [formType, setFormType] = useState<FormType | 'all'>('all');
  const [status, setStatus] = useState<'all' | 'new' | 'reviewed' | 'converted' | 'dismissed'>('all');

  const rows = useQuery({
    queryKey: ['forms', 'submissions', { formType, status }],
    queryFn: async () => {
      const res = await api.forms.submissions.list({
        formType: formType === 'all' ? undefined : formType,
        status: status === 'all' ? undefined : status,
      });
      return res.data ?? [];
    },
  });

  const list = useMemo(() => rows.data ?? [], [rows.data]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerBar}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ChevronLeft color={c.ink} size={24} strokeWidth={1.5} />
        </Pressable>
        <Text style={styles.headerTitle}>Form submissions</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.filters}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipsScroll}
          contentContainerStyle={styles.chipsRow}
        >
          {FORM_FILTERS.map((f) => {
            const active = formType === f.key;
            return (
              <Pressable
                key={f.key}
                onPress={() => setFormType(f.key)}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>
                  {f.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipsScroll}
          contentContainerStyle={styles.chipsRow}
        >
          {STATUS_FILTERS.map((f) => {
            const active = status === f.key;
            return (
              <Pressable
                key={f.key}
                onPress={() => setStatus(f.key)}
                style={[
                  styles.chip,
                  styles.statusChip,
                  active && styles.statusChipActive,
                ]}
              >
                <Text
                  style={[
                    styles.chipLabel,
                    active && styles.statusChipLabelActive,
                  ]}
                >
                  {f.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={rows.isFetching}
            onRefresh={() => rows.refetch()}
            tintColor={c.primary}
          />
        }
      >
        {rows.isLoading ? (
          <ActivityIndicator color={c.primary} style={{ marginTop: spacing.xxl }} />
        ) : list.length === 0 ? (
          <Card padding="lg" style={styles.empty}>
            <View style={styles.emptyIcon}>
              <FileText color={c.primary} size={22} strokeWidth={1.5} />
            </View>
            <Text style={styles.emptyTitle}>No submissions</Text>
            <Text style={styles.emptyMeta}>
              Nothing matches these filters yet.
            </Text>
          </Card>
        ) : (
          list.map((s) => <Row key={s.id} row={s} />)
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ row }: { row: FormSubmission }) {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  const formLabel = FORM_LABEL[row.formType] ?? row.formType;
  const statusTone = STATUS_TONE[row.status] ?? 'neutral';
  const subject = (row.payload as { firstName?: string; lastName?: string }) ?? {};
  const name = [subject.firstName, subject.lastName].filter(Boolean).join(' ') || 'Submission';
  return (
    <Card padding="md" style={styles.row}>
      <View style={{ flex: 1, gap: 2 }}>
        <View style={styles.rowTitleLine}>
          <Text style={styles.rowTitle} numberOfLines={1}>
            {name}
          </Text>
          <Badge label={formLabel} variant="primary" size="sm" />
        </View>
        <Text style={styles.rowMeta}>
          {row.branchName ?? 'Branch'} · {formatShortDate(row.createdAt as unknown as string)}
        </Text>
      </View>
      <Badge label={row.status} variant={statusTone} size="sm" />
      <ChevronRight color={c.inkVeryFaded} size={16} strokeWidth={1.5} />
    </Card>
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
  filters: {
    paddingBottom: spacing.sm,
    gap: spacing.xs,
  },
  chipsScroll: { flexGrow: 0, flexShrink: 0 },
  chipsRow: {
    paddingHorizontal: spacing.lg,
    gap: spacing.xs,
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
  statusChip: { borderWidth: 1, borderColor: c.divider, backgroundColor: c.card },
  statusChipActive: { borderColor: c.gold, backgroundColor: 'rgba(248,181,55,0.15)' },
  statusChipLabelActive: { color: c.goldDark },
  container: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  rowTitleLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  rowTitle: { ...typography.body, color: c.ink, fontWeight: '600', flex: 1 },
  rowMeta: { ...typography.meta, color: c.inkMuted },
  empty: { alignItems: 'center', gap: spacing.xs },
  emptyIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(93,63,211,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  emptyTitle: { ...typography.cardTitle, color: c.ink },
  emptyMeta: {
    ...typography.body,
    color: c.inkMuted,
    textAlign: 'center',
  },
});
}

