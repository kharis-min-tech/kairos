import { useState } from 'react';
import { View, Text, Modal, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { UserPlus } from 'lucide-react-native';
import {
  Button,
  Card,
  EmptyState,
  DatePicker,
  Input,
  radii,
  spacing,
  typography,
  useThemedStyles,
  useColors,
  type ThemeColors,
} from '@kairos/ui-native';
import type { AddMyChildRequest } from '@kairos/types';
import { api } from '@/lib/api-client';
import { alert } from '@/lib/alert';

const RELATIONSHIPS = ['Mother', 'Father', 'Grandparent', 'Guardian', 'Carer', 'Other'] as const;

function ageFrom(dateOfBirth: string | null): string {
  if (!dateOfBirth) return 'Age unknown';
  const dob = new Date(dateOfBirth);
  if (Number.isNaN(dob.getTime())) return 'Age unknown';
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const beforeBirthday =
    now.getMonth() < dob.getMonth() ||
    (now.getMonth() === dob.getMonth() && now.getDate() < dob.getDate());
  if (beforeBirthday) age -= 1;
  if (age < 1) return 'Under 1';
  return `${age} year${age === 1 ? '' : 's'} old`;
}

/**
 * The children on your own record, on a phone.
 *
 * Under-16s cannot sign in, so a parent holds the record. Adding is
 * self-service because the parent is the source of the data; claiming a child
 * who already exists is deliberately not offered — that needs someone who can
 * verify the claim and stays with the branch admins.
 */
export function MyChildren() {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const children = useQuery({
    queryKey: ['me', 'children'],
    queryFn: async () => (await api.me.children.list()).data ?? [],
  });

  const addChild = useMutation({
    mutationFn: async (data: AddMyChildRequest) =>
      (await api.me.children.add(data)).data!,
    onSuccess: (child) => {
      setOpen(false);
      void qc.invalidateQueries({ queryKey: ['me', 'children'] });
      alert.info('Child added', `${child.firstName} is now on your record.`);
    },
    onError: (err) =>
      alert.info(
        'Could not add child',
        err instanceof Error ? err.message : 'Please try again in a moment.',
      ),
  });

  const rows = children.data ?? [];

  return (
    <>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>My children</Text>
        <Pressable
          onPress={() => setOpen(true)}
          hitSlop={8}
          style={styles.addRow}
          accessibilityRole="button"
          accessibilityLabel="Add a child"
        >
          <UserPlus color={c.primary} size={16} strokeWidth={1.8} />
          <Text style={styles.addLabel}>Add</Text>
        </Pressable>
      </View>

      {rows.length === 0 ? (
        <Card padding="md">
          {/* No title: the section header above already says "My children". */}
          <EmptyState message="Nobody added yet. Add a child so they can be registered for the children&apos;s department and checked in at services." />
        </Card>
      ) : (
        <Card padding="none" style={{ overflow: 'hidden' }}>
          {rows.map((child, i) => (
            <View
              key={child.id}
              style={[styles.childRow, i > 0 && styles.childRowDivided]}
            >
              <View style={styles.initialsTile}>
                <Text style={styles.initials}>
                  {child.firstName.charAt(0)}
                  {child.lastName.charAt(0)}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.childName}>
                  {child.firstName} {child.lastName}
                </Text>
                <Text style={styles.childMeta}>
                  {ageFrom(child.dateOfBirth)}
                  {child.relationship
                    ? ` · you are their ${child.relationship.toLowerCase()}`
                    : ''}
                </Text>
              </View>
            </View>
          ))}
        </Card>
      )}

      <Text style={styles.footnote}>
        Children have no login of their own — their record lives here with
        yours. To correct one or add a second guardian, ask your branch admin.
      </Text>

      <AddChildSheet
        open={open}
        submitting={addChild.isPending}
        onClose={() => setOpen(false)}
        onSubmit={(data) => addChild.mutate(data)}
      />
    </>
  );
}

function AddChildSheet({
  open,
  submitting,
  onClose,
  onSubmit,
}: {
  open: boolean;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (data: AddMyChildRequest) => void;
}) {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState<'Male' | 'Female' | ''>('');
  const [relationship, setRelationship] = useState('');

  const canSubmit =
    firstName.trim().length > 0 &&
    lastName.trim().length > 0 &&
    dateOfBirth.length > 0 &&
    !submitting;

  return (
    <Modal visible={open} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.handle} />
          <ScrollView
            style={{ maxHeight: 500 }}
            contentContainerStyle={{ gap: spacing.sm }}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.sheetTitle}>Add a child</Text>
            <Text style={styles.sheetSubtitle}>
              They will be added to your record as someone you are responsible
              for. Children under 16 have no login of their own.
            </Text>

            <Text style={styles.fieldLabel}>First name</Text>
            <Input value={firstName} onChangeText={setFirstName} autoCapitalize="words" />

            <Text style={styles.fieldLabel}>Last name</Text>
            <Input value={lastName} onChangeText={setLastName} autoCapitalize="words" />

            <DatePicker
              label="Date of birth"
              value={dateOfBirth}
              onChange={setDateOfBirth}
              maximumDate={new Date()}
            />
            <Text style={styles.hint}>
              Required — it decides which children&apos;s class they belong in
              and keeps their record protected as a minor.
            </Text>

            <Text style={styles.fieldLabel}>Gender (optional)</Text>
            <View style={styles.chipsRow}>
              {(['Male', 'Female'] as const).map((g) => {
                const active = gender === g;
                return (
                  <Pressable
                    key={g}
                    // Tapping the active choice clears it — "prefer not to
                    // say" has to stay reachable without a reset control.
                    onPress={() => setGender(active ? '' : g)}
                    style={[styles.chip, active && styles.chipActive]}
                  >
                    <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>
                      {g}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.fieldLabel}>You are their (optional)</Text>
            <View style={styles.chipsWrap}>
              {RELATIONSHIPS.map((r) => {
                const active = relationship === r;
                return (
                  <Pressable
                    key={r}
                    onPress={() => setRelationship(active ? '' : r)}
                    style={[styles.chip, active && styles.chipActive]}
                  >
                    <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>
                      {r}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>

          <Button
            label={submitting ? 'Adding…' : 'Add child'}
            fullWidth
            busy={submitting}
            disabled={!canSubmit}
            onPress={() => {
              if (!canSubmit) return;
              onSubmit({
                firstName: firstName.trim(),
                lastName: lastName.trim(),
                dateOfBirth,
                gender: gender || undefined,
                relationship: (relationship || undefined) as
                  | AddMyChildRequest['relationship']
                  | undefined,
              });
            }}
          />
          <Pressable style={styles.cancel} onPress={onClose}>
            <Text style={[styles.cancelLabel, { color: c.inkMuted }]}>Cancel</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: spacing.lg,
      marginBottom: spacing.xs,
    },
    sectionTitle: {
      ...typography.meta,
      color: c.inkFaded,
      letterSpacing: 0.6,
      fontWeight: '700',
      textTransform: 'uppercase',
    },
    addRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    addLabel: { ...typography.meta, color: c.primary, fontWeight: '700' },
    childRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      padding: spacing.md,
    },
    childRowDivided: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.divider },
    initialsTile: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: 'rgba(93,63,211,0.1)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    initials: { ...typography.meta, color: c.primary, fontWeight: '700' },
    childName: { ...typography.body, color: c.ink, fontWeight: '600' },
    childMeta: { ...typography.meta, color: c.inkMuted },
    footnote: {
      ...typography.meta,
      color: c.inkFaded,
      lineHeight: 15,
      marginTop: spacing.xs,
    },
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.45)',
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: c.card,
      borderTopLeftRadius: radii.lg,
      borderTopRightRadius: radii.lg,
      padding: spacing.lg,
      paddingBottom: spacing.xxl,
      gap: spacing.sm,
    },
    handle: {
      alignSelf: 'center',
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: c.divider,
      marginBottom: spacing.xs,
    },
    sheetTitle: { ...typography.cardTitle, color: c.ink },
    sheetSubtitle: { ...typography.meta, color: c.inkMuted, lineHeight: 17 },
    fieldLabel: {
      ...typography.meta,
      color: c.inkMuted,
      fontWeight: '600',
      marginTop: spacing.xs,
    },
    hint: { ...typography.meta, color: c.inkFaded, lineHeight: 15 },
    chipsRow: { flexDirection: 'row', gap: spacing.xs },
    chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
    chip: {
      paddingHorizontal: spacing.md,
      height: 34,
      justifyContent: 'center',
      borderRadius: radii.pill,
      backgroundColor: c.subtle,
    },
    chipActive: { backgroundColor: c.primary },
    chipLabel: { ...typography.meta, color: c.ink, fontWeight: '600' },
    chipLabelActive: { color: '#ffffff' },
    cancel: { alignItems: 'center', paddingVertical: spacing.sm },
    cancelLabel: { ...typography.body, fontWeight: '600' },
  });
}
