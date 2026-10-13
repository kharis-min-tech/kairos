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
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Trans, useTranslation } from 'react-i18next';
import { useMutation } from '@tanstack/react-query';
import { ArrowRight, ChevronLeft, Link2 } from 'lucide-react-native';
import type { OAuthProviderId } from '@kairos/types';
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
import { useAuthStore } from '@/store/auth';
import {
  OAuthProviderIcon,
  OAUTH_PROVIDER_LABEL,
} from '@/components/oauth-provider-icon';

/**
 * OAuth account-link confirmation. Reached when the API detects an existing
 * Kairos account with the same email as the SSO identity but flags it as
 * unverified — it redirects the browser to
 * `${FRONTEND_URL}/oauth-confirm-link?token=…&email=…&provider=…`, which the
 * mobile OAuth flow parses and routes here. The user proves ownership by
 * re-entering the Kairos password; on success the provider is linked and a
 * fresh session is issued.
 */
export default function OAuthConfirmLinkScreen() {
  const { t } = useTranslation(['auth', 'common']);
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  const router = useRouter();
  const setSession = useAuthStore((s) => s.setSession);

  const params = useLocalSearchParams<{
    token?: string;
    email?: string;
    provider?: string;
  }>();
  const token = params.token ?? '';
  const email = params.email ?? '';
  const provider = (params.provider ?? 'google') as OAuthProviderId;

  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const confirm = useMutation({
    mutationFn: async () => {
      const res = await api.auth.oauth.confirmLink({
        confirmationToken: token,
        password,
      });
      if (!res.success || !res.data) {
        throw new Error(res.message ?? t('auth:oauthLink.couldNotLink'));
      }
      return res.data;
    },
    onSuccess: async ({ tokens, member }) => {
      await setSession(tokens, member);
      router.replace('/(tabs)');
    },
    onError: (e: unknown) => {
      const message = e instanceof Error ? e.message : t('auth:oauthLink.couldNotLink');
      // The API returns 401 with the phrase "Incorrect password" — surface
      // that verbatim so the field cue matches expectation.
      if (/password/i.test(message) && /incorrect|invalid|wrong/i.test(message)) {
        setError(t('auth:oauthLink.incorrectPassword'));
      } else {
        setError(message);
      }
    },
  });

  const providerLabel = OAUTH_PROVIDER_LABEL[provider] ?? provider;
  const canSubmit = !!token && !!password && !confirm.isPending;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.headerBar}>
        <Pressable
          onPress={() => router.replace('/(auth)/login')}
          hitSlop={8}
        >
          <ChevronLeft color={c.ink} size={24} strokeWidth={1.5} />
        </Pressable>
        <Text style={styles.headerTitle}>{t('auth:oauthLink.linkAccount')}</Text>
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
            <View style={styles.iconBadge}>
              <Link2 color={c.primary} size={22} strokeWidth={1.5} />
            </View>

            <Text style={styles.title}>{t('auth:oauthLink.heading', { provider: providerLabel })}</Text>
            <Text style={styles.body}>
              <Trans
                i18nKey="auth:oauthLink.body"
                values={{ email: email || t('auth:oauthLink.yourEmail'), provider: providerLabel }}
                components={[<Text key="0" />, <Text key="1" style={styles.bodyStrong} />]}
              />
            </Text>

            <View style={styles.providerRow}>
              <OAuthProviderIcon provider={provider} size={20} tint={c.ink} />
              <Text style={styles.providerText}>
                Linking {providerLabel} sign-in
              </Text>
            </View>

            {error ? (
              <View style={styles.errorBanner}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <Input
              label={t('auth:oauthLink.kairosPassword')}
              value={password}
              onChangeText={(v) => {
                setPassword(v);
                setError(null);
              }}
              secureTextEntry
              secureToggle
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="password"
              placeholder={t('auth:oauthLink.yourExistingPassword')}
              containerStyle={{ marginTop: spacing.sm }}
            />

            <Button
              label={t('auth:oauthLink.title')}
              onPress={() => confirm.mutate()}
              disabled={!canSubmit}
              loading={confirm.isPending}
              size="lg"
              fullWidth
              iconRight={<ArrowRight color="#ffffff" size={16} strokeWidth={2} />}
              style={{ marginTop: spacing.md }}
            />

            <Pressable
              onPress={() => router.replace('/(auth)/login')}
              hitSlop={8}
              style={{ marginTop: spacing.sm, alignSelf: 'center' }}
            >
              <Text style={styles.altAction}>{t('auth:oauthLink.cancelAndSignInAnother')}</Text>
            </Pressable>
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
    logoK: { fontSize: 28, fontWeight: '700', color: '#ffffff' },
    card: {
      backgroundColor: c.card,
      borderRadius: radii.lg,
      padding: spacing.lg,
      gap: spacing.sm,
    },
    iconBadge: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: 'rgba(93,63,211,0.12)',
      alignItems: 'center',
      justifyContent: 'center',
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
    bodyStrong: { color: c.ink, fontWeight: '600' },
    providerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      backgroundColor: c.primaryTint,
      borderRadius: radii.md,
    },
    providerText: {
      ...typography.body,
      color: c.ink,
      fontWeight: '600',
    },
    errorBanner: {
      backgroundColor: 'rgba(239,68,68,0.1)',
      borderRadius: radii.sm,
      padding: spacing.sm,
      borderLeftWidth: 3,
      borderLeftColor: c.danger,
    },
    errorText: { ...typography.meta, color: c.danger },
    altAction: {
      ...typography.meta,
      color: c.primary,
      fontWeight: '600',
    },
  });
}
