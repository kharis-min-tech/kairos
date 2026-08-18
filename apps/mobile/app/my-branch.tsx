import { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Linking,
  TextInput,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, Map, MapPin, Phone, Mail, Calendar, Pencil, ScanLine } from 'lucide-react-native';
import {
  Avatar,
  Badge,
  Button,
  Card,
  gradients,
  radii,
  spacing,
  typography,
  useThemedStyles,
  type ThemeColors,
  useColors,
} from '@kairos/ui-native';
import type { BranchWithRegion } from '@kairos/types';
import { alert } from '@/lib/alert';
import { api } from '@/lib/api-client';
import { useCapabilities } from '@/lib/capabilities';
import { useAuthStore } from '@/store/auth';

type Scope = 'home' | 'secondary';

export default function MyBranch() {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const branches = useQuery({
    queryKey: ['branches', 'public'],
    queryFn: async () => (await api.branches.listPublic()).data ?? [],
  });

  const home = branches.data?.find((b) => b.id === user?.homeBranchId) ?? null;
  const secondary = user?.secondaryBranchId
    ? branches.data?.find((b) => b.id === user.secondaryBranchId) ?? null
    : null;

  const [scope, setScope] = useState<Scope>('home');
  const active: BranchWithRegion | null = scope === 'home' ? home : secondary;

  const leadership = useQuery({
    queryKey: ['branch-leadership', active?.id],
    enabled: !!active?.id,
    queryFn: async () => (await api.leadership.list(active!.id)).data ?? [],
  });

  // Full authenticated branch record — needed for the self-check-in config,
  // since the public listing only projects id/name/region. Gated on
  // `branch:write` so BranchAdmin grants surface the settings card, not just
  // system admins.
  const caps = useCapabilities();
  const canManageBranch = active
    ? caps.has('branch:write', { kind: 'branch', id: active.id })
    : false;
  const branchDetail = useQuery({
    queryKey: ['branch-detail', active?.id],
    enabled: !!active?.id && canManageBranch,
    queryFn: async () => (await api.branches.get(active!.id)).data!,
  });

  const currentLeaders = useMemo(
    () => (leadership.data ?? []).filter((l) => l.isCurrent),
    [leadership.data],
  );
  const mainPastor = currentLeaders.find((l) => l.role === 'Main Pastor');
  const elders = currentLeaders.filter((l) => l.role === 'Elder');

  const refresh = () => {
    branches.refetch();
    leadership.refetch();
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerBar}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ChevronLeft color={c.ink} size={24} strokeWidth={1.5} />
        </Pressable>
        <Text style={styles.headerTitle}>My branch</Text>
        {active ? (
          <Pressable
            onPress={() => router.push(`/branches/edit/${active.id}`)}
            hitSlop={8}
            accessibilityLabel="Edit branch"
          >
            <Pencil color={c.primary} size={20} strokeWidth={1.5} />
          </Pressable>
        ) : (
          <View style={{ width: 24 }} />
        )}
      </View>

      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={branches.isFetching || leadership.isFetching}
            onRefresh={refresh}
            tintColor={c.primary}
          />
        }
      >
        {branches.isLoading ? (
          <ActivityIndicator color={c.primary} style={{ marginTop: spacing.xxl }} />
        ) : null}

        {!branches.isLoading && !home ? <EmptyState /> : null}

        {secondary ? (
          <View style={styles.chipsRow}>
            <Pressable
              onPress={() => setScope('home')}
              style={[styles.chip, scope === 'home' && styles.chipActive]}
            >
              <Text
                style={[styles.chipEyebrow, scope === 'home' && styles.chipLabelActive]}
              >
                HOME
              </Text>
              <Text
                style={[styles.chipLabel, scope === 'home' && styles.chipLabelActive]}
                numberOfLines={1}
              >
                {home?.branchName ?? '—'}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setScope('secondary')}
              style={[styles.chip, scope === 'secondary' && styles.chipActive]}
            >
              <Text
                style={[styles.chipEyebrow, scope === 'secondary' && styles.chipLabelActive]}
              >
                SECONDARY
              </Text>
              <Text
                style={[styles.chipLabel, scope === 'secondary' && styles.chipLabelActive]}
                numberOfLines={1}
              >
                {secondary.branchName}
              </Text>
            </Pressable>
          </View>
        ) : null}

        {active ? (
          <>
            <LinearGradient
              colors={gradients.brand}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.heroCard}
            >
              <View style={styles.heroBadgeRow}>
                <Text style={styles.heroEyebrow}>{active.regionName?.toUpperCase()}</Text>
                {active.branchType === 'Main' ? (
                  <Badge label="Main" variant="gold" size="sm" />
                ) : null}
              </View>
              <Text style={styles.heroTitle}>{active.branchName}</Text>
              {active.city ? (
                <Text style={styles.heroSub}>{active.city}</Text>
              ) : null}
            </LinearGradient>

            {(active.address || active.phone || active.email) ? (
              <Card padding="md" style={styles.section}>
                <Text style={styles.sectionEyebrow}>CONTACT</Text>
                {active.address ? (
                  <ContactRow
                    icon={MapPin}
                    label={[active.address, active.city, active.postalCode]
                      .filter(Boolean)
                      .join(', ')}
                    onPress={() =>
                      Linking.openURL(
                        `https://maps.google.com/?q=${encodeURIComponent(
                          [active.address, active.city, active.postalCode]
                            .filter(Boolean)
                            .join(', '),
                        )}`,
                      )
                    }
                  />
                ) : null}
                {active.phone ? (
                  <ContactRow
                    icon={Phone}
                    label={active.phone}
                    onPress={() => Linking.openURL(`tel:${active.phone}`)}
                  />
                ) : null}
                {active.email ? (
                  <ContactRow
                    icon={Mail}
                    label={active.email}
                    onPress={() => Linking.openURL(`mailto:${active.email}`)}
                  />
                ) : null}
              </Card>
            ) : null}

            {active.serviceSchedule && active.serviceSchedule.length > 0 ? (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionIconTile}>
                    <Calendar color={c.primary} size={16} strokeWidth={1.5} />
                  </View>
                  <Text style={styles.sectionHeaderText}>Services</Text>
                </View>
                {active.serviceSchedule.map((svc, idx) => (
                  <View key={`${svc.day}-${idx}`} style={styles.serviceRow}>
                    <Text style={styles.serviceDay}>{svc.day}</Text>
                    <Text style={styles.serviceType}>{svc.type}</Text>
                    <Text style={styles.serviceTime}>{svc.time}</Text>
                  </View>
                ))}
              </View>
            ) : null}

            {(mainPastor || elders.length > 0) ? (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionIconTile}>
                    <Map color={c.primary} size={16} strokeWidth={1.5} />
                  </View>
                  <Text style={styles.sectionHeaderText}>Leadership</Text>
                </View>
                {mainPastor ? (
                  <View style={styles.leaderCard}>
                    <Avatar
                      size="md"
                      photoUrl={mainPastor.memberPhotoUrl ?? undefined}
                      firstName={mainPastor.memberFirstName}
                      lastName={mainPastor.memberLastName}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.leaderRole}>MAIN PASTOR</Text>
                      <Text style={styles.leaderName}>
                        {mainPastor.memberFirstName} {mainPastor.memberLastName}
                      </Text>
                    </View>
                  </View>
                ) : null}
                {elders.map((elder) => (
                  <View key={elder.id} style={styles.leaderCard}>
                    <Avatar
                      size="md"
                      photoUrl={elder.memberPhotoUrl ?? undefined}
                      firstName={elder.memberFirstName}
                      lastName={elder.memberLastName}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.leaderRole}>ELDER</Text>
                      <Text style={styles.leaderName}>
                        {elder.memberFirstName} {elder.memberLastName}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            ) : null}

            {canManageBranch && branchDetail.data ? (
              <SelfCheckInSettingsCard branch={branchDetail.data} />
            ) : null}
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

interface SelfCheckInBranch {
  id: string;
  selfCheckInEnabled: boolean;
  selfCheckInOpenMinutesBefore: number;
  selfCheckInCloseMinutesAfter: number;
  selfCheckInLateAfterMinutes: number;
}

function SelfCheckInSettingsCard({ branch }: { branch: SelfCheckInBranch }) {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  const qc = useQueryClient();
  const [enabled, setEnabled] = useState(branch.selfCheckInEnabled);
  const [openBefore, setOpenBefore] = useState(String(branch.selfCheckInOpenMinutesBefore));
  const [closeAfter, setCloseAfter] = useState(String(branch.selfCheckInCloseMinutesAfter));
  const [lateAfter, setLateAfter] = useState(String(branch.selfCheckInLateAfterMinutes));

  // Rehydrate when the server row changes (e.g. after refresh).
  useEffect(() => {
    setEnabled(branch.selfCheckInEnabled);
    setOpenBefore(String(branch.selfCheckInOpenMinutesBefore));
    setCloseAfter(String(branch.selfCheckInCloseMinutesAfter));
    setLateAfter(String(branch.selfCheckInLateAfterMinutes));
  }, [branch]);

  const dirty =
    enabled !== branch.selfCheckInEnabled ||
    Number(openBefore) !== branch.selfCheckInOpenMinutesBefore ||
    Number(closeAfter) !== branch.selfCheckInCloseMinutesAfter ||
    Number(lateAfter) !== branch.selfCheckInLateAfterMinutes;

  const save = useMutation({
    mutationFn: async () => {
      const openN = Math.max(0, Math.min(240, Number(openBefore) || 0));
      const closeN = Math.max(0, Math.min(480, Number(closeAfter) || 0));
      const lateN = Math.max(0, Math.min(480, Number(lateAfter) || 0));
      const res = await api.branches.update(branch.id, {
        selfCheckInEnabled: enabled,
        selfCheckInOpenMinutesBefore: openN,
        selfCheckInCloseMinutesAfter: closeN,
        selfCheckInLateAfterMinutes: lateN,
      });
      if (!res.success) throw new Error(res.message ?? 'Save failed');
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['branch-detail', branch.id] });
      qc.invalidateQueries({ queryKey: ['attendance', 'self-check-in', 'candidates'] });
      alert.info('Saved', 'Self check-in settings updated.');
    },
    onError: (e: Error) =>
      alert.info('Could not save', e.message ?? 'Please try again.'),
  });

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionIconTile}>
          <ScanLine color={c.primary} size={16} strokeWidth={1.5} />
        </View>
        <Text style={styles.sectionHeaderText}>Self check-in</Text>
      </View>

      <Card padding="md" style={{ gap: spacing.md }}>
        <View style={styles.settingRow}>
          <View style={{ flex: 1, paddingRight: spacing.sm }}>
            <Text style={styles.settingTitle}>Enabled for this branch</Text>
            <Text style={styles.settingMeta}>
              When off, members won&apos;t see the &ldquo;I&apos;m here&rdquo; button.
              Attendance is only recorded by a desk volunteer.
            </Text>
          </View>
          <Switch
            value={enabled}
            onValueChange={setEnabled}
            trackColor={{ false: c.inkGhost, true: c.primary }}
            thumbColor="#ffffff"
          />
        </View>

        <MinuteField
          label="Opens (minutes before start)"
          value={openBefore}
          onChangeText={setOpenBefore}
          disabled={!enabled}
        />
        <MinuteField
          label="Closes (minutes after start)"
          value={closeAfter}
          onChangeText={setCloseAfter}
          disabled={!enabled}
          hint="Anyone tapping after this is told the desk needs to record them."
        />
        <MinuteField
          label="Marked Late after (minutes)"
          value={lateAfter}
          onChangeText={setLateAfter}
          disabled={!enabled}
          hint="Check-ins past this point stamp as Late instead of Present."
        />

        <Button
          label={save.isPending ? 'Saving…' : 'Save changes'}
          onPress={() => save.mutate()}
          loading={save.isPending}
          disabled={!dirty || save.isPending}
        />
      </Card>
    </View>
  );
}

function MinuteField({
  label,
  value,
  onChangeText,
  disabled,
  hint,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  disabled?: boolean;
  hint?: string;
}) {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  return (
    <View style={{ gap: 4 }}>
      <Text style={styles.settingTitle}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType="number-pad"
        editable={!disabled}
        style={[
          styles.minuteInput,
          disabled ? styles.minuteInputDisabled : null,
        ]}
      />
      {hint ? <Text style={styles.settingMeta}>{hint}</Text> : null}
    </View>
  );
}

function ContactRow({
  icon: Icon,
  label,
  onPress,
}: {
  icon: typeof MapPin;
  label: string;
  onPress: () => void;
}) {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  return (
    <Pressable onPress={onPress} style={styles.contactRow}>
      <View style={styles.contactIconTile}>
        <Icon color={c.primary} size={16} strokeWidth={1.5} />
      </View>
      <Text style={styles.contactLabel} numberOfLines={2}>
        {label}
      </Text>
    </Pressable>
  );
}

function EmptyState() {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  return (
    <Card padding="md" style={styles.emptyCard}>
      <View style={styles.emptyIconTile}>
        <Map color={c.primary} size={22} strokeWidth={1.5} />
      </View>
      <Text style={styles.emptyTitle}>No home branch set</Text>
      <Text style={styles.emptyMeta}>
        Complete onboarding to pick your home branch, or ask an admin to set one
        for you.
      </Text>
    </Card>
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
  chipsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  chip: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: c.subtle,
    alignItems: 'flex-start',
    gap: 2,
  },
  chipActive: { backgroundColor: c.primary },
  chipEyebrow: {
    ...typography.eyebrow,
    color: c.inkMuted,
    letterSpacing: 1.1,
    fontSize: 10,
  },
  chipLabel: { ...typography.meta, color: c.ink, fontWeight: '600' },
  chipLabelActive: { color: '#ffffff' },
  heroCard: {
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  heroBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  heroEyebrow: {
    ...typography.eyebrow,
    color: c.gold,
    letterSpacing: 1.2,
  },
  heroTitle: {
    ...typography.screenTitle,
    color: '#ffffff',
  },
  heroSub: {
    ...typography.body,
    color: 'rgba(255,255,255,0.85)',
  },
  section: {
    gap: spacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sectionIconTile: {
    width: 28,
    height: 28,
    borderRadius: radii.sm,
    backgroundColor: 'rgba(93,63,211,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeaderText: {
    ...typography.cardTitle,
    color: c.ink,
    flex: 1,
  },
  sectionEyebrow: {
    ...typography.eyebrow,
    color: c.inkMuted,
    marginBottom: spacing.xs,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  contactIconTile: {
    width: 32,
    height: 32,
    borderRadius: radii.sm,
    backgroundColor: 'rgba(93,63,211,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactLabel: {
    ...typography.body,
    color: c.ink,
    flex: 1,
  },
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: c.card,
    borderRadius: radii.md,
    padding: spacing.md,
  },
  serviceDay: {
    ...typography.meta,
    color: c.primary,
    fontWeight: '600',
    width: 90,
  },
  serviceType: {
    ...typography.body,
    color: c.ink,
    flex: 1,
  },
  serviceTime: {
    ...typography.body,
    color: c.inkMuted,
  },
  leaderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: c.card,
    borderRadius: radii.md,
    padding: spacing.md,
  },
  leaderRole: {
    ...typography.eyebrow,
    color: c.inkMuted,
  },
  leaderName: {
    ...typography.body,
    color: c.ink,
    fontWeight: '600',
  },
  emptyCard: {
    alignItems: 'center',
    gap: spacing.md,
  },
  emptyIconTile: {
    width: 56,
    height: 56,
    borderRadius: radii.lg,
    backgroundColor: 'rgba(93,63,211,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: { ...typography.cardTitle, color: c.ink },
  emptyMeta: {
    ...typography.body,
    color: c.inkMuted,
    textAlign: 'center',
    lineHeight: 20,
  },

  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingTitle: {
    ...typography.body,
    color: c.ink,
    fontWeight: '600',
  },
  settingMeta: {
    ...typography.meta,
    color: c.inkMuted,
    lineHeight: 16,
  },
  minuteInput: {
    borderWidth: 1,
    borderColor: c.inkGhost,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    ...typography.body,
    color: c.ink,
    backgroundColor: c.card,
  },
  minuteInputDisabled: {
    backgroundColor: c.subtle,
    color: c.inkFaded,
  },
});
}

