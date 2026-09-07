import { useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react-native';
import {
  Button,
  Card,
  Input,
  DatePicker,
  radii,
  spacing,
  typography,
  useThemedStyles,
  type ThemeColors,
  useColors,
} from '@kairos/ui-native';
import { formatShortDate } from '@kairos/core';
import { CHURCH_SCOPE, MEMBERSHIP_SESSION_NUMBERS } from '@kairos/types';
import type { MembershipSessionNumber } from '@kairos/types';
import { api } from '@/lib/api-client';
import { alert } from '@/lib/alert';
import { useCapabilities, useRequireCapability } from '@/lib/capabilities';
import { PickerSheet } from '../_form';

/**
 * Schedule the four sessions of a cohort. Gated on `membership:admin` at
 * CHURCH scope.
 *
 * Sessions are addressed by NUMBER, not by id: there is exactly one session 3
 * per cohort, so saving it twice moves it rather than creating a duplicate.
 * That is why every number 1-4 is always listed, scheduled or not.
 *
 * `teacherId` names whoever is teaching that ONE session. Different people
 * teach different sessions of the same cohort, and being named here confers
 * no permissions at all — admins do the marking.
 */
export default function CohortSessionsScreen() {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const cohortId = params.id ?? '';
  const caps = useCapabilities();

  const isAdmin = caps.has('membership:admin', CHURCH_SCOPE);
  useRequireCapability(isAdmin, '/membership');

  const [openNumber, setOpenNumber] = useState<MembershipSessionNumber | null>(null);

  const cohort = useQuery({
    queryKey: ['membership', 'cohorts', cohortId],
    enabled: isAdmin && !!cohortId,
    queryFn: async () => (await api.membership.cohorts.get(cohortId)).data ?? null,
  });

  if (!isAdmin) return null;

  const sessions = cohort.data?.sessions ?? [];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerBar}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ChevronLeft color={c.ink} size={24} strokeWidth={1.5} />
        </Pressable>
        <Text style={styles.headerTitle}>Sessions</Text>
        <View style={{ width: 24 }} />
      </View>

      {cohort.isLoading ? (
        <ActivityIndicator color={c.primary} style={{ marginTop: spacing.xxl }} />
      ) : (
        <ScrollView contentContainerStyle={styles.container}>
          <Text style={styles.blurb}>
            Every cohort runs four sessions. All four must be scheduled and attended
            before anyone can graduate, so an unscheduled slot blocks the whole cohort.
          </Text>

          {MEMBERSHIP_SESSION_NUMBERS.map((n) => {
            const existing = sessions.find((s) => s.sessionNumber === n);
            return (
              <Pressable key={n} onPress={() => setOpenNumber(n)}>
                <Card style={styles.card}>
                  <View style={styles.cardHead}>
                    <Text style={styles.cardTitle}>
                      Session {n}
                      {existing ? `: ${existing.title}` : ''}
                    </Text>
                    <ChevronRight color={c.inkFaded} size={18} strokeWidth={1.5} />
                  </View>
                  {existing ? (
                    <>
                      <View style={styles.metaRow}>
                        <CalendarDays color={c.inkFaded} size={14} strokeWidth={1.5} />
                        <Text style={styles.metaText}>
                          {existing.sessionDate
                            ? formatShortDate(existing.sessionDate)
                            : 'Date to be confirmed'}
                          {existing.location ? ` · ${existing.location}` : ''}
                        </Text>
                      </View>
                      <Text style={styles.metaText}>
                        {existing.teacherFirstName
                          ? `Taught by ${existing.teacherFirstName} ${existing.teacherLastName}`
                          : 'No teacher assigned'}
                      </Text>
                    </>
                  ) : (
                    <Text style={styles.unscheduled}>Not scheduled yet</Text>
                  )}
                </Card>
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      {openNumber !== null ? (
        <SessionEditor
          cohortId={cohortId}
          sessionNumber={openNumber}
          existing={sessions.find((s) => s.sessionNumber === openNumber) ?? null}
          onClose={() => setOpenNumber(null)}
        />
      ) : null}
    </SafeAreaView>
  );
}

/**
 * Full-screen editor for one session. Rendered as an overlay rather than a
 * route so the list keeps its scroll position and the four slots stay visible
 * as one unit.
 */
function SessionEditor({
  cohortId,
  sessionNumber,
  existing,
  onClose,
}: {
  cohortId: string;
  sessionNumber: MembershipSessionNumber;
  existing: {
    title: string;
    sessionDate?: string | null;
    location?: string | null;
    teacherId?: string | null;
    notes?: string | null;
  } | null;
  onClose: () => void;
}) {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  const qc = useQueryClient();

  const [title, setTitle] = useState(existing?.title ?? '');
  // The API takes a full ISO datetime; the picker speaks YYYY-MM-DD. Keep the
  // date half in state and widen it on submit.
  const [date, setDate] = useState(existing?.sessionDate?.slice(0, 10) ?? '');
  const [location, setLocation] = useState(existing?.location ?? '');
  const [teacherId, setTeacherId] = useState(existing?.teacherId ?? '');
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [titleError, setTitleError] = useState<string | null>(null);
  const [teacherOpen, setTeacherOpen] = useState(false);

  // Any active member can teach a session. This is not a permission list —
  // being named as a session teacher grants nothing.
  const members = useQuery({
    queryKey: ['members', 'forTeacherPicker'],
    queryFn: async () => (await api.members.list({ page: 1, limit: 200 })).data?.data ?? [],
    staleTime: 5 * 60 * 1000,
  });

  const teacherOptions = useMemo(
    () => [
      { value: '', label: 'No teacher assigned' },
      ...(members.data ?? []).map((m) => ({
        value: m.id,
        label: `${m.firstName} ${m.lastName}`,
      })),
    ],
    [members.data],
  );

  const teacherLabel = useMemo(
    () => teacherOptions.find((o) => o.value === teacherId)?.label ?? '',
    [teacherOptions, teacherId],
  );

  const save = useMutation({
    mutationFn: async () =>
      (
        await api.membership.cohorts.saveSession(cohortId, {
          sessionNumber,
          title: title.trim(),
          // Midday rather than midnight so a timezone shift cannot roll the
          // date onto the day before for anyone reading it back.
          sessionDate: date ? new Date(`${date}T12:00:00.000Z`).toISOString() : null,
          location: location.trim() || null,
          teacherId: teacherId || null,
          notes: notes.trim() || null,
        })
      ).data!,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['membership'] });
      onClose();
    },
    onError: (e: unknown) =>
      alert.info('Could not save', e instanceof Error ? e.message : 'Please try again.'),
  });

  function submit() {
    if (title.trim().length < 2) {
      setTitleError('Give the session a title');
      return;
    }
    setTitleError(null);
    save.mutate();
  }

  return (
    <View style={styles.overlay}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.headerBar}>
          <Pressable onPress={onClose} hitSlop={8}>
            <ChevronLeft color={c.ink} size={24} strokeWidth={1.5} />
          </Pressable>
          <Text style={styles.headerTitle}>Session {sessionNumber}</Text>
          <View style={{ width: 24 }} />
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView
            contentContainerStyle={styles.container}
            keyboardShouldPersistTaps="handled"
          >
            <Card padding="md" style={{ gap: spacing.md }}>
              <Text style={styles.fieldLabel}>Title</Text>
              <Input
                value={title}
                onChangeText={(v) => {
                  setTitle(v);
                  setTitleError(null);
                }}
                placeholder="e.g. Who we are as a church"
                error={titleError}
              />

              <Text style={styles.fieldLabel}>Date</Text>
              <DatePicker
                value={date}
                onChange={setDate}
                placeholder="When this session runs"
              />

              <Text style={styles.fieldLabel}>Location</Text>
              <Input
                value={location}
                onChangeText={setLocation}
                placeholder="e.g. Main hall"
              />

              <Text style={styles.fieldLabel}>Teacher</Text>
              <Pressable style={styles.pickerField} onPress={() => setTeacherOpen(true)}>
                <Text style={teacherId ? styles.pickerValue : styles.pickerPlaceholder}>
                  {teacherLabel || 'No teacher assigned'}
                </Text>
                <ChevronRight color={c.inkFaded} size={16} strokeWidth={1.5} />
              </Pressable>
              <Text style={styles.hint}>
                Records who teaches this one session. It grants no permissions.
              </Text>

              <Text style={styles.fieldLabel}>Notes</Text>
              <Input
                value={notes}
                onChangeText={setNotes}
                placeholder="Optional"
                multiline
                numberOfLines={3}
              />
            </Card>

            <Button
              label={save.isPending ? 'Saving…' : 'Save session'}
              onPress={submit}
              disabled={save.isPending}
            />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      <PickerSheet
        open={teacherOpen}
        title="Teacher"
        onClose={() => setTeacherOpen(false)}
        options={teacherOptions}
        selected={teacherId}
        onSelect={setTeacherId}
      />
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.page },
    overlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: c.page,
      zIndex: 10,
    },
    headerBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    headerTitle: { ...typography.screenTitle, color: c.ink },
    container: { padding: spacing.md, gap: spacing.md },
    blurb: { ...typography.meta, color: c.inkMuted },
    card: { gap: spacing.xs, padding: spacing.md },
    cardHead: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.sm,
    },
    cardTitle: { ...typography.body, color: c.ink, fontWeight: '600', flex: 1 },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    metaText: { ...typography.meta, color: c.inkMuted, flexShrink: 1 },
    unscheduled: { ...typography.meta, color: c.inkFaded, fontStyle: 'italic' },
    fieldLabel: { ...typography.meta, color: c.inkMuted, fontWeight: '600' },
    hint: { ...typography.meta, color: c.inkFaded, lineHeight: 15 },
    pickerField: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderWidth: 1,
      borderColor: c.divider,
      borderRadius: radii.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm + 2,
      backgroundColor: c.card,
    },
    pickerValue: { ...typography.body, color: c.ink },
    pickerPlaceholder: { ...typography.body, color: c.inkFaded },
  });
}
