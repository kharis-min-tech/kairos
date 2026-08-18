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
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Users,
  Pencil,
  UserPlus,
  Handshake,
} from 'lucide-react-native';
import {
  Avatar,
  Badge,
  Card,
  gradients,
  radii,
  spacing,
  typography,
  useThemedStyles,
  type ThemeColors,
  useColors,
} from '@kairos/ui-native';
import { api } from '@/lib/api-client';
import { useCapabilities } from '@/lib/capabilities';
import { MemberPickerSheet } from '@/components/member-picker-sheet';

export default function DepartmentDetail() {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  const router = useRouter();
  const qc = useQueryClient();
  const caps = useCapabilities();
  const params = useLocalSearchParams<{ id: string }>();
  const id = params.id!;

  const department = useQuery({
    queryKey: ['departments', id],
    enabled: !!id,
    queryFn: async () => (await api.departments.get(id)).data ?? null,
  });

  const members = useQuery({
    queryKey: ['departments', id, 'members'],
    enabled: !!id,
    queryFn: async () => (await api.departments.members.list(id)).data ?? [],
  });

  const addMember = useMutation({
    mutationFn: async (memberId: string) =>
      (await api.departments.members.add(id, { memberId })).data!,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['departments', id, 'members'] });
      qc.invalidateQueries({ queryKey: ['departments', id] });
    },
  });

  const removeMember = useMutation({
    mutationFn: async (memberId: string) => {
      await api.departments.members.remove(id, memberId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['departments', id, 'members'] });
      qc.invalidateQueries({ queryKey: ['departments', id] });
    },
  });

  const [pickerOpen, setPickerOpen] = useState(false);

  const refresh = () => {
    department.refetch();
    members.refetch();
  };

  const d = department.data;

  const memberIds = useMemo(
    () => new Set((members.data ?? []).map((m) => m.memberId)),
    [members.data],
  );

  async function confirmRemoveMember(memberId: string, name: string) {
    const ok = await alert.confirm({
      title: 'Remove from department?',
      message: `Remove ${name} from this department. They keep their member record; only this department membership is ended.`,
      confirmLabel: 'Remove',
      destructive: true,
    });
    if (!ok) return;
    removeMember.mutate(memberId, {
      onError: (err) => {
        alert.info(
          'Remove failed',
          err instanceof Error ? err.message : 'Please try again in a moment.',
        );
      },
    });
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerBar}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ChevronLeft color={c.ink} size={24} strokeWidth={1.5} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {d?.departmentName ?? 'Department'}
        </Text>
        {d ? (
          <Pressable
            onPress={() => router.push(`/departments/edit/${d.id}`)}
            hitSlop={8}
            accessibilityLabel="Edit department"
          >
            <Pencil color={c.primary} size={20} strokeWidth={1.5} />
          </Pressable>
        ) : (
          <View style={{ width: 24 }} />
        )}
      </View>

      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={department.isFetching || members.isFetching}
            onRefresh={refresh}
            tintColor={c.primary}
          />
        }
      >
        {department.isLoading ? (
          <ActivityIndicator color={c.primary} style={{ marginTop: spacing.xxl }} />
        ) : null}

        {department.isError || (!department.isLoading && !d) ? (
          <Card padding="md">
            <Text style={styles.errorLine}>
              {department.error instanceof Error
                ? department.error.message
                : "Couldn't load this department."}
            </Text>
          </Card>
        ) : null}

        {d ? (
          <>
            <LinearGradient
              colors={gradients.brand}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.heroCard}
            >
              <Text style={styles.heroEyebrow}>DEPARTMENT</Text>
              <Text style={styles.heroTitle}>{d.departmentName}</Text>
              {d.branchName ? <Text style={styles.heroBranch}>{d.branchName}</Text> : null}
              {d.description ? (
                <Text style={styles.heroDescription}>{d.description}</Text>
              ) : null}

              <View style={styles.leadRow}>
                <View style={styles.leadBlock}>
                  <Avatar
                    size="sm"
                    photoUrl={d.leadPhotoUrl ?? undefined}
                    firstName={d.leadFirstName}
                    lastName={d.leadLastName}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.leadEyebrow}>LEAD</Text>
                    <Text style={styles.leadName}>
                      {d.leadFirstName} {d.leadLastName}
                    </Text>
                  </View>
                </View>
                {d.deputyFirstName ? (
                  <View style={styles.leadBlock}>
                    <Avatar
                      size="sm"
                      photoUrl={d.deputyPhotoUrl ?? undefined}
                      firstName={d.deputyFirstName ?? undefined}
                      lastName={d.deputyLastName ?? undefined}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.leadEyebrow}>DEPUTY</Text>
                      <Text style={styles.leadName}>
                        {d.deputyFirstName} {d.deputyLastName ?? ''}
                      </Text>
                    </View>
                  </View>
                ) : null}
              </View>
            </LinearGradient>

            {caps.has('department:write', { kind: 'department', id, branchId: d.branchId }) ? (
              <Pressable
                onPress={() => router.push(`/departments/${id}/recruitment` as never)}
                style={[
                  styles.rotaCard,
                  d.pendingJoinRequestCount ? styles.recruitPendingCard : null,
                ]}
              >
                <View style={styles.rotaIconTile}>
                  <Handshake color={c.primary} size={16} strokeWidth={1.5} />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={styles.rotaTitle}>Recruitment</Text>
                  <Text style={styles.rotaMeta}>
                    {d.pendingJoinRequestCount
                      ? `${d.pendingJoinRequestCount} awaiting review — interview → offer`
                      : 'Intake, interviews, offers, probation'}
                  </Text>
                </View>
                <ChevronRight color={c.inkVeryFaded} size={16} strokeWidth={1.5} />
              </Pressable>
            ) : null}

            {caps.has('department:write', { kind: 'department', id, branchId: d.branchId }) ? (
              <Pressable
                onPress={() => router.push(`/rota-admin/${id}` as never)}
                style={styles.rotaCard}
              >
                <View style={styles.rotaIconTile}>
                  <ClipboardList color={c.primary} size={16} strokeWidth={1.5} />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={styles.rotaTitle}>Rota</Text>
                  <Text style={styles.rotaMeta}>
                    Templates, generation, per-slot assignments
                  </Text>
                </View>
                <ChevronRight color={c.inkVeryFaded} size={16} strokeWidth={1.5} />
              </Pressable>
            ) : null}

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionIconTile}>
                  <Users color={c.primary} size={14} strokeWidth={1.5} />
                </View>
                <Text style={styles.sectionTitle}>Team</Text>
                <Badge
                  label={String(members.data?.length ?? 0)}
                  variant="neutral"
                  size="sm"
                />
                <Pressable
                  onPress={() => setPickerOpen(true)}
                  style={styles.addMemberBtn}
                  hitSlop={6}
                  accessibilityLabel="Add member"
                >
                  <UserPlus color={c.primary} size={16} strokeWidth={1.5} />
                </Pressable>
              </View>
              {members.isLoading ? (
                <ActivityIndicator color={c.primary} style={{ marginTop: spacing.sm }} />
              ) : (members.data ?? []).length === 0 ? (
                <Text style={styles.emptyLine}>No members recorded yet.</Text>
              ) : (
                <View style={styles.memberList}>
                  {(members.data ?? []).map((m) => (
                    <Pressable
                      key={m.id}
                      onPress={() => router.push(`/members/${m.memberId}`)}
                      onLongPress={() =>
                        confirmRemoveMember(
                          m.memberId,
                          `${m.memberFirstName} ${m.memberLastName}`,
                        )
                      }
                      delayLongPress={350}
                      style={styles.memberRow}
                    >
                      <Avatar
                        size="sm"
                        photoUrl={m.memberPhotoUrl ?? undefined}
                        firstName={m.memberFirstName}
                        lastName={m.memberLastName}
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.memberName} numberOfLines={1}>
                          {m.memberFirstName} {m.memberLastName}
                        </Text>
                      </View>
                      {m.membershipStatus === 'probation' ? (
                        <Badge label="Probation" variant="gold" size="sm" />
                      ) : null}
                    </Pressable>
                  ))}
                  <Text style={styles.longPressHint}>
                    Long-press a row to remove them from the department.
                  </Text>
                </View>
              )}
            </View>
          </>
        ) : null}
      </ScrollView>

      {d ? (
        <MemberPickerSheet
          open={pickerOpen}
          onClose={() => setPickerOpen(false)}
          branchId={d.branchId}
          excludeMemberIds={memberIds}
          onPick={(memberId) => {
            setPickerOpen(false);
            addMember.mutate(memberId, {
              onError: (err) => {
                alert.info(
                  'Add failed',
                  err instanceof Error ? err.message : 'Please try again in a moment.',
                );
              },
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
  heroCard: {
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  heroEyebrow: {
    ...typography.eyebrow,
    color: c.gold,
    letterSpacing: 1.2,
  },
  heroTitle: { ...typography.screenTitle, color: '#ffffff' },
  heroBranch: { ...typography.meta, color: 'rgba(255,255,255,0.75)' },
  heroDescription: {
    ...typography.body,
    color: 'rgba(255,255,255,0.85)',
    marginTop: spacing.sm,
    lineHeight: 20,
  },
  leadRow: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.2)',
    gap: spacing.sm,
  },
  leadBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  leadEyebrow: {
    ...typography.eyebrow,
    color: 'rgba(255,255,255,0.7)',
  },
  leadName: {
    ...typography.body,
    color: '#ffffff',
    fontWeight: '600',
  },
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
  memberList: { gap: spacing.xs },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: c.card,
    borderRadius: radii.md,
    padding: spacing.md,
  },
  memberName: { ...typography.body, color: c.ink },
  emptyLine: {
    ...typography.body,
    color: c.inkMuted,
    padding: spacing.md,
  },
  errorLine: {
    ...typography.body,
    color: c.danger,
  },
  addMemberBtn: {
    width: 28,
    height: 28,
    borderRadius: radii.sm,
    backgroundColor: 'rgba(93,63,211,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  longPressHint: {
    ...typography.meta,
    color: c.inkFaded,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  rotaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: c.card,
    borderRadius: radii.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(93,63,211,0.12)',
  },
  recruitPendingCard: {
    backgroundColor: 'rgba(248,181,55,0.08)',
    borderColor: 'rgba(248,181,55,0.35)',
  },
  rotaIconTile: {
    width: 36,
    height: 36,
    borderRadius: radii.sm,
    backgroundColor: 'rgba(93,63,211,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rotaTitle: { ...typography.body, color: c.ink, fontWeight: '700' },
  rotaMeta: { ...typography.meta, color: c.inkMuted },
});
}

