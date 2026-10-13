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
import { useTranslation } from 'react-i18next';
import { useMutation } from '@tanstack/react-query';
import { ArrowRight, ChevronLeft, ShieldCheck } from 'lucide-react-native';
import {
  Button,
  Input,
  gradients,
  radii,
  spacing,
  typography,
  useThemedStyles,
  type ThemeColors,
  useColors,
} from '@kairos/ui-native';
import { api } from '@/lib/api-client';

const MIN_PASSWORD = 8;

/**
 * Password reset screen. Reads the token from `?token=` — matching the URL
 * shape the API mails out (`/reset-password?token=XXX`) so a universal-link
 * tap opens straight into this screen with the token already populated.
 */
export default function ResetPasswordScreen() {
  const { t } = useTranslation(['auth', 'common']);
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
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
    if (confirm && password !== confirm) return t('auth:resetPassword.passwordsDoNotMatch');
    return null;
  }, [password, confirm]);

  const submit = useMutation({
    mutationFn: async () => {
      if (!token) throw new Error(t('auth:resetPassword.missingToken'));
      const res = await api.auth.resetPassword({ token, newPassword: password });
      if (!res.success) throw new Error(res.message ?? t('auth:resetPassword.couldNotReset'));
      return res.data;
    },
    onSuccess: () => setDone(true),
    onError: (e: Error) => setError(e.message ?? t('auth:shared.somethingWentWrong')),
  });

  const canSubmit =
    !!token && password.length >= MIN_PASSWORD && password === confirm && !validation;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.headerBar}>
        <Pressable onPress={() => router.replace('/(auth)/login')} hitSlop={8}>
          <ChevronLeft color={c.ink} size={24} strokeWidth={1.5} />
        </Pressable>
        <Text style={styles.headerTitle}>{t('auth:resetPassword.heading')}</Text>
        <View style={{ width: 24 }} />
      </View>

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
          </View>

          <View style={styles.card}>
            {done ? (
              <>
                <View style={styles.successBadge}>
                  <ShieldCheck color={c.success} size={22} strokeWidth={1.5} />
                </View>
                <Text style={styles.title}>{t('auth:resetPassword.passwordUpdated')}</Text>
                <Text style={styles.body}>{t('auth:resetPassword.canNowSignIn')}</Text>
                <Button
                  label={t('auth:shared.backToSignIn')}
                  size="lg"
                  fullWidth
                  onPress={() => router.replace('/(auth)/login')}
                  style={{ marginTop: spacing.md }}
                />
              </>
            ) : (
              <>
                <Text style={styles.title}>{t('auth:resetPassword.title')}</Text>
                <Text style={styles.body}>
                  {t('auth:resetPassword.chooseAtLeast', { count: MIN_PASSWORD })}
                </Text>

                {!token ? (
                  <View style={styles.errorBanner}>
                    <Text style={styles.errorText}>
                      {t('auth:resetPassword.missingTokenBody')}
                    </Text>
                  </View>
                ) : null}

                {error ? (
                  <View style={styles.errorBanner}>
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                ) : null}

                <Input
                  label={t('auth:resetPassword.newPassword')}
                  value={password}
                  onChangeText={(v) => {
                    setPassword(v);
                    setError(null);
                  }}
                  secureTextEntry
                  secureToggle
                  placeholder={t('auth:resetPassword.atLeast8')}
                  containerStyle={{ marginTop: spacing.md }}
                />

                <Input
                  label={t('auth:resetPassword.confirmPassword')}
                  value={confirm}
                  onChangeText={(v) => {
                    setConfirm(v);
                    setError(null);
                  }}
                  secureTextEntry
                  placeholder={t('auth:resetPassword.typeItAgain')}
                  containerStyle={{ marginTop: spacing.md }}
                  error={validation ?? undefined}
                />

                <Button
                  label={t('auth:resetPassword.updatePassword')}
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
    backgroundColor: c.card,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  title: { ...typography.screenTitle, color: c.ink },
  body: {
    ...typography.body,
    color: c.inkMuted,
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
    borderLeftColor: c.danger,
    marginTop: spacing.sm,
  },
  errorText: { ...typography.meta, color: c.danger },
});
}

