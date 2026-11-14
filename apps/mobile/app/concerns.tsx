import { useState } from 'react';
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
import { ChevronLeft, ShieldAlert, HeartHandshake, Home, Phone, MessageCircle } from 'lucide-react-native';
import {
  Badge,
  Card,
  spacing,
  typography,
  radii,
  useThemedStyles,
  type ThemeColors,
  useColors,
} from '@kairos/ui-native';
import type { ConcernInboxItem } from '@kairos/types';
import { api } from '@/lib/api-client';
import { useCapabilities, useRequireCapability } from '@/lib/capabilities';
import { useAuthStore } from '@/store/auth';
import { useTranslation } from 'react-i18next';

type Tab = 'welfare' | 'safeguarding';

/**
 * Concerns inbox — 0046. Leader tool that surfaces follow-ups flagged
 * `welfare_concern` or `safeguarding_concern`.
 *
 * The two tabs are gated separately, because the two queues are deliberately
 * held by different people: welfare is pastoral care (`welfare:read`, branch
 * leadership) and safeguarding is protection (`safeguarding:read`, the
 * branch's Safeguarding Lead, the church-wide Head, or the Main Pastor —
 * never a Minister or a Branch Data Admin). Someone who holds both sees both
 * tabs; someone who holds one sees one. Endpoints:
 *   /api/me/followups/welfare
 *   /api/me/followups/safeguarding
 */
export default function ConcernsInbox() {  const { t } = useTranslation(['concerns', 'common']);

  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  const router = useRouter();
  const caps = useCapabilities();
  const branchId = useAuthStore((s) => s.user?.homeBranchId ?? null);
  const scope = branchId ? ({ kind: 'branch', id: branchId } as const) : undefined;
  const canSeeWelfare = caps.has('welfare:read', scope);
  const canSeeSafeguarding = caps.has('safeguarding:read', scope);
  const visibleTabs = ([] as Tab[]).concat(
    canSeeWelfare ? ['welfare'] : [],
    canSeeSafeguarding ? ['safeguarding'] : [],
  );
  const canAccess = visibleTabs.length > 0;

  const [tab, setTab] = useState<Tab>(canSeeWelfare ? 'welfare' : 'safeguarding');
  useRequireCapability(canAccess);

  const welfare = useQuery({
    queryKey: ['concerns', 'welfare'],
    enabled: canAccess && tab === 'welfare',
    queryFn: async () => (await api.me.welfareInbox()).data ?? [],
  });
  const safeguarding = useQuery({
    queryKey: ['concerns', 'safeguarding'],
    enabled: canAccess && tab === 'safeguarding',
    queryFn: async () => (await api.me.safeguardingInbox()).data ?? [],
  });

  const active = tab === 'welfare' ? welfare : safeguarding;
  const items = active.data ?? [];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerBar}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ChevronLeft color={c.ink} size={24} strokeWidth={1.5} />
        </Pressable>
        <Text style={styles.headerTitle}>{t('concerns:concerns')}</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.tabs}>
        {visibleTabs.map((tabKey) => {
          const isActive = tabKey === tab;
          const Icon = tabKey === 'welfare' ? HeartHandshake : ShieldAlert;
          return (
            <Pressable
              key={tabKey}
              onPress={() => setTab(tabKey)}
              style={[styles.tab, isActive && styles.tabActive]}
            >
              <Icon
                color={isActive ? c.primary : c.inkFaded}
                size={14}
                strokeWidth={1.5}
              />
              <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                {tabKey === 'welfare' ? t('concerns:welfare') : t('concerns:safeguarding')}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={active.isFetching}
            onRefresh={() => active.refetch()}
            tintColor={c.primary}
          />
        }
      >
        <Text style={styles.subtitle}>
          {tab === 'welfare'
            ? t('concerns:followUpsFlaggedWelfareConcernsReach')
: t('concerns:followUpsFlaggedSafeguardingMattersEscalate')}
        </Text>

        {active.isLoading ? (
          <ActivityIndicator color={c.primary} style={{ marginTop: spacing.xxl }} />
        ) : items.length === 0 ? (
          <Card padding="md">
            <Text style={styles.emptyLine}>
              {tab === 'welfare'
                ? t('concerns:noWelfareConcernsFlaggedAllQuiet')
: t('concerns:noSafeguardingMattersFlagged')}
            </Text>
          </Card>
        ) : (
          items.map((row) => <ConcernRow key={row.id} row={row} />)
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function ConcernRow({ row }: { row: ConcernInboxItem }) {  const { t } = useTranslation(['concerns', 'common']);

  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  const router = useRouter();
  const isVisit = row.type === 'visit';
  const Icon = isVisit ? Home : row.methods?.includes('phone_call') ? Phone : MessageCircle;
  const dateLabel = new Date(row.contactedAt).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  const outcomeKey = isVisit
    ? row.visitOutcome === 'present'
      ? 'present'
      : row.visitOutcome === 'not_present'
        ? 'notPresent'
        : row.visitOutcome === 'rescheduled'
          ? 'rescheduled'
          : null
    : row.contactReached === true
      ? 'reached'
      : row.contactReached === false
        ? 'noAnswer'
        : null;
  const outcomeLabel = outcomeKey ? t(`members:outcome_${outcomeKey}`) : null;

  return (
    <Pressable
      onPress={() => router.push(`/members/${row.memberId}`)}
      style={styles.rowPressable}
    >
      <Card padding="md" style={{ gap: spacing.sm }}>
        <View style={styles.rowTop}>
          <View style={styles.iconTile}>
            <Icon color={c.primary} size={14} strokeWidth={1.5} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={styles.memberName} numberOfLines={1}>
              {row.memberFirstName} {row.memberLastName}
            </Text>
            <Text style={styles.metaLine} numberOfLines={1}>
              {dateLabel} · {row.scopeName} ·{' '}
              {t('members:recordedByName', {
                name: `${row.recordedByFirstName} ${row.recordedByLastName ?? ''}`.trim(),
              })}
            </Text>
          </View>
          {outcomeLabel ? (
            <Badge label={outcomeLabel} variant="primary" size="sm" />
          ) : null}
        </View>
        {row.notes ? (
          <Text style={styles.notesText} numberOfLines={4}>
            {row.notes}
          </Text>
        ) : (
          <Text style={styles.noNotesText}>{t('concerns:noNotesRecordedOnThisFollow')}</Text>
        )}
        <View style={styles.chipRow}>
          {row.welfareConcern ? (
            <Badge label={t('concerns:welfare')} variant="gold" size="sm" />
          ) : null}
          {row.safeguardingConcern ? (
            <Badge label={t('concerns:safeguarding')} variant="danger" size="sm" />
          ) : null}
        </View>
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
    tabs: {
      flexDirection: 'row',
      gap: spacing.sm,
      paddingHorizontal: spacing.lg,
      marginBottom: spacing.sm,
    },
    tab: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xs,
      paddingVertical: spacing.sm,
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: c.divider,
      backgroundColor: c.card,
    },
    tabActive: {
      borderColor: c.primary,
      backgroundColor: 'rgba(93,63,211,0.06)',
    },
    tabLabel: { ...typography.button, color: c.inkFaded },
    tabLabelActive: { color: c.primary },
    container: {
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.xxl,
      gap: spacing.md,
    },
    subtitle: {
      ...typography.body,
      color: c.inkMuted,
      lineHeight: 20,
    },
    emptyLine: {
      ...typography.body,
      color: c.inkMuted,
    },
    rowPressable: {},
    rowTop: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    iconTile: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: 'rgba(93,63,211,0.10)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    memberName: { ...typography.cardTitle, color: c.ink },
    metaLine: { ...typography.meta, color: c.inkMuted },
    notesText: {
      ...typography.body,
      color: c.ink,
      lineHeight: 20,
    },
    noNotesText: {
      ...typography.meta,
      color: c.inkFaded,
      fontStyle: 'italic',
    },
    chipRow: {
      flexDirection: 'row',
      gap: 6,
    },
  });
}
