import { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Linking } from 'react-native';
import { useMutation } from '@tanstack/react-query';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { KeyRound, ShieldCheck, Smartphone } from 'lucide-react-native';
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
import type { MfaConfirmResponse, MfaEnrolmentStart } from '@kairos/types';
import { api } from '@/lib/api-client';
import { alert } from '@/lib/alert';

/**
 * Setting up an authenticator, on a phone.
 *
 * **No QR code here, deliberately.** The web version draws one because the
 * authenticator is usually on a different device from the browser. On the
 * phone itself a QR is the wrong affordance: you cannot scan the screen you
 * are holding. The native equivalent is the `otpauth://` URI, which every
 * authenticator app registers, so "Open your authenticator app" hands the
 * secret over in one tap. The typed setup key is the fallback, for a member
 * whose app does not register the scheme or who keeps their codes on a
 * second device.
 *
 * One component for both doors, as on web. `challengeToken` is present when
 * the caller has no session yet - a leader the cutover caught mid-sign-in -
 * and absent when they are turning it on from Security.
 */
export function MfaEnrolment({
  challengeToken,
  onComplete,
  onCancel,
}: {
  challengeToken?: string;
  onComplete: (result: MfaConfirmResponse) => void;
  onCancel?: () => void;
}) {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();

  const [enrolment, setEnrolment] = useState<MfaEnrolmentStart | null>(null);
  const [code, setCode] = useState('');
  const [result, setResult] = useState<MfaConfirmResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [startFailed, setStartFailed] = useState(false);
  const started = useRef(false);

  const begin = useMutation({
    mutationFn: async () => {
      const res = challengeToken
        ? await api.auth.mfa.enrolWithChallenge(challengeToken)
        : await api.auth.mfa.enrol();
      if (!res.success || !res.data) throw new Error(res.message ?? 'Could not start setup');
      return res.data;
    },
  });

  const confirm = useMutation({
    mutationFn: async (submitted: string) => {
      const res = challengeToken
        ? await api.auth.mfa.confirmWithChallenge({ code: submitted }, challengeToken)
        : await api.auth.mfa.confirm({ code: submitted });
      if (!res.success || !res.data) throw new Error(res.message ?? 'That code was not accepted');
      return res.data;
    },
  });

  async function start() {
    setError(null);
    setStartFailed(false);
    try {
      setEnrolment(await begin.mutateAsync());
    } catch (err) {
      setStartFailed(true);
      setError(err instanceof Error ? err.message : 'Could not start setup. Please try again.');
    }
  }

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Hand the secret to whichever authenticator app is installed. A member with
   * none installed gets a "nothing can open this" failure from the OS, which
   * is unhelpful on its own, so say what to do instead of letting it sit.
   */
  async function openInAuthenticator() {
    if (!enrolment) return;
    try {
      const opened = await Linking.canOpenURL(enrolment.enrolmentUri);
      if (!opened) throw new Error('no handler');
      await Linking.openURL(enrolment.enrolmentUri);
    } catch {
      alert.info(
        'No authenticator app found',
        'Install one from the App Store or Play Store - Google Authenticator and Microsoft Authenticator are both free - then come back and use the setup key below.',
      );
    }
  }

  async function submitCode() {
    setError(null);
    const trimmed = code.replace(/\s/g, '');
    if (trimmed.length < 6) {
      setError('Enter the 6-digit code from your authenticator app.');
      return;
    }
    try {
      setResult(await confirm.mutateAsync(trimmed));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That code was not accepted.');
      setCode('');
    }
  }

  /**
   * The codes exist in plaintext on this screen and nowhere else, ever: the
   * server keeps only hashes. Sharing writes them to a file the member can
   * put in a password manager or a notes app, which is the one route off this
   * screen that does not rely on them copying ten strings by hand.
   */
  async function saveCodes(codes: string[]) {
    try {
      const file = new File(Paths.cache, 'kairos-backup-codes.txt');
      if (file.exists) file.delete();
      file.create();
      file.write(
        [
          'Kairos backup codes',
          '',
          'Each code works once. Keep them somewhere only you can reach,',
          'and not on the phone that holds your authenticator app.',
          '',
          ...codes,
          '',
        ].join('\n'),
      );
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(file.uri, {
          mimeType: 'text/plain',
          dialogTitle: 'Save your Kairos backup codes',
        });
      } else {
        alert.info('Saved', `Backup codes saved to app storage:\n${file.uri}`);
      }
    } catch (err) {
      alert.info(
        'Could not save the file',
        err instanceof Error ? err.message : 'Write them down instead - they are on screen now.',
      );
    }
  }

  if (result) {
    return (
      <View style={styles.block}>
        <View style={styles.warnRow}>
          <KeyRound color={c.goldDark} size={20} strokeWidth={1.5} />
          <Text style={styles.warnText}>
            Save these now. They are shown once and we cannot show them again. Each one works a
            single time, and they are how you get back in if you lose this phone.
          </Text>
        </View>

        <Card padding="md" style={{ gap: spacing.xs }}>
          {result.backupCodes.map((backupCode) => (
            <Text key={backupCode} selectable style={styles.codeLine}>
              {backupCode}
            </Text>
          ))}
        </Card>

        <Button
          label="Save to a file"
          variant="secondary"
          size="lg"
          fullWidth
          onPress={() => void saveCodes(result.backupCodes)}
        />
        <Button
          label={challengeToken ? 'I have saved them, continue' : 'I have saved my backup codes'}
          variant="primary"
          size="lg"
          fullWidth
          onPress={() => onComplete(result)}
        />
      </View>
    );
  }

  return (
    <View style={styles.block}>
      <View style={styles.introRow}>
        <Smartphone color={c.primary} size={22} strokeWidth={1.5} />
        <Text style={styles.introText}>
          An authenticator app makes a new 6-digit code every 30 seconds. We ask for one when you
          sign in, so your password on its own is not enough.
        </Text>
      </View>

      {begin.isPending ? <Text style={styles.meta}>Preparing your setup code…</Text> : null}

      {startFailed ? (
        <Button label="Try again" variant="secondary" size="md" onPress={() => void start()} />
      ) : null}

      {enrolment ? (
        <Card padding="md" style={{ gap: spacing.md }}>
          <Text style={styles.stepTitle}>1. Add Kairos to your authenticator</Text>
          <Button
            label="Open your authenticator app"
            variant="secondary"
            size="lg"
            fullWidth
            onPress={() => void openInAuthenticator()}
          />
          <Text style={styles.meta}>
            Nothing happened, or you keep your codes on another device? Type this key in by hand.
            Press and hold to copy it.
          </Text>
          <Text selectable style={styles.setupKey} testID="mfa-setup-key">
            {enrolment.secretBase32}
          </Text>
        </Card>
      ) : null}

      <Card padding="md" style={{ gap: spacing.md }}>
        <Text style={styles.stepTitle}>2. Enter the code it shows you</Text>
        <Input
          value={code}
          onChangeText={setCode}
          keyboardType="number-pad"
          textContentType="oneTimeCode"
          placeholder="123456"
          maxLength={7}
          editable={Boolean(enrolment) && !confirm.isPending}
          error={error}
          accessibilityLabel="6-digit code"
        />
      </Card>

      <Button
        label={confirm.isPending ? 'Checking…' : 'Turn on two-step sign-in'}
        variant="primary"
        size="lg"
        fullWidth
        loading={confirm.isPending}
        disabled={!enrolment}
        iconLeft={<ShieldCheck color={c.onPrimary} size={18} strokeWidth={1.5} />}
        onPress={() => void submitCode()}
      />

      {onCancel ? (
        <Button label="Cancel" variant="ghost" size="md" fullWidth onPress={onCancel} />
      ) : null}
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    block: { gap: spacing.lg },
    introRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.md,
      backgroundColor: 'rgba(93,63,211,0.06)',
      padding: spacing.md,
      borderRadius: radii.md,
    },
    introText: { ...typography.body, color: c.ink, flex: 1 },
    warnRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.md,
      backgroundColor: 'rgba(248,181,55,0.12)',
      padding: spacing.md,
      borderRadius: radii.md,
    },
    warnText: { ...typography.body, color: c.ink, flex: 1 },
    stepTitle: { ...typography.cardTitle, color: c.ink },
    meta: { ...typography.meta, color: c.inkMuted },
    setupKey: {
      ...typography.body,
      fontFamily: 'monospace',
      letterSpacing: 2,
      color: c.ink,
      backgroundColor: c.subtle,
      padding: spacing.md,
      borderRadius: radii.sm,
    },
    codeLine: {
      ...typography.body,
      fontFamily: 'monospace',
      letterSpacing: 2,
      color: c.ink,
    },
  });
}
