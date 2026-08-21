import { useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ChevronLeft,
  Check,
  Calendar,
  X as XIcon,
  UserMinus,
  ChevronRight,
} from 'lucide-react-native';
import {
  Avatar,
  Badge,
  Button,
  Card,
  radii,
  spacing,
  typography,
  useThemedStyles,
  type ThemeColors,
  useColors,
} from '@kairos/ui-native';
import { formatShortDate } from '@kairos/core';
import type {
  RotaAssignmentWithDetails,
  RotaPoolMemberWithDetails,
} from '@kairos/types';
import { api } from '@/lib/api-client';
import { useCapabilities, useRequireCapability } from '@/lib/capabilities';
import { alert } from '@/lib/alert';

const STATUS_TONE: Record<string, 'primary' | 'success' | 'gold' | 'danger' | 'neutral'> = {
  Assigned: 'primary',
  Confirmed: 'success',
  Declined: 'danger',
  Swapped: 'gold',
  Open: 'neutral',
};

export default function RotaInstanceDetail() {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  const router = useRouter();
  const { branchDeptId, instanceId } = useLocalSearchParams<{
    branchDeptId: string;
    instanceId: string;
  }>();
  const qc = useQueryClient();

  const instance = useQuery({
    queryKey: ['rota', 'instance', instanceId],
    enabled: !!branchDeptId && !!instanceId,
    queryFn: async () =>
      (await api.departments.rota.getInstance(branchDeptId!, instanceId!)).data!,
  });

  const dept = useQuery({
    queryKey: ['branch-dept', branchDeptId],
    enabled: !!branchDeptId,
    queryFn: async () => (await api.departments.get(branchDeptId!)).data!,
  });

  const caps = useCapabilities();
  const canAccess =
    !dept.data
      ? true
      : caps.systemRole === 'admin' ||
        caps.has('department:write', {
          kind: 'department',
          id: branchDeptId!,
          branchId: dept.data.branchId,
        }) ||
        caps.has('branch:write', { kind: 'branch', id: dept.data.branchId });
  useRequireCapability(canAccess);

  const templateId = instance.data?.templateId;
  const pool = useQuery({
    queryKey: ['rota', 'pool', templateId],
    enabled: !!templateId,
    queryFn: async () =>
      (await api.departments.rota.listPool(branchDeptId!, templateId!)).data ?? [],
  });

  const [assigning, setAssigning] = useState<RotaAssignmentWithDetails | null>(null);

  const updateAssignment = useMutation({
    mutationFn: async ({
      assignmentId,
      memberId,
    }: {
      assignmentId: string;
      memberId: string | null;
    }) => {
      const res = await api.departments.rota.updateAssignment(
        branchDeptId!,
        instanceId!,
        assignmentId,
        {
          memberId,
          status: memberId ? 'Assigned' : 'Open',
        },
      );
      if (!res.success) throw new Error(res.message ?? 'Update failed');
      return res.data!;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rota', 'instance', instanceId] });
      qc.invalidateQueries({ queryKey: ['rota', 'instances'] });
      setAssigning(null);
    },
    onError: (e: Error) =>
      alert.info('Update failed', e.message ?? 'Please try again.'),
  });

  const regenerate = useMutation({
    mutationFn: async () => {
      const ok = await alert.confirm({
        title: 'Regenerate this instance?',
        message:
          'Assignments will be recomputed from the pool by rotation. Manual tweaks on this instance will be lost.',
        confirmLabel: 'Regenerate',
        destructive: true,
      });
      if (!ok) throw new Error('cancelled');
      const res = await api.departments.rota.regenerateInstance(
        branchDeptId!,
        instanceId!,
      );
      if (!res.success) throw new Error(res.message ?? 'Regenerate failed');
      return res.data!;
    },
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ['rota', 'instance', instanceId] });
      alert.info(
        'Regenerated',
        `${r.assignmentCount} assignments, ${r.openSlotCount} open slots.`,
      );
    },
    onError: (e: Error) => {
      if (e.message === 'cancelled') return;
      alert.info('Regenerate failed', e.message ?? 'Please try again.');
    },
  });

  const publish = useMutation({
    mutationFn: async (nextStatus: 'Published' | 'Draft') => {
      const res = await api.departments.rota.updateInstanceStatus(
        branchDeptId!,
        instanceId!,
        { status: nextStatus },
      );
      if (!res.success) throw new Error(res.message ?? 'Status change failed');
      return res.data!;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rota', 'instance', instanceId] });
      qc.invalidateQueries({ queryKey: ['rota', 'instances'] });
    },
    onError: (e: Error) =>
      alert.info('Status change failed', e.message ?? 'Please try again.'),
  });

  const assignments = useMemo(() => {
    const rows = instance.data?.assignments ?? [];
    return rows.slice().sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  }, [instance.data?.assignments]);

  const loading = instance.isLoading;
  const status = instance.data?.status;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerBar}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ChevronLeft color={c.ink} size={24} strokeWidth={1.5} />
        </Pressable>
        <Text style={styles.headerTitle}>Rota instance</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={instance.isFetching || pool.isFetching}
            onRefresh={() => {
              instance.refetch();
              pool.refetch();
            }}
            tintColor={c.primary}
          />
        }
      >
        {loading ? (
          <ActivityIndicator color={c.primary} style={{ marginTop: spacing.xxl }} />
        ) : !instance.data ? (
          <Text style={styles.emptyText}>Instance not found.</Text>
        ) : (
          <>
            <Card padding="md" style={{ gap: spacing.sm }}>
              <View style={styles.identityRow}>
                <View style={styles.dateTile}>
                  <Text style={styles.dateTileMonth}>
                    {new Date(instance.data.serviceDate)
                      .toLocaleDateString('en-GB', { month: 'short' })
                      .toUpperCase()}
                  </Text>
                  <Text style={styles.dateTileDay}>
                    {new Date(instance.data.serviceDate).getDate()}
                  </Text>
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={styles.title}>
                    {formatShortDate(instance.data.serviceDate)}
                  </Text>
                  <View style={styles.metaLine}>
                    <Calendar color={c.inkMuted} size={12} strokeWidth={1.5} />
                    <Text style={styles.metaText}>
                      {assignments.filter((a) => a.memberId).length}/{assignments.length}{' '}
                      slots filled
                    </Text>
                  </View>
                </View>
                <Badge
                  label={status ?? 'Draft'}
                  variant={status === 'Published' ? 'success' : 'gold'}
                  size="sm"
                />
              </View>

              <View style={styles.actionRow}>
                <View style={{ flex: 1 }}>
                  <Button
                    label={status === 'Published' ? 'Unpublish' : 'Publish'}
                    variant={status === 'Published' ? 'ghost' : 'primary'}
                    size="sm"
                    loading={publish.isPending}
                    onPress={() =>
                      publish.mutate(status === 'Published' ? 'Draft' : 'Published')
                    }
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Button
                    label="Regenerate"
                    variant="secondary"
                    size="sm"
                    loading={regenerate.isPending}
                    onPress={() => regenerate.mutate()}
                  />
                </View>
              </View>
            </Card>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Assignments</Text>
              {assignments.length === 0 ? (
                <Card padding="md">
                  <Text style={styles.emptyText}>
                    No slots on this instance yet.
                  </Text>
                </Card>
              ) : (
                assignments.map((a) => (
                  <AssignmentRow
                    key={a.id}
                    row={a}
                    onPress={() => setAssigning(a)}
                    onClear={
                      a.memberId
                        ? () =>
                            updateAssignment.mutate({
                              assignmentId: a.id,
                              memberId: null,
                            })
                        : undefined
                    }
                  />
                ))
              )}
            </View>
          </>
        )}
      </ScrollView>

      {assigning ? (
        <PoolPickerSheet
          slotRoleName={assigning.roleName}
          currentMemberId={assigning.memberId}
          pool={pool.data ?? []}
          loading={pool.isLoading}
          onCancel={() => setAssigning(null)}
          onPick={(memberId) =>
            updateAssignment.mutate({
              assignmentId: assigning.id,
              memberId,
            })
          }
          submitting={updateAssignment.isPending}
        />
      ) : null}
    </SafeAreaView>
  );
}

function AssignmentRow({
  row,
  onPress,
  onClear,
}: {
  row: RotaAssignmentWithDetails;
  onPress: () => void;
  onClear?: () => void;
}) {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  const tone = STATUS_TONE[row.status] ?? 'neutral';
  return (
    <Card padding="md" style={styles.assignRow}>
      <View style={styles.roleTile}>
        <Text style={styles.roleTileLabel} numberOfLines={2}>
          {row.roleName}
        </Text>
      </View>
      <View style={{ flex: 1 }}>
        {row.memberId ? (
          <View style={styles.memberChunk}>
            <Avatar
              size="sm"
              photoUrl={row.memberPhotoUrl ?? undefined}
              firstName={row.memberFirstName ?? undefined}
              lastName={row.memberLastName ?? undefined}
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.memberName} numberOfLines={1}>
                {row.memberFirstName} {row.memberLastName}
              </Text>
              <Badge label={row.status} variant={tone} size="sm" />
            </View>
          </View>
        ) : (
          <Text style={styles.openLabel}>Open — tap to assign</Text>
        )}
      </View>
      <View style={styles.rowActions}>
        <Pressable onPress={onPress} hitSlop={6} style={styles.rowActionBtn}>
          <ChevronRight color={c.primary} size={18} strokeWidth={1.5} />
        </Pressable>
        {onClear ? (
          <Pressable onPress={onClear} hitSlop={6} style={styles.rowActionBtn}>
            <UserMinus color={c.inkFaded} size={14} strokeWidth={1.5} />
          </Pressable>
        ) : null}
      </View>
    </Card>
  );
}

function PoolPickerSheet({
  slotRoleName,
  currentMemberId,
  pool,
  loading,
  onCancel,
  onPick,
  submitting,
}: {
  slotRoleName: string;
  currentMemberId: string | null;
  pool: RotaPoolMemberWithDetails[];
  loading: boolean;
  onCancel: () => void;
  onPick: (memberId: string) => void;
  submitting: boolean;
}) {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  const sorted = useMemo(
    () =>
      pool
        .slice()
        .sort((a, b) => a.memberLastName.localeCompare(b.memberLastName)),
    [pool],
  );
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onCancel}>
      <Pressable style={styles.backdrop} onPress={submitting ? undefined : onCancel}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>Assign to {slotRoleName}</Text>
          <Text style={styles.sheetHint}>
            Pick from this template&apos;s pool. Preferred-role first, then
            others.
          </Text>

          {loading ? (
            <ActivityIndicator
              color={c.primary}
              style={{ marginVertical: spacing.md }}
            />
          ) : sorted.length === 0 ? (
            <Text style={styles.emptyText}>
              No pool members yet. Add them from web.
            </Text>
          ) : (
            <ScrollView style={{ maxHeight: 380 }}>
              {sorted
                .slice()
                .sort((a, b) => {
                  const aPref = a.preferredRoleName === slotRoleName ? 0 : 1;
                  const bPref = b.preferredRoleName === slotRoleName ? 0 : 1;
                  return aPref - bPref;
                })
                .map((m) => {
                  const active = m.memberId === currentMemberId;
                  const preferred = m.preferredRoleName === slotRoleName;
                  return (
                    <Pressable
                      key={m.id}
                      onPress={() => onPick(m.memberId)}
                      style={[styles.poolRow, active && styles.poolRowActive]}
                    >
                      <Avatar
                        size="sm"
                        photoUrl={m.memberPhotoUrl ?? undefined}
                        firstName={m.memberFirstName}
                        lastName={m.memberLastName}
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.memberName}>
                          {m.memberFirstName} {m.memberLastName}
                        </Text>
                        {preferred ? (
                          <Text style={styles.poolPreferred}>Preferred role</Text>
                        ) : m.preferredRoleName ? (
                          <Text style={styles.poolOtherRole}>
                            Prefers {m.preferredRoleName}
                          </Text>
                        ) : null}
                      </View>
                      {active ? (
                        <Check color={c.primary} size={16} strokeWidth={2} />
                      ) : null}
                    </Pressable>
                  );
                })}
            </ScrollView>
          )}

          <Pressable
            style={styles.sheetCancel}
            onPress={onCancel}
            disabled={submitting}
          >
            <XIcon color={c.inkMuted} size={14} strokeWidth={1.5} />
            <Text style={styles.sheetCancelLabel}>Cancel</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
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
  container: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  emptyText: {
    ...typography.body,
    color: c.inkMuted,
    textAlign: 'center',
    padding: spacing.md,
  },

  identityRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  dateTile: {
    width: 48,
    height: 48,
    borderRadius: radii.md,
    backgroundColor: 'rgba(93,63,211,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateTileMonth: {
    fontSize: 9,
    fontWeight: '700',
    color: c.primary,
    letterSpacing: 0.8,
  },
  dateTileDay: {
    fontSize: 20,
    fontWeight: '700',
    color: c.primary,
    lineHeight: 22,
  },
  title: { ...typography.cardTitle, color: c.ink },
  metaLine: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { ...typography.meta, color: c.inkMuted },

  actionRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },

  section: { gap: spacing.sm },
  sectionTitle: {
    ...typography.eyebrow,
    color: c.inkMuted,
    paddingHorizontal: spacing.xs,
  },

  assignRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  roleTile: {
    width: 72,
    minHeight: 40,
    borderRadius: radii.sm,
    backgroundColor: c.subtle,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
  roleTileLabel: {
    ...typography.meta,
    color: c.ink,
    fontWeight: '700',
    textAlign: 'center',
  },
  memberChunk: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  memberName: { ...typography.body, color: c.ink, fontWeight: '600' },
  openLabel: { ...typography.body, color: c.primary, fontWeight: '600' },
  rowActions: { flexDirection: 'column', gap: spacing.xs, alignItems: 'flex-end' },
  rowActionBtn: {
    width: 28,
    height: 28,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.subtle,
  },

  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: c.card,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: c.inkGhost,
    marginBottom: spacing.sm,
  },
  sheetTitle: { ...typography.cardTitle, color: c.ink },
  sheetHint: {
    ...typography.meta,
    color: c.inkMuted,
    marginBottom: spacing.sm,
    lineHeight: 16,
  },
  poolRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.md,
  },
  poolRowActive: { backgroundColor: 'rgba(93,63,211,0.08)' },
  poolPreferred: { ...typography.meta, color: c.success, fontWeight: '600' },
  poolOtherRole: { ...typography.meta, color: c.inkMuted },
  sheetCancel: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
  },
  sheetCancelLabel: { ...typography.button, color: c.inkMuted },
});
}

