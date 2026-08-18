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
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, Check, X } from 'lucide-react-native';
import {
  Avatar,
  Badge,
  Button,
  Card,
  Input,
  radii,
  spacing,
  typography,
  useThemedStyles,
  type ThemeColors,
  useColors,
} from '@kairos/ui-native';
import type { RotaSwapRequestWithDetails } from '@kairos/types';
import { api } from '@/lib/api-client';
import { alert } from '@/lib/alert';

type Filter = 'pending' | 'approved' | 'rejected' | 'cancelled' | 'all';

const FILTER_LABELS: Record<Filter, string> = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
  all: 'All',
};

export default function SwapRequestsAdmin() {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  const router = useRouter();
  const qc = useQueryClient();
  const { branchDeptId } = useLocalSearchParams<{ branchDeptId: string }>();

  const [filter, setFilter] = useState<Filter>('pending');
  const [reviewFor, setReviewFor] = useState<{
    row: RotaSwapRequestWithDetails;
    decision: 'approved' | 'rejected';
  } | null>(null);

  const dept = useQuery({
    queryKey: ['branch-dept', branchDeptId],
    enabled: !!branchDeptId,
    queryFn: async () => (await api.departments.get(branchDeptId!)).data!,
  });

  const requests = useQuery({
    queryKey: ['rota', 'swap-requests', branchDeptId, filter],
    enabled: !!branchDeptId,
    queryFn: async () =>
      (
        await api.departments.rota.listSwapRequests(branchDeptId!, {
          ...(filter === 'all' ? {} : { status: filter }),
        })
      ).data ?? [],
  });

  const rows = useMemo(
    () =>
      (requests.data ?? [])
        .slice()
        .sort((a, b) => b.createdAt.toString().localeCompare(a.createdAt.toString())),
    [requests.data],
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerBar}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ChevronLeft color={c.ink} size={24} strokeWidth={1.5} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          Swap requests
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabs}
      >
        {(Object.keys(FILTER_LABELS) as Filter[]).map((f) => {
          const active = f === filter;
          return (
            <Pressable
              key={f}
              onPress={() => setFilter(f)}
              style={[styles.tab, active && styles.tabActive]}
            >
              <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>
                {FILTER_LABELS[f]}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={requests.isFetching}
            onRefresh={() => requests.refetch()}
            tintColor={c.primary}
          />
        }
      >
        {dept.data ? (
          <Text style={styles.contextLine}>
            {dept.data.departmentName} · {dept.data.branchName}
          </Text>
        ) : null}

        {requests.isLoading ? (
          <ActivityIndicator color={c.primary} style={{ marginTop: spacing.xxl }} />
        ) : rows.length === 0 ? (
          <Card padding="md">
            <Text style={styles.emptyLine}>
              {filter === 'pending'
                ? 'No pending swaps right now.'
                : 'Nothing here yet.'}
            </Text>
          </Card>
        ) : (
          rows.map((r) => (
            <SwapCard
              key={r.id}
              row={r}
              onApprove={() => setReviewFor({ row: r, decision: 'approved' })}
              onReject={() => setReviewFor({ row: r, decision: 'rejected' })}
            />
          ))
        )}
      </ScrollView>

      {reviewFor ? (
        <ReviewSheet
          data={reviewFor}
          branchDeptId={branchDeptId!}
          onClose={() => setReviewFor(null)}
          onDone={() => {
            qc.invalidateQueries({ queryKey: ['rota', 'swap-requests', branchDeptId] });
            qc.invalidateQueries({ queryKey: ['rota', 'instances', branchDeptId] });
            setReviewFor(null);
          }}
        />
      ) : null}
    </SafeAreaView>
  );
}

function SwapCard({
  row,
  onApprove,
  onReject,
}: {
  row: RotaSwapRequestWithDetails;
  onApprove: () => void;
  onReject: () => void;
}) {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  const pending = row.status === 'pending';
  const badge =
    row.status === 'approved'
      ? { label: 'Approved', variant: 'success' as const }
      : row.status === 'rejected'
        ? { label: 'Rejected', variant: 'danger' as const }
        : row.status === 'cancelled'
          ? { label: 'Cancelled', variant: 'neutral' as const }
          : { label: 'Pending', variant: 'gold' as const };
  return (
    <Card padding="md" style={{ gap: spacing.sm }}>
      <View style={styles.row}>
        <View style={styles.dateTile}>
          <Text style={styles.dateMonth}>
            {new Date(row.serviceDate)
              .toLocaleDateString('en-GB', { month: 'short' })
              .toUpperCase()}
          </Text>
          <Text style={styles.dateDay}>
            {new Date(row.serviceDate).getDate()}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.titleLine}>
            <Text style={styles.roleName}>{row.roleName}</Text>
            <Badge label={badge.label} variant={badge.variant} size="sm" />
          </View>
          <Text style={styles.meta}>
            Requested by {row.requesterFirstName} {row.requesterLastName}
          </Text>
        </View>
      </View>

      {row.proposedFirstName ? (
        <View style={styles.proposedRow}>
          <Avatar
            size="sm"
            firstName={row.proposedFirstName}
            lastName={row.proposedLastName ?? undefined}
          />
          <View style={{ flex: 1 }}>
            <Text style={styles.metaFaded}>Proposed swap</Text>
            <Text style={styles.proposedName}>
              {row.proposedFirstName} {row.proposedLastName ?? ''}
            </Text>
          </View>
        </View>
      ) : (
        <Text style={styles.metaFaded}>
          Open swap — no specific member proposed. Anyone from the pool can cover.
        </Text>
      )}

      {row.reason ? (
        <View style={styles.reasonBlock}>
          <Text style={styles.reasonLabel}>REASON</Text>
          <Text style={styles.reasonText}>{row.reason}</Text>
        </View>
      ) : null}

      {row.reviewNotes ? (
        <View style={styles.reviewNotesBlock}>
          <Text style={styles.reviewNotesLabel}>REVIEW NOTES</Text>
          <Text style={styles.reviewNotesText}>{row.reviewNotes}</Text>
        </View>
      ) : null}

      {pending ? (
        <View style={styles.actionRow}>
          <Pressable style={styles.approveBtn} onPress={onApprove}>
            <Check color="#ffffff" size={14} strokeWidth={2} />
            <Text style={styles.approveLabel}>Approve</Text>
          </Pressable>
          <Pressable style={styles.rejectBtn} onPress={onReject}>
            <X color={c.danger} size={14} strokeWidth={2} />
            <Text style={styles.rejectLabel}>Reject</Text>
          </Pressable>
        </View>
      ) : null}
    </Card>
  );
}

function ReviewSheet({
  data,
  branchDeptId,
  onClose,
  onDone,
}: {
  data: { row: RotaSwapRequestWithDetails; decision: 'approved' | 'rejected' };
  branchDeptId: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const styles = useThemedStyles(makeStyles);
  const [notes, setNotes] = useState('');

  const mutate = useMutation({
    mutationFn: async () => {
      const payload: Parameters<typeof api.departments.rota.reviewSwapRequest>[2] = {
        decision: data.decision,
      };
      if (notes.trim()) payload.reviewNotes = notes.trim();
      const res = await api.departments.rota.reviewSwapRequest(
        branchDeptId,
        data.row.id,
        payload,
      );
      if (!res.success) throw new Error(res.message ?? 'Could not review');
      return res.data!;
    },
    onSuccess: onDone,
    onError: (e: Error) =>
      alert.info('Could not save', e.message ?? 'Please try again.'),
  });

  const label =
    data.decision === 'approved' ? 'Approve swap' : 'Reject swap';

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={styles.backdrop} onPress={onClose}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>{label}</Text>
            <Text style={styles.metaFaded}>
              {data.row.roleName} · {data.row.serviceDate} · requested by{' '}
              {data.row.requesterFirstName} {data.row.requesterLastName}
            </Text>
            <View style={{ gap: 4 }}>
              <Text style={styles.label}>Review notes (optional)</Text>
              <Input
                value={notes}
                onChangeText={setNotes}
                placeholder="Why is this being approved / rejected?"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                containerStyle={{ minHeight: 80 }}
              />
            </View>
            <Button
              label={mutate.isPending ? 'Saving…' : label}
              size="lg"
              fullWidth
              loading={mutate.isPending}
              onPress={() => mutate.mutate()}
            />
            <Pressable style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelLabel}>Cancel</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
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
      gap: spacing.md,
    },
    contextLine: { ...typography.meta, color: c.inkMuted },
    emptyLine: { ...typography.body, color: c.inkMuted },
    row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    dateTile: {
      width: 44,
      height: 44,
      borderRadius: radii.md,
      backgroundColor: 'rgba(93,63,211,0.1)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    dateMonth: {
      fontSize: 8,
      fontWeight: '700',
      color: c.primary,
      letterSpacing: 0.8,
    },
    dateDay: {
      fontSize: 18,
      fontWeight: '700',
      color: c.primary,
      lineHeight: 20,
    },
    titleLine: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    roleName: { ...typography.body, color: c.ink, fontWeight: '700', flex: 1 },
    meta: { ...typography.meta, color: c.inkMuted },
    metaFaded: { ...typography.meta, color: c.inkFaded },
    proposedRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      backgroundColor: c.subtle,
      padding: spacing.sm,
      borderRadius: radii.sm,
    },
    proposedName: { ...typography.body, color: c.ink, fontWeight: '600' },
    reasonBlock: {
      gap: 2,
      padding: spacing.sm,
      backgroundColor: c.subtle,
      borderRadius: radii.sm,
    },
    reasonLabel: { ...typography.eyebrow, color: c.inkFaded, letterSpacing: 0.8 },
    reasonText: { ...typography.body, color: c.ink, lineHeight: 18 },
    reviewNotesBlock: {
      gap: 2,
      padding: spacing.sm,
      backgroundColor: 'rgba(93,63,211,0.06)',
      borderRadius: radii.sm,
    },
    reviewNotesLabel: { ...typography.eyebrow, color: c.primary, letterSpacing: 0.8 },
    reviewNotesText: { ...typography.body, color: c.ink, lineHeight: 18 },
    actionRow: { flexDirection: 'row', gap: spacing.sm, marginTop: 4 },
    approveBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
      backgroundColor: c.primary,
      paddingVertical: spacing.sm,
      borderRadius: radii.md,
    },
    approveLabel: { ...typography.body, color: '#ffffff', fontWeight: '700' },
    rejectBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
      backgroundColor: c.card,
      paddingVertical: spacing.sm,
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: c.danger,
    },
    rejectLabel: { ...typography.body, color: c.danger, fontWeight: '700' },
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.4)',
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: c.card,
      borderTopLeftRadius: radii.lg,
      borderTopRightRadius: radii.lg,
      padding: spacing.lg,
      gap: spacing.md,
    },
    sheetHandle: {
      alignSelf: 'center',
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: c.inkGhost,
    },
    sheetTitle: { ...typography.cardTitle, color: c.ink },
    label: { ...typography.eyebrow, color: c.ink, opacity: 0.6 },
    cancelBtn: { alignItems: 'center', paddingVertical: spacing.sm },
    cancelLabel: { ...typography.button, color: c.primary },
  });
}
