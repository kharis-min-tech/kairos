import { useEffect, useMemo, useState } from 'react';
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
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, Check, X, Calendar, MapPin, User } from 'lucide-react-native';
import {
  Avatar,
  Button,
  Card,
  colors,
  radii,
  spacing,
  typography,
} from '@kairos/ui-native';
import { formatShortDate } from '@kairos/core';
import type { NewBelieverEnrollmentWithMember } from '@kairos/types';
import { api } from '@/lib/api-client';
import { alert } from '@/lib/alert';

type Status = 'present' | 'absent' | null;

interface RosterRow {
  enrollmentId: string;
  memberId: string;
  firstName: string;
  lastName: string;
  photoUrl?: string | null;
  status: Status; // null = untouched
}

export default function NewBelieverSessionDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const qc = useQueryClient();

  // Session + roster + existing attendance load in parallel.
  const session = useQuery({
    queryKey: ['new-believers', 'sessions', id],
    enabled: !!id,
    queryFn: async () => {
      // list endpoint (no /sessions/:id) — filter by branch is fine for MVP;
      // scan for the id in the returned list.
      const res = await api.newBelievers.sessions.list();
      const all = res.data ?? [];
      return all.find((s) => s.id === id) ?? null;
    },
  });

  const enrolled = useQuery({
    queryKey: ['new-believers', 'enrollments', 'for-session', session.data?.branchId, session.data?.sessionStage],
    enabled: !!session.data?.branchId,
    queryFn: async () => {
      const res = await api.newBelievers.enrollments.list({
        branchId: session.data!.branchId,
        limit: 500,
      });
      return res.data?.data ?? [];
    },
  });

  const attendance = useQuery({
    queryKey: ['new-believers', 'attendance', id],
    enabled: !!id,
    queryFn: async () => (await api.newBelievers.sessions.getAttendance(id!)).data ?? [],
  });

  // Roster = enrolled students whose stage matches this session's stage.
  // Merge existing attendance rows to preload current state.
  const roster: RosterRow[] = useMemo(() => {
    if (!session.data || !enrolled.data) return [];
    const attendanceByEnrollment = new Map(
      (attendance.data ?? []).map((a) => [a.enrollmentId, a] as const),
    );
    return enrolled.data
      .filter((e: NewBelieverEnrollmentWithMember) => e.stage === session.data!.sessionStage && e.isActive)
      .map((e) => {
        const existing = attendanceByEnrollment.get(e.id);
        const status: Status = existing ? (existing.attended ? 'present' : 'absent') : null;
        return {
          enrollmentId: e.id,
          memberId: e.memberId,
          firstName: e.memberFirstName,
          lastName: e.memberLastName,
          status,
        };
      })
      .sort((a, b) =>
        a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName),
      );
  }, [session.data, enrolled.data, attendance.data]);

  const [pending, setPending] = useState<Record<string, Status>>({});

  // Reset pending when the server roster refreshes.
  useEffect(() => {
    setPending({});
  }, [roster.length, attendance.data]);

  const effectiveStatus = (row: RosterRow): Status =>
    pending[row.enrollmentId] !== undefined ? pending[row.enrollmentId] : row.status;

  function cycle(row: RosterRow) {
    // present → absent → untouched → present
    const now = effectiveStatus(row);
    const next: Status = now === 'present' ? 'absent' : now === 'absent' ? null : 'present';
    setPending((p) => ({ ...p, [row.enrollmentId]: next }));
  }

  const save = useMutation({
    mutationFn: async () => {
      const records: { enrollmentId: string; attended: boolean }[] = [];
      for (const row of roster) {
        const status = pending[row.enrollmentId];
        if (status === undefined || status === null) continue; // only push touched rows
        records.push({ enrollmentId: row.enrollmentId, attended: status === 'present' });
      }
      if (records.length === 0) return { recorded: 0 };
      return (await api.newBelievers.sessions.recordAttendance(id!, { records })).data ?? { recorded: 0 };
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['new-believers', 'attendance', id] });
      qc.invalidateQueries({ queryKey: ['new-believers', 'enrollment'] });
      setPending({});
      alert.info('Saved', `${res?.recorded ?? 0} attendance record${(res?.recorded ?? 0) === 1 ? '' : 's'} recorded.`);
    },
    onError: (e) =>
      alert.info('Save failed', e instanceof Error ? e.message : 'Please try again.'),
  });

  const dirty = Object.keys(pending).length > 0;
  const loading = session.isLoading || enrolled.isLoading || attendance.isLoading;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerBar}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ChevronLeft color={colors.ink} size={24} strokeWidth={1.5} />
        </Pressable>
        <Text style={styles.headerTitle}>Session</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={session.isFetching || enrolled.isFetching || attendance.isFetching}
            onRefresh={() => {
              session.refetch();
              enrolled.refetch();
              attendance.refetch();
            }}
            tintColor={colors.primary}
          />
        }
      >
        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xxl }} />
        ) : !session.data ? (
          <Text style={styles.emptyText}>Session not found.</Text>
        ) : (
          <>
            <Card padding="md" style={{ gap: spacing.sm }}>
              <Text style={styles.stageLabel}>{session.data.sessionStage.toUpperCase()}</Text>
              <Text style={styles.title}>{session.data.topic ?? 'Session'}</Text>
              <View style={styles.metaRow}>
                <View style={styles.metaItem}>
                  <Calendar color="rgba(26,28,28,0.55)" size={14} strokeWidth={1.5} />
                  <Text style={styles.metaText}>{formatShortDate(session.data.sessionDate)}</Text>
                </View>
                {session.data.location ? (
                  <View style={styles.metaItem}>
                    <MapPin color="rgba(26,28,28,0.55)" size={14} strokeWidth={1.5} />
                    <Text style={styles.metaText}>{session.data.location}</Text>
                  </View>
                ) : null}
                {session.data.teacherFirstName ? (
                  <View style={styles.metaItem}>
                    <User color="rgba(26,28,28,0.55)" size={14} strokeWidth={1.5} />
                    <Text style={styles.metaText}>
                      {session.data.teacherFirstName} {session.data.teacherLastName ?? ''}
                    </Text>
                  </View>
                ) : null}
              </View>
            </Card>

            <View style={styles.sectionBlock}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Attendance</Text>
                <Text style={styles.sectionMeta}>
                  {roster.length} enrolled at this stage · tap to cycle
                </Text>
              </View>

              {roster.length === 0 ? (
                <Card padding="md">
                  <Text style={styles.emptyText}>
                    No active enrollments at {session.data.sessionStage} in this branch.
                  </Text>
                </Card>
              ) : (
                roster.map((row) => (
                  <RosterRowView
                    key={row.enrollmentId}
                    row={row}
                    status={effectiveStatus(row)}
                    dirty={pending[row.enrollmentId] !== undefined}
                    onPress={() => cycle(row)}
                  />
                ))
              )}
            </View>
          </>
        )}
      </ScrollView>

      {dirty ? (
        <View style={styles.footerBar}>
          <View style={{ flex: 1 }}>
            <Button
              label="Discard"
              variant="ghost"
              onPress={() => setPending({})}
              disabled={save.isPending}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Button
              label={save.isPending ? 'Saving…' : `Save ${Object.keys(pending).length}`}
              onPress={() => save.mutate()}
              loading={save.isPending}
            />
          </View>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

function RosterRowView({
  row,
  status,
  dirty,
  onPress,
}: {
  row: RosterRow;
  status: Status;
  dirty: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress}>
      <Card padding="md" style={styles.rosterRow}>
        <Avatar size="sm" firstName={row.firstName} lastName={row.lastName} />
        <View style={{ flex: 1 }}>
          <Text style={styles.rosterName}>
            {row.firstName} {row.lastName}
          </Text>
          {dirty ? <Text style={styles.rosterDirty}>Unsaved</Text> : null}
        </View>
        <StatusPill status={status} />
      </Card>
    </Pressable>
  );
}

function StatusPill({ status }: { status: Status }) {
  if (status === 'present') {
    return (
      <View style={[styles.pill, styles.pillPresent]}>
        <Check color="#ffffff" size={14} strokeWidth={2.5} />
        <Text style={styles.pillLabel}>Present</Text>
      </View>
    );
  }
  if (status === 'absent') {
    return (
      <View style={[styles.pill, styles.pillAbsent]}>
        <X color="#ffffff" size={14} strokeWidth={2.5} />
        <Text style={styles.pillLabel}>Absent</Text>
      </View>
    );
  }
  return (
    <View style={[styles.pill, styles.pillEmpty]}>
      <Text style={styles.pillLabelEmpty}>Tap to mark</Text>
    </View>
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
  container: {
    padding: spacing.lg,
    paddingBottom: 120,
    gap: spacing.md,
  },
  emptyText: {
    ...typography.body,
    color: 'rgba(26,28,28,0.6)',
    textAlign: 'center',
  },

  stageLabel: {
    ...typography.eyebrow,
    color: colors.primary,
    letterSpacing: 1.2,
  },
  title: {
    ...typography.cardTitle,
    color: colors.ink,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    ...typography.meta,
    color: 'rgba(26,28,28,0.65)',
  },

  sectionBlock: { gap: spacing.sm },
  sectionHeader: {
    paddingHorizontal: spacing.xs,
    gap: 2,
  },
  sectionTitle: { ...typography.eyebrow, color: 'rgba(26,28,28,0.55)' },
  sectionMeta: { ...typography.meta, color: 'rgba(26,28,28,0.5)' },

  rosterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  rosterName: { ...typography.body, color: colors.ink, fontWeight: '500' },
  rosterDirty: { ...typography.meta, color: colors.goldDark, fontSize: 11 },

  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.pill,
  },
  pillPresent: { backgroundColor: colors.success },
  pillAbsent: { backgroundColor: colors.danger },
  pillEmpty: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(26,28,28,0.25)',
  },
  pillLabel: {
    ...typography.meta,
    color: '#ffffff',
    fontWeight: '600',
  },
  pillLabelEmpty: {
    ...typography.meta,
    color: 'rgba(26,28,28,0.5)',
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
