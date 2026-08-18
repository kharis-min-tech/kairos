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
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, Check, X, ShieldAlert } from 'lucide-react-native';
import {
  Avatar,
  Badge,
  Card,
  radii,
  spacing,
  typography,
  useThemedStyles,
  type ThemeColors,
  useColors,
} from '@kairos/ui-native';
import { api } from '@/lib/api-client';
import { alert } from '@/lib/alert';

type Tab = 'approval' | 'unguarded' | 'dormant';

const TAB_LABELS: Record<Tab, string> = {
  approval: 'Awaiting approval',
  unguarded: 'Unguarded minors',
  dormant: 'Dormant minors',
};

export default function MembersAdmin() {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  const router = useRouter();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>('approval');

  const pending = useQuery({
    queryKey: ['members', 'pending'],
    enabled: tab === 'approval',
    queryFn: async () =>
      (await api.members.list({ approvalStatus: 'pending', limit: 200 })).data?.data ?? [],
  });

  const unguarded = useQuery({
    queryKey: ['members', 'safeguarding', 'unguarded'],
    enabled: tab === 'unguarded',
    queryFn: async () =>
      (await api.members.listUnguardedMinors()).data ?? [],
  });

  const dormant = useQuery({
    queryKey: ['members', 'safeguarding', 'dormant'],
    enabled: tab === 'dormant',
    queryFn: async () => (await api.members.listDormantMinors()).data ?? [],
  });

  const approve = useMutation({
    mutationFn: async (id: string) =>
      (await api.members.approve(id, { approved: true })).data!,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['members', 'pending'] }),
    onError: (e: Error) =>
      alert.info('Could not approve', e.message ?? 'Please try again.'),
  });

  const reject = useMutation({
    mutationFn: async (id: string) =>
      (await api.members.approve(id, { approved: false })).data!,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['members', 'pending'] }),
    onError: (e: Error) =>
      alert.info('Could not reject', e.message ?? 'Please try again.'),
  });

  const reviewMinor = useMutation({
    mutationFn: async ({
      id,
      decision,
    }: {
      id: string;
      decision: 'active' | 'archived';
    }) => (await api.members.reviewMinor(id, { decision })).data!,
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['members', 'safeguarding', 'dormant'] }),
    onError: (e: Error) =>
      alert.info('Could not review', e.message ?? 'Please try again.'),
  });

  async function confirmReject(id: string, name: string) {
    const ok = await alert.confirm({
      title: 'Reject sign-up?',
      message: `Deny ${name}'s account. They can re-apply later if needed.`,
      confirmLabel: 'Reject',
      destructive: true,
    });
    if (ok) reject.mutate(id);
  }

  async function confirmArchiveMinor(id: string, name: string) {
    const ok = await alert.confirm({
      title: 'Archive minor?',
      message: `Archive ${name}'s child record. Only do this if the child is no longer with the church.`,
      confirmLabel: 'Archive',
      destructive: true,
    });
    if (ok) reviewMinor.mutate({ id, decision: 'archived' });
  }

  const q = tab === 'approval' ? pending : tab === 'unguarded' ? unguarded : dormant;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerBar}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ChevronLeft color={c.ink} size={24} strokeWidth={1.5} />
        </Pressable>
        <Text style={styles.headerTitle}>Members admin</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabs}
      >
        {(Object.keys(TAB_LABELS) as Tab[]).map((t) => {
          const active = t === tab;
          return (
            <Pressable
              key={t}
              onPress={() => setTab(t)}
              style={[styles.tab, active && styles.tabActive]}
            >
              <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>
                {TAB_LABELS[t]}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={q.isFetching}
            onRefresh={() => q.refetch()}
            tintColor={c.primary}
          />
        }
      >
        {q.isLoading ? (
          <ActivityIndicator color={c.primary} style={{ marginTop: spacing.xxl }} />
        ) : null}

        {tab === 'approval' ? (
          (pending.data ?? []).length === 0 ? (
            <Card padding="md">
              <Text style={styles.emptyLine}>No sign-ups waiting on approval.</Text>
            </Card>
          ) : (
            (pending.data ?? []).map((m) => (
              <Card key={m.id} padding="md" style={styles.row}>
                <Avatar
                  size="md"
                  photoUrl={m.photoUrl ?? undefined}
                  firstName={m.firstName}
                  lastName={m.lastName}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>
                    {m.firstName} {m.lastName}
                  </Text>
                  <Text style={styles.meta}>
                    {m.email ?? m.phone ?? 'No contact'}
                    {m.branchName ? ` · ${m.branchName}` : ''}
                  </Text>
                </View>
                <View style={styles.actionCol}>
                  <Pressable
                    onPress={() =>
                      confirmReject(m.id, `${m.firstName} ${m.lastName}`)
                    }
                    style={styles.rejectBtn}
                    hitSlop={6}
                    accessibilityLabel="Reject"
                    disabled={approve.isPending || reject.isPending}
                  >
                    <X color={c.danger} size={16} strokeWidth={2} />
                  </Pressable>
                  <Pressable
                    onPress={() => approve.mutate(m.id)}
                    style={styles.approveBtn}
                    hitSlop={6}
                    accessibilityLabel="Approve"
                    disabled={approve.isPending || reject.isPending}
                  >
                    <Check color="#ffffff" size={16} strokeWidth={2} />
                  </Pressable>
                </View>
              </Card>
            ))
          )
        ) : null}

        {tab === 'unguarded' ? (
          (unguarded.data ?? []).length === 0 ? (
            <Card padding="md">
              <Text style={styles.emptyLine}>
                All minors have an active guardian record.
              </Text>
            </Card>
          ) : (
            <>
              <Card padding="md" style={styles.tipCard}>
                <ShieldAlert color={c.gold} size={14} strokeWidth={1.5} />
                <Text style={styles.tipText}>
                  These children have no active guardian on file. Assign one from
                  the child&apos;s profile.
                </Text>
              </Card>
              {(unguarded.data ?? []).map((m) => (
                <Pressable
                  key={m.id}
                  onPress={() => router.push(`/members/${m.id}`)}
                >
                  <Card padding="md" style={styles.row}>
                    <Avatar size="sm" firstName={m.firstName} lastName={m.lastName} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.name}>
                        {m.firstName} {m.lastName}
                      </Text>
                      <Text style={styles.meta}>
                        {m.branchName}
                        {m.dateOfBirth ? ` · DOB ${m.dateOfBirth}` : ''}
                      </Text>
                    </View>
                    <Badge
                      label={
                        m.guardianStatus === 'inactive' ? 'Inactive gdn.' : 'No gdn.'
                      }
                      variant="danger"
                      size="sm"
                    />
                  </Card>
                </Pressable>
              ))}
            </>
          )
        ) : null}

        {tab === 'dormant' ? (
          (dormant.data ?? []).length === 0 ? (
            <Card padding="md">
              <Text style={styles.emptyLine}>
                Nothing needs a safeguarding-lead review.
              </Text>
            </Card>
          ) : (
            (dormant.data ?? []).map((m) => (
              <Card key={m.id} padding="md" style={styles.rowStack}>
                <View style={styles.row}>
                  <Avatar size="sm" firstName={m.firstName} lastName={m.lastName} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name}>
                      {m.firstName} {m.lastName}
                    </Text>
                    <Text style={styles.meta}>
                      {m.dateOfBirth ? `DOB ${m.dateOfBirth} · ` : ''}
                      Added {new Date(m.createdAt).toLocaleDateString()}
                    </Text>
                    {m.lastReviewedAt ? (
                      <Text style={styles.metaFaded}>
                        Last review {new Date(m.lastReviewedAt).toLocaleDateString()}
                        {m.lastReviewerName ? ` by ${m.lastReviewerName}` : ''}
                        {m.lastDecision ? ` · ${m.lastDecision}` : ''}
                      </Text>
                    ) : null}
                  </View>
                </View>
                <View style={styles.decisionRow}>
                  <Pressable
                    onPress={() =>
                      reviewMinor.mutate({ id: m.id, decision: 'active' })
                    }
                    style={styles.keepBtn}
                    disabled={reviewMinor.isPending}
                  >
                    <Text style={styles.keepLabel}>Keep active</Text>
                  </Pressable>
                  <Pressable
                    onPress={() =>
                      confirmArchiveMinor(m.id, `${m.firstName} ${m.lastName}`)
                    }
                    style={styles.archiveBtn}
                    disabled={reviewMinor.isPending}
                  >
                    <Text style={styles.archiveLabel}>Archive</Text>
                  </Pressable>
                </View>
              </Card>
            ))
          )
        ) : null}
      </ScrollView>
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
    headerTitle: { ...typography.cardTitle, color: c.ink },
    tabs: {
      paddingHorizontal: spacing.lg,
      gap: spacing.xs,
      paddingBottom: spacing.sm,
    },
    tab: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: radii.pill,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
    },
    tabActive: {
      backgroundColor: 'rgba(93,63,211,0.1)',
      borderColor: c.primary,
    },
    tabLabel: { ...typography.body, color: c.inkMuted, fontWeight: '600' },
    tabLabelActive: { color: c.primary, fontWeight: '700' },
    container: {
      padding: spacing.lg,
      paddingBottom: spacing.xxl,
      gap: spacing.sm,
    },
    emptyLine: { ...typography.body, color: c.inkMuted },
    row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    rowStack: { gap: spacing.sm },
    name: { ...typography.body, color: c.ink, fontWeight: '700' },
    meta: { ...typography.meta, color: c.inkMuted },
    metaFaded: { ...typography.meta, color: c.inkFaded, marginTop: 2 },
    actionCol: { flexDirection: 'row', gap: spacing.xs },
    approveBtn: {
      width: 32,
      height: 32,
      borderRadius: radii.sm,
      backgroundColor: c.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rejectBtn: {
      width: 32,
      height: 32,
      borderRadius: radii.sm,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.danger,
      alignItems: 'center',
      justifyContent: 'center',
    },
    tipCard: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.sm,
      backgroundColor: 'rgba(248,181,55,0.1)',
      borderWidth: 1,
      borderColor: 'rgba(248,181,55,0.35)',
    },
    tipText: { ...typography.meta, color: c.goldDark, flex: 1, lineHeight: 16 },
    decisionRow: { flexDirection: 'row', gap: spacing.sm },
    keepBtn: {
      flex: 1,
      alignItems: 'center',
      backgroundColor: c.primary,
      paddingVertical: spacing.sm,
      borderRadius: radii.md,
    },
    keepLabel: { ...typography.body, color: '#ffffff', fontWeight: '700' },
    archiveBtn: {
      flex: 1,
      alignItems: 'center',
      backgroundColor: c.card,
      paddingVertical: spacing.sm,
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: c.danger,
    },
    archiveLabel: { ...typography.body, color: c.danger, fontWeight: '700' },
  });
}
