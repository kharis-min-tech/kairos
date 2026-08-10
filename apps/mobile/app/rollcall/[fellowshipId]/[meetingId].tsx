import { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, Calendar, Check } from 'lucide-react-native';
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
import type { AttendanceStatus, RecordAttendanceRequest } from '@kairos/types';
import { api } from '@/lib/api-client';

const STATUSES: AttendanceStatus[] = ['Present', 'Late', 'Excused', 'Absent'];

const STATUS_LABEL: Record<AttendanceStatus, string> = {
  Present: 'Present',
  Late: 'Late',
  Excused: 'Excused',
  Absent: 'Absent',
};

const STATUS_TONE: Record<
  AttendanceStatus,
  { bg: string; text: string; border: string }
> = {
  Present: {
    bg: 'rgba(16,185,129,0.14)',
    text: colors.successText,
    border: 'rgba(16,185,129,0.4)',
  },
  Late: {
    bg: 'rgba(248,181,55,0.18)',
    text: colors.goldDark,
    border: 'rgba(248,181,55,0.55)',
  },
  Excused: {
    bg: 'rgba(59,130,246,0.14)',
    text: colors.info,
    border: 'rgba(59,130,246,0.4)',
  },
  Absent: {
    bg: 'rgba(225,29,72,0.12)',
    text: colors.danger,
    border: 'rgba(225,29,72,0.4)',
  },
};

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

  // Seed local state once from server: existing attendance rows win, everyone
  // else defaults to Present so the leader can just tap exceptions.
  useEffect(() => {
    if (seededFromServer) return;
    if (members.isLoading || existing.isLoading) return;
    const memberRows = members.data ?? [];
    if (memberRows.length === 0) return;
    const existingByMember = new Map(
      (existing.data ?? []).map((r) => [r.memberId, r.attendanceStatus]),
    );
    const next: Record<string, AttendanceStatus> = {};
    for (const m of memberRows) {
      next[m.memberId] = existingByMember.get(m.memberId) ?? 'Present';
    }
    setRecords(next);
    setSeededFromServer(true);
  }, [members.isLoading, existing.isLoading, members.data, existing.data, seededFromServer]);

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

  function handleSave() {
    const payload: RecordAttendanceRequest = {
      records: Object.entries(records).map(([memberId, status]) => ({
        memberId,
        attendanceStatus: status,
      })),
    };
    record.mutate(payload, {
      onSuccess: () => {
        Alert.alert('Saved', 'Attendance recorded.', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      },
      onError: (err) => {
        Alert.alert(
          'Save failed',
          err instanceof Error ? err.message : 'Please try again in a moment.',
        );
      },
    });
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

      <ScrollView contentContainerStyle={styles.container}>
        {meeting ? (
          <View style={styles.meetingBanner}>
            <Calendar color={colors.primary} size={16} strokeWidth={1.5} />
            <Text style={styles.meetingBannerLabel}>
              {meeting.meetingTitle ?? 'Meeting'} · {formatMeetingDate(meeting.meetingDate)}
            </Text>
          </View>
        ) : null}

        <View style={styles.summaryRow}>
          {STATUSES.map((s) => {
            const tone = STATUS_TONE[s];
            return (
              <View
                key={s}
                style={[styles.summaryTile, { backgroundColor: tone.bg, borderColor: tone.border }]}
              >
                <Text style={[styles.summaryCount, { color: tone.text }]}>{totals[s]}</Text>
                <Text style={[styles.summaryLabel, { color: tone.text }]}>{STATUS_LABEL[s]}</Text>
              </View>
            );
          })}
        </View>

        {isBusy ? (
          <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.xl }} />
        ) : null}

        {!isBusy && memberRows.length === 0 ? (
          <Card padding="md">
            <Text style={styles.emptyLine}>No members in this fellowship yet.</Text>
          </Card>
        ) : null}

        {memberRows.length > 0 ? (
          <Card padding="md" style={{ gap: spacing.md }}>
            <Text style={styles.rosterEyebrow}>ROSTER · {memberRows.length}</Text>
            {memberRows.map((m, idx) => {
              const status = records[m.memberId] ?? 'Present';
              return (
                <View
                  key={m.memberId}
                  style={[styles.memberRow, idx > 0 ? styles.rowDivider : null]}
                >
                  <View style={styles.memberInfo}>
                    <Avatar
                      size="sm"
                      photoUrl={m.memberPhotoUrl ?? undefined}
                      firstName={m.memberFirstName}
                      lastName={m.memberLastName}
                    />
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={styles.memberName} numberOfLines={1}>
                        {m.memberFirstName} {m.memberLastName}
                      </Text>
                      {m.nbStage ? (
                        <Badge label={m.nbStage} variant="gold" size="sm" />
                      ) : null}
                    </View>
                  </View>
                  <View style={styles.statusRow}>
                    {STATUSES.map((s) => {
                      const selected = status === s;
                      const tone = STATUS_TONE[s];
                      return (
                        <Pressable
                          key={s}
                          onPress={() =>
                            setRecords((p) => ({ ...p, [m.memberId]: s }))
                          }
                          style={[
                            styles.statusChip,
                            selected && {
                              backgroundColor: tone.bg,
                              borderColor: tone.border,
                            },
                          ]}
                        >
                          {selected ? (
                            <Check color={tone.text} size={12} strokeWidth={2} />
                          ) : null}
                          <Text
                            style={[
                              styles.statusChipLabel,
                              selected && { color: tone.text, fontWeight: '700' },
                            ]}
                          >
                            {s === 'Present' ? 'P' : s === 'Absent' ? 'A' : s === 'Excused' ? 'E' : 'L'}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              );
            })}
          </Card>
        ) : null}

        {memberRows.length > 0 ? (
          <Button
            label={record.isPending ? 'Saving…' : 'Save attendance'}
            variant="primary"
            size="lg"
            fullWidth
            loading={record.isPending}
            onPress={handleSave}
          />
        ) : null}

        <Text style={styles.footnote}>
          Everyone defaults to Present — tap a chip to change. P/L/E/A = Present, Late,
          Excused, Absent.
        </Text>
      </ScrollView>
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
    gap: spacing.lg,
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
  summaryCount: {
    fontSize: 20,
    fontWeight: '800',
  },
  summaryLabel: {
    ...typography.meta,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  rosterEyebrow: {
    ...typography.eyebrow,
    color: 'rgba(26,28,28,0.55)',
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  rowDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(26,28,28,0.08)',
    paddingTop: spacing.md,
    marginTop: spacing.xs,
  },
  memberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  memberName: { ...typography.body, color: colors.ink, fontWeight: '500' },
  statusRow: {
    flexDirection: 'row',
    gap: 4,
  },
  statusChip: {
    minWidth: 32,
    height: 32,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: 'rgba(26,28,28,0.12)',
    backgroundColor: colors.cardLight,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
    flexDirection: 'row',
    gap: 2,
  },
  statusChipLabel: {
    ...typography.body,
    color: 'rgba(26,28,28,0.55)',
    fontSize: 12,
    fontWeight: '600',
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
});
