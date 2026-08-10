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
import {
  ChevronLeft,
  ShieldCheck,
  ShieldAlert,
  KeyRound,
  UserPlus,
  UserMinus,
  Mail,
  MailWarning,
} from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { Badge, Card, colors, radii, spacing, typography } from '@kairos/ui-native';
import { AUDIT_ACTION_LABEL, AuditAction, type AuditLogRow } from '@kairos/types';
import { api } from '@/lib/api-client';

interface ActionVisual {
  Icon: LucideIcon;
  tone: string;
  tint: string;
}

function actionVisual(action: AuditAction): ActionVisual {
  switch (action) {
    case AuditAction.SigninSuccess:
      return { Icon: ShieldCheck, tone: colors.primary, tint: 'rgba(93,63,211,0.1)' };
    case AuditAction.SigninFailure:
      return { Icon: ShieldAlert, tone: colors.danger, tint: 'rgba(225,29,72,0.1)' };
    case AuditAction.PasswordChange:
      return { Icon: KeyRound, tone: colors.primary, tint: 'rgba(93,63,211,0.1)' };
    case AuditAction.RoleGranted:
      return { Icon: UserPlus, tone: colors.primary, tint: 'rgba(93,63,211,0.1)' };
    case AuditAction.RoleRevoked:
      return { Icon: UserMinus, tone: colors.danger, tint: 'rgba(225,29,72,0.1)' };
    case AuditAction.EmailChangeRequested:
    case AuditAction.EmailChangeConfirmed:
      return { Icon: Mail, tone: colors.primary, tint: 'rgba(93,63,211,0.1)' };
    case AuditAction.EmailChangeReverted:
      return { Icon: MailWarning, tone: colors.danger, tint: 'rgba(225,29,72,0.1)' };
    default:
      return { Icon: ShieldCheck, tone: 'rgba(26,28,28,0.5)', tint: 'rgba(26,28,28,0.08)' };
  }
}

function formatLocation(entry: AuditLogRow): string {
  return [entry.country, entry.ip].filter(Boolean).join(' · ') || '—';
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString('en-GB');
}

export default function RecentActivity() {
  const router = useRouter();

  const activity = useQuery({
    queryKey: ['me', 'audit-log'],
    queryFn: async () => (await api.me.auditLog()).data!,
  });

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerBar}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ChevronLeft color={colors.ink} size={24} strokeWidth={1.5} />
        </Pressable>
        <Text style={styles.headerTitle}>Recent activity</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={activity.isFetching}
            onRefresh={() => activity.refetch()}
            tintColor={colors.primary}
          />
        }
      >
        <View style={styles.introBlock}>
          <Text style={styles.introTitle}>Security activity</Text>
          <Text style={styles.introMeta}>
            Your last sign-ins, password changes, and role updates.
          </Text>
        </View>

        {activity.isLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.xl }} />
        ) : null}

        {activity.isError ? (
          <Card padding="md">
            <Text style={styles.errorLine}>
              Couldn&apos;t load activity:{' '}
              {activity.error instanceof Error ? activity.error.message : 'Unknown error'}
            </Text>
          </Card>
        ) : null}

        {activity.data && activity.data.entries.length === 0 ? (
          <Card padding="md">
            <Text style={styles.emptyLine}>No activity recorded yet.</Text>
          </Card>
        ) : null}

        {activity.data && activity.data.entries.length > 0 ? (
          <Card padding="md">
            {activity.data.entries.map((entry, idx) => {
              const { Icon, tone, tint } = actionVisual(entry.action);
              return (
                <View
                  key={entry.id}
                  style={[styles.entryRow, idx > 0 ? styles.rowDivider : null]}
                >
                  <View style={[styles.iconTile, { backgroundColor: tint }]}>
                    <Icon color={tone} size={16} strokeWidth={1.5} />
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <View style={styles.entryTitleLine}>
                      <Text style={styles.entryLabel}>
                        {AUDIT_ACTION_LABEL[entry.action]}
                      </Text>
                      {entry.outcome === 'failure' ? (
                        <Badge label="Failed" variant="danger" size="sm" />
                      ) : null}
                    </View>
                    <Text style={styles.entryMeta}>{formatTime(entry.createdAt)}</Text>
                    <Text style={styles.entryMeta}>{formatLocation(entry)}</Text>
                    {entry.userAgent ? (
                      <Text style={styles.entryUserAgent} numberOfLines={1}>
                        {entry.userAgent}
                      </Text>
                    ) : null}
                  </View>
                </View>
              );
            })}
          </Card>
        ) : null}
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
  errorLine: {
    ...typography.body,
    color: colors.danger,
  },
  emptyLine: {
    ...typography.body,
    color: 'rgba(26,28,28,0.55)',
    textAlign: 'center',
    paddingVertical: spacing.md,
  },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  rowDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(26,28,28,0.08)',
  },
  iconTile: {
    width: 32,
    height: 32,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  entryTitleLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  entryLabel: { ...typography.body, color: colors.ink, fontWeight: '600' },
  entryMeta: {
    ...typography.meta,
    color: 'rgba(26,28,28,0.6)',
  },
  entryUserAgent: {
    ...typography.meta,
    color: 'rgba(26,28,28,0.45)',
    fontSize: 10,
  },
});
