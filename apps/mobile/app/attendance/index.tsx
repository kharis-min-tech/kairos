import { useMemo } from 'react';
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
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Plus, Calendar } from 'lucide-react-native';
import {
  Badge,
  Card,
  spacing,
  typography,
  useThemedStyles,
  type ThemeColors,
  useColors,
} from '@kairos/ui-native';
import { formatShortDate } from '@kairos/core';
import type { ServiceSummary } from '@kairos/types';
import { api } from '@/lib/api-client';

function isFuture(iso: string): boolean {
  return new Date(iso).getTime() >= Date.now() - 6 * 60 * 60 * 1000;
}

export default function AttendanceServicesList() {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  const router = useRouter();

  const services = useQuery({
    queryKey: ['attendance', 'services', 'browse'],
    queryFn: async () =>
      (await api.attendance.listServices({ limit: 50 })).data?.data ?? [],
  });

  const rows = services.data ?? [];
  const upcoming = useMemo(
    () =>
      rows
        .filter((s) => isFuture(s.serviceDate))
        .sort(
          (a, b) => new Date(a.serviceDate).getTime() - new Date(b.serviceDate).getTime(),
        ),
    [rows],
  );
  const past = useMemo(
    () =>
      rows
        .filter((s) => !isFuture(s.serviceDate))
        .sort(
          (a, b) => new Date(b.serviceDate).getTime() - new Date(a.serviceDate).getTime(),
        ),
    [rows],
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerBar}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ChevronLeft color={c.ink} size={24} strokeWidth={1.5} />
        </Pressable>
        <Text style={styles.headerTitle}>Services</Text>
        <Pressable
          onPress={() => router.push('/attendance/new' as never)}
          hitSlop={8}
          accessibilityLabel="Create service"
        >
          <Plus color={c.primary} size={22} strokeWidth={1.5} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={services.isFetching}
            onRefresh={() => services.refetch()}
            tintColor={c.primary}
          />
        }
      >
        {services.isLoading ? (
          <ActivityIndicator color={c.primary} style={{ marginTop: spacing.xxl }} />
        ) : rows.length === 0 ? (
          <Card padding="lg" style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Calendar color={c.primary} size={22} strokeWidth={1.5} />
            </View>
            <Text style={styles.emptyTitle}>No services yet</Text>
            <Text style={styles.emptyMeta}>
              Create the first service to start recording attendance.
            </Text>
          </Card>
        ) : (
          <>
            {upcoming.length > 0 ? (
              <View style={styles.group}>
                <Text style={styles.groupHeader}>Upcoming</Text>
                {upcoming.map((s) => (
                  <ServiceRow
                    key={s.id}
                    service={s}
                    onPress={() => router.push(`/attendance/${s.id}` as never)}
                  />
                ))}
              </View>
            ) : null}
            {past.length > 0 ? (
              <View style={styles.group}>
                <Text style={styles.groupHeader}>Past</Text>
                {past.map((s) => (
                  <ServiceRow
                    key={s.id}
                    service={s}
                    onPress={() => router.push(`/attendance/${s.id}` as never)}
                  />
                ))}
              </View>
            ) : null}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function ServiceRow({
  service,
  onPress,
}: {
  service: ServiceSummary;
  onPress: () => void;
}) {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  const time = new Date(service.serviceDate).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  });
  return (
    <Pressable onPress={onPress}>
      <Card padding="md" style={styles.row}>
        <View style={{ flex: 1, gap: 4 }}>
          <View style={styles.rowTitleLine}>
            <Text style={styles.rowTitle} numberOfLines={1}>
              {service.serviceTitle ?? service.serviceType}
            </Text>
            <Badge label={service.serviceType} variant="primary" size="sm" />
          </View>
          <Text style={styles.rowMeta}>
            {formatShortDate(service.serviceDate)} · {time}
            {service.branchName ? ` · ${service.branchName}` : ''}
          </Text>
        </View>
        <ChevronRight color={c.inkVeryFaded} size={16} strokeWidth={1.5} />
      </Card>
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
  container: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  group: { gap: spacing.sm },
  groupHeader: {
    ...typography.eyebrow,
    color: c.inkMuted,
    paddingHorizontal: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  rowTitleLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  rowTitle: { ...typography.body, color: c.ink, fontWeight: '600', flex: 1 },
  rowMeta: { ...typography.meta, color: c.inkMuted },
  empty: { alignItems: 'center', gap: spacing.xs },
  emptyIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(93,63,211,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  emptyTitle: { ...typography.cardTitle, color: c.ink },
  emptyMeta: {
    ...typography.body,
    color: c.inkMuted,
    textAlign: 'center',
  },
});
}

