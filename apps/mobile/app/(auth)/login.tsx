import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { alert } from '@/lib/alert';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { ArrowRight, Fingerprint } from 'lucide-react-native';
import { Button, Input, colors, spacing, typography, radii, gradients } from '@kairos/ui-native';
import { api } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth';

export default function LoginScreen() {
  const router = useRouter();
  const setSession = useAuthStore((s) => s.setSession);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const login = useMutation({
    mutationFn: async () => {
      const res = await api.auth.login({ email: email.trim(), password });
      if (!res.success || !res.data) {
        throw new Error(res.message ?? 'Login failed');
      }
      return res.data;
    },
    onSuccess: async ({ tokens, member }) => {
      await setSession(tokens, member);
      router.replace('/(tabs)');
    },
    onError: (e: Error) => {
      setError(e.message ?? 'An error occurred');
    },
  });

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
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
            <Text style={styles.brandLabel}>Kharis Church</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.title}>Sign in</Text>

            {error ? (
              <View style={styles.errorBanner}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <Input
              testID="login-email"
              label="Email"
              value={email}
              onChangeText={(v) => {
                setEmail(v);
                setError(null);
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              placeholder="you@example.com"
              containerStyle={{ marginBottom: spacing.md }}
            />

            <Input
              testID="login-password"
              label="Password"
              value={password}
              onChangeText={(v) => {
                setPassword(v);
                setError(null);
              }}
              secureTextEntry
              secureToggle
              placeholder="Password"
              autoComplete="password"
            />

            <Pressable
              onPress={() =>
                alert.info('Reset password', 'Password reset coming soon.')
              }
              style={styles.forgotRow}
              hitSlop={6}
            >
              <Text style={styles.forgotText}>Forgot?</Text>
            </Pressable>

            <Button
              label="Sign in"
              onPress={() => login.mutate()}
              loading={login.isPending}
              disabled={!email || !password}
              size="lg"
              fullWidth
              iconRight={<ArrowRight color="#ffffff" size={16} strokeWidth={2} />}
              style={{ marginTop: spacing.sm }}
            />

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerLabel}>Or use</Text>
              <View style={styles.dividerLine} />
            </View>

            <Pressable
              onPress={() =>
                alert.info(
                  'Face ID',
                  'Biometric sign-in becomes available after you sign in once with your email and password.',
                )
              }
              style={styles.biometricButton}
            >
              <Fingerprint color={colors.primary} size={18} strokeWidth={1.5} />
              <Text style={styles.biometricLabel}>Sign in with Face ID</Text>
            </Pressable>
          </View>

          <Pressable
            onPress={() =>
              alert.info(
                'Create account',
                'Account creation flow will land in the next release. In the meantime, an admin can add you.',
              )
            }
            style={styles.signupRow}
            hitSlop={8}
          >
            <Text style={styles.signupPrompt}>Don&apos;t have an account? </Text>
            <Text style={styles.signupLink}>Create account</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.pageLight },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
    gap: spacing.xl,
  },
  brand: {
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xl,
  },
  logoTile: {
    width: 48,
    height: 48,
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
    borderRadius: radii.md,
  },
  logoK: {
    fontSize: 26,
    fontWeight: '800',
    color: '#ffffff',
  },
  brandLabel: {
    ...typography.eyebrow,
    color: 'rgba(26,28,28,0.55)',
    letterSpacing: 2.2,
  },
  card: {
    backgroundColor: colors.cardLight,
    borderRadius: radii.lg,
    padding: spacing.xl,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
    gap: spacing.md,
  },
  title: {
    ...typography.screenTitle,
    color: colors.ink,
  },
  errorBanner: {
    backgroundColor: 'rgba(225,29,72,0.08)',
    borderRadius: radii.md,
    padding: spacing.md,
  },
  errorText: {
    ...typography.body,
    color: colors.danger,
  },
  forgotRow: {
    alignSelf: 'flex-end',
    paddingVertical: spacing.xs,
  },
  forgotText: {
    ...typography.meta,
    color: colors.primary,
    fontWeight: '600',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginVertical: spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(26,28,28,0.08)',
  },
  dividerLabel: {
    ...typography.meta,
    color: 'rgba(26,28,28,0.5)',
  },
  biometricButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderStyle: 'dashed',
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: radii.lg,
    backgroundColor: 'rgba(93,63,211,0.06)',
    height: 46,
  },
  biometricLabel: {
    ...typography.button,
    color: colors.primary,
  },
  signupRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signupPrompt: {
    ...typography.body,
    color: 'rgba(26,28,28,0.6)',
  },
  signupLink: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
  },
});
