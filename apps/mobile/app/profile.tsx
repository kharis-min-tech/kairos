import { View, Text, ScrollView, StyleSheet, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, Pencil, ChevronRight } from 'lucide-react-native';
import { Avatar, Badge, Card, colors, spacing, typography } from '@kairos/ui-native';
import { formatShortDate } from '@kairos/core';
import { api } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth';

export default function Profile() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const branches = useQuery({
    queryKey: ['branches', 'public'],
    queryFn: async () => (await api.branches.listPublic()).data ?? [],
    enabled: !!user,
  });

  const stats = useQuery({
    queryKey: ['analytics', 'member'],
    queryFn: async () => (await api.analytics.memberStats()).data,
    enabled: !!user,
  });

  if (!user) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={styles.emptyText}>Not signed in.</Text>
      </SafeAreaView>
    );
  }

  const homeBranch = branches.data?.find((b) => b.id === user.homeBranchId);
  const membershipYear = user.membershipDate
    ? new Date(user.membershipDate).getFullYear()
    : null;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerBar}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ChevronLeft color={colors.ink} size={24} strokeWidth={1.5} />
        </Pressable>
        <Text style={styles.headerTitle}>Profile</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.avatarBlock}>
          <View style={styles.avatarWrap}>
            <Avatar
              size={88}
              photoUrl={user.photoUrl}
              firstName={user.firstName}
              lastName={user.lastName}
            />
            <Pressable
              onPress={() => Alert.alert('Edit photo', 'Photo editor lands in a later phase.')}
              style={styles.editBadge}
              accessibilityLabel="Edit photo"
            >
              <Pencil color="#ffffff" size={12} strokeWidth={2} />
            </Pressable>
          </View>
          <Text style={styles.name}>
            {user.firstName} {user.lastName}
          </Text>
          <Text style={styles.contact}>
            {user.email}
            {user.phone ? ` · ${user.phone}` : ''}
          </Text>
          <View style={styles.badgeRow}>
            {user.approvalStatus === 'approved' ? (
              <Badge label="Confirmed member" variant="primary" />
            ) : (
              <Badge label={user.approvalStatus} variant="neutral" />
            )}
            {user.honorific ? <Badge label={user.honorific} variant="gold" /> : null}
          </View>
        </View>

        <View style={styles.statsRow}>
          <StatTile
            label="Since"
            value={membershipYear ? String(membershipYear) : '—'}
          />
          <StatTile
            label="Attendance"
            value={
              stats.data?.recentAttendance?.total
                ? `${stats.data.recentAttendance.present}/${stats.data.recentAttendance.total}`
                : '—'
            }
          />
          <StatTile label="Given YTD" value="—" />
        </View>

        <Section title="Church context">
          <RowItem
            label="Home branch"
            value={homeBranch?.branchName ?? '—'}
          />
          <RowItem label="Fellowship" value="—" />
          <RowItem label="Departments" value="—" />
        </Section>

        <Section title="Personal">
          <RowItem
            label="Date of birth"
            value={user.dateOfBirth ? formatShortDate(user.dateOfBirth) : '—'}
          />
          <RowItem
            label="Address"
            value={
              user.address
                ? [user.address, user.city, user.postalCode].filter(Boolean).join(', ')
                : '—'
            }
          />
          <RowItem
            label="Emergency contact"
            value={user.emergencyContactName ?? '—'}
          />
        </Section>

        <Pressable
          onPress={() => Alert.alert('Edit profile', 'Edit flow lands in a later phase.')}
          style={styles.editRow}
        >
          <Pencil color={colors.primary} size={16} strokeWidth={1.5} />
          <Text style={styles.editLabel}>Edit profile</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <Card padding="md" style={styles.statTile}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </Card>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Card padding="none" style={styles.sectionCard}>
        {children}
      </Card>
    </View>
  );
}

function RowItem({ label, value }: { label: string; value: string }) {
  return (
    <Pressable
      onPress={() => Alert.alert(label, 'Edit lands in a later phase.')}
      style={styles.rowItem}
    >
      <View style={styles.rowText}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowValue}>{value}</Text>
      </View>
      <ChevronRight color="rgba(26,28,28,0.3)" size={18} strokeWidth={1.5} />
    </Pressable>
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
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },

  avatarBlock: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  avatarWrap: { position: 'relative' },
  editBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.cardLight,
  },
  name: {
    ...typography.screenTitle,
    color: colors.ink,
    marginTop: spacing.sm,
  },
  contact: { ...typography.meta, color: 'rgba(26,28,28,0.6)' },
  badgeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },

  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  statTile: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
  },
  statLabel: {
    ...typography.eyebrow,
    color: 'rgba(26,28,28,0.55)',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.ink,
  },

  section: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  sectionTitle: {
    ...typography.eyebrow,
    color: 'rgba(26,28,28,0.55)',
  },
  sectionCard: {
    overflow: 'hidden',
  },
  rowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(26,28,28,0.05)',
  },
  rowText: { flex: 1, gap: 2 },
  rowLabel: { ...typography.meta, color: 'rgba(26,28,28,0.55)' },
  rowValue: { ...typography.body, color: colors.ink },

  editRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  editLabel: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
  },

  emptyText: {
    ...typography.body,
    color: 'rgba(26,28,28,0.5)',
    textAlign: 'center',
    marginTop: spacing.xxl,
  },
});
