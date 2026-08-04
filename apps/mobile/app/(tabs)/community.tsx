import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, typography } from '@kairos/ui-native';

export default function Community() {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.container}>
        <Text style={styles.eyebrow}>COMMUNITY</Text>
        <Text style={styles.title}>People, fellowships, departments</Text>
        <Text style={styles.note}>
          Segmented directory (People / Fellowships / Departments) lands in Phase 5.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.pageLight },
  container: { flex: 1, padding: spacing.lg, gap: spacing.md },
  eyebrow: { ...typography.eyebrow, color: 'rgba(26,28,28,0.5)' },
  title: { ...typography.screenTitle, color: colors.ink },
  note: { ...typography.body, color: 'rgba(26,28,28,0.55)', marginTop: spacing.sm },
});
