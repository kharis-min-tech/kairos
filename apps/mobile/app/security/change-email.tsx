import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { ChevronLeft, Mail } from 'lucide-react-native';
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
import { useAuthStore } from '@/store/auth';

export default function ChangeEmail() {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const request = useMutation({
    mutationFn: (data: { currentPassword: string; newEmail: string }) =>
      api.auth.requestEmailChange(data),
  });

  function clearError(key: string) {
    setErrors((p) => {
      const n = { ...p };
      delete n[key];
      return n;
    });
  }

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!currentPassword) next['currentPassword'] = 'Enter your current password';
    if (!newEmail.trim()) next['newEmail'] = 'New email is required';
    else if (!/^\S+@\S+\.\S+$/.test(newEmail.trim()))
      next['newEmail'] = 'Enter a valid email';
    else if (user?.email && newEmail.trim().toLowerCase() === user.email.toLowerCase())
      next['newEmail'] = 'New email must differ from current';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit() {
    setServerError(null);
    if (!validate()) return;
    try {
      await request.mutateAsync({
        currentPassword,
        newEmail: newEmail.trim(),
      });
      setSubmitted(true);
    } catch (err) {
      setServerError(
        err instanceof Error
          ? err.message
          : 'Could not request the email change. Please try again.',
      );
    }
  }

  if (submitted) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.headerBar}>
          <View style={{ width: 24 }} />
          <Text style={styles.headerTitle}>Check your inbox</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.centered}>
          <View style={styles.successIcon}>
            <Mail color={c.primary} size={48} strokeWidth={1.5} />
          </View>
          <Text style={styles.successTitle}>Confirm your new email</Text>
          <Text style={styles.successMeta}>
            We&apos;ve sent a confirmation link to{' '}
            <Text style={{ fontWeight: '700' }}>{newEmail.trim()}</Text>. Open it to
            complete the switch. Your old email will also receive an alert with an undo
            link that stays valid for 24 hours.
          </Text>
          <Button
            label="Done"
            variant="primary"
            size="md"
            fullWidth
            onPress={() => router.back()}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerBar}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ChevronLeft color={c.ink} size={24} strokeWidth={1.5} />
        </Pressable>
        <Text style={styles.headerTitle}>Change email</Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.introRow}>
            <View style={styles.introIcon}>
              <Mail color={c.primary} size={22} strokeWidth={1.5} />
            </View>
            <Text style={styles.introText}>
              We&apos;ll send a confirmation link to the new address. Both the old and
              new addresses get notified — the old one carries an undo link valid for
              24 hours in case someone else initiated this.
            </Text>
          </View>

          {user?.email ? (
            <Card padding="md" style={{ gap: 2 }}>
              <Text style={styles.currentLabel}>CURRENT EMAIL</Text>
              <Text style={styles.currentValue}>{user.email}</Text>
            </Card>
          ) : null}

          <Card padding="md" style={{ gap: spacing.md }}>
            <Text style={styles.fieldLabel}>New email *</Text>
            <Input
              value={newEmail}
              onChangeText={(v) => {
                setNewEmail(v);
                clearError('newEmail');
              }}
              placeholder="name@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              error={errors['newEmail']}
            />

            <Text style={styles.fieldLabel}>Current password *</Text>
            <Input
              value={currentPassword}
              onChangeText={(v) => {
                setCurrentPassword(v);
                clearError('currentPassword');
              }}
              secureTextEntry
              secureToggle
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="password"
              error={errors['currentPassword']}
            />
          </Card>

          {serverError ? <Text style={styles.errorLine}>{serverError}</Text> : null}

          <Button
            label={request.isPending ? 'Sending…' : 'Send confirmation link'}
            variant="primary"
            size="lg"
            fullWidth
            loading={request.isPending}
            onPress={handleSubmit}
          />
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
  introRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    backgroundColor: 'rgba(93,63,211,0.06)',
    padding: spacing.md,
    borderRadius: radii.md,
  },
  introIcon: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    backgroundColor: 'rgba(93,63,211,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  introText: {
    ...typography.meta,
    color: c.ink,
    flex: 1,
    lineHeight: 16,
  },
  currentLabel: {
    ...typography.eyebrow,
    color: c.inkMuted,
  },
  currentValue: {
    ...typography.body,
    color: c.ink,
    fontWeight: '600',
  },
  fieldLabel: {
    ...typography.eyebrow,
    color: c.ink,
    opacity: 0.6,
  },
  errorLine: {
    ...typography.body,
    color: c.danger,
  },
  centered: {
    padding: spacing.xl,
    gap: spacing.md,
    alignItems: 'center',
  },
  successIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(93,63,211,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.lg,
  },
  successTitle: {
    ...typography.screenTitle,
    color: c.ink,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  successMeta: {
    ...typography.body,
    color: c.inkMuted,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: spacing.md,
  },
});
}

