import { Redirect } from 'expo-router';
import { useAuthStore } from '@/store/auth';
import { useOnboardingStore } from '@/store/onboarding';

export default function Index() {
  const hasSession = useAuthStore((s) => !!s.accessToken);
  const onboardingDone = useOnboardingStore((s) => s.done);
  const user = useAuthStore((s) => s.user);

  if (!onboardingDone) return <Redirect href="/(onboarding)/splash" />;
  if (!hasSession) return <Redirect href="/(auth)/login" />;

  // Phase 1.5 Better-Auth guards. SSO signup drops the user here with
  // mustCompleteProfile=true; unwind through the dedicated onboarding
  // screen before they see the tabs. Pending approval short-circuits to
  // a wait screen. `user` may briefly be null on cold start until
  // hydrate() finishes — the (tabs) fallback is safe because those pages
  // already handle the null case.
  if (user?.mustCompleteProfile) {
    // as never — expo-router's generated route table doesn't know about
    // the (auth) group's routes. Matches the existing pattern in
    // (auth)/signup.tsx & login.tsx that route to `/(auth)/oauth-confirm-link`.
    return <Redirect href={'/(auth)/complete-profile' as never} />;
  }
  if (user && user.approvalStatus !== 'approved') {
    return <Redirect href={'/(auth)/pending-approval' as never} />;
  }
  return <Redirect href="/(tabs)" />;
}
