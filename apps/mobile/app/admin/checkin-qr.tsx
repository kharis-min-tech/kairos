import { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, RefreshCw } from 'lucide-react-native';
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
import { api } from '@/lib/api-client';
import { useCapabilities, useRequireCapability } from '@/lib/capabilities';
import { useAuthStore } from '@/store/auth';

/**
 * Rotating QR display for the check-in desk. Polls `getQrToken` on the
 * bucket boundary (~30s) so the QR you see always signs the current bucket.
 * The verifier accepts current OR previous bucket, so a stale QR still works
 * for up to 60s after rotation. See docs/self-check-in.md.
 */
export default function AdminCheckinQr() {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  const router = useRouter();
  const { serviceId } = useLocalSearchParams<{ serviceId?: string }>();
  const validServiceId = typeof serviceId === 'string' && serviceId.length > 0 ? serviceId : null;

  const caps = useCapabilities();
  const branchId = useAuthStore((s) => s.user?.homeBranchId ?? null);
  const canAccess =
    caps.systemRole === 'admin' ||
    (!!branchId && caps.has('branch:write', { kind: 'branch', id: branchId }));
  useRequireCapability(canAccess);

  const token = useQuery({
    queryKey: ['attendance', 'qr-token', validServiceId],
    queryFn: async () => {
      const res = await api.attendance.getQrToken(validServiceId!);
      if (!res.success || !res.data) {
        throw new Error(res.message ?? 'Could not load QR');
      }
      return res.data;
    },
    enabled: !!validServiceId,
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
    staleTime: 0,
  });

  const qrValue = useMemo(() => {
    if (!token.data || !validServiceId) return null;
    return `kairos://check-in/${validServiceId}/${token.data.token}`;
  }, [token.data, validServiceId]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
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
            <Text style={styles.headerEyebrow}>Show to congregation</Text>
            <Text style={styles.headerTitle}>Self check-in QR</Text>
            <Text style={styles.headerMeta}>Refreshes every 30 seconds.</Text>
          </View>
        </View>
      </View>

      <View style={styles.body}>
        {!validServiceId ? (
          <View style={styles.emptyBlock}>
            <Text style={styles.emptyTitle}>No service in scope</Text>
            <Text style={styles.emptyMeta}>Open a service from the desk first.</Text>
          </View>
        ) : token.isLoading ? (
          <ActivityIndicator color={c.primary} />
        ) : token.isError ? (
          <View style={styles.emptyBlock}>
            <Text style={styles.emptyTitle}>Could not load QR</Text>
            <Text style={styles.emptyMeta}>
              {token.error instanceof Error ? token.error.message : 'Please try again.'}
            </Text>
            <Pressable style={styles.retry} onPress={() => token.refetch()}>
              <RefreshCw color={c.primary} size={14} strokeWidth={2} />
              <Text style={styles.retryLabel}>Retry</Text>
            </Pressable>
          </View>
        ) : qrValue ? (
          <View style={styles.qrCard}>
            <QRCode
              value={qrValue}
              size={280}
              color="#1a1c1c"
              backgroundColor="#ffffff"
            />
            <Text style={styles.qrHint}>
              Open Kairos → Check-in → Scan QR
            </Text>
            <Text style={styles.qrSubHint}>
              Rotates every 30s. Previous code stays valid a moment longer.
            </Text>
          </View>
        ) : null}
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
    qrHint: {
      ...typography.cardTitle,
      color: '#1a1c1c',
      textAlign: 'center',
    },
    qrSubHint: {
      ...typography.meta,
      color: 'rgba(26,28,28,0.65)',
      textAlign: 'center',
    },
    emptyBlock: {
      alignItems: 'center',
      gap: spacing.sm,
      padding: spacing.xl,
    },
    emptyTitle: { ...typography.cardTitle, color: c.ink, textAlign: 'center' },
    emptyMeta: { ...typography.body, color: c.inkMuted, textAlign: 'center' },
    retry: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      marginTop: spacing.sm,
    },
    retryLabel: { ...typography.button, color: c.primary },
  });
}
