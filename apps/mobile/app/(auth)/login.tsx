import { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { ArrowRight, Fingerprint } from 'lucide-react-native';
import type { Member } from '@kairos/types';
import {
  Button,
  Input,
  spacing,
  typography,
  radii,
  gradients,
  useThemedStyles,
  type ThemeColors,
  useColors,
} from '@kairos/ui-native';
import { api } from '@/lib/api-client';
import { apiBaseUrl } from '@/lib/config';
import { mapOAuthErrorSlug, type OAuthStartResult } from '@/lib/oauth';
import { useAuthStore } from '@/store/auth';
import * as biometric from '@/lib/biometric';
import { OAuthButtonGroup } from '@/components/oauth-button-group';

export default function LoginScreen() {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  const router = useRouter();
  const setSession = useAuthStore((s) => s.setSession);
  const signInWithBiometric = useAuthStore((s) => s.signInWithBiometric);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Whether to offer the biometric button at all, and what to call it. Both
  // come from the device: the old placeholder said "Face ID" beside a
  // fingerprint icon, which was wrong on most Android hardware.
  const [bio, setBio] = useState<{ label: string; armed: boolean } | null>(null);
  const [bioBusy, setBioBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [cap, enabled] = await Promise.all([
        biometric.getCapability(),
        biometric.isEnabled(),
      ]);
      if (cancelled) return;
      setBio({ label: cap.label, armed: cap.available && enabled });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleBiometricSignIn() {
    if (!bio?.armed || bioBusy) return;
    setBioBusy(true);
    setError(null);
    const ok = await signInWithBiometric(bio.label);
    setBioBusy(false);
    if (ok) {
      router.replace('/(tabs)');
      return;
    }
    // Deliberately not distinguishing cancelled / no-match / expired: they all
    // mean "use your password", and guessing wrong reads as an accusation.
    setError(`Could not sign in with ${bio.label}. Use your email and password.`);
  }

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
      // A password sign-in re-arms an already-enabled seal, refreshing its
      // 7-day window. It never turns biometrics ON by itself — that is an
      // explicit choice made in Settings.
      await biometric.rearmAfterPasswordLogin(tokens.refreshToken);
      router.replace('/(tabs)');
    },
    onError: (e: Error) => {
      setError(e.message ?? 'An error occurred');
    },
  });

  // OAuth (Better-Auth Phase 1). The provider handshake happens in an
  // in-app browser via `startOAuthFlow`; on `signed_in` we fetch /members/me
  // with the returned bearer to hydrate the store before routing. On the
  // unverified-email collision path we route to `oauth-confirm-link` for
  // password confirmation before linking.
  async function handleOAuthResult(result: OAuthStartResult) {
    if (result.kind === 'cancelled') return;
    if (result.kind === 'error') {
      setError(mapOAuthErrorSlug(result.slug));
      return;
    }
    if (result.kind === 'confirm_link') {
      // expo-router typed-routes cache is stale for this newly-added screen;
      // regenerates on next `expo start`. Casting to Href-compatible shape.
      router.push({
        pathname: '/(auth)/oauth-confirm-link' as never,
        params: {
          token: result.confirmationToken,
          email: result.email,
          provider: result.provider,
        },
      });
      return;
    }
    try {
      const member = await fetchMemberProfile(result.tokens.accessToken);
      await setSession(result.tokens, member);
      router.replace('/(tabs)');
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Signed in but could not load your profile.',
      );
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
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
              onPress={() => router.push('/(auth)/forgot-password' as never)}
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
              <Text style={styles.dividerLabel}>Or continue with</Text>
              <View style={styles.dividerLine} />
            </View>

            <OAuthButtonGroup
              actionLabel="sign-in"
              onResult={handleOAuthResult}
              disabled={login.isPending}
              variant="icons"
            />

            {/* Only shown once biometrics are actually armed. Offering it
                otherwise was the old placeholder's sin: a button that could
                never do anything. */}
            {bio?.armed ? (
              <Pressable
                onPress={() => void handleBiometricSignIn()}
                style={styles.biometricButton}
                disabled={bioBusy}
                accessibilityRole="button"
                accessibilityLabel={`Sign in with ${bio.label}`}
              >
                <Fingerprint color={c.primary} size={18} strokeWidth={1.5} />
                <Text style={styles.biometricLabel}>
                  {bioBusy ? 'Authenticating…' : `Sign in with ${bio.label}`}
                </Text>
              </Pressable>
            ) : null}
          </View>

          <Pressable
            onPress={() => router.push('/(auth)/signup' as never)}
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

/**
 * Fetch `/api/members/me` with an explicit bearer token. Used by the OAuth
 * flow after the browser hands back tokens but before we've persisted them
 * — the api-client's token cache hasn't been primed yet, so we bypass it
 * with a raw fetch.
 */
async function fetchMemberProfile(accessToken: string): Promise<Member> {
  const res = await fetch(`${apiBaseUrl.replace(/\/$/, '')}/api/members/me`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  });
  if (!res.ok) {
    throw new Error(
      res.status === 401
        ? 'Sign-in token was not accepted.'
        : `Could not load your profile (HTTP ${res.status}).`,
    );
  }
  const body = (await res.json()) as { success?: boolean; data?: Member; message?: string };
  if (!body.success || !body.data) {
    throw new Error(body.message ?? 'Could not load your profile.');
  }
  return body.data;
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.page },
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
    color: c.inkMuted,
    letterSpacing: 2.2,
  },
  card: {
    backgroundColor: c.card,
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
    color: c.ink,
  },
  errorBanner: {
    backgroundColor: 'rgba(225,29,72,0.08)',
    borderRadius: radii.md,
    padding: spacing.md,
  },
  errorText: {
    ...typography.body,
    color: c.danger,
  },
  forgotRow: {
    alignSelf: 'flex-end',
    paddingVertical: spacing.xs,
  },
  forgotText: {
    ...typography.meta,
    color: c.primary,
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
    backgroundColor: c.divider,
  },
  dividerLabel: {
    ...typography.meta,
    color: c.inkFaded,
  },
  biometricButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderStyle: 'dashed',
    borderWidth: 1.5,
    borderColor: c.primary,
    borderRadius: radii.lg,
    backgroundColor: 'rgba(93,63,211,0.06)',
    height: 46,
  },
  biometricLabel: {
    ...typography.button,
    color: c.primary,
  },
  signupRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signupPrompt: {
    ...typography.body,
    color: c.inkMuted,
  },
  signupLink: {
    ...typography.body,
    color: c.primary,
    fontWeight: '600',
  },
});
}

