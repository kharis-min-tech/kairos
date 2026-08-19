import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { BellRing } from 'lucide-react-native';
import {
  Button,
  gradients,
  radii,
  spacing,
  typography,
  useThemedStyles,
  type ThemeColors,
  useColors,
} from '@kairos/ui-native';
import { useAuthStore } from '@/store/auth';

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
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.brand}>
          <View style={styles.logoTile}>
            <LinearGradient
              colors={gradients.brand}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.logoGradientFill}
            />
            <Text style={styles.logoK}>K</Text>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.badge}>
            <BellRing color={c.primary} size={22} strokeWidth={1.5} />
          </View>
          <Text style={styles.title}>Account pending approval</Text>
          <Text style={styles.body}>
            Thanks for signing up. A church administrator will review your
            account shortly. We&apos;ll send you a notification the moment
            you&apos;re approved.
          </Text>
          <Button
            label="Sign out"
            variant="outline"
            size="lg"
            fullWidth
            onPress={handleSignOut}
            style={{ marginTop: spacing.md }}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.page },
    scroll: { padding: spacing.lg, gap: spacing.lg },
    brand: { alignItems: 'center', marginTop: spacing.md },
    logoTile: {
      width: 56,
      height: 56,
      borderRadius: radii.md,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    logoGradientFill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
    logoK: { fontSize: 28, fontWeight: '700', color: '#ffffff' },
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
