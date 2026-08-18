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
import { FORM_DEFINITIONS, type FormType } from '@kairos/types';

interface FormTile {
  type: FormType;
  title: string;
  description: string;
  Icon: LucideIcon;
}

const TILES: FormTile[] = [
  {
    type: 'first_time_visitor',
    title: 'First-Time Visitor',
    description: 'Welcome a first-time visitor and capture their details for follow-up.',
    Icon: UserPlus,
  },
  {
    type: 'altar_call',
    title: 'New Believers Class',
    description: 'Register someone who responded to an altar call.',
    Icon: Flame,
  },
  {
    type: 'baptism',
    title: 'Baptism',
    description: 'Capture a request to be baptised.',
    Icon: Droplets,
  },
  {
    type: 'testimony',
    title: 'Testimony',
    description: 'Share a testimony of what God has done.',
    Icon: MessageSquareQuote,
  },
  {
    type: 'baby_naming',
    title: 'Baby Naming',
    description: 'Request a baby naming ceremony.',
    Icon: Baby,
  },
  {
    type: 'baby_dedication',
    title: 'Baby Dedication',
    description: 'Request a baby dedication.',
    Icon: HandHeart,
  },
];

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
          {TILES.map((tile) => {
            const declarative = !!FORM_DEFINITIONS[tile.type];
            return (
              <Pressable
                key={tile.type}
                onPress={() => router.push(`/forms/${tile.type}`)}
              >
                <Card padding="md" style={styles.tileCard}>
                  <View style={styles.iconTile}>
                    <tile.Icon color={c.primary} size={22} strokeWidth={1.5} />
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={styles.tileTitle}>{tile.title}</Text>
                    <Text style={styles.tileDesc}>{tile.description}</Text>
                    <Text style={styles.tileCta}>
                      {declarative ? 'Open form' : 'View on web'}
                    </Text>
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

