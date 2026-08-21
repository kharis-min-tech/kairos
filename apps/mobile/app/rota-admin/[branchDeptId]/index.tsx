import { useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Modal,
  KeyboardAvoidingView,
  Platform,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Plus,
  Repeat,
  Zap,
} from 'lucide-react-native';
import {
  Avatar,
  Badge,
  Button,
  Card,
  DatePicker,
  radii,
  spacing,
  typography,
  useThemedStyles,
  type ThemeColors,
  useColors,
} from '@kairos/ui-native';
import { formatShortDate } from '@kairos/core';
import type {
  RotaTemplateWithSummary,
  RotaInstanceWithSummary,
} from '@kairos/types';
import { api } from '@/lib/api-client';
import { useCapabilities, useRequireCapability } from '@/lib/capabilities';
import { alert } from '@/lib/alert';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * Rota admin — templates & instances for a single branch department.
 *
 * Full parity with web: templates, roles, pool, and instance drill-down all
 * live on-device. Tap a template to edit its metadata / roles / pool; the
 * "+ New" button creates a fresh template.
 */
export default function RotaAdmin() {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  const router = useRouter();
  const { branchDeptId } = useLocalSearchParams<{ branchDeptId: string }>();
  const qc = useQueryClient();

  const dept = useQuery({
    queryKey: ['branch-dept', branchDeptId],
    enabled: !!branchDeptId,
    queryFn: async () => (await api.departments.get(branchDeptId!)).data!,
  });

  // Rota admin requires department:write on this branch-dept OR branch:write
  // on the parent branch (auto-passes for system admins). Gate once dept has
  // loaded — the read itself is scoped by the API too, so a 403 is safe.
  const caps = useCapabilities();
  const canAccess =
    !dept.data
      ? true // still loading — don't redirect yet
      : caps.systemRole === 'admin' ||
        caps.has('department:write', {
          kind: 'department',
          id: branchDeptId!,
          branchId: dept.data.branchId,
        }) ||
        caps.has('branch:write', { kind: 'branch', id: dept.data.branchId });
  useRequireCapability(canAccess);

  const templates = useQuery({
    queryKey: ['rota', 'templates', branchDeptId],
    enabled: !!branchDeptId,
    queryFn: async () =>
      (await api.departments.rota.listTemplates(branchDeptId!)).data ?? [],
  });

  const stats = useQuery({
    queryKey: ['rota', 'stats', branchDeptId],
    enabled: !!branchDeptId,
    queryFn: async () =>
      (await api.departments.rota.rotaStats(branchDeptId!, { windowDays: 60 })).data ?? null,
  });

  const instances = useQuery({
    queryKey: ['rota', 'instances', branchDeptId],
    enabled: !!branchDeptId,
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10);
      const in90 = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10);
      return (
        await api.departments.rota.listInstances(branchDeptId!, {
          from: today,
          to: in90,
        })
      ).data ?? [];
    },
  });

  const [genFor, setGenFor] = useState<RotaTemplateWithSummary | null>(null);
  const [genWeeks, setGenWeeks] = useState('4');
  const [genStart, setGenStart] = useState(
    new Date().toISOString().slice(0, 10),
  );

  const generate = useMutation({
    mutationFn: async ({ template }: { template: RotaTemplateWithSummary }) => {
      const weeks = Math.max(1, Math.min(52, Number(genWeeks) || 4));
      const res = await api.departments.rota.generate(branchDeptId!, template.id, {
        weeks,
        startDate: genStart,
      });
      if (!res.success) throw new Error(res.message ?? 'Generation failed');
      return res.data!;
    },
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ['rota', 'instances', branchDeptId] });
      qc.invalidateQueries({ queryKey: ['rota', 'templates', branchDeptId] });
      qc.invalidateQueries({ queryKey: ['rota', 'stats', branchDeptId] });
      setGenFor(null);
      alert.info(
        'Generated',
        `${r.instanceCount} instance${r.instanceCount === 1 ? '' : 's'}, ${r.assignmentCount} assignments, ${r.openSlotCount} open slots.`,
      );
    },
    onError: (e: Error) =>
      alert.info('Generation failed', e.message ?? 'Please try again.'),
  });

  const rows = useMemo(() => templates.data ?? [], [templates.data]);
  const instRows = useMemo(
    () => (instances.data ?? []).slice().sort((a, b) => a.serviceDate.localeCompare(b.serviceDate)),
    [instances.data],
  );

  const refresh = () => {
    templates.refetch();
    stats.refetch();
    instances.refetch();
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerBar}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ChevronLeft color={c.ink} size={24} strokeWidth={1.5} />
        </Pressable>
        <Text style={styles.headerTitle}>
          {dept.data?.departmentName ?? 'Rota'}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={templates.isFetching || instances.isFetching}
            onRefresh={refresh}
            tintColor={c.primary}
          />
        }
      >
        {stats.data ? (
          <View style={styles.statRow}>
            <StatTile label="Upcoming" value={stats.data.upcomingCount} tone={c.primary} />
            <StatTile label="Published" value={stats.data.publishedCount} tone={c.success} />
            <StatTile label="Draft" value={stats.data.draftCount} tone={c.gold} />
          </View>
        ) : null}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Templates</Text>
            <Pressable
              onPress={() =>
                router.push(`/rota-admin/${branchDeptId}/template/new` as never)
              }
              style={styles.newBtn}
              hitSlop={6}
            >
              <Plus color={c.primary} size={14} strokeWidth={2} />
              <Text style={styles.newBtnLabel}>New</Text>
            </Pressable>
          </View>
          {templates.isLoading ? (
            <ActivityIndicator color={c.primary} style={{ marginTop: spacing.md }} />
          ) : rows.length === 0 ? (
            <Card padding="md">
              <Text style={styles.emptyText}>
                No templates yet. Tap New to set up your first one — pick a
                weekday, add roles, and add pool members.
              </Text>
            </Card>
          ) : (
            rows.map((t) => (
              <TemplateRow
                key={t.id}
                template={t}
                onOpen={() =>
                  router.push(
                    `/rota-admin/${branchDeptId}/template/${t.id}` as never,
                  )
                }
                onGenerate={() => {
                  setGenFor(t);
                  setGenWeeks('4');
                  setGenStart(new Date().toISOString().slice(0, 10));
                }}
              />
            ))
          )}
        </View>

        <Pressable
          style={styles.linkCard}
          onPress={() =>
            router.push(`/rota-admin/${branchDeptId}/swap-requests` as never)
          }
        >
          <View style={styles.linkIconTile}>
            <Repeat color={c.primary} size={16} strokeWidth={1.5} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={styles.linkTitle}>Swap requests</Text>
            <Text style={styles.linkMeta}>Approve or reject pending swaps</Text>
          </View>
          <ChevronRight color={c.inkVeryFaded} size={16} strokeWidth={1.5} />
        </Pressable>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Upcoming instances</Text>
          {instances.isLoading ? (
            <ActivityIndicator color={c.primary} style={{ marginTop: spacing.md }} />
          ) : instRows.length === 0 ? (
            <Card padding="md">
              <Text style={styles.emptyText}>
                No upcoming instances. Tap Generate on a template above.
              </Text>
            </Card>
          ) : (
            instRows.map((i) => (
              <InstanceRow
                key={i.id}
                instance={i}
                onPress={() =>
                  router.push(`/rota-admin/${branchDeptId}/instance/${i.id}` as never)
                }
              />
            ))
          )}
        </View>
      </ScrollView>

      {genFor ? (
        <GenerateSheet
          template={genFor}
          weeks={genWeeks}
          startDate={genStart}
          onWeeksChange={setGenWeeks}
          onStartChange={setGenStart}
          onCancel={() => setGenFor(null)}
          onConfirm={() => generate.mutate({ template: genFor })}
          submitting={generate.isPending}
        />
      ) : null}
    </SafeAreaView>
  );
}

function TemplateRow({
  template,
  onOpen,
  onGenerate,
}: {
  template: RotaTemplateWithSummary;
  onOpen: () => void;
  onGenerate: () => void;
}) {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  const last = template.lastGeneratedAt
    ? `last generated ${formatShortDate(template.lastGeneratedAt)}`
    : 'never generated';
  return (
    <Pressable onPress={onOpen}>
      <Card padding="md" style={styles.templateRow}>
        <View style={styles.templateIconTile}>
          <ClipboardList color={c.primary} size={16} strokeWidth={1.5} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <View style={styles.templateTitleLine}>
            <Text style={styles.templateName} numberOfLines={1}>
              {template.name}
            </Text>
            <Badge label={WEEKDAYS[template.weekday] ?? '?'} variant="primary" size="sm" />
          </View>
          <Text style={styles.templateMeta}>
            {template.slotCount} role{template.slotCount === 1 ? '' : 's'} ·{' '}
            {template.positionCount} position{template.positionCount === 1 ? '' : 's'} ·{' '}
            {template.poolCount} in pool
          </Text>
          <Text style={styles.templateMetaFaded}>{last}</Text>
        </View>
        <Pressable onPress={onGenerate} style={styles.generateBtn} hitSlop={6}>
          <Zap color="#ffffff" size={14} strokeWidth={2} />
          <Text style={styles.generateLabel}>Generate</Text>
        </Pressable>
      </Card>
    </Pressable>
  );
}

function InstanceRow({
  instance,
  onPress,
}: {
  instance: RotaInstanceWithSummary;
  onPress: () => void;
}) {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  return (
    <Pressable onPress={onPress}>
      <Card padding="md" style={styles.instanceRow}>
        <View style={styles.dateTile}>
          <Text style={styles.dateTileMonth}>
            {new Date(instance.serviceDate)
              .toLocaleDateString('en-GB', { month: 'short' })
              .toUpperCase()}
          </Text>
          <Text style={styles.dateTileDay}>
            {new Date(instance.serviceDate).getDate()}
          </Text>
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <View style={styles.instanceTitleLine}>
            <Text style={styles.instanceName} numberOfLines={1}>
              {instance.templateName ?? 'Instance'}
            </Text>
            <Badge
              label={instance.status}
              variant={instance.status === 'Published' ? 'success' : 'gold'}
              size="sm"
            />
          </View>
          <Text style={styles.instanceMeta}>
            {instance.filledSlots}/{instance.totalSlots} slots filled
            {instance.openSlots > 0 ? ` · ${instance.openSlots} open` : ''}
          </Text>
          {instance.assignedMembers.length > 0 ? (
            <View style={styles.assigneeRow}>
              {instance.assignedMembers.slice(0, 5).map((m) => (
                <Avatar
                  key={m.memberId}
                  size={20}
                  photoUrl={m.photoUrl ?? undefined}
                  firstName={m.firstName}
                  lastName={m.lastName}
                />
              ))}
              {instance.assignedMembers.length > 5 ? (
                <Text style={styles.assigneeMore}>
                  +{instance.assignedMembers.length - 5}
                </Text>
              ) : null}
            </View>
          ) : null}
        </View>
        <ChevronRight color={c.inkVeryFaded} size={16} strokeWidth={1.5} />
      </Card>
    </Pressable>
  );
}

function StatTile({ label, value, tone }: { label: string; value: number; tone: string }) {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  return (
    <View style={[styles.statTile, { borderLeftColor: tone }]}>
      <Text style={[styles.statValue, { color: tone }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function GenerateSheet({
  template,
  weeks,
  startDate,
  onWeeksChange,
  onStartChange,
  onCancel,
  onConfirm,
  submitting,
}: {
  template: RotaTemplateWithSummary;
  weeks: string;
  startDate: string;
  onWeeksChange: (v: string) => void;
  onStartChange: (v: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
  submitting: boolean;
}) {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onCancel}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Pressable style={styles.backdrop} onPress={submitting ? undefined : onCancel}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Generate rota</Text>
            <Text style={styles.sheetMeta}>
              {template.name} · {template.slotCount} role
              {template.slotCount === 1 ? '' : 's'} · {template.poolCount} in pool
            </Text>
            <Text style={styles.sheetHint}>
              Auto-assigns members from the pool by rotation for each service
              date in the range. Existing instances in range keep their
              assignments — no double-booking.
            </Text>

            <DatePicker
              label="Start date"
              value={startDate}
              onChange={onStartChange}
              disabled={submitting}
            />

            <Text style={styles.sheetLabel}>Weeks to generate</Text>
            <TextInput
              value={weeks}
              onChangeText={onWeeksChange}
              placeholder="4"
              placeholderTextColor={c.inkFaded}
              style={styles.sheetInput}
              keyboardType="number-pad"
              editable={!submitting}
            />

            <View style={styles.sheetFooter}>
              <View style={{ flex: 1 }}>
                <Button
                  label="Cancel"
                  variant="ghost"
                  onPress={onCancel}
                  disabled={submitting}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Button
                  label={submitting ? 'Generating…' : 'Generate'}
                  onPress={onConfirm}
                  loading={submitting}
                  disabled={
                    !startDate ||
                    Number(weeks) < 1 ||
                    template.poolCount === 0
                  }
                />
              </View>
            </View>
            {template.poolCount === 0 ? (
              <Text style={styles.sheetWarning}>
                Tap the template to add pool members before generating.
              </Text>
            ) : null}
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
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

  statRow: { flexDirection: 'row', gap: spacing.xs },
  statTile: {
    flex: 1,
    backgroundColor: c.card,
    borderRadius: radii.md,
    padding: spacing.sm,
    borderLeftWidth: 3,
    gap: 2,
  },
  statValue: { fontSize: 20, fontWeight: '800' },
  statLabel: { ...typography.meta, color: c.inkMuted, fontWeight: '600' },

  section: { gap: spacing.sm },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xs,
  },
  sectionTitle: {
    ...typography.eyebrow,
    color: c.inkMuted,
    paddingHorizontal: spacing.xs,
    flex: 1,
  },
  newBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(93,63,211,0.1)',
  },
  newBtnLabel: { ...typography.meta, color: c.primary, fontWeight: '700' },
  linkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: c.card,
    borderRadius: radii.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(93,63,211,0.12)',
  },
  linkIconTile: {
    width: 36,
    height: 36,
    borderRadius: radii.sm,
    backgroundColor: 'rgba(93,63,211,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkTitle: { ...typography.body, color: c.ink, fontWeight: '700' },
  linkMeta: { ...typography.meta, color: c.inkMuted },
  emptyText: {
    ...typography.body,
    color: c.inkMuted,
    lineHeight: 20,
  },

  templateRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  templateIconTile: {
    width: 36,
    height: 36,
    borderRadius: radii.sm,
    backgroundColor: 'rgba(93,63,211,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  templateTitleLine: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  templateName: { ...typography.body, color: c.ink, fontWeight: '600', flex: 1 },
  templateMeta: { ...typography.meta, color: c.inkMuted },
  templateMetaFaded: { ...typography.meta, color: c.inkFaded, fontSize: 11 },
  generateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: c.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radii.pill,
  },
  generateLabel: {
    ...typography.meta,
    color: '#ffffff',
    fontWeight: '700',
  },

  instanceRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  dateTile: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    backgroundColor: 'rgba(93,63,211,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateTileMonth: {
    fontSize: 8,
    fontWeight: '700',
    color: c.primary,
    letterSpacing: 0.8,
  },
  dateTileDay: {
    fontSize: 18,
    fontWeight: '700',
    color: c.primary,
    lineHeight: 20,
  },
  instanceTitleLine: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  instanceName: { ...typography.body, color: c.ink, fontWeight: '600', flex: 1 },
  instanceMeta: { ...typography.meta, color: c.inkMuted },
  assigneeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: -4,
    marginTop: 4,
  },
  assigneeMore: {
    ...typography.meta,
    color: c.inkMuted,
    marginLeft: spacing.xs,
  },

  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: c.card,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: c.inkGhost,
    marginBottom: spacing.sm,
  },
  sheetTitle: { ...typography.cardTitle, color: c.ink },
  sheetMeta: { ...typography.meta, color: c.inkMuted },
  sheetHint: {
    ...typography.meta,
    color: c.inkMuted,
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
    lineHeight: 16,
  },
  sheetLabel: {
    ...typography.eyebrow,
    color: c.ink,
    opacity: 0.6,
    marginTop: spacing.sm,
    marginBottom: 4,
  },
  sheetInput: {
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    ...typography.body,
    color: c.ink,
    backgroundColor: c.card,
  },
  sheetFooter: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  sheetWarning: {
    ...typography.meta,
    color: c.danger,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
});
}

