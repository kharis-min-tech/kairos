import { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { CheckCircle2, XCircle, ChevronLeft } from 'lucide-react-native';
import { Button, colors, gradients, radii, spacing, typography } from '@kairos/ui-native';
import { api } from '@/lib/api-client';

/**
 * Email verification screen. Reached when the OS routes an
 * `https://kairos.kharis.org/verify-email?token=XXX` universal-link to the
 * app instead of the browser. Auto-posts the token on mount.
 */
export default function VerifyEmailScreen() {
  const router = useRouter();
  const { token } = useLocalSearchParams<{ token?: string }>();
  const [state, setState] = useState<'idle' | 'verifying' | 'done' | 'error'>(
    token ? 'verifying' : 'error',
  );
  const [message, setMessage] = useState<string | null>(
    token ? null : 'Missing verification token.',
  );

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await api.auth.verifyEmail({ token });
        if (cancelled) return;
        if (!res.success) throw new Error(res.message ?? 'Verification failed');
        setState('done');
      } catch (e) {
        if (cancelled) return;
        setState('error');
        setMessage(e instanceof Error ? e.message : 'Verification failed');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.headerBar}>
        <Pressable onPress={() => router.replace('/(auth)/login')} hitSlop={8}>
          <ChevronLeft color={colors.ink} size={24} strokeWidth={1.5} />
        </Pressable>
        <Text style={styles.headerTitle}>Verify email</Text>
        <View style={{ width: 24 }} />
      </View>

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
          {state === 'verifying' ? (
            <>
              <ActivityIndicator color={colors.primary} />
              <Text style={styles.title}>Verifying…</Text>
              <Text style={styles.body}>Just a moment.</Text>
            </>
          ) : state === 'done' ? (
            <>
              <View style={[styles.badge, styles.badgeGood]}>
                <CheckCircle2 color={colors.success} size={22} strokeWidth={1.5} />
              </View>
              <Text style={styles.title}>Email verified</Text>
              <Text style={styles.body}>
                Once an admin approves your account, you can sign in.
              </Text>
              <Button
                label="Back to sign in"
                size="lg"
                fullWidth
                onPress={() => router.replace('/(auth)/login')}
                style={{ marginTop: spacing.md }}
              />
            </>
          ) : (
            <>
              <View style={[styles.badge, styles.badgeBad]}>
                <XCircle color={colors.danger} size={22} strokeWidth={1.5} />
              </View>
              <Text style={styles.title}>Could not verify</Text>
              <Text style={styles.body}>
                {message ?? 'The link may have expired.'}
              </Text>
              <Button
                label="Back to sign in"
                size="lg"
                fullWidth
                onPress={() => router.replace('/(auth)/login')}
                style={{ marginTop: spacing.md }}
              />
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
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
  scroll: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  brand: { alignItems: 'center', marginTop: spacing.md },
  logoTile: {
    width: 56,
    height: 56,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logoGradientFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  logoK: { fontSize: 28, fontWeight: '700', color: '#ffffff' },
  card: {
    backgroundColor: colors.cardLight,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.sm,
    alignItems: 'center',
  },
  title: { ...typography.screenTitle, color: colors.ink, textAlign: 'center' },
  body: {
    ...typography.body,
    color: 'rgba(26,28,28,0.7)',
    lineHeight: 20,
    textAlign: 'center',
  },
  badge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeGood: { backgroundColor: 'rgba(16,185,129,0.12)' },
  badgeBad: { backgroundColor: 'rgba(239,68,68,0.12)' },
});
