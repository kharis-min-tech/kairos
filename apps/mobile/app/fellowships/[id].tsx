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
import { alert } from '@/lib/alert';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Users,
  Pencil,
  Plus,
  UserPlus,
  Check,
  X,
  Handshake,
  BarChart3,
  PhoneCall,
} from 'lucide-react-native';
import {
  Avatar,
  Badge,
  Button,
  Card,
  DatePicker,
  gradients,
  radii,
  spacing,
  typography,
  useThemedStyles,
  type ThemeColors,
  useColors,
} from '@kairos/ui-native';
import type { FellowshipJoinRequestWithMember } from '@kairos/types';
import { api } from '@/lib/api-client';
import { MemberPickerSheet } from '@/components/member-picker-sheet';

function formatMeetingDate(iso: string | Date): string {
  const d = iso instanceof Date ? iso : new Date(iso);
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

export default function FellowshipDetail() {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  const router = useRouter();
  const qc = useQueryClient();
  const params = useLocalSearchParams<{ id: string }>();
  const id = params.id!;

  const fellowship = useQuery({
    queryKey: ['fellowships', id],
    enabled: !!id,
    queryFn: async () => (await api.fellowships.get(id)).data ?? null,
  });

  const members = useQuery({
    queryKey: ['fellowships', id, 'members'],
    enabled: !!id,
    queryFn: async () => (await api.fellowships.members.list(id)).data ?? [],
  });

  const meetings = useQuery({
    queryKey: ['fellowships', id, 'meetings'],
    enabled: !!id,
    queryFn: async () => (await api.fellowships.meetings.list(id)).data ?? [],
  });

  const joinRequests = useQuery({
    queryKey: ['fellowships', id, 'join-requests'],
    enabled: !!id,
    queryFn: async () =>
      (await api.fellowships.joinRequests.list(id)).data ?? [],
  });

  const addMember = useMutation({
    mutationFn: async (memberId: string) =>
      (await api.fellowships.members.add(id, { memberId })).data!,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fellowships', id, 'members'] });
    },
  });

  const removeMember = useMutation({
    mutationFn: async (memberId: string) => {
      await api.fellowships.members.remove(id, memberId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fellowships', id, 'members'] });
    },
  });

  const reviewRequest = useMutation({
    mutationFn: async ({
      requestId,
      status,
    }: {
      requestId: string;
      status: 'approved' | 'rejected';
    }) =>
      (await api.fellowships.joinRequests.review(id, requestId, { status })).data!,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fellowships', id, 'join-requests'] });
      qc.invalidateQueries({ queryKey: ['fellowships', id, 'members'] });
    },
  });

  const [pickerOpen, setPickerOpen] = useState(false);
  const [logMeetingOpen, setLogMeetingOpen] = useState(false);
  const [meetingDate, setMeetingDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [meetingTitle, setMeetingTitle] = useState('');
  const [meetingLocation, setMeetingLocation] = useState('');

  const createMeeting = useMutation({
    mutationFn: async () => {
      const res = await api.fellowships.meetings.create(id, {
        meetingDate,
        meetingTitle: meetingTitle.trim() || undefined,
        location: meetingLocation.trim() || undefined,
      });
      if (!res.success) throw new Error(res.message ?? 'Could not log meeting');
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fellowships', id, 'meetings'] });
      setLogMeetingOpen(false);
      setMeetingTitle('');
      setMeetingLocation('');
      setMeetingDate(new Date().toISOString().slice(0, 10));
      alert.info('Meeting logged', undefined);
    },
    onError: (e: Error) =>
      alert.info('Failed to log meeting', e.message ?? 'Please try again.'),
  });

  const refresh = () => {
    fellowship.refetch();
    members.refetch();
    meetings.refetch();
    joinRequests.refetch();
  };

  const f = fellowship.data;
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const upcoming = (meetings.data ?? [])
    .filter((m) => new Date(m.meetingDate) >= startOfToday)
    .sort((a, b) => new Date(a.meetingDate).getTime() - new Date(b.meetingDate).getTime());
  const nextMeeting = upcoming[0] ?? null;
  const recentPast = (meetings.data ?? [])
    .filter((m) => new Date(m.meetingDate) < startOfToday)
    .sort((a, b) => new Date(b.meetingDate).getTime() - new Date(a.meetingDate).getTime())
    .slice(0, 4);

  const pendingRequests = (joinRequests.data ?? []).filter(
    (r: FellowshipJoinRequestWithMember) => r.status === 'pending',
  );

  const memberIds = useMemo(
    () => new Set((members.data ?? []).map((m) => m.memberId)),
    [members.data],
  );

  async function confirmRemoveMember(memberId: string, name: string) {
    const ok = await alert.confirm({
      title: 'Remove from fellowship?',
      message: `Remove ${name} from this fellowship. They keep their member record; only this fellowship membership is ended.`,
      confirmLabel: 'Remove',
      destructive: true,
    });
    if (!ok) return;
    removeMember.mutate(memberId, {
      onError: (err) => {
        alert.info(
          'Remove failed',
          err instanceof Error ? err.message : 'Please try again in a moment.',
        );
      },
    });
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerBar}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ChevronLeft color={c.ink} size={24} strokeWidth={1.5} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {f?.fellowshipName ?? 'Fellowship'}
        </Text>
        {f ? (
          <Pressable
            onPress={() => router.push(`/fellowships/edit/${f.id}`)}
            hitSlop={8}
            accessibilityLabel="Edit fellowship"
          >
            <Pencil color={c.primary} size={20} strokeWidth={1.5} />
          </Pressable>
        ) : (
          <View style={{ width: 24 }} />
        )}
      </View>

      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={
              fellowship.isFetching ||
              members.isFetching ||
              meetings.isFetching ||
              joinRequests.isFetching
            }
            onRefresh={refresh}
            tintColor={c.primary}
          />
        }
      >
        {fellowship.isLoading ? (
          <ActivityIndicator color={c.primary} style={{ marginTop: spacing.xxl }} />
        ) : null}

        {fellowship.isError || (!fellowship.isLoading && !f) ? (
          <Card padding="md">
            <Text style={styles.errorLine}>
              {fellowship.error instanceof Error
                ? fellowship.error.message
                : "Couldn't load this fellowship."}
            </Text>
          </Card>
        ) : null}

        {f ? (
          <>
            <LinearGradient
              colors={gradients.brand}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.heroCard}
            >
              <Text style={styles.heroEyebrow}>{f.fellowshipType?.toUpperCase()}</Text>
              <Text style={styles.heroTitle}>{f.fellowshipName}</Text>
              {f.branchName ? <Text style={styles.heroBranch}>{f.branchName}</Text> : null}
              {f.description ? (
                <Text style={styles.heroDescription}>{f.description}</Text>
              ) : null}
              {(f.meetingDay || f.meetingTime) ? (
                <View style={styles.heroMetaRow}>
                  <Calendar color="rgba(255,255,255,0.85)" size={14} strokeWidth={1.5} />
                  <Text style={styles.heroMetaLabel}>
                    {[f.meetingDay, f.meetingTime].filter(Boolean).join(' · ')}
                  </Text>
                </View>
              ) : null}
              {f.leaderFirstName ? (
                <View style={styles.leaderRow}>
                  <Text style={styles.leaderEyebrow}>LEADER</Text>
                  <Text style={styles.leaderName}>
                    {f.leaderFirstName} {f.leaderLastName ?? ''}
                  </Text>
                </View>
              ) : null}
            </LinearGradient>

            {nextMeeting ? (
              <Card padding="md" style={styles.nextCard}>
                <Text style={styles.sectionEyebrow}>NEXT MEETING</Text>
                <Text style={styles.nextDate}>
                  {formatMeetingDate(nextMeeting.meetingDate)}
                </Text>
                {nextMeeting.meetingTitle ? (
                  <Text style={styles.nextTitle}>{nextMeeting.meetingTitle}</Text>
                ) : null}
                {nextMeeting.location ? (
                  <Text style={styles.nextMeta}>{nextMeeting.location}</Text>
                ) : null}
              </Card>
            ) : null}

            <Pressable
              onPress={() => router.push(`/fellowships/${id}/attendance` as never)}
              style={styles.linkCard}
            >
              <View style={styles.linkIconTile}>
                <BarChart3 color={c.primary} size={16} strokeWidth={1.5} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.linkTitle}>Attendance</Text>
                <Text style={styles.linkMeta}>
                  Services + meetings rates, per-member breakdown
                </Text>
              </View>
              <ChevronRight color={c.inkVeryFaded} size={16} strokeWidth={1.5} />
            </Pressable>

            <Pressable
              onPress={() => router.push(`/fellowships/${id}/followups` as never)}
              style={styles.linkCard}
            >
              <View style={styles.linkIconTile}>
                <PhoneCall color={c.primary} size={16} strokeWidth={1.5} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.linkTitle}>Follow-ups</Text>
                <Text style={styles.linkMeta}>
                  Overdue members, contact log, next-touch reminders
                </Text>
              </View>
              <ChevronRight color={c.inkVeryFaded} size={16} strokeWidth={1.5} />
            </Pressable>

            {pendingRequests.length > 0 ? (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionIconTile}>
                    <Handshake color={c.gold} size={14} strokeWidth={1.5} />
                  </View>
                  <Text style={styles.sectionTitle}>Join requests</Text>
                  <Badge
                    label={String(pendingRequests.length)}
                    variant="gold"
                    size="sm"
                  />
                </View>
                <Card padding="md" style={{ gap: spacing.sm }}>
                  {pendingRequests.map((r, idx) => (
                    <View
                      key={r.id}
                      style={[
                        styles.requestRow,
                        idx > 0 ? styles.rowDivider : null,
                      ]}
                    >
                      <Avatar
                        size="sm"
                        photoUrl={r.memberPhotoUrl ?? undefined}
                        firstName={r.memberFirstName}
                        lastName={r.memberLastName}
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.memberName} numberOfLines={1}>
                          {r.memberFirstName} {r.memberLastName}
                        </Text>
                        {r.notes ? (
                          <Text style={styles.requestNote} numberOfLines={2}>
                            &ldquo;{r.notes}&rdquo;
                          </Text>
                        ) : null}
                      </View>
                      <View style={styles.requestActions}>
                        <Pressable
                          onPress={() =>
                            reviewRequest.mutate({
                              requestId: r.id,
                              status: 'rejected',
                            })
                          }
                          style={styles.rejectBtn}
                          hitSlop={4}
                          disabled={reviewRequest.isPending}
                        >
                          <X color={c.danger} size={14} strokeWidth={2} />
                        </Pressable>
                        <Pressable
                          onPress={() =>
                            reviewRequest.mutate({
                              requestId: r.id,
                              status: 'approved',
                            })
                          }
                          style={styles.approveBtn}
                          hitSlop={4}
                          disabled={reviewRequest.isPending}
                        >
                          <Check color="#ffffff" size={14} strokeWidth={2} />
                        </Pressable>
                      </View>
                    </View>
                  ))}
                </Card>
              </View>
            ) : null}

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionIconTile}>
                  <Users color={c.primary} size={14} strokeWidth={1.5} />
                </View>
                <Text style={styles.sectionTitle}>Members</Text>
                <Badge
                  label={String(members.data?.length ?? 0)}
                  variant="neutral"
                  size="sm"
                />
                <Pressable
                  onPress={() => setPickerOpen(true)}
                  style={styles.addMemberBtn}
                  hitSlop={6}
                  accessibilityLabel="Add member"
                >
                  <UserPlus color={c.primary} size={16} strokeWidth={1.5} />
                </Pressable>
              </View>
              {members.isLoading ? (
                <ActivityIndicator color={c.primary} style={{ marginTop: spacing.sm }} />
              ) : (members.data ?? []).length === 0 ? (
                <Text style={styles.emptyLine}>No members recorded yet.</Text>
              ) : (
                <View style={styles.memberList}>
                  {(members.data ?? []).map((m) => (
                    <Pressable
                      key={m.id}
                      onPress={() => router.push(`/members/${m.memberId}`)}
                      onLongPress={() =>
                        confirmRemoveMember(
                          m.memberId,
                          `${m.memberFirstName} ${m.memberLastName}`,
                        )
                      }
                      delayLongPress={350}
                      style={styles.memberRow}
                    >
                      <Avatar
                        size="sm"
                        photoUrl={m.memberPhotoUrl ?? undefined}
                        firstName={m.memberFirstName}
                        lastName={m.memberLastName}
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.memberName} numberOfLines={1}>
                          {m.memberFirstName} {m.memberLastName}
                        </Text>
                      </View>
                      {m.nbStage ? (
                        <Badge label={m.nbStage} variant="gold" size="sm" />
                      ) : null}
                    </Pressable>
                  ))}
                  <Text style={styles.longPressHint}>
                    Long-press a row to remove them from the fellowship.
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionIconTile}>
                  <Calendar color={c.primary} size={14} strokeWidth={1.5} />
                </View>
                <Text style={styles.sectionTitle}>Meetings</Text>
                <Pressable
                  onPress={() => setLogMeetingOpen(true)}
                  style={styles.addMemberBtn}
                  hitSlop={6}
                  accessibilityLabel="Log a meeting"
                >
                  <Plus color={c.primary} size={16} strokeWidth={1.5} />
                </Pressable>
              </View>
              {recentPast.length === 0 ? (
                <Text style={styles.emptyLine}>
                  No meetings logged yet. Tap + to record one.
                </Text>
              ) : (
                <View style={styles.meetingList}>
                  {recentPast.map((m) => (
                    <View key={m.id} style={styles.meetingRow}>
                      <View style={styles.meetingDateTile}>
                        <Text style={styles.meetingDateLabel}>
                          {formatMeetingDate(m.meetingDate)}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.meetingTitle} numberOfLines={1}>
                          {m.meetingTitle ?? 'Meeting'}
                        </Text>
                        {m.location ? (
                          <Text style={styles.meetingMeta} numberOfLines={1}>
                            {m.location}
                          </Text>
                        ) : null}
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </>
        ) : null}
      </ScrollView>

      {f ? (
        <MemberPickerSheet
          open={pickerOpen}
          onClose={() => setPickerOpen(false)}
          branchId={f.branchId}
          excludeMemberIds={memberIds}
          onPick={(memberId) => {
            setPickerOpen(false);
            addMember.mutate(memberId, {
              onError: (err) => {
                alert.info(
                  'Add failed',
                  err instanceof Error ? err.message : 'Please try again in a moment.',
                );
              },
            });
          }}
        />
      ) : null}

      <Modal
        visible={logMeetingOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setLogMeetingOpen(false)}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <Pressable
            style={styles.meetingBackdrop}
            onPress={() => (createMeeting.isPending ? undefined : setLogMeetingOpen(false))}
          >
            <Pressable style={styles.meetingSheet} onPress={(e) => e.stopPropagation()}>
              <View style={styles.meetingSheetHandle} />
              <Text style={styles.meetingSheetTitle}>Log a meeting</Text>
              <Text style={styles.meetingSheetHint}>
                Record when the fellowship met. Attendance can be added later
                from the meeting card.
              </Text>

              <DatePicker
                label="Date"
                value={meetingDate}
                onChange={setMeetingDate}
                disabled={createMeeting.isPending}
                maximumDate={new Date()}
              />

              <Text style={styles.meetingLabel}>Title (optional)</Text>
              <TextInput
                value={meetingTitle}
                onChangeText={setMeetingTitle}
                placeholder="e.g. Bible study"
                placeholderTextColor={c.inkFaded}
                style={styles.meetingInput}
                editable={!createMeeting.isPending}
              />

              <Text style={styles.meetingLabel}>Location (optional)</Text>
              <TextInput
                value={meetingLocation}
                onChangeText={setMeetingLocation}
                placeholder="e.g. Main hall"
                placeholderTextColor={c.inkFaded}
                style={styles.meetingInput}
                editable={!createMeeting.isPending}
              />

              <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md }}>
                <View style={{ flex: 1 }}>
                  <Button
                    label="Cancel"
                    variant="ghost"
                    onPress={() => setLogMeetingOpen(false)}
                    disabled={createMeeting.isPending}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Button
                    label={createMeeting.isPending ? 'Saving…' : 'Log meeting'}
                    onPress={() => createMeeting.mutate()}
                    loading={createMeeting.isPending}
                    disabled={!meetingDate.trim()}
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
  headerTitle: { ...typography.cardTitle, color: c.ink, flex: 1, textAlign: 'center' },
  container: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  heroCard: {
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  heroEyebrow: {
    ...typography.eyebrow,
    color: c.gold,
    letterSpacing: 1.2,
  },
  heroTitle: { ...typography.screenTitle, color: '#ffffff' },
  heroBranch: { ...typography.meta, color: 'rgba(255,255,255,0.75)' },
  heroDescription: {
    ...typography.body,
    color: 'rgba(255,255,255,0.85)',
    marginTop: spacing.sm,
    lineHeight: 20,
  },
  heroMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  heroMetaLabel: {
    ...typography.body,
    color: 'rgba(255,255,255,0.85)',
  },
  leaderRow: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.2)',
  },
  leaderEyebrow: {
    ...typography.eyebrow,
    color: 'rgba(255,255,255,0.7)',
  },
  leaderName: {
    ...typography.body,
    color: '#ffffff',
    fontWeight: '600',
    marginTop: 2,
  },
  nextCard: {
    gap: spacing.xs,
  },
  sectionEyebrow: {
    ...typography.eyebrow,
    color: c.inkMuted,
  },
  nextDate: {
    ...typography.screenTitle,
    color: c.ink,
    fontSize: 20,
  },
  nextTitle: {
    ...typography.body,
    color: c.ink,
    fontWeight: '600',
  },
  nextMeta: {
    ...typography.meta,
    color: c.inkMuted,
  },
  linkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: c.card,
    borderRadius: radii.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(93,63,211,0.12)',
  },
  linkIconTile: {
    width: 36,
    height: 36,
    borderRadius: radii.sm,
    backgroundColor: 'rgba(93,63,211,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkTitle: { ...typography.body, color: c.ink, fontWeight: '700' },
  linkMeta: { ...typography.meta, color: c.inkMuted },
  section: { gap: spacing.sm },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sectionIconTile: {
    width: 24,
    height: 24,
    borderRadius: radii.sm,
    backgroundColor: 'rgba(93,63,211,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: { ...typography.cardTitle, color: c.ink, flex: 1 },
  addMemberBtn: {
    width: 28,
    height: 28,
    borderRadius: radii.sm,
    backgroundColor: 'rgba(93,63,211,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberList: { gap: spacing.xs },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: c.card,
    borderRadius: radii.md,
    padding: spacing.md,
  },
  memberName: { ...typography.body, color: c.ink },
  longPressHint: {
    ...typography.meta,
    color: c.inkFaded,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  emptyLine: {
    ...typography.body,
    color: c.inkMuted,
    padding: spacing.md,
  },
  requestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  rowDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.divider,
  },
  requestNote: {
    ...typography.meta,
    color: c.inkMuted,
    marginTop: 2,
    fontStyle: 'italic',
    lineHeight: 15,
  },
  requestActions: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  approveBtn: {
    width: 32,
    height: 32,
    borderRadius: radii.pill,
    backgroundColor: c.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rejectBtn: {
    width: 32,
    height: 32,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(225,29,72,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(225,29,72,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  meetingList: { gap: spacing.xs },
  meetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: c.card,
    borderRadius: radii.md,
    padding: spacing.md,
  },
  meetingDateTile: {
    minWidth: 60,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.sm,
    backgroundColor: 'rgba(93,63,211,0.1)',
    alignItems: 'center',
  },
  meetingDateLabel: {
    ...typography.meta,
    color: c.primary,
    fontWeight: '700',
  },
  meetingTitle: { ...typography.body, color: c.ink, fontWeight: '500' },
  meetingMeta: { ...typography.meta, color: c.inkMuted },
  errorLine: {
    ...typography.body,
    color: c.danger,
  },

  meetingBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  meetingSheet: {
    backgroundColor: c.card,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  meetingSheetHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: c.inkGhost,
    marginBottom: spacing.sm,
  },
  meetingSheetTitle: { ...typography.cardTitle, color: c.ink },
  meetingSheetHint: {
    ...typography.meta,
    color: c.inkMuted,
    marginBottom: spacing.sm,
    lineHeight: 16,
  },
  meetingLabel: {
    ...typography.eyebrow,
    color: c.ink,
    opacity: 0.6,
    marginTop: spacing.sm,
    marginBottom: 4,
  },
  meetingInput: {
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    ...typography.body,
    color: c.ink,
    backgroundColor: c.card,
  },
});
}

