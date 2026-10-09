import { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { ArrowRight } from 'lucide-react-native';
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
import { pickAuthVerse } from '@kairos/core';
import * as biometric from '@/lib/biometric';
import type { ArmedUser } from '@/lib/biometric';
import { alert } from '@/lib/alert';
import { OAuthButtonGroup } from '@/components/oauth-button-group';
import { KharisDove } from '@/components/kharis-dove';
import { AmbientGlow } from '@/components/motion/ambient-glow';
import { CanvasBackground } from '@/components/motion/canvas-background';
import { ContinueAsRow } from '@/components/motion/continue-as-row';
import { FillBar } from '@/components/motion/fill-bar';
import { HaloBorder } from '@/components/motion/halo-border';
import { HandDrawnStroke, HAND_DRAWN_UNDERLINE } from '@/components/motion/hand-drawn-stroke';
import { canvasColors } from '@/components/motion/tokens';
import { useTapRipple } from '@/components/motion/tap-ripple';
import { useEntrance } from '@/components/motion/use-entrance';
import { FLOAT_START_MS, useFloat } from '@/components/motion/use-float';
import { useMotionActive } from '@/components/motion/use-motion-active';
import { useReduceMotion } from '@/components/motion/use-reduce-motion';

/** How long "✓ Welcome back" holds before navigating. */
const WELCOME_HOLD_MS = 700;

export default function LoginScreen() {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();

  // Rotates per mount, so the page has a voice rather than a slogan. Shared
  // with web via the same verse set.
  const verse = useMemo(() => pickAuthVerse(), []);

  // Canvas motion. Reanimated is not installed and adding it would force a
  // native rebuild, so this is RN's built-in Animated on the native driver
  // wherever the property allows it (transform, opacity).
  const reduced = useReduceMotion();
  const motionActive = useMotionActive();
  const insets = useSafeAreaInsets();
  const logoEntrance = useEntrance(0);
  const brandEntrance = useEntrance(1);
  const cardEntrance = useEntrance(2);
  const logoFloat = useFloat(motionActive, FLOAT_START_MS);
  const signInRipple = useTapRipple(radii.lg);
  const router = useRouter();
  const setSession = useAuthStore((s) => s.setSession);
  const signInWithBiometric = useAuthStore((s) => s.signInWithBiometric);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  // The beat between a successful password sign-in and leaving the screen.
  const [welcome, setWelcome] = useState(false);

  // What the device can do (Face ID / Fingerprint / …) and which accounts
  // are already opted in on this device. The picker at the top of the card
  // shows one row per armed user; the email/password form below is the
  // universal fallback.
  const [cap, setCap] = useState<biometric.BiometricCapability | null>(null);
  const [armedUsers, setArmedUsers] = useState<ArmedUser[]>([]);
  const [bioBusy, setBioBusy] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [capability, users] = await Promise.all([
        biometric.getCapability(),
        biometric.listArmedUsers(),
      ]);
      if (cancelled) return;
      setCap(capability);
      setArmedUsers(users);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const canOfferBiometric = !!cap?.available && armedUsers.length > 0;
  // Last in the entrance order: after the card, the SSO buttons and every row.
  const footerEntrance = useEntrance(6 + armedUsers.length);

  async function handleBiometricSignIn(user: ArmedUser) {
    if (!cap?.available || bioBusy) return;
    setBioBusy(user.id);
    setError(null);
    const ok = await signInWithBiometric(user.id, cap.label);
    setBioBusy(null);
    if (ok) {
      router.replace('/(tabs)');
      return;
    }
    // Deliberately NOT disabling on a single failure. Every reason a biometric
    // login can fail — cancelled prompt, phone locked mid-authentication,
    // wrong finger, transient OS glitch — is retriable. The one path that
    // genuinely warrants disarming is a server-rejected refresh token (the
    // sealed value is no longer redeemable), but the user can figure that
    // out from repeated failures and turn it off themselves in Security.
    // Auto-wiping their opt-in for a phone-lock timeout was overreach.
    setError(`Could not sign in as ${user.displayName}. Try again or use your email and password.`);
  }

  /**
   * After a successful password/OAuth login, offer biometric enrolment to
   * users who haven't opted in and haven't already said "Not now" once.
   * Resolves after the user answers so we don't route away mid-modal.
   */
  async function maybeOfferBiometricEnrolment(user: {
    id: string;
    displayName: string;
    email?: string;
    refreshToken: string;
  }) {
    if (!cap?.available) return;
    if (await biometric.isArmedFor(user.id)) return;
    if (await biometric.hasDeclined(user.id)) return;

    const accepted = await alert.confirm({
      title: `Sign in with ${cap.label} next time?`,
      message: 'One tap to unlock the app — no password to type.',
      confirmLabel: 'Enable',
      cancelLabel: 'Not now',
    });
    if (!accepted) {
      await biometric.markDeclined(user.id);
      return;
    }
    const result = await biometric.enable(user.refreshToken, {
      id: user.id,
      displayName: user.displayName,
      email: user.email,
      addedAt: new Date().toISOString(),
    });
    if (!result.ok && result.reason === 'keychain_denied') {
      // User cancelled the OS biometric prompt during the write, or the
      // device declined. Don't nag them again — silent no-op is the right
      // outcome; they can retry from Security if they change their mind.
      await biometric.markDeclined(user.id);
    }
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
      // setSession reseals biometric for users already opted in. It never
      // turns biometric ON for a new user — enrolment lives here so the
      // login screen owns the one-time prompt.
      await setSession(tokens, member);
      await maybeOfferBiometricEnrolment({
        id: member.id,
        displayName: `${member.firstName ?? ''} ${member.lastName ?? ''}`.trim() || member.email,
        email: member.email,
        refreshToken: tokens.refreshToken,
      });
      // Everything that could still fail has succeeded: show it, hold a beat,
      // then go. Under Reduce Motion the hold is kept (it is information, not
      // motion) but shortened.
      setWelcome(true);
      await new Promise((r) => setTimeout(r, reduced ? 300 : WELCOME_HOLD_MS));
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
      await maybeOfferBiometricEnrolment({
        id: member.id,
        displayName: `${member.firstName ?? ''} ${member.lastName ?? ''}`.trim() || member.email,
        email: member.email,
        refreshToken: result.tokens.refreshToken,
      });
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
      {/* The Canvas ground (tints + dot grid) and the glow behind the logo.
          Both sit behind everything; the card floats on them. */}
      <CanvasBackground />
      <AmbientGlow top={insets.top + 72} active={motionActive} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.brand}>
            <Animated.View style={logoEntrance}>
              <Animated.View style={[styles.logoTile, logoFloat]}>
                <LinearGradient
                  colors={gradients.brand}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.logoGradientFill}
                />
                <KharisDove size={32} draw />
              </Animated.View>
            </Animated.View>
            <Animated.View style={[styles.brandText, brandEntrance]}>
              <Text style={styles.brandLabel}>Kharis Church</Text>
              <Text style={styles.verse}>
                {verse.before}
                <Text style={styles.versePrimary}>{verse.primaryWord}</Text>
                {verse.between}
                <Text style={styles.verseAccent}>{verse.accentWord}</Text>
                {verse.after}
              </Text>
              <Text style={styles.verseRef}>{verse.reference}</Text>
            </Animated.View>
          </View>

          <Animated.View style={cardEntrance}>
          <HaloBorder radius={radii.lg} base={c.border} active={motionActive} style={styles.cardShadow}>
          <View style={styles.card}>
            <View style={styles.titleWrap}>
              <Text style={styles.title}>Sign in</Text>
              {/* Hand-drawn gold underline, ~1.1s after mount. */}
              <View pointerEvents="none" style={styles.underline}>
                <HandDrawnStroke
                  {...HAND_DRAWN_UNDERLINE}
                  stroke={canvasColors.gold}
                  strokeWidth={5}
                  delay={1100}
                />
              </View>
            </View>

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
              canvas
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
              canvas
            />

            <Pressable
              onPress={() => router.push('/(auth)/forgot-password' as never)}
              style={styles.forgotRow}
              hitSlop={6}
            >
              <Text style={styles.forgotText}>Forgot?</Text>
            </Pressable>

            <Button
              label={welcome ? '✓ Welcome back' : login.isPending ? 'Signing in…' : 'Sign in'}
              onPress={() => login.mutate()}
              busy={login.isPending || welcome}
              disabled={!email || !password}
              size="lg"
              fullWidth
              iconRight={
                login.isPending || welcome ? undefined : (
                  <ArrowRight color="#ffffff" size={16} strokeWidth={2} />
                )
              }
              style={{ marginTop: spacing.sm }}
              onPressIn={signInRipple.onPressIn}
              onLayout={signInRipple.onLayout}
              overlay={
                <>
                  {signInRipple.layer}
                  <FillBar active={login.isPending || welcome} />
                </>
              }
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
              entranceStart={3}
            />

            {/* One row per opted-in account on this device. Empty when no
                one has enrolled — the email/password form above is the
                fallback. */}
            {canOfferBiometric ? (
              <View style={styles.biometricGroup}>
                {armedUsers.map((user, i) => (
                  <ContinueAsRow
                    key={user.id}
                    name={user.displayName}
                    busy={bioBusy === user.id}
                    disabled={!!bioBusy}
                    accessibilityLabel={`Sign in as ${user.displayName} with ${cap!.label}`}
                    onAuthenticate={() => void handleBiometricSignIn(user)}
                    entranceIndex={6 + i}
                  />
                ))}
              </View>
            ) : null}
          </View>
          </HaloBorder>
          </Animated.View>

          <Animated.View style={footerEntrance}>
            <Pressable
              onPress={() => router.push('/(auth)/signup' as never)}
              style={styles.signupRow}
              hitSlop={8}
            >
              <Text style={styles.signupPrompt}>Don&apos;t have an account? </Text>
              <Text style={styles.signupLink}>Create account</Text>
            </Pressable>
          </Animated.View>
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
  verse: {
    ...typography.body,
    color: c.inkMuted,
    textAlign: 'center',
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
  },
  versePrimary: { color: c.primary, fontWeight: '600' },
  verseAccent: { color: c.gold, fontWeight: '600' },
  verseRef: {
    ...typography.meta,
    color: c.inkFaded,
    textAlign: 'center',
    marginTop: spacing.xs,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
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
  brandLabel: {
    ...typography.eyebrow,
    color: c.inkMuted,
    letterSpacing: 2.2,
  },
  brandText: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  // The shadow lives on the halo's outer ring; the card inside paints the
  // surface only.
  cardShadow: {
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  card: {
    backgroundColor: c.card,
    padding: spacing.xl,
    gap: spacing.md,
  },
  titleWrap: {
    alignSelf: 'flex-start',
    marginBottom: spacing.xs,
  },
  underline: {
    position: 'absolute',
    top: '100%',
    marginTop: -2,
    left: '-2%',
    width: '104%',
    height: 22,
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
  biometricGroup: {
    gap: spacing.sm,
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

