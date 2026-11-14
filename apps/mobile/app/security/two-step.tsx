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
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, KeyRound, ShieldAlert, ShieldCheck } from 'lucide-react-native';
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
import { api } from '@/lib/api-client';
import { alert } from '@/lib/alert';
import { MfaEnrolment } from '@/components/mfa-enrolment';

/** Below this, the member is close enough to locked out to be told. */
const LOW_BACKUP_CODES = 3;

type PasswordAction = 'disable' | 'regenerate' | null;

/**
 * Two-step sign-in, managed from Security.
 *
 * The screen reads two independent facts, `enrolled` and `required`, and all
 * four combinations are real: a leader who must have it and does not yet, a
 * member who turned it on without being asked, and so on. It never tells an
 * ordinary member something is required of them.
 *
 * Both destructive actions re-ask for the password. That is the API's rule,
 * not this screen's: removing a second factor from a session someone else has
 * borrowed is exactly what that someone wants to do, and a phone left
 * unlocked on a pew is the realistic version of that.
 */
export default function TwoStepSignIn() {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  const router = useRouter();
  const qc = useQueryClient();

  const [enrolling, setEnrolling] = useState(false);
  const [passwordAction, setPasswordAction] = useState<PasswordAction>(null);
  const [password, setPassword] = useState('');
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [freshCodes, setFreshCodes] = useState<string[] | null>(null);

  const status = useQuery({
    queryKey: ['mfa'],
    queryFn: async () => {
      const res = await api.auth.mfa.status();
      if (!res.success || !res.data) throw new Error(res.message ?? 'Could not load');
      return res.data;
    },
  });

  const disable = useMutation({
    mutationFn: async (currentPassword: string) => {
      const res = await api.auth.mfa.disable({ currentPassword });
      if (!res.success) throw new Error(res.message ?? 'That did not work');
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['mfa'] }),
  });

  const regenerate = useMutation({
    mutationFn: async (currentPassword: string) => {
      const res = await api.auth.mfa.regenerateBackupCodes({ currentPassword });
      if (!res.success || !res.data) throw new Error(res.message ?? 'That did not work');
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['mfa'] }),
  });

  function openPasswordPrompt(action: Exclude<PasswordAction, null>) {
    setPassword('');
    setDialogError(null);
    setPasswordAction(action);
  }

  async function submitPasswordAction() {
    setDialogError(null);
    if (!password) {
      setDialogError('Enter your password to confirm.');
      return;
    }
    try {
      if (passwordAction === 'disable') {
        await disable.mutateAsync(password);
        setPasswordAction(null);
        alert.info('Two-step sign-in is off', 'You can turn it back on whenever you like.');
      } else {
        const result = await regenerate.mutateAsync(password);
        setPasswordAction(null);
        setFreshCodes(result.backupCodes);
      }
      setPassword('');
    } catch (err) {
      setDialogError(err instanceof Error ? err.message : 'That did not work. Please try again.');
    }
  }

  const data = status.data;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerBar}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ChevronLeft color={c.ink} size={24} strokeWidth={1.5} />
        </Pressable>
        <Text style={styles.headerTitle}>Two-step sign-in</Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          {status.isLoading ? <Text style={styles.meta}>Loading…</Text> : null}

          {status.isError ? (
            <Text style={styles.errorLine}>
              {status.error instanceof Error
                ? status.error.message
                : 'Could not load your two-step settings.'}
            </Text>
          ) : null}

          {/* A fresh set of backup codes, shown once and then gone. */}
          {freshCodes ? (
            <Card padding="md" style={{ gap: spacing.md }}>
              <View style={styles.warnRow}>
                <KeyRound color={c.goldDark} size={20} strokeWidth={1.5} />
                <Text style={styles.warnText}>
                  Your old codes have stopped working. Save these now, they are shown once.
                </Text>
              </View>
              {freshCodes.map((backupCode) => (
                <Text key={backupCode} selectable style={styles.codeLine}>
                  {backupCode}
                </Text>
              ))}
              <Button
                label="Done, I have saved them"
                variant="primary"
                size="lg"
                fullWidth
                onPress={() => setFreshCodes(null)}
              />
            </Card>
          ) : null}

          {data && !freshCodes && !enrolling ? (
            data.enrolled ? (
              <Card padding="md" style={{ gap: spacing.md }}>
                <View style={styles.okRow}>
                  <ShieldCheck color={c.successText} size={20} strokeWidth={1.5} />
                  <Text style={styles.okText}>On. We ask for a code when you sign in.</Text>
                </View>

                <Text style={styles.meta}>
                  {data.backupCodesRemaining} backup{' '}
                  {data.backupCodesRemaining === 1 ? 'code' : 'codes'} left.
                </Text>
                {data.backupCodesRemaining <= LOW_BACKUP_CODES ? (
                  <Text style={styles.warnInline}>
                    Worth getting a new set before you run out. Running out with a lost phone
                    means asking an administrator to let you back in.
                  </Text>
                ) : null}

                <Button
                  label="New backup codes"
                  variant="secondary"
                  size="md"
                  fullWidth
                  onPress={() => openPasswordPrompt('regenerate')}
                />
                <Button
                  label="Turn off"
                  variant="ghost"
                  size="md"
                  fullWidth
                  onPress={() => openPasswordPrompt('disable')}
                />
              </Card>
            ) : (
              <Card padding="md" style={{ gap: spacing.md }}>
                {data.required ? (
                  <View style={styles.warnRow}>
                    <ShieldAlert color={c.goldDark} size={20} strokeWidth={1.5} />
                    <Text style={styles.warnText}>
                      Your role can see other people&apos;s personal details, so two-step sign-in
                      will be required before long. Setting it up now means it will not interrupt
                      you later.
                    </Text>
                  </View>
                ) : (
                  <Text style={styles.body}>
                    Not on. If someone learns your password, it is all they need. A second step
                    takes a minute to set up and stops that.
                  </Text>
                )}

                {data.pendingEnrolment ? (
                  <Text style={styles.meta}>
                    You started setting this up and did not finish. Starting again gives you a
                    fresh key.
                  </Text>
                ) : null}

                <Button
                  label="Set up two-step sign-in"
                  variant="primary"
                  size="lg"
                  fullWidth
                  onPress={() => setEnrolling(true)}
                />
              </Card>
            )
          ) : null}

          {enrolling ? (
            <MfaEnrolment
              onComplete={() => {
                setEnrolling(false);
                void qc.invalidateQueries({ queryKey: ['mfa'] });
                alert.info('Two-step sign-in is on', 'We will ask for a code next time you sign in.');
              }}
              onCancel={() => setEnrolling(false)}
            />
          ) : null}

          {passwordAction ? (
            <Card padding="md" style={{ gap: spacing.md }}>
              <Text style={styles.stepTitle}>
                {passwordAction === 'disable' ? 'Turn off two-step sign-in?' : 'New backup codes'}
              </Text>
              <Text style={styles.body}>
                {passwordAction === 'disable'
                  ? 'Your password alone will get into your account again. Enter it to confirm this is you.'
                  : 'Your current backup codes stop working as soon as the new ones appear. Enter your password to confirm.'}
              </Text>
              <Input
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                secureToggle
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="password"
                accessibilityLabel="Your password"
                error={dialogError}
              />
              <Button
                label={passwordAction === 'disable' ? 'Turn it off' : 'Generate new codes'}
                variant="primary"
                size="lg"
                fullWidth
                loading={disable.isPending || regenerate.isPending}
                onPress={() => void submitPasswordAction()}
              />
              <Button
                label="Cancel"
                variant="ghost"
                size="md"
                fullWidth
                onPress={() => setPasswordAction(null)}
              />
            </Card>
          ) : null}
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
    container: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.lg },
    stepTitle: { ...typography.cardTitle, color: c.ink },
    body: { ...typography.body, color: c.inkMuted, lineHeight: 20 },
    meta: { ...typography.meta, color: c.inkMuted },
    errorLine: { ...typography.body, color: c.danger },
    okRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
    okText: { ...typography.body, color: c.successText, flex: 1 },
    warnRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.md,
      backgroundColor: 'rgba(248,181,55,0.12)',
      padding: spacing.md,
      borderRadius: radii.md,
    },
    warnText: { ...typography.body, color: c.ink, flex: 1 },
    warnInline: { ...typography.meta, color: c.goldDark },
    codeLine: {
      ...typography.body,
      fontFamily: 'monospace',
      letterSpacing: 2,
      color: c.ink,
    },
  });
}
