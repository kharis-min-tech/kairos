import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { registerAuthCallbacks } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth';
import { useOnboardingStore } from '@/store/onboarding';

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
  const authHydrated = useAuthStore((s) => s.hydrated);
  const onboardingHydrated = useOnboardingStore((s) => s.hydrated);
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
  }, [hydrateAuth, hydrateOnboarding]);

  const ready = authHydrated && onboardingHydrated;

  useEffect(() => {
    if (ready) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [ready]);

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <StatusBar style="auto" />
        {ready ? <Stack screenOptions={{ headerShown: false }} /> : null}
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
