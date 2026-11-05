import { useState } from 'react';
import { View, Text, Modal, Pressable, ScrollView, StyleSheet } from 'react-native';
import { Check } from 'lucide-react-native';
import {
  Button,
  Input,
  radii,
  spacing,
  typography,
  useThemedStyles,
  useColors,
  type ThemeColors,
} from '@kairos/ui-native';

export type DepartmentApplication = {
  notes?: string;
  experience?: string;
  profession?: string;
  declarationAccepted: true;
  signatureName: string;
};

/**
 * The Kingdom Service application, on a phone.
 *
 * The mobile app used to tell members to "join a ministry department via your
 * branch admin" while the API and the web app both supported applying
 * directly — so the people most likely to be on a phone were the ones who
 * couldn't apply. This closes that.
 *
 * Mirrors the web dialog deliberately: the same declaration wording, the same
 * two required answers, and the signature date stamped server-side rather
 * than typed, so the two platforms cannot record the same undertaking
 * differently.
 */
export function DepartmentApplySheet({
  open,
  departmentName,
  submitting,
  onClose,
  onSubmit,
}: {
  open: boolean;
  departmentName: string;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (data: DepartmentApplication) => void;
}) {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  const [experience, setExperience] = useState('');
  const [profession, setProfession] = useState('');
  const [notes, setNotes] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [signatureName, setSignatureName] = useState('');

  const trimmedSignature = signatureName.trim();
  const canSubmit = accepted && trimmedSignature.length > 0 && !submitting;

  return (
    <Modal visible={open} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.handle} />
          <ScrollView
            style={{ maxHeight: 520 }}
            contentContainerStyle={{ gap: spacing.sm }}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.title}>Apply to join {departmentName}</Text>
            <Text style={styles.subtitle}>
              Tell the department a little about yourself, then sign the
              declaration below.
            </Text>

            <Text style={styles.fieldLabel}>Relevant experience (optional)</Text>
            <Input
              value={experience}
              onChangeText={setExperience}
              multiline
              numberOfLines={3}
              placeholder="Anything relevant — in or outside church."
            />

            <Text style={styles.fieldLabel}>Profession (optional)</Text>
            <Input
              value={profession}
              onChangeText={setProfession}
              autoCapitalize="words"
              placeholder="e.g. Radiographer"
            />
            <Text style={styles.hint}>
              Saved to your profile, so you are only ever asked once.
            </Text>

            <Text style={styles.fieldLabel}>Anything else? (optional)</Text>
            <Input
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={2}
              placeholder="Availability, questions, anything they should know."
            />

            {/* Spelled out rather than linked: this is the sentence being signed. */}
            <Pressable
              style={styles.declaration}
              onPress={() => setAccepted((v) => !v)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: accepted }}
            >
              <View style={[styles.box, accepted && styles.boxChecked]}>
                {accepted ? <Check color="#ffffff" size={14} strokeWidth={3} /> : null}
              </View>
              <Text style={styles.declarationText}>
                I am willing to serve in this department. I will attend
                rehearsals, meetings and rotas as required, carry out what I am
                given faithfully, and let a leader know in good time if I am
                unable to.
              </Text>
            </Pressable>

            <Text style={styles.fieldLabel}>Signature (type your full name)</Text>
            <Input
              value={signatureName}
              onChangeText={setSignatureName}
              autoCapitalize="words"
              placeholder="Your full name"
            />
            <Text style={styles.hint}>
              Today&apos;s date is recorded automatically when you submit.
            </Text>
          </ScrollView>

          <Button
            label={submitting ? 'Submitting…' : 'Submit application'}
            fullWidth
            busy={submitting}
            disabled={!canSubmit}
            onPress={() => {
              if (!canSubmit) return;
              onSubmit({
                experience: experience.trim() || undefined,
                profession: profession.trim() || undefined,
                notes: notes.trim() || undefined,
                declarationAccepted: true,
                signatureName: trimmedSignature,
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
    title: { ...typography.cardTitle, color: c.ink },
    subtitle: { ...typography.meta, color: c.inkMuted, lineHeight: 17 },
    fieldLabel: {
      ...typography.meta,
      color: c.inkMuted,
      fontWeight: '600',
      marginTop: spacing.xs,
    },
    hint: { ...typography.meta, color: c.inkFaded, lineHeight: 15 },
    declaration: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.sm,
      padding: spacing.md,
      marginTop: spacing.sm,
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: c.divider,
      backgroundColor: c.subtle,
    },
    declarationText: { ...typography.body, color: c.ink, flex: 1, lineHeight: 20 },
    box: {
      width: 22,
      height: 22,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: c.divider,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 1,
    },
    boxChecked: { backgroundColor: c.primary, borderColor: c.primary },
    cancel: { alignItems: 'center', paddingVertical: spacing.sm },
    cancelLabel: { ...typography.body, fontWeight: '600' },
  });
}
