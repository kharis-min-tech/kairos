import { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Modal,
  FlatList,
  Vibration,
  AppState,
  type AppStateStatus,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ChevronLeft,
  Calendar,
  Check,
  CheckCheck,
  CloudOff,
  UserX,
} from 'lucide-react-native';
import {
  Avatar,
  Badge,
  Button,
  Card,
  colors,
  radii,
  spacing,
  typography,
} from '@kairos/ui-native';
import type {
  AttendanceStatus,
  FellowshipMeetingAttendance,
  FellowshipMemberWithDetails,
  RecordAttendanceRequest,
} from '@kairos/types';
import { api } from '@/lib/api-client';
import { alert } from '@/lib/alert';
import {
  enqueueRollcall,
  flushPendingRollcall,
  getPendingRollcall,
} from '@/lib/rollcall-queue';

const STATUS_ORDER: AttendanceStatus[] = ['Present', 'Absent', 'Late', 'Excused'];

const STATUS_LABEL: Record<AttendanceStatus, string> = {
  Present: 'Present',
  Late: 'Late',
  Excused: 'Excused',
  Absent: 'Absent',
};

const STATUS_TONE: Record<
  AttendanceStatus,
  { bg: string; text: string; border: string; barBg: string; barText: string }
> = {
  Present: {
    bg: 'rgba(16,185,129,0.14)',
    text: colors.successText,
    border: 'rgba(16,185,129,0.4)',
    barBg: 'rgba(16,185,129,0.14)',
    barText: colors.successText,
  },
  Late: {
    bg: 'rgba(248,181,55,0.18)',
    text: colors.goldDark,
    border: 'rgba(248,181,55,0.55)',
    barBg: 'rgba(248,181,55,0.18)',
    barText: colors.goldDark,
  },
  Excused: {
    bg: 'rgba(59,130,246,0.14)',
    text: colors.info,
    border: 'rgba(59,130,246,0.4)',
    barBg: 'rgba(59,130,246,0.14)',
    barText: colors.info,
  },
  Absent: {
    bg: 'rgba(225,29,72,0.12)',
    text: colors.danger,
    border: 'rgba(225,29,72,0.4)',
    barBg: 'rgba(225,29,72,0.12)',
    barText: colors.danger,
  },
};

function nextStatus(current: AttendanceStatus): AttendanceStatus {
  const idx = STATUS_ORDER.indexOf(current);
  return STATUS_ORDER[(idx + 1) % STATUS_ORDER.length]!;
}

function formatMeetingDate(iso: string | Date): string {
  const d = iso instanceof Date ? iso : new Date(iso);
  return d.toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default function RollcallMeeting() {
  const router = useRouter();
  const qc = useQueryClient();
  const params = useLocalSearchParams<{ fellowshipId: string; meetingId: string }>();
  const fellowshipId = params.fellowshipId!;
  const meetingId = params.meetingId!;

  const meetings = useQuery({
    queryKey: ['fellowships', fellowshipId, 'meetings'],
    enabled: !!fellowshipId,
    queryFn: async () => (await api.fellowships.meetings.list(fellowshipId)).data ?? [],
  });

  const members = useQuery({
    queryKey: ['fellowships', fellowshipId, 'members'],
    enabled: !!fellowshipId,
    queryFn: async () => (await api.fellowships.members.list(fellowshipId)).data ?? [],
  });

  const existing = useQuery({
    queryKey: ['fellowships', fellowshipId, 'meetings', meetingId, 'attendance'],
    enabled: !!fellowshipId && !!meetingId,
    queryFn: async () =>
      (await api.fellowships.attendance.get(fellowshipId, meetingId)).data ?? [],
  });

  const meeting = useMemo(
    () => (meetings.data ?? []).find((m) => m.id === meetingId),
    [meetings.data, meetingId],
  );

  const [records, setRecords] = useState<Record<string, AttendanceStatus>>({});
  const [seededFromServer, setSeededFromServer] = useState(false);
  const [pickerFor, setPickerFor] = useState<FellowshipMemberWithDetails | null>(null);
  const [pendingLocally, setPendingLocally] = useState(false);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    if (seededFromServer) return;
    if (members.isLoading || existing.isLoading) return;
    const memberRows = members.data ?? [];
    if (memberRows.length === 0) return;
    // Locally-queued snapshot wins over server data on seed — the user's
    // last tap-set is the source of truth until we successfully sync it.
    void (async () => {
      const pending = await getPendingRollcall(meetingId);
      if (pending) {
        const bag: Record<string, AttendanceStatus> = {};
        for (const m of memberRows) bag[m.memberId] = 'Present';
        for (const r of pending.payload.records) {
          bag[r.memberId] = r.attendanceStatus;
        }
        setRecords(bag);
        setPendingLocally(true);
        setSeededFromServer(true);
        return;
      }
      const existingByMember = new Map(
        (existing.data ?? []).map((r: FellowshipMeetingAttendance) => [
          r.memberId,
          r.attendanceStatus,
        ]),
      );
      const next: Record<string, AttendanceStatus> = {};
      for (const m of memberRows) {
        next[m.memberId] = existingByMember.get(m.memberId) ?? 'Present';
      }
      setRecords(next);
      setSeededFromServer(true);
    })();
  }, [
    members.isLoading,
    existing.isLoading,
    members.data,
    existing.data,
    meetingId,
    seededFromServer,
  ]);

  // Auto-retry a queued snapshot whenever we mount or the app returns to
  // the foreground on this screen. Silent on failure — the banner stays and
  // the user can still tap Save to try again explicitly.
  useEffect(() => {
    let cancelled = false;
    async function tryFlush() {
      if (!meetingId) return;
      const pending = await getPendingRollcall(meetingId);
      if (!pending || cancelled) {
        if (!cancelled) setPendingLocally(false);
        return;
      }
      setSyncing(true);
      const result = await flushPendingRollcall(meetingId);
      if (cancelled) return;
      setSyncing(false);
      if (result === 'sent') {
        setPendingLocally(false);
        qc.invalidateQueries({
          queryKey: ['fellowships', fellowshipId, 'meetings', meetingId, 'attendance'],
        });
      } else {
        setPendingLocally(true);
      }
    }
    void tryFlush();
    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') void tryFlush();
    });
    return () => {
      cancelled = true;
      sub.remove();
    };
  }, [meetingId, fellowshipId, qc]);

  const record = useMutation({
    mutationFn: async (data: RecordAttendanceRequest) => {
      await api.fellowships.attendance.record(fellowshipId, meetingId, data);
    },
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: ['fellowships', fellowshipId, 'meetings', meetingId, 'attendance'],
      });
      qc.invalidateQueries({
        queryKey: ['fellowships', fellowshipId, 'attendance', 'summary'],
      });
    },
  });

  const totals = useMemo(() => {
    const counts: Record<AttendanceStatus, number> = {
      Present: 0,
      Late: 0,
      Excused: 0,
      Absent: 0,
    };
    for (const status of Object.values(records)) counts[status] += 1;
    return counts;
  }, [records]);

  function cycleStatus(memberId: string) {
    Vibration.vibrate(10);
    setRecords((p) => {
      const current = p[memberId] ?? 'Present';
      return { ...p, [memberId]: nextStatus(current) };
    });
  }

  function setStatus(memberId: string, status: AttendanceStatus) {
    setRecords((p) => ({ ...p, [memberId]: status }));
  }

  function markAll(status: AttendanceStatus) {
    Vibration.vibrate(15);
    const memberRows = members.data ?? [];
    const next: Record<string, AttendanceStatus> = {};
    for (const m of memberRows) next[m.memberId] = status;
    setRecords(next);
  }

  function handleSave() {
    Vibration.vibrate(20);
    const payload: RecordAttendanceRequest = {
      records: Object.entries(records).map(([memberId, status]) => ({
        memberId,
        attendanceStatus: status,
      })),
    };
    record.mutate(payload, {
      onSuccess: async () => {
        // If a previous offline attempt left a payload queued, this successful
        // save supersedes it — nuke the queued entry so it doesn't fire later.
        await flushPendingRollcall(meetingId);
        setPendingLocally(false);
        alert.show({
          title: 'Saved',
          message: 'Attendance recorded.',
          buttons: [
            { label: 'OK', variant: 'primary', onPress: () => router.back() },
          ],
        });
      },
      onError: async (err) => {
        // Cache-and-retry: keep the user's tap-set locally so it's not lost.
        try {
          await enqueueRollcall({ fellowshipId, meetingId, payload });
          setPendingLocally(true);
          alert.info(
            'Saved locally',
            "We couldn't reach the server, but your attendance is safe on this device — we'll sync it as soon as you're back online.",
          );
        } catch {
          alert.info(
            'Save failed',
            err instanceof Error ? err.message : 'Please try again in a moment.',
          );
        }
      },
    });
  }

  async function handleRetrySync() {
    setSyncing(true);
    const result = await flushPendingRollcall(meetingId);
    setSyncing(false);
    if (result === 'sent') {
      setPendingLocally(false);
      qc.invalidateQueries({
        queryKey: ['fellowships', fellowshipId, 'meetings', meetingId, 'attendance'],
      });
      alert.info('Synced', 'Your attendance was uploaded.');
    } else if (result === 'kept') {
      alert.info(
        'Still offline',
        "Couldn't reach the server. Your attendance is safe locally — we'll keep trying.",
      );
    }
  }

  const memberRows = members.data ?? [];
  const isBusy = members.isLoading || existing.isLoading || meetings.isLoading;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerBar}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ChevronLeft color={colors.ink} size={24} strokeWidth={1.5} />
        </Pressable>
        <Text style={styles.headerTitle}>Rollcall</Text>
        <View style={{ width: 24 }} />
      </View>

      <FlatList
        data={memberRows}
        keyExtractor={(m) => m.memberId}
        contentContainerStyle={styles.container}
        initialNumToRender={16}
        maxToRenderPerBatch={12}
        windowSize={8}
        removeClippedSubviews
        ListHeaderComponent={
          <View style={{ gap: spacing.md, marginBottom: spacing.md }}>
            {meeting ? (
              <View style={styles.meetingBanner}>
                <Calendar color={colors.primary} size={16} strokeWidth={1.5} />
                <Text style={styles.meetingBannerLabel}>
                  {meeting.meetingTitle ?? 'Meeting'} ·{' '}
                  {formatMeetingDate(meeting.meetingDate)}
                </Text>
              </View>
            ) : null}

            {pendingLocally ? (
              <View style={styles.offlineBanner}>
                <CloudOff color={colors.goldDark} size={16} strokeWidth={1.5} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.offlineTitle}>Saved locally · will sync</Text>
                  <Text style={styles.offlineMeta}>
                    Your attendance is safe on this device. We&apos;ll upload it as
                    soon as we can reach the server.
                  </Text>
                </View>
                <Pressable
                  onPress={syncing ? undefined : handleRetrySync}
                  style={[styles.retryBtn, syncing && { opacity: 0.6 }]}
                >
                  <Text style={styles.retryBtnLabel}>
                    {syncing ? 'Trying…' : 'Retry'}
                  </Text>
                </Pressable>
              </View>
            ) : null}

            <View style={styles.summaryRow}>
              {STATUS_ORDER.map((s) => {
                const tone = STATUS_TONE[s];
                return (
                  <View
                    key={s}
                    style={[
                      styles.summaryTile,
                      { backgroundColor: tone.bg, borderColor: tone.border },
                    ]}
                  >
                    <Text style={[styles.summaryCount, { color: tone.text }]}>
                      {totals[s]}
                    </Text>
                    <Text style={[styles.summaryLabel, { color: tone.text }]}>
                      {STATUS_LABEL[s]}
                    </Text>
                  </View>
                );
              })}
            </View>

            {memberRows.length > 0 ? (
              <View style={styles.batchRow}>
                <Pressable
                  style={styles.batchBtn}
                  onPress={() => markAll('Present')}
                  hitSlop={4}
                >
                  <CheckCheck color={colors.successText} size={14} strokeWidth={2} />
                  <Text style={[styles.batchBtnLabel, { color: colors.successText }]}>
                    All present
                  </Text>
                </Pressable>
                <Pressable
                  style={styles.batchBtn}
                  onPress={() => markAll('Absent')}
                  hitSlop={4}
                >
                  <UserX color={colors.danger} size={14} strokeWidth={2} />
                  <Text style={[styles.batchBtnLabel, { color: colors.danger }]}>
                    All not-here
                  </Text>
                </Pressable>
              </View>
            ) : null}

            {isBusy ? (
              <ActivityIndicator
                color={colors.primary}
                style={{ marginTop: spacing.md }}
              />
            ) : null}
          </View>
        }
        ListEmptyComponent={
          !isBusy ? (
            <Card padding="md">
              <Text style={styles.emptyLine}>
                No members in this fellowship yet.
              </Text>
            </Card>
          ) : null
        }
        renderItem={({ item, index }) => {
          const status = records[item.memberId] ?? 'Present';
          const tone = STATUS_TONE[status];
          return (
            <View
              style={[
                styles.memberRow,
                index === 0 ? styles.memberRowFirst : styles.memberRowNext,
                index === memberRows.length - 1 ? styles.memberRowLast : null,
              ]}
            >
              <View style={styles.memberInfo}>
                <Avatar
                  size="sm"
                  photoUrl={item.memberPhotoUrl ?? undefined}
                  firstName={item.memberFirstName}
                  lastName={item.memberLastName}
                />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={styles.memberName} numberOfLines={1}>
                    {item.memberFirstName} {item.memberLastName}
                  </Text>
                  {item.nbStage ? (
                    <Badge label={item.nbStage} variant="gold" size="sm" />
                  ) : null}
                </View>
              </View>
              <Pressable
                onPress={() => cycleStatus(item.memberId)}
                onLongPress={() => {
                  Vibration.vibrate(15);
                  setPickerFor(item);
                }}
                delayLongPress={280}
                style={[
                  styles.statusPill,
                  { backgroundColor: tone.barBg, borderColor: tone.border },
                ]}
                accessibilityRole="button"
                accessibilityLabel={`${item.memberFirstName} ${item.memberLastName} — ${STATUS_LABEL[status]}. Tap to change. Long-press to open picker.`}
                hitSlop={{ top: 6, bottom: 6, left: 0, right: 0 }}
              >
                <Text style={[styles.statusPillLabel, { color: tone.barText }]}>
                  {STATUS_LABEL[status]}
                </Text>
              </Pressable>
            </View>
          );
        }}
        ListFooterComponent={
          memberRows.length > 0 ? (
            <View style={{ marginTop: spacing.lg, gap: spacing.sm }}>
              <Button
                label={record.isPending ? 'Saving…' : 'Save attendance'}
                variant="primary"
                size="lg"
                fullWidth
                loading={record.isPending}
                onPress={handleSave}
              />
              <Text style={styles.footnote}>
                Everyone defaults to Present. Tap the pill to cycle Absent → Late → Excused
                → Present. Hold to pick directly.
              </Text>
            </View>
          ) : null
        }
      />

      <Modal
        visible={!!pickerFor}
        animationType="slide"
        transparent
        onRequestClose={() => setPickerFor(null)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setPickerFor(null)}>
          <Pressable style={styles.pickerSheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.pickerHandle} />
            {pickerFor ? (
              <>
                <Text style={styles.pickerTitle}>
                  {pickerFor.memberFirstName} {pickerFor.memberLastName}
                </Text>
                <Text style={styles.pickerSub}>Pick an attendance status</Text>
                <View style={{ gap: spacing.xs, marginTop: spacing.md }}>
                  {STATUS_ORDER.map((s) => {
                    const active =
                      (records[pickerFor.memberId] ?? 'Present') === s;
                    const tone = STATUS_TONE[s];
                    return (
                      <Pressable
                        key={s}
                        onPress={() => {
                          setStatus(pickerFor.memberId, s);
                          setPickerFor(null);
                        }}
                        style={[
                          styles.pickerOption,
                          active && {
                            backgroundColor: tone.barBg,
                            borderColor: tone.border,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.pickerOptionLabel,
                            active && { color: tone.barText, fontWeight: '700' },
                          ]}
                        >
                          {STATUS_LABEL[s]}
                        </Text>
                        {active ? (
                          <Check color={tone.barText} size={16} strokeWidth={2} />
                        ) : null}
                      </Pressable>
                    );
                  })}
                </View>
                <Pressable
                  style={styles.pickerCancel}
                  onPress={() => setPickerFor(null)}
                >
                  <Text style={styles.pickerCancelLabel}>Cancel</Text>
                </Pressable>
              </>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.pageLight },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  headerTitle: { ...typography.cardTitle, color: colors.ink },
  container: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  meetingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(93,63,211,0.08)',
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  meetingBannerLabel: {
    ...typography.meta,
    color: colors.primary,
    fontWeight: '600',
    flex: 1,
  },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(248,181,55,0.14)',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: 'rgba(248,181,55,0.4)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  offlineTitle: {
    ...typography.body,
    color: colors.goldDark,
    fontWeight: '700',
    fontSize: 13,
  },
  offlineMeta: {
    ...typography.meta,
    color: colors.goldDark,
    marginTop: 2,
    lineHeight: 14,
  },
  retryBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.pill,
    backgroundColor: colors.goldDark,
  },
  retryBtnLabel: {
    ...typography.meta,
    color: '#ffffff',
    fontWeight: '700',
  },
  summaryRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  summaryTile: {
    flex: 1,
    borderRadius: radii.md,
    borderWidth: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  summaryCount: { fontSize: 20, fontWeight: '800' },
  summaryLabel: {
    ...typography.meta,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  batchRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  batchBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: colors.cardLight,
    borderWidth: 1,
    borderColor: 'rgba(26,28,28,0.1)',
  },
  batchBtnLabel: {
    ...typography.meta,
    fontWeight: '700',
    fontSize: 12,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    backgroundColor: colors.cardLight,
    borderColor: 'rgba(26,28,28,0.06)',
  },
  memberRowFirst: {
    borderTopLeftRadius: radii.md,
    borderTopRightRadius: radii.md,
  },
  memberRowNext: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  memberRowLast: {
    borderBottomLeftRadius: radii.md,
    borderBottomRightRadius: radii.md,
  },
  memberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  memberName: { ...typography.body, color: colors.ink, fontWeight: '500' },
  statusPill: {
    minWidth: 92,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    borderWidth: 1,
    alignItems: 'center',
  },
  statusPillLabel: {
    ...typography.body,
    fontSize: 13,
    fontWeight: '700',
  },
  emptyLine: {
    ...typography.body,
    color: 'rgba(26,28,28,0.6)',
    textAlign: 'center',
  },
  footnote: {
    ...typography.meta,
    color: 'rgba(26,28,28,0.5)',
    paddingHorizontal: spacing.xs,
    lineHeight: 15,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(10,10,15,0.5)',
    justifyContent: 'flex-end',
  },
  pickerSheet: {
    backgroundColor: colors.cardLight,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  pickerHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(26,28,28,0.15)',
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  pickerTitle: {
    ...typography.cardTitle,
    color: colors.ink,
    fontSize: 17,
  },
  pickerSub: {
    ...typography.meta,
    color: 'rgba(26,28,28,0.6)',
    marginTop: 2,
  },
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: colors.subtleLight,
  },
  pickerOptionLabel: {
    ...typography.body,
    color: colors.ink,
    fontWeight: '500',
  },
  pickerCancel: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
  },
  pickerCancelLabel: {
    ...typography.button,
    color: colors.primary,
  },
});
