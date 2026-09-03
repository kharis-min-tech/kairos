import { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import QRCode from 'react-native-qrcode-svg';
import {
  spacing,
  typography,
  radii,
  gradients,
  useThemedStyles,
  type ThemeColors,
  useColors,
} from '@kairos/ui-native';
import { useAuthStore } from '@/store/auth';

/**
 * Member-facing "show my QR" screen. Displays a static QR encoding
 * `kairos://member/{memberId}` — an admin at the desk scans it to record the
 * caller present without them having to sign anything on paper. Complements
 * the rotating service-QR flow (which lets members self-check-in by scanning
 * a code the admin displays). Together the two directions cover the whole
 * check-in loop:
 *   - Admin projects rotating QR → members scan → self check-in
 *   - Member displays personal QR → admin scans → admin marks them present
 */
export default function MyQr() {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const qrValue = useMemo(() => {
    if (!user?.id) return null;
    return `kairos://member/${user.id}`;
  }, [user?.id]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.gradientHeader}>
        <LinearGradient
          colors={gradients.brandDeep}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradientBg}
        />
        <View style={styles.headerBar}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <ChevronLeft color="#ffffff" size={24} strokeWidth={1.5} />
          </Pressable>
          <View style={styles.headerText}>
            <Text style={styles.headerEyebrow}>Show to admin</Text>
            <Text style={styles.headerTitle}>My check-in QR</Text>
            <Text style={styles.headerMeta}>
              Hand your phone to the check-in team at any time.
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.body}>
        {qrValue ? (
          <View style={styles.qrCard}>
            <QRCode
              value={qrValue}
              size={280}
              color="#1a1c1c"
              backgroundColor="#ffffff"
            />
            <Text style={styles.name}>
              {user?.firstName} {user?.lastName}
            </Text>
            {user?.email ? (
              <Text style={styles.email}>{user.email}</Text>
            ) : null}
            <Text style={styles.qrSubHint}>
              This code identifies you, so no one else can check in as you.
            </Text>
          </View>
        ) : (
          <View style={styles.emptyBlock}>
            <Text style={styles.emptyTitle}>Sign in to see your QR</Text>
            <Text style={styles.emptyMeta}>
              Your personal check-in code lives with your account.
            </Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.page },
    gradientHeader: { paddingBottom: spacing.md },
    gradientBg: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    },
    headerBar: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.md,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
    },
    headerText: { flex: 1, gap: 2 },
    headerEyebrow: {
      ...typography.eyebrow,
      color: 'rgba(255,255,255,0.65)',
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: '#ffffff',
    },
    headerMeta: {
      ...typography.meta,
      color: 'rgba(255,255,255,0.7)',
    },
    body: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing.lg,
    },
    qrCard: {
      alignItems: 'center',
      gap: spacing.md,
      backgroundColor: '#ffffff',
      padding: spacing.xl,
      borderRadius: radii.lg,
    },
    name: {
      ...typography.cardTitle,
      color: '#1a1c1c',
      textAlign: 'center',
    },
    email: {
      ...typography.body,
      color: 'rgba(26,28,28,0.65)',
      textAlign: 'center',
    },
    qrSubHint: {
      ...typography.meta,
      color: 'rgba(26,28,28,0.55)',
      textAlign: 'center',
      marginTop: spacing.sm,
    },
    emptyBlock: {
      alignItems: 'center',
      gap: spacing.sm,
      padding: spacing.xl,
    },
    emptyTitle: { ...typography.cardTitle, color: c.ink, textAlign: 'center' },
    emptyMeta: { ...typography.body, color: c.inkMuted, textAlign: 'center' },
  });
}
