import React, { useState } from 'react';
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
const ABOUT_URL = 'https://docs.kairos.kharis.org/getting-started/what-is-kairos';

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

        {/* Nav taxonomy: plain nouns, one vocabulary shared with the web
            sidebar and both control centres. Clusters are named for what
            they contain, so a new module has an obvious home and nobody has
            to learn a scheme. Row-level capability gates are unchanged from
            the previous grouping — only the grouping moved. */}

        <Section label="For you">
          <NavRow
            icon={Bell}
            label="Notifications"
            onPress={() => router.push('/notifications')}
          />
          <NavRow
            icon={Calendar}
            label="My attendance"
            onPress={() => router.push('/my-attendance')}
          />
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
          <NavRow
            icon={BookOpen}
            label="My New Believer journey"
            onPress={() => router.push('/new-believers?scope=mine')}
          />
          <NavRow
            icon={FileText}
            label="My form submissions"
            onPress={() => router.push('/my-form-submissions')}
          />
        </Section>

        <Section label="People">
          <NavRow
            icon={Users}
            label="Members directory"
            onPress={() => router.push('/members')}
          />
          {hasAnyLeadership ? (
            <NavRow
              icon={CheckSquare}
              label="Approvals"
              onPress={() => router.push('/approvals')}
            />
          ) : null}
          {hasAnyLeadership ? (
            <NavRow
              icon={Handshake}
              label="Follow-ups"
              onPress={() => router.push('/follow-ups')}
            />
          ) : null}
          {canSeeAdminSection ? (
            <NavRow
              icon={ShieldAlert}
              label="Concerns"
              onPress={() => router.push('/concerns' as never)}
            />
          ) : null}
          {/* Membership classes are church-wide, so this is open to every
              member: they browse cohorts, join the interest pool and track
              their own progress. Enrolment is not self-service — an admin
              admits from the pool — and membership admins get the pool and
              register surfaces on the same screen. */}
          <NavRow
            icon={GraduationCap}
            label="Membership classes"
            onPress={() => router.push('/membership' as never)}
          />
          {canSeeNewBelieversTeam ? (
            <NavRow
              icon={Sparkles}
              label="New Believers pipeline"
              onPress={() => router.push('/new-believers')}
            />
          ) : null}
          {canSeeNewBelieversTeam ? (
            <NavRow
              icon={CalendarClock}
              label="New Believers sessions"
              onPress={() => router.push('/new-believers/sessions' as never)}
            />
          ) : null}
          <NavRow icon={Handshake} label="Souls" onPress={() => router.push('/souls')} />
          <NavRow
            icon={UserPlus}
            label="Outreach programs"
            onPress={() => router.push('/outreach')}
          />
          <NavRow
            icon={Users}
            label="Dormant attendees"
            onPress={() => router.push('/forms/attendees' as never)}
          />
          <NavRow icon={FileText} label="Fill a form" onPress={() => router.push('/forms')} />
          <NavRow
            icon={ClipboardList}
            label="Form submissions"
            onPress={() => router.push('/forms/submissions' as never)}
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
          {hasAnyLeadership ? (
            <NavRow icon={Repeat} label="Rota" onPress={() => router.push('/rota')} />
          ) : null}
        </Section>

        <Section label="Gatherings">
          {canSeeReports ? (
            <NavRow
              icon={BarChart3}
              label="Services"
              onPress={() => router.push('/attendance' as never)}
            />
          ) : null}
          {canSeeAdminSection ? (
            <NavRow
              icon={ClipboardList}
              label="Check-in desk"
              onPress={() => router.push('/admin/checkin')}
            />
          ) : null}
          {hasAnyLeadership ? (
            <NavRow
              icon={ClipboardList}
              label="Fellowship attendance"
              onPress={() => router.push('/rollcall')}
            />
          ) : null}
        </Section>

        <Section label="Insights">
          {canSeeReports ? (
            <NavRow icon={PieChart} label="Reports" onPress={() => router.push('/reports')} />
          ) : null}
          <NavRow
            icon={PieChart}
            label="Souls dashboard"
            onPress={() => router.push('/souls-dashboard' as never)}
          />
        </Section>

        <Section label="Organisation">
          {canSeeAdminSection ? (
            <NavRow
              icon={Building2}
              label="Branch settings"
              onPress={() => router.push('/branches')}
            />
          ) : null}
          {caps.systemRole === 'admin' ? (
            <NavRow icon={Map} label="Regions" onPress={() => router.push('/regions')} />
          ) : null}
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
            onPress={() => Linking.openURL(ABOUT_URL)}
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

/**
 * A collapsible nav cluster, collapsed by default. With 37 rows across eight
 * clusters the flat list was a long scroll, and it only grows as modules land
 * — collapsed headers keep the whole taxonomy on one screen.
 *
 * Renders nothing when every row inside is gated out — React.Children.toArray
 * drops the `null`s a capability check leaves behind, so a plain member never
 * sees an empty "Organisation" heading. Gated rows must therefore be written
 * as `{cond ? <NavRow/> : null}` siblings, not wrapped in a fragment, or the
 * fragment counts as one present child.
 */
function Section({
  label,
  defaultOpen = false,
  children,
}: {
  label: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  const [open, setOpen] = useState(defaultOpen);
  const visible = React.Children.toArray(children);
  if (visible.length === 0) return null;
  return (
    <View style={styles.group}>
      <Pressable
        onPress={() => setOpen((v) => !v)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={label}
        style={styles.groupHeader}
      >
        <ChevronRight
          color={c.inkFaded}
          size={14}
          strokeWidth={2}
          style={{ transform: [{ rotate: open ? '90deg' : '0deg' }] }}
        />
        <Text style={styles.groupLabel}>{label}</Text>
        <Text style={styles.groupCount}>{visible.length}</Text>
      </Pressable>
      {open ? children : null}
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
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  groupLabel: {
    ...typography.eyebrow,
    color: c.inkFaded,
    flex: 1,
  },
  groupCount: {
    ...typography.meta,
    color: c.inkVeryFaded,
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

