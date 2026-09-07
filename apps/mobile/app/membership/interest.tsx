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
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, Clock, Check, TriangleAlert } from 'lucide-react-native';
import {
  Card,
  Badge,
  Button,
  spacing,
  typography,
  useThemedStyles,
  type ThemeColors,
  useColors,
} from '@kairos/ui-native';
import { formatShortDate } from '@kairos/core';
import { CHURCH_SCOPE } from '@kairos/types';
import type { MembershipInterestStatus } from '@kairos/types';
import { api } from '@/lib/api-client';
import { alert } from '@/lib/alert';
import { useCapabilities, useRequireCapability } from '@/lib/capabilities';

const STATUSES: MembershipInterestStatus[] = ['waiting', 'admitted', 'lapsed', 'withdrawn'];

/**
 * The interest pool, on a phone: who is waiting, and admitting them.
 *
 * Enrolment is not self-service. People express interest, which puts them in
 * this church-wide pool belonging to no cohort, and an admin decides who goes
 * into which intake.
 *
 * Admission is a JUDGEMENT CALL, not a queue, which is why each row shows how
 * long somebody has waited AND how often they have actually turned up in the
 * last 90 days. Someone who signed up and then stopped attending for a season
 * should not roll into the next intake just for being top of the list;
 * entries lapse on their own so that is the default rather than something an
 * admin has to remember.
 */
export default function MembershipInterestScreen() {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  const router = useRouter();
  const qc = useQueryClient();
  const caps = useCapabilities();

  const isAdmin = caps.has('membership:admin', CHURCH_SCOPE);
  useRequireCapability(isAdmin, '/membership');

  const [status, setStatus] = useState<MembershipInterestStatus>('waiting');
  const [selected, setSelected] = useState<string[]>([]);
  const [cohortId, setCohortId] = useState('');

  const pool = useQuery({
    queryKey: ['membership', 'interest', status],
    queryFn: async () => (await api.membership.interest.list({ status })).data?.interest ?? [],
    enabled: isAdmin,
  });

  // Only cohorts that can actually take people. The API refuses admission
  // into a completed or closed cohort, so offering one here would only
  // produce a confusing failure after names have been picked.
  const cohorts = useQuery({
    queryKey: ['membership', 'cohorts', 'open'],
    queryFn: async () =>
      (await api.membership.cohorts.list({ enrolmentOpen: true })).data?.cohorts ?? [],
    enabled: isAdmin,
  });

  const openCohorts = useMemo(
    () =>
      (cohorts.data ?? []).filter((x) => x.status !== 'completed' && x.status !== 'cancelled'),
    [cohorts.data],
  );

  const admit = useMutation({
    mutationFn: async () =>
      (await api.membership.cohorts.admit(cohortId, { memberIds: selected })).data!,
    onSuccess: (created) => {
      setSelected([]);
      void qc.invalidateQueries({ queryKey: ['membership'] });
      alert.info(
        'Admitted',
        `${created.length} ${created.length === 1 ? 'person' : 'people'} placed in the cohort.`,
      );
    },
    onError: (e: unknown) =>
      alert.info('Could not admit', e instanceof Error ? e.message : 'Please try again.'),
  });

  if (!isAdmin) return null;

  const rows = pool.data ?? [];
  const selectable = status === 'waiting';

  function toggle(memberId: string) {
    setSelected((prev) =>
      prev.includes(memberId) ? prev.filter((x) => x !== memberId) : [...prev, memberId],
    );
  }

  function changeStatus(next: MembershipInterestStatus) {
    // A row that scrolls out of the current filter must not stay silently
    // selected underneath it.
    setSelected([]);
    setStatus(next);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerBar}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ChevronLeft color={c.ink} size={24} strokeWidth={1.5} />
        </Pressable>
        <Text style={styles.headerTitle}>Interest pool</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.chipRow}>
        {STATUSES.map((s) => (
          <Pressable
            key={s}
            onPress={() => changeStatus(s)}
            style={[styles.chip, status === s && styles.chipActive]}
            accessibilityRole="button"
            accessibilityState={{ selected: status === s }}
          >
            <Text style={[styles.chipLabel, status === s && styles.chipLabelActive]}>{s}</Text>
          </Pressable>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={pool.isFetching}
            onRefresh={() => void pool.refetch()}
            tintColor={c.primary}
          />
        }
      >
        <Text style={styles.blurb}>
          Nobody enters a cohort on their own. Pick who goes into the next intake. Entries
          lapse after six months, so somebody who has been away for a season drops off
          rather than rolling forward.
        </Text>

        {selectable && openCohorts.length === 0 ? (
          <Card style={styles.warnCard}>
            <View style={styles.metaRow}>
              <TriangleAlert color={c.danger} size={16} strokeWidth={1.6} />
              <Text style={styles.metaText}>
                No cohort is open to admissions. Create one on the web dashboard first.
              </Text>
            </View>
          </Card>
        ) : null}

        {pool.isLoading ? (
          <ActivityIndicator color={c.primary} style={{ marginTop: spacing.xxl }} />
        ) : rows.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>
              {status === 'waiting' ? 'Nobody is waiting' : `No ${status} entries`}
            </Text>
          </View>
        ) : (
          rows.map((row) => {
            const isSelected = selected.includes(row.memberId);
            // The signal that matters at admission time. Somebody who has not
            // been at a service in three months is the case the lapse rule
            // exists for, so say it plainly rather than showing a bare zero.
            const absent = row.recentAttendanceCount === 0;

            return (
              <Pressable
                key={row.id}
                onPress={() => (selectable ? toggle(row.memberId) : undefined)}
                disabled={!selectable}
                accessibilityRole={selectable ? 'checkbox' : undefined}
                accessibilityState={selectable ? { checked: isSelected } : undefined}
                accessibilityLabel={`${row.memberFirstName} ${row.memberLastName}`}
              >
                <Card style={[styles.card, isSelected && styles.cardSelected]}>
                  <View style={styles.cardHead}>
                    <Text style={styles.cardTitle}>
                      {row.memberFirstName} {row.memberLastName}
                    </Text>
                    {isSelected ? (
                      <Check color={c.primary} size={18} strokeWidth={2} />
                    ) : null}
                  </View>

                  <Text style={styles.metaText}>{row.branchName ?? 'No home branch'}</Text>

                  <View style={styles.metaRow}>
                    <Clock color={c.inkFaded} size={14} strokeWidth={1.5} />
                    <Text style={styles.metaText}>
                      Waiting {row.waitingDays} {row.waitingDays === 1 ? 'day' : 'days'}
                    </Text>
                  </View>

                  <View style={styles.badgeRow}>
                    {row.recentAttendanceCount === null ? null : (
                      <Badge
                        label={
                          absent
                            ? 'Not seen in 90 days'
                            : `${row.recentAttendanceCount} services in 90 days`
                        }
                        variant={absent ? 'danger' : 'neutral'}
                        size="sm"
                      />
                    )}
                    {row.status === 'waiting' ? (
                      <Text style={styles.metaText}>
                        Lapses {formatShortDate(row.expiresAt)}
                      </Text>
                    ) : row.status === 'admitted' && row.admittedAt ? (
                      <Text style={styles.metaText}>
                        Admitted {formatShortDate(row.admittedAt)}
                      </Text>
                    ) : null}
                  </View>
                </Card>
              </Pressable>
            );
          })
        )}
      </ScrollView>

      {selectable && selected.length > 0 ? (
        <View style={styles.actionBar}>
          <Text style={styles.actionCount}>
            {selected.length} selected · admit into
          </Text>
          <View style={styles.cohortPicker}>
            {openCohorts.map((co) => (
              <Pressable
                key={co.id}
                onPress={() => setCohortId(co.id)}
                style={[styles.chip, cohortId === co.id && styles.chipActive]}
                accessibilityRole="button"
                accessibilityState={{ selected: cohortId === co.id }}
              >
                <Text style={[styles.chipLabel, cohortId === co.id && styles.chipLabelActive]}>
                  {co.name}
                </Text>
              </Pressable>
            ))}
          </View>
          <Button
            label={admit.isPending ? 'Admitting…' : 'Admit'}
            onPress={() => {
              if (!cohortId) {
                alert.info('Pick a cohort', 'Choose which intake to admit them into.');
                return;
              }
              admit.mutate();
            }}
            disabled={admit.isPending || !cohortId}
          />
        </View>
      ) : null}
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
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    headerTitle: { ...typography.screenTitle, color: c.ink },
    chipRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.xs,
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.sm,
    },
    chip: {
      paddingHorizontal: spacing.sm,
      paddingVertical: 6,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: c.divider,
    },
    chipActive: { backgroundColor: c.primary, borderColor: c.primary },
    chipLabel: { ...typography.meta, color: c.inkMuted, textTransform: 'capitalize' },
    chipLabelActive: { color: c.onPrimary },
    container: { padding: spacing.md, gap: spacing.sm },
    blurb: { ...typography.meta, color: c.inkMuted },
    card: { gap: 4, padding: spacing.md },
    cardSelected: { borderColor: c.primary, borderWidth: 1 },
    warnCard: { padding: spacing.md, borderColor: c.divider, borderWidth: 1 },
    cardHead: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.sm,
    },
    cardTitle: { ...typography.body, color: c.ink, fontWeight: '600', flex: 1 },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    badgeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: spacing.xs,
      marginTop: 2,
    },
    metaText: { ...typography.meta, color: c.inkMuted, flexShrink: 1 },
    empty: { alignItems: 'center', gap: spacing.xs, paddingVertical: spacing.xxl },
    emptyTitle: { ...typography.body, color: c.ink, fontWeight: '600' },
    actionBar: {
      gap: spacing.sm,
      padding: spacing.md,
      borderTopWidth: 1,
      borderTopColor: c.divider,
      backgroundColor: c.card,
    },
    actionCount: { ...typography.meta, color: c.ink, fontWeight: '600' },
    cohortPicker: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  });
}
