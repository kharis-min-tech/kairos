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

type Tab = 'welfare' | 'safeguarding';

/**
 * Concerns inbox — 0046. Leader tool that surfaces follow-ups flagged
 * `welfare_concern` or `safeguarding_concern`. Two tabs so a branch admin
 * who also serves as the safeguarding lead can triage both without leaving
 * the screen; a plain welfare-only leader sees the welfare tab and hits a
 * 403 if they somehow tap into safeguarding. Endpoints:
 *   /api/me/followups/welfare
 *   /api/me/followups/safeguarding
 */
export default function ConcernsInbox() {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('welfare');

  const caps = useCapabilities();
  const branchId = useAuthStore((s) => s.user?.homeBranchId ?? null);
  const canAccess =
    caps.systemRole === 'admin' ||
    (!!branchId && caps.has('branch:write', { kind: 'branch', id: branchId })) ||
    (!!branchId && caps.has('safeguarding:read', { kind: 'branch', id: branchId }));
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
        <Text style={styles.headerTitle}>Concerns</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.tabs}>
        {(['welfare', 'safeguarding'] as Tab[]).map((t) => {
          const isActive = t === tab;
          const Icon = t === 'welfare' ? HeartHandshake : ShieldAlert;
          return (
            <Pressable
              key={t}
              onPress={() => setTab(t)}
              style={[styles.tab, isActive && styles.tabActive]}
            >
              <Icon
                color={isActive ? c.primary : c.inkFaded}
                size={14}
                strokeWidth={1.5}
              />
              <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                {t === 'welfare' ? 'Welfare' : 'Safeguarding'}
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
            ? 'Follow-ups flagged as welfare concerns. Reach out to the pastoral team.'
            : 'Follow-ups flagged as safeguarding matters. Escalate to the branch safeguarding lead.'}
        </Text>

        {active.isLoading ? (
          <ActivityIndicator color={c.primary} style={{ marginTop: spacing.xxl }} />
        ) : items.length === 0 ? (
          <Card padding="md">
            <Text style={styles.emptyLine}>
              {tab === 'welfare'
                ? 'No welfare concerns flagged. All quiet.'
                : 'No safeguarding matters flagged.'}
            </Text>
          </Card>
        ) : (
          items.map((row) => <ConcernRow key={row.id} row={row} />)
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function ConcernRow({ row }: { row: ConcernInboxItem }) {
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
  const outcomeLabel = isVisit
    ? row.visitOutcome === 'present'
      ? 'Present'
      : row.visitOutcome === 'not_present'
        ? 'Not present'
        : row.visitOutcome === 'rescheduled'
          ? 'Rescheduled'
          : null
    : row.contactReached === true
      ? 'Reached'
      : row.contactReached === false
        ? 'No answer'
        : null;

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
              {dateLabel} · {row.scopeName} · by {row.recordedByFirstName}{' '}
              {row.recordedByLastName}
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
          <Text style={styles.noNotesText}>No notes recorded on this follow-up.</Text>
        )}
        <View style={styles.chipRow}>
          {row.welfareConcern ? (
            <Badge label="Welfare" variant="gold" size="sm" />
          ) : null}
          {row.safeguardingConcern ? (
            <Badge label="Safeguarding" variant="danger" size="sm" />
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
