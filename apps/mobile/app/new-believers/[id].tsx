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
import { ChevronLeft, Check, Award } from 'lucide-react-native';
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
import { formatShortDate } from '@kairos/core';
import type { NewBelieverStageValue, UpdateEnrollmentRequest } from '@kairos/types';
import { api } from '@/lib/api-client';
import { alert } from '@/lib/alert';

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
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const qc = useQueryClient();

  const enrollment = useQuery({
    queryKey: ['new-believers', 'enrollment', id],
    queryFn: async () => (await api.newBelievers.enrollments.get(id!)).data!,
    enabled: !!id,
  });

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
          <ChevronLeft color={colors.ink} size={24} strokeWidth={1.5} />
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
            tintColor={colors.primary}
          />
        }
      >
        {enrollment.isLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xxl }} />
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

            <View style={styles.actionRow}>
              {isSessionStage && !currentSessionDone ? (
                <Button
                  label="Mark session complete"
                  variant="secondary"
                  onPress={() => openMarkComplete(false)}
                  disabled={update.isPending}
                />
              ) : null}
              {nextStage ? (
                <Button
                  label={`Advance to ${nextStage.label}`}
                  onPress={advanceStage}
                  disabled={update.isPending}
                />
              ) : null}
            </View>

            <Card padding="md" style={{ gap: spacing.sm }}>
              <Text style={styles.sectionTitle}>Details</Text>
              <DetailRow
                label="Stage"
                value={stageDef?.label ?? data.stage}
                onPress={() => setStageSheetOpen(true)}
              />
              <DetailRow
                label="Teacher"
                value={
                  data.teacherFirstName
                    ? `${data.teacherFirstName} ${data.teacherLastName ?? ''}`.trim()
                    : '—'
                }
              />
              <DetailRow
                label="Mentor"
                value={
                  data.mentorFirstName
                    ? `${data.mentorFirstName} ${data.mentorLastName ?? ''}`.trim()
                    : '—'
                }
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

            <Pressable style={styles.deactivateRow} onPress={deactivate}>
              <Text style={styles.deactivateText}>Deactivate enrollment</Text>
            </Pressable>
          </>
        )}
      </ScrollView>

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
                    <Check color={colors.primary} size={16} strokeWidth={2} />
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
                placeholderTextColor="rgba(26,28,28,0.4)"
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
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={styles.detailRow}
    >
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={[styles.detailValue, onPress && { color: colors.primary }]}>
        {value}
      </Text>
    </Pressable>
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
  container: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md },
  emptyText: {
    ...typography.body,
    color: 'rgba(26,28,28,0.6)',
    textAlign: 'center',
    marginTop: spacing.xxl,
  },

  identityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  title: { ...typography.cardTitle, color: colors.ink },
  meta: { ...typography.meta, color: 'rgba(26,28,28,0.55)' },

  progressRow: {
    flexDirection: 'row',
    gap: 4,
    marginTop: spacing.xs,
  },
  progressCell: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(26,28,28,0.08)',
  },
  progressCellDone: { backgroundColor: colors.primary },

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
  sessionChipInProgressText: { color: colors.goldDark },

  actionRow: { gap: spacing.sm },

  sectionTitle: { ...typography.eyebrow, color: 'rgba(26,28,28,0.55)' },

  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  detailLabel: { ...typography.meta, color: 'rgba(26,28,28,0.55)' },
  detailValue: { ...typography.body, color: colors.ink, fontWeight: '600' },
  notesBody: { ...typography.body, color: colors.ink, marginTop: 4 },

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
    backgroundColor: 'rgba(26,28,28,0.08)',
  },
  journeyDotDone: { backgroundColor: colors.success },
  journeyDotCurrent: { backgroundColor: colors.primary },
  journeyDotIntegrated: { backgroundColor: colors.gold },
  journeyDotIndex: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(26,28,28,0.55)',
  },
  journeyLabel: {
    ...typography.body,
    color: 'rgba(26,28,28,0.55)',
    flex: 1,
  },
  journeyLabelCurrent: { color: colors.primary, fontWeight: '600' },
  journeyLabelDone: { color: 'rgba(26,28,28,0.75)' },
  journeyBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.pill,
  },
  journeyBadgeActive: { backgroundColor: 'rgba(248,181,55,0.2)' },
  journeyBadgeDone: { backgroundColor: 'rgba(16,185,129,0.15)' },
  journeyBadgeText: { ...typography.meta, fontWeight: '600' },
  journeyBadgeActiveText: { color: colors.goldDark },
  journeyBadgeDoneText: { color: '#047857' },

  deactivateRow: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    marginTop: spacing.md,
  },
  deactivateText: {
    ...typography.body,
    color: colors.danger,
    fontWeight: '600',
  },

  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  sheet: {
    backgroundColor: colors.cardLight,
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
    backgroundColor: 'rgba(26,28,28,0.15)',
    marginBottom: spacing.sm,
  },
  sheetTitle: { ...typography.cardTitle, color: colors.ink, marginBottom: spacing.xs },
  sheetHint: {
    ...typography.meta,
    color: 'rgba(26,28,28,0.6)',
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
  sheetOptionLabel: { ...typography.body, color: colors.ink },
  sheetOptionLabelActive: { color: colors.primary, fontWeight: '600' },
  feedbackInput: {
    minHeight: 96,
    borderWidth: 1,
    borderColor: 'rgba(26,28,28,0.12)',
    borderRadius: radii.md,
    padding: spacing.md,
    ...typography.body,
    color: colors.ink,
    textAlignVertical: 'top',
  },
});
