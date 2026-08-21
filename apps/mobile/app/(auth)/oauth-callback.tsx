import { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import * as Linking from 'expo-linking';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import type { Member, OAuthProviderId } from '@kairos/types';
import {
  radii,
  spacing,
  typography,
  useThemedStyles,
  useColors,
  type ThemeColors,
} from '@kairos/ui-native';
import { apiBaseUrl } from '@/lib/config';
import { mapOAuthErrorSlug, parseCallbackUrl } from '@/lib/oauth';
import { useAuthStore } from '@/store/auth';

/**
 * Fallback OAuth callback route. `WebBrowser.openAuthSessionAsync` is
 * supposed to close the in-app browser and return the callback URL directly
 * to the caller, but on Android the OS's App-Links intent filter can win the
 * race and deep-link the app on `https://<host>/oauth-callback#tokens…`
 * before the browser tab can close. Without a route here, Expo Router
 * hits its "Unmatched Route" screen and the user is stranded holding a URL
 * with valid tokens that never get persisted. This screen catches that
 * case, parses the fragment, mints a session, and routes to the same guard
 * targets `app/index.tsx` uses.
 */
export default function OAuthCallbackScreen() {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  const router = useRouter();
  const setSession = useAuthStore((s) => s.setSession);
  const url = Linking.useURL();
  const ran = useRef(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (ran.current || !url) return;
    ran.current = true;

    (async () => {
      // `parseCallbackUrl` doesn't know the provider up-front here (we came
      // in via deep-link, not via the button that started the flow), so pass
      // 'google' as the default — the fragment carries the actual `method`
      // and the parser reads it back out.
      const parsed = parseCallbackUrl(url, 'google' as OAuthProviderId);
      if (parsed.kind === 'error') {
        setError(mapOAuthErrorSlug(parsed.slug));
        return;
      }
      if (parsed.kind === 'cancelled') {
        router.replace('/(auth)/login');
        return;
      }
      if (parsed.kind === 'confirm_link') {
        router.replace({
          pathname: '/(auth)/oauth-confirm-link' as never,
          params: {
            token: parsed.confirmationToken,
            email: parsed.email,
            provider: parsed.provider,
          },
        });
        return;
      }
      try {
        const member = await fetchMemberProfile(parsed.tokens.accessToken);
        await setSession(parsed.tokens, member);
        if (member.mustCompleteProfile) {
          router.replace('/(auth)/complete-profile' as never);
          return;
        }
        if (member.approvalStatus !== 'approved') {
          router.replace('/(auth)/pending-approval' as never);
          return;
        }
        router.replace('/(tabs)');
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Signed in but could not load your profile.',
        );
      }
    })();
  }, [url, router, setSession]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.card}>
        <ActivityIndicator size="large" color={c.primary} />
        <Text style={styles.title}>
          {error ? 'Sign-in issue' : 'Signing you in…'}
        </Text>
        <Text style={styles.subtitle}>
          {error ?? 'Finalising your session with your provider'}
        </Text>
      </View>
    </SafeAreaView>
  );
}

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
  const body = (await res.json()) as {
    success?: boolean;
    data?: Member;
    message?: string;
  };
  if (!body.success || !body.data) {
    throw new Error(body.message ?? 'Could not load your profile.');
  }
  return body.data;
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: c.page,
      justifyContent: 'center',
      paddingHorizontal: spacing.xl,
    },
    card: {
      backgroundColor: c.card,
      borderRadius: radii.lg,
      padding: spacing.xl,
      alignItems: 'center',
      gap: spacing.md,
      shadowColor: '#000',
      shadowOpacity: 0.05,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
      elevation: 3,
    },
    title: {
      ...typography.screenTitle,
      color: c.ink,
      textAlign: 'center',
    },
    subtitle: {
      ...typography.body,
      color: c.inkMuted,
      textAlign: 'center',
    },
  });
}
