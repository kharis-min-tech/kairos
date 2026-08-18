import { useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, Check, X } from 'lucide-react-native';
import {
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
import type { CreateMemberRequest, UpdateMemberRequest } from '@kairos/types';
import { api } from '@/lib/api-client';

export interface MemberFormValues {
  firstName: string;
  lastName: string;
  middleName: string;
  email: string;
  phone: string;
  gender: 'Male' | 'Female' | '';
  dateOfBirth: string;
  homeBranchId: string;
  secondaryBranchId: string | null;
  address: string;
  city: string;
  postalCode: string;
  secondaryAddress: string;
  secondaryCity: string;
  secondaryPostalCode: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  emergencyContactRelationship: string;
}

interface MemberFormProps {
  mode: 'create' | 'edit';
  initial?: Partial<MemberFormValues>;
  submitLabel: string;
  submitPendingLabel?: string;
  submitting: boolean;
  serverError?: string | null;
  onSubmit: (
    payload: CreateMemberRequest | UpdateMemberRequest,
  ) => void | Promise<void>;
  footer?: React.ReactNode;
}

export function MemberForm({
  mode,
  initial,
  submitLabel,
  submitPendingLabel,
  submitting,
  serverError,
  onSubmit,
  footer,
}: MemberFormProps) {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  const branches = useQuery({
    queryKey: ['branches', 'listPublic'],
    queryFn: async () => (await api.branches.listPublic()).data ?? [],
    staleTime: 5 * 60 * 1000,
  });

  const [firstName, setFirstName] = useState(initial?.firstName ?? '');
  const [lastName, setLastName] = useState(initial?.lastName ?? '');
  const [middleName, setMiddleName] = useState(initial?.middleName ?? '');
  const [email, setEmail] = useState(initial?.email ?? '');
  const [phone, setPhone] = useState(initial?.phone ?? '');
  const [gender, setGender] = useState<'Male' | 'Female' | ''>(initial?.gender ?? '');
  const [dateOfBirth, setDateOfBirth] = useState(initial?.dateOfBirth ?? '');
  const [homeBranchId, setHomeBranchId] = useState(initial?.homeBranchId ?? '');
  const [secondaryBranchId, setSecondaryBranchId] = useState<string | null>(
    initial?.secondaryBranchId ?? null,
  );
  const [address, setAddress] = useState(initial?.address ?? '');
  const [city, setCity] = useState(initial?.city ?? '');
  const [postalCode, setPostalCode] = useState(initial?.postalCode ?? '');
  const [secondaryAddress, setSecondaryAddress] = useState(
    initial?.secondaryAddress ?? '',
  );
  const [secondaryCity, setSecondaryCity] = useState(initial?.secondaryCity ?? '');
  const [secondaryPostalCode, setSecondaryPostalCode] = useState(
    initial?.secondaryPostalCode ?? '',
  );
  const [emergencyContactName, setEmergencyContactName] = useState(
    initial?.emergencyContactName ?? '',
  );
  const [emergencyContactPhone, setEmergencyContactPhone] = useState(
    initial?.emergencyContactPhone ?? '',
  );
  const [emergencyContactRelationship, setEmergencyContactRelationship] = useState(
    initial?.emergencyContactRelationship ?? '',
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [openPicker, setOpenPicker] = useState<
    'homeBranch' | 'secondaryBranch' | null
  >(null);

  const branchOptions = useMemo(
    () => (branches.data ?? []).map((b) => ({ value: b.id, label: b.branchName })),
    [branches.data],
  );

  const homeBranchLabel =
    branchOptions.find((b) => b.value === homeBranchId)?.label ?? '';
  const secondaryBranchLabel =
    branchOptions.find((b) => b.value === secondaryBranchId)?.label ?? '';

  function clearError(key: string) {
    setErrors((p) => {
      const next = { ...p };
      delete next[key];
      return next;
    });
  }

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!firstName.trim()) next['firstName'] = 'First name is required';
    if (!lastName.trim()) next['lastName'] = 'Last name is required';
    if (mode === 'create') {
      if (!email.trim()) next['email'] = 'Email is required';
      else if (!/^\S+@\S+\.\S+$/.test(email.trim())) next['email'] = 'Enter a valid email';
      if (!homeBranchId) next['homeBranchId'] = 'Choose a home branch';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit() {
    if (!validate()) return;
    const shared = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      ...(middleName.trim() ? { middleName: middleName.trim() } : {}),
      ...(phone.trim() ? { phone: phone.trim() } : {}),
      ...(gender ? { gender } : {}),
      ...(dateOfBirth.trim() ? { dateOfBirth: dateOfBirth.trim() } : {}),
      ...(address.trim() ? { address: address.trim() } : {}),
      ...(city.trim() ? { city: city.trim() } : {}),
      ...(postalCode.trim() ? { postalCode: postalCode.trim() } : {}),
      secondaryBranchId: secondaryBranchId ?? null,
      ...(secondaryAddress.trim() ? { secondaryAddress: secondaryAddress.trim() } : {}),
      ...(secondaryCity.trim() ? { secondaryCity: secondaryCity.trim() } : {}),
      ...(secondaryPostalCode.trim()
        ? { secondaryPostalCode: secondaryPostalCode.trim() }
        : {}),
      ...(emergencyContactName.trim()
        ? { emergencyContactName: emergencyContactName.trim() }
        : {}),
      ...(emergencyContactPhone.trim()
        ? { emergencyContactPhone: emergencyContactPhone.trim() }
        : {}),
      ...(emergencyContactRelationship.trim()
        ? { emergencyContactRelationship: emergencyContactRelationship.trim() }
        : {}),
    };
    if (mode === 'create') {
      const payload: CreateMemberRequest = {
        ...shared,
        email: email.trim(),
        homeBranchId,
      };
      void onSubmit(payload);
    } else {
      // Edit doesn't accept email or homeBranchId.
      void onSubmit(shared as UpdateMemberRequest);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Card padding="md" style={{ gap: spacing.md }}>
          <Text style={styles.sectionEyebrow}>IDENTITY</Text>

          <FieldLabel label="First name" required />
          <Input
            value={firstName}
            onChangeText={(v) => {
              setFirstName(v);
              clearError('firstName');
            }}
            placeholder="Given name"
            autoCapitalize="words"
            error={errors['firstName']}
          />

          <FieldLabel label="Last name" required />
          <Input
            value={lastName}
            onChangeText={(v) => {
              setLastName(v);
              clearError('lastName');
            }}
            placeholder="Family name"
            autoCapitalize="words"
            error={errors['lastName']}
          />

          <FieldLabel label="Middle name" />
          <Input
            value={middleName}
            onChangeText={setMiddleName}
            autoCapitalize="words"
          />

          <DatePicker
            label="Date of birth"
            value={dateOfBirth}
            onChange={setDateOfBirth}
            maximumDate={new Date()}
          />

          <FieldLabel label="Gender" />
          <View style={styles.radioRow}>
            {(['Male', 'Female'] as const).map((g) => {
              const active = gender === g;
              return (
                <Pressable
                  key={g}
                  onPress={() => setGender(active ? '' : g)}
                  style={[styles.radioChip, active && styles.radioChipActive]}
                >
                  <Text
                    style={[styles.radioChipLabel, active && styles.radioChipLabelActive]}
                  >
                    {g}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Card>

        <Card padding="md" style={{ gap: spacing.md }}>
          <Text style={styles.sectionEyebrow}>CONTACT</Text>

          <FieldLabel label="Email" required={mode === 'create'} />
          <Input
            value={email}
            onChangeText={(v) => {
              setEmail(v);
              clearError('email');
            }}
            placeholder="name@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            editable={mode === 'create'}
            error={errors['email']}
          />
          {mode === 'edit' ? (
            <Text style={styles.helpText}>
              Email is changed via the profile email-change flow, not here.
            </Text>
          ) : null}

          <FieldLabel label="Phone" />
          <Input
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <FieldLabel label="Address" />
          <Input value={address} onChangeText={setAddress} autoCapitalize="words" />

          <FieldLabel label="City" />
          <Input value={city} onChangeText={setCity} autoCapitalize="words" />

          <FieldLabel label="Postal code" />
          <Input value={postalCode} onChangeText={setPostalCode} autoCapitalize="characters" />
        </Card>

        <Card padding="md" style={{ gap: spacing.md }}>
          <Text style={styles.sectionEyebrow}>BRANCH</Text>

          <FieldLabel label="Home branch" required={mode === 'create'} />
          <PickerField
            value={homeBranchLabel}
            placeholder="Choose a home branch"
            onPress={mode === 'create' ? () => setOpenPicker('homeBranch') : undefined}
            disabled={mode !== 'create'}
            error={errors['homeBranchId']}
          />
          {mode === 'edit' ? (
            <Text style={styles.helpText}>
              Home branch changes are handled by an admin — talk to your branch team.
            </Text>
          ) : null}

          <FieldLabel label="Secondary branch" />
          <View style={styles.deputyRow}>
            <View style={{ flex: 1 }}>
              <PickerField
                value={secondaryBranchLabel}
                placeholder="Choose a secondary branch (optional)"
                onPress={() => setOpenPicker('secondaryBranch')}
              />
            </View>
            {secondaryBranchId ? (
              <Pressable
                onPress={() => setSecondaryBranchId(null)}
                style={styles.clearBtn}
                hitSlop={6}
                accessibilityLabel="Clear secondary branch"
              >
                <X color={c.inkFaded} size={14} strokeWidth={1.5} />
              </Pressable>
            ) : null}
          </View>

          {secondaryBranchId ? (
            <>
              <FieldLabel label="Secondary address" />
              <Input
                value={secondaryAddress}
                onChangeText={setSecondaryAddress}
                autoCapitalize="words"
              />
              <FieldLabel label="Secondary city" />
              <Input
                value={secondaryCity}
                onChangeText={setSecondaryCity}
                autoCapitalize="words"
              />
              <FieldLabel label="Secondary postal code" />
              <Input
                value={secondaryPostalCode}
                onChangeText={setSecondaryPostalCode}
                autoCapitalize="characters"
              />
            </>
          ) : null}
        </Card>

        <Card padding="md" style={{ gap: spacing.md }}>
          <Text style={styles.sectionEyebrow}>EMERGENCY CONTACT</Text>

          <FieldLabel label="Contact name" />
          <Input
            value={emergencyContactName}
            onChangeText={setEmergencyContactName}
            autoCapitalize="words"
          />

          <FieldLabel label="Contact phone" />
          <Input
            value={emergencyContactPhone}
            onChangeText={setEmergencyContactPhone}
            keyboardType="phone-pad"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <FieldLabel label="Relationship" />
          <Input
            value={emergencyContactRelationship}
            onChangeText={setEmergencyContactRelationship}
            placeholder="e.g. Mother, Father, Spouse"
            autoCapitalize="words"
          />
        </Card>

        {serverError ? <Text style={styles.errorLine}>{serverError}</Text> : null}

        <Button
          label={submitting ? submitPendingLabel ?? 'Saving…' : submitLabel}
          variant="primary"
          size="lg"
          fullWidth
          loading={submitting}
          onPress={handleSubmit}
        />

        {footer}
      </ScrollView>

      <ValuePickerSheet
        open={openPicker === 'homeBranch'}
        title="Home branch"
        onClose={() => setOpenPicker(null)}
        options={branchOptions}
        selected={homeBranchId}
        onSelect={(v) => {
          setHomeBranchId(v);
          clearError('homeBranchId');
        }}
      />

      <ValuePickerSheet
        open={openPicker === 'secondaryBranch'}
        title="Secondary branch"
        onClose={() => setOpenPicker(null)}
        options={[
          { value: '', label: 'None' },
          ...branchOptions.filter((b) => b.value !== homeBranchId),
        ]}
        selected={secondaryBranchId ?? ''}
        onSelect={(v) => setSecondaryBranchId(v || null)}
      />
    </KeyboardAvoidingView>
  );
}

function FieldLabel({ label, required }: { label: string; required?: boolean }) {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  return (
    <View style={styles.fieldLabelRow}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {required ? <Text style={styles.requiredMark}>*</Text> : null}
    </View>
  );
}

function PickerField({
  value,
  placeholder,
  onPress,
  error,
  disabled,
}: {
  value: string;
  placeholder: string;
  onPress?: () => void;
  error?: string;
  disabled?: boolean;
}) {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  return (
    <View style={{ gap: 4 }}>
      <Pressable
        style={[
          styles.pickerField,
          error ? styles.pickerFieldError : null,
          disabled ? styles.pickerFieldDisabled : null,
        ]}
        onPress={onPress}
        disabled={disabled || !onPress}
      >
        <Text style={value ? styles.pickerValue : styles.pickerPlaceholder}>
          {value || placeholder}
        </Text>
        {!disabled ? (
          <ChevronRight color={c.inkFaded} size={16} strokeWidth={1.5} />
        ) : null}
      </Pressable>
      {error ? <Text style={styles.errorLine}>{error}</Text> : null}
    </View>
  );
}

function ValuePickerSheet({
  open,
  title,
  onClose,
  options,
  selected,
  onSelect,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  options: { value: string; label: string }[];
  selected: string;
  onSelect: (value: string) => void;
}) {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  return (
    <Modal visible={open} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>{title}</Text>
          <ScrollView style={{ maxHeight: 380 }}>
            {options.map((opt) => {
              const isSelected = opt.value === selected;
              return (
                <Pressable
                  key={opt.value || '__none__'}
                  style={[styles.sheetOption, isSelected && styles.sheetOptionActive]}
                  onPress={() => {
                    onSelect(opt.value);
                    onClose();
                  }}
                >
                  <Text
                    style={[
                      styles.sheetOptionLabel,
                      isSelected && styles.sheetOptionLabelActive,
                    ]}
                  >
                    {opt.label}
                  </Text>
                  {isSelected ? (
                    <Check color={c.primary} size={16} strokeWidth={2} />
                  ) : null}
                </Pressable>
              );
            })}
          </ScrollView>
          <Pressable style={styles.sheetCancel} onPress={onClose}>
            <Text style={styles.sheetCancelLabel}>Cancel</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
  container: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  sectionEyebrow: {
    ...typography.eyebrow,
    color: c.inkMuted,
  },
  fieldLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  fieldLabel: {
    ...typography.eyebrow,
    color: c.ink,
    opacity: 0.6,
  },
  requiredMark: {
    ...typography.eyebrow,
    color: c.danger,
  },
  helpText: {
    ...typography.meta,
    color: c.inkMuted,
    lineHeight: 15,
  },
  radioRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  radioChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    borderWidth: 1.5,
    borderColor: c.border,
    backgroundColor: c.card,
  },
  radioChipActive: {
    borderColor: c.primary,
    backgroundColor: 'rgba(93,63,211,0.08)',
  },
  radioChipLabel: {
    ...typography.body,
    color: c.ink,
    fontWeight: '500',
  },
  radioChipLabelActive: {
    color: c.primary,
    fontWeight: '700',
  },
  pickerField: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.card,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    minHeight: 44,
  },
  pickerFieldError: {
    borderColor: c.danger,
    borderWidth: 1.5,
  },
  pickerFieldDisabled: {
    backgroundColor: c.subtle,
    opacity: 0.7,
  },
  pickerValue: { ...typography.body, color: c.ink, flex: 1 },
  pickerPlaceholder: {
    ...typography.body,
    color: c.inkFaded,
    flex: 1,
  },
  deputyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  clearBtn: {
    width: 32,
    height: 32,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.subtle,
  },
  errorLine: {
    ...typography.meta,
    color: c.danger,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(10,10,15,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: c.card,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    paddingTop: spacing.md,
    gap: spacing.md,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: c.inkGhost,
    alignSelf: 'center',
  },
  sheetTitle: {
    ...typography.cardTitle,
    color: c.ink,
  },
  sheetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.divider,
  },
  sheetOptionActive: {
    backgroundColor: 'rgba(93,63,211,0.06)',
  },
  sheetOptionLabel: { ...typography.body, color: c.ink },
  sheetOptionLabelActive: {
    color: c.primary,
    fontWeight: '600',
  },
  sheetCancel: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  sheetCancelLabel: {
    ...typography.button,
    color: c.primary,
  },
});
}

