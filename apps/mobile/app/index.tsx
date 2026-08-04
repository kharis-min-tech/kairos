import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, typography } from '@/constants/tokens';

export default function Index() {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.wordmark}>KAIROS</Text>
        <Text style={styles.sublabel}>Kharis Church</Text>
        <Text style={styles.scaffoldNote}>
          Foundation scaffold. Screens land in Phase 4.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.pageDark },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  wordmark: {
    ...typography.hero,
    color: '#ffffff',
    letterSpacing: 3.3,
  },
  sublabel: {
    ...typography.eyebrow,
    color: '#ffffff',
    opacity: 0.55,
    letterSpacing: 2.4,
  },
  scaffoldNote: {
    ...typography.meta,
    color: '#ffffff',
    opacity: 0.4,
    marginTop: spacing.xl,
    textAlign: 'center',
  },
});
