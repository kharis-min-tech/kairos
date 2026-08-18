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
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, Calendar, MapPin, User } from 'lucide-react-native';
import {
  Avatar,
  Badge,
  Card,
  colors,
  radii,
  spacing,
  typography,
} from '@kairos/ui-native';
import { formatShortDate } from '@kairos/core';
import type { ServiceAttendanceRow } from '@kairos/types';
import { api } from '@/lib/api-client';

const STATUS_TONE: Record<string, 'success' | 'gold' | 'info' | 'neutral'> = {
  Present: 'success',
  Late: 'gold',
  Virtual: 'info',
};

export default function AttendanceServiceDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [statusFilter, setStatusFilter] =
    useState<'all' | 'Present' | 'Late' | 'Virtual'>('all');

  const service = useQuery({
    queryKey: ['attendance', 'service', id],
    enabled: !!id,
    queryFn: async () => (await api.attendance.getService(id!)).data ?? null,
  });

  const attendance = useQuery({
    queryKey: ['attendance', 'service', id, 'records'],
    enabled: !!id,
    queryFn: async () => (await api.attendance.listAttendance(id!)).data ?? [],
  });

  const rows = attendance.data ?? [];
  const filtered = useMemo(() => {
    if (statusFilter === 'all') return rows;
    return rows.filter((r) => r.attendanceStatus === statusFilter);
  }, [rows, statusFilter]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { Present: 0, Late: 0, Virtual: 0 };
    rows.forEach((r) => {
      c[r.attendanceStatus] = (c[r.attendanceStatus] ?? 0) + 1;
    });
    return c;
  }, [rows]);
  const total = rows.length;

  const loading = service.isLoading || attendance.isLoading;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerBar}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ChevronLeft color={colors.ink} size={24} strokeWidth={1.5} />
        </Pressable>
        <Text style={styles.headerTitle}>Service</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={service.isFetching || attendance.isFetching}
            onRefresh={() => {
              service.refetch();
              attendance.refetch();
            }}
            tintColor={colors.primary}
          />
        }
      >
        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xxl }} />
        ) : !service.data ? (
          <Text style={styles.emptyText}>Service not found.</Text>
        ) : (
          <>
            <Card padding="md" style={{ gap: spacing.sm }}>
              <Text style={styles.stageLabel}>
                {service.data.serviceType.toUpperCase()}
              </Text>
              <Text style={styles.title}>
                {service.data.serviceTitle ?? service.data.serviceType}
              </Text>
              <View style={styles.metaRow}>
                <View style={styles.metaItem}>
                  <Calendar color="rgba(26,28,28,0.55)" size={14} strokeWidth={1.5} />
                  <Text style={styles.metaText}>
                    {formatShortDate(service.data.serviceDate)}
                  </Text>
                </View>
                {service.data.branchName ? (
                  <View style={styles.metaItem}>
                    <MapPin color="rgba(26,28,28,0.55)" size={14} strokeWidth={1.5} />
                    <Text style={styles.metaText}>{service.data.branchName}</Text>
                  </View>
                ) : null}
                {service.data.preacherName ? (
                  <View style={styles.metaItem}>
                    <User color="rgba(26,28,28,0.55)" size={14} strokeWidth={1.5} />
                    <Text style={styles.metaText}>{service.data.preacherName}</Text>
                  </View>
                ) : null}
              </View>
              {service.data.topic ? (
                <Text style={styles.topic}>&ldquo;{service.data.topic}&rdquo;</Text>
              ) : null}
            </Card>

            <View style={styles.summaryRow}>
              <SummaryTile label="Total" value={total} tone={colors.primary} />
              <SummaryTile label="Present" value={counts.Present ?? 0} tone={colors.success} />
              <SummaryTile label="Late" value={counts.Late ?? 0} tone={colors.gold} />
              <SummaryTile label="Virtual" value={counts.Virtual ?? 0} tone={colors.info} />
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ flexGrow: 0 }}
              contentContainerStyle={styles.chipsRow}
            >
              {(['all', 'Present', 'Late', 'Virtual'] as const).map((k) => {
                const active = statusFilter === k;
                return (
                  <Pressable
                    key={k}
                    onPress={() => setStatusFilter(k)}
                    style={[styles.chip, active && styles.chipActive]}
                  >
                    <Text
                      style={[styles.chipLabel, active && styles.chipLabelActive]}
                    >
                      {k === 'all' ? 'All' : k}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {filtered.length === 0 ? (
              <Text style={styles.emptyText}>No attendance records.</Text>
            ) : (
              filtered.map((r) => <AttendeeRow key={r.memberId} row={r} onPress={() => router.push(`/members/${r.memberId}` as never)} />)
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function SummaryTile({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <View style={[styles.summaryTile, { borderLeftColor: tone }]}>
      <Text style={[styles.summaryValue, { color: tone }]}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

function AttendeeRow({
  row,
  onPress,
}: {
  row: ServiceAttendanceRow;
  onPress: () => void;
}) {
  const tone = STATUS_TONE[row.attendanceStatus] ?? 'neutral';
  return (
    <Pressable onPress={onPress}>
      <Card padding="md" style={styles.row}>
        <Avatar size="sm" firstName={row.memberFirstName} lastName={row.memberLastName} />
        <View style={{ flex: 1 }}>
          <Text style={styles.rowName}>
            {row.memberFirstName} {row.memberLastName}
          </Text>
          {row.isFirstTimeVisitor ? (
            <Text style={styles.rowMeta}>First-time visitor</Text>
          ) : row.arrivalTime ? (
            <Text style={styles.rowMeta}>
              Arrived{' '}
              {new Date(row.arrivalTime).toLocaleTimeString('en-GB', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          ) : null}
        </View>
        <Badge label={row.attendanceStatus} variant={tone} size="sm" />
      </Card>
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
  container: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  emptyText: {
    ...typography.body,
    color: 'rgba(26,28,28,0.6)',
    textAlign: 'center',
    marginTop: spacing.xl,
  },

  stageLabel: {
    ...typography.eyebrow,
    color: colors.primary,
    letterSpacing: 1.2,
  },
  title: { ...typography.cardTitle, color: colors.ink },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { ...typography.meta, color: 'rgba(26,28,28,0.65)' },
  topic: {
    ...typography.body,
    color: 'rgba(26,28,28,0.7)',
    fontStyle: 'italic',
    marginTop: spacing.xs,
  },

  summaryRow: { flexDirection: 'row', gap: spacing.xs },
  summaryTile: {
    flex: 1,
    backgroundColor: colors.cardLight,
    borderRadius: radii.md,
    padding: spacing.sm,
    borderLeftWidth: 3,
    alignItems: 'flex-start',
  },
  summaryValue: { fontSize: 18, fontWeight: '800' },
  summaryLabel: { ...typography.meta, color: 'rgba(26,28,28,0.6)', fontWeight: '600' },

  chipsRow: {
    gap: spacing.xs,
    alignItems: 'center',
  },
  chip: {
    paddingHorizontal: spacing.md,
    height: 32,
    justifyContent: 'center',
    borderRadius: radii.pill,
    backgroundColor: colors.subtleLight,
  },
  chipActive: { backgroundColor: colors.primary },
  chipLabel: { ...typography.meta, color: colors.ink, fontWeight: '600' },
  chipLabelActive: { color: '#ffffff' },

  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  rowName: { ...typography.body, color: colors.ink, fontWeight: '600' },
  rowMeta: { ...typography.meta, color: 'rgba(26,28,28,0.6)' },
});
