import { View, Text, ScrollView, StyleSheet, Pressable, Linking } from 'react-native';
import { alert } from '@/lib/alert';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  LogOut,
  ChevronRight,
  Bell,
  BookOpen,
  Calendar,
  ClipboardList,
  Users,
  UsersRound,
  Building2,
  Sparkles,
  GraduationCap,
  CalendarClock,
  UserPlus,
  Handshake,
  CheckSquare,
  Repeat,
  BarChart3,
  PieChart,
  Map,
  FileText,
  Shield,
  ShieldAlert,
  Lock,
  History,
  Download,
  Palette,
  HelpCircle,
  Info,
} from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import {
  Badge,
  Card,
  Avatar,
  spacing,
  typography,
  radii,
  useThemedStyles,
  type ThemeColors,
  useColors,
} from '@kairos/ui-native';
import { useAuthStore } from '@/store/auth';
import { useCapabilities } from '@/lib/capabilities';

const HELP_URL = 'https://docs.kairos.kharis.org';

export default function More() {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const clearSession = useAuthStore((s) => s.clearSession);
  const caps = useCapabilities();

  // Section-level gates. Leader tools surface for any grant that reads a
  // sub-scope; admin-only surface for system admins + branch admins; reports
  // surface for anyone with branch:read (system admin, branch admins, pastors).
  // Plain members with no grants get a shorter More screen — no clickable
  // dead-ends where the API 403s.
  const hasAnyLeadership =
    caps.systemRole === 'admin' ||
    caps.grants.length > 0;
  const canSeeAdminSection =
    caps.systemRole === 'admin' ||
    (user?.homeBranchId ? caps.has('branch:write', { kind: 'branch', id: user.homeBranchId }) : false);
  const canSeeReports =
    caps.systemRole === 'admin' ||
    (user?.homeBranchId ? caps.has('branch:read', { kind: 'branch', id: user.homeBranchId }) : false);
  // New Believers team = mentors, teachers, or branch admins. Plain members
  // only see their own journey (already surfaced under "For you"), not the
  // full pipeline or the sessions scheduling surface.
  const canSeeNewBelieversTeam =
    caps.systemRole === 'admin' ||
    caps.has('newbelievers:mentor') ||
    caps.has('newbelievers:teach') ||
    (user?.homeBranchId ? caps.has('branch:write', { kind: 'branch', id: user.homeBranchId }) : false);

  const handleSignOut = async () => {
    const confirmed = await alert.confirm({
      title: 'Sign out',
      message: 'You will need to sign in again to use the app.',
      confirmLabel: 'Sign out',
      destructive: true,
    });
    if (!confirmed) return;
    await clearSession();
    router.replace('/(auth)/login');
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
            <ChevronRight color={c.inkVeryFaded} size={18} strokeWidth={1.5} />
          </Card>
        </Pressable>

        <Section label="For you">
          <NavRow
            icon={Bell}
            label="Notifications"
            onPress={() => router.push('/notifications')}
          />
          <NavRow
            icon={BookOpen}
            label="My New Believer journey"
            onPress={() => router.push('/new-believers?scope=mine')}
          />
          {/* Membership classes are church-wide, so this is open to every
              member: they browse cohorts, self-enrol and track their own
              progress towards becoming a confirmed Member. */}
          <NavRow
            icon={GraduationCap}
            label="Membership classes"
            onPress={() => router.push('/membership' as never)}
          />
          <NavRow
            icon={Calendar}
            label="My attendance"
            onPress={() => router.push('/my-attendance')}
          />
          <NavRow
            icon={FileText}
            label="My form submissions"
            onPress={() => router.push('/my-form-submissions')}
          />
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
          <NavRow
            icon={Users}
            label="Members directory"
            onPress={() => router.push('/members')}
          />
          {canSeeNewBelieversTeam ? (
            <>
              <NavRow
                icon={Sparkles}
                label="New Believers pipeline"
                onPress={() => router.push('/new-believers')}
              />
              <NavRow
                icon={CalendarClock}
                label="New Believers sessions"
                onPress={() => router.push('/new-believers/sessions' as never)}
              />
            </>
          ) : null}
          <NavRow
            icon={UserPlus}
            label="Outreach programs"
            onPress={() => router.push('/outreach')}
          />
          <NavRow icon={Handshake} label="Souls" onPress={() => router.push('/souls')} />
          <NavRow
            icon={PieChart}
            label="Souls dashboard"
            onPress={() => router.push('/souls-dashboard' as never)}
          />
        </Section>

        <Section label="Groups">
          <NavRow
            icon={UsersRound}
            label="Fellowships"
            onPress={() => router.push('/fellowships')}
          />
          <NavRow
            icon={Building2}
            label="Departments"
            onPress={() => router.push('/departments')}
          />
        </Section>

        {hasAnyLeadership ? (
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
            {canSeeAdminSection ? (
              <NavRow
                icon={ShieldAlert}
                label="Concerns"
                onPress={() => router.push('/concerns' as never)}
              />
            ) : null}
            <NavRow icon={Repeat} label="Rota" onPress={() => router.push('/rota')} />
            <NavRow
              icon={ClipboardList}
              label="Fellowship attendance"
              onPress={() => router.push('/rollcall')}
            />
          </Section>
        ) : null}

        <Section label="Forms">
          <NavRow icon={FileText} label="Fill a form" onPress={() => router.push('/forms')} />
          <NavRow
            icon={ClipboardList}
            label="Submissions"
            onPress={() => router.push('/forms/submissions' as never)}
          />
          <NavRow
            icon={Users}
            label="Dormant attendees"
            onPress={() => router.push('/forms/attendees' as never)}
          />
        </Section>

        {canSeeReports ? (
          <Section label="Reports & analytics">
            <NavRow icon={PieChart} label="Reports" onPress={() => router.push('/reports')} />
            <NavRow
              icon={BarChart3}
              label="Services"
              onPress={() => router.push('/attendance' as never)}
            />
          </Section>
        ) : null}

        {canSeeAdminSection ? (
          <Section label="Admin">
            <NavRow
              icon={ClipboardList}
              label="Check-in desk"
              onPress={() => router.push('/admin/checkin')}
            />
            <NavRow
              icon={Building2}
              label="Branch settings"
              onPress={() => router.push('/branches')}
            />
            {caps.systemRole === 'admin' ? (
              <NavRow icon={Map} label="Regions" onPress={() => router.push('/regions')} />
            ) : null}
          </Section>
        ) : null}

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
          <NavRow icon={Lock} label="Security" onPress={() => router.push('/security')} />
          <NavRow
            icon={History}
            label="Recent activity"
            onPress={() => router.push('/recent-activity')}
          />
          <NavRow
            icon={Palette}
            label="Appearance"
            onPress={() => router.push('/appearance' as never)}
          />
        </Section>

        <Section label="Help">
          <NavRow
            icon={HelpCircle}
            label="Help & Guides"
            onPress={() => Linking.openURL(HELP_URL)}
          />
          <NavRow
            icon={Info}
            label="About Kairos"
            onPress={() => Linking.openURL(HELP_URL)}
          />
        </Section>

        <Pressable onPress={handleSignOut} style={styles.signOutRow}>
          <LogOut color={c.danger} size={18} strokeWidth={1.5} />
          <Text style={styles.signOutLabel}>Sign out</Text>
        </Pressable>

        <Text style={styles.footerLabel}>Kairos v1.0 · Kharis Church</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  const styles = useThemedStyles(makeStyles);
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
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  return (
    <Pressable onPress={onPress} style={styles.row}>
      <View style={styles.rowIcon}>
        <Icon color={c.primary} size={18} strokeWidth={1.5} />
      </View>
      <Text style={styles.rowLabel}>{label}</Text>
      <ChevronRight color={c.inkVeryFaded} size={18} strokeWidth={1.5} />
    </Pressable>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.page },
  scroll: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  pageTitle: {
    ...typography.screenTitle,
    color: c.ink,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  profileText: { flex: 1, gap: 2 },
  profileName: { ...typography.cardTitle, color: c.ink },
  profileMeta: { ...typography.meta, color: c.inkMuted },
  group: { gap: spacing.xs },
  groupLabel: {
    ...typography.eyebrow,
    color: c.inkFaded,
    marginBottom: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: c.card,
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
  rowLabel: { ...typography.body, color: c.ink, flex: 1 },
  rowLabelSoon: { color: c.inkMuted },
  signOutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  signOutLabel: {
    ...typography.body,
    color: c.danger,
    fontWeight: '600',
  },
  footerLabel: {
    ...typography.meta,
    color: c.inkFaded,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
});
}

