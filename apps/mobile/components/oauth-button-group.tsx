import { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import type { OAuthProviderId } from '@kairos/types';
import {
  radii,
  spacing,
  typography,
  useThemedStyles,
  type ThemeColors,
} from '@kairos/ui-native';
import { startOAuthFlow, type OAuthStartResult } from '@/lib/oauth';
import {
  OAuthProviderIcon,
  OAUTH_PROVIDER_LABEL,
} from './oauth-provider-icon';

const PROVIDERS: {
  id: OAuthProviderId;
  variant: 'light' | 'dark';
}[] = [
  { id: 'google', variant: 'light' },
  { id: 'microsoft', variant: 'light' },
  { id: 'apple', variant: 'dark' },
];

interface OAuthButtonGroupProps {
  /**
   * Whether to prefix each button label with "Continue with" (signup /
   * connections) vs "Sign in with" (login). Wording parity with web.
   */
  actionLabel?: 'continue' | 'sign-in';
  /** Where the server should redirect after a successful link. */
  returnTo?: string;
  /**
   * Called with the flow result. Callers do the routing:
   *   - signed_in → setSession + router.replace
   *   - confirm_link → router.push('/(auth)/oauth-confirm-link', ...)
   *   - error → show inline error
   *   - cancelled → no-op
   */
  onResult: (result: OAuthStartResult) => void | Promise<void>;
  /** Disable all three buttons (e.g. during another auth request). */
  disabled?: boolean;
}

export function OAuthButtonGroup({
  actionLabel = 'sign-in',
  returnTo,
  onResult,
  disabled = false,
}: OAuthButtonGroupProps) {
  const styles = useThemedStyles(makeStyles);
  const [busy, setBusy] = useState<OAuthProviderId | null>(null);
  const prefix = actionLabel === 'continue' ? 'Continue with' : 'Sign in with';

  async function handlePress(provider: OAuthProviderId) {
    if (busy || disabled) return;
    setBusy(provider);
    try {
      const result = await startOAuthFlow(provider, returnTo);
      await onResult(result);
    } catch (err) {
      await onResult({
        kind: 'error',
        slug: err instanceof Error ? 'browser_failed' : 'unknown_callback',
      });
    } finally {
      setBusy(null);
    }
  }

  return (
    <View style={styles.stack}>
      {PROVIDERS.map((p) => {
        const isBusy = busy === p.id;
        const isDark = p.variant === 'dark';
        return (
          <Pressable
            key={p.id}
            onPress={() => handlePress(p.id)}
            disabled={disabled || busy !== null}
            style={({ pressed }) => [
              styles.btn,
              isDark ? styles.btnDark : styles.btnLight,
              (disabled || busy !== null) && styles.btnDisabled,
              pressed && !isBusy && styles.btnPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel={`${prefix} ${OAUTH_PROVIDER_LABEL[p.id]}`}
          >
            {isBusy ? (
              <ActivityIndicator color={isDark ? '#ffffff' : '#1a1c1c'} />
            ) : (
              <>
                <OAuthProviderIcon
                  provider={p.id}
                  size={18}
                  tint={isDark ? '#ffffff' : '#1a1c1c'}
                />
                <Text
                  style={[
                    styles.label,
                    isDark ? styles.labelDark : styles.labelLight,
                  ]}
                >
                  {prefix} {OAUTH_PROVIDER_LABEL[p.id]}
                </Text>
              </>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    stack: {
      gap: spacing.sm,
    },
    btn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      height: 46,
      borderRadius: radii.lg,
      paddingHorizontal: spacing.md,
    },
    btnLight: {
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
    },
    btnDark: {
      backgroundColor: '#000000',
    },
    btnDisabled: {
      opacity: 0.6,
    },
    btnPressed: {
      opacity: 0.9,
    },
    label: {
      ...typography.button,
      textAlign: 'center',
    },
    labelLight: {
      color: c.ink,
    },
    labelDark: {
      color: '#ffffff',
    },
  });
}
