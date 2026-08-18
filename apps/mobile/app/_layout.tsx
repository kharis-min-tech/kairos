import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from '@kairos/ui-native';
import { registerAuthCallbacks } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth';
import { useOnboardingStore } from '@/store/onboarding';
import { useThemeStore } from '@/store/theme';
import { AlertHost } from '@/components/alert-host';

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
  const hydrateOnboarding = useOnboardingStore((s) => s.hydrate);
  const hydrateTheme = useThemeStore((s) => s.hydrate);
  const authHydrated = useAuthStore((s) => s.hydrated);
  const onboardingHydrated = useOnboardingStore((s) => s.hydrated);
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
    void hydrateOnboarding();
    void hydrateTheme();
  }, [hydrateAuth, hydrateOnboarding, hydrateTheme]);

  const ready = authHydrated && onboardingHydrated && themeHydrated;

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
          {ready ? <Stack screenOptions={{ headerShown: false }} /> : null}
          <AlertHost />
        </SafeAreaProvider>
      </ThemeProvider>
    </QueryClientProvider>
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
