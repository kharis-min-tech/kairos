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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Avatar,
  Badge,
  Button,
  Card,
  Input,
  TimePicker,
  radii,
  spacing,
  typography,
  useThemedStyles,
  type ThemeColors,
  useColors,
} from '@kairos/ui-native';
import {
  ChevronLeft,
  Trash2,
  Plus,
  Users,
  ListChecks,
  Pencil,
  UserPlus,
} from 'lucide-react-native';
import type {
  RotaTemplateSlot,
  RotaPoolMemberWithDetails,
} from '@kairos/types';
import { api } from '@/lib/api-client';
import { useCapabilities, useRequireCapability } from '@/lib/capabilities';
import { alert } from '@/lib/alert';
import { MemberPickerSheet } from '@/components/member-picker-sheet';
import { useTranslation } from 'react-i18next';
import { localiseOptions } from '@/lib/localise-options';

// i18n-ignore(9): the English source; `common:weekdayShort_<value>` holds the display
// text and `localiseOptions` swaps it in at the render site.
const WEEKDAYS = [
  { value: 0, label: 'Sun' },
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
];

export default function RotaTemplateDetail() {  const { t } = useTranslation(['rota', 'common']);

  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  const router = useRouter();
  const qc = useQueryClient();
  const { branchDeptId, templateId } = useLocalSearchParams<{
    branchDeptId: string;
    templateId: string;
  }>();

  const dept = useQuery({
    queryKey: ['branch-dept', branchDeptId],
    enabled: !!branchDeptId,
    queryFn: async () => (await api.departments.get(branchDeptId!)).data!,
  });

  const caps = useCapabilities();
  const canAccess =
    !dept.data
      ? true
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

  const slots = useQuery({
    queryKey: ['rota', 'slots', branchDeptId, templateId],
    enabled: !!branchDeptId && !!templateId,
    queryFn: async () =>
      (await api.departments.rota.listSlots(branchDeptId!, templateId!)).data ?? [],
  });

  const pool = useQuery({
    queryKey: ['rota', 'pool', branchDeptId, templateId],
    enabled: !!branchDeptId && !!templateId,
    queryFn: async () =>
      (await api.departments.rota.listPool(branchDeptId!, templateId!)).data ?? [],
  });

  const template = templates.data?.find((t) => t.id === templateId);

  const [editOpen, setEditOpen] = useState(false);
  const [slotSheet, setSlotSheet] = useState<{ mode: 'new' | 'edit'; slot?: RotaTemplateSlot } | null>(null);
  const [poolPickerOpen, setPoolPickerOpen] = useState(false);

  const poolMemberIds = useMemo(
    () => new Set((pool.data ?? []).map((p) => p.memberId)),
    [pool.data],
  );

  const deactivateTemplate = useMutation({
    mutationFn: async () =>
      (await api.departments.rota.deactivateTemplate(branchDeptId!, templateId!))
        .data!,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rota', 'templates', branchDeptId] });
      router.back();
    },
    onError: (e: Error) =>
      alert.info('Could not archive', e.message ?? 'Please try again.'),
  });

  const removeSlot = useMutation({
    mutationFn: async (slotId: string) =>
      (
        await api.departments.rota.deleteSlot(
          branchDeptId!,
          templateId!,
          slotId,
        )
      ).data!,
    onSuccess: () =>
      qc.invalidateQueries({
        queryKey: ['rota', 'slots', branchDeptId, templateId],
      }),
    onError: (e: Error) =>
      alert.info('Could not remove', e.message ?? 'Please try again.'),
  });

  const removePool = useMutation({
    mutationFn: async (poolMemberId: string) =>
      (
        await api.departments.rota.removePoolMember(
          branchDeptId!,
          templateId!,
          poolMemberId,
        )
      ).data!,
    onSuccess: () =>
      qc.invalidateQueries({
        queryKey: ['rota', 'pool', branchDeptId, templateId],
      }),
    onError: (e: Error) =>
      alert.info('Could not remove', e.message ?? 'Please try again.'),
  });

  const addPool = useMutation({
    mutationFn: async (memberId: string) =>
      (
        await api.departments.rota.addPoolMember(branchDeptId!, templateId!, {
          memberId,
        })
      ).data!,
    onSuccess: () =>
      qc.invalidateQueries({
        queryKey: ['rota', 'pool', branchDeptId, templateId],
      }),
    onError: (e: Error) =>
      alert.info('Could not add', e.message ?? 'Please try again.'),
  });

  async function confirmDeactivate() {
    const ok = await alert.confirm({
      title: t('rota:archiveTemplate'),
      message:
        t('rota:existingInstancesStayPutButNo'),
      confirmLabel: t('rota:archive'),
      destructive: true,
    });
    if (!ok) return;
    deactivateTemplate.mutate();
  }

  async function confirmRemoveSlot(slot: RotaTemplateSlot) {
    const ok = await alert.confirm({
      title: t('rota:removeRole2'),
      message: `Remove "${slot.roleName}". Future generated instances will no longer include this role.`,
      confirmLabel: t('rota:remove'),
      destructive: true,
    });
    if (!ok) return;
    removeSlot.mutate(slot.id);
  }

  async function confirmRemovePool(row: RotaPoolMemberWithDetails) {
    const ok = await alert.confirm({
      title: t('rota:removeFromPool2'),
      message: `${row.memberFirstName} ${row.memberLastName} will stop being auto-assigned on new instances.`,
      confirmLabel: t('rota:remove'),
      destructive: true,
    });
    if (!ok) return;
    removePool.mutate(row.id);
  }

  const refresh = () => {
    templates.refetch();
    slots.refetch();
    pool.refetch();
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerBar}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ChevronLeft color={c.ink} size={24} strokeWidth={1.5} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {template?.name ?? 'Template'}
        </Text>
        <Pressable
          onPress={() => setEditOpen(true)}
          hitSlop={8}
          accessibilityLabel={t('rota:editTemplate')}
        >
          <Pencil color={c.primary} size={20} strokeWidth={1.5} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={slots.isFetching || pool.isFetching}
            onRefresh={refresh}
            tintColor={c.primary}
          />
        }
      >
        {!template ? (
          <ActivityIndicator color={c.primary} style={{ marginTop: spacing.xxl }} />
        ) : (
          <>
            <Card padding="md" style={{ gap: 6 }}>
              <Text style={styles.metaLine}>
                {dept.data?.departmentName ?? '—'} · {dept.data?.branchName ?? '—'}
              </Text>
              <View style={styles.metaChipRow}>
                <Badge
                  label={localiseOptions(t, 'common:weekdayShort_', WEEKDAYS)[template.weekday]?.label ?? '?'}
                  variant="primary"
                  size="sm"
                />
                {template.defaultStartTime ? (
                  <Badge
                    label={template.defaultStartTime.slice(0, 5)}
                    variant="neutral"
                    size="sm"
                  />
                ) : null}
              </View>
              {template.notes ? (
                <Text style={styles.notes}>{template.notes}</Text>
              ) : null}
            </Card>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <ListChecks color={c.primary} size={14} strokeWidth={1.5} />
                <Text style={styles.sectionTitle}>{t('rota:roles')}</Text>
                <Badge label={String(slots.data?.length ?? 0)} variant="neutral" size="sm" />
                <Pressable
                  onPress={() => setSlotSheet({ mode: 'new' })}
                  style={styles.addBtn}
                  hitSlop={6}
                  accessibilityLabel={t('rota:addRole')}
                >
                  <Plus color={c.primary} size={16} strokeWidth={1.5} />
                </Pressable>
              </View>
              {slots.isLoading ? (
                <ActivityIndicator color={c.primary} style={{ marginTop: spacing.sm }} />
              ) : (slots.data ?? []).length === 0 ? (
                <Card padding="md">
                  <Text style={styles.emptyText}>{t('rota:noRolesYetAddAtLeast')}</Text>
                </Card>
              ) : (
                (slots.data ?? [])
                  .slice()
                  .sort(
                    (a, b) =>
                      (a.sortOrder ?? 0) - (b.sortOrder ?? 0) ||
                      a.roleName.localeCompare(b.roleName),
                  )
                  .map((s) => (
                    <Card key={s.id} padding="md" style={styles.slotRow}>
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text style={styles.slotName}>{s.roleName}</Text>
                        <Text style={styles.slotMeta}>
                          {t('rota:positionsCount', { count: s.positionsRequired })}
                          {s.notes ? ` · ${s.notes}` : ''}
                        </Text>
                      </View>
                      <Pressable
                        onPress={() => setSlotSheet({ mode: 'edit', slot: s })}
                        hitSlop={8}
                        accessibilityLabel={t('rota:editRole')}
                      >
                        <Pencil color={c.inkMuted} size={16} strokeWidth={1.5} />
                      </Pressable>
                      <Pressable
                        onPress={() => confirmRemoveSlot(s)}
                        hitSlop={8}
                        accessibilityLabel={t('rota:removeRole')}
                      >
                        <Trash2 color={c.danger} size={16} strokeWidth={1.5} />
                      </Pressable>
                    </Card>
                  ))
              )}
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Users color={c.primary} size={14} strokeWidth={1.5} />
                <Text style={styles.sectionTitle}>{t('rota:pool')}</Text>
                <Badge label={String(pool.data?.length ?? 0)} variant="neutral" size="sm" />
                <Pressable
                  onPress={() => setPoolPickerOpen(true)}
                  style={styles.addBtn}
                  hitSlop={6}
                  accessibilityLabel={t('rota:addPoolMember')}
                >
                  <UserPlus color={c.primary} size={16} strokeWidth={1.5} />
                </Pressable>
              </View>
              {pool.isLoading ? (
                <ActivityIndicator color={c.primary} style={{ marginTop: spacing.sm }} />
              ) : (pool.data ?? []).length === 0 ? (
                <Card padding="md">
                  <Text style={styles.emptyText}>{t('rota:noPoolMembersAddPeopleWho')}</Text>
                </Card>
              ) : (
                (pool.data ?? []).map((row) => (
                  <Card key={row.id} padding="md" style={styles.poolRow}>
                    <Avatar
                      size="sm"
                      photoUrl={row.memberPhotoUrl ?? undefined}
                      firstName={row.memberFirstName}
                      lastName={row.memberLastName}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.poolName}>
                        {row.memberFirstName} {row.memberLastName}
                      </Text>
                      {row.preferredRoleName ? (
                        <Text style={styles.poolMeta}>
                          {t('departments:prefersRole', { role: row.preferredRoleName })}
                        </Text>
                      ) : null}
                    </View>
                    <Pressable
                      onPress={() => confirmRemovePool(row)}
                      hitSlop={8}
                      accessibilityLabel={t('rota:removeFromPool')}
                    >
                      <Trash2 color={c.danger} size={16} strokeWidth={1.5} />
                    </Pressable>
                  </Card>
                ))
              )}
            </View>

            <Pressable style={styles.dangerRow} onPress={confirmDeactivate}>
              <Trash2 color={c.danger} size={14} strokeWidth={1.5} />
              <Text style={styles.dangerText}>{t('rota:archiveTemplate2')}</Text>
            </Pressable>
          </>
        )}
      </ScrollView>

      {template && dept.data ? (
        <MemberPickerSheet
          open={poolPickerOpen}
          onClose={() => setPoolPickerOpen(false)}
          branchId={dept.data.branchId}
          excludeMemberIds={poolMemberIds}
          title={t('rota:addToPool')}
          subtitle={t('rota:membersAddedHereCanBeAssigned')}
          onPick={(memberId) => {
            setPoolPickerOpen(false);
            addPool.mutate(memberId);
          }}
        />
      ) : null}

      {template ? (
        <EditTemplateSheet
          open={editOpen}
          branchDeptId={branchDeptId!}
          templateId={templateId!}
          initial={{
            name: template.name,
            weekday: template.weekday,
            defaultStartTime: template.defaultStartTime ?? '',
            notes: template.notes ?? '',
          }}
          onClose={() => setEditOpen(false)}
          onDone={() => {
            qc.invalidateQueries({ queryKey: ['rota', 'templates', branchDeptId] });
            setEditOpen(false);
          }}
        />
      ) : null}

      <SlotSheet
        open={!!slotSheet}
        mode={slotSheet?.mode ?? 'new'}
        slot={slotSheet?.slot}
        branchDeptId={branchDeptId!}
        templateId={templateId!}
        onClose={() => setSlotSheet(null)}
        onDone={() => {
          qc.invalidateQueries({
            queryKey: ['rota', 'slots', branchDeptId, templateId],
          });
          setSlotSheet(null);
        }}
      />
    </SafeAreaView>
  );
}

// ─── Sheets ──────────────────────────────────────────────────

function EditTemplateSheet({
  open,
  branchDeptId,
  templateId,
  initial,
  onClose,
  onDone,
}: {
  open: boolean;
  branchDeptId: string;
  templateId: string;
  initial: { name: string; weekday: number; defaultStartTime: string; notes: string };
  onClose: () => void;
  onDone: () => void;
}) {  const { t } = useTranslation(['rota', 'common']);

  const styles = useThemedStyles(makeStyles);
  const [name, setName] = useState(initial.name);
  const [weekday, setWeekday] = useState(initial.weekday);
  const [startTime, setStartTime] = useState(
    initial.defaultStartTime ? initial.defaultStartTime.slice(0, 5) : '',
  );
  const [notes, setNotes] = useState(initial.notes);

  const mutate = useMutation({
    mutationFn: async () => {
      const payload: Parameters<typeof api.departments.rota.updateTemplate>[2] = {
        name: name.trim(),
        weekday,
        defaultStartTime: startTime || null,
        notes: notes.trim() || null,
      };
      return (
        await api.departments.rota.updateTemplate(branchDeptId, templateId, payload)
      ).data!;
    },
    onSuccess: onDone,
    onError: (e) =>
      alert.info('Could not save', e instanceof Error ? e.message : t('rota:pleaseTryAgain')),
  });

  return (
    <SheetShell open={open} title={t('rota:editTemplate')} onClose={onClose}>
      <View style={{ gap: 4 }}>
        <Text style={styles.label}>{t('rota:name')}</Text>
        <Input value={name} onChangeText={setName} placeholder={t('rota:templateName')} />
      </View>
      <View style={{ gap: 4 }}>
        <Text style={styles.label}>{t('rota:serviceDay')}</Text>
        <View style={styles.weekdayRow}>
          {localiseOptions(t, 'common:weekdayShort_', WEEKDAYS).map((d) => {
            const active = d.value === weekday;
            return (
              <Pressable
                key={d.value}
                onPress={() => setWeekday(d.value)}
                style={[styles.weekdayBtn, active && styles.weekdayBtnActive]}
              >
                <Text
                  style={[styles.weekdayLabel, active && styles.weekdayLabelActive]}
                >
                  {d.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
      <TimePicker
        label={t('rota:defaultStartTime')}
        value={startTime}
        onChange={setStartTime}
      />
      <View style={{ gap: 4 }}>
        <Text style={styles.label}>{t('rota:notes')}</Text>
        <Input
          value={notes}
          onChangeText={setNotes}
          placeholder={t('rota:optional')}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
          containerStyle={{ minHeight: 70 }}
        />
      </View>
      <Button
        label={mutate.isPending ? t('rota:saving') : t('rota:saveChanges')}
        size="lg"
        fullWidth
        loading={mutate.isPending}
        onPress={() => {
          if (!name.trim()) return alert.info('Missing name', 'Give the template a name.');
          mutate.mutate();
        }}
      />
    </SheetShell>
  );
}

function SlotSheet({
  open,
  mode,
  slot,
  branchDeptId,
  templateId,
  onClose,
  onDone,
}: {
  open: boolean;
  mode: 'new' | 'edit';
  slot?: RotaTemplateSlot;
  branchDeptId: string;
  templateId: string;
  onClose: () => void;
  onDone: () => void;
}) {  const { t } = useTranslation(['rota', 'common']);

  const styles = useThemedStyles(makeStyles);
  const [roleName, setRoleName] = useState(slot?.roleName ?? '');
  const [positions, setPositions] = useState(String(slot?.positionsRequired ?? 1));
  const [notes, setNotes] = useState(slot?.notes ?? '');

  useMemo(() => {
    if (open) {
      setRoleName(slot?.roleName ?? '');
      setPositions(String(slot?.positionsRequired ?? 1));
      setNotes(slot?.notes ?? '');
    }
  }, [open, slot]);

  const mutate = useMutation({
    mutationFn: async () => {
      const cleanPositions = Math.max(1, parseInt(positions, 10) || 1);
      if (mode === 'new') {
        const payload: Parameters<typeof api.departments.rota.createSlot>[2] = {
          roleName: roleName.trim(),
          positionsRequired: cleanPositions,
        };
        if (notes.trim()) payload.notes = notes.trim();
        return (
          await api.departments.rota.createSlot(branchDeptId, templateId, payload)
        ).data!;
      } else {
        if (!slot) throw new Error('No slot');
        return (
          await api.departments.rota.updateSlot(branchDeptId, templateId, slot.id, {
            roleName: roleName.trim(),
            positionsRequired: cleanPositions,
            notes: notes.trim() || null,
          })
        ).data!;
      }
    },
    onSuccess: onDone,
    onError: (e) =>
      alert.info('Could not save', e instanceof Error ? e.message : t('rota:pleaseTryAgain')),
  });

  return (
    <SheetShell
      open={open}
      title={mode === 'new' ? t('rota:addRole') : t('rota:editRole')}
      onClose={onClose}
    >
      <View style={{ gap: 4 }}>
        <Text style={styles.label}>{t('rota:roleName')}</Text>
        <Input
          value={roleName}
          onChangeText={setRoleName}
          placeholder={t('rota:eGSoundEngineer')}
          autoCapitalize="sentences"
        />
      </View>
      <View style={{ gap: 4 }}>
        <Text style={styles.label}>{t('rota:positionsRequired')}</Text>
        <Input
          value={positions}
          onChangeText={setPositions}
          keyboardType="number-pad"
          placeholder="1"
        />
      </View>
      <View style={{ gap: 4 }}>
        <Text style={styles.label}>{t('rota:notesOptional')}</Text>
        <Input
          value={notes}
          onChangeText={setNotes}
          placeholder={t('rota:anythingTheGeneratorOrTeamShould')}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
          containerStyle={{ minHeight: 70 }}
        />
      </View>
      <Button
        label={mutate.isPending ? 'Saving…' : mode === 'new' ? t('rota:addRole') : t('rota:saveChanges')}
        size="lg"
        fullWidth
        loading={mutate.isPending}
        onPress={() => {
          if (!roleName.trim()) return alert.info('Missing name', 'Give the role a name.');
          mutate.mutate();
        }}
      />
    </SheetShell>
  );
}

function SheetShell({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const styles = useThemedStyles(makeStyles);
  return (
    <Modal visible={open} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Pressable style={styles.backdrop} onPress={onClose}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>{title}</Text>
            <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: 480 }}>
              <View style={{ gap: spacing.md }}>{children}</View>
            </ScrollView>
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
    headerTitle: { ...typography.cardTitle, color: c.ink, flex: 1, textAlign: 'center' },
    container: {
      padding: spacing.lg,
      paddingBottom: spacing.xxl,
      gap: spacing.lg,
    },
    metaLine: { ...typography.meta, color: c.inkMuted },
    metaChipRow: { flexDirection: 'row', gap: spacing.xs, marginTop: 4 },
    notes: { ...typography.body, color: c.ink, lineHeight: 20, marginTop: spacing.xs },
    section: { gap: spacing.sm },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    sectionTitle: { ...typography.cardTitle, color: c.ink, flex: 1 },
    addBtn: {
      width: 28,
      height: 28,
      borderRadius: radii.sm,
      backgroundColor: 'rgba(93,63,211,0.1)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyText: { ...typography.body, color: c.inkMuted, lineHeight: 20 },
    slotRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    slotName: { ...typography.body, color: c.ink, fontWeight: '700' },
    slotMeta: { ...typography.meta, color: c.inkMuted },
    poolRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    poolName: { ...typography.body, color: c.ink, fontWeight: '600' },
    poolMeta: { ...typography.meta, color: c.inkMuted },
    dangerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xs,
      paddingVertical: spacing.md,
    },
    dangerText: { ...typography.body, color: c.danger, fontWeight: '700' },
    label: { ...typography.eyebrow, color: c.ink, opacity: 0.6 },
    weekdayRow: { flexDirection: 'row', gap: 4 },
    weekdayBtn: {
      flex: 1,
      paddingVertical: spacing.sm,
      alignItems: 'center',
      backgroundColor: c.card,
      borderRadius: radii.sm,
      borderWidth: 1,
      borderColor: c.border,
    },
    weekdayBtnActive: {
      backgroundColor: 'rgba(93,63,211,0.1)',
      borderColor: c.primary,
    },
    weekdayLabel: { ...typography.meta, color: c.inkMuted, fontWeight: '600' },
    weekdayLabelActive: { color: c.primary, fontWeight: '700' },
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.4)',
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: c.card,
      borderTopLeftRadius: radii.lg,
      borderTopRightRadius: radii.lg,
      padding: spacing.lg,
      gap: spacing.md,
    },
    sheetHandle: {
      alignSelf: 'center',
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: c.inkGhost,
    },
    sheetTitle: { ...typography.cardTitle, color: c.ink },
  });
}
