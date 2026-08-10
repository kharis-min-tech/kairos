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
import { ChevronLeft, Bell, Lock } from 'lucide-react-native';
import { Badge, Card, colors, radii, spacing, typography } from '@kairos/ui-native';
import {
  NOTIFICATION_CATEGORIES,
  NOTIFICATION_CATEGORY_LABEL,
  NOTIFICATION_CATEGORY_DESCRIPTION,
  NotificationCategory,
  type NotificationCadence,
  type UpdateNotificationPreferenceRequest,
} from '@kairos/types';
import { api } from '@/lib/api-client';

type SelectValue = 'off' | 'immediate' | 'digest_daily';

const OPTIONS: { value: SelectValue; label: string }[] = [
  { value: 'immediate', label: 'Now' },
  { value: 'digest_daily', label: 'Daily' },
  { value: 'off', label: 'Off' },
];

function toSelect(enabled: boolean, cadence: NotificationCadence): SelectValue {
  if (!enabled) return 'off';
  return cadence;
}

function fromSelect(value: SelectValue): { enabled: boolean; cadence: NotificationCadence } {
  if (value === 'off') return { enabled: false, cadence: 'immediate' };
  return { enabled: true, cadence: value };
}

const QUERY_KEY = ['me', 'notification-preferences'] as const;

export default function NotificationPreferences() {
  const router = useRouter();
  const qc = useQueryClient();

  const prefs = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => (await api.me.notificationPreferences.list()).data!,
  });

  const update = useMutation({
    mutationFn: async (data: UpdateNotificationPreferenceRequest) =>
      (await api.me.notificationPreferences.update(data)).data!,
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });

  const prefByCategory = new Map(
    (prefs.data?.preferences ?? []).map((p) => [p.category, p]),
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerBar}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ChevronLeft color={colors.ink} size={24} strokeWidth={1.5} />
        </Pressable>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={prefs.isFetching}
            onRefresh={() => prefs.refetch()}
            tintColor={colors.primary}
          />
        }
      >
        <View style={styles.introBlock}>
          <Text style={styles.introTitle}>Email preferences</Text>
          <Text style={styles.introMeta}>
            Choose which categories reach your inbox and how often.
          </Text>
        </View>

        {prefs.isLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.xl }} />
        ) : null}

        {prefs.isError ? (
          <Card padding="md">
            <Text style={styles.errorLine}>
              Couldn&apos;t load preferences:{' '}
              {prefs.error instanceof Error ? prefs.error.message : 'Unknown error'}
            </Text>
          </Card>
        ) : null}

        {prefs.data ? (
          <Card padding="md">
            <View style={styles.cardTitleRow}>
              <Bell color={colors.primary} size={16} strokeWidth={1.5} />
              <Text style={styles.cardTitle}>By category</Text>
            </View>

            {NOTIFICATION_CATEGORIES.map((category, idx) => {
              const pref = prefByCategory.get(category);
              const isSecurity = category === NotificationCategory.Security;
              const selectValue: SelectValue = pref
                ? toSelect(pref.enabled, pref.cadence)
                : 'immediate';

              return (
                <View
                  key={category}
                  style={[styles.prefRow, idx > 0 ? styles.rowDivider : null]}
                >
                  <View style={styles.prefTitleLine}>
                    <Text style={styles.prefLabel}>
                      {NOTIFICATION_CATEGORY_LABEL[category]}
                    </Text>
                    {isSecurity ? (
                      <View style={styles.lockedBadge}>
                        <Lock color={colors.primary} size={10} strokeWidth={2} />
                        <Badge label="Always on" variant="primary" size="sm" />
                      </View>
                    ) : null}
                  </View>
                  <Text style={styles.prefDesc}>
                    {NOTIFICATION_CATEGORY_DESCRIPTION[category]}
                  </Text>

                  <View style={styles.segmentedControl}>
                    {OPTIONS.map((opt) => {
                      const selected = selectValue === opt.value;
                      const disabled = isSecurity || update.isPending;
                      return (
                        <Pressable
                          key={opt.value}
                          onPress={() => {
                            if (disabled || selected) return;
                            const next = fromSelect(opt.value);
                            update.mutate({
                              category,
                              enabled: next.enabled,
                              cadence: next.cadence,
                            });
                          }}
                          style={[
                            styles.segment,
                            selected && styles.segmentActive,
                            disabled && !selected && styles.segmentDisabled,
                          ]}
                        >
                          <Text
                            style={[
                              styles.segmentLabel,
                              selected && styles.segmentLabelActive,
                            ]}
                          >
                            {opt.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              );
            })}
          </Card>
        ) : null}

        <Text style={styles.footnote}>
          Daily digest sends a single 8 AM roundup per category instead of an email per event.
          Security alerts always go immediately.
        </Text>
      </ScrollView>
    </SafeAreaView>
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
    gap: spacing.lg,
  },
  introBlock: { gap: 2 },
  introTitle: { ...typography.screenTitle, color: colors.ink },
  introMeta: { ...typography.meta, color: 'rgba(26,28,28,0.6)' },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  cardTitle: { ...typography.cardTitle, color: colors.ink },
  errorLine: {
    ...typography.body,
    color: colors.danger,
  },
  prefRow: {
    gap: spacing.xs,
    paddingVertical: spacing.md,
  },
  rowDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(26,28,28,0.08)',
  },
  prefTitleLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  prefLabel: { ...typography.body, color: colors.ink, fontWeight: '600' },
  lockedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  prefDesc: {
    ...typography.meta,
    color: 'rgba(26,28,28,0.6)',
    lineHeight: 15,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: colors.subtleLight,
    borderRadius: radii.md,
    padding: 3,
    gap: 3,
    marginTop: spacing.sm,
  },
  segment: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentActive: {
    backgroundColor: colors.cardLight,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  segmentDisabled: {
    opacity: 0.5,
  },
  segmentLabel: {
    ...typography.body,
    fontSize: 13,
    color: 'rgba(26,28,28,0.6)',
    fontWeight: '500',
  },
  segmentLabelActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  footnote: {
    ...typography.meta,
    color: 'rgba(26,28,28,0.5)',
    paddingHorizontal: spacing.xs,
    lineHeight: 15,
  },
});
