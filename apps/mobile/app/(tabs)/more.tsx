import { View, Text, ScrollView, StyleSheet, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LogOut, ChevronRight } from 'lucide-react-native';
import { Card, Avatar, colors, spacing, typography, radii } from '@kairos/ui-native';
import { useAuthStore } from '@/store/auth';

export default function More() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const clearSession = useAuthStore((s) => s.clearSession);

  const handleSignOut = () => {
    Alert.alert('Sign out', 'You will need to sign in again to use the app.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          await clearSession();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.pageTitle}>More</Text>

        <Pressable onPress={() => router.push('/profile')}>
          <Card padding="md" style={styles.profileCard}>
            <Avatar
              size="md"
              photoUrl={user?.photoUrl}
              firstName={user?.firstName}
              lastName={user?.lastName}
            />
            <View style={styles.profileText}>
              <Text style={styles.profileName}>
                {user ? `${user.firstName} ${user.lastName}` : 'Signed in'}
              </Text>
              <Text style={styles.profileMeta}>{user?.email ?? ''}</Text>
            </View>
            <ChevronRight color="rgba(26,28,28,0.3)" size={18} strokeWidth={1.5} />
          </Card>
        </Pressable>

        <View style={styles.group}>
          <Text style={styles.groupLabel}>For you</Text>
          <NavRow label="Profile" onPress={() => router.push('/profile')} />
          <NavRow label="Notifications" onPress={() => router.push('/notifications')} />
          <NavRow
            label="New Believer journey"
            onPress={() => router.push('/new-believers')}
          />
          <PlaceholderRow label="My attendance" />
          <PlaceholderRow label="Giving history" />
        </View>

        <View style={styles.group}>
          <Text style={styles.groupLabel}>Leader tools</Text>
          <NavRow label="Approvals" onPress={() => router.push('/approvals')} />
          <NavRow label="Follow-ups" onPress={() => router.push('/follow-ups')} />
          <NavRow label="Rota" onPress={() => router.push('/rota')} />
        </View>

        <View style={styles.group}>
          <Text style={styles.groupLabel}>Settings</Text>
          <PlaceholderRow label="Appearance" />
          <PlaceholderRow label="Language" />
          <PlaceholderRow label="Privacy & consent" />
          <PlaceholderRow label="Help & support" />
        </View>

        <Pressable onPress={handleSignOut} style={styles.signOutRow}>
          <LogOut color={colors.danger} size={18} strokeWidth={1.5} />
          <Text style={styles.signOutLabel}>Sign out</Text>
        </Pressable>

        <Text style={styles.footerLabel}>Kairos v1.0 · Kharis Church</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function PlaceholderRow({ label }: { label: string }) {
  return (
    <Pressable
      onPress={() => Alert.alert(label, 'Lands in a later phase.')}
      style={styles.row}
    >
      <Text style={styles.rowLabel}>{label}</Text>
      <ChevronRight color="rgba(26,28,28,0.3)" size={18} strokeWidth={1.5} />
    </Pressable>
  );
}

function NavRow({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <ChevronRight color="rgba(26,28,28,0.3)" size={18} strokeWidth={1.5} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.pageLight },
  scroll: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  pageTitle: {
    ...typography.screenTitle,
    color: colors.ink,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  profileText: { flex: 1, gap: 2 },
  profileName: { ...typography.cardTitle, color: colors.ink },
  profileMeta: { ...typography.meta, color: 'rgba(26,28,28,0.55)' },
  group: { gap: spacing.xs },
  groupLabel: {
    ...typography.eyebrow,
    color: 'rgba(26,28,28,0.5)',
    marginBottom: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.cardLight,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  rowLabel: { ...typography.body, color: colors.ink },
  signOutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  signOutLabel: {
    ...typography.body,
    color: colors.danger,
    fontWeight: '600',
  },
  footerLabel: {
    ...typography.meta,
    color: 'rgba(26,28,28,0.4)',
    textAlign: 'center',
    marginTop: spacing.lg,
  },
});
