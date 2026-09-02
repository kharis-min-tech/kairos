import { useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, Check, Award, MessageSquarePlus, Handshake } from 'lucide-react-native';
import {
  Avatar,
  Badge,
  Button,
  Card,
  radii,
  spacing,
  typography,
  useThemedStyles,
  type ThemeColors,
  useColors,
} from '@kairos/ui-native';
import { formatShortDate } from '@kairos/core';
import type { NewBelieverStageValue, UpdateEnrollmentRequest } from '@kairos/types';
import { api } from '@/lib/api-client';
import { useCapabilities, useRequireCapability } from '@/lib/capabilities';
import { useAuthStore } from '@/store/auth';
import { alert } from '@/lib/alert';
import { MemberPickerSheet } from '@/components/member-picker-sheet';

interface StageDef {
  value: NewBelieverStageValue;
  label: string;
  topic?: string;
}

const STAGES: StageDef[] = [
  { value: 'session-1', label: 'Session 1', topic: 'Foundations of Faith' },
  { value: 'session-2', label: 'Session 2', topic: 'Who is a Christian' },
  { value: 'session-3', label: 'Session 3', topic: 'Working out your Salvation' },
  { value: 'session-4', label: 'Session 4', topic: 'The Importance of Fellowship' },
  { value: 'completed', label: 'Completed' },
  { value: 'integrated', label: 'Joined a Department' },
];

const SESSION_STAGES = new Set<NewBelieverStageValue>([
  'session-1',
  'session-2',
  'session-3',
  'session-4',
]);

function getNextStage(stage: string): StageDef | undefined {
  const idx = STAGES.findIndex((s) => s.value === stage);
  if (idx < 0 || idx >= STAGES.length - 1) return undefined;
  return STAGES[idx + 1];
}

export default function EnrollmentDetail() {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const qc = useQueryClient();

  const enrollment = useQuery({
    queryKey: ['new-believers', 'enrollment', id],
    queryFn: async () => (await api.newBelievers.enrollments.get(id!)).data!,
    enabled: !!id,
  });

  // Only the NB team or the enrolled member themselves see this page. Plain
  // members who somehow deep-link into another person's enrollment get
  // bounced back to their own journey.
  const caps = useCapabilities();
  const selfId = useAuthStore((s) => s.user?.id ?? null);
  const homeBranchId = useAuthStore((s) => s.user?.homeBranchId ?? null);
  const isSelf = !!enrollment.data && !!selfId && enrollment.data.memberId === selfId;
  const isTeam =
    caps.systemRole === 'admin' ||
    caps.has('newbelievers:mentor') ||
    caps.has('newbelievers:teach') ||
    (!!homeBranchId && caps.has('branch:write', { kind: 'branch', id: homeBranchId }));
  // Pass while the enrollment is still loading — otherwise we'd bounce before
  // knowing whose row this is.
  const canAccess = !enrollment.data ? true : isTeam || isSelf;
  useRequireCapability(canAccess, '/new-believers?scope=mine');

  const update = useMutation({
    mutationFn: async (data: UpdateEnrollmentRequest) =>
      (await api.newBelievers.enrollments.update(id!, data)).data!,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['new-believers'] });
    },
  });

  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [advanceAfter, setAdvanceAfter] = useState(false);

  const [stageSheetOpen, setStageSheetOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState<'teacher' | 'mentor' | null>(null);

  const [mentorNoteOpen, setMentorNoteOpen] = useState(false);
  const [mentorNote, setMentorNote] = useState('');

  const mentorFollowups = useQuery({
    queryKey: ['new-believers', 'enrollment', id, 'mentor-followups'],
    queryFn: async () =>
      (await api.newBelievers.enrollments.listMentorFollowups(id!)).data ?? [],
    enabled: !!id,
  });

  const recordMentorFollowup = useMutation({
    mutationFn: async () =>
      (
        await api.newBelievers.enrollments.createMentorFollowup(id!, {
          note: mentorNote.trim(),
        })
      ).data!,
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: ['new-believers', 'enrollment', id, 'mentor-followups'],
      });
      qc.invalidateQueries({ queryKey: ['me', 'followups'] });
      setMentorNote('');
      setMentorNoteOpen(false);
    },
    onError: (e) =>
      alert.info(
        'Could not save',
        e instanceof Error ? e.message : 'Please try again.',
      ),
  });

  const data = enrollment.data;
  const stageDef = useMemo(
    () => (data ? STAGES.find((s) => s.value === data.stage) : undefined),
    [data],
  );
  const currentIdx = data ? STAGES.findIndex((s) => s.value === data.stage) : -1;
  const nextStage = data ? getNextStage(data.stage) : undefined;
  const isSessionStage = data
    ? SESSION_STAGES.has(data.stage as NewBelieverStageValue)
    : false;
  const sessionCompletedAt = (data?.sessionCompletedAt ?? {}) as Record<string, string>;
  const sessionFeedback = (data?.sessionFeedback ?? {}) as Record<string, string>;
  const currentSessionDone =
    isSessionStage &&
    !!sessionCompletedAt[data!.stage] &&
    !!sessionFeedback[data!.stage]?.trim();
  // Attendance-first gate mirror of the API rule. We can't mark a session
  // complete (or advance from it) until an attendance row exists at that stage.
  const hasAttendedCurrentStage =
    isSessionStage &&
    !!(data?.attendanceHistory ?? []).some(
      (a) => a.sessionStage === data!.stage && a.attended,
    );
  const canMarkComplete = isSessionStage && hasAttendedCurrentStage && !currentSessionDone;
  const missingAttendance = isSessionStage && !hasAttendedCurrentStage;

  function openMarkComplete(shouldAdvance: boolean) {
    if (!data) return;
    setFeedback(sessionFeedback[data.stage] ?? '');
    setAdvanceAfter(shouldAdvance);
    setFeedbackOpen(true);
  }

  async function confirmMarkComplete() {
    if (!data) return;
    const nextS = advanceAfter ? getNextStage(data.stage) : undefined;
    const payload: UpdateEnrollmentRequest = {
      sessionCompletedAt: { ...sessionCompletedAt, [data.stage]: new Date().toISOString() },
      sessionFeedback: { ...sessionFeedback, [data.stage]: feedback.trim() },
    };
    if (nextS) payload.stage = nextS.value;
    try {
      await update.mutateAsync(payload);
      setFeedbackOpen(false);
      alert.info(
        nextS ? `Advanced to ${nextS.label}` : 'Session marked complete',
        undefined,
      );
    } catch (e) {
      alert.info('Save failed', e instanceof Error ? e.message : 'Please try again.');
    }
  }

  async function advanceStage() {
    if (!data || !nextStage) return;
    if (missingAttendance) {
      alert.info(
        'Mark attendance first',
        `Record ${data.memberFirstName}’s attendance for ${stageDef?.label ?? data.stage} in the Sessions area before advancing.`,
      );
      return;
    }
    if (isSessionStage && !currentSessionDone) {
      openMarkComplete(true);
      return;
    }
    try {
      await update.mutateAsync({ stage: nextStage.value });
      alert.info(`Advanced to ${nextStage.label}`, undefined);
    } catch (e) {
      alert.info('Failed to advance', e instanceof Error ? e.message : 'Please try again.');
    }
  }

  async function assignRole(kind: 'teacher' | 'mentor', memberId: string | null) {
    if (!data) return;
    setPickerOpen(null);
    const payload: UpdateEnrollmentRequest =
      kind === 'teacher' ? { teacherId: memberId } : { mentorId: memberId };
    try {
      await update.mutateAsync(payload);
      alert.info(
        `${kind === 'teacher' ? 'Teacher' : 'Mentor'} ${memberId ? 'updated' : 'cleared'}`,
        undefined,
      );
    } catch (e) {
      alert.info(
        `Failed to update ${kind}`,
        e instanceof Error ? e.message : 'Please try again.',
      );
    }
  }

  async function changeStage(v: NewBelieverStageValue) {
    setStageSheetOpen(false);
    if (!data || data.stage === v) return;
    try {
      await update.mutateAsync({ stage: v });
      alert.info('Stage updated', undefined);
    } catch (e) {
      alert.info('Failed to update stage', e instanceof Error ? e.message : 'Please try again.');
    }
  }

  async function deactivate() {
    const ok = await alert.confirm({
      title: 'Deactivate enrollment?',
      message:
        'This member will be removed from the active pipeline. You can re-enrol them later.',
      confirmLabel: 'Deactivate',
      destructive: true,
    });
    if (!ok) return;
    try {
      await update.mutateAsync({ isActive: false });
      router.back();
    } catch (e) {
      alert.info('Failed to deactivate', e instanceof Error ? e.message : 'Please try again.');
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerBar}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ChevronLeft color={c.ink} size={24} strokeWidth={1.5} />
        </Pressable>
        <Text style={styles.headerTitle}>Enrollment</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={enrollment.isFetching}
            onRefresh={() => enrollment.refetch()}
            tintColor={c.primary}
          />
        }
      >
        {enrollment.isLoading ? (
          <ActivityIndicator color={c.primary} style={{ marginTop: spacing.xxl }} />
        ) : !data ? (
          <Text style={styles.emptyText}>Enrollment not found.</Text>
        ) : (
          <>
            <Card padding="md" style={{ gap: spacing.sm }}>
              <View style={styles.identityRow}>
                <Avatar
                  size="md"
                  firstName={data.memberFirstName}
                  lastName={data.memberLastName}
                />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={styles.title}>
                    {data.memberFirstName} {data.memberLastName}
                  </Text>
                  <Text style={styles.meta}>Enrolled {formatShortDate(data.enrolledAt)}</Text>
                </View>
                <Badge label={stageDef?.label ?? data.stage} variant="primary" size="sm" />
              </View>

              <View style={styles.progressRow}>
                {STAGES.map((s, i) => (
                  <View
                    key={s.value}
                    style={[
                      styles.progressCell,
                      i <= currentIdx ? styles.progressCellDone : null,
                    ]}
                  />
                ))}
              </View>

              {isSessionStage ? (
                <View
                  style={[
                    styles.sessionChip,
                    currentSessionDone
                      ? styles.sessionChipDone
                      : styles.sessionChipInProgress,
                  ]}
                >
                  <Text
                    style={[
                      styles.sessionChipText,
                      currentSessionDone
                        ? styles.sessionChipDoneText
                        : styles.sessionChipInProgressText,
                    ]}
                  >
                    {currentSessionDone ? 'Session complete' : 'Session in progress'}
                  </Text>
                </View>
              ) : null}
            </Card>

            {missingAttendance ? (
              <Pressable
                onPress={() => router.push('/new-believers/sessions' as never)}
                style={styles.attendanceHintCard}
              >
                <Text style={styles.attendanceHintTitle}>
                  Attendance needed first
                </Text>
                <Text style={styles.attendanceHintBody}>
                  Before marking {stageDef?.label ?? data.stage} complete, take
                  attendance in the session. Tap here to open Sessions.
                </Text>
              </Pressable>
            ) : null}

            {isTeam ? (
              <View style={styles.actionRow}>
                {isSessionStage && !currentSessionDone ? (
                  <Button
                    label="Mark session complete"
                    variant="secondary"
                    onPress={() => openMarkComplete(false)}
                    disabled={update.isPending || !canMarkComplete}
                  />
                ) : null}
                {nextStage ? (
                  <Button
                    label={`Advance to ${nextStage.label}`}
                    onPress={advanceStage}
                    disabled={update.isPending || missingAttendance}
                  />
                ) : null}
              </View>
            ) : null}

            <Card padding="md" style={{ gap: spacing.sm }}>
              <Text style={styles.sectionTitle}>Details</Text>
              <DetailRow
                label="Stage"
                value={stageDef?.label ?? data.stage}
                onPress={isTeam ? () => setStageSheetOpen(true) : undefined}
              />
              <DetailRow
                label="Teacher"
                value={
                  data.teacherFirstName
                    ? `${data.teacherFirstName} ${data.teacherLastName ?? ''}`.trim()
                    : 'Not assigned'
                }
                onPress={isTeam ? () => setPickerOpen('teacher') : undefined}
              />
              <DetailRow
                label="Mentor"
                value={
                  data.mentorFirstName
                    ? `${data.mentorFirstName} ${data.mentorLastName ?? ''}`.trim()
                    : 'Not assigned'
                }
                onPress={isTeam ? () => setPickerOpen('mentor') : undefined}
              />
              <DetailRow
                label="Completed"
                value={data.completedAt ? formatShortDate(data.completedAt) : '—'}
              />
              {data.notes ? (
                <View style={{ marginTop: spacing.xs }}>
                  <Text style={styles.detailLabel}>Notes</Text>
                  <Text style={styles.notesBody}>{data.notes}</Text>
                </View>
              ) : null}
            </Card>

            <Card padding="md" style={{ gap: spacing.sm }}>
              <Text style={styles.sectionTitle}>Journey</Text>
              {STAGES.map((s, idx) => {
                const isDone = idx < currentIdx;
                const isCurrent = idx === currentIdx;
                const sDone =
                  SESSION_STAGES.has(s.value) &&
                  !!sessionCompletedAt[s.value] &&
                  !!sessionFeedback[s.value]?.trim();
                return (
                  <View key={s.value} style={styles.journeyRow}>
                    <View
                      style={[
                        styles.journeyDot,
                        isDone && styles.journeyDotDone,
                        isCurrent && s.value === 'integrated' && styles.journeyDotIntegrated,
                        isCurrent && s.value !== 'integrated' && styles.journeyDotCurrent,
                      ]}
                    >
                      {isDone ? (
                        <Check color="#fff" size={12} strokeWidth={3} />
                      ) : isCurrent && s.value === 'integrated' ? (
                        <Award color="#fff" size={12} />
                      ) : (
                        <Text style={styles.journeyDotIndex}>{idx + 1}</Text>
                      )}
                    </View>
                    <Text
                      style={[
                        styles.journeyLabel,
                        isCurrent && styles.journeyLabelCurrent,
                        isDone && styles.journeyLabelDone,
                      ]}
                    >
                      {s.label}
                    </Text>
                    {isCurrent && SESSION_STAGES.has(s.value) ? (
                      <View
                        style={[
                          styles.journeyBadge,
                          sDone ? styles.journeyBadgeDone : styles.journeyBadgeActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.journeyBadgeText,
                            sDone
                              ? styles.journeyBadgeDoneText
                              : styles.journeyBadgeActiveText,
                          ]}
                        >
                          {sDone ? 'Done' : 'Active'}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                );
              })}
            </Card>

            {isTeam ? (
              <Card padding="md" style={{ gap: spacing.sm }}>
                <View style={styles.mentorHeader}>
                  <Handshake color={c.primary} size={14} strokeWidth={1.5} />
                  <Text style={styles.sectionTitle}>Mentor follow-ups</Text>
                  <Badge
                    label={String(mentorFollowups.data?.length ?? 0)}
                    variant="neutral"
                    size="sm"
                  />
                </View>

                <Button
                  label="Record follow-up"
                  variant="primary"
                  iconLeft={<MessageSquarePlus color="#ffffff" size={14} strokeWidth={2} />}
                  onPress={() => setMentorNoteOpen(true)}
                />

                {mentorFollowups.isLoading ? (
                  <ActivityIndicator color={c.primary} />
                ) : (mentorFollowups.data ?? []).length === 0 ? (
                  <Text style={styles.mentorEmpty}>
                    No follow-ups recorded yet. Record the first one above.
                  </Text>
                ) : (
                  (mentorFollowups.data ?? []).map((f) => (
                    <View key={f.id} style={styles.mentorRow}>
                      <Text style={styles.mentorRowMeta}>
                        {new Date(f.contactedAt).toLocaleDateString()}
                        {f.mentorFirstName
                          ? ` · ${f.mentorFirstName} ${f.mentorLastName ?? ''}`.trim()
                          : ''}
                      </Text>
                      <Text style={styles.mentorRowNote}>{f.note}</Text>
                    </View>
                  ))
                )}
              </Card>
            ) : null}

            {isTeam ? (
              <Pressable style={styles.deactivateRow} onPress={deactivate}>
                <Text style={styles.deactivateText}>Deactivate enrollment</Text>
              </Pressable>
            ) : null}
          </>
        )}
      </ScrollView>

      {/* Mentor follow-up sheet */}
      <Modal
        visible={mentorNoteOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setMentorNoteOpen(false)}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <Pressable style={styles.modalBackdrop} onPress={() => setMentorNoteOpen(false)}>
            <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
              <View style={styles.sheetHandle} />
              <Text style={styles.sheetTitle}>Record mentor follow-up</Text>
              <Text style={styles.sheetHint}>
                What did you cover today? Anything the next mentor or admin should
                know.
              </Text>
              <TextInput
                multiline
                value={mentorNote}
                onChangeText={setMentorNote}
                placeholder="Encouragement, prayer points, next steps…"
                placeholderTextColor={c.inkFaded}
                style={styles.feedbackInput}
              />
              <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm }}>
                <View style={{ flex: 1 }}>
                  <Button
                    label="Cancel"
                    variant="ghost"
                    onPress={() => setMentorNoteOpen(false)}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Button
                    label={recordMentorFollowup.isPending ? 'Saving…' : 'Save follow-up'}
                    onPress={() => recordMentorFollowup.mutate()}
                    disabled={!mentorNote.trim() || recordMentorFollowup.isPending}
                  />
                </View>
              </View>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      {/* Stage picker sheet */}
      <Modal
        visible={stageSheetOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setStageSheetOpen(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setStageSheetOpen(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Change stage</Text>
            {STAGES.map((s) => {
              const active = data?.stage === s.value;
              return (
                <Pressable
                  key={s.value}
                  onPress={() => changeStage(s.value)}
                  style={[styles.sheetOption, active && styles.sheetOptionActive]}
                >
                  <Text
                    style={[
                      styles.sheetOptionLabel,
                      active && styles.sheetOptionLabelActive,
                    ]}
                  >
                    {s.label}
                  </Text>
                  {active ? (
                    <Check color={c.primary} size={16} strokeWidth={2} />
                  ) : null}
                </Pressable>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Mark complete / feedback sheet */}
      <Modal
        visible={feedbackOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setFeedbackOpen(false)}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <Pressable style={styles.modalBackdrop} onPress={() => setFeedbackOpen(false)}>
            <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
              <View style={styles.sheetHandle} />
              <Text style={styles.sheetTitle}>
                {advanceAfter ? 'Session feedback required' : 'Mark session complete'}
              </Text>
              <Text style={styles.sheetHint}>
                {advanceAfter
                  ? `Record feedback before moving to ${nextStage?.label ?? 'the next stage'}.`
                  : 'Record feedback for this session before marking it complete.'}
              </Text>
              <TextInput
                multiline
                value={feedback}
                onChangeText={setFeedback}
                placeholder="How did the session go?"
                placeholderTextColor={c.inkFaded}
                style={styles.feedbackInput}
              />
              <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm }}>
                <View style={{ flex: 1 }}>
                  <Button
                    label="Cancel"
                    variant="ghost"
                    onPress={() => setFeedbackOpen(false)}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Button
                    label={advanceAfter ? 'Confirm & advance' : 'Confirm & complete'}
                    onPress={confirmMarkComplete}
                    disabled={!feedback.trim() || update.isPending}
                  />
                </View>
              </View>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      {/* Teacher / Mentor picker — shared branch-scoped members sheet. */}
      {data && pickerOpen ? (
        <MemberPickerSheet
          open={!!pickerOpen}
          onClose={() => setPickerOpen(null)}
          branchId={data.branchId}
          title={pickerOpen === 'teacher' ? 'Pick a teacher' : 'Pick a mentor'}
          subtitle={
            pickerOpen === 'teacher'
              ? 'Search members in this branch. Teachers can\'t be currently enrolled as students.'
              : 'Search members in this branch. Mentors follow up with the student one-to-one.'
          }
          selectedMemberId={
            pickerOpen === 'teacher'
              ? data.teacherId ?? undefined
              : data.mentorId ?? undefined
          }
          onPick={(memberId) => assignRole(pickerOpen, memberId)}
        />
      ) : null}
    </SafeAreaView>
  );
}

function DetailRow({
  label,
  value,
  onPress,
}: {
  label: string;
  value: string;
  onPress?: () => void;
}) {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={styles.detailRow}
    >
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={[styles.detailValue, onPress && { color: c.primary }]}>
        {value}
      </Text>
    </Pressable>
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
  container: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md },
  emptyText: {
    ...typography.body,
    color: c.inkMuted,
    textAlign: 'center',
    marginTop: spacing.xxl,
  },

  identityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  title: { ...typography.cardTitle, color: c.ink },
  meta: { ...typography.meta, color: c.inkMuted },

  progressRow: {
    flexDirection: 'row',
    gap: 4,
    marginTop: spacing.xs,
  },
  progressCell: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: c.divider,
  },
  progressCellDone: { backgroundColor: c.primary },

  sessionChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.pill,
    marginTop: spacing.xs,
  },
  sessionChipDone: { backgroundColor: 'rgba(16,185,129,0.15)' },
  sessionChipInProgress: { backgroundColor: 'rgba(248,181,55,0.2)' },
  sessionChipText: { ...typography.meta, fontWeight: '600' },
  sessionChipDoneText: { color: '#047857' },
  sessionChipInProgressText: { color: c.goldDark },

  actionRow: { gap: spacing.sm },

  attendanceHintCard: {
    backgroundColor: 'rgba(248,181,55,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(248,181,55,0.35)',
    borderRadius: radii.md,
    padding: spacing.md,
    gap: 4,
  },
  attendanceHintTitle: {
    ...typography.body,
    color: c.goldDark,
    fontWeight: '700',
  },
  attendanceHintBody: {
    ...typography.meta,
    color: c.inkMuted,
    lineHeight: 16,
  },

  sectionTitle: { ...typography.eyebrow, color: c.inkMuted },

  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  detailLabel: { ...typography.meta, color: c.inkMuted },
  detailValue: { ...typography.body, color: c.ink, fontWeight: '600' },
  notesBody: { ...typography.body, color: c.ink, marginTop: 4 },

  journeyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 4,
  },
  journeyDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.divider,
  },
  journeyDotDone: { backgroundColor: c.success },
  journeyDotCurrent: { backgroundColor: c.primary },
  journeyDotIntegrated: { backgroundColor: c.gold },
  journeyDotIndex: {
    fontSize: 11,
    fontWeight: '700',
    color: c.inkMuted,
  },
  journeyLabel: {
    ...typography.body,
    color: c.inkMuted,
    flex: 1,
  },
  journeyLabelCurrent: { color: c.primary, fontWeight: '600' },
  journeyLabelDone: { color: c.inkMuted },
  journeyBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.pill,
  },
  journeyBadgeActive: { backgroundColor: 'rgba(248,181,55,0.2)' },
  journeyBadgeDone: { backgroundColor: 'rgba(16,185,129,0.15)' },
  journeyBadgeText: { ...typography.meta, fontWeight: '600' },
  journeyBadgeActiveText: { color: c.goldDark },
  journeyBadgeDoneText: { color: '#047857' },

  mentorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  mentorAddBtn: {
    width: 28,
    height: 28,
    borderRadius: radii.sm,
    backgroundColor: 'rgba(93,63,211,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mentorEmpty: {
    ...typography.meta,
    color: c.inkMuted,
    paddingVertical: spacing.xs,
  },
  mentorRow: {
    gap: 2,
    paddingVertical: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.divider,
  },
  mentorRowMeta: { ...typography.meta, color: c.inkMuted },
  mentorRowNote: { ...typography.body, color: c.ink, lineHeight: 18 },

  deactivateRow: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    marginTop: spacing.md,
  },
  deactivateText: {
    ...typography.body,
    color: c.danger,
    fontWeight: '600',
  },

  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  sheet: {
    backgroundColor: c.card,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: c.inkGhost,
    marginBottom: spacing.sm,
  },
  sheetTitle: { ...typography.cardTitle, color: c.ink, marginBottom: spacing.xs },
  sheetHint: {
    ...typography.meta,
    color: c.inkMuted,
    marginBottom: spacing.sm,
  },
  sheetOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.md,
  },
  sheetOptionActive: { backgroundColor: 'rgba(93,63,211,0.08)' },
  sheetOptionLabel: { ...typography.body, color: c.ink },
  sheetOptionLabelActive: { color: c.primary, fontWeight: '600' },
  feedbackInput: {
    minHeight: 96,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: radii.md,
    padding: spacing.md,
    ...typography.body,
    color: c.ink,
    textAlignVertical: 'top',
  },
});
}

