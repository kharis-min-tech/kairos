import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import {
  ChevronLeft,
  Calendar,
  MapPin,
  Users,
  Heart,
  ChevronRight,
} from 'lucide-react-native';
import {
  Badge,
  Card,
  colors,
  gradients,
  radii,
  spacing,
  typography,
} from '@kairos/ui-native';
import type { OutreachProgramWithDetails } from '@kairos/types';
import { formatShortDate } from '@kairos/core';
import { api } from '@/lib/api-client';

export default function OutreachDetail() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const id = params.id!;

  const program = useQuery({
    queryKey: ['outreach', 'programs', id],
    enabled: !!id,
    queryFn: async () =>
      ((await api.outreach.programs.get(id)).data ?? null) as OutreachProgramWithDetails | null,
  });

  // The souls list endpoint accepts an outreachId filter — surface the top 8
  // souls captured for this program as a preview, with a link to the full list.
  const souls = useQuery({
    queryKey: ['souls', { outreachId: id }],
    enabled: !!id,
    queryFn: async () => {
      const res = await api.souls.list({ outreachId: id, limit: 8 });
      return res.data?.data ?? [];
    },
  });

  const p = program.data;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerBar}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ChevronLeft color={colors.ink} size={24} strokeWidth={1.5} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {p?.programName ?? 'Outreach'}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={program.isFetching || souls.isFetching}
            onRefresh={() => {
              program.refetch();
              souls.refetch();
            }}
            tintColor={colors.primary}
          />
        }
      >
        {program.isLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xxl }} />
        ) : null}

        {program.isError || (!program.isLoading && !p) ? (
          <Card padding="md">
            <Text style={styles.errorLine}>
              {program.error instanceof Error
                ? program.error.message
                : "Couldn't load this program."}
            </Text>
          </Card>
        ) : null}

        {p ? (
          <>
            <LinearGradient
              colors={gradients.brand}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.heroCard}
            >
              <View style={styles.heroBadgeRow}>
                <View style={styles.heroBadgePill}>
                  <Text style={styles.heroBadgePillLabel}>OUTREACH</Text>
                </View>
                {p.isCompleted ? (
                  <View style={styles.heroBadgePillGold}>
                    <Text style={styles.heroBadgePillGoldLabel}>COMPLETED</Text>
                  </View>
                ) : null}
              </View>
              <Text style={styles.heroTitle}>{p.programName}</Text>
              {p.branchName ? <Text style={styles.heroBranch}>{p.branchName}</Text> : null}
              {p.description ? (
                <Text style={styles.heroDescription}>{p.description}</Text>
              ) : null}
              <View style={styles.heroMetaRow}>
                <Calendar color="rgba(255,255,255,0.85)" size={14} strokeWidth={1.5} />
                <Text style={styles.heroMetaLabel}>
                  {formatShortDate(p.programDate)}
                </Text>
              </View>
              {p.location ? (
                <View style={styles.heroMetaRow}>
                  <MapPin color="rgba(255,255,255,0.85)" size={14} strokeWidth={1.5} />
                  <Text style={styles.heroMetaLabel}>{p.location}</Text>
                </View>
              ) : null}
            </LinearGradient>

            {(p.address || p.city) ? (
              <Card padding="md" style={{ gap: spacing.xs }}>
                <Text style={styles.sectionEyebrow}>ADDRESS</Text>
                <Pressable
                  onPress={() =>
                    Linking.openURL(
                      `https://maps.google.com/?q=${encodeURIComponent(
                        [p.address, p.city].filter(Boolean).join(', '),
                      )}`,
                    )
                  }
                  style={styles.contactRow}
                >
                  <View style={styles.contactIconTile}>
                    <MapPin color={colors.primary} size={16} strokeWidth={1.5} />
                  </View>
                  <Text style={styles.contactValue}>
                    {[p.address, p.city].filter(Boolean).join(', ')}
                  </Text>
                </Pressable>
              </Card>
            ) : null}

            <Card padding="md" style={{ gap: spacing.sm }}>
              <Text style={styles.sectionEyebrow}>PROGRAM</Text>
              <View style={styles.statsGrid}>
                <View style={styles.statTile}>
                  <Text style={styles.statNumber}>
                    {p.totalSoulsReached ?? 0}
                  </Text>
                  <Text style={styles.statLabel}>Souls reached</Text>
                </View>
                {typeof p.participantCount === 'number' ? (
                  <View style={styles.statTile}>
                    <Text style={styles.statNumber}>{p.participantCount}</Text>
                    <Text style={styles.statLabel}>Workers</Text>
                  </View>
                ) : null}
              </View>
              {p.coordinatorFirstName ? (
                <Text style={styles.coordinator}>
                  Coordinator: {p.coordinatorFirstName} {p.coordinatorLastName ?? ''}
                </Text>
              ) : null}
            </Card>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionIconTile}>
                  <Heart color={colors.primary} size={14} strokeWidth={1.5} />
                </View>
                <Text style={styles.sectionTitle}>Souls captured</Text>
                <Badge
                  label={String(souls.data?.length ?? 0)}
                  variant="neutral"
                  size="sm"
                />
              </View>
              {souls.isLoading ? (
                <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.sm }} />
              ) : (souls.data ?? []).length === 0 ? (
                <Card padding="md">
                  <Text style={styles.emptyLine}>
                    No souls captured on this program yet. Capture happens on the web,
                    or via the Souls pipeline in Follow-ups.
                  </Text>
                </Card>
              ) : (
                <View style={{ gap: spacing.xs }}>
                  {(souls.data ?? []).map((s: {
                    id: string;
                    firstName: string;
                    lastName: string;
                    status: string;
                    phone?: string | null;
                  }) => (
                    <Pressable
                      key={s.id}
                      onPress={() => router.push(`/souls/${s.id}`)}
                    >
                      <Card padding="md" style={styles.soulRow}>
                        <View style={styles.soulIconTile}>
                          <Users color={colors.primary} size={16} strokeWidth={1.5} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.soulName} numberOfLines={1}>
                            {s.firstName} {s.lastName}
                          </Text>
                          <Text style={styles.soulMeta} numberOfLines={1}>
                            {s.status}
                            {s.phone ? ` · ${s.phone}` : ''}
                          </Text>
                        </View>
                        <ChevronRight
                          color="rgba(26,28,28,0.3)"
                          size={16}
                          strokeWidth={1.5}
                        />
                      </Card>
                    </Pressable>
                  ))}
                </View>
              )}
              <Pressable onPress={() => router.push('/souls')}>
                <Text style={styles.viewAllLink}>View full souls pipeline →</Text>
              </Pressable>
            </View>
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
    gap: spacing.xs,
  },
  heroBadgeRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  heroBadgePill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  heroBadgePillLabel: {
    ...typography.eyebrow,
    color: '#ffffff',
    fontSize: 9,
  },
  heroBadgePillGold: {
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
  heroTitle: { ...typography.screenTitle, color: '#ffffff' },
  heroBranch: { ...typography.meta, color: 'rgba(255,255,255,0.75)' },
  heroDescription: {
    ...typography.body,
    color: 'rgba(255,255,255,0.85)',
    marginTop: spacing.sm,
    lineHeight: 20,
  },
  heroMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  heroMetaLabel: {
    ...typography.body,
    color: 'rgba(255,255,255,0.85)',
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
  statsGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  statTile: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: 'rgba(93,63,211,0.06)',
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.primary,
  },
  statLabel: {
    ...typography.meta,
    color: 'rgba(26,28,28,0.6)',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  coordinator: {
    ...typography.meta,
    color: 'rgba(26,28,28,0.65)',
    marginTop: spacing.xs,
  },
  section: { gap: spacing.sm },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sectionIconTile: {
    width: 24,
    height: 24,
    borderRadius: radii.sm,
    backgroundColor: 'rgba(93,63,211,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: { ...typography.cardTitle, color: colors.ink, flex: 1 },
  soulRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  soulIconTile: {
    width: 32,
    height: 32,
    borderRadius: radii.sm,
    backgroundColor: 'rgba(93,63,211,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  soulName: { ...typography.body, color: colors.ink, fontWeight: '500' },
  soulMeta: { ...typography.meta, color: 'rgba(26,28,28,0.6)' },
  emptyLine: {
    ...typography.body,
    color: 'rgba(26,28,28,0.55)',
    textAlign: 'center',
    lineHeight: 20,
  },
  viewAllLink: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
    fontSize: 13,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  errorLine: {
    ...typography.body,
    color: colors.danger,
  },
});
