import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { ChevronLeft, ShieldCheck } from 'lucide-react-native';
import {
  Button,
  Card,
  Input,
  radii,
  spacing,
  typography,
  useThemedStyles,
  type ThemeColors,
  useColors,
} from '@kairos/ui-native';
import type { AuthTokens, MemberProfile } from '@kairos/types';
import { api } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth';
import { useMfaChallengeStore } from '@/store/mfa-challenge';
import { MfaEnrolment } from '@/components/mfa-enrolment';

/**
 * The second half of a sign-in, on the phone.
 *
 * Three doors fill the challenge store before pushing here: the password
 * form, the OAuth callback, and the OAuth confirm-link exchange. None of them
 * holds a session at this point, only the short-lived pre-MFA token, which
 * lives in memory and is never written to SecureStore.
 *
 * Two shapes, chosen by the stage the server set:
 *   - `challenge` - a factor exists; ask for a code from it.
 *   - `enrolment` - the cutover has passed and this member has no factor;
 *     they set one up here and the confirm call signs them in.
 *
 * Arriving with an empty store means the app was killed mid-sign-in. That is
 * the designed consequence of not persisting the token, so the screen says so
 * instead of showing a field that cannot work.
 */
export default function MfaScreen() {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  const router = useRouter();

  const token = useMfaChallengeStore((s) => s.token);
  const stage = useMfaChallengeStore((s) => s.stage);
  const clearChallenge = useMfaChallengeStore((s) => s.clear);
  const setSession = useAuthStore((s) => s.setSession);

  const [code, setCode] = useState('');
  const [usingBackupCode, setUsingBackupCode] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const verify = useMutation({
    mutationFn: async (submitted: string) => {
      if (!token) throw new Error('Please sign in again.');
      const res = await api.auth.mfa.verify({ code: submitted }, token);
      if (!res.success || !res.data) throw new Error(res.message ?? 'That code was not accepted');
      return res.data;
    },
  });

  /**
   * Persist the session the server just handed back, then leave.
   *
   * Biometric is deliberately not offered here. Arming it reseals the refresh
   * token behind a keychain prompt, and stacking a Face ID sheet on top of a
   * member who has just typed a code is two prompts in a row for one sign-in.
   * The login screen owns that one-time offer; Security owns the toggle.
   */
  async function finish(session: { tokens?: AuthTokens; member?: MemberProfile }) {
    const { tokens, member } = session;
    if (!tokens || !member) {
      setError('Your sign-in could not be completed. Please start again.');
      return;
    }
    await setSession(tokens, member);
    clearChallenge();
    router.replace('/(tabs)');
  }

  async function submitCode() {
    setError(null);
    const trimmed = code.trim();
    if (trimmed.length < 6) {
      setError(
        usingBackupCode
          ? 'Enter one of your backup codes.'
          : 'Enter the 6-digit code from your authenticator app.',
      );
      return;
    }
    try {
      await finish(await verify.mutateAsync(trimmed));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That code was not accepted.');
      setCode('');
    }
  }

  function startAgain() {
    clearChallenge();
    router.replace('/(auth)/login');
  }

  const header = (title: string) => (
    <View style={styles.headerBar}>
      <Pressable onPress={startAgain} hitSlop={8} accessibilityLabel="Back to sign in">
        <ChevronLeft color={c.ink} size={24} strokeWidth={1.5} />
      </Pressable>
      <Text style={styles.headerTitle}>{title}</Text>
      <View style={{ width: 24 }} />
    </View>
  );

  if (!token || !stage) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        {header('Sign in')}
        <ScrollView contentContainerStyle={styles.container}>
          <Card padding="md" style={{ gap: spacing.md }}>
            <Text style={styles.title}>Let us start again</Text>
            <Text style={styles.body}>
              For your security we do not keep a half-finished sign-in. Enter your password again
              and we will ask for your code straight after.
            </Text>
          </Card>
          <Button
            label="Back to sign in"
            variant="primary"
            size="lg"
            fullWidth
            onPress={startAgain}
          />
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (stage === 'enrolment') {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        {header('Two-step sign-in')}
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
            <Text style={styles.body}>
              You can see other people&apos;s personal details in Kairos, so we ask for a second
              step at sign-in. It takes about a minute and you only do it once.
            </Text>
            <MfaEnrolment challengeToken={token} onComplete={(r) => void finish(r)} />
            {error ? <Text style={styles.errorLine}>{error}</Text> : null}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {header('One more step')}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <Card padding="md" style={{ gap: spacing.md }}>
            <Text style={styles.fieldLabel}>
              {usingBackupCode ? 'Backup code' : '6-digit code'}
            </Text>
            <Input
              value={code}
              onChangeText={setCode}
              // A backup code has letters in it, so a number pad would leave
              // the member unable to type one at all.
              keyboardType={usingBackupCode ? 'default' : 'number-pad'}
              textContentType="oneTimeCode"
              autoCapitalize="characters"
              autoCorrect={false}
              autoFocus
              placeholder={usingBackupCode ? 'ABCDE-FGHIJ' : '123456'}
              editable={!verify.isPending}
              error={error}
              accessibilityLabel={usingBackupCode ? 'Backup code' : '6-digit code'}
            />
          </Card>

          <Button
            label={verify.isPending ? 'Checking…' : 'Continue'}
            variant="primary"
            size="lg"
            fullWidth
            loading={verify.isPending}
            iconLeft={<ShieldCheck color={c.onPrimary} size={18} strokeWidth={1.5} />}
            onPress={() => void submitCode()}
          />

          <Pressable
            onPress={() => {
              setUsingBackupCode((v) => !v);
              setCode('');
              setError(null);
            }}
          >
            <Text style={styles.link}>
              {usingBackupCode
                ? 'Use a code from my authenticator app'
                : 'I cannot reach my authenticator app'}
            </Text>
          </Pressable>

          <Pressable onPress={startAgain}>
            <Text style={styles.link}>Sign in as someone else</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
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
    title: { ...typography.screenTitle, color: c.ink },
    body: { ...typography.body, color: c.inkMuted, lineHeight: 20 },
    fieldLabel: { ...typography.meta, color: c.inkMuted },
    errorLine: { ...typography.body, color: c.danger },
    link: {
      ...typography.body,
      color: c.primary,
      textAlign: 'center',
      textDecorationLine: 'underline',
      paddingVertical: spacing.xs,
      borderRadius: radii.xs,
    },
  });
}
