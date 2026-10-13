import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { BellRing } from 'lucide-react-native';
import {
  radii,
  spacing,
  typography,
  useThemedStyles,
  type ThemeColors,
  useColors,
} from '@kairos/ui-native';
import { useAuthStore } from '@/store/auth';
import { CanvasGround } from '@/components/motion/canvas-ground';
import { CanvasCard } from '@/components/motion/canvas-card';
import { CanvasLogo } from '@/components/motion/canvas-logo';
import { CanvasButton } from '@/components/motion/canvas-button';

/**
 * Phase 1.5 Better-Auth: reached whenever the auth guard sees a signed-in
 * caller with `approvalStatus !== 'approved'` and `mustCompleteProfile ===
 * false`. Explains what happens next + offers a sign-out for callers who
 * want to switch accounts before approval lands.
 */
export default function PendingApprovalScreen() {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  const router = useRouter();
  const clearSession = useAuthStore((s) => s.clearSession);

  async function handleSignOut() {
    await clearSession();
    router.replace('/(auth)/login');
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <CanvasGround />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.brand}>
          <CanvasLogo size={56} />
        </View>

        <CanvasCard style={styles.card} entranceIndex={1}>
          <View style={styles.badge}>
            <BellRing color={c.primary} size={22} strokeWidth={1.5} />
          </View>
          <Text style={styles.title}>Account pending approval</Text>
          <Text style={styles.body}>
            Thanks for signing up. A church administrator will review your
            account shortly. We&apos;ll send you a notification the moment
            you&apos;re approved.
          </Text>
          <CanvasButton
            label="Sign out"
            variant="outline"
            size="lg"
            fullWidth
            onPress={handleSignOut}
            style={{ marginTop: spacing.md }}
          />
        </CanvasCard>
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.page },
    scroll: { padding: spacing.lg, gap: spacing.lg },
    brand: { alignItems: 'center', marginTop: spacing.md },
    card: {
      backgroundColor: c.card,
      borderRadius: radii.lg,
      padding: spacing.lg,
      gap: spacing.sm,
      alignItems: 'center',
    },
    title: { ...typography.screenTitle, color: c.ink, textAlign: 'center' },
    body: {
      ...typography.body,
      color: c.inkMuted,
      lineHeight: 20,
      textAlign: 'center',
    },
    badge: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(93,63,211,0.12)',
    },
  });
}
