import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, Check, Smartphone, Languages } from 'lucide-react-native';
import {
  Card,
  radii,
  spacing,
  typography,
  useColors,
  useThemedStyles,
  type ThemeColors,
} from '@kairos/ui-native';
import { useLocaleStore } from '@/store/locale';
import { LANGUAGES, deviceLanguage, type LanguagePreference } from '@/lib/i18n';

export default function Language() {
  const router = useRouter();
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation(['settings', 'common']);
  const preference = useLocaleStore((s) => s.preference);
  const setPreference = useLocaleStore((s) => s.setPreference);

  const device = deviceLanguage();
  const deviceLabel =
    LANGUAGES.find((l) => l.code === device)?.label ?? 'English';

  const choose = (pref: LanguagePreference) => {
    void setPreference(pref);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerBar}>
        <Pressable onPress={() => router.back()} hitSlop={8} accessibilityLabel={t('common:back')}>
          <ChevronLeft color={c.ink} size={24} strokeWidth={1.5} />
        </Pressable>
        <Text style={styles.headerTitle}>{t('settings:language.title')}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.intro}>{t('settings:language.intro')}</Text>

        <Card padding="none" style={styles.optionCard}>
          <Pressable
            onPress={() => choose('system')}
            accessibilityRole="radio"
            accessibilityState={{ selected: preference === 'system' }}
            style={styles.optionRow}
          >
            <View style={[styles.iconTile, preference === 'system' && styles.iconTileActive]}>
              <Smartphone
                color={preference === 'system' ? c.onPrimary : c.primary}
                size={16}
                strokeWidth={1.5}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.optionLabel}>{t('settings:language.system')}</Text>
              <Text style={styles.optionMeta}>{t('settings:language.systemMeta')}</Text>
            </View>
            {preference === 'system' ? <Check color={c.primary} size={18} strokeWidth={2} /> : null}
          </Pressable>

          {LANGUAGES.map((lang) => {
            const active = preference === lang.code;
            return (
              <Pressable
                key={lang.code}
                onPress={() => choose(lang.code)}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                style={[styles.optionRow, styles.optionRowDivided]}
              >
                <View style={[styles.iconTile, active && styles.iconTileActive]}>
                  <Languages
                    color={active ? c.onPrimary : c.primary}
                    size={16}
                    strokeWidth={1.5}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.optionLabel}>{lang.label}</Text>
                  {lang.translated ? (
                    <Text style={styles.optionMeta}>{lang.english}</Text>
                  ) : (
                    <Text style={styles.optionMetaPending}>
                      {t('settings:language.inProgress')}
                    </Text>
                  )}
                </View>
                {active ? <Check color={c.primary} size={18} strokeWidth={2} /> : null}
              </Pressable>
            );
          })}
        </Card>

        <Text style={styles.footnote}>
          {t('settings:language.restartNote')}
          {preference === 'system' ? ` (${deviceLabel})` : ''}
        </Text>
        <Text style={styles.footnote}>{t('settings:language.inProgressMeta')}</Text>
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
    container: { padding: spacing.lg, gap: spacing.lg },
    intro: { ...typography.body, color: c.inkMuted, lineHeight: 20 },
    optionCard: { overflow: 'hidden' },
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
    optionMetaPending: { ...typography.meta, color: c.inkFaded, lineHeight: 15 },
    footnote: {
      ...typography.meta,
      color: c.inkFaded,
      paddingHorizontal: spacing.xs,
      textAlign: 'center',
    },
  });
}
