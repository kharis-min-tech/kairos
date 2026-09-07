import { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ChevronLeft,
  ChevronRight,
  KeyRound,
  Mail,
  History,
  Link2,
  Fingerprint,
} from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import {
  Card,
  radii,
  spacing,
  typography,
  useThemedStyles,
  type ThemeColors,
  useColors,
} from '@kairos/ui-native';
import { alert } from '@/lib/alert';
import { useAuthStore } from '@/store/auth';
import * as biometric from '@/lib/biometric';

export default function SecurityHub() {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerBar}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ChevronLeft color={c.ink} size={24} strokeWidth={1.5} />
        </Pressable>
        <Text style={styles.headerTitle}>Security</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.introBlock}>
          <Text style={styles.introTitle}>Account security</Text>
          <Text style={styles.introMeta}>
            Change your password, move your account to a new email, or review recent
            sign-in activity.
          </Text>
        </View>

        <View style={styles.list}>
          <NavLink
            icon={KeyRound}
            title="Change password"
            meta="Update your login password. You'll need your current one."
            onPress={() => router.push('/security/change-password')}
          />
          <NavLink
            icon={Mail}
            title="Change email"
            meta="Move your account to a new email. Both addresses get notified."
            onPress={() => router.push('/security/change-email')}
          />
          <NavLink
            icon={Link2}
            title="Connected accounts"
            meta="Link or disconnect Google, Microsoft, and Apple sign-in."
            onPress={() => router.push('/security/connections' as never)}
          />
          <NavLink
            icon={History}
            title="Recent activity"
            meta="Sign-ins, password changes, and role updates on your account."
            onPress={() => router.push('/recent-activity')}
          />

          <BiometricToggle />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/**
 * Opt in to biometric sign-in.
 *
 * Enabling seals a copy of the refresh token behind the OS keychain's own
 * authentication requirement, so the token is unreadable without a successful
 * biometric check — the prompt is raised by that read, not by us in front of a
 * value we already hold. See lib/biometric.ts.
 *
 * Hidden entirely on a device with no hardware, and shown disabled with an
 * explanation when hardware exists but nothing is enrolled. A toggle that
 * silently does nothing is what this feature is replacing.
 */
function BiometricToggle() {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  const refreshToken = useAuthStore((s) => s.refreshToken);

  const [cap, setCap] = useState<biometric.BiometricCapability | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [capability, on] = await Promise.all([
        biometric.getCapability(),
        biometric.isEnabled(),
      ]);
      if (cancelled) return;
      setCap(capability);
      setEnabled(on);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!cap || !cap.hasHardware) return null;

  async function toggle(next: boolean) {
    if (busy || !cap) return;
    setBusy(true);
    try {
      if (!next) {
        await biometric.disable();
        setEnabled(false);
        return;
      }
      if (!refreshToken) {
        alert.info(
          'Sign in again first',
          'Your session needs refreshing before biometric sign-in can be armed.',
        );
        return;
      }
      const ok = await biometric.enable(refreshToken);
      setEnabled(ok);
      if (!ok) {
        alert.info(
          `Could not enable ${cap.label}`,
          'The device declined. Check that a fingerprint or face is still enrolled, then try again.',
        );
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card padding="md" style={styles.linkCard}>
      <View style={styles.iconTile}>
        <Fingerprint color={c.primary} size={18} strokeWidth={1.5} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={styles.linkTitle}>Sign in with {cap.label}</Text>
        <Text style={styles.linkMeta}>
          {!cap.isEnrolled
            ? `Set up ${cap.label} in your device settings first.`
            : enabled
              ? 'Armed. Lasts up to 7 days, then asks for your password again.'
              : 'Unlock the app without typing your password.'}
        </Text>
      </View>
      <Switch
        value={enabled}
        onValueChange={(v) => void toggle(v)}
        disabled={busy || !cap.isEnrolled}
      />
    </Card>
  );
}

function NavLink({
  icon: Icon,
  title,
  meta,
  onPress,
}: {
  icon: LucideIcon;
  title: string;
  meta: string;
  onPress: () => void;
}) {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  return (
    <Pressable onPress={onPress}>
      <Card padding="md" style={styles.linkCard}>
        <View style={styles.iconTile}>
          <Icon color={c.primary} size={18} strokeWidth={1.5} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={styles.linkTitle}>{title}</Text>
          <Text style={styles.linkMeta}>{meta}</Text>
        </View>
        <ChevronRight color={c.inkVeryFaded} size={18} strokeWidth={1.5} />
      </Card>
    </Pressable>
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
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  introBlock: { gap: 2 },
  introTitle: { ...typography.screenTitle, color: c.ink },
  introMeta: { ...typography.body, color: c.inkMuted, lineHeight: 20 },
  list: { gap: spacing.sm },
  linkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  iconTile: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    backgroundColor: 'rgba(93,63,211,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkTitle: { ...typography.body, color: c.ink, fontWeight: '600' },
  linkMeta: {
    ...typography.meta,
    color: c.inkMuted,
    lineHeight: 15,
  },
});
}

