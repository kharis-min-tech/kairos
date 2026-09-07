import { useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ChevronLeft,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  GraduationCap,
  TriangleAlert,
  UserMinus,
  Pencil,
  CalendarPlus,
} from 'lucide-react-native';
import {
  Card,
  Badge,
  Button,
  Input,
  spacing,
  typography,
  useThemedStyles,
  type ThemeColors,
  useColors,
} from '@kairos/ui-native';
import { formatShortDate } from '@kairos/core';
import { CHURCH_SCOPE } from '@kairos/types';
import type {
  MembershipEnrollmentWithMember,
  MembershipSession,
  MembershipWithdrawnReason,
} from '@kairos/types';
import { api } from '@/lib/api-client';
import { alert } from '@/lib/alert';
import { useCapabilities, useRequireCapability } from '@/lib/capabilities';

type Tab = 'roster' | 'sessions' | 'graduation';

/**
 * Cohort detail on a phone. Membership-admin only.
 *
 * A membership admin can run the whole programme from here — nothing needs a
 * desk. This screen holds the roster (final-test marks, withdrawal), the
 * sessions and their registers, and graduation including the override. Cohort
 * details and session scheduling are one tap away in `edit/[id]` and
 * `[id]/sessions`.
 *
 * The register is why it matters that this is on mobile: marking attendance
 * and coursework happens in the room, with a phone in hand.
 *
 * Gated on `membership:admin` at CHURCH scope. Teaching a session confers no
 * permissions — different people teach different sessions of one cohort, and
 * admins do the marking.
 */
export default function CohortDetailScreen() {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const cohortId = params.id ?? '';
  const caps = useCapabilities();

  const isAdmin = caps.has('membership:admin', CHURCH_SCOPE);
  useRequireCapability(isAdmin, '/membership');

  const [tab, setTab] = useState<Tab>('roster');

  const cohort = useQuery({
    queryKey: ['membership', 'cohorts', cohortId],
    queryFn: async () => (await api.membership.cohorts.get(cohortId)).data ?? null,
    enabled: isAdmin && !!cohortId,
  });

  const roster = useQuery({
    queryKey: ['membership', 'cohorts', cohortId, 'enrollments'],
    queryFn: async () => (await api.membership.cohorts.enrollments(cohortId)).data ?? [],
    enabled: isAdmin && !!cohortId,
  });

  if (!isAdmin) return null;

  const rows = roster.data ?? [];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerBar}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ChevronLeft color={c.ink} size={24} strokeWidth={1.5} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {cohort.data?.name ?? 'Cohort'}
        </Text>
        <View style={styles.headerActions}>
          <Pressable
            onPress={() => router.push(`/membership/${cohortId}/sessions` as never)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Schedule sessions"
          >
            <CalendarPlus color={c.ink} size={20} strokeWidth={1.5} />
          </Pressable>
          <Pressable
            onPress={() => router.push(`/membership/edit/${cohortId}` as never)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Edit cohort"
          >
            <Pencil color={c.ink} size={20} strokeWidth={1.5} />
          </Pressable>
        </View>
      </View>

      <View style={styles.tabRow}>
        {(['roster', 'sessions', 'graduation'] as const).map((t) => (
          <Pressable
            key={t}
            onPress={() => setTab(t)}
            style={[styles.tab, tab === t && styles.tabActive]}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === t }}
          >
            <Text style={[styles.tabLabel, tab === t && styles.tabLabelActive]}>{t}</Text>
          </Pressable>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={roster.isFetching}
            onRefresh={() => {
              void cohort.refetch();
              void roster.refetch();
            }}
            tintColor={c.primary}
          />
        }
      >
        {cohort.isLoading ? (
          <ActivityIndicator color={c.primary} style={{ marginTop: spacing.xxl }} />
        ) : !cohort.data ? (
          <Text style={styles.metaText}>Cohort not found.</Text>
        ) : (
          <>
            <View style={styles.metaRow}>
              <CalendarDays color={c.inkFaded} size={14} strokeWidth={1.5} />
              <Text style={styles.metaText}>
                Starts {formatShortDate(cohort.data.startDate)}
                {cohort.data.graduationDate
                  ? ` · induction ${formatShortDate(cohort.data.graduationDate)}`
                  : ''}
              </Text>
            </View>

            {tab === 'roster' ? <Roster rows={rows} styles={styles} c={c} /> : null}
            {tab === 'sessions' ? (
              <Sessions
                sessions={cohort.data.sessions}
                roster={rows}
                styles={styles}
                c={c}
              />
            ) : null}
            {tab === 'graduation' ? (
              <Graduation cohortId={cohortId} rows={rows} styles={styles} c={c} />
            ) : null}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Roster ────────────────────────────────────────────────────────────────

function Roster({
  rows,
  styles,
  c,
}: {
  rows: MembershipEnrollmentWithMember[];
  styles: ReturnType<typeof makeStyles>;
  c: ThemeColors;
}) {
  const qc = useQueryClient();
  const [scores, setScores] = useState<Record<string, string>>({});

  const recordFinalTest = useMutation({
    mutationFn: async (args: { enrollmentId: string; score: number }) =>
      (await api.membership.recordFinalTest(args)).data!,
    onSuccess: (_res, args) => {
      setScores((s) => ({ ...s, [args.enrollmentId]: '' }));
      void qc.invalidateQueries({ queryKey: ['membership'] });
      alert.info('Recorded', 'The final test mark is saved.');
    },
    onError: (e: unknown) =>
      alert.info('Could not save', e instanceof Error ? e.message : 'Please try again.'),
  });

  const withdraw = useMutation({
    mutationFn: async (args: { enrollmentId: string; reason: MembershipWithdrawnReason }) =>
      (
        await api.membership.enrollments.withdraw(args.enrollmentId, { reason: args.reason })
      ).data!,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['membership'] });
      alert.info('Updated', 'The enrolment has been closed.');
    },
    onError: (e: unknown) =>
      alert.info('Could not withdraw', e instanceof Error ? e.message : 'Please try again.'),
  });

  async function confirmWithdraw(r: MembershipEnrollmentWithMember) {
    const ok = await alert.confirm({
      title: `Withdraw ${r.memberFirstName}?`,
      message:
        'They come off this cohort and can be admitted to a later one. Their marks are kept. Use "deferred to next" if they intend to return.',
      confirmLabel: 'Withdraw',
      destructive: true,
    });
    if (!ok) return;
    withdraw.mutate({ enrollmentId: r.id, reason: 'withdrew' });
  }

  if (rows.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyTitle}>Nobody admitted yet</Text>
        <Text style={styles.metaText}>Admit people from the interest pool.</Text>
      </View>
    );
  }

  return (
    <>
      {rows.map((r) => {
        const score = scores[r.id] ?? '';
        const scoreValid = score !== '' && Number(score) >= 0 && Number(score) <= 100;
        return (
          <Card key={r.id} style={styles.card}>
            <View style={styles.cardHead}>
              <Text style={styles.cardTitle}>
                {r.memberFirstName} {r.memberLastName}
              </Text>
              <Badge
                label={r.status}
                variant={r.status === 'graduated' ? 'success' : 'neutral'}
                size="sm"
              />
            </View>
            <Text style={styles.metaText}>
              {r.branchName ?? 'No home branch'}
              {/* Provenance: through the pool, or added directly by an admin
                  (the paper-signup case). */}
              {r.fromPool ? '' : ' · added directly'}
            </Text>
            <View style={styles.badgeRow}>
              {r.finalTestPassed === true ? (
                <Badge label={`Test passed (${r.finalTestScore})`} variant="success" size="sm" />
              ) : r.finalTestPassed === false ? (
                <Badge label={`Test failed (${r.finalTestScore})`} variant="danger" size="sm" />
              ) : (
                <Text style={styles.metaText}>Final test not sat</Text>
              )}
              {r.inductionAttended ? (
                <View style={styles.metaRow}>
                  <CheckCircle2 color={c.success} size={14} strokeWidth={1.6} />
                  <Text style={styles.metaText}>Inducted</Text>
                </View>
              ) : null}
            </View>

            {/* Only an open enrolment can be marked or withdrawn. A graduated
                one is settled, and the API refuses both. */}
            {r.status === 'enrolled' ? (
              <View style={styles.rosterActions}>
                <Input
                  value={score}
                  onChangeText={(v) => setScores((s) => ({ ...s, [r.id]: v }))}
                  placeholder="Final test %"
                  keyboardType="number-pad"
                  accessibilityLabel={`${r.memberFirstName} ${r.memberLastName} final test score`}
                  containerStyle={{ flex: 1 }}
                />
                <Button
                  label="Save"
                  variant="secondary"
                  disabled={!scoreValid || recordFinalTest.isPending}
                  onPress={() =>
                    recordFinalTest.mutate({ enrollmentId: r.id, score: Number(score) })
                  }
                />
                <Pressable
                  onPress={() => void confirmWithdraw(r)}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={`Withdraw ${r.memberFirstName} ${r.memberLastName}`}
                >
                  <UserMinus color={c.danger} size={18} strokeWidth={1.6} />
                </Pressable>
              </View>
            ) : null}
          </Card>
        );
      })}
    </>
  );
}

// ── Sessions and the register ─────────────────────────────────────────────

function Sessions({
  sessions,
  roster,
  styles,
  c,
}: {
  sessions: MembershipSession[];
  roster: MembershipEnrollmentWithMember[];
  styles: ReturnType<typeof makeStyles>;
  c: ThemeColors;
}) {
  const [openId, setOpenId] = useState<string | null>(null);

  if (sessions.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyTitle}>No sessions scheduled</Text>
        <Text style={styles.metaText}>
          A cohort needs all four before anyone can graduate. Schedule them on the web
          dashboard.
        </Text>
      </View>
    );
  }

  return (
    <>
      {sessions.map((s) => (
        <Card key={s.id} style={styles.card}>
          <Text style={styles.cardTitle}>
            Session {s.sessionNumber}: {s.title}
          </Text>
          <Text style={styles.metaText}>
            {s.sessionDate ? formatShortDate(s.sessionDate) : 'Date to be confirmed'}
            {s.location ? ` · ${s.location}` : ''}
          </Text>
          {s.teacherFirstName ? (
            <Text style={styles.metaText}>
              Taught by {s.teacherFirstName} {s.teacherLastName}
            </Text>
          ) : null}

          <Button
            label={openId === s.id ? 'Close register' : 'Open register'}
            variant="secondary"
            onPress={() => setOpenId(openId === s.id ? null : s.id)}
          />

          {openId === s.id ? (
            <Register sessionId={s.id} roster={roster} styles={styles} c={c} />
          ) : null}
        </Card>
      ))}
    </>
  );
}

/**
 * The register. Attendance plus homework and quiz marks for the whole roster
 * save in ONE request, because that is how somebody works through a class:
 * down the list, not one member at a time with a round trip each.
 */
function Register({
  sessionId,
  roster,
  styles,
  c,
}: {
  sessionId: string;
  roster: MembershipEnrollmentWithMember[];
  styles: ReturnType<typeof makeStyles>;
  c: ThemeColors;
}) {
  const qc = useQueryClient();
  const active = useMemo(() => roster.filter((r) => r.status === 'enrolled'), [roster]);
  const [draft, setDraft] = useState<
    Record<string, { attended: boolean; homework: string; quiz: string }>
  >({});

  const save = useMutation({
    mutationFn: async () => {
      const records = active.map((r) => {
        const d = draft[r.id];
        return {
          enrollmentId: r.id,
          attended: d?.attended ?? false,
          // An empty box means "not marked", which is different from a zero.
          ...(d?.homework ? { homeworkScore: Number(d.homework) } : {}),
          ...(d?.quiz ? { quizScore: Number(d.quiz) } : {}),
        };
      });
      return (await api.membership.sessions.saveRecords(sessionId, { records })).data!;
    },
    onSuccess: (res) => {
      void qc.invalidateQueries({ queryKey: ['membership'] });
      alert.info('Register saved', `${res.saved} record(s) written.`);
    },
    onError: (e: unknown) =>
      alert.info('Could not save', e instanceof Error ? e.message : 'Please try again.'),
  });

  function patch(id: string, next: Partial<{ attended: boolean; homework: string; quiz: string }>) {
    setDraft((d) => ({
      ...d,
      [id]: {
        attended: d[id]?.attended ?? false,
        homework: d[id]?.homework ?? '',
        quiz: d[id]?.quiz ?? '',
        ...next,
      },
    }));
  }

  if (active.length === 0) {
    return <Text style={styles.metaText}>No active enrolments to mark.</Text>;
  }

  return (
    <View style={styles.register}>
      {active.map((r) => {
        const d = draft[r.id];
        const name = `${r.memberFirstName} ${r.memberLastName}`;
        return (
          <View key={r.id} style={styles.registerRow}>
            <Pressable
              onPress={() => patch(r.id, { attended: !(d?.attended ?? false) })}
              style={styles.attendToggle}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: d?.attended ?? false }}
              accessibilityLabel={`${name} attended`}
            >
              <ClipboardCheck
                color={d?.attended ? c.primary : c.inkFaded}
                size={18}
                strokeWidth={1.6}
              />
              <Text style={[styles.registerName, d?.attended && styles.registerNamePresent]}>
                {name}
              </Text>
            </Pressable>

            <View style={styles.scoreRow}>
              <Input
                value={d?.homework ?? ''}
                onChangeText={(v) => patch(r.id, { homework: v })}
                placeholder="Homework"
                keyboardType="number-pad"
                accessibilityLabel={`${name} homework score`}
                containerStyle={styles.scoreInput}
              />
              <Input
                value={d?.quiz ?? ''}
                onChangeText={(v) => patch(r.id, { quiz: v })}
                placeholder="Quiz"
                keyboardType="number-pad"
                accessibilityLabel={`${name} quiz score`}
                containerStyle={styles.scoreInput}
              />
            </View>
          </View>
        );
      })}

      <Button
        label={save.isPending ? 'Saving…' : 'Save register'}
        onPress={() => save.mutate()}
        disabled={save.isPending}
      />
    </View>
  );
}

// ── Graduation ────────────────────────────────────────────────────────────

function Graduation({
  cohortId,
  rows,
  styles,
  c,
}: {
  cohortId: string;
  rows: MembershipEnrollmentWithMember[];
  styles: ReturnType<typeof makeStyles>;
  c: ThemeColors;
}) {
  const qc = useQueryClient();
  const active = useMemo(() => rows.filter((r) => r.status === 'enrolled'), [rows]);

  // Who the gate turned away last time, and why. Kept in state rather than
  // shown in a one-shot toast: "3 not eligible" is useless without the
  // reasons, and the admin needs them in front of them to act.
  const [blocked, setBlocked] = useState<{ enrollmentId: string; outstanding: string[] }[]>(
    [],
  );
  const [overrideFor, setOverrideFor] = useState<string | null>(null);
  const [overrideReason, setOverrideReason] = useState('');

  const nameFor = useMemo(() => {
    const map = new Map(rows.map((r) => [r.id, `${r.memberFirstName} ${r.memberLastName}`]));
    return (id: string) => map.get(id) ?? 'This member';
  }, [rows]);

  const graduate = useMutation({
    mutationFn: async (args: {
      enrollmentIds: string[];
      override?: boolean;
      overrideReason?: string;
    }) => (await api.membership.cohorts.graduate(cohortId, args)).data!,
    onSuccess: (res) => {
      void qc.invalidateQueries({ queryKey: ['membership'] });
      // The gate is evaluated server-side and returns exactly who was blocked
      // and why, so surface that rather than a bare count.
      setBlocked(res.blocked);
      setOverrideFor(null);
      setOverrideReason('');
      alert.info(
        'Graduation',
        res.blocked.length === 0
          ? `${res.graduated} graduated.`
          : `${res.graduated} graduated. ${res.blocked.length} did not meet the gate, listed below.`,
      );
    },
    onError: (e: unknown) =>
      alert.info('Could not graduate', e instanceof Error ? e.message : 'Please try again.'),
  });

  const induct = useMutation({
    mutationFn: async (enrollmentIds: string[]) =>
      (
        await api.membership.cohorts.recordInduction(cohortId, {
          enrollmentIds,
          attended: true,
        })
      ).data!,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['membership'] });
      alert.info('Induction recorded', 'Attendance marked for the ceremony.');
    },
    onError: (e: unknown) =>
      alert.info('Could not record', e instanceof Error ? e.message : 'Please try again.'),
  });

  if (active.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyTitle}>Nobody left to graduate</Text>
      </View>
    );
  }

  const notInducted = active.filter((r) => !r.inductionAttended);

  return (
    <>
      <Card style={styles.card}>
        <View style={styles.metaRow}>
          <GraduationCap color={c.primary} size={16} strokeWidth={1.6} />
          <Text style={styles.cardTitle}>{active.length} still enrolled</Text>
        </View>
        <Text style={styles.metaText}>
          Graduating checks all six requirements per person and skips anyone who has not
          met them. Whoever is skipped is listed below with the reasons, and can be
          graduated anyway with a written reason for the audit trail.
        </Text>
      </Card>

      {notInducted.length > 0 ? (
        <Button
          label={
            induct.isPending
              ? 'Recording…'
              : `Mark induction for ${notInducted.length} attending`
          }
          variant="secondary"
          onPress={() => induct.mutate(notInducted.map((r) => r.id))}
          disabled={induct.isPending}
        />
      ) : null}

      <Button
        label={graduate.isPending ? 'Graduating…' : `Graduate ${active.length} eligible`}
        onPress={() => graduate.mutate({ enrollmentIds: active.map((r) => r.id) })}
        disabled={graduate.isPending}
      />

      {blocked.map((b) => (
        <Card key={b.enrollmentId} style={styles.blockedCard}>
          <View style={styles.metaRow}>
            <TriangleAlert color={c.danger} size={16} strokeWidth={1.6} />
            <Text style={styles.cardTitle}>{nameFor(b.enrollmentId)}</Text>
          </View>
          {b.outstanding.map((o) => (
            <Text key={o} style={styles.outstanding}>
              • {o}
            </Text>
          ))}

          {overrideFor === b.enrollmentId ? (
            <>
              <Input
                value={overrideReason}
                onChangeText={setOverrideReason}
                placeholder="Why are you overriding the gate?"
                multiline
                numberOfLines={2}
                accessibilityLabel="Override reason"
              />
              <Text style={styles.hint}>
                This is appended to the enrolment notes and kept permanently. Be specific
                enough that someone reading it in a year understands the decision.
              </Text>
              <View style={styles.overrideActions}>
                <Button
                  label="Cancel"
                  variant="secondary"
                  onPress={() => {
                    setOverrideFor(null);
                    setOverrideReason('');
                  }}
                />
                <Button
                  label={graduate.isPending ? 'Graduating…' : 'Graduate anyway'}
                  // The API rejects an override with no reason, so do not let
                  // the request leave without one.
                  disabled={!overrideReason.trim() || graduate.isPending}
                  onPress={() =>
                    graduate.mutate({
                      enrollmentIds: [b.enrollmentId],
                      override: true,
                      overrideReason: overrideReason.trim(),
                    })
                  }
                />
              </View>
            </>
          ) : (
            <Button
              label="Override and graduate"
              variant="secondary"
              onPress={() => {
                setOverrideFor(b.enrollmentId);
                setOverrideReason('');
              }}
            />
          )}
        </Card>
      ))}
    </>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.page },
    headerBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      gap: spacing.sm,
    },
    headerTitle: { ...typography.screenTitle, color: c.ink, flex: 1, textAlign: 'center' },
    headerActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    rosterActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      marginTop: spacing.xs,
    },
    blockedCard: {
      gap: spacing.xs,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: c.danger,
    },
    outstanding: { ...typography.meta, color: c.inkFaded },
    hint: { ...typography.meta, color: c.inkFaded, lineHeight: 15 },
    overrideActions: { flexDirection: 'row', gap: spacing.xs },
    tabRow: {
      flexDirection: 'row',
      paddingHorizontal: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: c.divider,
    },
    tab: { paddingHorizontal: spacing.sm, paddingVertical: spacing.sm },
    tabActive: { borderBottomWidth: 2, borderBottomColor: c.primary },
    tabLabel: { ...typography.body, color: c.inkMuted, textTransform: 'capitalize' },
    tabLabelActive: { color: c.primary, fontWeight: '600' },
    container: { padding: spacing.md, gap: spacing.sm },
    card: { gap: spacing.xs, padding: spacing.md },
    cardHead: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.sm,
    },
    cardTitle: { ...typography.body, color: c.ink, fontWeight: '600', flex: 1 },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    badgeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: spacing.xs,
    },
    metaText: { ...typography.meta, color: c.inkMuted, flexShrink: 1 },
    empty: { alignItems: 'center', gap: spacing.xs, paddingVertical: spacing.xxl },
    emptyTitle: { ...typography.body, color: c.ink, fontWeight: '600' },
    register: {
      gap: spacing.sm,
      marginTop: spacing.xs,
      paddingTop: spacing.sm,
      borderTopWidth: 1,
      borderTopColor: c.divider,
    },
    registerRow: { gap: 6 },
    attendToggle: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
    registerName: { ...typography.body, color: c.inkMuted, flex: 1 },
    registerNamePresent: { color: c.ink, fontWeight: '600' },
    scoreRow: { flexDirection: 'row', gap: spacing.xs },
    scoreInput: { flex: 1 },
  });
}
