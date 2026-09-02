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
import { alert } from '@/lib/alert';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ChevronLeft,
  ShieldCheck,
  UserPlus,
  User as UserIcon,
} from 'lucide-react-native';
import {
  Avatar,
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
import { api } from '@/lib/api-client';
import { MemberPickerSheet } from '@/components/member-picker-sheet';

export default function BranchRoles() {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  const router = useRouter();
  const qc = useQueryClient();
  const params = useLocalSearchParams<{ id: string }>();
  const branchId = params.id!;

  const branch = useQuery({
    queryKey: ['branches', branchId],
    enabled: !!branchId,
    queryFn: async () => (await api.branches.get(branchId)).data ?? null,
  });

  const assignments = useQuery({
    queryKey: ['branches', branchId, 'roles'],
    enabled: !!branchId,
    queryFn: async () => (await api.branchRoles.list(branchId)).data ?? [],
  });

  const assign = useMutation({
    mutationFn: (memberId: string) =>
      api.branchRoles.assign(branchId, { memberId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['branches', branchId, 'roles'] });
    },
  });

  const revoke = useMutation({
    mutationFn: (assignmentId: string) =>
      api.branchRoles.revoke(branchId, assignmentId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['branches', branchId, 'roles'] });
    },
  });

  const [pickerOpen, setPickerOpen] = useState(false);

  const activeAssignments = useMemo(
    () => (assignments.data ?? []).filter((a) => a.isActive),
    [assignments.data],
  );

  const activeMemberIds = useMemo(
    () => new Set(activeAssignments.map((a) => a.memberId)),
    [activeAssignments],
  );

  async function confirmRevoke(assignmentId: string, name: string) {
    const ok = await alert.confirm({
      title: 'Revoke branch admin?',
      message: `Remove ${name} as a Branch System Admin. They keep their member record and any other roles.`,
      confirmLabel: 'Revoke',
      destructive: true,
    });
    if (!ok) return;
    revoke.mutate(assignmentId, {
      onError: (err) =>
        alert.info(
          'Revoke failed',
          err instanceof Error ? err.message : 'Please try again.',
        ),
    });
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerBar}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ChevronLeft color={c.ink} size={24} strokeWidth={1.5} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          Branch admins
        </Text>
        <Pressable
          onPress={() => setPickerOpen(true)}
          hitSlop={8}
          accessibilityLabel="Add branch admin"
        >
          <UserPlus color={c.primary} size={22} strokeWidth={1.5} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={assignments.isRefetching || branch.isFetching}
            onRefresh={() => {
              assignments.refetch();
              branch.refetch();
            }}
            tintColor={c.primary}
          />
        }
      >
        {branch.data ? (
          <View style={styles.introBlock}>
            <Text style={styles.introTitle}>{branch.data.branchName}</Text>
            <Text style={styles.introMeta}>
              Branch System Admins can invite members, edit branch settings, assign
              other roles, and manage this branch&apos;s data end-to-end.
            </Text>
          </View>
        ) : null}

        {assignments.isLoading ? (
          <ActivityIndicator color={c.primary} style={{ marginVertical: spacing.xl }} />
        ) : null}

        {assignments.isError ? (
          <Card padding="md">
            <Text style={styles.errorLine}>
              Couldn&apos;t load role assignments:{' '}
              {assignments.error instanceof Error
                ? assignments.error.message
                : 'Unknown error'}
            </Text>
          </Card>
        ) : null}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconTile}>
              <ShieldCheck color={c.primary} size={14} strokeWidth={1.5} />
            </View>
            <Text style={styles.sectionTitle}>Branch System Admins</Text>
            <Badge label={String(activeAssignments.length)} variant="neutral" size="sm" />
          </View>

          {activeAssignments.length === 0 && !assignments.isLoading ? (
            <Card padding="md" style={styles.emptyCard}>
              <View style={styles.emptyIconTile}>
                <UserIcon color={c.primary} size={22} strokeWidth={1.5} />
              </View>
              <Text style={styles.emptyTitle}>No branch admins yet</Text>
              <Text style={styles.emptyMeta}>
                Tap the + in the header to promote a member. At least one Branch System
                Admin per branch is recommended.
              </Text>
            </Card>
          ) : (
            <Card padding="md" style={{ gap: spacing.xs }}>
              {activeAssignments.map((a, idx) => (
                <Pressable
                  key={a.id}
                  onPress={() => router.push(`/members/${a.memberId}`)}
                  onLongPress={() =>
                    confirmRevoke(
                      a.id,
                      `${a.member.firstName} ${a.member.lastName}`,
                    )
                  }
                  delayLongPress={350}
                  style={[styles.adminRow, idx > 0 ? styles.rowDivider : null]}
                >
                  <Avatar
                    size="sm"
                    firstName={a.member.firstName}
                    lastName={a.member.lastName}
                  />
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={styles.memberName} numberOfLines={1}>
                      {a.member.firstName} {a.member.lastName}
                    </Text>
                    <Text style={styles.memberMeta} numberOfLines={1}>
                      {a.member.email}
                    </Text>
                    <Text style={styles.assignedLabel}>
                      Since {formatShortDate(a.assignedDate)}
                    </Text>
                  </View>
                  <Badge label={a.roleName} variant="primary" size="sm" />
                </Pressable>
              ))}
              <Text style={styles.longPressHint}>
                Long-press a row to revoke.
              </Text>
            </Card>
          )}
        </View>

        <Text style={styles.footnote}>
          Only existing Branch System Admins (and platform admins) can assign or revoke
          this role. The API enforces a last-active-admin lockout guard: the final BSA
          for a branch can&apos;t be revoked until another is promoted.
        </Text>
      </ScrollView>

      {branch.data ? (
        <MemberPickerSheet
          open={pickerOpen}
          onClose={() => setPickerOpen(false)}
          branchId={branch.data.id}
          excludeMemberIds={activeMemberIds}
          title="Promote a member"
          subtitle="Pick a member from this branch to make them a Branch System Admin."
          onPick={(memberId) => {
            setPickerOpen(false);
            assign.mutate(memberId, {
              onError: (err) =>
                alert.info(
                  'Assign failed',
                  err instanceof Error ? err.message : 'Please try again.',
                ),
            });
          }}
        />
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
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  headerTitle: { ...typography.cardTitle, color: c.ink, flex: 1, textAlign: 'center' },
  container: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  introBlock: { gap: 4 },
  introTitle: { ...typography.screenTitle, color: c.ink },
  introMeta: { ...typography.body, color: c.inkMuted, lineHeight: 20 },
  section: { gap: spacing.sm },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sectionIconTile: {
    width: 24,
    height: 24,
    borderRadius: radii.sm,
    backgroundColor: 'rgba(93,63,211,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: { ...typography.cardTitle, color: c.ink, flex: 1 },
  adminRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  rowDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.divider,
  },
  memberName: { ...typography.body, color: c.ink, fontWeight: '600' },
  memberMeta: { ...typography.meta, color: c.inkMuted },
  assignedLabel: {
    ...typography.meta,
    color: c.inkFaded,
    fontSize: 10,
  },
  longPressHint: {
    ...typography.meta,
    color: c.inkFaded,
    textAlign: 'center',
    marginTop: spacing.xs,
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
  footnote: {
    ...typography.meta,
    color: c.inkFaded,
    paddingHorizontal: spacing.xs,
    lineHeight: 15,
  },
});
}

