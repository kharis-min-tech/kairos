import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
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
  /** Catalogue key under `settings:appearance`, resolved at render. */
  labelKey: string;
  metaKey: string;
  icon: typeof Monitor;
}

const OPTIONS: Option[] = [
  { key: 'system', labelKey: 'system', metaKey: 'systemMeta', icon: Monitor },
  { key: 'light', labelKey: 'light', metaKey: 'lightMeta', icon: Sun },
  { key: 'dark', labelKey: 'dark', metaKey: 'darkMeta', icon: Moon },
];

export default function Appearance() {
  const router = useRouter();
  const { mode, setMode, scheme } = useTheme();
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation(['settings', 'common']);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerBar}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ChevronLeft color={c.ink} size={24} strokeWidth={1.5} />
        </Pressable>
        <Text style={styles.headerTitle}>{t('settings:appearance.title')}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.intro}>{t('settings:appearance.intro')}</Text>

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
                  <Text style={styles.optionLabel}>{t(`settings:appearance.${opt.labelKey}`)}</Text>
                  <Text style={styles.optionMeta}>{t(`settings:appearance.${opt.metaKey}`)}</Text>
                </View>
                {active ? (
                  <Check color={c.primary} size={18} strokeWidth={2} />
                ) : null}
              </Pressable>
            );
          })}
        </Card>

        <Text style={styles.footnote}>
          {t('settings:appearance.currentlyShowing')}{' '}
          <Text style={styles.footnoteStrong}>
            {scheme === 'dark' ? t('settings:appearance.dark') : t('settings:appearance.light')}
          </Text>
          {mode === 'system' ? t('settings:appearance.followingSystem') : ''}
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
