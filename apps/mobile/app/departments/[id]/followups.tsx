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
import { ChevronLeft, Check, Clock, Plus, ChevronRight } from 'lucide-react-native';
import {
  Avatar,
  Badge,
  Button,
  Card,
  DatePicker,
  Input,
  radii,
  spacing,
  typography,
  useThemedStyles,
  type ThemeColors,
  useColors,
} from '@kairos/ui-native';
import type {
  DepartmentFollowupWithDetails,
  DepartmentMemberWithDetails,
  OverdueFollowupRow,
} from '@kairos/types';
import { ContactMethod, ContactStatus } from '@kairos/types';
import { api } from '@/lib/api-client';
import { useCapabilities, useRequireCapability } from '@/lib/capabilities';
import { alert } from '@/lib/alert';

type Tab = 'overdue' | 'all';

export default function DepartmentFollowups() {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  const router = useRouter();
  const qc = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();
  const branchDeptId = id!;

  const [tab, setTab] = useState<Tab>('overdue');
  const [createFor, setCreateFor] = useState<{
    memberId: string;
    memberName: string;
  } | null>(null);
  const [memberPickerOpen, setMemberPickerOpen] = useState(false);

  const dept = useQuery({
    queryKey: ['departments', branchDeptId],
    enabled: !!branchDeptId,
    queryFn: async () => (await api.departments.get(branchDeptId)).data ?? null,
  });

  const caps = useCapabilities();
  const canAccess =
    !dept.data
      ? true
      : caps.systemRole === 'admin' ||
        caps.has('department:write', {
          kind: 'department',
          id: branchDeptId,
          branchId: dept.data.branchId,
        }) ||
        caps.has('branch:write', { kind: 'branch', id: dept.data.branchId });
  useRequireCapability(canAccess);

  const members = useQuery({
    queryKey: ['departments', branchDeptId, 'members'],
    enabled: !!branchDeptId,
    queryFn: async () => (await api.departments.members.list(branchDeptId)).data ?? [],
  });

  const overdue = useQuery({
    queryKey: ['departments', branchDeptId, 'followups', 'overdue'],
    enabled: !!branchDeptId && tab === 'overdue',
    queryFn: async () =>
      (await api.departments.followups.listOverdue(branchDeptId)).data ?? [],
  });

  const all = useQuery({
    queryKey: ['departments', branchDeptId, 'followups', 'all'],
    enabled: !!branchDeptId && tab === 'all',
    queryFn: async () =>
      (await api.departments.followups.listForDepartment(branchDeptId)).data ?? [],
  });

  const invalidate = () =>
    qc.invalidateQueries({ queryKey: ['departments', branchDeptId, 'followups'] });

  const allRows = useMemo(
    () =>
      (all.data ?? [])
        .slice()
        .sort((a, b) =>
          new Date(b.contactedAt).getTime() - new Date(a.contactedAt).getTime(),
        ),
    [all.data],
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerBar}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ChevronLeft color={c.ink} size={24} strokeWidth={1.5} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          Follow-ups
        </Text>
        <Pressable
          onPress={() => setMemberPickerOpen(true)}
          hitSlop={8}
          accessibilityLabel="New follow-up"
        >
          <Plus color={c.primary} size={22} strokeWidth={1.5} />
        </Pressable>
      </View>

      <View style={styles.tabs}>
        {(['overdue', 'all'] as Tab[]).map((t) => {
          const active = t === tab;
          return (
            <Pressable
              key={t}
              onPress={() => setTab(t)}
              style={[styles.tab, active && styles.tabActive]}
            >
              <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>
                {t === 'overdue' ? 'Overdue' : 'All follow-ups'}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={tab === 'overdue' ? overdue.isFetching : all.isFetching}
            onRefresh={() => (tab === 'overdue' ? overdue.refetch() : all.refetch())}
            tintColor={c.primary}
          />
        }
      >
        {dept.data ? (
          <Text style={styles.contextLine}>
            {dept.data.departmentName} · {dept.data.branchName}
          </Text>
        ) : null}

        {tab === 'overdue' ? (
          overdue.isLoading ? (
            <ActivityIndicator color={c.primary} style={{ marginTop: spacing.xxl }} />
          ) : (overdue.data ?? []).length === 0 ? (
            <Card padding="md">
              <Text style={styles.emptyLine}>Nothing overdue — nicely kept up.</Text>
            </Card>
          ) : (
            (overdue.data ?? []).map((row) => (
              <OverdueCard
                key={row.memberId}
                row={row}
                onNewFollowup={() =>
                  setCreateFor({
                    memberId: row.memberId,
                    memberName: `${row.firstName} ${row.lastName}`,
                  })
                }
              />
            ))
          )
        ) : all.isLoading ? (
          <ActivityIndicator color={c.primary} style={{ marginTop: spacing.xxl }} />
        ) : allRows.length === 0 ? (
          <Card padding="md">
            <Text style={styles.emptyLine}>
              No follow-ups recorded yet. Tap + to record one.
            </Text>
          </Card>
        ) : (
          allRows.map((row) => <FollowupCard key={row.id} row={row} />)
        )}
      </ScrollView>

      {createFor ? (
        <CreateSheet
          branchDeptId={branchDeptId}
          member={createFor}
          onClose={() => setCreateFor(null)}
          onDone={() => {
            invalidate();
            setCreateFor(null);
          }}
        />
      ) : null}

      <MemberPickSheet
        open={memberPickerOpen}
        members={members.data ?? []}
        onClose={() => setMemberPickerOpen(false)}
        onPick={(m) => {
          setMemberPickerOpen(false);
          setCreateFor({
            memberId: m.memberId,
            memberName: `${m.memberFirstName} ${m.memberLastName}`,
          });
        }}
      />
    </SafeAreaView>
  );
}

function OverdueCard({
  row,
  onNewFollowup,
}: {
  row: OverdueFollowupRow;
  onNewFollowup: () => void;
}) {
  const styles = useThemedStyles(makeStyles);
  const router = useRouter();
  return (
    <Card padding="md" style={{ gap: spacing.sm }}>
      <Pressable style={styles.row} onPress={() => router.push(`/members/${row.memberId}`)}>
        <Avatar
          size="md"
          photoUrl={row.photoUrl ?? undefined}
          firstName={row.firstName}
          lastName={row.lastName}
        />
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>
            {row.firstName} {row.lastName}
          </Text>
          <Text style={styles.metaFaded}>{row.email ?? 'No email'}</Text>
        </View>
        <Badge
          label={
            row.daysSinceFollowup == null
              ? 'Never'
              : `${row.daysSinceFollowup}d`
          }
          variant={row.isOverdue ? 'danger' : 'gold'}
          size="sm"
        />
      </Pressable>
      <View style={styles.actionRow}>
        <Pressable style={styles.recordBtn} onPress={onNewFollowup}>
          <Plus color="#ffffff" size={14} strokeWidth={2} />
          <Text style={styles.recordLabel}>Record follow-up</Text>
        </Pressable>
      </View>
    </Card>
  );
}

function FollowupCard({ row }: { row: DepartmentFollowupWithDetails }) {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  const router = useRouter();
  const stamp = new Date(row.contactedAt).toLocaleDateString();
  return (
    <Card padding="md" style={{ gap: 6 }}>
      <Pressable style={styles.row} onPress={() => router.push(`/members/${row.memberId}`)}>
        <Avatar size="sm" firstName={row.memberFirstName} lastName={row.memberLastName} />
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>
            {row.memberFirstName} {row.memberLastName}
          </Text>
          <Text style={styles.metaFaded}>
            {stamp} · {row.contactMethod} · {row.contactStatus}
          </Text>
        </View>
        <ChevronRight color={c.inkVeryFaded} size={16} strokeWidth={1.5} />
      </Pressable>
      {row.notes ? <Text style={styles.notesText}>{row.notes}</Text> : null}
      {row.nextFollowUpDate ? (
        <View style={styles.nextRow}>
          <Clock color={c.gold} size={12} strokeWidth={1.5} />
          <Text style={styles.nextText}>
            Next follow-up {new Date(row.nextFollowUpDate).toLocaleDateString()}
          </Text>
        </View>
      ) : null}
    </Card>
  );
}

function CreateSheet({
  branchDeptId,
  member,
  onClose,
  onDone,
}: {
  branchDeptId: string;
  member: { memberId: string; memberName: string };
  onClose: () => void;
  onDone: () => void;
}) {
  const styles = useThemedStyles(makeStyles);
  const [contactedAt, setContactedAt] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [method, setMethod] = useState<ContactMethod>(ContactMethod.PhoneCall);
  const [status, setStatus] = useState<ContactStatus>(ContactStatus.Successful);
  const [notes, setNotes] = useState('');
  const [nextDate, setNextDate] = useState('');

  const mutate = useMutation({
    mutationFn: async () => {
      const payload: Parameters<typeof api.departments.followups.create>[2] = {
        contactedAt: new Date(`${contactedAt}T12:00:00`).toISOString(),
        contactMethod: method,
        contactStatus: status,
      };
      if (notes.trim()) payload.notes = notes.trim();
      if (nextDate) payload.nextFollowUpDate = nextDate;
      return (
        await api.departments.followups.create(
          branchDeptId,
          member.memberId,
          payload,
        )
      ).data!;
    },
    onSuccess: onDone,
    onError: (e) =>
      alert.info('Could not save', e instanceof Error ? e.message : 'Please try again.'),
  });

  return (
    <SheetShell open title={`Follow-up · ${member.memberName}`} onClose={onClose}>
      <DatePicker label="Contacted on" value={contactedAt} onChange={setContactedAt} />

      <View style={{ gap: 4 }}>
        <Text style={styles.fieldLabel}>Method</Text>
        <View style={styles.chipRow}>
          {Object.values(ContactMethod).map((m) => {
            const active = m === method;
            return (
              <Pressable
                key={m}
                onPress={() => setMethod(m)}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>
                  {m}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={{ gap: 4 }}>
        <Text style={styles.fieldLabel}>Outcome</Text>
        <View style={styles.chipRow}>
          {Object.values(ContactStatus).map((s) => {
            const active = s === status;
            return (
              <Pressable
                key={s}
                onPress={() => setStatus(s)}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>
                  {s}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={{ gap: 4 }}>
        <Text style={styles.fieldLabel}>Notes</Text>
        <Input
          value={notes}
          onChangeText={setNotes}
          placeholder="What was discussed?"
          multiline
          numberOfLines={3}
          textAlignVertical="top"
          containerStyle={{ minHeight: 80 }}
        />
      </View>

      <DatePicker
        label="Next follow-up (optional)"
        value={nextDate}
        onChange={setNextDate}
      />

      <Button
        label={mutate.isPending ? 'Saving…' : 'Save follow-up'}
        size="lg"
        fullWidth
        loading={mutate.isPending}
        onPress={() => mutate.mutate()}
      />
    </SheetShell>
  );
}

function MemberPickSheet({
  open,
  members,
  onClose,
  onPick,
}: {
  open: boolean;
  members: DepartmentMemberWithDetails[];
  onClose: () => void;
  onPick: (m: DepartmentMemberWithDetails) => void;
}) {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  return (
    <SheetShell open={open} title="Which member?" onClose={onClose}>
      {members.length === 0 ? (
        <Text style={styles.emptyLine}>No members in this department yet.</Text>
      ) : (
        members.map((m) => (
          <Pressable
            key={m.id}
            style={styles.pickRow}
            onPress={() => onPick(m)}
          >
            <Avatar
              size="sm"
              photoUrl={m.memberPhotoUrl ?? undefined}
              firstName={m.memberFirstName}
              lastName={m.memberLastName}
            />
            <Text style={styles.pickLabel}>
              {m.memberFirstName} {m.memberLastName}
            </Text>
            <Check color={c.inkVeryFaded} size={16} strokeWidth={1.5} />
          </Pressable>
        ))
      )}
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
            <ScrollView
              keyboardShouldPersistTaps="handled"
              style={{ maxHeight: 480 }}
            >
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
    tabs: {
      flexDirection: 'row',
      paddingHorizontal: spacing.lg,
      gap: spacing.xs,
      paddingBottom: spacing.sm,
    },
    tab: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: radii.pill,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
    },
    tabActive: {
      backgroundColor: 'rgba(93,63,211,0.1)',
      borderColor: c.primary,
    },
    tabLabel: { ...typography.body, color: c.inkMuted, fontWeight: '600' },
    tabLabelActive: { color: c.primary, fontWeight: '700' },
    container: {
      padding: spacing.lg,
      paddingBottom: spacing.xxl,
      gap: spacing.md,
    },
    contextLine: { ...typography.meta, color: c.inkMuted },
    emptyLine: { ...typography.body, color: c.inkMuted },
    row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    name: { ...typography.body, color: c.ink, fontWeight: '700' },
    metaFaded: { ...typography.meta, color: c.inkMuted },
    notesText: { ...typography.body, color: c.ink, lineHeight: 18 },
    nextRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    nextText: { ...typography.meta, color: c.goldDark, fontWeight: '600' },
    actionRow: { flexDirection: 'row' },
    recordBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: c.primary,
      paddingHorizontal: spacing.sm,
      paddingVertical: 6,
      borderRadius: radii.pill,
    },
    recordLabel: { ...typography.meta, color: '#ffffff', fontWeight: '700' },
    fieldLabel: { ...typography.eyebrow, color: c.ink, opacity: 0.6 },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
    chip: {
      paddingHorizontal: spacing.sm,
      paddingVertical: 6,
      borderRadius: radii.pill,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
    },
    chipActive: {
      backgroundColor: 'rgba(93,63,211,0.1)',
      borderColor: c.primary,
    },
    chipLabel: { ...typography.meta, color: c.inkMuted, fontWeight: '600' },
    chipLabelActive: { color: c.primary, fontWeight: '700' },
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
    pickRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingVertical: spacing.sm,
    },
    pickLabel: { ...typography.body, color: c.ink, flex: 1, fontWeight: '600' },
  });
}
