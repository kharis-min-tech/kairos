import { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { alert } from '@/lib/alert';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import {
  ChevronLeft,
  ChevronRight,
  Pencil,
  Bell,
  Palette,
  ShieldCheck,
  Download,
  FileText,
  Trash2,
} from 'lucide-react-native';
import {
  Avatar,
  Badge,
  Card,
  spacing,
  typography,
  useThemedStyles,
  type ThemeColors,
  useColors,
} from '@kairos/ui-native';
import { formatShortDate } from '@kairos/core';
import { api } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth';

export default function Profile() {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);
  const [uploading, setUploading] = useState(false);

  async function handleEditPhoto() {
    if (!user) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      alert.info(
        'Permission needed',
        'Grant photo library access in Settings to change your profile photo.',
      );
      return;
    }
    const pick = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (pick.canceled || !pick.assets?.[0]) return;
    const asset = pick.assets[0];

    setUploading(true);
    try {
      const mint = await api.media.mintUploadUrl({ purpose: 'profile-photo' });
      const { uploadUrl, deliveryUrl } = mint.data!;

      const form = new FormData();
      // RN's FormData accepts { uri, name, type } for file parts.
      form.append('file', {
        uri: asset.uri,
        name: 'upload.jpg',
        type: 'image/jpeg',
      } as unknown as Blob);

      const res = await fetch(uploadUrl, { method: 'POST', body: form });
      if (!res.ok) throw new Error(`Upload failed (${res.status})`);

      await api.members.update(user.id, { photoUrl: deliveryUrl });
      await updateUser({ photoUrl: deliveryUrl });
      alert.info('Photo updated', 'Your new profile photo is live.');
    } catch (e) {
      alert.info('Upload failed', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setUploading(false);
    }
  }

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
          <ChevronLeft color={c.ink} size={24} strokeWidth={1.5} />
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
              onPress={uploading ? undefined : handleEditPhoto}
              style={styles.editBadge}
              accessibilityLabel="Edit photo"
              disabled={uploading}
            >
              {uploading ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Pencil color="#ffffff" size={12} strokeWidth={2} />
              )}
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
          onPress={() => router.push(`/members/edit/${user.id}`)}
          style={styles.editRow}
        >
          <Pencil color={c.primary} size={16} strokeWidth={1.5} />
          <Text style={styles.editLabel}>Edit profile</Text>
        </Pressable>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Settings</Text>
          <Card padding="none" style={styles.sectionCard}>
            <SettingsRow
              icon={<Bell color={c.primary} size={16} strokeWidth={1.5} />}
              label="Notifications"
              hint="Manage what you're pinged for"
              onPress={() => router.push('/notification-preferences')}
            />
            <SettingsRow
              icon={<Palette color={c.primary} size={16} strokeWidth={1.5} />}
              label="Appearance"
              hint="Light, dark, or system"
              onPress={() => router.push('/appearance' as never)}
            />
            <SettingsRow
              icon={<ShieldCheck color={c.primary} size={16} strokeWidth={1.5} />}
              label="Security"
              hint="Password, email, sign-in activity"
              onPress={() => router.push('/security')}
            />
            <SettingsRow
              icon={<Download color={c.primary} size={16} strokeWidth={1.5} />}
              label="Export my data"
              hint="Download everything we hold on you"
              onPress={() => router.push('/settings/export' as never)}
            />
            <SettingsRow
              icon={<FileText color={c.primary} size={16} strokeWidth={1.5} />}
              label="Consent history"
              hint="Terms, privacy, safeguarding"
              onPress={() => router.push('/settings/consent' as never)}
            />
            <SettingsRow
              icon={<Trash2 color={c.danger} size={16} strokeWidth={1.5} />}
              label="Delete my account"
              hint="Permanently remove your account"
              destructive
              last
              onPress={() => router.push('/settings/delete-account' as never)}
            />
          </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function SettingsRow({
  icon,
  label,
  hint,
  onPress,
  destructive,
  last,
}: {
  icon: React.ReactNode;
  label: string;
  hint?: string;
  onPress: () => void;
  destructive?: boolean;
  last?: boolean;
}) {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  return (
    <Pressable
      onPress={onPress}
      style={[styles.settingsRow, last && { borderBottomWidth: 0 }]}
    >
      {icon}
      <View style={{ flex: 1 }}>
        <Text style={[styles.settingsLabel, destructive && { color: c.danger }]}>
          {label}
        </Text>
        {hint ? <Text style={styles.settingsHint}>{hint}</Text> : null}
      </View>
      <ChevronRight color={c.inkVeryFaded} size={16} strokeWidth={1.5} />
    </Pressable>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  return (
    <Card padding="md" style={styles.statTile}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </Card>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
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
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  return (
    <View style={styles.rowItem}>
      <View style={styles.rowText}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowValue}>{value}</Text>
      </View>
    </View>
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
    backgroundColor: c.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: c.card,
  },
  name: {
    ...typography.screenTitle,
    color: c.ink,
    marginTop: spacing.sm,
  },
  contact: { ...typography.meta, color: c.inkMuted },
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
    color: c.inkMuted,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: c.ink,
  },

  section: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  sectionTitle: {
    ...typography.eyebrow,
    color: c.inkMuted,
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
    borderBottomColor: c.divider,
  },
  rowText: { flex: 1, gap: 2 },
  rowLabel: { ...typography.meta, color: c.inkMuted },
  rowValue: { ...typography.body, color: c.ink },

  editRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  editLabel: {
    ...typography.body,
    color: c.primary,
    fontWeight: '600',
  },

  emptyText: {
    ...typography.body,
    color: c.inkFaded,
    textAlign: 'center',
    marginTop: spacing.xxl,
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: c.divider,
  },
  settingsLabel: { ...typography.body, color: c.ink, fontWeight: '600' },
  settingsHint: { ...typography.meta, color: c.inkMuted, marginTop: 2 },
});
}

