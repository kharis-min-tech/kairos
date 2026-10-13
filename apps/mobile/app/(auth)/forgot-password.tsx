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
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Trans, useTranslation } from 'react-i18next';
import { useMutation } from '@tanstack/react-query';
import { ArrowRight, ChevronLeft, MailCheck } from 'lucide-react-native';
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

export default function ForgotPasswordScreen() {
  const { t } = useTranslation(['auth', 'common']);
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = useMutation({
    mutationFn: async () => {
      const res = await api.auth.forgotPassword({ email: email.trim() });
      // Server returns 200 whether or not the email exists — we don't leak
      // account existence. Treat any success as "check your inbox".
      if (!res.success) throw new Error(res.message ?? t('auth:forgotPassword.couldNotSend'));
      return res.data;
    },
    onSuccess: () => setSent(true),
    onError: (e: Error) => setError(e.message ?? t('auth:shared.somethingWentWrong')),
  });

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.headerBar}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ChevronLeft color={c.ink} size={24} strokeWidth={1.5} />
        </Pressable>
        <Text style={styles.headerTitle}>{t('auth:forgotPassword.heading')}</Text>
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
            {sent ? (
              <>
                <View style={styles.successBadge}>
                  <MailCheck color={c.success} size={22} strokeWidth={1.5} />
                </View>
                <Text style={styles.title}>{t('auth:shared.checkInbox')}</Text>
                <Text style={styles.body}>
                  <Trans
                    i18nKey="auth:forgotPassword.sentTo"
                    values={{ email: email.trim() }}
                    components={[<Text key="0" />, <Text key="1" style={styles.bodyStrong} />]}
                  />
                </Text>
                <Text style={styles.bodyFaded}>{t('auth:forgotPassword.notSeeing')}</Text>
                <Button
                  label={t('auth:shared.backToSignIn')}
                  variant="secondary"
                  size="lg"
                  fullWidth
                  onPress={() => router.replace('/(auth)/login')}
                  style={{ marginTop: spacing.md }}
                />
              </>
            ) : (
              <>
                <Text style={styles.title}>{t('auth:forgotPassword.title')}</Text>
                <Text style={styles.body}>{t('auth:forgotPassword.intro')}</Text>

                {error ? (
                  <View style={styles.errorBanner}>
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                ) : null}

                <Input
                  label={t('auth:shared.email')}
                  value={email}
                  onChangeText={(v) => {
                    setEmail(v);
                    setError(null);
                  }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  placeholder={t('auth:shared.emailPlaceholder')}
                  containerStyle={{ marginTop: spacing.md }}
                />

                <Button
                  label={t('auth:forgotPassword.sendResetLink')}
                  onPress={() => submit.mutate()}
                  loading={submit.isPending}
                  disabled={!email.trim()}
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
  title: {
    ...typography.screenTitle,
    color: c.ink,
  },
  body: {
    ...typography.body,
    color: c.inkMuted,
    lineHeight: 20,
  },
  bodyStrong: {
    color: c.ink,
    fontWeight: '600',
  },
  bodyFaded: {
    ...typography.meta,
    color: c.inkMuted,
    lineHeight: 16,
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

