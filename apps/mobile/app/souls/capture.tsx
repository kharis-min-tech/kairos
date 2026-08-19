import { useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Check, Sparkles } from 'lucide-react-native';
import {
  Button,
  Card,
  Input,
  radii,
  spacing,
  typography,
  useColors,
  useThemedStyles,
  type ThemeColors,
} from '@kairos/ui-native';
import { api } from '@/lib/api-client';
import { alert } from '@/lib/alert';
import { useAuthStore } from '@/store/auth';

const GENDER_OPTIONS = ['Male', 'Female'] as const;
const AGE_OPTIONS = ['18-25', '26-35', '36-50', '51+'] as const;

/**
 * Ad-hoc soul capture — evangelism entry, mirrors the web capture page.
 * Required: firstName, lastName, phone. Optional program/fellowship/dept
 * attribution so a solo encounter can still be linked to a wider effort.
 */
export default function CaptureSoul() {
  const router = useRouter();
  const qc = useQueryClient();
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  const userId = useAuthStore((s) => s.user?.id);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [gender, setGender] = useState<'' | 'Male' | 'Female'>('');
  const [ageRange, setAgeRange] = useState<'' | (typeof AGE_OPTIONS)[number]>('');
  const [notes, setNotes] = useState('');
  const [outreachId, setOutreachId] = useState('');
  const [fellowshipId, setFellowshipId] = useState('');
  const [branchDeptId, setBranchDeptId] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [picker, setPicker] = useState<
    'gender' | 'ageRange' | 'program' | 'fellowship' | 'department' | null
  >(null);

  const programs = useQuery({
    queryKey: ['outreach', 'programs', 'active'],
    queryFn: async () => {
      const res = await api.outreach.programs.list({ limit: 100 });
      return res.data?.data ?? [];
    },
  });

  const myFellowships = useQuery({
    queryKey: ['fellowships', 'mine', userId],
    enabled: !!userId,
    queryFn: async () => {
      const res = await api.fellowships.list({ memberId: userId, limit: 50 });
      return res.data?.data ?? [];
    },
  });

  const myDepartments = useQuery({
    queryKey: ['departments', 'mine'],
    queryFn: async () => (await api.departments.mine()).data ?? [],
  });

  const programLabel = useMemo(() => {
    if (!outreachId) return '';
    const p = (programs.data ?? []).find((x) => x.id === outreachId);
    return p?.programName ?? '';
  }, [outreachId, programs.data]);

  const fellowshipLabel = useMemo(() => {
    if (!fellowshipId) return '';
    const f = (myFellowships.data ?? []).find((x) => x.id === fellowshipId);
    return f?.fellowshipName ?? '';
  }, [fellowshipId, myFellowships.data]);

  const deptLabel = useMemo(() => {
    if (!branchDeptId) return '';
    const d = (myDepartments.data ?? []).find((x) => x.id === branchDeptId);
    return d?.departmentName ?? '';
  }, [branchDeptId, myDepartments.data]);

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!firstName.trim()) next['firstName'] = 'Required';
    if (!lastName.trim()) next['lastName'] = 'Required';
    if (!phone.trim()) next['phone'] = 'Phone is required';
    else if (!/^[\d\s\-+()]+$/.test(phone)) next['phone'] = 'Invalid phone';
    if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))
      next['email'] = 'Invalid email';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  const capture = useMutation({
    mutationFn: async () => {
      const res = await api.souls.capture({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        address: address.trim() || undefined,
        city: city.trim() || undefined,
        gender: gender || undefined,
        ageRange: ageRange || undefined,
        notes: notes.trim() || undefined,
        outreachId: outreachId || undefined,
        fellowshipId: fellowshipId || undefined,
        branchDepartmentId: branchDeptId || undefined,
      });
      if (!res.success) throw new Error(res.message ?? 'Capture failed');
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['souls'] });
      qc.invalidateQueries({ queryKey: ['souls-dashboard'] });
      alert.info('Soul captured', 'You can follow up from the Souls list.');
      router.replace('/souls');
    },
    onError: (e: Error) =>
      alert.info('Capture failed', e.message ?? 'Please try again.'),
  });

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerBar}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ChevronLeft color={c.ink} size={24} strokeWidth={1.5} />
        </Pressable>
        <Text style={styles.headerTitle}>Capture soul</Text>
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
          <Card padding="md" style={styles.hero}>
            <View style={styles.heroIcon}>
              <Sparkles color={c.gold} size={20} strokeWidth={1.5} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroTitle}>Log an evangelism encounter</Text>
              <Text style={styles.heroMeta}>
                Adds the person to the follow-up pipeline. Link to a program
                below or leave blank for solo/personal work.
              </Text>
            </View>
          </Card>

          <Card padding="md" style={{ gap: spacing.md }}>
            <Text style={styles.section}>Person</Text>
            <View style={styles.pairRow}>
              <View style={{ flex: 1 }}>
                <Input
                  label="First name"
                  value={firstName}
                  onChangeText={setFirstName}
                  autoCapitalize="words"
                  error={errors['firstName']}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Input
                  label="Last name"
                  value={lastName}
                  onChangeText={setLastName}
                  autoCapitalize="words"
                  error={errors['lastName']}
                />
              </View>
            </View>
            <Input
              label="Phone"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="e.g. +233 20 123 4567"
              error={errors['phone']}
            />
            <Input
              label="Email (optional)"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              error={errors['email']}
            />
            <View style={styles.pairRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Gender</Text>
                <PickerField
                  value={gender}
                  placeholder="—"
                  onPress={() => setPicker('gender')}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Age range</Text>
                <PickerField
                  value={ageRange}
                  placeholder="—"
                  onPress={() => setPicker('ageRange')}
                />
              </View>
            </View>
          </Card>

          <Card padding="md" style={{ gap: spacing.md }}>
            <Text style={styles.section}>Location (optional)</Text>
            <Input
              label="Address"
              value={address}
              onChangeText={setAddress}
              autoCapitalize="words"
            />
            <Input
              label="City"
              value={city}
              onChangeText={setCity}
              autoCapitalize="words"
            />
          </Card>

          <Card padding="md" style={{ gap: spacing.md }}>
            <Text style={styles.section}>Attribution</Text>
            <View style={{ gap: 4 }}>
              <Text style={styles.fieldLabel}>Outreach program</Text>
              <PickerField
                value={programLabel}
                placeholder="Ad-hoc / solo evangelism"
                onPress={() => setPicker('program')}
              />
              <Text style={styles.hint}>
                Leave blank if this was a personal/solo encounter.
              </Text>
            </View>

            {(myFellowships.data?.length ?? 0) > 0 ? (
              <View style={{ gap: 4 }}>
                <Text style={styles.fieldLabel}>On behalf of a fellowship</Text>
                <PickerField
                  value={fellowshipLabel}
                  placeholder="—"
                  onPress={() => setPicker('fellowship')}
                />
              </View>
            ) : null}

            {(myDepartments.data?.length ?? 0) > 0 ? (
              <View style={{ gap: 4 }}>
                <Text style={styles.fieldLabel}>On behalf of a department</Text>
                <PickerField
                  value={deptLabel}
                  placeholder="—"
                  onPress={() => setPicker('department')}
                />
              </View>
            ) : null}
          </Card>

          <Card padding="md" style={{ gap: spacing.md }}>
            <Text style={styles.section}>Notes</Text>
            <Input
              value={notes}
              onChangeText={setNotes}
              placeholder="What did you share? Anything to follow up on?"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              containerStyle={{ minHeight: 100 }}
            />
          </Card>

          <Button
            label={capture.isPending ? 'Saving…' : 'Capture soul'}
            size="lg"
            fullWidth
            loading={capture.isPending}
            onPress={() => {
              if (validate()) capture.mutate();
            }}
          />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Picker sheets */}
      <ChoiceSheet
        open={picker === 'gender'}
        title="Gender"
        options={GENDER_OPTIONS.map((g) => ({ value: g, label: g }))}
        selected={gender}
        onPick={(v) => {
          setGender(v as '' | 'Male' | 'Female');
          setPicker(null);
        }}
        onClose={() => setPicker(null)}
        showClear
      />
      <ChoiceSheet
        open={picker === 'ageRange'}
        title="Age range"
        options={AGE_OPTIONS.map((r) => ({ value: r, label: r }))}
        selected={ageRange}
        onPick={(v) => {
          setAgeRange(v as '' | (typeof AGE_OPTIONS)[number]);
          setPicker(null);
        }}
        onClose={() => setPicker(null)}
        showClear
      />
      <ChoiceSheet
        open={picker === 'program'}
        title="Outreach program"
        options={(programs.data ?? []).map((p) => ({
          value: p.id,
          label: p.programName,
        }))}
        selected={outreachId}
        onPick={(v) => {
          setOutreachId(v);
          setPicker(null);
        }}
        onClose={() => setPicker(null)}
        showClear
      />
      <ChoiceSheet
        open={picker === 'fellowship'}
        title="Fellowship"
        options={(myFellowships.data ?? []).map((f) => ({
          value: f.id,
          label: f.fellowshipName,
        }))}
        selected={fellowshipId}
        onPick={(v) => {
          setFellowshipId(v);
          setPicker(null);
        }}
        onClose={() => setPicker(null)}
        showClear
      />
      <ChoiceSheet
        open={picker === 'department'}
        title="Department"
        options={(myDepartments.data ?? []).map((d) => ({
          value: d.id,
          label: d.departmentName,
        }))}
        selected={branchDeptId}
        onPick={(v) => {
          setBranchDeptId(v);
          setPicker(null);
        }}
        onClose={() => setPicker(null)}
        showClear
      />
    </SafeAreaView>
  );
}

function PickerField({
  value,
  placeholder,
  onPress,
}: {
  value: string;
  placeholder: string;
  onPress: () => void;
}) {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  return (
    <Pressable onPress={onPress} style={styles.pickerField}>
      <Text style={value ? styles.pickerValue : styles.pickerPlaceholder}>
        {value || placeholder}
      </Text>
      <ChevronRight color={c.inkFaded} size={16} strokeWidth={1.5} />
    </Pressable>
  );
}

function ChoiceSheet({
  open,
  title,
  options,
  selected,
  onPick,
  onClose,
  showClear,
}: {
  open: boolean;
  title: string;
  options: { value: string; label: string }[];
  selected: string;
  onPick: (value: string) => void;
  onClose: () => void;
  showClear?: boolean;
}) {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>{title}</Text>
          <ScrollView style={{ maxHeight: 380 }} keyboardShouldPersistTaps="handled">
            {showClear ? (
              <Pressable
                onPress={() => onPick('')}
                style={[styles.sheetRow, !selected && styles.sheetRowActive]}
              >
                <Text style={styles.sheetRowLabel}>None</Text>
              </Pressable>
            ) : null}
            {options.length === 0 ? (
              <Text style={styles.sheetEmpty}>Nothing to pick.</Text>
            ) : (
              options.map((opt) => {
                const active = selected === opt.value;
                return (
                  <Pressable
                    key={opt.value}
                    onPress={() => onPick(opt.value)}
                    style={[styles.sheetRow, active && styles.sheetRowActive]}
                  >
                    <Text
                      style={[
                        styles.sheetRowLabel,
                        active && styles.sheetRowLabelActive,
                      ]}
                    >
                      {opt.label}
                    </Text>
                    {active ? (
                      <Check color={c.primary} size={16} strokeWidth={2} />
                    ) : null}
                  </Pressable>
                );
              })
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
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
    hero: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
    heroIcon: {
      width: 40,
      height: 40,
      borderRadius: radii.md,
      backgroundColor: c.goldTint,
      alignItems: 'center',
      justifyContent: 'center',
    },
    heroTitle: { ...typography.cardTitle, color: c.ink },
    heroMeta: { ...typography.meta, color: c.inkMuted, lineHeight: 16 },

    section: { ...typography.eyebrow, color: c.inkMuted },
    fieldLabel: {
      ...typography.eyebrow,
      color: c.ink,
      opacity: 0.6,
      marginBottom: spacing.xs,
    },
    hint: { ...typography.meta, color: c.inkFaded, lineHeight: 15 },
    pairRow: { flexDirection: 'row', gap: spacing.md },
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
      justifyContent: 'flex-end',
      backgroundColor: c.scrim,
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
    sheetTitle: { ...typography.cardTitle, color: c.ink, marginBottom: spacing.xs },
    sheetRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.sm,
      borderRadius: radii.md,
    },
    sheetRowActive: { backgroundColor: c.primaryTint },
    sheetRowLabel: { ...typography.body, color: c.ink },
    sheetRowLabelActive: { color: c.primary, fontWeight: '600' },
    sheetEmpty: {
      ...typography.body,
      color: c.inkMuted,
      textAlign: 'center',
      paddingVertical: spacing.md,
    },
  });
}
