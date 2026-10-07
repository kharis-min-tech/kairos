import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ChevronLeft,
  ChevronRight,
  UserPlus,
  Flame,
  Droplets,
  MessageSquareQuote,
  Baby,
  HandHeart,
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
import { FORM_DEFINITIONS, FORM_TYPES, type FormType } from '@kairos/types';

/*
 * Icons only. Each form's title and description come from FORM_DEFINITIONS —
 * the same descriptor the form itself renders — so the tile you tap and the
 * screen you land on can no longer disagree. They used to, in three places:
 * this array, web's FORM_META and the definition.
 *
 * A lucide-react-native component is the one thing that cannot move into the
 * shared definition, since web needs the lucide-react equivalent.
 */
const FORM_ICONS: Record<FormType, LucideIcon> = {
  first_time_visitor: UserPlus,
  altar_call: Flame,
  baptism: Droplets,
  testimony: MessageSquareQuote,
  baby_naming: Baby,
  baby_dedication: HandHeart,
};

export default function FormsLanding() {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerBar}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ChevronLeft color={c.ink} size={24} strokeWidth={1.5} />
        </Pressable>
        <Text style={styles.headerTitle}>Forms</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.introBlock}>
          <Text style={styles.introTitle}>Forms &amp; data capture</Text>
          <Text style={styles.introMeta}>
            Capture altar-call responses, baptism and dedication requests, and testimonies.
          </Text>
        </View>

        <View style={styles.tileList}>
          {FORM_TYPES.map((type) => {
            const definition = FORM_DEFINITIONS[type];
            const Icon = FORM_ICONS[type];
            return (
              <Pressable key={type} onPress={() => router.push(`/forms/${type}`)}>
                <Card padding="md" style={styles.tileCard}>
                  <View style={styles.iconTile}>
                    <Icon color={c.primary} size={22} strokeWidth={1.5} />
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={styles.tileTitle}>{definition.title}</Text>
                    <Text style={styles.tileDesc}>{definition.description}</Text>
                    {/* Every form renders from its definition now, so there is
                        no longer a "view on web" case. */}
                    <Text style={styles.tileCta}>Open form</Text>
                  </View>
                  <ChevronRight color={c.inkVeryFaded} size={18} strokeWidth={1.5} />
                </Card>
              </Pressable>
            );
          })}
        </View>
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
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  introBlock: { gap: 2 },
  introTitle: { ...typography.screenTitle, color: c.ink },
  introMeta: { ...typography.meta, color: c.inkMuted },
  tileList: {
    gap: spacing.md,
  },
  tileCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  iconTile: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    backgroundColor: 'rgba(93,63,211,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileTitle: { ...typography.cardTitle, color: c.ink },
  tileDesc: {
    ...typography.meta,
    color: c.inkMuted,
    lineHeight: 15,
  },
  tileCta: {
    ...typography.meta,
    color: c.primary,
    fontWeight: '600',
    marginTop: 4,
  },
});
}

