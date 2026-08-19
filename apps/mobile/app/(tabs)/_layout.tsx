import { Tabs, Redirect } from 'expo-router';
import { Platform } from 'react-native';
import { Home, Users, Hand, Heart, Menu } from 'lucide-react-native';
import { useColors } from '@kairos/ui-native';
import { useAuthStore } from '@/store/auth';

const TAB_BAR_HEIGHT = Platform.OS === 'ios' ? 88 : 72;

export default function TabsLayout() {
  const c = useColors();

  // Phase 1.5 Better-Auth: keep the tabs behind the onboarding + approval
  // gates. index.tsx already redirects on cold start, but a deep link
  // (universal link, notification tap, back-nav from an auth screen) can
  // route the user straight to /(tabs) — this stops them landing on a
  // dashboard they aren't allowed to use yet.
  const user = useAuthStore((s) => s.user);
  if (user?.mustCompleteProfile) {
    return <Redirect href={'/(auth)/complete-profile' as never} />;
  }
  if (user && user.approvalStatus !== 'approved') {
    return <Redirect href={'/(auth)/pending-approval' as never} />;
  }
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c.primary,
        tabBarInactiveTintColor: c.inkFaded,
        tabBarStyle: {
          backgroundColor: c.card,
          borderTopColor: c.divider,
          borderTopWidth: 1,
          height: TAB_BAR_HEIGHT,
          paddingTop: 10,
          paddingBottom: Platform.OS === 'ios' ? 24 : 10,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          letterSpacing: 0.2,
          marginTop: 2,
        },
        tabBarIconStyle: {
          marginBottom: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <Home color={color} size={24} strokeWidth={1.5} />,
        }}
      />
      <Tabs.Screen
        name="community"
        options={{
          title: 'Community',
          tabBarIcon: ({ color }) => <Users color={color} size={24} strokeWidth={1.5} />,
        }}
      />
      <Tabs.Screen
        name="check-in"
        options={{
          title: 'Check-in',
          tabBarIcon: ({ color }) => <Hand color={color} size={24} strokeWidth={1.5} />,
        }}
      />
      <Tabs.Screen
        name="give"
        options={{
          title: 'Give',
          tabBarIcon: ({ color }) => <Heart color={color} size={24} strokeWidth={1.5} />,
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'More',
          tabBarIcon: ({ color }) => <Menu color={color} size={24} strokeWidth={1.5} />,
        }}
      />
    </Tabs>
  );
}
