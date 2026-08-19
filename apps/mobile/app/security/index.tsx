import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ChevronLeft,
  ChevronRight,
  KeyRound,
  Mail,
  History,
  Link2,
} from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import {
  Card,
  radii,
  spacing,
  typography,
  useThemedStyles,
  type ThemeColors,
  useColors,
} from '@kairos/ui-native';

export default function SecurityHub() {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerBar}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ChevronLeft color={c.ink} size={24} strokeWidth={1.5} />
        </Pressable>
        <Text style={styles.headerTitle}>Security</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.introBlock}>
          <Text style={styles.introTitle}>Account security</Text>
          <Text style={styles.introMeta}>
            Change your password, move your account to a new email, or review recent
            sign-in activity.
          </Text>
        </View>

        <View style={styles.list}>
          <NavLink
            icon={KeyRound}
            title="Change password"
            meta="Update your login password. You'll need your current one."
            onPress={() => router.push('/security/change-password')}
          />
          <NavLink
            icon={Mail}
            title="Change email"
            meta="Move your account to a new email. Both addresses get notified."
            onPress={() => router.push('/security/change-email')}
          />
          <NavLink
            icon={Link2}
            title="Connected accounts"
            meta="Link or disconnect Google, Microsoft, and Apple sign-in."
            onPress={() => router.push('/security/connections' as never)}
          />
          <NavLink
            icon={History}
            title="Recent activity"
            meta="Sign-ins, password changes, and role updates on your account."
            onPress={() => router.push('/recent-activity')}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function NavLink({
  icon: Icon,
  title,
  meta,
  onPress,
}: {
  icon: LucideIcon;
  title: string;
  meta: string;
  onPress: () => void;
}) {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  return (
    <Pressable onPress={onPress}>
      <Card padding="md" style={styles.linkCard}>
        <View style={styles.iconTile}>
          <Icon color={c.primary} size={18} strokeWidth={1.5} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={styles.linkTitle}>{title}</Text>
          <Text style={styles.linkMeta}>{meta}</Text>
        </View>
        <ChevronRight color={c.inkVeryFaded} size={18} strokeWidth={1.5} />
      </Card>
    </Pressable>
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
  container: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  introBlock: { gap: 2 },
  introTitle: { ...typography.screenTitle, color: c.ink },
  introMeta: { ...typography.body, color: c.inkMuted, lineHeight: 20 },
  list: { gap: spacing.sm },
  linkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  iconTile: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    backgroundColor: 'rgba(93,63,211,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkTitle: { ...typography.body, color: c.ink, fontWeight: '600' },
  linkMeta: {
    ...typography.meta,
    color: c.inkMuted,
    lineHeight: 15,
  },
});
}

