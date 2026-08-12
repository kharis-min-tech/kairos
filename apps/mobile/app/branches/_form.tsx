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
import { ChevronRight, Check, Plus, Trash2 } from 'lucide-react-native';
import {
  Button,
  Card,
  Input,
  colors,
  radii,
  spacing,
  typography,
} from '@kairos/ui-native';
import {
  BranchType as BranchTypeEnum,
  type BranchType,
  type CreateBranchRequest,
  type ServiceSchedule,
  type UpdateBranchRequest,
} from '@kairos/types';
import { api } from '@/lib/api-client';

const DAY_OPTIONS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

export interface BranchFormValues {
  branchName: string;
  regionId: string;
  branchType: BranchType;
  address: string;
  city: string;
  postalCode: string;
  phone: string;
  email: string;
  establishedDate: string;
  serviceSchedule: ServiceSchedule[];
}

interface BranchFormProps {
  mode: 'create' | 'edit';
  initial?: Partial<BranchFormValues>;
  submitLabel: string;
  submitPendingLabel?: string;
  submitting: boolean;
  serverError?: string | null;
  onSubmit: (
    payload: CreateBranchRequest | UpdateBranchRequest,
  ) => void | Promise<void>;
  footer?: React.ReactNode;
}

export function BranchForm({
  mode,
  initial,
  submitLabel,
  submitPendingLabel,
  submitting,
  serverError,
  onSubmit,
  footer,
}: BranchFormProps) {
  const regions = useQuery({
    queryKey: ['regions', 'list'],
    queryFn: async () => (await api.regions.list()).data ?? [],
    staleTime: 5 * 60 * 1000,
  });

  const [branchName, setBranchName] = useState(initial?.branchName ?? '');
  const [regionId, setRegionId] = useState(initial?.regionId ?? '');
  const [branchType, setBranchType] = useState<BranchType>(
    initial?.branchType ?? BranchTypeEnum.Satellite,
  );
  const [address, setAddress] = useState(initial?.address ?? '');
  const [city, setCity] = useState(initial?.city ?? '');
  const [postalCode, setPostalCode] = useState(initial?.postalCode ?? '');
  const [phone, setPhone] = useState(initial?.phone ?? '');
  const [email, setEmail] = useState(initial?.email ?? '');
  const [establishedDate, setEstablishedDate] = useState(
    initial?.establishedDate ?? '',
  );
  const [serviceSchedule, setServiceSchedule] = useState<ServiceSchedule[]>(
    initial?.serviceSchedule ?? [],
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [openPicker, setOpenPicker] = useState<'region' | number | null>(null);

  const regionOptions = useMemo(
    () => (regions.data ?? []).map((r) => ({ value: r.id, label: r.regionName })),
    [regions.data],
  );

  const regionLabel =
    regionOptions.find((r) => r.value === regionId)?.label ?? '';

  function clearError(key: string) {
    setErrors((p) => {
      const next = { ...p };
      delete next[key];
      return next;
    });
  }

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!branchName.trim()) next['branchName'] = 'Branch name is required';
    if (!regionId) next['regionId'] = 'Choose a region';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit() {
    if (!validate()) return;
    const shared = {
      branchName: branchName.trim(),
      regionId,
      branchType,
      ...(address.trim() ? { address: address.trim() } : {}),
      ...(city.trim() ? { city: city.trim() } : {}),
      ...(postalCode.trim() ? { postalCode: postalCode.trim() } : {}),
      ...(phone.trim() ? { phone: phone.trim() } : {}),
      ...(email.trim() ? { email: email.trim() } : {}),
      ...(establishedDate.trim() ? { establishedDate: establishedDate.trim() } : {}),
      ...(serviceSchedule.length > 0 ? { serviceSchedule } : {}),
    };
    void onSubmit(shared);
  }

  function addServiceRow() {
    setServiceSchedule((p) => [...p, { day: 'Sunday', time: '09:00', type: 'Sunday Service' }]);
  }

  function updateServiceRow(index: number, patch: Partial<ServiceSchedule>) {
    setServiceSchedule((p) => p.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function removeServiceRow(index: number) {
    setServiceSchedule((p) => p.filter((_, i) => i !== index));
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Card padding="md" style={{ gap: spacing.md }}>
          <Text style={styles.sectionEyebrow}>BRANCH</Text>

          <FieldLabel label="Branch name" required />
          <Input
            value={branchName}
            onChangeText={(v) => {
              setBranchName(v);
              clearError('branchName');
            }}
            placeholder="e.g. Kharis Accra"
            autoCapitalize="words"
            error={errors['branchName']}
          />

          <FieldLabel label="Region" required />
          <PickerField
            value={regionLabel}
            placeholder="Choose a region"
            onPress={() => setOpenPicker('region')}
            error={errors['regionId']}
          />

          <FieldLabel label="Type" />
          <View style={styles.radioRow}>
            {Object.values(BranchTypeEnum).map((t) => {
              const active = branchType === t;
              return (
                <Pressable
                  key={t}
                  onPress={() => setBranchType(t)}
                  style={[styles.radioChip, active && styles.radioChipActive]}
                >
                  <Text
                    style={[styles.radioChipLabel, active && styles.radioChipLabelActive]}
                  >
                    {t}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <FieldLabel label="Established date" />
          <Input
            value={establishedDate}
            onChangeText={setEstablishedDate}
            placeholder="YYYY-MM-DD"
            keyboardType="numbers-and-punctuation"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </Card>

        <Card padding="md" style={{ gap: spacing.md }}>
          <Text style={styles.sectionEyebrow}>ADDRESS &amp; CONTACT</Text>

          <FieldLabel label="Address" />
          <Input value={address} onChangeText={setAddress} autoCapitalize="words" />

          <FieldLabel label="City" />
          <Input value={city} onChangeText={setCity} autoCapitalize="words" />

          <FieldLabel label="Postal code" />
          <Input
            value={postalCode}
            onChangeText={setPostalCode}
            autoCapitalize="characters"
          />

          <FieldLabel label="Phone" />
          <Input
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <FieldLabel label="Email" />
          <Input
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </Card>

        <Card padding="md" style={{ gap: spacing.sm }}>
          <View style={styles.scheduleHeader}>
            <Text style={styles.sectionEyebrow}>SERVICE SCHEDULE</Text>
            <Pressable
              onPress={addServiceRow}
              style={styles.addRowBtn}
              hitSlop={6}
              accessibilityLabel="Add service"
            >
              <Plus color={colors.primary} size={16} strokeWidth={1.5} />
            </Pressable>
          </View>
          {serviceSchedule.length === 0 ? (
            <Text style={styles.emptyLine}>
              No services scheduled. Tap + to add a weekly service.
            </Text>
          ) : (
            serviceSchedule.map((row, idx) => (
              <View key={idx} style={styles.scheduleRow}>
                <View style={styles.scheduleFields}>
                  <View style={{ flex: 1 }}>
                    <FieldLabel label="Day" />
                    <PickerField
                      value={row.day}
                      placeholder="Day"
                      onPress={() => setOpenPicker(idx)}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <FieldLabel label="Time" />
                    <Input
                      value={row.time}
                      onChangeText={(v) => updateServiceRow(idx, { time: v })}
                      placeholder="18:00"
                      keyboardType="numbers-and-punctuation"
                      autoCapitalize="none"
                    />
                  </View>
                </View>
                <FieldLabel label="Type" />
                <Input
                  value={row.type}
                  onChangeText={(v) => updateServiceRow(idx, { type: v })}
                  placeholder="e.g. Sunday Service, Prayer meeting"
                  autoCapitalize="words"
                />
                <Pressable
                  onPress={() => removeServiceRow(idx)}
                  style={styles.removeRowBtn}
                  hitSlop={4}
                >
                  <Trash2 color={colors.danger} size={14} strokeWidth={1.5} />
                  <Text style={styles.removeRowLabel}>Remove service</Text>
                </Pressable>
              </View>
            ))
          )}
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
        open={openPicker === 'region'}
        title="Region"
        onClose={() => setOpenPicker(null)}
        options={regionOptions}
        selected={regionId}
        onSelect={(v) => {
          setRegionId(v);
          clearError('regionId');
        }}
      />

      <ValuePickerSheet
        open={typeof openPicker === 'number'}
        title="Meeting day"
        onClose={() => setOpenPicker(null)}
        options={DAY_OPTIONS.map((d) => ({ value: d, label: d }))}
        selected={typeof openPicker === 'number' ? serviceSchedule[openPicker]?.day ?? '' : ''}
        onSelect={(v) => {
          if (typeof openPicker === 'number') updateServiceRow(openPicker, { day: v });
        }}
      />

      {/* Guard the mode-narrowing here so a future contributor doesn't lose
          the fact that create+edit accept the SAME payload shape. */}
      <ModeNoop mode={mode} />
    </KeyboardAvoidingView>
  );
}

function ModeNoop(_: { mode: 'create' | 'edit' }) {
  return null;
}

function FieldLabel({ label, required }: { label: string; required?: boolean }) {
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
}: {
  value: string;
  placeholder: string;
  onPress: () => void;
  error?: string;
}) {
  return (
    <View style={{ gap: 4 }}>
      <Pressable
        style={[styles.pickerField, error ? styles.pickerFieldError : null]}
        onPress={onPress}
      >
        <Text style={value ? styles.pickerValue : styles.pickerPlaceholder}>
          {value || placeholder}
        </Text>
        <ChevronRight color="rgba(26,28,28,0.4)" size={16} strokeWidth={1.5} />
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
                  key={opt.value}
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
                    <Check color={colors.primary} size={16} strokeWidth={2} />
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

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  sectionEyebrow: {
    ...typography.eyebrow,
    color: 'rgba(26,28,28,0.55)',
  },
  fieldLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  fieldLabel: {
    ...typography.eyebrow,
    color: colors.ink,
    opacity: 0.6,
  },
  requiredMark: {
    ...typography.eyebrow,
    color: colors.danger,
  },
  radioRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  radioChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    borderWidth: 1.5,
    borderColor: 'rgba(26,28,28,0.12)',
    backgroundColor: colors.cardLight,
  },
  radioChipActive: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(93,63,211,0.08)',
  },
  radioChipLabel: {
    ...typography.body,
    color: colors.ink,
    fontWeight: '500',
    fontSize: 13,
  },
  radioChipLabelActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  pickerField: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardLight,
    borderWidth: 1,
    borderColor: 'rgba(26,28,28,0.12)',
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    minHeight: 44,
  },
  pickerFieldError: {
    borderColor: colors.danger,
    borderWidth: 1.5,
  },
  pickerValue: { ...typography.body, color: colors.ink, flex: 1 },
  pickerPlaceholder: {
    ...typography.body,
    color: 'rgba(26,28,28,0.4)',
    flex: 1,
  },
  scheduleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  addRowBtn: {
    width: 28,
    height: 28,
    borderRadius: radii.sm,
    backgroundColor: 'rgba(93,63,211,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scheduleRow: {
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(26,28,28,0.08)',
  },
  scheduleFields: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  removeRowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    paddingVertical: spacing.xs,
  },
  removeRowLabel: {
    ...typography.meta,
    color: colors.danger,
    fontWeight: '600',
  },
  emptyLine: {
    ...typography.body,
    color: 'rgba(26,28,28,0.55)',
    textAlign: 'center',
    paddingVertical: spacing.md,
  },
  errorLine: {
    ...typography.meta,
    color: colors.danger,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(10,10,15,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.cardLight,
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
    backgroundColor: 'rgba(26,28,28,0.15)',
    alignSelf: 'center',
  },
  sheetTitle: {
    ...typography.cardTitle,
    color: colors.ink,
  },
  sheetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(26,28,28,0.08)',
  },
  sheetOptionActive: {
    backgroundColor: 'rgba(93,63,211,0.06)',
  },
  sheetOptionLabel: { ...typography.body, color: colors.ink },
  sheetOptionLabelActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  sheetCancel: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  sheetCancelLabel: {
    ...typography.button,
    color: colors.primary,
  },
});
