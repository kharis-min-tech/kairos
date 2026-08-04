import { Redirect } from 'expo-router';
import { useAuthStore } from '@/store/auth';
import { useOnboardingStore } from '@/store/onboarding';

export default function Index() {
  const hasSession = useAuthStore((s) => !!s.accessToken);
  const onboardingDone = useOnboardingStore((s) => s.done);

  if (!onboardingDone) return <Redirect href="/(onboarding)/splash" />;
  if (!hasSession) return <Redirect href="/(auth)/login" />;
  return <Redirect href="/(tabs)" />;
}
