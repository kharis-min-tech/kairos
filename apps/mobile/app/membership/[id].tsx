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
import type { MembershipEnrollmentWithMember, MembershipSession } from '@kairos/types';
import { api } from '@/lib/api-client';
import { alert } from '@/lib/alert';
import { useCapabilities, useRequireCapability } from '@/lib/capabilities';

type Tab = 'roster' | 'sessions' | 'graduation';

/**
 * Cohort detail on a phone. Membership-admin only.
 *
 * The register is why this screen exists on mobile at all: marking attendance
 * and coursework happens in the room, with a phone in hand, not afterwards at
 * a desk. Cohort creation and editing stay on the web dashboard, where a form
 * that long belongs.
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
        <View style={{ width: 24 }} />
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
      {rows.map((r) => (
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
              <Badge label="Test passed" variant="success" size="sm" />
            ) : r.finalTestPassed === false ? (
              <Badge label="Test failed" variant="danger" size="sm" />
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
        </Card>
      ))}
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

  const graduate = useMutation({
    mutationFn: async (enrollmentIds: string[]) =>
      (await api.membership.cohorts.graduate(cohortId, { enrollmentIds })).data!,
    onSuccess: (res) => {
      void qc.invalidateQueries({ queryKey: ['membership'] });
      // The gate is evaluated server-side and returns exactly who was blocked
      // and why, so report that rather than a bare success count.
      const blocked = res.blocked.length;
      alert.info(
        'Graduation',
        blocked === 0
          ? `${res.graduated} graduated.`
          : `${res.graduated} graduated. ${blocked} not yet eligible — open the web dashboard to see why.`,
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
          met them. Overriding the gate is a web-dashboard action, because it needs a
          written reason for the audit trail.
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
        onPress={() => graduate.mutate(active.map((r) => r.id))}
        disabled={graduate.isPending}
      />
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
