import { View, Text, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, Bell } from 'lucide-react-native';
import {
  Card,
  spacing,
  typography,
  radii,
  useThemedStyles,
  type ThemeColors,
  useColors,
} from '@kairos/ui-native';

export default function Notifications() {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerBar}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ChevronLeft color={c.ink} size={24} strokeWidth={1.5} />
        </Pressable>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.subHeader}>
        <Text style={styles.subTitle}>Activity feed</Text>
      </View>

      <View style={styles.emptyBlock}>
        <View style={styles.iconTile}>
          <Bell color={c.primary} size={22} strokeWidth={1.5} />
        </View>
        <Text style={styles.emptyTitle}>Nothing here yet</Text>
        <Text style={styles.emptyMeta}>
          The in-app notifications feed lands once the notifications API is wired.
          Web notifications continue to work in the meantime.
        </Text>
      </View>

      <Card padding="md" style={styles.metaCard}>
        <Text style={styles.metaEyebrow}>What this will show</Text>
        <Text style={styles.metaLine}>· Approvals waiting on you</Text>
        <Text style={styles.metaLine}>· Rota reminders and swap requests</Text>
        <Text style={styles.metaLine}>· New Believer session completions</Text>
        <Text style={styles.metaLine}>· Pastoral announcements</Text>
        <Text style={styles.metaLine}>· Giving receipts</Text>
      </Card>
    </SafeAreaView>
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
  subHeader: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  subTitle: { ...typography.screenTitle, color: c.ink },
  emptyBlock: {
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.md,
  },
  iconTile: {
    width: 56,
    height: 56,
    borderRadius: radii.lg,
    backgroundColor: 'rgba(93,63,211,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: { ...typography.cardTitle, color: c.ink },
  emptyMeta: {
    ...typography.body,
    color: c.inkMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  metaCard: {
    marginHorizontal: spacing.lg,
    gap: spacing.xs,
  },
  metaEyebrow: { ...typography.eyebrow, color: c.inkMuted },
  metaLine: { ...typography.body, color: c.inkMuted },
});
}

