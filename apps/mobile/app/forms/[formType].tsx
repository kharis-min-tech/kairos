import { useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Modal,
  Linking,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import {
  ChevronLeft,
  ChevronRight,
  Check,
  Plus,
  Trash2,
  ExternalLink,
  CheckCircle2,
} from 'lucide-react-native';
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
import {
  FORM_DEFINITIONS,
  FormType,
  evaluateCondition,
  type FormDefinition,
  type FormFieldDef,
  type FormSectionDef,
  type RepeatableGroupDef,
  type SubmitFormRequest,
} from '@kairos/types';
import { api } from '@/lib/api-client';
import { apiBaseUrl } from '@/lib/config';

const CONSENT_POLICY_VERSION = '2026-06-v1';
// Mirror the API origin so staging builds don't cross-link into prod.
const WEB_FORMS_BASE = `${apiBaseUrl.replace(/\/$/, '')}/forms`;

const FORM_TITLES: Record<FormType, string> = {
  first_time_visitor: 'First-Time Visitor',
  altar_call: 'New Believers Class',
  baptism: 'Baptism',
  testimony: 'Testimony',
  baby_naming: 'Baby Naming',
  baby_dedication: 'Baby Dedication',
};

function isFormType(value: string | undefined): value is FormType {
  if (!value) return false;
  return (Object.values(FormType) as string[]).includes(value);
}

type FieldValue = string | boolean | undefined;
type RowValues = Record<string, FieldValue>;

interface FormState {
  values: Record<string, FieldValue>;
  rows: Record<string, RowValues[]>;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function seedValue(f: FormFieldDef): FieldValue {
  if (f.defaultValue !== undefined) {
    if (f.type === 'date' && f.defaultValue === 'today') return todayIso();
    if (f.type === 'checkbox') return Boolean(f.defaultValue);
    return typeof f.defaultValue === 'string' ? f.defaultValue : '';
  }
  return f.type === 'checkbox' ? false : '';
}

function emptyRow(group: RepeatableGroupDef): RowValues {
  const row: RowValues = {};
  for (const f of group.fields) row[f.id] = seedValue(f);
  return row;
}

function initialState(def: FormDefinition): FormState {
  const values: Record<string, FieldValue> = {};
  const rows: Record<string, RowValues[]> = {};
  for (const block of def.blocks) {
    if (block.kind === 'section') {
      for (const f of block.fields) values[f.id] = seedValue(f);
    } else {
      const min = block.min ?? 0;
      rows[block.id] = Array.from({ length: min }, () => emptyRow(block));
    }
  }
  return { values, rows };
}

function isFieldVisible(
  field: FormFieldDef,
  blockVisible: boolean,
  values: Record<string, unknown>,
  now: Date,
): boolean {
  if (!blockVisible) return false;
  if (!field.visibleWhen) return true;
  return evaluateCondition(field.visibleWhen, values, now);
}

function isFilled(v: FieldValue): boolean {
  if (typeof v === 'boolean') return v;
  return typeof v === 'string' && v.trim().length > 0;
}

export default function FormRenderer() {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  const router = useRouter();
  const params = useLocalSearchParams<{ formType: string }>();
  const formType = params.formType;

  if (!isFormType(formType)) {
    return (
      <NotFoundState
        title="Form not found"
        message={`"${formType}" isn't a form we recognise.`}
        onBack={() => router.replace('/forms')}
      />
    );
  }

  const definition = FORM_DEFINITIONS[formType];
  if (!definition) {
    return (
      <BespokePlaceholder formType={formType} onBack={() => router.back()} />
    );
  }

  return <DeclarativeForm definition={definition} onDone={() => router.replace('/forms')} />;
}

function NotFoundState({
  title,
  message,
  onBack,
}: {
  title: string;
  message: string;
  onBack: () => void;
}) {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerBar}>
        <Pressable onPress={onBack} hitSlop={8}>
          <ChevronLeft color={c.ink} size={24} strokeWidth={1.5} />
        </Pressable>
        <Text style={styles.headerTitle}>Form</Text>
        <View style={{ width: 24 }} />
      </View>
      <View style={styles.centered}>
        <Text style={styles.emptyTitle}>{title}</Text>
        <Text style={styles.emptyMessage}>{message}</Text>
        <Button label="Back to forms" variant="primary" size="md" onPress={onBack} />
      </View>
    </SafeAreaView>
  );
}

function BespokePlaceholder({ formType, onBack }: { formType: FormType; onBack: () => void }) {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  const title = FORM_TITLES[formType];
  const href = `${WEB_FORMS_BASE}/${formType}`;
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerBar}>
        <Pressable onPress={onBack} hitSlop={8}>
          <ChevronLeft color={c.ink} size={24} strokeWidth={1.5} />
        </Pressable>
        <Text style={styles.headerTitle}>{title}</Text>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView contentContainerStyle={[styles.container, { flexGrow: 1, justifyContent: 'center' }]}>
        <Card padding="md" style={{ gap: spacing.md, alignItems: 'center' }}>
          <View style={styles.webIconTile}>
            <ExternalLink color={c.primary} size={24} strokeWidth={1.5} />
          </View>
          <Text style={[styles.emptyTitle, { textAlign: 'center' }]}>{title}</Text>
          <Text style={[styles.emptyMessage, { textAlign: 'center' }]}>
            This form uses custom fields that aren&apos;t on mobile yet. Open it on the web to
            fill it out — you&apos;ll see it here soon.
          </Text>
          <Button
            label="Open in web"
            variant="primary"
            size="md"
            fullWidth
            iconRight={<ExternalLink color="#ffffff" size={16} strokeWidth={1.5} />}
            onPress={() => Linking.openURL(href)}
          />
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

function DeclarativeForm({
  definition,
  onDone,
}: {
  definition: FormDefinition;
  onDone: () => void;
}) {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  const now = useMemo(() => new Date(), []);
  const [state, setState] = useState<FormState>(() => initialState(definition));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [consentAck, setConsentAck] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const submit = useMutation({
    mutationFn: async (data: SubmitFormRequest) =>
      (await api.forms.submit(definition.formType, data)).data!,
  });

  const values = state.values as Record<string, unknown>;

  function setValue(id: string, value: FieldValue) {
    setState((p) => ({ ...p, values: { ...p.values, [id]: value } }));
    setErrors((p) => {
      const next = { ...p };
      delete next[id];
      return next;
    });
  }

  function setRowValue(groupId: string, index: number, fieldId: string, value: FieldValue) {
    setState((p) => {
      const rows = (p.rows[groupId] ?? []).map((r, i) =>
        i === index ? { ...r, [fieldId]: value } : r,
      );
      return { ...p, rows: { ...p.rows, [groupId]: rows } };
    });
    setErrors((p) => {
      const next = { ...p };
      delete next[`${groupId}.${index}.${fieldId}`];
      return next;
    });
  }

  function addRow(group: RepeatableGroupDef) {
    setState((p) => {
      const current = p.rows[group.id] ?? [];
      if (group.max !== undefined && current.length >= group.max) return p;
      return { ...p, rows: { ...p.rows, [group.id]: [...current, emptyRow(group)] } };
    });
  }

  function removeRow(group: RepeatableGroupDef, index: number) {
    setState((p) => {
      const current = p.rows[group.id] ?? [];
      const min = group.min ?? 0;
      if (current.length <= min) return p;
      return { ...p, rows: { ...p.rows, [group.id]: current.filter((_, i) => i !== index) } };
    });
  }

  function validate(): Record<string, string> {
    const found: Record<string, string> = {};
    for (const block of definition.blocks) {
      const blockVisible = block.visibleWhen
        ? evaluateCondition(block.visibleWhen, values, now)
        : true;
      if (!blockVisible) continue;

      if (block.kind === 'section') {
        for (const field of block.fields) {
          if (!field.required) continue;
          if (!isFieldVisible(field, blockVisible, values, now)) continue;
          if (!isFilled(state.values[field.id])) {
            found[field.id] = `${field.label} is required`;
          }
        }
      } else {
        block.fields.forEach((field) => {
          if (!field.required) return;
          (state.rows[block.id] ?? []).forEach((row, index) => {
            const rowVisible = field.visibleWhen
              ? evaluateCondition(field.visibleWhen, row as Record<string, unknown>, now)
              : true;
            if (!rowVisible) return;
            if (!isFilled(row[field.id])) {
              found[`${block.id}.${index}.${field.id}`] = `${field.label} is required`;
            }
          });
        });
      }
    }
    return found;
  }

  function buildPayload(): Record<string, unknown> {
    const payload: Record<string, unknown> = {};
    for (const block of definition.blocks) {
      const blockVisible = block.visibleWhen
        ? evaluateCondition(block.visibleWhen, values, now)
        : true;
      if (!blockVisible) continue;
      if (block.kind === 'section') {
        for (const field of block.fields) {
          if (!isFieldVisible(field, blockVisible, values, now)) continue;
          const v = state.values[field.id];
          if (field.type === 'checkbox') payload[field.id] = Boolean(v);
          else if (typeof v === 'string' && v.trim().length > 0)
            payload[field.id] = v.trim();
        }
      } else {
        const rows = (state.rows[block.id] ?? [])
          .map((row) => {
            const out: Record<string, unknown> = {};
            for (const field of block.fields) {
              const v = row[field.id];
              if (field.type === 'checkbox') out[field.id] = Boolean(v);
              else if (typeof v === 'string' && v.trim().length > 0) out[field.id] = v.trim();
            }
            return out;
          })
          .filter((row) => Object.keys(row).length > 0);
        if (rows.length > 0) payload[block.id] = rows;
      }
    }
    return payload;
  }

  async function onSubmit() {
    setSubmitError(null);
    const found = validate();
    if (Object.keys(found).length > 0) {
      setErrors(found);
      return;
    }
    try {
      await submit.mutateAsync({
        payload: buildPayload(),
        consentGivenAt: new Date().toISOString(),
        consentPolicyVersion: CONSENT_POLICY_VERSION,
      });
      setSubmitted(true);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    }
  }

  if (submitted) {
    return (
      <SuccessScreen
        title="Submission received"
        message="Thank you. A leader will follow up with you soon."
        onDone={onDone}
      />
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerBar}>
        <Pressable onPress={onDone} hitSlop={8}>
          <ChevronLeft color={c.ink} size={24} strokeWidth={1.5} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {definition.title}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          {definition.description ? (
            <Text style={styles.formDescription}>{definition.description}</Text>
          ) : null}

          {definition.blocks.map((block) => {
            const blockVisible = block.visibleWhen
              ? evaluateCondition(block.visibleWhen, values, now)
              : true;
            if (!blockVisible) return null;
            return block.kind === 'section' ? (
              <SectionBlock
                key={block.id}
                block={block}
                state={state}
                errors={errors}
                setValue={setValue}
                now={now}
              />
            ) : (
              <RepeatableBlock
                key={block.id}
                block={block}
                rows={state.rows[block.id] ?? []}
                errors={errors}
                setRowValue={setRowValue}
                addRow={addRow}
                removeRow={removeRow}
                now={now}
              />
            );
          })}

          <Card padding="md" style={{ gap: spacing.sm }}>
            <Text style={styles.consentTitle}>Privacy notice</Text>
            <Text style={styles.consentBody}>
              Kharis Church uses the information you provide to contact you and administer
              church-related activities. It&apos;s stored securely until no longer required.
              To learn more or opt out, read the Privacy Policy at kharis.org.
            </Text>
            <CheckboxRow
              value={consentAck}
              onChange={setConsentAck}
              label="I have read the privacy notice and confirm I have the subject's consent to record this information."
            />
          </Card>

          {submitError ? <Text style={styles.errorLine}>{submitError}</Text> : null}

          <Button
            label={submit.isPending ? 'Submitting…' : 'Submit'}
            variant="primary"
            size="lg"
            fullWidth
            loading={submit.isPending}
            disabled={!consentAck}
            onPress={onSubmit}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function SuccessScreen({
  title,
  message,
  onDone,
}: {
  title: string;
  message: string;
  onDone: () => void;
}) {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.centered}>
        <View style={styles.successIcon}>
          <CheckCircle2 color={c.success} size={48} strokeWidth={1.5} />
        </View>
        <Text style={styles.successTitle}>{title}</Text>
        <Text style={styles.emptyMessage}>{message}</Text>
        <Button label="Back to forms" variant="primary" size="md" onPress={onDone} />
      </View>
    </SafeAreaView>
  );
}

function SectionBlock({
  block,
  state,
  errors,
  setValue,
  now,
}: {
  block: FormSectionDef;
  state: FormState;
  errors: Record<string, string>;
  setValue: (id: string, value: FieldValue) => void;
  now: Date;
}) {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  const values = state.values as Record<string, unknown>;
  const visibleFields = block.fields.filter((f) =>
    f.visibleWhen ? evaluateCondition(f.visibleWhen, values, now) : true,
  );
  if (visibleFields.length === 0) return null;

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{block.title}</Text>
      {block.description ? <Text style={styles.sectionDesc}>{block.description}</Text> : null}
      <View style={{ gap: spacing.md }}>
        {visibleFields.map((field) => (
          <FieldRenderer
            key={field.id}
            field={field}
            value={state.values[field.id]}
            onChange={(v) => setValue(field.id, v)}
            errorKey={field.id}
            error={errors[field.id]}
          />
        ))}
      </View>
    </View>
  );
}

function RepeatableBlock({
  block,
  rows,
  errors,
  setRowValue,
  addRow,
  removeRow,
  now,
}: {
  block: RepeatableGroupDef;
  rows: RowValues[];
  errors: Record<string, string>;
  setRowValue: (groupId: string, index: number, fieldId: string, value: FieldValue) => void;
  addRow: (group: RepeatableGroupDef) => void;
  removeRow: (group: RepeatableGroupDef, index: number) => void;
  now: Date;
}) {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  const itemLabel = block.itemLabel ?? 'Item';
  const canAdd = block.max === undefined || rows.length < block.max;
  const min = block.min ?? 0;

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{block.label}</Text>
      <View style={{ gap: spacing.md }}>
        {rows.map((row, index) => (
          <Card key={index} padding="md" style={{ gap: spacing.md }}>
            <View style={styles.rowHeader}>
              <Text style={styles.rowHeaderLabel}>
                {itemLabel} {index + 1}
              </Text>
              {rows.length > min ? (
                <Pressable
                  onPress={() => removeRow(block, index)}
                  hitSlop={8}
                  style={styles.removeRowBtn}
                >
                  <Trash2 color={c.danger} size={14} strokeWidth={1.5} />
                  <Text style={styles.removeRowLabel}>Remove</Text>
                </Pressable>
              ) : null}
            </View>
            {block.fields
              .filter((f) =>
                f.visibleWhen
                  ? evaluateCondition(f.visibleWhen, row as Record<string, unknown>, now)
                  : true,
              )
              .map((field) => (
                <FieldRenderer
                  key={field.id}
                  field={field}
                  value={row[field.id]}
                  onChange={(v) => setRowValue(block.id, index, field.id, v)}
                  errorKey={`${block.id}.${index}.${field.id}`}
                  error={errors[`${block.id}.${index}.${field.id}`]}
                />
              ))}
          </Card>
        ))}
      </View>
      {canAdd ? (
        <Pressable style={styles.addRowBtn} onPress={() => addRow(block)}>
          <Plus color={c.primary} size={16} strokeWidth={1.5} />
          <Text style={styles.addRowLabel}>Add {itemLabel.toLowerCase()}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function FieldRenderer({
  field,
  value,
  onChange,
  error,
}: {
  field: FormFieldDef;
  value: FieldValue;
  onChange: (v: FieldValue) => void;
  errorKey: string;
  error: string | undefined;
}) {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  if (field.type === 'checkbox') {
    return (
      <CheckboxRow
        value={Boolean(value)}
        onChange={(v) => onChange(v)}
        label={field.label}
        error={error}
      />
    );
  }

  const stringValue = typeof value === 'string' ? value : '';

  if (field.type === 'radio') {
    return (
      <View style={{ gap: spacing.xs }}>
        <FieldLabel label={field.label} required={field.required} />
        {field.helpText ? <Text style={styles.helpText}>{field.helpText}</Text> : null}
        <View style={styles.radioRow}>
          {(field.options ?? []).map((opt) => {
            const selected = stringValue === opt.value;
            return (
              <Pressable
                key={opt.value}
                onPress={() => onChange(opt.value)}
                style={[styles.radioChip, selected && styles.radioChipActive]}
              >
                <Text
                  style={[styles.radioChipLabel, selected && styles.radioChipLabelActive]}
                >
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        {error ? <Text style={styles.errorLine}>{error}</Text> : null}
      </View>
    );
  }

  if (field.type === 'select') {
    return (
      <SelectField
        label={field.label}
        placeholder={field.placeholder ?? 'Select an option'}
        options={field.options ?? []}
        value={stringValue}
        onChange={(v) => onChange(v)}
        required={field.required}
        helpText={field.helpText}
        error={error}
      />
    );
  }

  if (field.type === 'textarea') {
    return (
      <View style={{ gap: spacing.xs }}>
        <FieldLabel label={field.label} required={field.required} />
        <Input
          value={stringValue}
          onChangeText={onChange}
          placeholder={field.placeholder}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          error={error}
          containerStyle={{ minHeight: 90 }}
        />
        {field.helpText ? <Text style={styles.helpText}>{field.helpText}</Text> : null}
      </View>
    );
  }

  const keyboardType =
    field.type === 'tel'
      ? 'phone-pad'
      : field.type === 'email'
        ? 'email-address'
        : field.type === 'number'
          ? 'numeric'
          : 'default';

  const placeholder =
    field.placeholder ?? (field.type === 'date' ? 'YYYY-MM-DD' : undefined);

  return (
    <View style={{ gap: spacing.xs }}>
      <FieldLabel label={field.label} required={field.required} />
      <Input
        value={stringValue}
        onChangeText={onChange}
        placeholder={placeholder}
        keyboardType={keyboardType}
        autoCapitalize={field.type === 'email' ? 'none' : 'sentences'}
        autoCorrect={field.type === 'email' ? false : undefined}
        error={error}
      />
      {field.helpText ? <Text style={styles.helpText}>{field.helpText}</Text> : null}
    </View>
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

function CheckboxRow({
  value,
  onChange,
  label,
  error,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
  label: string;
  error?: string;
}) {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  return (
    <View style={{ gap: spacing.xs }}>
      <Pressable style={styles.checkboxRow} onPress={() => onChange(!value)}>
        <View style={[styles.checkboxBox, value && styles.checkboxBoxChecked]}>
          {value ? <Check color="#ffffff" size={14} strokeWidth={3} /> : null}
        </View>
        <Text style={styles.checkboxLabel}>{label}</Text>
      </Pressable>
      {error ? <Text style={styles.errorLine}>{error}</Text> : null}
    </View>
  );
}

function SelectField({
  label,
  placeholder,
  options,
  value,
  onChange,
  required,
  helpText,
  error,
}: {
  label: string;
  placeholder: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  helpText?: string;
  error?: string;
}) {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <View style={{ gap: spacing.xs }}>
      <FieldLabel label={label} required={required} />
      <Pressable style={styles.selectField} onPress={() => setOpen(true)}>
        <Text style={selected ? styles.selectValue : styles.selectPlaceholder}>
          {selected ? selected.label : placeholder}
        </Text>
        <ChevronRight color={c.inkFaded} size={16} strokeWidth={1.5} />
      </Pressable>
      {helpText ? <Text style={styles.helpText}>{helpText}</Text> : null}
      {error ? <Text style={styles.errorLine}>{error}</Text> : null}

      <Modal
        visible={open}
        animationType="slide"
        transparent
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.selectSheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.selectHandle} />
            <Text style={styles.selectSheetTitle}>{label}</Text>
            <ScrollView style={{ maxHeight: 380 }}>
              {options.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <Pressable
                    key={opt.value}
                    style={[styles.selectOption, isSelected && styles.selectOptionActive]}
                    onPress={() => {
                      onChange(opt.value);
                      setOpen(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.selectOptionLabel,
                        isSelected && styles.selectOptionLabelActive,
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
            <Pressable style={styles.selectCancelBtn} onPress={() => setOpen(false)}>
              <Text style={styles.selectCancelLabel}>Cancel</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
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
  container: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.md,
  },
  webIconTile: {
    width: 56,
    height: 56,
    borderRadius: radii.lg,
    backgroundColor: 'rgba(93,63,211,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: { ...typography.screenTitle, color: c.ink },
  emptyMessage: {
    ...typography.body,
    color: c.inkMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  successIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(16,185,129,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successTitle: {
    ...typography.screenTitle,
    color: c.ink,
    marginTop: spacing.sm,
  },
  formDescription: {
    ...typography.body,
    color: c.inkMuted,
    lineHeight: 20,
  },
  section: {
    gap: spacing.sm,
  },
  sectionTitle: {
    ...typography.cardTitle,
    color: c.ink,
    fontSize: 17,
  },
  sectionDesc: {
    ...typography.meta,
    color: c.inkMuted,
    lineHeight: 15,
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
    flexWrap: 'wrap',
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
    fontWeight: '600',
  },
  selectField: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.card,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    minHeight: 44,
  },
  selectValue: { ...typography.body, color: c.ink, flex: 1 },
  selectPlaceholder: {
    ...typography.body,
    color: c.inkFaded,
    flex: 1,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: c.card,
    borderRadius: radii.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: c.divider,
  },
  checkboxBox: {
    width: 20,
    height: 20,
    borderRadius: radii.xs,
    borderWidth: 1.5,
    borderColor: c.inkVeryFaded,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  checkboxBoxChecked: {
    backgroundColor: c.primary,
    borderColor: c.primary,
  },
  checkboxLabel: {
    ...typography.body,
    color: c.ink,
    flex: 1,
    lineHeight: 19,
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowHeaderLabel: {
    ...typography.cardTitle,
    color: c.ink,
    fontSize: 14,
  },
  removeRowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  removeRowLabel: {
    ...typography.meta,
    color: c.danger,
    fontWeight: '600',
  },
  addRowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: 'rgba(93,63,211,0.3)',
    borderStyle: 'dashed',
    backgroundColor: 'rgba(93,63,211,0.04)',
    marginTop: spacing.sm,
  },
  addRowLabel: {
    ...typography.button,
    color: c.primary,
    fontSize: 14,
  },
  consentTitle: {
    ...typography.cardTitle,
    color: c.ink,
  },
  consentBody: {
    ...typography.meta,
    color: c.inkMuted,
    lineHeight: 16,
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
  selectSheet: {
    backgroundColor: c.card,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    paddingTop: spacing.md,
    gap: spacing.md,
  },
  selectHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: c.inkGhost,
    alignSelf: 'center',
  },
  selectSheetTitle: {
    ...typography.cardTitle,
    color: c.ink,
  },
  selectOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.divider,
  },
  selectOptionActive: {
    backgroundColor: 'rgba(93,63,211,0.06)',
  },
  selectOptionLabel: { ...typography.body, color: c.ink },
  selectOptionLabelActive: {
    color: c.primary,
    fontWeight: '600',
  },
  selectCancelBtn: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  selectCancelLabel: {
    ...typography.button,
    color: c.primary,
  },
});
}

