import { View, Text, StyleSheet, Pressable } from 'react-native';
import { ChevronRight, TriangleAlert, Circle } from 'lucide-react-native';
import {
  Card,
  radii,
  spacing,
  typography,
  useThemedStyles,
  type ThemeColors,
  useColors,
} from '@kairos/ui-native';
import type {
  HomeActivityItem,
  HomeAgendaItem,
  HomeGettingStartedItem,
  HomeGroupSummary,
  HomePulse,
  HomePulseWarning,
  HomeTaskItem,
} from '@kairos/types';

/**
 * The four blocks the control centre is built from. Each takes data plus an
 * onPress, so routing stays in the screen — the payload carries ids, not
 * routes, and the two platforms map them differently.
 *
 * Which blocks render, and in what order, is decided by `altitude` in the
 * screen. Nothing here knows about roles.
 */

export function SectionHeader({ label, count }: { label: string; count?: number }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionLabel}>{label}</Text>
      {count !== undefined && count > 0 ? (
        <Text style={styles.sectionCount}>{count}</Text>
      ) : null}
    </View>
  );
}

/** "10:00" for a timed item. Agenda rows lead with the time, so it's the anchor. */
function timeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function dayLabel(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { weekday: 'short' });
}

export function AgendaBlock({
  label,
  items,
  withDay,
  onPress,
}: {
  label: string;
  items: HomeAgendaItem[];
  /** `thisWeek` prefixes the weekday; `today` doesn't need it. */
  withDay?: boolean;
  onPress: (item: HomeAgendaItem) => void;
}) {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  if (items.length === 0) return null;

  return (
    <View style={styles.block}>
      <SectionHeader label={label} />
      {items.map((item) => (
        <Pressable
          key={`${item.kind}:${item.id}`}
          onPress={() => onPress(item)}
          accessibilityRole="button"
          accessibilityLabel={`${item.title}${item.subtitle ? `, ${item.subtitle}` : ''}`}
          style={styles.row}
        >
          <View style={styles.rowTime}>
            <Text style={styles.rowTimeText}>
              {withDay ? dayLabel(item.at) : timeLabel(item.at)}
            </Text>
            {withDay ? <Text style={styles.rowTimeSub}>{timeLabel(item.at)}</Text> : null}
          </View>
          <View
            style={[
              styles.rowDot,
              { backgroundColor: item.kind === 'rota' ? c.gold : c.primary },
            ]}
          />
          <View style={styles.rowBody}>
            <Text style={styles.rowTitle} numberOfLines={1}>
              {item.title}
            </Text>
            {item.subtitle ? (
              <Text style={styles.rowSubtitle} numberOfLines={1}>
                {item.subtitle}
              </Text>
            ) : null}
          </View>
          <ChevronRight color={c.inkVeryFaded} size={18} strokeWidth={1.5} />
        </Pressable>
      ))}
    </View>
  );
}

export function NeedsYouBlock({
  items,
  onPress,
}: {
  items: HomeTaskItem[];
  onPress: (item: HomeTaskItem) => void;
}) {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  if (items.length === 0) return null;

  const total = items.reduce((sum, i) => sum + i.count, 0);

  return (
    <View style={styles.block}>
      <SectionHeader label="Needs you" count={total} />
      <Card padding="none" style={styles.taskCard}>
        {items.map((item, index) => (
          <Pressable
            key={`${item.kind}:${item.id}`}
            onPress={() => onPress(item)}
            accessibilityRole="button"
            accessibilityLabel={item.title}
            style={[styles.taskRow, index > 0 && styles.taskRowDivided]}
          >
            {item.urgency === 'high' ? (
              <TriangleAlert color={c.danger} size={18} strokeWidth={1.5} />
            ) : (
              <View style={[styles.taskCountPill, { backgroundColor: c.primaryTint }]}>
                <Text style={[styles.taskCountText, { color: c.primary }]}>{item.count}</Text>
              </View>
            )}
            <View style={styles.rowBody}>
              <Text style={styles.taskTitle} numberOfLines={1}>
                {item.title}
              </Text>
              {item.subtitle ? (
                <Text style={styles.rowSubtitle} numberOfLines={1}>
                  {item.subtitle}
                </Text>
              ) : null}
            </View>
            <ChevronRight color={c.inkVeryFaded} size={18} strokeWidth={1.5} />
          </Pressable>
        ))}
      </Card>
    </View>
  );
}

export function PulseBlock({
  pulse,
  onWarningPress,
}: {
  pulse: HomePulse;
  onWarningPress: (warning: HomePulseWarning) => void;
}) {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();

  return (
    <View style={styles.block}>
      <SectionHeader label={pulse.scope === 'church' ? 'Church pulse' : 'Branch pulse'} />
      {/* One card per metric, two per row — the same partitioned treatment as
          web. Four numbers sharing a single card read as one run-on bar at
          phone width. */}
      <View style={styles.metricGrid}>
        {pulse.metrics.map((metric) => (
          <Card key={metric.key} padding="md" style={styles.metricCard}>
            <Text style={styles.metricValue}>{metric.value.toLocaleString()}</Text>
            <Text style={styles.metricLabel} numberOfLines={2}>
              {metric.label}
            </Text>
            {metric.delta ? <Text style={styles.metricDelta}>{metric.delta}</Text> : null}
          </Card>
        ))}
      </View>
      {pulse.warnings.length > 0 ? (
        <Card padding="none" style={styles.warningCard}>
          {pulse.warnings.map((warning, index) => (
            <Pressable
              key={warning.kind}
              onPress={() => onWarningPress(warning)}
              accessibilityRole="button"
              accessibilityLabel={warning.text}
              style={[styles.warningRow, index > 0 && styles.taskRowDivided]}
            >
              <TriangleAlert color={c.gold} size={16} strokeWidth={1.5} />
              <Text style={styles.warningText}>{warning.text}</Text>
              <ChevronRight color={c.inkVeryFaded} size={16} strokeWidth={1.5} />
            </Pressable>
          ))}
        </Card>
      ) : null}
    </View>
  );
}

export function GroupsBlock({
  label,
  groups,
  onPress,
}: {
  label: string;
  groups: HomeGroupSummary[];
  onPress: (group: HomeGroupSummary) => void;
}) {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  if (groups.length === 0) return null;

  return (
    <View style={styles.block}>
      <SectionHeader label={label} />
      <Card padding="none" style={styles.taskCard}>
        {groups.map((group, index) => (
          <Pressable
            key={`${group.kind}:${group.id}`}
            onPress={() => onPress(group)}
            accessibilityRole="button"
            accessibilityLabel={group.name}
            style={[styles.taskRow, index > 0 && styles.taskRowDivided]}
          >
            <View style={styles.rowBody}>
              <Text style={styles.taskTitle} numberOfLines={1}>
                {group.name}
              </Text>
              <Text style={styles.rowSubtitle}>
                {group.kind === 'branch'
                  ? `${group.headcount.toLocaleString()} in congregation`
                  : `${group.headcount} member${group.headcount === 1 ? '' : 's'}`}
                {group.lastPresent !== null && group.lastTotal !== null
                  ? ` · last ${group.lastPresent}/${group.lastTotal}`
                  : group.lastPresent !== null
                    ? ` · last ${group.lastPresent.toLocaleString()} present`
                    : ''}
              </Text>
            </View>
            <ChevronRight color={c.inkVeryFaded} size={18} strokeWidth={1.5} />
          </Pressable>
        ))}
      </Card>
    </View>
  );
}

/**
 * Replaces an empty agenda for a brand-new member. Without it the thinnest
 * case is a screen with a service on it and nothing else, which reads as the
 * app having nothing for them.
 */
export function GettingStartedBlock({
  items,
  onPress,
}: {
  items: HomeGettingStartedItem[];
  onPress: (item: HomeGettingStartedItem) => void;
}) {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  if (items.length === 0) return null;

  return (
    <View style={styles.block}>
      <SectionHeader label="Getting started" />
      <Card padding="none" style={styles.taskCard}>
        {items.map((item, index) => (
          <Pressable
            key={item.key}
            onPress={() => onPress(item)}
            accessibilityRole="button"
            accessibilityLabel={item.title}
            style={[styles.taskRow, index > 0 && styles.taskRowDivided]}
          >
            <Circle color={c.inkFaded} size={18} strokeWidth={1.5} />
            <View style={styles.rowBody}>
              <Text style={styles.taskTitle} numberOfLines={2}>
                {item.title}
              </Text>
            </View>
            <ChevronRight color={c.inkVeryFaded} size={18} strokeWidth={1.5} />
          </Pressable>
        ))}
      </Card>
    </View>
  );
}

/** "2 hours ago", "Yesterday", "Tue" — recency is the point, not the clock. */
function whenLabel(iso: string): string {
  const then = new Date(iso);
  const minutes = Math.round((Date.now() - then.getTime()) / 60000);
  if (minutes < 60) return minutes <= 1 ? 'Just now' : `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
  const days = Math.round(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return then.toLocaleDateString('en-GB', { weekday: 'long' });
  return then.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

/** What has already happened, newest first. Absent at personal altitude. */
export function RecentActivityBlock({
  items,
  onPress,
}: {
  items: HomeActivityItem[];
  onPress: (item: HomeActivityItem) => void;
}) {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  if (items.length === 0) return null;

  return (
    <View style={styles.block}>
      <SectionHeader label="Recent activity" />
      <Card padding="none" style={styles.taskCard}>
        {items.map((item, index) => (
          <Pressable
            key={`${item.kind}:${item.id}`}
            onPress={() => onPress(item)}
            accessibilityRole="button"
            accessibilityLabel={item.title}
            style={[styles.taskRow, index > 0 && styles.taskRowDivided]}
          >
            <View
              style={[
                styles.rowDot,
                {
                  backgroundColor:
                    item.kind === 'membership_graduated' ? c.gold : c.primary,
                },
              ]}
            />
            <View style={styles.rowBody}>
              <Text style={styles.taskTitle}>{item.title}</Text>
              <Text style={styles.rowSubtitle} numberOfLines={1}>
                {[whenLabel(item.at), item.subtitle].filter(Boolean).join(' · ')}
              </Text>
            </View>
            <ChevronRight color={c.inkVeryFaded} size={18} strokeWidth={1.5} />
          </Pressable>
        ))}
      </Card>
    </View>
  );
}

/**
 * Shown while the single home request is in flight. Without this, a pending
 * or failed request renders every block as null and the screen reads as
 * "nothing here" — which is exactly how it looked on 2026-10-04.
 */
export function HomeSkeleton() {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.block} accessibilityLabel="Loading your dashboard">
      {[0, 1, 2].map((i) => (
        <View key={i} style={styles.skeletonCard} />
      ))}
    </View>
  );
}

/**
 * Surfaces the API's own message rather than a generic failure. The home
 * payload is the whole screen, so a silent failure leaves nothing to look at.
 */
export function HomeError({ message, onRetry }: { message: string; onRetry: () => void }) {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  return (
    <View style={styles.block}>
      <Card padding="md" style={styles.errorCard}>
        <View style={styles.errorHeader}>
          <TriangleAlert color={c.danger} size={18} strokeWidth={1.5} />
          <Text style={styles.errorTitle}>We couldn&apos;t load your dashboard</Text>
        </View>
        <Text style={styles.rowSubtitle}>{message}</Text>
        <Pressable
          onPress={onRetry}
          accessibilityRole="button"
          accessibilityLabel="Retry"
          style={styles.retryButton}
        >
          <Text style={styles.retryText}>Retry</Text>
        </Pressable>
      </Card>
    </View>
  );
}

/** Personal attendance streak — the only number a plain member gets. */
export function StreakBlock({ weeks, onPress }: { weeks: number; onPress: () => void }) {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();

  return (
    <View style={styles.block}>
      <SectionHeader label="You" />
      <Pressable onPress={onPress} accessibilityRole="button">
        <Card padding="md" style={styles.streakCard}>
          <View style={styles.rowBody}>
            <Text style={styles.streakValue}>
              {weeks} week{weeks === 1 ? '' : 's'} running
            </Text>
            <Text style={styles.rowSubtitle}>My attendance</Text>
          </View>
          <ChevronRight color={c.inkVeryFaded} size={18} strokeWidth={1.5} />
        </Card>
      </Pressable>
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    block: {
      marginTop: spacing.xl,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.md,
    },
    sectionLabel: {
      ...typography.eyebrow,
      color: c.inkFaded,
    },
    sectionCount: {
      ...typography.eyebrow,
      color: c.primary,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: spacing.md,
      gap: spacing.md,
    },
    rowTime: {
      width: 48,
    },
    rowTimeText: {
      ...typography.meta,
      color: c.ink,
      fontWeight: '600',
    },
    rowTimeSub: {
      ...typography.meta,
      color: c.inkFaded,
      fontSize: 11,
    },
    rowDot: {
      width: 6,
      height: 6,
      borderRadius: radii.pill,
    },
    rowBody: {
      flex: 1,
    },
    rowTitle: {
      ...typography.cardTitle,
      color: c.ink,
    },
    rowSubtitle: {
      ...typography.meta,
      color: c.inkFaded,
      marginTop: 2,
    },
    taskCard: {
      overflow: 'hidden',
    },
    taskRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
    },
    taskRowDivided: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.divider,
    },
    taskCountPill: {
      minWidth: 22,
      height: 22,
      borderRadius: radii.pill,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing.xs,
    },
    taskCountText: {
      ...typography.meta,
      fontWeight: '700',
    },
    taskTitle: {
      ...typography.body,
      color: c.ink,
      fontWeight: '500',
    },
    metricGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.md,
    },
    metricCard: {
      // Two per row, accounting for the gap between them.
      flexGrow: 1,
      flexBasis: '47%',
    },
    metricValue: {
      ...typography.hero,
      color: c.ink,
    },
    metricLabel: {
      ...typography.meta,
      color: c.inkFaded,
      marginTop: 2,
    },
    metricDelta: {
      ...typography.meta,
      color: c.inkMuted,
      marginTop: 2,
    },
    warningCard: {
      marginTop: spacing.md,
      borderWidth: 1,
      borderColor: c.gold,
    },
    warningRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
    },
    warningText: {
      ...typography.meta,
      color: c.ink,
      flex: 1,
    },
    streakCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    streakValue: {
      ...typography.cardTitle,
      color: c.ink,
    },
    skeletonCard: {
      height: 72,
      borderRadius: radii.lg,
      backgroundColor: c.subtle,
      marginBottom: spacing.md,
    },
    errorCard: {
      borderWidth: 1,
      borderColor: c.danger,
      gap: spacing.sm,
    },
    errorHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    errorTitle: {
      ...typography.cardTitle,
      color: c.ink,
      flex: 1,
    },
    retryButton: {
      alignSelf: 'flex-start',
      marginTop: spacing.sm,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.lg,
      borderRadius: radii.lg,
      backgroundColor: c.primary,
    },
    retryText: {
      ...typography.button,
      color: c.onPrimary,
    },
  });
}
