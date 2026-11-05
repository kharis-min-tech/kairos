import { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useKeepAwake } from 'expo-keep-awake';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronRight, Clock, ScanLine } from 'lucide-react-native';
import QRCode from 'react-native-qrcode-svg';
import {
  Card,
  spacing,
  typography,
  radii,
  shadows,
  useThemedStyles,
  type ThemeColors,
  useColors,
} from '@kairos/ui-native';
import type { SelfCheckInCandidate } from '@kairos/types';
import { alert } from '@/lib/alert';
import { api } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth';
import { QrScannerModal } from '@/components/qr-scanner-modal';

/**
 * Parse a member self-check-in QR. Format: `kairos://check-in/{serviceId}/{token}`.
 * Returns `null` for anything else (including the admin-facing member scheme)
 * so the caller can surface a specific "not recognised" message.
 */
function parseCheckInQr(payload: string): { serviceId: string; token: string } | null {
  const prefix = 'kairos://check-in/';
  if (!payload.startsWith(prefix)) return null;
  const rest = payload.slice(prefix.length);
  const slash = rest.indexOf('/');
  if (slash <= 0) return null;
  const serviceId = rest.slice(0, slash);
  const token = rest.slice(slash + 1);
  if (!serviceId || !token) return null;
  return { serviceId, token };
}

function formatServiceTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatServiceDay(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

/**
 * Check-in.
 *
 * The screen has two honest states rather than one that always looks the same:
 *
 *   - A window is open → the screen IS the member's pass. One large code,
 *     their name, the service. Walk up, hold it out, an usher scans it. This
 *     is the boarding-pass pattern, for the reason airlines and gyms use it:
 *     at the door there is no decision left to make.
 *   - Nothing open → the screen is their attendance record. No hero card
 *     announcing that nothing is happening, which was the state it sat in six
 *     days a week.
 *
 * There used to be an "I'm here" button that recorded you present from
 * anywhere. It wrote a row identical to a scanned one, so while it existed no
 * attendance figure could be called verified. It is gone, with its endpoint.
 * Both remaining paths put a person in the room: an usher scans the member's
 * code, or the member scans the rotating code on the desk.
 */
export default function CheckIn() {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();
  const [scannerOpen, setScannerOpen] = useState(false);

  const candidates = useQuery({
    queryKey: ['attendance', 'self-check-in', 'candidates'],
    queryFn: async () => (await api.attendance.selfCheckInCandidates()).data ?? [],
    // Poll every 60s while the tab is mounted so a window that opens mid-view
    // flips to "open" without needing a manual refresh.
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });

  const stats = useQuery({
    queryKey: ['analytics', 'member'],
    queryFn: async () => (await api.analytics.memberStats()).data,
    enabled: !!user,
  });

  const rows = useMemo(() => candidates.data ?? [], [candidates.data]);
  const openRows = useMemo(() => rows.filter((r) => r.status === 'open'), [rows]);
  const openingSoon = useMemo(
    () => rows.filter((r) => r.status === 'opens-soon')[0] ?? null,
    [rows],
  );
  const closedToday = useMemo(() => rows.filter((r) => r.status === 'closed'), [rows]);

  const openNow = openRows[0] ?? null;

  const checkInQr = useMutation({
    mutationFn: async (params: { serviceId: string; token: string }) => {
      const res = await api.attendance.selfCheckInQr(params);
      if (!res.success || !res.data) {
        throw new Error(res.message ?? 'Check-in failed');
      }
      return res.data;
    },
    onSuccess: (data) => {
      void qc.invalidateQueries({ queryKey: ['attendance', 'self-check-in', 'candidates'] });
      void qc.invalidateQueries({ queryKey: ['analytics', 'member'] });
      alert.info(
        data.alreadyCheckedIn
          ? "You're already checked in"
          : data.status === 'Late'
            ? "You're checked in, marked Late"
            : "You're in",
        data.alreadyCheckedIn
          ? `Recorded as ${data.status}.`
          : data.status === 'Late'
            ? "The service already started, but you're recorded."
            : 'Have a great service.',
      );
    },
    onError: (e: Error) => alert.info('Check-in failed', e.message ?? 'Please try again.'),
  });

  // Return contract matches QrScannerModal — true accepts + parent closes,
  // false keeps the scanner open with an in-frame "not recognised" hint so
  // pointing the camera at random QRs doesn't kick the user out.
  function handleScannedCheckInQr(payload: string): boolean {
    const parsed = parseCheckInQr(payload);
    if (!parsed) return false;
    setScannerOpen(false);
    checkInQr.mutate(parsed);
    return true;
  }

  const attendanceTotal = stats.data?.recentAttendance?.total ?? 0;
  const attendancePresent = stats.data?.recentAttendance?.present ?? 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Check-in</Text>
          <Text style={styles.subtitle}>
            {openNow
              ? 'Hold your code out at the desk and an usher will scan it.'
              : 'Your attendance record, and the next service.'}
          </Text>
        </View>

        {candidates.isLoading ? (
          <ActivityIndicator color={c.primary} style={{ marginTop: spacing.xxl }} />
        ) : openNow ? (
          <>
            <MemberPass
              memberId={user?.id ?? null}
              name={user ? `${user.firstName} ${user.lastName}` : 'Signed in'}
              service={openNow}
              styles={styles}
            />

            {/* The other half of the loop: one shared admin device, or a
                queue, makes it quicker for the member to scan instead. */}
            <Pressable
              onPress={() => setScannerOpen(true)}
              disabled={checkInQr.isPending}
              style={({ pressed }) => [
                styles.secondaryAction,
                (pressed || checkInQr.isPending) && { opacity: 0.85 },
              ]}
            >
              {checkInQr.isPending ? (
                <ActivityIndicator color={c.primary} size="small" />
              ) : (
                <ScanLine color={c.primary} size={16} strokeWidth={2} />
              )}
              <Text style={styles.secondaryLabel}>
                {checkInQr.isPending ? 'Checking in…' : 'Scan the desk code instead'}
              </Text>
            </Pressable>
          </>
        ) : (
          <>
            {/* A single quiet line, not a hero. Nothing is happening, and the
                screen should say so once and move on. */}
            <Card padding="md" style={styles.statusCard}>
              {openingSoon ? (
                <>
                  <View style={styles.statusRow}>
                    <Clock color={c.primary} size={16} strokeWidth={1.6} />
                    <Text style={styles.statusTitle}>
                      Opens in {openingSoon.minutesUntilOpen} min
                    </Text>
                  </View>
                  <Text style={styles.statusMeta}>
                    {openingSoon.serviceTitle ?? openingSoon.serviceType} ·{' '}
                    {formatServiceTime(openingSoon.serviceDate)}. Your code
                    appears here when it opens.
                  </Text>
                </>
              ) : closedToday.length > 0 ? (
                <>
                  <Text style={styles.statusTitle}>Check-in has closed</Text>
                  <Text style={styles.statusMeta}>
                    {closedToday[0]!.serviceTitle ?? closedToday[0]!.serviceType} ·{' '}
                    {formatServiceDay(closedToday[0]!.serviceDate)}. If you were
                    there and it is not recorded, ask an usher.
                  </Text>
                </>
              ) : (
                <>
                  <Text style={styles.statusTitle}>No service today</Text>
                  <Text style={styles.statusMeta}>
                    Your code appears here when the next check-in opens.
                  </Text>
                </>
              )}
            </Card>

            <Card padding="md" style={styles.statCard}>
              <Text style={styles.statEyebrow}>RECENT ATTENDANCE</Text>
              <Text style={styles.statNumber}>
                {attendanceTotal === 0 ? '—' : `${attendancePresent} of ${attendanceTotal}`}
              </Text>
              <Text style={styles.statMeta}>
                {attendanceTotal > 0
                  ? 'Present at recent services.'
                  : 'Nothing recorded yet.'}
              </Text>
            </Card>

            {/* The code stays reachable outside the window: an usher may
                scan somebody arriving early, or late after it has closed,
                and records that through the admin side. */}
            <Pressable
              onPress={() => router.push('/my-qr' as never)}
              style={({ pressed }) => [styles.linkRow, pressed && { opacity: 0.85 }]}
            >
              <Text style={styles.linkLabel}>Show my code anyway</Text>
              <ChevronRight color={c.inkFaded} size={18} strokeWidth={1.5} />
            </Pressable>

            <Pressable
              onPress={() => router.push('/my-attendance')}
              style={({ pressed }) => [styles.linkRow, pressed && { opacity: 0.85 }]}
            >
              <Text style={styles.linkLabel}>See my full attendance</Text>
              <ChevronRight color={c.inkFaded} size={18} strokeWidth={1.5} />
            </Pressable>
          </>
        )}
      </ScrollView>

      <QrScannerModal
        visible={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScan={handleScannedCheckInQr}
        title="Scan check-in QR"
        hint="Point at the code on the admin's screen."
      />
    </SafeAreaView>
  );
}

/**
 * The pass itself.
 *
 * Its own component so `useKeepAwake` is scoped to it: the screen must not
 * sleep while somebody is holding it out to be scanned, and must go back to
 * normal the moment the window closes and this unmounts.
 *
 * The code tile is hard-coded light even in dark mode. A scanner needs dark
 * modules on a light field, and a themed tile would invert it.
 */
function MemberPass({
  memberId,
  name,
  service,
  styles,
}: {
  memberId: string | null;
  name: string;
  service: SelfCheckInCandidate;
  styles: ReturnType<typeof makeStyles>;
}) {
  useKeepAwake();

  return (
    <View style={[styles.pass, shadows.buttonHero]}>
      <View style={styles.passCodeTile}>
        {memberId ? (
          <QRCode value={`kairos://member/${memberId}`} size={232} />
        ) : (
          <Text style={styles.passCodeMissing}>
            Sign in again to show your code.
          </Text>
        )}
      </View>

      <Text style={styles.passName} numberOfLines={1}>
        {name}
      </Text>
      <Text style={styles.passService}>
        {service.serviceTitle ?? service.serviceType} ·{' '}
        {formatServiceTime(service.serviceDate)}
      </Text>

      <View style={styles.passOpenPill}>
        <View style={styles.passPulse} />
        <Text style={styles.passOpenLabel}>Check-in open</Text>
      </View>
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.page },
    container: {
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.xxl,
      gap: spacing.lg,
    },
    header: { paddingTop: spacing.md, gap: 2 },
    title: { ...typography.screenTitle, color: c.ink },
    subtitle: { ...typography.meta, color: c.inkMuted },

    pass: {
      backgroundColor: c.card,
      borderRadius: radii.lg,
      padding: spacing.lg,
      alignItems: 'center',
      gap: spacing.xs,
    },
    // Always light: scanners need dark-on-light whatever the app theme.
    passCodeTile: {
      backgroundColor: '#ffffff',
      borderRadius: radii.md,
      padding: spacing.md,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 264,
      minWidth: 264,
      marginBottom: spacing.sm,
    },
    passCodeMissing: {
      ...typography.meta,
      color: '#6b7280',
      textAlign: 'center',
      paddingHorizontal: spacing.md,
    },
    passName: { ...typography.cardTitle, color: c.ink },
    passService: { ...typography.meta, color: c.inkMuted },
    passOpenPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: spacing.xs,
      paddingHorizontal: spacing.md,
      height: 28,
      borderRadius: radii.pill,
      backgroundColor: 'rgba(93,63,211,0.1)',
    },
    passPulse: {
      width: 7,
      height: 7,
      borderRadius: 4,
      backgroundColor: c.primary,
    },
    passOpenLabel: { ...typography.meta, color: c.primary, fontWeight: '700' },

    secondaryAction: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xs,
      height: 44,
      borderRadius: radii.pill,
      borderWidth: 1,
      borderColor: c.divider,
      backgroundColor: c.card,
    },
    secondaryLabel: { ...typography.body, color: c.primary, fontWeight: '600' },

    statusCard: { gap: spacing.xs },
    statusRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
    statusTitle: { ...typography.cardTitle, color: c.ink },
    statusMeta: { ...typography.body, color: c.inkMuted, lineHeight: 20 },

    statCard: { gap: 2 },
    statEyebrow: {
      ...typography.meta,
      color: c.inkFaded,
      letterSpacing: 0.6,
      fontWeight: '700',
    },
    statNumber: { ...typography.screenTitle, color: c.ink },
    statMeta: { ...typography.meta, color: c.inkMuted },

    linkRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: spacing.sm,
    },
    linkLabel: { ...typography.body, color: c.primary, fontWeight: '600' },
  });
}
