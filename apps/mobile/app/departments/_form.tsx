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
  Input,
  radii,
  spacing,
  typography,
  useThemedStyles,
  type ThemeColors,
  useColors,
} from '@kairos/ui-native';
import { api } from '@/lib/api-client';
import { MemberPickerSheet } from '@/components/member-picker-sheet';

export type CreateDepartmentPayload = Parameters<typeof api.departments.create>[0];
type UpdateDepartmentPayload = Parameters<typeof api.departments.update>[1];

export interface DepartmentFormValues {
  branchId: string;
  departmentId: string;
  leadMemberId: string;
  deputyMemberId: string | null;
  description: string;
}

interface DepartmentFormProps {
  mode: 'create' | 'edit';
  initial?: Partial<DepartmentFormValues>;
  submitLabel: string;
  submitPendingLabel?: string;
  submitting: boolean;
  serverError?: string | null;
  onSubmit: (
    payload: CreateDepartmentPayload | UpdateDepartmentPayload,
  ) => void | Promise<void>;
  footer?: React.ReactNode;
}

export function DepartmentForm({
  mode,
  initial,
  submitLabel,
  submitPendingLabel,
  submitting,
  serverError,
  onSubmit,
  footer,
}: DepartmentFormProps) {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  const branches = useQuery({
    queryKey: ['branches', 'listPublic'],
    queryFn: async () => (await api.branches.listPublic()).data ?? [],
    staleTime: 5 * 60 * 1000,
  });

  const globalDepts = useQuery({
    queryKey: ['departments', 'listGlobal'],
    queryFn: async () => (await api.departments.listGlobal()).data ?? [],
    staleTime: 5 * 60 * 1000,
    // We need this at load to render the "current department type" label in edit mode.
  });

  const [branchId, setBranchId] = useState(initial?.branchId ?? '');
  const [departmentId, setDepartmentId] = useState(initial?.departmentId ?? '');
  const [leadMemberId, setLeadMemberId] = useState(initial?.leadMemberId ?? '');
  const [deputyMemberId, setDeputyMemberId] = useState<string | null>(
    initial?.deputyMemberId ?? null,
  );
  const [description, setDescription] = useState(initial?.description ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [openPicker, setOpenPicker] = useState<
    'branch' | 'department' | 'lead' | 'deputy' | null
  >(null);

  const branchOptions = useMemo(
    () => (branches.data ?? []).map((b) => ({ value: b.id, label: b.branchName })),
    [branches.data],
  );

  const branchLabel =
    branchOptions.find((b) => b.value === branchId)?.label ?? '';

  const departmentOptions = useMemo(
    () =>
      (globalDepts.data ?? []).map((d) => ({ value: d.id, label: d.departmentName })),
    [globalDepts.data],
  );

  const departmentLabel =
    departmentOptions.find((d) => d.value === departmentId)?.label ?? '';

  // For lead / deputy labels, we fetch the member records once we have ids
  // so the picker button shows the name, not the UUID.
  const leadName = useMemberName(leadMemberId);
  const deputyName = useMemberName(deputyMemberId);

  function clearError(key: string) {
    setErrors((p) => {
      const next = { ...p };
      delete next[key];
      return next;
    });
  }

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (mode === 'create') {
      if (!branchId) next['branchId'] = 'Choose a branch';
      if (!departmentId) next['departmentId'] = 'Choose a department';
      if (!leadMemberId) next['leadMemberId'] = 'Choose a lead';
    } else {
      // Edit mode: leadMemberId is still required by the schema when present,
      // but the API accepts a partial patch — only require if the user cleared it.
      if (!leadMemberId) next['leadMemberId'] = 'A lead is required';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit() {
    if (!validate()) return;
    if (mode === 'create') {
      const payload: CreateDepartmentPayload = {
        branchId,
        departmentId,
        leadMemberId,
      };
      if (deputyMemberId) payload.deputyMemberId = deputyMemberId;
      if (description.trim()) payload.description = description.trim();
      void onSubmit(payload);
    } else {
      const payload: UpdateDepartmentPayload = {
        leadMemberId,
        deputyMemberId: deputyMemberId ?? null,
        description: description.trim() || null,
      };
      void onSubmit(payload);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Card padding="md" style={{ gap: spacing.md }}>
          <Text style={styles.sectionEyebrow}>DEPARTMENT</Text>

          <FieldLabel label="Branch" required={mode === 'create'} />
          <PickerField
            value={branchLabel}
            placeholder="Choose a branch"
            onPress={mode === 'create' ? () => setOpenPicker('branch') : undefined}
            disabled={mode !== 'create'}
            error={errors['branchId']}
          />

          <FieldLabel label="Department type" required={mode === 'create'} />
          <PickerField
            value={departmentLabel}
            placeholder="Choose a department type"
            onPress={mode === 'create' ? () => setOpenPicker('department') : undefined}
            disabled={mode !== 'create'}
            error={errors['departmentId']}
          />

          <FieldLabel label="Description" />
          <Input
            value={description}
            onChangeText={setDescription}
            placeholder="Short description shown on the department page"
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            containerStyle={{ minHeight: 80 }}
          />
        </Card>

        <Card padding="md" style={{ gap: spacing.md }}>
          <Text style={styles.sectionEyebrow}>LEADERSHIP</Text>

          <FieldLabel label="Lead" required />
          <PickerField
            value={leadName}
            placeholder={branchId ? 'Choose a lead' : 'Choose a branch first'}
            onPress={branchId ? () => setOpenPicker('lead') : undefined}
            disabled={!branchId}
            error={errors['leadMemberId']}
          />

          <FieldLabel label="Deputy" />
          <View style={styles.deputyRow}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <PickerField
                value={deputyName}
                placeholder={branchId ? 'Choose a deputy (optional)' : 'Choose a branch first'}
                onPress={branchId ? () => setOpenPicker('deputy') : undefined}
                disabled={!branchId}
              />
            </View>
            {deputyMemberId ? (
              <Pressable
                onPress={() => setDeputyMemberId(null)}
                style={styles.deputyClearBtn}
                hitSlop={6}
                accessibilityLabel="Clear deputy"
              >
                <X color={c.inkFaded} size={14} strokeWidth={1.5} />
              </Pressable>
            ) : null}
          </View>
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
        open={openPicker === 'branch'}
        title="Branch"
        onClose={() => setOpenPicker(null)}
        options={branchOptions}
        selected={branchId}
        onSelect={(v) => {
          setBranchId(v);
          clearError('branchId');
          // Clearing lead/deputy when branch changes — they must be from the new branch.
          setLeadMemberId('');
          setDeputyMemberId(null);
        }}
      />

      <ValuePickerSheet
        open={openPicker === 'department'}
        title="Department type"
        onClose={() => setOpenPicker(null)}
        options={departmentOptions}
        selected={departmentId}
        onSelect={(v) => {
          setDepartmentId(v);
          clearError('departmentId');
        }}
      />

      <MemberPickerSheet
        open={openPicker === 'lead' && !!branchId}
        onClose={() => setOpenPicker(null)}
        branchId={branchId}
        selectedMemberId={leadMemberId || undefined}
        title="Pick a lead"
        subtitle="Search members in this branch."
        onPick={(memberId) => {
          setLeadMemberId(memberId);
          clearError('leadMemberId');
          setOpenPicker(null);
        }}
      />

      <MemberPickerSheet
        open={openPicker === 'deputy' && !!branchId}
        onClose={() => setOpenPicker(null)}
        branchId={branchId}
        selectedMemberId={deputyMemberId ?? undefined}
        excludeMemberIds={leadMemberId ? new Set([leadMemberId]) : undefined}
        title="Pick a deputy"
        subtitle="Optional. Search members in this branch."
        onPick={(memberId) => {
          setDeputyMemberId(memberId);
          setOpenPicker(null);
        }}
      />
    </KeyboardAvoidingView>
  );
}

function useMemberName(memberId: string | null): string {
  const q = useQuery({
    queryKey: ['members', memberId],
    enabled: !!memberId,
    queryFn: async () => (await api.members.get(memberId!)).data ?? null,
  });
  if (!memberId) return '';
  if (!q.data) return '…';
  return `${q.data.firstName} ${q.data.lastName}`;
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
  deputyClearBtn: {
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

