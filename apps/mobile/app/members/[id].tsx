import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
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
  const params = useLocalSearchParams<{ id: string }>();
  const id = params.id!;

  const member = useQuery({
    queryKey: ['members', id],
    enabled: !!id,
    queryFn: async () => (await api.members.get(id)).data ?? null,
  });

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
        <View style={{ width: 24 }} />
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

        {(roles.data ?? []).length > 0 ? (
          <Section title="Roles" icon={Sparkles} loading={roles.isLoading}>
            {(roles.data ?? []).map((r) => (
              <View key={r.id} style={styles.roleRow}>
                <Badge label={r.roleName} variant="primary" size="sm" />
                {r.branchName ? (
                  <Text style={styles.linkRowMeta}>{r.branchName}</Text>
                ) : null}
              </View>
            ))}
          </Section>
        ) : null}

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
      </ScrollView>
    </SafeAreaView>
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
});
