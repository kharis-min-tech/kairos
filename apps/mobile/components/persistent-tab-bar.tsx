import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { useSegments, useRouter } from 'expo-router';
import { Home, Users, Hand, Heart, Menu } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  spacing,
  typography,
  useThemedStyles,
  useColors,
  type ThemeColors,
} from '@kairos/ui-native';
import { useAuthStore } from '@/store/auth';

/**
 * Height of the bar's own content, excluding the safe-area inset underneath
 * it. Derived from the styles below: 8px top padding + the tallest tab
 * (22px icon + 2px gap + ~14px label + 4px vertical padding each side).
 *
 * Screens must not hardcode this. The root layout reserves the space for the
 * whole app via {@link useTabBarReservedSpace}.
 */
export const TAB_BAR_CONTENT_HEIGHT = 56;

type TabKey = 'home' | 'community' | 'check-in' | 'give' | 'more';

const TABS: { key: TabKey; label: string; icon: typeof Home; href: string }[] = [
  { key: 'home', label: 'Home', icon: Home, href: '/(tabs)/' },
  { key: 'community', label: 'Community', icon: Users, href: '/(tabs)/community' },
  { key: 'check-in', label: 'Check-in', icon: Hand, href: '/(tabs)/check-in' },
  { key: 'give', label: 'Give', icon: Heart, href: '/(tabs)/give' },
  { key: 'more', label: 'More', icon: Menu, href: '/(tabs)/more' },
];

/**
 * Whether the bar is currently on screen.
 *
 * The bar and every screen's bottom inset both read this, so the two can't
 * disagree about whether space needs reserving. Do not inline this logic.
 */
export function useTabBarVisible(): boolean {
  const segments = useSegments();
  const user = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);

  // Reading segments rather than the pathname avoids brittle string matches.
  const topGroup = segments[0];
  const isAuthRoute = topGroup === '(auth)';
  const isOnboardingRoute = topGroup === '(onboarding)';
  const isSignedIn = !!accessToken && !!user;
  const isReadyForTabs =
    isSignedIn && !user?.mustCompleteProfile && user?.approvalStatus === 'approved';

  return !isAuthRoute && !isOnboardingRoute && isReadyForTabs;
}

/**
 * Padding the root layout reserves below the router Stack so screen content
 * ends exactly at the bar's top edge instead of scrolling underneath it.
 *
 * Note what this deliberately does NOT include. Screens wrap themselves in
 * `SafeAreaView edges={['top', 'bottom']}`, so each one already applies
 * `insets.bottom` of its own padding inside the Stack. Reserving the full bar
 * height here as well would double-count that inset and leave a strip of dead
 * space above the bar on any device with a home indicator. Subtracting it
 * means the two paddings sum to exactly the bar's height:
 *
 *   reserved here          = HEIGHT + max(inset, 8) - inset
 *   screen's own SafeArea  =                          inset
 *   ------------------------------------------------------
 *   total from screen edge = HEIGHT + max(inset, 8)  = bar height
 *
 * Returns 0 when the bar is hidden, so auth and onboarding keep their spacing.
 */
export function useTabBarReservedSpace(): number {
  const insets = useSafeAreaInsets();
  const visible = useTabBarVisible();
  if (!visible) return 0;
  return TAB_BAR_CONTENT_HEIGHT + Math.max(insets.bottom, 8) - insets.bottom;
}

/**
 * Persistent bottom tab bar. Shows on every authenticated screen — including
 * deep nested detail pages — so tapping "Home" always gets the user back to
 * the tab root in one tap. Matches the industry norm (Instagram, TikTok,
 * Slack, LinkedIn all keep their bottom nav visible at every depth).
 *
 * Hidden on:
 *   - Auth routes (`(auth)/*`) — login, signup, oauth callbacks, etc.
 *   - Onboarding routes (`(onboarding)/*`) — pre-signin splash.
 *   - When the user isn't signed in / isn't approved / needs onboarding.
 *
 * Sits over the safe-area bottom inset. Because it is an absolute overlay it
 * does not push content up on its own, so the root layout reserves the space
 * for it once via `useTabBarReservedSpace()`. Individual screens need no
 * bottom padding of their own and must never hardcode the bar's height.
 *
 * Note: the `(tabs)/_layout.tsx` file hides expo-router's default tab bar
 * via `tabBarStyle: { display: 'none' }` so we don't render two bars.
 */
export function PersistentTabBar() {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  const router = useRouter();
  const segments = useSegments();
  const insets = useSafeAreaInsets();
  const visible = useTabBarVisible();

  if (!visible) return null;

  // `useSegments()` is typed as a union of per-route tuples, so comparing
  // element 0 narrows the whole tuple to a length-1 variant and element 1
  // stops type-checking. We only ever want the raw path segments here.
  const segs = segments as readonly string[];
  const topGroup = segs[0];

  // Active-tab derivation. When user is off the tab group entirely (e.g.
  // on /fellowships/[id]), we highlight nothing so they know they're in a
  // nested surface.
  let activeKey: TabKey | null = null;
  if (topGroup === '(tabs)') {
    const leaf = segs[1];
    if (!leaf) activeKey = 'home';
    else if (leaf === 'community') activeKey = 'community';
    else if (leaf === 'check-in') activeKey = 'check-in';
    else if (leaf === 'give') activeKey = 'give';
    else if (leaf === 'more') activeKey = 'more';
  }

  const paddingBottom = Math.max(insets.bottom, 8);

  return (
    <View style={[styles.container, { paddingBottom }]}>
      <View style={styles.row}>
        {TABS.map((t) => {
          const isActive = t.key === activeKey;
          const Icon = t.icon;
          return (
            <Pressable
              key={t.key}
              onPress={() => router.replace(t.href as never)}
              style={styles.tab}
              accessibilityRole="tab"
              accessibilityLabel={t.label}
              accessibilityState={{ selected: isActive }}
              hitSlop={4}
            >
              <Icon
                color={isActive ? c.primary : c.inkFaded}
                size={22}
                strokeWidth={1.5}
              />
              <Text style={[styles.label, isActive && styles.labelActive]}>
                {t.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: c.card,
      borderTopWidth: 1,
      borderTopColor: c.divider,
      paddingTop: 8,
      // Small elevation so it reads as a separate surface without a heavy
      // shadow. Matches iOS system tab bar treatment.
      shadowColor: '#000',
      shadowOpacity: 0.06,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: -2 },
      elevation: Platform.OS === 'android' ? 8 : 0,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-around',
      paddingHorizontal: spacing.xs,
    },
    tab: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 2,
      paddingVertical: 4,
    },
    label: {
      ...typography.meta,
      color: c.inkFaded,
      fontSize: 11,
      fontWeight: '600',
      letterSpacing: 0.2,
    },
    labelActive: {
      color: c.primary,
    },
  });
}
