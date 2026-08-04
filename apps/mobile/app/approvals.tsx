import {
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft } from 'lucide-react-native';
import { Card, Badge, Button, Avatar, colors, spacing, typography, radii } from '@kairos/ui-native';
import { formatShortDate } from '@kairos/core';
import { api } from '@/lib/api-client';

export default function Approvals() {
  const router = useRouter();
  const qc = useQueryClient();

  const pending = useQuery({
    queryKey: ['members', 'pending'],
    queryFn: async () => {
      const res = await api.members.list({
        approvalStatus: 'pending',
        limit: 50,
      });
      return res.data?.data ?? [];
    },
  });

  const approve = useMutation({
    mutationFn: (memberId: string) =>
      api.members.approve(memberId, { approved: true }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['members'] });
    },
    onError: (e: Error) => {
      Alert.alert('Approve failed', e.message);
    },
  });

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerBar}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ChevronLeft color={colors.ink} size={24} strokeWidth={1.5} />
        </Pressable>
        <Text style={styles.headerTitle}>Approvals</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.subHeader}>
        <Text style={styles.subTitle}>Waiting on you</Text>
        <Text style={styles.subMeta}>
          {pending.data?.length ?? 0} member signup{pending.data?.length === 1 ? '' : 's'} pending
        </Text>
      </View>

      <FlatList
        data={pending.data ?? []}
        keyExtractor={(m) => m.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={pending.isFetching}
            onRefresh={() => pending.refetch()}
            tintColor={colors.primary}
          />
        }
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
        ListEmptyComponent={
          pending.isLoading ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />
          ) : (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>All caught up</Text>
              <Text style={styles.emptyMeta}>No pending member signups.</Text>
            </View>
          )
        }
        renderItem={({ item }) => (
          <Card padding="md" style={styles.card}>
            <View style={styles.cardHeader}>
              <Badge label="Member signup" variant="primary" size="sm" />
              <Text style={styles.dateLabel}>
                {formatShortDate(item.createdAt as unknown as string)}
              </Text>
            </View>
            <View style={styles.applicantRow}>
              <Avatar
                size="sm"
                photoUrl={item.photoUrl}
                firstName={item.firstName}
                lastName={item.lastName}
              />
              <View style={styles.applicantText}>
                <Text style={styles.applicantName}>
                  {item.firstName} {item.lastName}
                </Text>
                <Text style={styles.applicantContact}>
                  {item.email}
                  {item.phone ? ` · ${item.phone}` : ''}
                </Text>
              </View>
            </View>
            <View style={styles.detailGrid}>
              <DetailCell label="Home branch" value={item.branchName ?? '—'} />
              <DetailCell
                label="Date of birth"
                value={item.dateOfBirth ? formatShortDate(item.dateOfBirth) : '—'}
              />
            </View>
            <View style={styles.actions}>
              <Button
                label="Approve"
                size="sm"
                fullWidth
                loading={approve.isPending && approve.variables === item.id}
                onPress={() => approve.mutate(item.id)}
                style={styles.approveButton}
              />
              <Button
                label="Reject"
                size="sm"
                variant="outline"
                fullWidth
                onPress={() =>
                  Alert.alert('Reject', 'Reject flow lands in a follow-up.')
                }
                style={styles.rejectButton}
              />
            </View>
          </Card>
        )}
      />
    </SafeAreaView>
  );
}

function DetailCell({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailCell}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
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
  subHeader: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    gap: 2,
  },
  subTitle: { ...typography.screenTitle, color: colors.ink },
  subMeta: { ...typography.meta, color: 'rgba(26,28,28,0.55)' },
  listContent: {
    padding: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.md,
  },
  empty: {
    alignItems: 'center',
    marginTop: spacing.xxl,
    gap: spacing.xs,
  },
  emptyTitle: { ...typography.cardTitle, color: colors.ink },
  emptyMeta: { ...typography.meta, color: 'rgba(26,28,28,0.55)' },
  card: { gap: spacing.md },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateLabel: { ...typography.meta, color: 'rgba(26,28,28,0.5)' },
  applicantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  applicantText: { flex: 1, gap: 2 },
  applicantName: { ...typography.cardTitle, color: colors.ink },
  applicantContact: { ...typography.meta, color: 'rgba(26,28,28,0.6)' },
  detailGrid: {
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: colors.subtleLight,
    borderRadius: radii.md,
    padding: spacing.md,
  },
  detailCell: { flex: 1, gap: 2 },
  detailLabel: { ...typography.eyebrow, color: 'rgba(26,28,28,0.5)' },
  detailValue: { ...typography.body, color: colors.ink },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  approveButton: { flex: 1 },
  rejectButton: { flex: 1 },
});
