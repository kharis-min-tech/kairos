import { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Globe, Check } from 'lucide-react-native';
import { Button, colors, spacing, typography, radii } from '@kairos/ui-native';
import { useOnboardingStore, type Language } from '@/store/onboarding';

interface Option {
  code: Language;
  label: string;
  sublabel: string;
}

const OPTIONS: Option[] = [
  { code: 'en', label: 'English', sublabel: 'Default' },
  { code: 'tw', label: 'Twi', sublabel: 'Akan · Ghana' },
  { code: 'kr', label: 'Krio', sublabel: 'Sierra Leone' },
  { code: 'fr', label: 'Français', sublabel: 'West Africa' },
];

export default function LanguageScreen() {
  const router = useRouter();
  const savedLanguage = useOnboardingStore((s) => s.language);
  const setLanguage = useOnboardingStore((s) => s.setLanguage);
  const [selected, setSelected] = useState<Language>(savedLanguage ?? 'en');

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <View style={styles.iconTile}>
            <Globe color={colors.primary} size={20} strokeWidth={1.5} />
          </View>
          <Text style={styles.title}>Choose your language</Text>
          <Text style={styles.subtitle}>You can change this later in Settings.</Text>
        </View>

        <View style={styles.options}>
          {OPTIONS.map((opt) => {
            const isSelected = selected === opt.code;
            return (
              <Pressable
                key={opt.code}
                onPress={() => setSelected(opt.code)}
                accessibilityRole="radio"
                accessibilityState={{ selected: isSelected }}
                style={[styles.option, isSelected && styles.optionSelected]}
              >
                <View style={styles.optionText}>
                  <Text style={styles.optionLabel}>{opt.label}</Text>
                  <Text style={styles.optionSublabel}>{opt.sublabel}</Text>
                </View>
                <View style={[styles.radio, isSelected && styles.radioSelected]}>
                  {isSelected ? <Check color="#ffffff" size={12} strokeWidth={2.5} /> : null}
                </View>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
      <View style={styles.footer}>
        <Button
          label="Continue"
          fullWidth
          onPress={async () => {
            await setLanguage(selected);
            router.push('/(onboarding)/branch');
          }}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.pageLight },
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.xl,
  },
  header: {
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingTop: spacing.lg,
  },
  iconTile: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    backgroundColor: 'rgba(93,63,211,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...typography.screenTitle,
    color: colors.ink,
    marginTop: spacing.sm,
  },
  subtitle: {
    ...typography.body,
    color: 'rgba(26,28,28,0.6)',
  },
  options: { gap: spacing.sm },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.cardLight,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: 'rgba(26,28,28,0.08)',
    padding: spacing.md,
  },
  optionSelected: {
    borderColor: colors.primary,
    borderWidth: 1.5,
  },
  optionText: { flex: 1, gap: 2 },
  optionLabel: { ...typography.cardTitle, color: colors.ink },
  optionSublabel: { ...typography.meta, color: 'rgba(26,28,28,0.55)' },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: 'rgba(26,28,28,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(26,28,28,0.06)',
  },
});
