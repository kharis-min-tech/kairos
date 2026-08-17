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
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, Building2, Users, Calendar } from 'lucide-react-native';
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
import { useAuthStore } from '@/store/auth';

export default function MyDepartment() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const memberId = user?.id;

  const mine = useQuery({
    queryKey: ['my-departments'],
    enabled: !!memberId,
    queryFn: async () => (await api.departments.mine()).data ?? [],
  });

  const departments = mine.data ?? [];
  const [activeId, setActiveId] = useState<string | null>(null);
  const active = departments.find((d) => d.id === activeId) ?? departments[0] ?? null;

  const members = useQuery({
    queryKey: ['department-members', active?.id],
    enabled: !!active?.id,
    queryFn: async () => (await api.departments.members.list(active!.id)).data ?? [],
  });

  const myMembership = useMemo(
    () => (members.data ?? []).find((m) => m.memberId === memberId),
    [members.data, memberId],
  );

  const refresh = () => {
    mine.refetch();
    members.refetch();
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerBar}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ChevronLeft color={colors.ink} size={24} strokeWidth={1.5} />
        </Pressable>
        <Text style={styles.headerTitle}>My department</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={mine.isFetching || members.isFetching}
            onRefresh={refresh}
            tintColor={colors.primary}
          />
        }
      >
        {mine.isLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xxl }} />
        ) : null}

        {!mine.isLoading && departments.length === 0 ? <EmptyState /> : null}

        {departments.length > 1 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsRow}
          >
            {departments.map((d) => {
              const isActive = (active?.id ?? departments[0]?.id) === d.id;
              return (
                <Pressable
                  key={d.id}
                  onPress={() => setActiveId(d.id)}
                  style={[styles.chip, isActive && styles.chipActive]}
                >
                  <Text style={[styles.chipLabel, isActive && styles.chipLabelActive]}>
                    {d.departmentName}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        ) : null}

        {active ? (
          <>
            <LinearGradient
              colors={gradients.brand}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.heroCard}
            >
              <Text style={styles.heroEyebrow}>DEPARTMENT</Text>
              <Text style={styles.heroTitle}>{active.departmentName}</Text>
              {active.branchName ? (
                <Text style={styles.heroBranch}>{active.branchName}</Text>
              ) : null}
              {active.description ? (
                <Text style={styles.heroDescription}>{active.description}</Text>
              ) : null}

              <View style={styles.heroLeadRow}>
                <View style={styles.leadBlock}>
                  <Avatar
                    size="sm"
                    photoUrl={active.leadPhotoUrl ?? undefined}
                    firstName={active.leadFirstName}
                    lastName={active.leadLastName}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.leadEyebrow}>LEAD</Text>
                    <Text style={styles.leadName}>
                      {active.leadFirstName} {active.leadLastName}
                    </Text>
                  </View>
                </View>
                {active.deputyFirstName ? (
                  <View style={styles.leadBlock}>
                    <Avatar
                      size="sm"
                      photoUrl={active.deputyPhotoUrl ?? undefined}
                      firstName={active.deputyFirstName ?? undefined}
                      lastName={active.deputyLastName ?? undefined}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.leadEyebrow}>DEPUTY</Text>
                      <Text style={styles.leadName}>
                        {active.deputyFirstName} {active.deputyLastName ?? ''}
                      </Text>
                    </View>
                  </View>
                ) : null}
              </View>
            </LinearGradient>

            {myMembership ? (
              <Card padding="md" style={styles.membershipCard}>
                <Text style={styles.sectionEyebrow}>YOUR MEMBERSHIP</Text>
                <View style={styles.membershipRow}>
                  <Text style={styles.membershipStatus}>
                    {myMembership.membershipStatus === 'active' ? 'Active' : 'On probation'}
                  </Text>
                  <Badge
                    label={myMembership.membershipStatus === 'active' ? 'Active' : 'Probation'}
                    variant={myMembership.membershipStatus === 'active' ? 'success' : 'gold'}
                    size="sm"
                  />
                </View>
                <Text style={styles.membershipMeta}>
                  Joined {new Date(myMembership.joinDate).toLocaleDateString(undefined, {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </Text>
                {myMembership.probationEndDate ? (
                  <View style={styles.probationRow}>
                    <Calendar color={colors.gold} size={14} strokeWidth={1.5} />
                    <Text style={styles.probationText}>
                      Probation ends{' '}
                      {new Date(myMembership.probationEndDate).toLocaleDateString(undefined, {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </Text>
                  </View>
                ) : null}
              </Card>
            ) : null}

            <Pressable onPress={() => router.push('/rota')}>
              <Card padding="md" style={styles.linkCard}>
                <View style={styles.linkIconTile}>
                  <Calendar color={colors.primary} size={18} strokeWidth={1.5} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.linkTitle}>My rota</Text>
                  <Text style={styles.linkMeta}>Upcoming duties in this department</Text>
                </View>
              </Card>
            </Pressable>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionIconTile}>
                  <Users color={colors.primary} size={16} strokeWidth={1.5} />
                </View>
                <Text style={styles.sectionHeaderText}>Team</Text>
                <Badge label={String(members.data?.length ?? 0)} variant="neutral" size="sm" />
              </View>
              {members.isLoading ? (
                <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.md }} />
              ) : (members.data ?? []).length === 0 ? (
                <Text style={styles.emptyLine}>No members recorded yet.</Text>
              ) : (
                <View style={styles.memberList}>
                  {(members.data ?? []).map((m) => (
                    <Pressable
                      key={m.id}
                      onPress={() => router.push(`/members/${m.memberId}` as never)}
                      style={styles.memberRow}
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
                      </View>
                      {m.membershipStatus === 'probation' ? (
                        <Badge label="Probation" variant="gold" size="sm" />
                      ) : null}
                    </Pressable>
                  ))}
                </View>
              )}
            </View>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function EmptyState() {
  return (
    <Card padding="md" style={styles.emptyCard}>
      <View style={styles.emptyIconTile}>
        <Building2 color={colors.primary} size={22} strokeWidth={1.5} />
      </View>
      <Text style={styles.emptyTitle}>You&apos;re not in a department yet</Text>
      <Text style={styles.emptyMeta}>
        Join a ministry department (Worship, Ushering, Media, Children, …) via
        your branch admin. Your team, lead, and rota will land here.
      </Text>
    </Card>
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
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  chipsRow: {
    gap: spacing.sm,
    paddingRight: spacing.lg,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    backgroundColor: colors.subtleLight,
  },
  chipActive: { backgroundColor: colors.primary },
  chipLabel: { ...typography.meta, color: colors.ink, fontWeight: '500' },
  chipLabelActive: { color: '#ffffff' },
  heroCard: {
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  heroEyebrow: {
    ...typography.eyebrow,
    color: colors.gold,
    letterSpacing: 1.2,
  },
  heroTitle: {
    ...typography.screenTitle,
    color: '#ffffff',
  },
  heroBranch: {
    ...typography.meta,
    color: 'rgba(255,255,255,0.75)',
  },
  heroDescription: {
    ...typography.body,
    color: 'rgba(255,255,255,0.85)',
    marginTop: spacing.sm,
    lineHeight: 20,
  },
  heroLeadRow: {
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
  membershipCard: {
    gap: spacing.xs,
  },
  membershipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  membershipStatus: {
    ...typography.cardTitle,
    color: colors.ink,
  },
  membershipMeta: {
    ...typography.meta,
    color: 'rgba(26,28,28,0.6)',
  },
  probationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  probationText: {
    ...typography.meta,
    color: colors.goldDark,
  },
  linkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  linkIconTile: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    backgroundColor: 'rgba(93,63,211,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkTitle: { ...typography.body, color: colors.ink, fontWeight: '600' },
  linkMeta: { ...typography.meta, color: 'rgba(26,28,28,0.6)' },
  section: {
    gap: spacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sectionIconTile: {
    width: 28,
    height: 28,
    borderRadius: radii.sm,
    backgroundColor: 'rgba(93,63,211,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeaderText: {
    ...typography.cardTitle,
    color: colors.ink,
    flex: 1,
  },
  sectionEyebrow: {
    ...typography.eyebrow,
    color: 'rgba(26,28,28,0.55)',
  },
  memberList: {
    gap: spacing.xs,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.cardLight,
    borderRadius: radii.md,
    padding: spacing.md,
  },
  memberName: { ...typography.body, color: colors.ink },
  emptyLine: {
    ...typography.body,
    color: 'rgba(26,28,28,0.55)',
    padding: spacing.md,
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
  emptyTitle: { ...typography.cardTitle, color: colors.ink },
  emptyMeta: {
    ...typography.body,
    color: 'rgba(26,28,28,0.6)',
    textAlign: 'center',
    lineHeight: 20,
  },
});
