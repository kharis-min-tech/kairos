import { View, Text, ScrollView, StyleSheet, Pressable, Alert, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  LogOut,
  ChevronRight,
  User,
  Bell,
  BookOpen,
  Calendar,
  Heart,
  ClipboardList,
  Users,
  UsersRound,
  Building2,
  Sparkles,
  UserPlus,
  Handshake,
  CheckSquare,
  Repeat,
  BarChart3,
  LayoutDashboard,
  PieChart,
  Map,
  FileText,
  Send,
  Shield,
  Lock,
  History,
  Download,
  Palette,
  Globe,
  HelpCircle,
  Info,
} from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { Badge, Card, Avatar, colors, spacing, typography, radii } from '@kairos/ui-native';
import { useAuthStore } from '@/store/auth';

const HELP_URL = 'https://docs.kairos.kharis.org';

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

        <Section label="For you">
          <NavRow icon={User} label="Profile" onPress={() => router.push('/profile')} />
          <NavRow
            icon={Bell}
            label="Notifications"
            onPress={() => router.push('/notifications')}
          />
          <NavRow
            icon={BookOpen}
            label="New Believer journey"
            onPress={() => router.push('/new-believers')}
          />
          <SoonRow icon={Calendar} label="My attendance" />
          <SoonRow icon={Heart} label="Giving history" />
          <SoonRow icon={FileText} label="My form submissions" />
        </Section>

        <Section label="My groups">
          <NavRow
            icon={UsersRound}
            label="My fellowship"
            onPress={() => router.push('/my-fellowship')}
          />
          <NavRow
            icon={Building2}
            label="My department"
            onPress={() => router.push('/my-department')}
          />
          <NavRow icon={Map} label="My branch" onPress={() => router.push('/my-branch')} />
        </Section>

        <Section label="People">
          <SoonRow icon={Users} label="Members directory" />
          <NavRow
            icon={Sparkles}
            label="New Believers pipeline"
            onPress={() => router.push('/new-believers')}
          />
          <SoonRow icon={UserPlus} label="Souls / outreach" />
        </Section>

        <Section label="Groups">
          <SoonRow icon={UsersRound} label="Fellowships" />
          <SoonRow icon={Building2} label="Departments" />
        </Section>

        <Section label="Leader tools">
          <NavRow
            icon={CheckSquare}
            label="Approvals"
            onPress={() => router.push('/approvals')}
          />
          <NavRow
            icon={Handshake}
            label="Follow-ups"
            onPress={() => router.push('/follow-ups')}
          />
          <NavRow icon={Repeat} label="Rota" onPress={() => router.push('/rota')} />
          <SoonRow icon={ClipboardList} label="Rollcall" />
        </Section>

        <Section label="Forms">
          <SoonRow icon={FileText} label="Fill a form" />
          <SoonRow icon={Send} label="First-timer capture" />
        </Section>

        <Section label="Reports & analytics">
          <SoonRow icon={LayoutDashboard} label="Dashboard" />
          <SoonRow icon={PieChart} label="Reports" />
          <NavRow
            icon={BarChart3}
            label="Service attendance"
            onPress={() => router.push('/admin/attendance')}
          />
        </Section>

        <Section label="Admin">
          <NavRow
            icon={ClipboardList}
            label="Check-in desk"
            onPress={() => router.push('/admin/checkin')}
          />
          <SoonRow icon={Building2} label="Branch settings" />
          <SoonRow icon={Users} label="Users & roles" />
          <SoonRow icon={Map} label="Regions" />
        </Section>

        <Section label="Settings">
          <NavRow
            icon={Bell}
            label="Notification preferences"
            onPress={() => router.push('/notification-preferences')}
          />
          <NavRow
            icon={Shield}
            label="Privacy & consent"
            onPress={() => router.push('/privacy-consent')}
          />
          <NavRow
            icon={Download}
            label="Data & privacy"
            onPress={() => router.push('/data-privacy')}
          />
          <SoonRow icon={Lock} label="Security" />
          <NavRow
            icon={History}
            label="Recent activity"
            onPress={() => router.push('/recent-activity')}
          />
          <SoonRow icon={Palette} label="Appearance" />
          <SoonRow icon={Globe} label="Language" />
        </Section>

        <Section label="Help">
          <NavRow
            icon={HelpCircle}
            label="Help & Guides"
            onPress={() => Linking.openURL(HELP_URL)}
          />
          <SoonRow icon={Info} label="About Kairos" />
        </Section>

        <Pressable onPress={handleSignOut} style={styles.signOutRow}>
          <LogOut color={colors.danger} size={18} strokeWidth={1.5} />
          <Text style={styles.signOutLabel}>Sign out</Text>
        </Pressable>

        <Text style={styles.footerLabel}>Kairos v1.0 · Kharis Church</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.group}>
      <Text style={styles.groupLabel}>{label}</Text>
      {children}
    </View>
  );
}

function NavRow({
  icon: Icon,
  label,
  onPress,
}: {
  icon: LucideIcon;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.row}>
      <View style={styles.rowIcon}>
        <Icon color={colors.primary} size={18} strokeWidth={1.5} />
      </View>
      <Text style={styles.rowLabel}>{label}</Text>
      <ChevronRight color="rgba(26,28,28,0.3)" size={18} strokeWidth={1.5} />
    </Pressable>
  );
}

function SoonRow({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <Pressable
      onPress={() => Alert.alert(label, 'Coming in a later mobile pass. Available on web.')}
      style={styles.row}
    >
      <View style={styles.rowIcon}>
        <Icon color="rgba(26,28,28,0.35)" size={18} strokeWidth={1.5} />
      </View>
      <Text style={[styles.rowLabel, styles.rowLabelSoon]}>{label}</Text>
      <Badge label="Soon" variant="neutral" size="sm" />
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
    gap: spacing.md,
    backgroundColor: colors.cardLight,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  rowIcon: {
    width: 32,
    height: 32,
    borderRadius: radii.sm,
    backgroundColor: 'rgba(93,63,211,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: { ...typography.body, color: colors.ink, flex: 1 },
  rowLabelSoon: { color: 'rgba(26,28,28,0.6)' },
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
