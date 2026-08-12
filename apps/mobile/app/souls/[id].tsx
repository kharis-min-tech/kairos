import { useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Linking,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ChevronLeft,
  Phone,
  Mail,
  MapPin,
  Heart,
  Check,
  BadgeCheck,
} from 'lucide-react-native';
import {
  Avatar,
  Badge,
  Card,
  colors,
  gradients,
  radii,
  spacing,
  typography,
} from '@kairos/ui-native';
import { formatShortDate } from '@kairos/core';
import { api } from '@/lib/api-client';

const STATUSES = [
  'New',
  'Following Up',
  'Interested',
  'Converted',
  'Not Interested',
  'Lost Contact',
] as const;
type Status = (typeof STATUSES)[number];

const STATUS_VARIANT: Record<
  string,
  'primary' | 'gold' | 'info' | 'success' | 'danger' | 'neutral'
> = {
  New: 'primary',
  'Following Up': 'gold',
  Interested: 'info',
  Converted: 'success',
  'Not Interested': 'danger',
  'Lost Contact': 'neutral',
};

export default function SoulDetail() {
  const router = useRouter();
  const qc = useQueryClient();
  const params = useLocalSearchParams<{ id: string }>();
  const id = params.id!;

  const soul = useQuery({
    queryKey: ['souls', id],
    enabled: !!id,
    queryFn: async () => (await api.souls.get(id)).data ?? null,
  });

  const followUps = useQuery({
    queryKey: ['souls', id, 'follow-ups'],
    enabled: !!id,
    queryFn: async () => (await api.souls.getFollowUps(id, { limit: 5 })).data ?? null,
  });

  const updateStatus = useMutation({
    mutationFn: (status: Status) => api.souls.updateStatus(id, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['souls'] });
      qc.invalidateQueries({ queryKey: ['souls', id] });
    },
  });

  const convert = useMutation({
    mutationFn: () => api.souls.convert(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['souls'] });
      qc.invalidateQueries({ queryKey: ['souls', id] });
    },
  });

  const s = soul.data as
    | {
        id: string;
        firstName: string;
        lastName: string;
        phone?: string | null;
        email?: string | null;
        address?: string | null;
        city?: string | null;
        status: string;
        outreachProgramName?: string | null;
        outreachId?: string | null;
        assignedMemberFirstName?: string | null;
        assignedMemberLastName?: string | null;
        assignedMemberId?: string | null;
        convertedToMemberId?: string | null;
        convertedMemberFirstName?: string | null;
        convertedMemberLastName?: string | null;
        daysSinceLastFollowUp?: number;
        isOverdue?: boolean;
        notes?: string | null;
        createdAt: string | Date;
      }
    | null
    | undefined;

  const followUpsList = useMemo(() => {
    const raw = followUps.data as
      | { data?: Record<string, unknown>[] }
      | Record<string, unknown>[]
      | null
      | undefined;
    if (!raw) return [];
    return Array.isArray(raw) ? raw : (raw.data ?? []);
  }, [followUps.data]);

  function handleStatusChange(newStatus: Status) {
    if (!s) return;
    if (newStatus === s.status) return;
    updateStatus.mutate(newStatus, {
      onError: (err) =>
        Alert.alert(
          'Update failed',
          err instanceof Error ? err.message : 'Please try again.',
        ),
    });
  }

  function confirmConvert() {
    if (!s) return;
    if (s.convertedToMemberId) {
      Alert.alert('Already converted', 'This soul has already been converted to a member.');
      return;
    }
    Alert.alert(
      'Convert to member?',
      `Convert ${s.firstName} ${s.lastName} into a full member record. This creates a new Member and links it to this soul.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Convert',
          onPress: () =>
            convert.mutate(undefined, {
              onError: (err) =>
                Alert.alert(
                  'Convert failed',
                  err instanceof Error ? err.message : 'Please try again.',
                ),
            }),
        },
      ],
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerBar}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ChevronLeft color={colors.ink} size={24} strokeWidth={1.5} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {s ? `${s.firstName} ${s.lastName}` : 'Soul'}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={soul.isFetching || followUps.isFetching}
            onRefresh={() => {
              soul.refetch();
              followUps.refetch();
            }}
            tintColor={colors.primary}
          />
        }
      >
        {soul.isLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xxl }} />
        ) : null}

        {soul.isError || (!soul.isLoading && !s) ? (
          <Card padding="md">
            <Text style={styles.errorLine}>
              {soul.error instanceof Error
                ? soul.error.message
                : "Couldn't load this soul."}
            </Text>
          </Card>
        ) : null}

        {s ? (
          <>
            <LinearGradient
              colors={gradients.brand}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.heroCard}
            >
              <Avatar size="lg" firstName={s.firstName} lastName={s.lastName} />
              <View style={styles.heroBadgeRow}>
                <Badge
                  label={s.status}
                  variant={STATUS_VARIANT[s.status] ?? 'neutral'}
                  size="sm"
                />
                {s.isOverdue ? (
                  <View style={styles.heroBadgePillRed}>
                    <Text style={styles.heroBadgePillRedLabel}>OVERDUE</Text>
                  </View>
                ) : null}
                {s.convertedToMemberId ? (
                  <View style={styles.heroBadgePillGold}>
                    <BadgeCheck color={colors.gold} size={10} strokeWidth={2} />
                    <Text style={styles.heroBadgePillGoldLabel}>CONVERTED</Text>
                  </View>
                ) : null}
              </View>
              <Text style={styles.heroName}>
                {s.firstName} {s.lastName}
              </Text>
              <Text style={styles.heroMeta}>
                Captured {formatShortDate(s.createdAt)}
              </Text>
            </LinearGradient>

            {(s.phone || s.email || s.address) ? (
              <Card padding="md" style={{ gap: spacing.sm }}>
                <Text style={styles.sectionEyebrow}>CONTACT</Text>
                {s.phone ? (
                  <Pressable
                    onPress={() => Linking.openURL(`tel:${s.phone}`)}
                    style={styles.contactRow}
                  >
                    <View style={styles.contactIconTile}>
                      <Phone color={colors.primary} size={16} strokeWidth={1.5} />
                    </View>
                    <Text style={styles.contactValue}>{s.phone}</Text>
                  </Pressable>
                ) : null}
                {s.email ? (
                  <Pressable
                    onPress={() => Linking.openURL(`mailto:${s.email}`)}
                    style={styles.contactRow}
                  >
                    <View style={styles.contactIconTile}>
                      <Mail color={colors.primary} size={16} strokeWidth={1.5} />
                    </View>
                    <Text style={styles.contactValue} numberOfLines={1}>
                      {s.email}
                    </Text>
                  </Pressable>
                ) : null}
                {s.address || s.city ? (
                  <Pressable
                    onPress={() =>
                      Linking.openURL(
                        `https://maps.google.com/?q=${encodeURIComponent(
                          [s.address, s.city].filter(Boolean).join(', '),
                        )}`,
                      )
                    }
                    style={styles.contactRow}
                  >
                    <View style={styles.contactIconTile}>
                      <MapPin color={colors.primary} size={16} strokeWidth={1.5} />
                    </View>
                    <Text style={styles.contactValue}>
                      {[s.address, s.city].filter(Boolean).join(', ')}
                    </Text>
                  </Pressable>
                ) : null}
              </Card>
            ) : null}

            <Card padding="md" style={{ gap: spacing.sm }}>
              <Text style={styles.sectionEyebrow}>STATUS</Text>
              <View style={styles.statusRow}>
                {STATUSES.map((st) => {
                  const active = s.status === st;
                  return (
                    <Pressable
                      key={st}
                      onPress={() => handleStatusChange(st)}
                      disabled={updateStatus.isPending}
                      style={[styles.statusChip, active && styles.statusChipActive]}
                    >
                      {active ? (
                        <Check color="#ffffff" size={12} strokeWidth={2} />
                      ) : null}
                      <Text
                        style={[
                          styles.statusChipLabel,
                          active && styles.statusChipLabelActive,
                        ]}
                      >
                        {st}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              <Text style={styles.helpText}>
                Tap a status to update. Full follow-up history and reassignment live
                on the web for now.
              </Text>
            </Card>

            <Card padding="md" style={{ gap: spacing.sm }}>
              <Text style={styles.sectionEyebrow}>ASSIGNMENT</Text>
              {s.assignedMemberFirstName ? (
                <Pressable
                  onPress={() =>
                    s.assignedMemberId
                      ? router.push(`/members/${s.assignedMemberId}`)
                      : null
                  }
                  style={styles.assignedRow}
                >
                  <Avatar
                    size="sm"
                    firstName={s.assignedMemberFirstName}
                    lastName={s.assignedMemberLastName ?? undefined}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.memberName}>
                      {s.assignedMemberFirstName} {s.assignedMemberLastName ?? ''}
                    </Text>
                    <Text style={styles.memberMeta}>Following up</Text>
                  </View>
                </Pressable>
              ) : (
                <Text style={styles.emptyLine}>
                  Not assigned to anyone yet. Reassignment lives on the web.
                </Text>
              )}
              {typeof s.daysSinceLastFollowUp === 'number' ? (
                <Text style={styles.helpText}>
                  Last follow-up: {s.daysSinceLastFollowUp === 0
                    ? 'today'
                    : `${s.daysSinceLastFollowUp} day${s.daysSinceLastFollowUp === 1 ? '' : 's'} ago`}
                </Text>
              ) : null}
            </Card>

            {followUpsList.length > 0 ? (
              <Card padding="md" style={{ gap: spacing.sm }}>
                <Text style={styles.sectionEyebrow}>RECENT FOLLOW-UPS</Text>
                {followUpsList.slice(0, 5).map((f, idx) => {
                  const followUp = f as {
                    id?: string;
                    followUpDate?: string | Date;
                    contactMethod?: string | null;
                    contactStatus?: string;
                    notes?: string | null;
                  };
                  return (
                    <View
                      key={followUp.id ?? idx}
                      style={[
                        styles.followUpRow,
                        idx > 0 ? styles.rowDivider : null,
                      ]}
                    >
                      <Text style={styles.followUpDate}>
                        {followUp.followUpDate
                          ? formatShortDate(followUp.followUpDate as string | Date)
                          : '—'}
                      </Text>
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text style={styles.followUpTitle}>
                          {followUp.contactMethod ?? 'Contact'} ·{' '}
                          {followUp.contactStatus ?? '—'}
                        </Text>
                        {followUp.notes ? (
                          <Text style={styles.followUpNotes} numberOfLines={2}>
                            {followUp.notes}
                          </Text>
                        ) : null}
                      </View>
                    </View>
                  );
                })}
              </Card>
            ) : null}

            {s.outreachProgramName ? (
              <Pressable
                onPress={() =>
                  s.outreachId ? router.push(`/outreach/${s.outreachId}`) : null
                }
              >
                <Card padding="md" style={styles.linkCard}>
                  <View style={styles.linkIconTile}>
                    <Heart color={colors.primary} size={18} strokeWidth={1.5} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.linkTitle}>Captured at</Text>
                    <Text style={styles.linkMeta}>{s.outreachProgramName}</Text>
                  </View>
                </Card>
              </Pressable>
            ) : null}

            {s.notes ? (
              <Card padding="md" style={{ gap: spacing.xs }}>
                <Text style={styles.sectionEyebrow}>NOTES</Text>
                <Text style={styles.notesBody}>{s.notes}</Text>
              </Card>
            ) : null}

            {!s.convertedToMemberId ? (
              <Pressable
                style={[
                  styles.convertBtn,
                  convert.isPending && { opacity: 0.6 },
                ]}
                onPress={confirmConvert}
                disabled={convert.isPending}
              >
                <BadgeCheck color="#ffffff" size={16} strokeWidth={1.5} />
                <Text style={styles.convertBtnLabel}>
                  {convert.isPending ? 'Converting…' : 'Convert to member'}
                </Text>
              </Pressable>
            ) : s.convertedMemberFirstName ? (
              <Pressable
                onPress={() =>
                  s.convertedToMemberId
                    ? router.push(`/members/${s.convertedToMemberId}`)
                    : null
                }
              >
                <Card padding="md" style={styles.linkCard}>
                  <View style={styles.linkIconTile}>
                    <BadgeCheck color={colors.success} size={18} strokeWidth={1.5} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.linkTitle}>Converted to member</Text>
                    <Text style={styles.linkMeta}>
                      {s.convertedMemberFirstName} {s.convertedMemberLastName ?? ''}
                    </Text>
                  </View>
                </Card>
              </Pressable>
            ) : null}
          </>
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
  headerTitle: { ...typography.cardTitle, color: colors.ink, flex: 1, textAlign: 'center' },
  container: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  heroCard: {
    borderRadius: radii.lg,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
  },
  heroBadgeRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: spacing.xs,
  },
  heroBadgePillRed: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(225,29,72,0.35)',
  },
  heroBadgePillRedLabel: {
    ...typography.eyebrow,
    color: '#ffffff',
    fontSize: 9,
  },
  heroBadgePillGold: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(248,181,55,0.25)',
  },
  heroBadgePillGoldLabel: {
    ...typography.eyebrow,
    color: colors.gold,
    fontSize: 9,
  },
  heroName: {
    ...typography.screenTitle,
    color: '#ffffff',
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  heroMeta: {
    ...typography.meta,
    color: 'rgba(255,255,255,0.75)',
  },
  sectionEyebrow: {
    ...typography.eyebrow,
    color: 'rgba(26,28,28,0.55)',
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  contactIconTile: {
    width: 28,
    height: 28,
    borderRadius: radii.sm,
    backgroundColor: 'rgba(93,63,211,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactValue: {
    ...typography.body,
    color: colors.ink,
    flex: 1,
  },
  statusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: 'rgba(26,28,28,0.12)',
    backgroundColor: colors.cardLight,
  },
  statusChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  statusChipLabel: {
    ...typography.meta,
    color: colors.ink,
    fontWeight: '600',
  },
  statusChipLabelActive: {
    color: '#ffffff',
  },
  helpText: {
    ...typography.meta,
    color: 'rgba(26,28,28,0.55)',
    lineHeight: 15,
  },
  assignedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  memberName: { ...typography.body, color: colors.ink, fontWeight: '600' },
  memberMeta: { ...typography.meta, color: 'rgba(26,28,28,0.6)' },
  emptyLine: {
    ...typography.body,
    color: 'rgba(26,28,28,0.55)',
    lineHeight: 19,
  },
  followUpRow: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  rowDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(26,28,28,0.08)',
  },
  followUpDate: {
    ...typography.meta,
    color: colors.primary,
    fontWeight: '700',
    minWidth: 60,
  },
  followUpTitle: { ...typography.body, color: colors.ink, fontWeight: '500' },
  followUpNotes: {
    ...typography.meta,
    color: 'rgba(26,28,28,0.6)',
    lineHeight: 16,
  },
  linkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  linkIconTile: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    backgroundColor: 'rgba(93,63,211,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkTitle: { ...typography.eyebrow, color: 'rgba(26,28,28,0.55)' },
  linkMeta: {
    ...typography.body,
    color: colors.ink,
    fontWeight: '600',
    marginTop: 2,
  },
  notesBody: {
    ...typography.body,
    color: colors.ink,
    lineHeight: 20,
  },
  convertBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.success,
  },
  convertBtnLabel: {
    ...typography.button,
    color: '#ffffff',
  },
  errorLine: {
    ...typography.body,
    color: colors.danger,
  },
});
