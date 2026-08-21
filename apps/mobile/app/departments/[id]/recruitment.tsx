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
  ChevronLeft,
  Check,
  X,
  Calendar,
  Users,
  Award,
  ShieldAlert,
  MessageSquare,
  ChevronRight,
} from 'lucide-react-native';
import {
  Avatar,
  Badge,
  Button,
  Card,
  DatePicker,
  Input,
  TimePicker,
  radii,
  spacing,
  typography,
  useThemedStyles,
  type ThemeColors,
  useColors,
} from '@kairos/ui-native';
import type { DepartmentJoinRequestWithMember } from '@kairos/types';
import { api } from '@/lib/api-client';
import { useCapabilities, useRequireCapability } from '@/lib/capabilities';
import { alert } from '@/lib/alert';

type Stage = 'open' | 'terminal' | 'all';

const STAGE_LABELS: Record<Stage, string> = {
  open: 'Active',
  terminal: 'Closed',
  all: 'All',
};

const STATUS_META: Record<
  string,
  { label: string; variant: 'neutral' | 'gold' | 'success' | 'danger' | 'primary' }
> = {
  applied: { label: 'Applied', variant: 'primary' },
  interview_scheduled: { label: 'Interview scheduled', variant: 'primary' },
  interviewed: { label: 'Interviewed', variant: 'gold' },
  offered: { label: 'Offered', variant: 'gold' },
  probation: { label: 'Probation', variant: 'gold' },
  active: { label: 'Active', variant: 'success' },
  rejected: { label: 'Rejected', variant: 'danger' },
  withdrawn: { label: 'Withdrawn', variant: 'neutral' },
  probation_failed: { label: 'Failed probation', variant: 'danger' },
};

type ActionKind =
  | 'schedule'
  | 'record'
  | 'offer'
  | 'probation'
  | 'reject'
  | null;

export default function DepartmentRecruitment() {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  const router = useRouter();
  const qc = useQueryClient();
  const params = useLocalSearchParams<{ id: string }>();
  const branchDeptId = params.id!;

  const [stage, setStage] = useState<Stage>('open');
  const [action, setAction] = useState<ActionKind>(null);
  const [current, setCurrent] = useState<DepartmentJoinRequestWithMember | null>(null);

  const department = useQuery({
    queryKey: ['departments', branchDeptId],
    enabled: !!branchDeptId,
    queryFn: async () => (await api.departments.get(branchDeptId)).data ?? null,
  });

  const caps = useCapabilities();
  const canAccess =
    !department.data
      ? true
      : caps.systemRole === 'admin' ||
        caps.has('department:write', {
          kind: 'department',
          id: branchDeptId,
          branchId: department.data.branchId,
        }) ||
        caps.has('branch:write', { kind: 'branch', id: department.data.branchId });
  useRequireCapability(canAccess);

  const requests = useQuery({
    queryKey: ['departments', branchDeptId, 'joinRequests', stage],
    enabled: !!branchDeptId,
    queryFn: async () =>
      (await api.departments.joinRequests.list(branchDeptId, { stage })).data ?? [],
  });

  const branchMembers = useQuery({
    queryKey: ['members', 'branch-picker', department.data?.branchId],
    enabled: !!department.data?.branchId,
    queryFn: async () =>
      (await api.members.list({ branchId: department.data!.branchId, limit: 500 })).data
        ?.data ?? [],
  });

  const invalidate = () =>
    qc.invalidateQueries({ queryKey: ['departments', branchDeptId, 'joinRequests'] });

  const grouped = useMemo(() => {
    const rows = requests.data ?? [];
    const g: Record<string, DepartmentJoinRequestWithMember[]> = {};
    for (const r of rows) {
      const key = r.status ?? 'unknown';
      (g[key] ??= []).push(r);
    }
    return g;
  }, [requests.data]);

  const orderKeys =
    stage === 'terminal'
      ? ['rejected', 'withdrawn', 'probation_failed', 'active']
      : ['applied', 'interview_scheduled', 'interviewed', 'offered', 'probation', 'active'];

  function openAction(kind: ActionKind, row: DepartmentJoinRequestWithMember) {
    setCurrent(row);
    setAction(kind);
  }

  function closeAction() {
    setAction(null);
    setCurrent(null);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerBar}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ChevronLeft color={c.ink} size={24} strokeWidth={1.5} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          Recruitment
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.tabs}>
        {(['open', 'terminal', 'all'] as Stage[]).map((s) => {
          const active = s === stage;
          return (
            <Pressable
              key={s}
              onPress={() => setStage(s)}
              style={[styles.tab, active && styles.tabActive]}
            >
              <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>
                {STAGE_LABELS[s]}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={requests.isFetching}
            onRefresh={() => requests.refetch()}
            tintColor={c.primary}
          />
        }
      >
        {department.data ? (
          <Text style={styles.contextLine}>
            {department.data.departmentName} · {department.data.branchName}
          </Text>
        ) : null}

        {requests.isLoading ? (
          <ActivityIndicator color={c.primary} style={{ marginTop: spacing.xxl }} />
        ) : null}

        {!requests.isLoading && (requests.data ?? []).length === 0 ? (
          <Card padding="md">
            <Text style={styles.emptyLine}>
              {stage === 'open'
                ? 'No active applications right now.'
                : stage === 'terminal'
                  ? 'No closed applications yet.'
                  : 'No applications yet.'}
            </Text>
          </Card>
        ) : null}

        {orderKeys.map((k) => {
          const rows = grouped[k];
          if (!rows || rows.length === 0) return null;
          const meta = STATUS_META[k];
          return (
            <View key={k} style={styles.stageBlock}>
              <View style={styles.stageHeader}>
                <Text style={styles.stageTitle}>{meta?.label ?? k}</Text>
                <Badge label={String(rows.length)} variant="neutral" size="sm" />
              </View>
              {rows.map((row) => (
                <ApplicantCard
                  key={row.id}
                  row={row}
                  onSchedule={() => openAction('schedule', row)}
                  onRecord={() => openAction('record', row)}
                  onOffer={() => openAction('offer', row)}
                  onProbation={() => openAction('probation', row)}
                  onReject={() => openAction('reject', row)}
                />
              ))}
            </View>
          );
        })}
      </ScrollView>

      <ScheduleInterviewSheet
        open={action === 'schedule'}
        row={current}
        branchDeptId={branchDeptId}
        members={branchMembers.data ?? []}
        onClose={closeAction}
        onDone={() => {
          invalidate();
          closeAction();
        }}
      />
      <RecordInterviewSheet
        open={action === 'record'}
        row={current}
        branchDeptId={branchDeptId}
        onClose={closeAction}
        onDone={() => {
          invalidate();
          closeAction();
        }}
      />
      <ExtendOfferSheet
        open={action === 'offer'}
        row={current}
        branchDeptId={branchDeptId}
        onClose={closeAction}
        onDone={() => {
          invalidate();
          closeAction();
        }}
      />
      <ProbationSheet
        open={action === 'probation'}
        row={current}
        branchDeptId={branchDeptId}
        onClose={closeAction}
        onDone={() => {
          invalidate();
          closeAction();
        }}
      />
      <RejectSheet
        open={action === 'reject'}
        row={current}
        branchDeptId={branchDeptId}
        onClose={closeAction}
        onDone={() => {
          invalidate();
          closeAction();
        }}
      />
    </SafeAreaView>
  );
}

function ApplicantCard({
  row,
  onSchedule,
  onRecord,
  onOffer,
  onProbation,
  onReject,
}: {
  row: DepartmentJoinRequestWithMember;
  onSchedule: () => void;
  onRecord: () => void;
  onOffer: () => void;
  onProbation: () => void;
  onReject: () => void;
}) {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  const router = useRouter();

  const canSchedule = row.status === 'applied';
  const canRecord = row.status === 'interview_scheduled';
  const canOffer =
    row.status === 'interviewed' && row.interviewOutcome === 'pass';
  const canProbation = row.status === 'probation';
  const canReject = ['applied', 'interview_scheduled', 'interviewed', 'offered'].includes(
    row.status,
  );

  // Primary action for the current stage — tapping the card body opens this
  // sheet directly so the leader can act without extra taps. Terminal-status
  // cards (rejected/withdrawn/active/probation_failed) fall back to opening
  // the member profile.
  const primaryAction = canSchedule
    ? onSchedule
    : canRecord
      ? onRecord
      : canOffer
        ? onOffer
        : canProbation
          ? onProbation
          : () => router.push(`/members/${row.memberId}`);

  return (
    <Card padding="md" style={{ gap: spacing.sm }}>
      <Pressable style={styles.appHeader} onPress={primaryAction}>
        <Avatar
          size="md"
          photoUrl={row.memberPhotoUrl ?? undefined}
          firstName={row.memberFirstName}
          lastName={row.memberLastName}
        />
        <View style={{ flex: 1 }}>
          <Text style={styles.appName}>
            {row.memberFirstName} {row.memberLastName}
          </Text>
          {row.memberPhone ? (
            <Text style={styles.appMeta}>{row.memberPhone}</Text>
          ) : row.memberEmail ? (
            <Text style={styles.appMeta}>{row.memberEmail}</Text>
          ) : null}
        </View>
        <ChevronRight color={c.inkVeryFaded} size={16} strokeWidth={1.5} />
      </Pressable>

      <Pressable
        onPress={() => router.push(`/members/${row.memberId}`)}
        hitSlop={4}
        style={styles.profileLinkRow}
      >
        <Text style={styles.profileLink}>View member profile →</Text>
      </Pressable>

      {row.notes ? (
        <View style={styles.notesBlock}>
          <MessageSquare color={c.inkFaded} size={12} strokeWidth={1.5} />
          <Text style={styles.notesText}>{row.notes}</Text>
        </View>
      ) : null}

      {row.interviewScheduledAt ? (
        <Text style={styles.stageDetail}>
          Interview {new Date(row.interviewScheduledAt).toLocaleString([], {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
          })}
          {row.interviewFormat ? ` · ${row.interviewFormat === 'virtual' ? 'Virtual' : 'In person'}` : ''}
          {row.interviewLocation ? ` · ${row.interviewLocation}` : ''}
        </Text>
      ) : null}

      {row.interviewOutcome ? (
        <Text style={styles.stageDetail}>
          Outcome:{' '}
          <Text style={{ fontWeight: '700' }}>
            {row.interviewOutcome === 'pass' ? 'Passed' : 'Did not pass'}
          </Text>
          {row.interviewNotes ? ` — ${row.interviewNotes}` : ''}
        </Text>
      ) : null}

      {row.offeredAt ? (
        <Text style={styles.stageDetail}>
          Offer sent {new Date(row.offeredAt).toLocaleDateString()}
          {row.offerResponse ? ` · Response: ${row.offerResponse}` : ' · awaiting response'}
        </Text>
      ) : null}

      {row.probationStartDate ? (
        <Text style={styles.stageDetail}>
          Probation {row.probationStartDate}
          {row.probationEndDate ? ` → ${row.probationEndDate}` : ''}
        </Text>
      ) : null}

      <View style={styles.actionRow}>
        {canSchedule ? (
          <ActionButton icon={<Calendar size={14} color={c.primary} />} label="Schedule interview" onPress={onSchedule} />
        ) : null}
        {canRecord ? (
          <ActionButton icon={<Users size={14} color={c.primary} />} label="Record interview" onPress={onRecord} />
        ) : null}
        {canOffer ? (
          <ActionButton icon={<Award size={14} color={c.primary} />} label="Extend offer" onPress={onOffer} />
        ) : null}
        {canProbation ? (
          <ActionButton icon={<ShieldAlert size={14} color={c.primary} />} label="Evaluate probation" onPress={onProbation} />
        ) : null}
        {canReject ? (
          <ActionButton icon={<X size={14} color={c.danger} />} label="Reject" onPress={onReject} tone="danger" />
        ) : null}
      </View>
    </Card>
  );
}

function ActionButton({
  icon,
  label,
  onPress,
  tone = 'primary',
}: {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
  tone?: 'primary' | 'danger';
}) {
  const styles = useThemedStyles(makeStyles);
  return (
    <Pressable
      onPress={onPress}
      style={[styles.actionBtn, tone === 'danger' && styles.actionBtnDanger]}
    >
      {icon}
      <Text style={[styles.actionBtnLabel, tone === 'danger' && styles.actionBtnLabelDanger]}>
        {label}
      </Text>
    </Pressable>
  );
}

// ─── Action sheets ───────────────────────────────────────────

function SheetShell({
  open,
  title,
  onClose,
  children,
  footer,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer: React.ReactNode;
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
            <ScrollView style={{ maxHeight: 460 }} keyboardShouldPersistTaps="handled">
              <View style={{ gap: spacing.md }}>{children}</View>
            </ScrollView>
            <View style={{ gap: spacing.xs }}>{footer}</View>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function MemberPickerRow({
  label,
  members,
  value,
  onChange,
  exclude,
}: {
  label: string;
  members: { id: string; firstName: string; lastName: string }[];
  value: string;
  onChange: (id: string) => void;
  exclude?: string;
}) {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  const [open, setOpen] = useState(false);
  const selected = members.find((m) => m.id === value);
  const filtered = members.filter((m) => m.id !== exclude);
  return (
    <View style={{ gap: 4 }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Pressable style={styles.pickerField} onPress={() => setOpen(true)}>
        <Text style={selected ? styles.pickerValue : styles.pickerPlaceholder}>
          {selected ? `${selected.firstName} ${selected.lastName}` : 'Pick a member'}
        </Text>
        <ChevronRight color={c.inkFaded} size={16} strokeWidth={1.5} />
      </Pressable>
      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>{label}</Text>
            <ScrollView style={{ maxHeight: 400 }}>
              {filtered.map((m) => {
                const active = m.id === value;
                return (
                  <Pressable
                    key={m.id}
                    style={[styles.sheetRow, active && styles.sheetRowActive]}
                    onPress={() => {
                      onChange(m.id);
                      setOpen(false);
                    }}
                  >
                    <Text
                      style={[styles.sheetRowLabel, active && styles.sheetRowLabelActive]}
                    >
                      {m.firstName} {m.lastName}
                    </Text>
                    {active ? <Check color={c.primary} size={16} strokeWidth={2} /> : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function ScheduleInterviewSheet({
  open,
  row,
  branchDeptId,
  members,
  onClose,
  onDone,
}: {
  open: boolean;
  row: DepartmentJoinRequestWithMember | null;
  branchDeptId: string;
  members: { id: string; firstName: string; lastName: string }[];
  onClose: () => void;
  onDone: () => void;
}) {
  const styles = useThemedStyles(makeStyles);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('10:00');
  const [format, setFormat] = useState<'in_person' | 'virtual'>('in_person');
  const [location, setLocation] = useState('');
  const [oneId, setOneId] = useState('');
  const [twoId, setTwoId] = useState('');

  const mutate = useMutation({
    mutationFn: async () => {
      if (!row) throw new Error('No row');
      const iso = new Date(`${date}T${time}:00`).toISOString();
      const payload: Parameters<typeof api.departments.joinRequests.scheduleInterview>[2] =
        {
          interviewScheduledAt: iso,
          interviewFormat: format,
          interviewerOneId: oneId,
        };
      if (location.trim()) payload.interviewLocation = location.trim();
      if (twoId) payload.interviewerTwoId = twoId;
      return (
        await api.departments.joinRequests.scheduleInterview(branchDeptId, row.id, payload)
      ).data!;
    },
    onSuccess: onDone,
    onError: (e) =>
      alert.info(
        'Could not schedule',
        e instanceof Error ? e.message : 'Please try again.',
      ),
  });

  return (
    <SheetShell
      open={open}
      title="Schedule interview"
      onClose={onClose}
      footer={
        <>
          <Button
            label={mutate.isPending ? 'Scheduling…' : 'Schedule'}
            size="lg"
            fullWidth
            loading={mutate.isPending}
            onPress={() => {
              if (!date) return alert.info('Missing date', 'Choose an interview date.');
              if (!oneId) return alert.info('Missing interviewer', 'Pick at least one interviewer.');
              mutate.mutate();
            }}
          />
          <Pressable style={styles.cancelBtn} onPress={onClose}>
            <Text style={styles.cancelLabel}>Cancel</Text>
          </Pressable>
        </>
      }
    >
      <DatePicker label="Date" value={date} onChange={setDate} />
      <TimePicker label="Time" value={time} onChange={setTime} />
      <View style={{ gap: 4 }}>
        <Text style={styles.fieldLabel}>Format</Text>
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          {(['in_person', 'virtual'] as const).map((f) => {
            const active = format === f;
            return (
              <Pressable
                key={f}
                style={[styles.segmentBtn, active && styles.segmentBtnActive]}
                onPress={() => setFormat(f)}
              >
                <Text style={[styles.segmentLabel, active && styles.segmentLabelActive]}>
                  {f === 'in_person' ? 'In person' : 'Virtual'}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
      <View style={{ gap: 4 }}>
        <Text style={styles.fieldLabel}>Location {format === 'virtual' ? '(meeting link)' : '(room / address)'}</Text>
        <Input value={location} onChangeText={setLocation} placeholder="Optional" />
      </View>
      <MemberPickerRow
        label="Interviewer 1"
        members={members}
        value={oneId}
        onChange={setOneId}
        exclude={twoId}
      />
      <MemberPickerRow
        label="Interviewer 2 (optional)"
        members={members}
        value={twoId}
        onChange={setTwoId}
        exclude={oneId}
      />
    </SheetShell>
  );
}

function RecordInterviewSheet({
  open,
  row,
  branchDeptId,
  onClose,
  onDone,
}: {
  open: boolean;
  row: DepartmentJoinRequestWithMember | null;
  branchDeptId: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const styles = useThemedStyles(makeStyles);
  const [outcome, setOutcome] = useState<'pass' | 'fail'>('pass');
  const [notes, setNotes] = useState('');

  const mutate = useMutation({
    mutationFn: async () => {
      if (!row) throw new Error('No row');
      const payload: Parameters<typeof api.departments.joinRequests.recordInterview>[2] = {
        interviewOutcome: outcome,
      };
      if (notes.trim()) payload.interviewNotes = notes.trim();
      return (
        await api.departments.joinRequests.recordInterview(branchDeptId, row.id, payload)
      ).data!;
    },
    onSuccess: onDone,
    onError: (e) =>
      alert.info('Could not save', e instanceof Error ? e.message : 'Please try again.'),
  });

  return (
    <SheetShell
      open={open}
      title="Record interview outcome"
      onClose={onClose}
      footer={
        <>
          <Button
            label={mutate.isPending ? 'Saving…' : 'Save outcome'}
            size="lg"
            fullWidth
            loading={mutate.isPending}
            onPress={() => mutate.mutate()}
          />
          <Pressable style={styles.cancelBtn} onPress={onClose}>
            <Text style={styles.cancelLabel}>Cancel</Text>
          </Pressable>
        </>
      }
    >
      <View style={{ gap: 4 }}>
        <Text style={styles.fieldLabel}>Outcome</Text>
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          {(['pass', 'fail'] as const).map((o) => {
            const active = outcome === o;
            return (
              <Pressable
                key={o}
                style={[styles.segmentBtn, active && styles.segmentBtnActive]}
                onPress={() => setOutcome(o)}
              >
                <Text style={[styles.segmentLabel, active && styles.segmentLabelActive]}>
                  {o === 'pass' ? 'Passed' : 'Did not pass'}
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
          placeholder="Optional notes"
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          containerStyle={{ minHeight: 80 }}
        />
      </View>
    </SheetShell>
  );
}

function ExtendOfferSheet({
  open,
  row,
  branchDeptId,
  onClose,
  onDone,
}: {
  open: boolean;
  row: DepartmentJoinRequestWithMember | null;
  branchDeptId: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const styles = useThemedStyles(makeStyles);
  const [expires, setExpires] = useState('');
  const [message, setMessage] = useState('');
  const [probationDays, setProbationDays] = useState('30');

  const mutate = useMutation({
    mutationFn: async () => {
      if (!row) throw new Error('No row');
      const payload: Parameters<typeof api.departments.joinRequests.extendOffer>[2] = {};
      if (expires) payload.offerExpiresAt = new Date(`${expires}T23:59:59`).toISOString();
      if (message.trim()) payload.offerMessage = message.trim();
      const days = parseInt(probationDays, 10);
      if (!Number.isNaN(days) && days > 0) payload.probationDays = days;
      return (await api.departments.joinRequests.extendOffer(branchDeptId, row.id, payload))
        .data!;
    },
    onSuccess: onDone,
    onError: (e) =>
      alert.info('Could not send offer', e instanceof Error ? e.message : 'Please try again.'),
  });

  return (
    <SheetShell
      open={open}
      title="Extend offer"
      onClose={onClose}
      footer={
        <>
          <Button
            label={mutate.isPending ? 'Sending…' : 'Send offer'}
            size="lg"
            fullWidth
            loading={mutate.isPending}
            onPress={() => mutate.mutate()}
          />
          <Pressable style={styles.cancelBtn} onPress={onClose}>
            <Text style={styles.cancelLabel}>Cancel</Text>
          </Pressable>
        </>
      }
    >
      <DatePicker label="Offer expires (optional)" value={expires} onChange={setExpires} />
      <View style={{ gap: 4 }}>
        <Text style={styles.fieldLabel}>Message (optional)</Text>
        <Input
          value={message}
          onChangeText={setMessage}
          placeholder="Welcome them and set expectations"
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          containerStyle={{ minHeight: 80 }}
        />
      </View>
      <View style={{ gap: 4 }}>
        <Text style={styles.fieldLabel}>Probation length (days)</Text>
        <Input
          value={probationDays}
          onChangeText={setProbationDays}
          keyboardType="number-pad"
          placeholder="30"
        />
      </View>
    </SheetShell>
  );
}

function ProbationSheet({
  open,
  row,
  branchDeptId,
  onClose,
  onDone,
}: {
  open: boolean;
  row: DepartmentJoinRequestWithMember | null;
  branchDeptId: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const styles = useThemedStyles(makeStyles);
  const [outcome, setOutcome] = useState<'passed' | 'failed'>('passed');
  const [notes, setNotes] = useState('');

  const mutate = useMutation({
    mutationFn: async () => {
      if (!row) throw new Error('No row');
      const payload: Parameters<typeof api.departments.joinRequests.evaluateProbation>[2] =
        { probationOutcome: outcome };
      if (notes.trim()) payload.probationNotes = notes.trim();
      return (
        await api.departments.joinRequests.evaluateProbation(branchDeptId, row.id, payload)
      ).data!;
    },
    onSuccess: onDone,
    onError: (e) =>
      alert.info('Could not save', e instanceof Error ? e.message : 'Please try again.'),
  });

  return (
    <SheetShell
      open={open}
      title="Evaluate probation"
      onClose={onClose}
      footer={
        <>
          <Button
            label={mutate.isPending ? 'Saving…' : 'Save decision'}
            size="lg"
            fullWidth
            loading={mutate.isPending}
            onPress={() => mutate.mutate()}
          />
          <Pressable style={styles.cancelBtn} onPress={onClose}>
            <Text style={styles.cancelLabel}>Cancel</Text>
          </Pressable>
        </>
      }
    >
      <View style={{ gap: 4 }}>
        <Text style={styles.fieldLabel}>Outcome</Text>
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          {(['passed', 'failed'] as const).map((o) => {
            const active = outcome === o;
            return (
              <Pressable
                key={o}
                style={[styles.segmentBtn, active && styles.segmentBtnActive]}
                onPress={() => setOutcome(o)}
              >
                <Text style={[styles.segmentLabel, active && styles.segmentLabelActive]}>
                  {o === 'passed' ? 'Passed' : 'Failed'}
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
          placeholder="Optional"
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          containerStyle={{ minHeight: 80 }}
        />
      </View>
    </SheetShell>
  );
}

function RejectSheet({
  open,
  row,
  branchDeptId,
  onClose,
  onDone,
}: {
  open: boolean;
  row: DepartmentJoinRequestWithMember | null;
  branchDeptId: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const styles = useThemedStyles(makeStyles);
  const [notes, setNotes] = useState('');

  const mutate = useMutation({
    mutationFn: async () => {
      if (!row) throw new Error('No row');
      const payload: Parameters<typeof api.departments.joinRequests.reject>[2] = {};
      if (notes.trim()) payload.reviewNotes = notes.trim();
      return (await api.departments.joinRequests.reject(branchDeptId, row.id, payload)).data!;
    },
    onSuccess: onDone,
    onError: (e) =>
      alert.info('Could not reject', e instanceof Error ? e.message : 'Please try again.'),
  });

  return (
    <SheetShell
      open={open}
      title="Reject application"
      onClose={onClose}
      footer={
        <>
          <Button
            label={mutate.isPending ? 'Rejecting…' : 'Reject application'}
            size="lg"
            fullWidth
            loading={mutate.isPending}
            onPress={() => mutate.mutate()}
          />
          <Pressable style={styles.cancelBtn} onPress={onClose}>
            <Text style={styles.cancelLabel}>Cancel</Text>
          </Pressable>
        </>
      }
    >
      <View style={{ gap: 4 }}>
        <Text style={styles.fieldLabel}>Reason (optional, private)</Text>
        <Input
          value={notes}
          onChangeText={setNotes}
          placeholder="Why is this being rejected?"
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          containerStyle={{ minHeight: 80 }}
        />
      </View>
    </SheetShell>
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
      gap: spacing.lg,
    },
    contextLine: { ...typography.meta, color: c.inkMuted },
    emptyLine: { ...typography.body, color: c.inkMuted },
    stageBlock: { gap: spacing.sm },
    stageHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    stageTitle: { ...typography.eyebrow, color: c.inkMuted, flex: 1 },
    appHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    appName: { ...typography.body, color: c.ink, fontWeight: '700' },
    appMeta: { ...typography.meta, color: c.inkMuted },
    profileLinkRow: { paddingVertical: 2 },
    profileLink: { ...typography.meta, color: c.primary, fontWeight: '600' },
    notesBlock: {
      flexDirection: 'row',
      gap: spacing.xs,
      alignItems: 'flex-start',
      backgroundColor: c.subtle,
      padding: spacing.sm,
      borderRadius: radii.sm,
    },
    notesText: { ...typography.meta, color: c.ink, flex: 1, lineHeight: 16 },
    stageDetail: { ...typography.meta, color: c.inkMuted, lineHeight: 15 },
    actionRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.xs,
      marginTop: spacing.xs,
    },
    actionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: spacing.sm,
      paddingVertical: 6,
      borderRadius: radii.sm,
      backgroundColor: 'rgba(93,63,211,0.1)',
    },
    actionBtnLabel: { ...typography.meta, color: c.primary, fontWeight: '700' },
    actionBtnDanger: { backgroundColor: 'rgba(220,38,38,0.1)' },
    actionBtnLabelDanger: { color: c.danger },
    fieldLabel: { ...typography.eyebrow, color: c.ink, opacity: 0.6 },
    pickerField: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: radii.md,
      paddingHorizontal: spacing.md,
      minHeight: 44,
    },
    pickerValue: { ...typography.body, color: c.ink, flex: 1 },
    pickerPlaceholder: { ...typography.body, color: c.inkFaded, flex: 1 },
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
    sheetRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.sm,
      borderRadius: radii.md,
    },
    sheetRowActive: { backgroundColor: 'rgba(93,63,211,0.08)' },
    sheetRowLabel: { ...typography.body, color: c.ink },
    sheetRowLabelActive: { color: c.primary, fontWeight: '600' },
    cancelBtn: { alignItems: 'center', paddingVertical: spacing.sm },
    cancelLabel: { ...typography.button, color: c.primary },
    segmentBtn: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: spacing.sm,
      borderRadius: radii.md,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
    },
    segmentBtnActive: {
      backgroundColor: 'rgba(93,63,211,0.1)',
      borderColor: c.primary,
    },
    segmentLabel: { ...typography.body, color: c.inkMuted, fontWeight: '600' },
    segmentLabelActive: { color: c.primary, fontWeight: '700' },
  });
}
