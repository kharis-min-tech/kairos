import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, typography } from '@kairos/ui-native';
import { useAuthStore } from '@/store/auth';

export default function Home() {
  const user = useAuthStore((s) => s.user);
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.container}>
        <Text style={styles.eyebrow}>HOME</Text>
        <Text style={styles.greeting}>
          Good day{user?.firstName ? `, ${user.firstName}` : ''}.
        </Text>
        <Text style={styles.note}>
          The full dashboard (upcoming service, next rota, alerts, daily verse, announcements)
          lands in Phase 5.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.pageLight },
  container: {
    flex: 1,
    padding: spacing.lg,
    gap: spacing.md,
  },
  eyebrow: {
    ...typography.eyebrow,
    color: 'rgba(26,28,28,0.5)',
  },
  greeting: {
    ...typography.screenTitle,
    color: colors.ink,
  },
  note: {
    ...typography.body,
    color: 'rgba(26,28,28,0.55)',
    marginTop: spacing.sm,
  },
});
