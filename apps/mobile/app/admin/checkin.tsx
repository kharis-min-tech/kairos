import { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { alert } from '@/lib/alert';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, Search, ScanLine, UserPlus } from 'lucide-react-native';
import { Avatar, Badge, Button, colors, spacing, typography, radii, gradients } from '@kairos/ui-native';
import { api } from '@/lib/api-client';

export default function AdminCheckin() {
  const router = useRouter();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');

  // Nearest upcoming service.
  const services = useQuery({
    queryKey: ['attendance', 'services', 'today'],
    queryFn: async () => (await api.attendance.listServices({ limit: 5 })).data?.data ?? [],
  });

  const activeService = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return (services.data ?? [])
      .filter((s) => new Date(s.serviceDate) >= today)
      .sort(
        (a, b) => new Date(a.serviceDate).getTime() - new Date(b.serviceDate).getTime(),
      )[0];
  }, [services.data]);

  const serviceId = activeService?.id;

  const roster = useQuery({
    queryKey: ['attendance', 'roster', serviceId],
    queryFn: async () => {
      const res = await api.attendance.roster(serviceId!);
      const payload = res.data;
      if (!payload) return [];
      return Array.isArray(payload) ? payload : (payload.data ?? []);
    },
    enabled: !!serviceId,
  });

  const checkin = useMutation({
    mutationFn: async ({ memberId }: { memberId: string }) => {
      if (!serviceId) throw new Error('No active service');
      return api.attendance.recordAttendance(serviceId, {
        entries: [{ memberId, status: 'Present' }],
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['attendance', 'roster', serviceId] });
    },
    onError: (e: Error) => {
      alert.info('Check-in failed', e.message);
    },
  });

  const roasted = (roster.data ?? []).filter((r) =>
    search
      ? `${r.firstName} ${r.lastName}`.toLowerCase().includes(search.toLowerCase())
      : true,
  );

  const checkedIn = (roster.data ?? []).filter((r) => r.status !== null).length;
  const total = roster.data?.length ?? 0;
  const notYet = Math.max(0, total - checkedIn);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.gradientHeader}>
        <LinearGradient
          colors={gradients.brandDeep}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradientBg}
        />
        <View style={styles.headerBar}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <ChevronLeft color="#ffffff" size={24} strokeWidth={1.5} />
          </Pressable>
          <View style={styles.headerText}>
            <Text style={styles.headerEyebrow}>Check-in desk</Text>
            <Text style={styles.headerTitle}>
              {activeService?.serviceTitle ?? activeService?.serviceType ?? 'No live service'}
            </Text>
            <Text style={styles.headerMeta}>
              {activeService?.branchName ?? 'Kharis'}
              {activeService
                ? ` · ${new Date(activeService.serviceDate).toLocaleDateString('en-GB', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                  })}`
                : ''}
            </Text>
          </View>
          <View style={styles.liveChip}>
            <View style={styles.liveDot} />
            <Text style={styles.liveLabel}>Live</Text>
          </View>
        </View>

        <View style={styles.statTiles}>
          <StatTile label="Checked in" value={String(checkedIn)} />
          <StatTile label="Roster" value={String(total)} />
          <StatTile label="Not yet" value={String(notYet)} />
        </View>
      </View>

      <View style={styles.actionBar}>
        <Button
          label="Scan QR"
          size="sm"
          onPress={() => alert.info('QR', 'Camera scanner lands in a follow-up.')}
          iconLeft={<ScanLine color="#ffffff" size={14} strokeWidth={2} />}
        />
        <Button
          label="Walk-in"
          size="sm"
          variant="outline"
          onPress={() => alert.info('Walk-in', 'Visitor walk-in form lands in a follow-up.')}
          iconLeft={<UserPlus color={colors.primary} size={14} strokeWidth={2} />}
        />
        <View style={styles.searchField}>
          <Search color="rgba(26,28,28,0.4)" size={16} strokeWidth={1.5} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search"
            placeholderTextColor="rgba(26,28,28,0.4)"
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
      </View>

      {!activeService ? (
        <View style={styles.emptyBlock}>
          <Text style={styles.emptyTitle}>No service ready</Text>
          <Text style={styles.emptyMeta}>
            The check-in desk activates once a service is scheduled for today.
          </Text>
        </View>
      ) : (
        <FlatList
          data={roasted}
          keyExtractor={(r) => r.memberId}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={roster.isFetching}
              onRefresh={() => roster.refetch()}
              tintColor={colors.primary}
            />
          }
          ListHeaderComponent={
            <Text style={styles.queueLabel}>
              At the desk · {roasted.length} member{roasted.length === 1 ? '' : 's'}
            </Text>
          }
          ListEmptyComponent={
            roster.isLoading ? (
              <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />
            ) : (
              <Text style={styles.emptyText}>No matches.</Text>
            )
          }
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
          renderItem={({ item }) => {
            const isCheckedIn = item.status !== null;
            const isPending = checkin.isPending && checkin.variables?.memberId === item.memberId;
            return (
              <View
                style={[
                  styles.row,
                  isCheckedIn && styles.rowCheckedIn,
                ]}
              >
                <Avatar
                  size="sm"
                  photoUrl={item.photoUrl}
                  firstName={item.firstName}
                  lastName={item.lastName}
                />
                <View style={styles.rowText}>
                  <Text style={styles.rowName}>
                    {item.firstName} {item.lastName}
                  </Text>
                  {isCheckedIn ? (
                    <Badge label={item.status ?? 'Present'} variant="success" size="sm" />
                  ) : (
                    <Text style={styles.rowMeta}>Not checked in</Text>
                  )}
                </View>
                {!isCheckedIn ? (
                  <Button
                    label="Check in"
                    size="sm"
                    loading={isPending}
                    onPress={() => checkin.mutate({ memberId: item.memberId })}
                  />
                ) : null}
              </View>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statTile}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label.toUpperCase()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.pageLight },
  gradientHeader: {
    paddingBottom: spacing.md,
  },
  gradientBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  headerText: { flex: 1, gap: 2 },
  headerEyebrow: {
    ...typography.eyebrow,
    color: 'rgba(255,255,255,0.65)',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  headerMeta: {
    ...typography.meta,
    color: 'rgba(255,255,255,0.7)',
  },
  liveChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.16)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.pill,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.success,
  },
  liveLabel: {
    ...typography.meta,
    color: '#ffffff',
    fontWeight: '600',
  },
  statTiles: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  statTile: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: radii.md,
    padding: spacing.md,
    gap: 2,
    alignItems: 'flex-start',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#ffffff',
  },
  statLabel: {
    ...typography.eyebrow,
    color: 'rgba(255,255,255,0.6)',
  },

  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.pageLight,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(26,28,28,0.06)',
  },
  searchField: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.cardLight,
    borderWidth: 1,
    borderColor: 'rgba(26,28,28,0.08)',
    borderRadius: radii.md,
    paddingHorizontal: spacing.sm,
    height: 36,
  },
  searchInput: {
    flex: 1,
    ...typography.body,
    color: colors.ink,
  },

  emptyBlock: {
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.xs,
  },
  emptyTitle: { ...typography.cardTitle, color: colors.ink },
  emptyMeta: {
    ...typography.body,
    color: 'rgba(26,28,28,0.55)',
    textAlign: 'center',
  },
  emptyText: {
    ...typography.body,
    color: 'rgba(26,28,28,0.5)',
    textAlign: 'center',
    marginTop: spacing.xl,
  },

  listContent: {
    padding: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
  queueLabel: {
    ...typography.eyebrow,
    color: 'rgba(26,28,28,0.55)',
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.cardLight,
    borderRadius: radii.md,
    padding: spacing.md,
  },
  rowCheckedIn: {
    borderLeftWidth: 3,
    borderLeftColor: colors.success,
  },
  rowText: { flex: 1, gap: spacing.xs },
  rowName: { ...typography.cardTitle, color: colors.ink },
  rowMeta: { ...typography.meta, color: 'rgba(26,28,28,0.55)' },
});
