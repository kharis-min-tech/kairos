import { useEffect } from 'react';
import { View } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from '@kairos/ui-native';
import { api, registerAuthCallbacks } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth';
import { useThemeStore } from '@/store/theme';
import { AlertHost } from '@/components/alert-host';
import {
  PersistentTabBar,
  useTabBarReservedSpace,
} from '@/components/persistent-tab-bar';

SplashScreen.preventAutoHideAsync().catch(() => {
  // Already prevented / not available — safe to ignore.
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
  },
});

export default function RootLayout() {
  const hydrateAuth = useAuthStore((s) => s.hydrate);
  const hydrateTheme = useThemeStore((s) => s.hydrate);
  const authHydrated = useAuthStore((s) => s.hydrated);
  const themeHydrated = useThemeStore((s) => s.hydrated);
  const themeMode = useThemeStore((s) => s.mode);
  const setThemeMode = useThemeStore((s) => s.setMode);
  const updateTokens = useAuthStore((s) => s.updateTokens);
  const clearSession = useAuthStore((s) => s.clearSession);

  useEffect(() => {
    registerAuthCallbacks({
      onRefreshed: (tokens) => {
        void updateTokens(tokens);
      },
      onFailure: () => {
        void clearSession();
      },
    });
  }, [updateTokens, clearSession]);

  useEffect(() => {
    void hydrateAuth();
    void hydrateTheme();
  }, [hydrateAuth, hydrateTheme]);

  const ready = authHydrated && themeHydrated;

  useEffect(() => {
    if (ready) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [ready]);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider mode={themeMode} setMode={(m) => void setThemeMode(m)}>
        <SafeAreaProvider>
          <ThemedChrome />
          {ready ? <RouterHost /> : null}
          {/* Persistent bottom tab bar — visible on every authenticated
              screen, hidden on auth routes and when the caller
              isn't approved. Lives here (not inside `(tabs)/_layout.tsx`)
              so the bar survives navigation to routes outside the tab
              group. The default expo-router Tabs bar is disabled in
              `(tabs)/_layout.tsx` to avoid two bars stacked. */}
          {ready ? <PersistentTabBar /> : null}
          {ready ? <AuthGuard /> : null}
          {ready ? <ConsentGuard /> : null}
          <AlertHost />
        </SafeAreaProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

/**
 * Hosts the router Stack and reserves the strip of screen the persistent tab
 * bar sits over.
 *
 * The bar is an absolute overlay, so without this every screen would scroll
 * its last rows, its list ends and its sticky footers underneath the bar.
 * Reserving the space once here means no individual screen needs a bottom
 * inset of its own, and no screen should add one: authenticated screens use
 * `SafeAreaView edges={['top']}` and leave the bottom edge to this padding.
 * See `useTabBarReservedSpace` for the arithmetic.
 *
 * Must sit inside SafeAreaProvider (it reads insets) and inside the router
 * context (it reads segments).
 */
function RouterHost() {
  const reserved = useTabBarReservedSpace();
  return (
    <View style={{ flex: 1, paddingBottom: reserved }}>
      <Stack screenOptions={{ headerShown: false }} />
    </View>
  );
}

/**
 * Small chrome shim — flips the StatusBar icon colour with the active
 * scheme. `style="auto"` on expo-status-bar already respects the OS
 * scheme, but we want the *resolved* app scheme (which may be a manual
 * override that diverges from the OS).
 */
function ThemedChrome() {
  const { scheme } = useTheme();
  return <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />;
}

/**
 * Watches the auth store and forces a redirect to login the moment the access
 * token becomes null on any non-auth route.
 *
 * Two paths land here:
 *
 *  1. **Cold start with expired refresh token.** hydrate reads a persisted
 *     access token, the caller is routed to a tab, an in-session API call
 *     fires, refresh fails, api-client calls onAuthFailure → clearSession
 *     clears the tokens. Before this component existed the user was left
 *     staring at a signed-in-looking screen with a "?" for their profile
 *     until they closed and reopened the app.
 *  2. **Sign-out.** Same path — clearSession sets accessToken to null, and
 *     any route the user was on gets redirected. The sign-out button also
 *     navigates manually; this is the backstop.
 *
 * The auth group is excluded so we don't ping-pong a user
 * who is already on the login/signup screen.
 */
function AuthGuard() {
  const router = useRouter();
  const segments = useSegments();
  const accessToken = useAuthStore((s) => s.accessToken);

  useEffect(() => {
    if (accessToken) return;
    const top = (segments as readonly string[])[0];
    if (top === '(auth)') return;
    router.replace('/(auth)/login');
  }, [accessToken, segments, router]);

  return null;
}

/**
 * Forces a signed-in caller onto `/accept-policies` while they have any
 * REQUIRED consent outstanding. The mobile counterpart to the redirect in the
 * web app's `(dashboard)/layout.tsx`.
 *
 * This exists because the API already enforces the same rule and mobile had no
 * answer to it. `consentGateMiddleware` returns 403 CONSENT_REQUIRED for every
 * `/api/*` route outside a short allowlist whenever a required consent is
 * pending, so bumping a policy version used to leave every mobile screen
 * failing with nowhere to go — and since the gate answers with `c.json`
 * rather than by throwing, the API logs stayed clean while it happened.
 * `privacy-consent.tsx` even promised a prompt "the next time you sign in"
 * that was never built. This is that prompt.
 *
 * Deliberately a sibling of AuthGuard rather than logic inside it: the two
 * answer different questions ("are you signed in" vs "may you proceed") and
 * ordering matters. A caller with no token must reach the login screen, not a
 * consent screen that cannot load its own query.
 *
 * The query is allowed to run only when there is a session AND the caller is
 * past the earlier gates. `/api/me/consent` is itself allowlisted by the
 * middleware, so this lookup still succeeds while everything else 403s.
 */
function ConsentGuard() {
  const router = useRouter();
  const segments = useSegments();
  const accessToken = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);

  const top = (segments as readonly string[])[0];
  const onAuthRoute = top === '(auth)';
  const onGate = top === 'accept-policies';

  // Mirrors the web ordering: profile completion and approval are decided
  // before consent, so we don't drag a half-onboarded caller through a policy
  // screen they may not even need yet.
  const pastEarlierGates =
    !!accessToken &&
    !!user &&
    !user.mustCompleteProfile &&
    user.approvalStatus === 'approved';

  const { data } = useQuery({
    queryKey: ['me', 'consent'],
    queryFn: async () => (await api.me.consent.list()).data ?? { statuses: [] },
    enabled: pastEarlierGates && !onAuthRoute,
  });

  const pendingCount = (data?.statuses ?? []).filter(
    (s) => s.required && s.needsAccept,
  ).length;

  useEffect(() => {
    if (!pastEarlierGates) return;
    if (onAuthRoute || onGate) return;
    if (pendingCount === 0) return;
    router.replace('/accept-policies');
  }, [pastEarlierGates, onAuthRoute, onGate, pendingCount, router]);

  return null;
}
