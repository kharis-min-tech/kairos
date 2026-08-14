import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Linking,
  Modal,
} from 'react-native';
import { alert } from '@/lib/alert';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ChevronLeft,
  Mail,
  Phone,
  MapPin,
  Calendar,
  UsersRound,
  Building2,
  Shield,
  BadgeCheck,
  ShieldAlert,
  Sparkles,
  Pencil,
  Check,
  X,
  UserX,
  UserCheck,
  Award,
  Settings,
  Plus,
  ChevronRight,
} from 'lucide-react-native';
import {
  Avatar,
  Badge,
  Card,
  colors,
  gradients,
  radii,
  spacing,
  typography,
} from '@kairos/ui-native';
import { api } from '@/lib/api-client';

function formatDate(iso: string | Date | null | undefined): string {
  if (!iso) return '—';
  const d = iso instanceof Date ? iso : new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default function MemberProfile() {
  const router = useRouter();
  const qc = useQueryClient();
  const params = useLocalSearchParams<{ id: string }>();
  const id = params.id!;

  const member = useQuery({
    queryKey: ['members', id],
    enabled: !!id,
    queryFn: async () => (await api.members.get(id)).data ?? null,
  });

  const approve = useMutation({
    mutationFn: (approved: boolean) => api.members.approve(id, { approved }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['members'] });
      qc.invalidateQueries({ queryKey: ['members', id] });
    },
  });

  const deactivate = useMutation({
    mutationFn: () => api.members.deactivate(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['members'] });
      qc.invalidateQueries({ queryKey: ['members', id] });
    },
  });

  const reactivate = useMutation({
    mutationFn: () => api.members.reactivate(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['members'] });
      qc.invalidateQueries({ queryKey: ['members', id] });
    },
  });

  const setClassComplete = useMutation({
    mutationFn: (completedAt: string | null) =>
      api.members.setMembershipClass(id, completedAt),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['members'] });
      qc.invalidateQueries({ queryKey: ['members', id] });
    },
  });

  async function confirmDeactivate(name: string) {
    const ok = await alert.confirm({
      title: 'Deactivate member?',
      message: `Deactivate ${name}. They lose access and stop appearing in the directory. You can reactivate them later.`,
      confirmLabel: 'Deactivate',
      destructive: true,
    });
    if (!ok) return;
    deactivate.mutate(undefined, {
      onError: (err) =>
        alert.info(
          'Deactivate failed',
          err instanceof Error ? err.message : 'Please try again.',
        ),
    });
  }

  async function confirmReject(name: string) {
    const ok = await alert.confirm({
      title: 'Reject signup?',
      message: `Reject ${name}'s signup. Their account stays but is marked rejected — a branch admin can undo this later.`,
      confirmLabel: 'Reject',
      destructive: true,
    });
    if (!ok) return;
    approve.mutate(false, {
      onError: (err) =>
        alert.info(
          'Reject failed',
          err instanceof Error ? err.message : 'Please try again.',
        ),
    });
  }

  function markClassComplete() {
    const iso = new Date().toISOString();
    setClassComplete.mutate(iso, {
      onError: (err) =>
        alert.info(
          'Save failed',
          err instanceof Error ? err.message : 'Please try again.',
        ),
    });
  }

  const assignRole = useMutation({
    mutationFn: (data: { roleId: string; branchId: string }) =>
      api.members.roles.assign(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['members', id, 'roles'] });
    },
  });

  const removeRole = useMutation({
    mutationFn: (assignmentId: string) => api.members.roles.remove(id, assignmentId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['members', id, 'roles'] });
    },
  });

  const [rolePickerOpen, setRolePickerOpen] = useState(false);

  async function confirmRemoveRole(
    assignmentId: string,
    roleName: string,
    branchName?: string,
  ) {
    const ok = await alert.confirm({
      title: 'Revoke role?',
      message: `Remove the ${roleName} role${branchName ? ` for ${branchName}` : ''}. The member keeps everything else.`,
      confirmLabel: 'Revoke',
      destructive: true,
    });
    if (!ok) return;
    removeRole.mutate(assignmentId, {
      onError: (err) =>
        alert.info(
          'Revoke failed',
          err instanceof Error ? err.message : 'Please try again.',
        ),
    });
  }

  const fellowships = useQuery({
    queryKey: ['fellowships', 'for-member', id],
    enabled: !!id,
    queryFn: async () => {
      const res = await api.fellowships.list({ memberId: id, limit: 10 });
      return res.data?.data ?? [];
    },
  });

  const departments = useQuery({
    queryKey: ['departments', 'for-member', id],
    enabled: !!id,
    queryFn: async () => {
      const res = await api.departments.list({ memberId: id, limit: 10 });
      return res.data?.data ?? [];
    },
  });

  const roles = useQuery({
    queryKey: ['members', id, 'roles'],
    enabled: !!id,
    queryFn: async () => (await api.members.roles.list(id)).data ?? [],
  });

  const refresh = () => {
    member.refetch();
    fellowships.refetch();
    departments.refetch();
    roles.refetch();
  };

  if (member.isLoading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.headerBar}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <ChevronLeft color={colors.ink} size={24} strokeWidth={1.5} />
          </Pressable>
          <Text style={styles.headerTitle}>Member</Text>
          <View style={{ width: 24 }} />
        </View>
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xxl }} />
      </SafeAreaView>
    );
  }

  if (member.isError || !member.data) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.headerBar}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <ChevronLeft color={colors.ink} size={24} strokeWidth={1.5} />
          </Pressable>
          <Text style={styles.headerTitle}>Member</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.centered}>
          <Text style={styles.errorTitle}>Couldn&apos;t load member</Text>
          <Text style={styles.errorMeta}>
            {member.error instanceof Error ? member.error.message : 'Please try again.'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const m = member.data;
  const fullName = `${m.honorific ? `${m.honorific} ` : ''}${m.firstName} ${m.lastName}`;
  const typeLabel =
    m.memberType === 'attendee'
      ? 'Attendee'
      : m.memberType === 'child'
        ? 'Child'
        : m.memberType === 'visitor'
          ? 'Visitor'
          : 'Member';
  const isConfirmed = !!m.membershipClassCompletedAt && m.memberType === 'member';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerBar}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ChevronLeft color={colors.ink} size={24} strokeWidth={1.5} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {m.firstName} {m.lastName}
        </Text>
        <Pressable
          onPress={() => router.push(`/members/edit/${m.id}`)}
          hitSlop={8}
          accessibilityLabel="Edit member"
        >
          <Pencil color={colors.primary} size={20} strokeWidth={1.5} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={
              member.isFetching || fellowships.isFetching || departments.isFetching
            }
            onRefresh={refresh}
            tintColor={colors.primary}
          />
        }
      >
        <LinearGradient
          colors={gradients.brand}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <Avatar
            size="lg"
            photoUrl={m.photoUrl ?? undefined}
            firstName={m.firstName}
            lastName={m.lastName}
          />
          <View style={styles.heroBadgeRow}>
            <View style={styles.heroBadgePill}>
              <Text style={styles.heroBadgePillLabel}>{typeLabel.toUpperCase()}</Text>
            </View>
            {isConfirmed ? (
              <View style={styles.heroBadgePillGold}>
                <BadgeCheck color={colors.gold} size={10} strokeWidth={2} />
                <Text style={styles.heroBadgePillGoldLabel}>CONFIRMED</Text>
              </View>
            ) : null}
            {m.redacted ? (
              <View style={styles.heroBadgePillRed}>
                <ShieldAlert color="#ffffff" size={10} strokeWidth={2} />
                <Text style={styles.heroBadgePillRedLabel}>PROTECTED</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.heroName}>{fullName}</Text>
          {m.branchName ? <Text style={styles.heroBranch}>{m.branchName}</Text> : null}
        </LinearGradient>

        {m.redacted ? (
          <Card padding="md" style={styles.redactedBanner}>
            <Shield color={colors.info} size={16} strokeWidth={1.5} />
            <Text style={styles.redactedLabel}>
              Contact details are redacted because this record is protected. Reach out to a
              branch admin if you need more information.
            </Text>
          </Card>
        ) : null}

        {!m.redacted &&
        (m.email || m.phone || m.address || m.city) ? (
          <Card padding="md" style={{ gap: spacing.sm }}>
            <Text style={styles.sectionEyebrow}>CONTACT</Text>
            {m.email ? (
              <Pressable
                onPress={() => Linking.openURL(`mailto:${m.email}`)}
                style={styles.contactRow}
              >
                <View style={styles.contactIconTile}>
                  <Mail color={colors.primary} size={16} strokeWidth={1.5} />
                </View>
                <Text style={styles.contactValue} numberOfLines={1}>
                  {m.email}
                </Text>
              </Pressable>
            ) : null}
            {m.phone ? (
              <Pressable
                onPress={() => Linking.openURL(`tel:${m.phone}`)}
                style={styles.contactRow}
              >
                <View style={styles.contactIconTile}>
                  <Phone color={colors.primary} size={16} strokeWidth={1.5} />
                </View>
                <Text style={styles.contactValue}>{m.phone}</Text>
              </Pressable>
            ) : null}
            {m.address || m.city ? (
              <Pressable
                onPress={() =>
                  Linking.openURL(
                    `https://maps.google.com/?q=${encodeURIComponent(
                      [m.address, m.city, m.postalCode].filter(Boolean).join(', '),
                    )}`,
                  )
                }
                style={styles.contactRow}
              >
                <View style={styles.contactIconTile}>
                  <MapPin color={colors.primary} size={16} strokeWidth={1.5} />
                </View>
                <Text style={styles.contactValue}>
                  {[m.address, m.city, m.postalCode].filter(Boolean).join(', ') || '—'}
                </Text>
              </Pressable>
            ) : null}
          </Card>
        ) : null}

        <Card padding="md" style={{ gap: spacing.sm }}>
          <Text style={styles.sectionEyebrow}>MEMBERSHIP</Text>
          <InfoRow
            icon={<Calendar color={colors.primary} size={14} strokeWidth={1.5} />}
            label="Member since"
            value={formatDate(m.membershipDate)}
          />
          {m.membershipClassCompletedAt ? (
            <InfoRow
              icon={<BadgeCheck color={colors.gold} size={14} strokeWidth={1.5} />}
              label="Class completed"
              value={formatDate(m.membershipClassCompletedAt)}
            />
          ) : null}
          {m.secondaryBranchId ? (
            <InfoRow
              icon={<Building2 color={colors.primary} size={14} strokeWidth={1.5} />}
              label="Secondary branch"
              value={m.isAtSecondaryBranch ? 'Currently visiting' : 'Registered'}
            />
          ) : null}
          {!m.redacted && m.dateOfBirth ? (
            <InfoRow
              icon={<Calendar color={colors.primary} size={14} strokeWidth={1.5} />}
              label="Date of birth"
              value={formatDate(m.dateOfBirth)}
            />
          ) : null}
        </Card>

        <Section title="Fellowships" icon={UsersRound} loading={fellowships.isLoading}>
          {(fellowships.data ?? []).length === 0 ? (
            <Text style={styles.emptyLine}>Not in any fellowships yet.</Text>
          ) : (
            (fellowships.data ?? []).map((f) => (
              <Pressable
                key={f.id}
                onPress={() => router.push(`/fellowships/${f.id}`)}
                style={styles.linkRow}
              >
                <Text style={styles.linkRowLabel}>{f.fellowshipName}</Text>
                {f.branchName ? (
                  <Text style={styles.linkRowMeta}>{f.branchName}</Text>
                ) : null}
              </Pressable>
            ))
          )}
        </Section>

        <Section title="Departments" icon={Building2} loading={departments.isLoading}>
          {(departments.data ?? []).length === 0 ? (
            <Text style={styles.emptyLine}>Not in any departments yet.</Text>
          ) : (
            (departments.data ?? []).map((d) => (
              <Pressable
                key={d.id}
                onPress={() => router.push(`/departments/${d.id}`)}
                style={styles.linkRow}
              >
                <Text style={styles.linkRowLabel}>{d.departmentName}</Text>
                {d.branchName ? (
                  <Text style={styles.linkRowMeta}>{d.branchName}</Text>
                ) : null}
              </Pressable>
            ))
          )}
        </Section>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconTile}>
              <Sparkles color={colors.primary} size={14} strokeWidth={1.5} />
            </View>
            <Text style={styles.sectionTitle}>Roles</Text>
            <Pressable
              onPress={() => setRolePickerOpen(true)}
              style={styles.addRoleBtn}
              hitSlop={6}
              accessibilityLabel="Add role"
            >
              <Plus color={colors.primary} size={16} strokeWidth={1.5} />
            </Pressable>
          </View>
          <Card padding="md" style={{ gap: spacing.xs }}>
            {roles.isLoading ? (
              <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.sm }} />
            ) : (roles.data ?? []).length === 0 ? (
              <Text style={styles.emptyLine}>No roles assigned. Tap + to add one.</Text>
            ) : (
              <>
                {(roles.data ?? []).map((r) => (
                  <Pressable
                    key={r.id}
                    onLongPress={() =>
                      confirmRemoveRole(r.id, r.roleName, r.branchName ?? undefined)
                    }
                    delayLongPress={350}
                    style={styles.roleRow}
                  >
                    <Badge label={r.roleName} variant="primary" size="sm" />
                    {r.branchName ? (
                      <Text style={styles.linkRowMeta}>{r.branchName}</Text>
                    ) : null}
                  </Pressable>
                ))}
                <Text style={styles.longPressHint}>
                  Long-press a role to revoke it.
                </Text>
              </>
            )}
          </Card>
        </View>

        {!m.redacted &&
        (m.emergencyContactName || m.emergencyContactPhone) ? (
          <Card padding="md" style={{ gap: spacing.sm }}>
            <Text style={styles.sectionEyebrow}>EMERGENCY CONTACT</Text>
            {m.emergencyContactName ? (
              <Text style={styles.emergencyName}>
                {m.emergencyContactName}
                {m.emergencyContactRelationship ? ` · ${m.emergencyContactRelationship}` : ''}
              </Text>
            ) : null}
            {m.emergencyContactPhone ? (
              <Pressable
                onPress={() => Linking.openURL(`tel:${m.emergencyContactPhone}`)}
                style={styles.contactRow}
              >
                <View style={styles.contactIconTile}>
                  <Phone color={colors.primary} size={16} strokeWidth={1.5} />
                </View>
                <Text style={styles.contactValue}>{m.emergencyContactPhone}</Text>
              </Pressable>
            ) : null}
          </Card>
        ) : null}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconTile}>
              <Settings color={colors.primary} size={14} strokeWidth={1.5} />
            </View>
            <Text style={styles.sectionTitle}>Manage</Text>
          </View>
          <Card padding="md" style={{ gap: spacing.sm }}>
            {m.approvalStatus === 'pending' ? (
              <>
                <Text style={styles.manageBlurb}>
                  This member signup is waiting for review.
                </Text>
                <View style={styles.manageRow}>
                  <Pressable
                    style={[styles.manageBtn, styles.manageBtnPrimary]}
                    onPress={() =>
                      approve.mutate(true, {
                        onError: (err) =>
                          alert.info(
                            'Approve failed',
                            err instanceof Error ? err.message : 'Please try again.',
                          ),
                      })
                    }
                    disabled={approve.isPending}
                  >
                    <Check color="#ffffff" size={14} strokeWidth={2} />
                    <Text style={styles.manageBtnLabelPrimary}>
                      {approve.isPending ? 'Working…' : 'Approve'}
                    </Text>
                  </Pressable>
                  <Pressable
                    style={[styles.manageBtn, styles.manageBtnOutline]}
                    onPress={() => confirmReject(`${m.firstName} ${m.lastName}`)}
                    disabled={approve.isPending}
                  >
                    <X color={colors.danger} size={14} strokeWidth={2} />
                    <Text style={[styles.manageBtnLabel, { color: colors.danger }]}>
                      Reject
                    </Text>
                  </Pressable>
                </View>
                <View style={styles.manageDivider} />
              </>
            ) : null}

            {m.memberType === 'member' && !m.membershipClassCompletedAt ? (
              <Pressable
                style={[styles.manageBtn, styles.manageBtnOutline]}
                onPress={markClassComplete}
                disabled={setClassComplete.isPending}
              >
                <Award color={colors.gold} size={14} strokeWidth={1.5} />
                <Text style={[styles.manageBtnLabel, { color: colors.goldDark }]}>
                  {setClassComplete.isPending
                    ? 'Saving…'
                    : 'Mark 4-week class complete'}
                </Text>
              </Pressable>
            ) : null}

            {m.membershipClassCompletedAt ? (
              <View style={styles.confirmedRow}>
                <BadgeCheck color={colors.gold} size={14} strokeWidth={1.5} />
                <Text style={styles.confirmedLabel}>
                  Membership class completed{' '}
                  {formatDate(m.membershipClassCompletedAt)}
                </Text>
              </View>
            ) : null}

            {m.isActive ? (
              <Pressable
                style={[styles.manageBtn, styles.manageBtnDanger]}
                onPress={() => confirmDeactivate(`${m.firstName} ${m.lastName}`)}
                disabled={deactivate.isPending}
              >
                <UserX color={colors.danger} size={14} strokeWidth={1.5} />
                <Text style={[styles.manageBtnLabel, { color: colors.danger }]}>
                  {deactivate.isPending ? 'Deactivating…' : 'Deactivate member'}
                </Text>
              </Pressable>
            ) : (
              <Pressable
                style={[styles.manageBtn, styles.manageBtnPrimary]}
                onPress={() =>
                  reactivate.mutate(undefined, {
                    onError: (err) =>
                      alert.info(
                        'Reactivate failed',
                        err instanceof Error ? err.message : 'Please try again.',
                      ),
                  })
                }
                disabled={reactivate.isPending}
              >
                <UserCheck color="#ffffff" size={14} strokeWidth={1.5} />
                <Text style={styles.manageBtnLabelPrimary}>
                  {reactivate.isPending ? 'Reactivating…' : 'Reactivate member'}
                </Text>
              </Pressable>
            )}

            <Text style={styles.manageFootnote}>
              Actions require admin or branch-admin access. The API will refuse if you
              don&apos;t.
            </Text>
          </Card>
        </View>
      </ScrollView>

      <RolePickerSheet
        open={rolePickerOpen}
        onClose={() => setRolePickerOpen(false)}
        defaultBranchId={m.homeBranchId}
        onPick={(roleId, branchId) => {
          setRolePickerOpen(false);
          assignRole.mutate(
            { roleId, branchId },
            {
              onError: (err) =>
                alert.info(
                  'Assign failed',
                  err instanceof Error ? err.message : 'Please try again.',
                ),
            },
          );
        }}
      />
    </SafeAreaView>
  );
}

function RolePickerSheet({
  open,
  onClose,
  defaultBranchId,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  defaultBranchId: string;
  onPick: (roleId: string, branchId: string) => void;
}) {
  const allRoles = useQuery({
    queryKey: ['members', 'roles', 'listAll'],
    enabled: open,
    queryFn: async () => (await api.members.roles.listAll()).data ?? [],
    staleTime: 5 * 60 * 1000,
  });
  const branches = useQuery({
    queryKey: ['branches', 'listPublic'],
    enabled: open,
    queryFn: async () => (await api.branches.listPublic()).data ?? [],
    staleTime: 5 * 60 * 1000,
  });

  const [pickedRoleId, setPickedRoleId] = useState<string | null>(null);
  const [branchId, setBranchId] = useState(defaultBranchId);

  return (
    <Modal visible={open} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <Pressable style={styles.rolePickerSheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.rolePickerHandle} />
          <Text style={styles.rolePickerTitle}>Assign a role</Text>
          <Text style={styles.rolePickerSub}>
            Pick a role and the branch it applies to.
          </Text>

          <ScrollView style={{ maxHeight: 380 }}>
            {allRoles.isLoading ? (
              <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.md }} />
            ) : (
              (allRoles.data ?? []).map((r) => {
                const isSelected = pickedRoleId === r.id;
                return (
                  <Pressable
                    key={r.id}
                    onPress={() => setPickedRoleId(r.id)}
                    style={[
                      styles.rolePickerOption,
                      isSelected && styles.rolePickerOptionActive,
                    ]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.rolePickerOptionLabel}>{r.roleName}</Text>
                      {r.description ? (
                        <Text style={styles.rolePickerOptionMeta} numberOfLines={2}>
                          {r.description}
                        </Text>
                      ) : null}
                    </View>
                    {isSelected ? (
                      <Check color={colors.primary} size={16} strokeWidth={2} />
                    ) : (
                      <ChevronRight
                        color="rgba(26,28,28,0.3)"
                        size={16}
                        strokeWidth={1.5}
                      />
                    )}
                  </Pressable>
                );
              })
            )}
          </ScrollView>

          {pickedRoleId ? (
            <View style={styles.branchPickerRow}>
              <Text style={styles.branchPickerLabel}>Branch</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: spacing.xs }}
              >
                {(branches.data ?? []).map((b) => {
                  const active = branchId === b.id;
                  return (
                    <Pressable
                      key={b.id}
                      onPress={() => setBranchId(b.id)}
                      style={[
                        styles.branchChip,
                        active && styles.branchChipActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.branchChipLabel,
                          active && styles.branchChipLabelActive,
                        ]}
                        numberOfLines={1}
                      >
                        {b.branchName}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          ) : null}

          <View style={styles.rolePickerActions}>
            <Pressable style={styles.rolePickerCancel} onPress={onClose}>
              <Text style={styles.rolePickerCancelLabel}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[
                styles.rolePickerAssign,
                (!pickedRoleId || !branchId) && { opacity: 0.5 },
              ]}
              disabled={!pickedRoleId || !branchId}
              onPress={() => {
                if (pickedRoleId && branchId) onPick(pickedRoleId, branchId);
              }}
            >
              <Text style={styles.rolePickerAssignLabel}>Assign</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIcon}>{icon}</View>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function Section({
  title,
  icon: Icon,
  loading,
  children,
}: {
  title: string;
  icon: typeof UsersRound;
  loading?: boolean;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionIconTile}>
          <Icon color={colors.primary} size={14} strokeWidth={1.5} />
        </View>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      <Card padding="md" style={{ gap: spacing.xs }}>
        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.sm }} />
        ) : (
          children
        )}
      </Card>
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
  headerTitle: { ...typography.cardTitle, color: colors.ink, flex: 1, textAlign: 'center' },
  container: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  centered: {
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  errorTitle: { ...typography.cardTitle, color: colors.ink },
  errorMeta: { ...typography.body, color: 'rgba(26,28,28,0.6)', textAlign: 'center' },
  heroCard: {
    borderRadius: radii.lg,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
  },
  heroBadgeRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  heroBadgePill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  heroBadgePillLabel: {
    ...typography.eyebrow,
    color: '#ffffff',
    fontSize: 9,
  },
  heroBadgePillGold: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(248,181,55,0.25)',
  },
  heroBadgePillGoldLabel: {
    ...typography.eyebrow,
    color: colors.gold,
    fontSize: 9,
  },
  heroBadgePillRed: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(225,29,72,0.35)',
  },
  heroBadgePillRedLabel: {
    ...typography.eyebrow,
    color: '#ffffff',
    fontSize: 9,
  },
  heroName: {
    ...typography.screenTitle,
    color: '#ffffff',
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  heroBranch: {
    ...typography.body,
    color: 'rgba(255,255,255,0.85)',
  },
  redactedBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: 'rgba(59,130,246,0.08)',
  },
  redactedLabel: {
    ...typography.meta,
    color: colors.ink,
    flex: 1,
    lineHeight: 15,
  },
  sectionEyebrow: {
    ...typography.eyebrow,
    color: 'rgba(26,28,28,0.55)',
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  contactIconTile: {
    width: 28,
    height: 28,
    borderRadius: radii.sm,
    backgroundColor: 'rgba(93,63,211,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactValue: {
    ...typography.body,
    color: colors.ink,
    flex: 1,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 3,
  },
  infoIcon: {
    width: 20,
    alignItems: 'center',
  },
  infoLabel: {
    ...typography.meta,
    color: 'rgba(26,28,28,0.6)',
    flex: 1,
  },
  infoValue: {
    ...typography.body,
    color: colors.ink,
    fontWeight: '500',
    flexShrink: 1,
    maxWidth: '60%',
    textAlign: 'right',
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
  sectionTitle: { ...typography.cardTitle, color: colors.ink, flex: 1 },
  linkRow: {
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(26,28,28,0.06)',
    gap: 2,
  },
  linkRowLabel: { ...typography.body, color: colors.ink, fontWeight: '500' },
  linkRowMeta: { ...typography.meta, color: 'rgba(26,28,28,0.55)' },
  roleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  emptyLine: {
    ...typography.body,
    color: 'rgba(26,28,28,0.55)',
    padding: spacing.sm,
  },
  emergencyName: {
    ...typography.body,
    color: colors.ink,
    fontWeight: '500',
  },
  manageBlurb: {
    ...typography.meta,
    color: 'rgba(26,28,28,0.6)',
    lineHeight: 16,
  },
  manageRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  manageDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(26,28,28,0.08)',
    marginVertical: spacing.xs,
  },
  manageBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm + 2,
    borderRadius: radii.md,
  },
  manageBtnPrimary: {
    backgroundColor: colors.primary,
  },
  manageBtnOutline: {
    borderWidth: 1,
    borderColor: 'rgba(26,28,28,0.12)',
    backgroundColor: colors.cardLight,
  },
  manageBtnDanger: {
    borderWidth: 1.5,
    borderColor: 'rgba(225,29,72,0.4)',
    backgroundColor: colors.cardLight,
  },
  manageBtnLabel: {
    ...typography.button,
    fontSize: 13,
  },
  manageBtnLabelPrimary: {
    ...typography.button,
    fontSize: 13,
    color: '#ffffff',
  },
  confirmedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
  },
  confirmedLabel: {
    ...typography.meta,
    color: colors.goldDark,
    fontWeight: '600',
  },
  manageFootnote: {
    ...typography.meta,
    color: 'rgba(26,28,28,0.5)',
    marginTop: spacing.xs,
    lineHeight: 15,
  },
  addRoleBtn: {
    width: 28,
    height: 28,
    borderRadius: radii.sm,
    backgroundColor: 'rgba(93,63,211,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  longPressHint: {
    ...typography.meta,
    color: 'rgba(26,28,28,0.45)',
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(10,10,15,0.5)',
    justifyContent: 'flex-end',
  },
  rolePickerSheet: {
    backgroundColor: colors.cardLight,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    paddingTop: spacing.md,
    gap: spacing.md,
  },
  rolePickerHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(26,28,28,0.15)',
    alignSelf: 'center',
  },
  rolePickerTitle: {
    ...typography.cardTitle,
    color: colors.ink,
  },
  rolePickerSub: {
    ...typography.meta,
    color: 'rgba(26,28,28,0.6)',
    marginTop: -6,
  },
  rolePickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(26,28,28,0.06)',
  },
  rolePickerOptionActive: {
    backgroundColor: 'rgba(93,63,211,0.06)',
  },
  rolePickerOptionLabel: {
    ...typography.body,
    color: colors.ink,
    fontWeight: '600',
  },
  rolePickerOptionMeta: {
    ...typography.meta,
    color: 'rgba(26,28,28,0.55)',
    marginTop: 2,
    lineHeight: 15,
  },
  branchPickerRow: {
    gap: spacing.xs,
  },
  branchPickerLabel: {
    ...typography.eyebrow,
    color: 'rgba(26,28,28,0.55)',
  },
  branchChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.pill,
    backgroundColor: colors.subtleLight,
  },
  branchChipActive: {
    backgroundColor: colors.primary,
  },
  branchChipLabel: {
    ...typography.meta,
    color: colors.ink,
    fontWeight: '600',
  },
  branchChipLabelActive: {
    color: '#ffffff',
  },
  rolePickerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  rolePickerCancel: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: 'rgba(26,28,28,0.12)',
    backgroundColor: colors.cardLight,
  },
  rolePickerCancelLabel: {
    ...typography.button,
    color: colors.ink,
    fontSize: 14,
  },
  rolePickerAssign: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.primary,
  },
  rolePickerAssignLabel: {
    ...typography.button,
    color: '#ffffff',
    fontSize: 14,
  },
});
