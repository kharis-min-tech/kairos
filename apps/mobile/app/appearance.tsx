import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, Check, Monitor, Sun, Moon } from 'lucide-react-native';
import {
  Card,
  radii,
  spacing,
  typography,
  useColors,
  useTheme,
  useThemedStyles,
  type ThemeColors,
  type ThemeMode,
} from '@kairos/ui-native';

interface Option {
  key: ThemeMode;
  label: string;
  meta: string;
  icon: typeof Monitor;
}

const OPTIONS: Option[] = [
  {
    key: 'system',
    label: 'System',
    meta: 'Follows your device and flips when your OS does.',
    icon: Monitor,
  },
  { key: 'light', label: 'Light', meta: 'Always light, regardless of the device.', icon: Sun },
  { key: 'dark', label: 'Dark', meta: 'Always dark, easier on the eyes at night.', icon: Moon },
];

export default function Appearance() {
  const router = useRouter();
  const { mode, setMode, scheme } = useTheme();
  const c = useColors();
  const styles = useThemedStyles(makeStyles);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerBar}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ChevronLeft color={c.ink} size={24} strokeWidth={1.5} />
        </Pressable>
        <Text style={styles.headerTitle}>Appearance</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.intro}>
          Kairos matches your phone&apos;s appearance by default. Force a
          scheme here if you&apos;d rather.
        </Text>

        <Card padding="none" style={styles.optionCard}>
          {OPTIONS.map((opt, idx) => {
            const Icon = opt.icon;
            const active = mode === opt.key;
            return (
              <Pressable
                key={opt.key}
                onPress={() => setMode(opt.key)}
                style={[
                  styles.optionRow,
                  idx > 0 && styles.optionRowDivided,
                ]}
              >
                <View
                  style={[
                    styles.iconTile,
                    active && styles.iconTileActive,
                  ]}
                >
                  <Icon
                    color={active ? c.onPrimary : c.primary}
                    size={16}
                    strokeWidth={1.5}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.optionLabel}>{opt.label}</Text>
                  <Text style={styles.optionMeta}>{opt.meta}</Text>
                </View>
                {active ? (
                  <Check color={c.primary} size={18} strokeWidth={2} />
                ) : null}
              </Pressable>
            );
          })}
        </Card>

        <Text style={styles.footnote}>
          Currently showing:{' '}
          <Text style={styles.footnoteStrong}>
            {scheme === 'dark' ? 'Dark' : 'Light'}
          </Text>
          {mode === 'system' ? ' (following system)' : ''}
        </Text>
      </ScrollView>
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
    container: {
      padding: spacing.lg,
      gap: spacing.lg,
    },
    intro: {
      ...typography.body,
      color: c.inkMuted,
      lineHeight: 20,
    },
    optionCard: {
      overflow: 'hidden',
    },
    optionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      padding: spacing.md,
    },
    optionRowDivided: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.divider,
    },
    iconTile: {
      width: 34,
      height: 34,
      borderRadius: radii.sm,
      backgroundColor: c.primaryTint,
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconTileActive: { backgroundColor: c.primary },
    optionLabel: { ...typography.body, color: c.ink, fontWeight: '600' },
    optionMeta: { ...typography.meta, color: c.inkMuted, lineHeight: 15 },
    footnote: {
      ...typography.meta,
      color: c.inkFaded,
      paddingHorizontal: spacing.xs,
      textAlign: 'center',
    },
    footnoteStrong: { color: c.ink, fontWeight: '600' },
  });
}
