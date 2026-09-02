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
  Check,
  Clock,
  Plus,
  ChevronRight,
  X,
} from 'lucide-react-native';
import {
  Avatar,
  Badge,
  Button,
  Card,
  DatePicker,
  TimePicker,
  radii,
  spacing,
  typography,
  useThemedStyles,
  type ThemeColors,
  useColors,
} from '@kairos/ui-native';
import type {
  FellowshipFollowupWithDetails,
  FellowshipMemberWithDetails,
  FollowupMethod,
  OverdueFollowupRow,
} from '@kairos/types';
import { ContactMethod, ContactStatus } from '@kairos/types';
import { api } from '@/lib/api-client';
import { useCapabilities, useRequireCapability } from '@/lib/capabilities';
import { alert } from '@/lib/alert';
import { MemberPickerSheet } from '@/components/member-picker-sheet';

type Tab = 'overdue' | 'all';

export default function FellowshipFollowups() {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  const router = useRouter();
  const qc = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();
  const fellowshipId = id!;

  const [tab, setTab] = useState<Tab>('overdue');
  const [createFor, setCreateFor] = useState<{
    memberId: string;
    memberName: string;
  } | null>(null);
  const [memberPickerOpen, setMemberPickerOpen] = useState(false);

  const fellowship = useQuery({
    queryKey: ['fellowships', fellowshipId],
    enabled: !!fellowshipId,
    queryFn: async () => (await api.fellowships.get(fellowshipId)).data ?? null,
  });

  const caps = useCapabilities();
  const canAccess =
    !fellowship.data
      ? true
      : caps.systemRole === 'admin' ||
        caps.has('fellowship:write', {
          kind: 'fellowship',
          id: fellowshipId,
          branchId: fellowship.data.branchId,
        }) ||
        caps.has('branch:write', { kind: 'branch', id: fellowship.data.branchId });
  useRequireCapability(canAccess);

  const members = useQuery({
    queryKey: ['fellowships', fellowshipId, 'members'],
    enabled: !!fellowshipId,
    queryFn: async () => (await api.fellowships.members.list(fellowshipId)).data ?? [],
  });

  const overdue = useQuery({
    queryKey: ['fellowships', fellowshipId, 'followups', 'overdue'],
    enabled: !!fellowshipId && tab === 'overdue',
    queryFn: async () =>
      (await api.fellowships.followups.listOverdue(fellowshipId)).data ?? [],
  });

  const all = useQuery({
    queryKey: ['fellowships', fellowshipId, 'followups', 'all'],
    enabled: !!fellowshipId && tab === 'all',
    queryFn: async () =>
      (await api.fellowships.followups.listForFellowship(fellowshipId)).data ?? [],
  });

  const invalidate = () =>
    qc.invalidateQueries({ queryKey: ['fellowships', fellowshipId, 'followups'] });

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
        {fellowship.data ? (
          <Text style={styles.contextLine}>
            {fellowship.data.fellowshipName}
            {fellowship.data.branchName ? ` · ${fellowship.data.branchName}` : ''}
          </Text>
        ) : null}

        {tab === 'overdue' ? (
          overdue.isLoading ? (
            <ActivityIndicator color={c.primary} style={{ marginTop: spacing.xxl }} />
          ) : (overdue.data ?? []).length === 0 ? (
            <Card padding="md">
              <Text style={styles.emptyLine}>Nothing overdue. Nicely kept up.</Text>
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

      {createFor && fellowship.data ? (
        <CreateSheet
          fellowshipId={fellowshipId}
          branchId={fellowship.data.branchId}
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

function FollowupCard({ row }: { row: FellowshipFollowupWithDetails }) {
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

// ── CreateSheet — Type-driven follow-up form ─────────────────
// Top-level Type picker (Contact | Visit). Rest of the form swaps to the
// matching field set. Legacy contactMethod/contactStatus stay populated so old
// readers keep working.

type FollowupTypeChoice = 'contact' | 'visit';
type InterestChoice = 'interested' | 'not_interested' | 'undecided';
type VisitKindChoice = 'in_person' | 'virtual';
type VisitOutcomeChoice = 'present' | 'not_present' | 'rescheduled';

const CONTACT_METHOD_OPTIONS: { value: FollowupMethod; label: string }[] = [
  { value: 'phone_call', label: 'Phone Call' },
  { value: 'text_message', label: 'Text' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'email', label: 'Email' },
];

function methodToLegacyContactMethod(m: FollowupMethod): ContactMethod {
  switch (m) {
    case 'phone_call':
      return ContactMethod.PhoneCall;
    case 'text_message':
      return ContactMethod.TextMessage;
    case 'whatsapp':
      return ContactMethod.WhatsApp;
    case 'email':
      return ContactMethod.Email;
    case 'in_person':
      return ContactMethod.InPersonVisit;
    case 'virtual':
    case 'other':
    default:
      return ContactMethod.Other;
  }
}

function CreateSheet({
  fellowshipId,
  branchId,
  member,
  onClose,
  onDone,
}: {
  fellowshipId: string;
  branchId: string;
  member: { memberId: string; memberName: string };
  onClose: () => void;
  onDone: () => void;
}) {
  const styles = useThemedStyles(makeStyles);
  const [contactedAt, setContactedAt] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [type, setType] = useState<FollowupTypeChoice>('contact');

  // Contact state
  const [methods, setMethods] = useState<Set<FollowupMethod>>(new Set());
  const [contactReached, setContactReached] = useState<boolean | null>(null);
  const [interestLevel, setInterestLevel] = useState<InterestChoice | null>(null);

  // Visit state
  const [visitKind, setVisitKind] = useState<VisitKindChoice | null>(null);
  const [visitAnnounced, setVisitAnnounced] = useState<boolean | null>(null);
  const [arrivalTime, setArrivalTime] = useState('');
  const [departureTime, setDepartureTime] = useState('');
  const [companions, setCompanions] = useState<string[]>([]);
  const [companionPickerOpen, setCompanionPickerOpen] = useState(false);
  const [visitOutcome, setVisitOutcome] = useState<VisitOutcomeChoice | null>(null);
  const [welfareConcern, setWelfareConcern] = useState(false);
  const [safeguardingConcern, setSafeguardingConcern] = useState(false);

  // Shared
  const [notes, setNotes] = useState('');
  const [nextDate, setNextDate] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (type === 'contact') {
      if (methods.size === 0) next['methods'] = 'Pick at least one method.';
      if (contactReached === null) next['reached'] = 'Did you reach them?';
    } else {
      if (!visitKind) next['visitKind'] = 'Pick a visit kind.';
      if (visitAnnounced === null) next['announced'] = 'Announced or unannounced?';
      if (!arrivalTime) next['arrival'] = 'Arrival time is required.';
      if (!visitOutcome) next['outcome'] = 'Pick an outcome.';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  const mutate = useMutation({
    mutationFn: async () => {
      const payload: Parameters<typeof api.fellowships.followups.create>[2] = {
        contactedAt: new Date(`${contactedAt}T12:00:00`).toISOString(),
        // populated below per-type
        contactMethod: ContactMethod.Other,
        contactStatus: ContactStatus.Successful,
      };

      if (type === 'contact') {
        const methodList = Array.from(methods);
        const primary = methodList[0]!;
        payload.type = 'contact';
        payload.methods = methodList;
        payload.contactMethod = methodToLegacyContactMethod(primary);
        payload.contactReached = contactReached === true;
        if (contactReached === true && interestLevel) {
          payload.interestLevel = interestLevel;
        }
        // Legacy status derivation
        if (contactReached === true && interestLevel === 'interested') {
          payload.contactStatus = ContactStatus.Interested;
        } else if (interestLevel === 'not_interested') {
          payload.contactStatus = ContactStatus.NotInterested;
        } else if (contactReached === false) {
          payload.contactStatus = ContactStatus.NoAnswer;
        } else {
          payload.contactStatus = ContactStatus.Successful;
        }
      } else {
        payload.type = 'visit';
        payload.methods = [visitKind === 'virtual' ? 'virtual' : 'in_person'];
        payload.contactMethod = ContactMethod.InPersonVisit; // legacy label
        payload.visitKind = visitKind!;
        payload.visitAnnounced = visitAnnounced === true;
        payload.visitArrivalAt = new Date(
          `${contactedAt}T${arrivalTime}:00`,
        ).toISOString();
        if (departureTime) {
          payload.visitDepartureAt = new Date(
            `${contactedAt}T${departureTime}:00`,
          ).toISOString();
        }
        payload.visitOutcome = visitOutcome!;
        if (companions.length > 0) payload.companionMemberIds = companions;
        if (welfareConcern) payload.welfareConcern = true;
        if (safeguardingConcern) payload.safeguardingConcern = true;
        // Legacy status derivation
        if (visitOutcome === 'present') {
          payload.contactStatus = ContactStatus.Successful;
        } else if (visitOutcome === 'not_present') {
          payload.contactStatus = ContactStatus.NoAnswer;
        } else {
          payload.contactStatus = ContactStatus.CallBackLater;
        }
      }

      if (notes.trim()) payload.notes = notes.trim();
      if (nextDate) payload.nextFollowUpDate = nextDate;
      return (
        await api.fellowships.followups.create(
          fellowshipId,
          member.memberId,
          payload,
        )
      ).data!;
    },
    onSuccess: onDone,
    onError: (e) =>
      alert.info('Could not save', e instanceof Error ? e.message : 'Please try again.'),
  });

  function handleSave() {
    if (!validate()) return;
    mutate.mutate();
  }

  function toggleMethod(m: FollowupMethod) {
    setMethods((prev) => {
      const next = new Set(prev);
      if (next.has(m)) next.delete(m);
      else next.add(m);
      return next;
    });
  }

  const excludeCompanions = useMemo(
    () => new Set<string>([member.memberId, ...companions]),
    [member.memberId, companions],
  );

  return (
    <>
      <SheetShell open title={`Follow-up · ${member.memberName}`} onClose={onClose}>
        <DatePicker
          label="Contacted on"
          value={contactedAt}
          onChange={setContactedAt}
        />

        <View style={{ gap: 4 }}>
          <Text style={styles.fieldLabel}>Type</Text>
          <View style={styles.chipRow}>
            {(['contact', 'visit'] as FollowupTypeChoice[]).map((t) => {
              const active = t === type;
              return (
                <Pressable
                  key={t}
                  onPress={() => {
                    setType(t);
                    setErrors({});
                  }}
                  style={[styles.chip, active && styles.chipActive]}
                >
                  <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>
                    {t === 'contact' ? 'Contact' : 'Visit'}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {type === 'contact' ? (
          <>
            <View style={{ gap: 4 }}>
              <Text style={styles.fieldLabel}>Methods (pick one or more)</Text>
              <View style={styles.chipRow}>
                {CONTACT_METHOD_OPTIONS.map(({ value, label }) => {
                  const active = methods.has(value);
                  return (
                    <Pressable
                      key={value}
                      onPress={() => toggleMethod(value)}
                      style={[styles.chip, active && styles.chipActive]}
                    >
                      <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>
                        {label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              {errors['methods'] ? (
                <Text style={styles.errorLine}>{errors['methods']}</Text>
              ) : null}
            </View>

            <View style={{ gap: 4 }}>
              <Text style={styles.fieldLabel}>Reached them?</Text>
              <View style={styles.chipRow}>
                {(
                  [
                    { value: true, label: 'Yes' },
                    { value: false, label: 'No' },
                  ] as { value: boolean; label: string }[]
                ).map(({ value, label }) => {
                  const active = contactReached === value;
                  return (
                    <Pressable
                      key={label}
                      onPress={() => {
                        setContactReached(value);
                        if (value === false) setInterestLevel(null);
                      }}
                      style={[styles.chip, active && styles.chipActive]}
                    >
                      <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>
                        {label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              {errors['reached'] ? (
                <Text style={styles.errorLine}>{errors['reached']}</Text>
              ) : null}
            </View>

            {contactReached === true ? (
              <View style={{ gap: 4 }}>
                <Text style={styles.fieldLabel}>Interest</Text>
                <View style={styles.chipRow}>
                  {(
                    [
                      { value: 'interested', label: 'Interested' },
                      { value: 'not_interested', label: 'Not interested' },
                      { value: 'undecided', label: 'Undecided' },
                    ] as { value: InterestChoice; label: string }[]
                  ).map(({ value, label }) => {
                    const active = interestLevel === value;
                    return (
                      <Pressable
                        key={value}
                        onPress={() => setInterestLevel(value)}
                        style={[styles.chip, active && styles.chipActive]}
                      >
                        <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>
                          {label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ) : null}
          </>
        ) : (
          <>
            <View style={{ gap: 4 }}>
              <Text style={styles.fieldLabel}>Kind</Text>
              <View style={styles.chipRow}>
                {(
                  [
                    { value: 'in_person', label: 'In-person' },
                    { value: 'virtual', label: 'Virtual' },
                  ] as { value: VisitKindChoice; label: string }[]
                ).map(({ value, label }) => {
                  const active = visitKind === value;
                  return (
                    <Pressable
                      key={value}
                      onPress={() => setVisitKind(value)}
                      style={[styles.chip, active && styles.chipActive]}
                    >
                      <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>
                        {label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              {errors['visitKind'] ? (
                <Text style={styles.errorLine}>{errors['visitKind']}</Text>
              ) : null}
            </View>

            <View style={{ gap: 4 }}>
              <Text style={styles.fieldLabel}>Announced?</Text>
              <View style={styles.chipRow}>
                {(
                  [
                    { value: true, label: 'Announced' },
                    { value: false, label: 'Unannounced' },
                  ] as { value: boolean; label: string }[]
                ).map(({ value, label }) => {
                  const active = visitAnnounced === value;
                  return (
                    <Pressable
                      key={label}
                      onPress={() => setVisitAnnounced(value)}
                      style={[styles.chip, active && styles.chipActive]}
                    >
                      <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>
                        {label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              {errors['announced'] ? (
                <Text style={styles.errorLine}>{errors['announced']}</Text>
              ) : null}
            </View>

            <View style={{ gap: 4 }}>
              <TimePicker
                label="Arrival time"
                value={arrivalTime}
                onChange={setArrivalTime}
                error={errors['arrival'] ?? null}
              />
            </View>

            <TimePicker
              label="Departure time (optional)"
              value={departureTime}
              onChange={setDepartureTime}
            />

            <View style={{ gap: 4 }}>
              <Text style={styles.fieldLabel}>Went with (optional)</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.companionRow}
              >
                {companions.map((cid) => (
                  <CompanionChip
                    key={cid}
                    memberId={cid}
                    onRemove={() =>
                      setCompanions((prev) => prev.filter((x) => x !== cid))
                    }
                  />
                ))}
                <Pressable
                  onPress={() => setCompanionPickerOpen(true)}
                  style={styles.companionAddBtn}
                >
                  <Plus color="#ffffff" size={12} strokeWidth={2} />
                  <Text style={styles.companionAddLabel}>Add companion</Text>
                </Pressable>
              </ScrollView>
            </View>

            <View style={{ gap: 4 }}>
              <Text style={styles.fieldLabel}>Outcome</Text>
              <View style={styles.chipRow}>
                {(
                  [
                    { value: 'present', label: 'Present' },
                    { value: 'not_present', label: 'Not present' },
                    { value: 'rescheduled', label: 'Rescheduled' },
                  ] as { value: VisitOutcomeChoice; label: string }[]
                ).map(({ value, label }) => {
                  const active = visitOutcome === value;
                  return (
                    <Pressable
                      key={value}
                      onPress={() => setVisitOutcome(value)}
                      style={[styles.chip, active && styles.chipActive]}
                    >
                      <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>
                        {label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              {errors['outcome'] ? (
                <Text style={styles.errorLine}>{errors['outcome']}</Text>
              ) : null}
            </View>
          </>
        )}

        <View style={{ gap: 4 }}>
          <Text style={styles.fieldLabel}>Notes</Text>
          <AutoGrowTextarea
            value={notes}
            onChangeText={setNotes}
            placeholder="What was discussed?"
          />
        </View>

        {type === 'visit' ? (
          <>
            <CheckboxRow
              label="Welfare concern noted"
              value={welfareConcern}
              onToggle={() => setWelfareConcern((v) => !v)}
            />
            <CheckboxRow
              label="Safeguarding matter"
              value={safeguardingConcern}
              onToggle={() => setSafeguardingConcern((v) => !v)}
            />
          </>
        ) : null}

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
          onPress={handleSave}
        />
      </SheetShell>

      <MemberPickerSheet
        open={companionPickerOpen}
        onClose={() => setCompanionPickerOpen(false)}
        branchId={branchId}
        excludeMemberIds={excludeCompanions}
        onPick={(memberId) => {
          setCompanions((prev) => (prev.includes(memberId) ? prev : [...prev, memberId]));
          setCompanionPickerOpen(false);
        }}
        title="Add companion"
        subtitle="Who came along on the visit?"
      />
    </>
  );
}

// ── Local helper components ─────────────────────────────────

function AutoGrowTextarea({
  value,
  onChangeText,
  placeholder,
}: {
  value: string;
  onChangeText: (s: string) => void;
  placeholder?: string;
}) {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  const [height, setHeight] = useState(80);
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={c.inkFaded}
      multiline
      scrollEnabled
      textAlignVertical="top"
      onContentSizeChange={(e) => {
        const h = Math.max(80, Math.min(280, e.nativeEvent.contentSize.height + 12));
        setHeight(h);
      }}
      style={[styles.textarea, { height, maxHeight: 280 }]}
    />
  );
}

function CheckboxRow({
  label,
  value,
  onToggle,
}: {
  label: string;
  value: boolean;
  onToggle: () => void;
}) {
  const styles = useThemedStyles(makeStyles);
  return (
    <Pressable onPress={onToggle} style={styles.checkboxRow}>
      <View style={[styles.checkboxBox, value && styles.checkboxBoxChecked]}>
        {value ? <Check color="#ffffff" size={12} strokeWidth={2.5} /> : null}
      </View>
      <Text style={styles.checkboxLabel}>{label}</Text>
    </Pressable>
  );
}

function CompanionChip({
  memberId,
  onRemove,
}: {
  memberId: string;
  onRemove: () => void;
}) {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  const q = useQuery({
    queryKey: ['members', memberId],
    queryFn: async () => (await api.members.get(memberId)).data ?? null,
  });
  const name = q.data
    ? `${q.data.firstName} ${q.data.lastName}`
    : '…';
  return (
    <View style={styles.companionChip}>
      <Text style={styles.companionChipLabel}>{name}</Text>
      <Pressable onPress={onRemove} hitSlop={6}>
        <X color={c.inkMuted} size={12} strokeWidth={2} />
      </Pressable>
    </View>
  );
}

function MemberPickSheet({
  open,
  members,
  onClose,
  onPick,
}: {
  open: boolean;
  members: FellowshipMemberWithDetails[];
  onClose: () => void;
  onPick: (m: FellowshipMemberWithDetails) => void;
}) {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  return (
    <SheetShell open={open} title="Which member?" onClose={onClose}>
      {members.length === 0 ? (
        <Text style={styles.emptyLine}>No members in this fellowship yet.</Text>
      ) : (
        members.map((m) => (
          <Pressable key={m.id} style={styles.pickRow} onPress={() => onPick(m)}>
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
    errorLine: { ...typography.meta, color: c.danger, marginTop: 4 },
    textarea: {
      ...typography.body,
      color: c.ink,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: radii.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      minHeight: 80,
    },
    checkboxRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    checkboxBox: {
      width: 20,
      height: 20,
      borderRadius: 4,
      borderWidth: 1.5,
      borderColor: c.divider,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.card,
    },
    checkboxBoxChecked: {
      backgroundColor: c.primary,
      borderColor: c.primary,
    },
    checkboxLabel: {
      ...typography.body,
      color: c.ink,
      flex: 1,
    },
    companionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 2,
    },
    companionChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: spacing.sm,
      paddingVertical: 6,
      borderRadius: radii.pill,
      backgroundColor: c.subtle,
      borderWidth: 1,
      borderColor: c.border,
    },
    companionChipLabel: { ...typography.meta, color: c.ink, fontWeight: '600' },
    companionAddBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: c.primary,
      paddingHorizontal: spacing.sm,
      paddingVertical: 6,
      borderRadius: radii.pill,
    },
    companionAddLabel: { ...typography.meta, color: '#ffffff', fontWeight: '700' },
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
