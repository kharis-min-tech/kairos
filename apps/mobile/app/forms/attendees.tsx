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
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, Users, Check, Archive } from 'lucide-react-native';
import {
  Avatar,
  Badge,
  Button,
  Card,
  colors,
  radii,
  spacing,
  typography,
} from '@kairos/ui-native';
import { formatShortDate } from '@kairos/core';
import { api } from '@/lib/api-client';
import { alert } from '@/lib/alert';

/**
 * Dormant attendees — visitors captured from altar-call / first-timer forms
 * who never enrolled in the New Believers pipeline. Leaders review them here
 * to either promote (via NB enrollment elsewhere) or archive in bulk.
 */
export default function FormsAttendees() {
  const router = useRouter();
  const qc = useQueryClient();

  const rows = useQuery({
    queryKey: ['forms', 'attendees', 'dormant'],
    queryFn: async () => (await api.forms.attendees.dormant()).data ?? [],
  });

  const [selected, setSelected] = useState<Set<string>>(new Set());

  const list = useMemo(() => rows.data ?? [], [rows.data]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const archive = useMutation({
    mutationFn: async () => {
      const memberIds = Array.from(selected);
      if (memberIds.length === 0) return { archived: 0 };
      const res = await api.forms.attendees.archive({ memberIds });
      if (!res.success) throw new Error(res.message ?? 'Archive failed');
      return res.data ?? { archived: 0 };
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['forms', 'attendees'] });
      setSelected(new Set());
      alert.info('Archived', `${res.archived} attendee${res.archived === 1 ? '' : 's'} archived.`);
    },
    onError: (e: Error) => alert.info('Archive failed', e.message ?? 'Please try again.'),
  });

  async function confirmArchive() {
    if (selected.size === 0) return;
    const ok = await alert.confirm({
      title: `Archive ${selected.size}?`,
      message: 'They will no longer show up in dormant lists. Their form submissions stay in the record.',
      confirmLabel: 'Archive',
      destructive: true,
    });
    if (ok) archive.mutate();
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerBar}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ChevronLeft color={colors.ink} size={24} strokeWidth={1.5} />
        </Pressable>
        <Text style={styles.headerTitle}>Dormant attendees</Text>
        <View style={{ width: 24 }} />
      </View>

      <Text style={styles.subMeta}>
        Attendees captured from forms who never enrolled in the New Believers
        pipeline. Select and archive to declutter the list.
      </Text>

      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={rows.isFetching}
            onRefresh={() => rows.refetch()}
            tintColor={colors.primary}
          />
        }
      >
        {rows.isLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xxl }} />
        ) : list.length === 0 ? (
          <Card padding="lg" style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Users color={colors.primary} size={22} strokeWidth={1.5} />
            </View>
            <Text style={styles.emptyTitle}>All caught up</Text>
            <Text style={styles.emptyMeta}>
              No dormant attendees to review right now.
            </Text>
          </Card>
        ) : (
          list.map((a) => {
            const isSelected = selected.has(a.id);
            return (
              <Pressable key={a.id} onPress={() => toggle(a.id)}>
                <Card
                  padding="md"
                  style={[styles.row, isSelected && styles.rowSelected]}
                >
                  <View style={[styles.check, isSelected && styles.checkOn]}>
                    {isSelected ? (
                      <Check color="#ffffff" size={12} strokeWidth={2.5} />
                    ) : null}
                  </View>
                  <Avatar size="sm" firstName={a.firstName} lastName={a.lastName} />
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={styles.name}>
                      {a.firstName} {a.lastName}
                    </Text>
                    <Text style={styles.meta}>
                      {a.phone ?? '—'} · captured {formatShortDate(a.createdAt)}
                    </Text>
                  </View>
                  {a.hasEnrollment ? (
                    <Badge label="Enrolled" variant="success" size="sm" />
                  ) : null}
                </Card>
              </Pressable>
            );
          })
        )}
      </ScrollView>

      {selected.size > 0 ? (
        <View style={styles.footerBar}>
          <View style={{ flex: 1 }}>
            <Button
              label="Clear"
              variant="ghost"
              onPress={() => setSelected(new Set())}
              disabled={archive.isPending}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Button
              label={archive.isPending ? 'Archiving…' : `Archive ${selected.size}`}
              onPress={confirmArchive}
              loading={archive.isPending}
              iconLeft={<Archive color="#ffffff" size={14} strokeWidth={2} />}
            />
          </View>
        </View>
      ) : null}
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
  subMeta: {
    ...typography.meta,
    color: 'rgba(26,28,28,0.6)',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    lineHeight: 16,
  },
  container: {
    padding: spacing.lg,
    paddingBottom: 100,
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  rowSelected: { backgroundColor: 'rgba(93,63,211,0.06)' },
  check: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: 'rgba(26,28,28,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  name: { ...typography.body, color: colors.ink, fontWeight: '600' },
  meta: { ...typography.meta, color: 'rgba(26,28,28,0.6)' },
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
  emptyTitle: { ...typography.cardTitle, color: colors.ink },
  emptyMeta: {
    ...typography.body,
    color: 'rgba(26,28,28,0.6)',
    textAlign: 'center',
  },
  footerBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    backgroundColor: colors.cardLight,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(26,28,28,0.08)',
    flexDirection: 'row',
    gap: spacing.sm,
  },
});
