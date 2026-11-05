import { useState } from 'react';
import { View, Text, Modal, Pressable, ScrollView, StyleSheet } from 'react-native';
import { Check } from 'lucide-react-native';
import {
  Button,
  DatePicker,
  radii,
  spacing,
  typography,
  useThemedStyles,
  useColors,
  type ThemeColors,
} from '@kairos/ui-native';
import { MEMBERSHIP_CLASS_DAYS, type MembershipClassDay } from '@kairos/types';

const DAY_LABELS: Record<MembershipClassDay, string> = {
  sunday: 'Sun',
  monday: 'Mon',
  tuesday: 'Tue',
  wednesday: 'Wed',
  thursday: 'Thu',
  friday: 'Fri',
  saturday: 'Sat',
};

export type MembershipInterestAnswers = {
  preferredClassDay?: MembershipClassDay;
  startedAttendingOn?: string;
  attendsAnotherChurch?: boolean;
};

/**
 * Joining the membership-class waiting list, on a phone.
 *
 * Every question is optional and the primary button is never disabled: the
 * pool is a waiting list, and refusing somebody a place on it over an
 * unanswered preference would be the wrong trade. Tapping a selected day
 * again clears it, so "no preference" stays reachable without a reset button.
 */
export function MembershipInterestSheet({
  open,
  submitting,
  onClose,
  onSubmit,
}: {
  open: boolean;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (answers: MembershipInterestAnswers) => void;
}) {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  const [day, setDay] = useState<MembershipClassDay | ''>('');
  const [startedAttendingOn, setStartedAttendingOn] = useState('');
  const [attendsAnotherChurch, setAttendsAnotherChurch] = useState(false);

  return (
    <Modal visible={open} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.handle} />
          <Text style={styles.title}>Join the membership class list</Text>
          <Text style={styles.subtitle}>
            A membership admin will place you in an upcoming cohort. These
            questions are optional and only help them plan.
          </Text>

          <Text style={styles.fieldLabel}>Which day suits you best?</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.chipsScroll}
            contentContainerStyle={styles.chipsRow}
          >
            {MEMBERSHIP_CLASS_DAYS.map((d) => {
              const active = day === d;
              return (
                <Pressable
                  key={d}
                  // Tapping the active day again clears it back to no preference.
                  onPress={() => setDay(active ? '' : d)}
                  style={[styles.chip, active && styles.chipActive]}
                >
                  <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>
                    {DAY_LABELS[d]}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <DatePicker
            label="When did you start attending Kharis?"
            value={startedAttendingOn}
            onChange={setStartedAttendingOn}
            maximumDate={new Date()}
          />

          <Pressable
            style={styles.toggleRow}
            onPress={() => setAttendsAnotherChurch((v) => !v)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: attendsAnotherChurch }}
          >
            <View style={[styles.box, attendsAnotherChurch && styles.boxChecked]}>
              {attendsAnotherChurch ? (
                <Check color="#ffffff" size={14} strokeWidth={3} />
              ) : null}
            </View>
            <Text style={styles.toggleLabel}>
              I currently attend another church as well
            </Text>
          </Pressable>

          <Button
            label={submitting ? 'Joining…' : 'Join the list'}
            busy={submitting}
            fullWidth
            onPress={() =>
              onSubmit({
                preferredClassDay: day || undefined,
                startedAttendingOn: startedAttendingOn || undefined,
                // Only sent when ticked: an untouched box is "not answered",
                // not a declared "no".
                attendsAnotherChurch: attendsAnotherChurch || undefined,
              })
            }
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
      marginBottom: spacing.sm,
    },
    title: { ...typography.cardTitle, color: c.ink },
    subtitle: { ...typography.meta, color: c.inkMuted, lineHeight: 17 },
    fieldLabel: {
      ...typography.meta,
      color: c.inkMuted,
      fontWeight: '600',
      marginTop: spacing.xs,
    },
    chipsScroll: { flexGrow: 0, flexShrink: 0 },
    // Fabric stacks the pills vertically without an explicit row direction.
    chipsRow: { flexDirection: 'row', gap: spacing.xs, alignItems: 'center' },
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
    toggleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.sm,
    },
    box: {
      width: 22,
      height: 22,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: c.divider,
      alignItems: 'center',
      justifyContent: 'center',
    },
    boxChecked: { backgroundColor: c.primary, borderColor: c.primary },
    toggleLabel: { ...typography.body, color: c.ink, flex: 1 },
    cancel: { alignItems: 'center', paddingVertical: spacing.sm },
    cancelLabel: { ...typography.body, fontWeight: '600' },
  });
}
