import { useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { ArrowRight, ChevronLeft, ShieldCheck } from 'lucide-react-native';
import { Button, Input, colors, gradients, radii, spacing, typography } from '@kairos/ui-native';
import { api } from '@/lib/api-client';

const MIN_PASSWORD = 8;

/**
 * Password reset screen. Reads the token from `?token=` — matching the URL
 * shape the API mails out (`/reset-password?token=XXX`) so a universal-link
 * tap opens straight into this screen with the token already populated.
 */
export default function ResetPasswordScreen() {
  const router = useRouter();
  const { token } = useLocalSearchParams<{ token?: string }>();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const validation = useMemo(() => {
    if (!password) return null;
    if (password.length < MIN_PASSWORD)
      return `Use at least ${MIN_PASSWORD} characters.`;
    if (confirm && password !== confirm) return 'Passwords do not match.';
    return null;
  }, [password, confirm]);

  const submit = useMutation({
    mutationFn: async () => {
      if (!token) throw new Error('Missing reset token');
      const res = await api.auth.resetPassword({ token, newPassword: password });
      if (!res.success) throw new Error(res.message ?? 'Could not reset password');
      return res.data;
    },
    onSuccess: () => setDone(true),
    onError: (e: Error) => setError(e.message ?? 'Something went wrong'),
  });

  const canSubmit =
    !!token && password.length >= MIN_PASSWORD && password === confirm && !validation;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.headerBar}>
        <Pressable onPress={() => router.replace('/(auth)/login')} hitSlop={8}>
          <ChevronLeft color={colors.ink} size={24} strokeWidth={1.5} />
        </Pressable>
        <Text style={styles.headerTitle}>Reset password</Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
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
            {done ? (
              <>
                <View style={styles.successBadge}>
                  <ShieldCheck color={colors.success} size={22} strokeWidth={1.5} />
                </View>
                <Text style={styles.title}>Password updated</Text>
                <Text style={styles.body}>
                  You can now sign in with your new password.
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
                <Text style={styles.title}>Set a new password</Text>
                <Text style={styles.body}>
                  Choose a password of at least {MIN_PASSWORD} characters.
                </Text>

                {!token ? (
                  <View style={styles.errorBanner}>
                    <Text style={styles.errorText}>
                      Missing reset token. Request a new link from the sign-in
                      screen.
                    </Text>
                  </View>
                ) : null}

                {error ? (
                  <View style={styles.errorBanner}>
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                ) : null}

                <Input
                  label="New password"
                  value={password}
                  onChangeText={(v) => {
                    setPassword(v);
                    setError(null);
                  }}
                  secureTextEntry
                  secureToggle
                  placeholder="At least 8 characters"
                  containerStyle={{ marginTop: spacing.md }}
                />

                <Input
                  label="Confirm password"
                  value={confirm}
                  onChangeText={(v) => {
                    setConfirm(v);
                    setError(null);
                  }}
                  secureTextEntry
                  placeholder="Type it again"
                  containerStyle={{ marginTop: spacing.md }}
                  error={validation ?? undefined}
                />

                <Button
                  label="Update password"
                  onPress={() => submit.mutate()}
                  loading={submit.isPending}
                  disabled={!canSubmit}
                  size="lg"
                  fullWidth
                  iconRight={<ArrowRight color="#ffffff" size={16} strokeWidth={2} />}
                  style={{ marginTop: spacing.lg }}
                />
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
  logoK: {
    fontSize: 28,
    fontWeight: '700',
    color: '#ffffff',
  },
  card: {
    backgroundColor: colors.cardLight,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  title: { ...typography.screenTitle, color: colors.ink },
  body: {
    ...typography.body,
    color: 'rgba(26,28,28,0.7)',
    lineHeight: 20,
  },
  successBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(16,185,129,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  errorBanner: {
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderRadius: radii.sm,
    padding: spacing.sm,
    borderLeftWidth: 3,
    borderLeftColor: colors.danger,
    marginTop: spacing.sm,
  },
  errorText: { ...typography.meta, color: colors.danger },
});
