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
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import {
  ChevronLeft,
  ChevronRight,
  Check,
  Plus,
  Trash2,
  CheckCircle2,
  UserCheck,
  PenLine,
  X,
} from 'lucide-react-native';
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
import {
  FORM_DEFINITIONS,
  FormType,
  buildFormPayload,
  declaredFieldIds,
  emptyFormRow,
  evaluateCondition,
  initialFormValues,
  memberReferenceState,
  validateForm,
  type FormDefinition,
  type FormFieldDef,
  type FormFieldValue,
  type FormRowValues,
  type FormSectionDef,
  type FormValues,
  type RepeatableGroupDef,
  type SubmitFormRequest,
} from '@kairos/types';
import { api } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth';
import { MemberPickerSheet, type PickedMember } from '@/components/member-picker-sheet';

const CONSENT_POLICY_VERSION = '2026-06-v1';
const YES_NO = [
  { value: 'Yes', label: 'Yes' },
  { value: 'No', label: 'No' },
];

function isFormType(value: string | undefined): value is FormType {
  if (!value) return false;
  return (Object.values(FormType) as string[]).includes(value);
}

// Seeding, validation and payload assembly are pure, and they live in
// `@kairos/types/form-engine` so this renderer and the web one cannot disagree
// about what a given set of answers submits. They had already drifted: this file
// used to reject a typed name on a required member field, and to drop every
// typed name from the payload because the free-text twin is not a field of its
// own in the definition.

type FieldValue = FormFieldValue;
type RowValues = FormRowValues;
type FormState = FormValues;

export default function FormRenderer() {
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

  // Every form type has a definition, and one renderer draws all of them on
  // both platforms. There is no "open it on the web" fallback any more.
  const definition = FORM_DEFINITIONS[formType]!;

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
  const [state, setState] = useState<FormState>(() => initialFormValues(definition));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [consentAck, setConsentAck] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Subject linking — the web forms have always had this and mobile never did,
  // so every mobile submission arrived as a brand-new contact even when the
  // person was already on the roll. `subjectMemberId` is what lets the server
  // update the existing record instead of minting a duplicate.
  const user = useAuthStore((st) => st.user);
  const [subjectMemberId, setSubjectMemberId] = useState<string | undefined>();
  const [subject, setSubject] = useState<PickedMember | null>(null);
  const [subjectOpen, setSubjectOpen] = useState(false);
  // What the pre-fill wrote, so unlinking can take back exactly those values.
  const [prefilled, setPrefilled] = useState<Record<string, string>>({});

  // Label, help text and pre-fill targets all come from the definition — the
  // same descriptor the web renderer reads. Mobile used to hardcode "Find an
  // existing person" and a name+phone pre-fill, which on a baby form named the
  // wrong relationship and filled nothing, since that form asks for a
  // `parentContactPhone` and has no `phone` at all.
  const subjectLink = definition.subjectLink;

  const submit = useMutation({
    mutationFn: async (data: SubmitFormRequest) =>
      (await api.forms.submit(definition.formType, data)).data!,
  });

  const values = state.values as Record<string, unknown>;

  // A testimony shared anonymously must not carry the subject link — the web
  // form has always dropped it, and the review drawer hides the submitter's
  // name on the strength of the same answer. Read off the answer, not the form
  // type, so any future form with the same question inherits the rule.
  const isAnonymous = state.values.shareAnonymously === true;

  function setValue(id: string, value: FieldValue) {
    // Ticking anonymity retracts the link rather than leaving one on screen
    // that submit would silently discard.
    if (id === 'shareAnonymously' && value === true) {
      setSubjectMemberId(undefined);
      setSubject(null);
    }
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
      return { ...p, rows: { ...p.rows, [group.id]: [...current, emptyFormRow(group)] } };
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

  /** Mirrors the web renderer: link the subject and pre-fill what the definition asks for. */
  function linkSubject(member: PickedMember) {
    setSubjectMemberId(member.id);
    setSubject(member);

    const targets: Record<string, string | undefined> = subjectLink?.prefill ?? {};
    const declared = declaredFieldIds(definition);
    const copy: Record<string, string> = {
      firstName: member.firstName,
      lastName: member.lastName,
      phone: member.phone ?? '',
    };
    const writes: Record<string, string> = {};
    for (const [attribute, fieldId] of Object.entries(targets)) {
      // Never invent a key the form didn't ask for.
      if (fieldId && declared.has(fieldId)) writes[fieldId] = copy[attribute] ?? '';
    }
    setPrefilled(writes);
    setState((p) => ({ ...p, values: { ...p.values, ...writes } }));
    setErrors((p) => {
      const next = { ...p };
      for (const id of Object.keys(writes)) delete next[id];
      return next;
    });
    setSubjectOpen(false);
  }

  function unlinkSubject() {
    setSubjectMemberId(undefined);
    setSubject(null);
    // Take back exactly what pre-fill wrote, and only where it is still
    // untouched — a value the person has since edited is theirs, not ours.
    setState((p) => {
      const values = { ...p.values };
      for (const [id, written] of Object.entries(prefilled)) {
        if (values[id] === written) values[id] = '';
      }
      return { ...p, values };
    });
    setPrefilled({});
  }

  async function onSubmit() {
    setSubmitError(null);
    const found = validateForm(definition, state, now);
    if (Object.keys(found).length > 0) {
      setErrors(found);
      return;
    }
    try {
      await submit.mutateAsync({
        subjectMemberId: isAnonymous ? undefined : subjectMemberId,
        payload: buildFormPayload(definition, state, now),
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
        title={definition.success?.title ?? 'Submission received'}
        message={
          (subjectMemberId && !isAnonymous ? definition.success?.linkedMessage : undefined) ??
          definition.success?.message ??
          'Thank you. A leader will follow up with you soon.'
        }
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
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          {definition.description ? (
            <Text style={styles.formDescription}>{definition.description}</Text>
          ) : null}

          {subjectLink ? (
            <Card padding="md" style={{ gap: spacing.sm }}>
              <Text style={styles.consentTitle}>{subjectLink.label}</Text>
              {subjectLink.helpText ? (
                <Text style={styles.consentBody}>{subjectLink.helpText}</Text>
              ) : null}
              {isAnonymous ? (
                <Text style={styles.helpText}>
                  An anonymous submission won’t be linked to anyone’s record.
                </Text>
              ) : (
                <>
                  <PersonRow
                    state={subjectMemberId ? 'linked' : 'empty'}
                    name={subject ? `${subject.firstName} ${subject.lastName}` : null}
                    placeholder="Search by name or phone"
                    linkedTag="Directory member"
                    onPress={() => setSubjectOpen(true)}
                    onClear={subjectMemberId ? unlinkSubject : undefined}
                  />
                  {subjectMemberId && subjectLink.linkedNote ? (
                    <Text style={styles.linkedNote}>{subjectLink.linkedNote}</Text>
                  ) : null}
                </>
              )}
            </Card>
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

      <MemberPickerSheet
        open={subjectOpen}
        onClose={() => setSubjectOpen(false)}
        branchId={user?.homeBranchId ?? ''}
        source="forms"
        selectedMemberId={subjectMemberId}
        title={subjectLink?.label ?? 'Find an existing person'}
        subtitle={subjectLink?.helpText ?? 'Search by name or phone.'}
        onPick={(id, member) =>
          linkSubject(member ?? { id, firstName: '', lastName: '', phone: null })
        }
      />
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
            bag={state.values}
            setSibling={setValue}
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
                  bag={row}
                  setSibling={(fieldId, v) => setRowValue(block.id, index, fieldId, v)}
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
  bag,
  setSibling,
  error,
}: {
  field: FormFieldDef;
  value: FieldValue;
  onChange: (v: FieldValue) => void;
  /** The values bag this field lives in — top-level, or a repeatable row's own. */
  bag: Record<string, FieldValue>;
  /** Writes a sibling in that same bag. Only member fields use it, to clear their twin. */
  setSibling: (fieldId: string, v: FieldValue) => void;
  errorKey: string;
  error: string | undefined;
}) {
  const styles = useThemedStyles(makeStyles);
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

  if (field.type === 'date') {
    // Was a plain text input with a `YYYY-MM-DD` placeholder, which is a poor
    // ask on a phone keyboard. `DatePicker` opens the OS picker and its value
    // contract is the same ISO `YYYY-MM-DD` string the engine and the API
    // expect, so nothing downstream changes.
    return (
      <View style={{ gap: spacing.xs }}>
        <FieldLabel label={field.label} required={field.required} />
        <DatePicker
          value={stringValue}
          onChange={(iso) => onChange(iso)}
          placeholder={field.placeholder ?? 'Select a date'}
          error={error ?? null}
        />
        {field.helpText ? <Text style={styles.helpText}>{field.helpText}</Text> : null}
      </View>
    );
  }

  if (field.type === 'boolean') {
    // An explicit yes/no that stores a boolean. Neither chip is selected while
    // the question is unanswered — the distinction a checkbox cannot make.
    const answered = typeof value === 'boolean';
    return (
      <View style={{ gap: spacing.xs }}>
        <FieldLabel label={field.label} required={field.required} />
        {field.helpText ? <Text style={styles.helpText}>{field.helpText}</Text> : null}
        <View style={styles.radioRow}>
          {YES_NO.map((opt) => {
            const selected = answered && value === (opt.value === 'Yes');
            return (
              <Pressable
                key={opt.value}
                onPress={() => onChange(opt.value === 'Yes')}
                style={[styles.radioChip, selected && styles.radioChipActive]}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
              >
                <Text style={[styles.radioChipLabel, selected && styles.radioChipLabelActive]}>
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

  if (field.type === 'member') {
    // Stores a member id, not a typed name — the point is that the picked
    // person can be routed to afterwards. Where a typed name is legitimate the
    // field names a free-text twin, and exactly one of the two is ever set.
    const companionId = field.freeTextFieldId;
    const companion = companionId ? bag[companionId] : undefined;
    return (
      <MemberField
        field={field}
        memberId={typeof value === 'string' ? value : ''}
        typedName={typeof companion === 'string' ? companion : ''}
        error={error}
        onPickMember={(m) => {
          onChange(m ? m.id : '');
          if (companionId) setSibling(companionId, '');
        }}
        onTypeName={
          companionId
            ? (name) => {
                setSibling(companionId, name);
                onChange('');
              }
            : undefined
        }
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

  const placeholder = field.placeholder;

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

/**
 * One question, one control.
 *
 * The earlier composition stacked a tappable search card and then, underneath
 * it, a second labelled text input introduced by "…or type their name" — one
 * answer with two visible controls, and the person filling the form had to
 * decide which half was theirs before they could start.
 *
 * Now a single row opens a single sheet. Searching and typing happen in the same
 * box; the sheet's last row, "Use “<what you typed>” as a name only", is the way
 * out, offered where it's needed instead of sitting underneath as an
 * afterthought. The row then reads back as either a linked directory member or a
 * name-only answer, so the distinction survives the answer being given.
 *
 * Mutual exclusion is structural: the sheet is the only writer, and each of its
 * two exits sets one key and clears the other.
 */
function MemberField({
  field,
  memberId,
  typedName,
  onPickMember,
  onTypeName,
  error,
}: {
  field: FormFieldDef;
  memberId: string;
  typedName: string;
  onPickMember: (member: PickedMember | null) => void;
  /** Omitted for a reference-only field, where a name we can't route to is worth nothing. */
  onTypeName?: (name: string) => void;
  error?: string;
}) {
  const styles = useThemedStyles(makeStyles);
  const user = useAuthStore((s) => s.user);
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<PickedMember | null>(null);

  const state = memberReferenceState(field, {
    [field.id]: memberId,
    ...(field.freeTextFieldId ? { [field.freeTextFieldId]: typedName } : {}),
  });
  const pickedName =
    picked && picked.id === memberId ? `${picked.firstName} ${picked.lastName}` : null;

  function clear() {
    setPicked(null);
    onPickMember(null);
    onTypeName?.('');
  }

  return (
    <View style={{ gap: spacing.xs }}>
      <FieldLabel label={field.label} required={field.required} />
      <PersonRow
        state={state}
        name={state === 'linked' ? (pickedName ?? 'A directory record') : typedName}
        placeholder={
          field.placeholder ??
          (onTypeName ? 'Search the directory, or type a name' : 'Search for a person')
        }
        linkedTag="Directory member"
        namedTag="Name only — not in the directory"
        onPress={() => setOpen(true)}
        onClear={state === 'empty' ? undefined : clear}
      />
      {error ? <Text style={styles.errorLine}>{error}</Text> : null}
      {field.helpText ? <Text style={styles.helpText}>{field.helpText}</Text> : null}

      <MemberPickerSheet
        open={open}
        onClose={() => setOpen(false)}
        branchId={user?.homeBranchId ?? ''}
        source="forms"
        selectedMemberId={memberId || undefined}
        title={field.label}
        subtitle={
          onTypeName
            ? 'Search by name or phone — or use the name you type, if they aren’t a member.'
            : 'Search members in this branch by name or phone.'
        }
        initialQuery={onTypeName ? typedName : undefined}
        onUseTypedName={
          onTypeName
            ? (name) => {
                setPicked(null);
                onTypeName(name);
                setOpen(false);
              }
            : undefined
        }
        onPick={(id, member) => {
          const resolved = member ?? { id, firstName: '', lastName: '', phone: null };
          setPicked(resolved);
          onPickMember(resolved);
          setOpen(false);
        }}
      />
    </View>
  );
}

/**
 * The collapsed answer: a placeholder, a linked member, or a name we only have
 * as text. Shared by the member fields and the subject link so the three read
 * the same, and so a linked reference never looks like a typed name.
 */
function PersonRow({
  state,
  name,
  placeholder,
  linkedTag,
  namedTag,
  onPress,
  onClear,
}: {
  state: 'linked' | 'named' | 'empty';
  name: string | null;
  placeholder: string;
  linkedTag: string;
  namedTag?: string;
  onPress: () => void;
  onClear?: () => void;
}) {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  const tag = state === 'linked' ? linkedTag : state === 'named' ? namedTag : null;

  return (
    <Pressable onPress={onPress} accessibilityRole="button">
      <View style={[styles.personRow, state === 'linked' && styles.personRowLinked]}>
        {state === 'linked' ? (
          <UserCheck color={c.primary} size={18} strokeWidth={1.5} />
        ) : state === 'named' ? (
          <PenLine color={c.inkMuted} size={18} strokeWidth={1.5} />
        ) : null}
        <View style={{ flex: 1 }}>
          <Text
            style={state === 'empty' ? styles.personRowPlaceholder : styles.personRowValue}
            numberOfLines={1}
          >
            {state === 'empty' ? placeholder : (name || placeholder)}
          </Text>
          {tag ? (
            <Text style={state === 'linked' ? styles.personRowTagLinked : styles.personRowTag}>
              {tag}
            </Text>
          ) : null}
        </View>
        {onClear ? (
          <Pressable onPress={onClear} hitSlop={10} accessibilityRole="button">
            <X color={c.inkFaded} size={18} strokeWidth={1.5} />
          </Pressable>
        ) : (
          <ChevronRight color={c.inkVeryFaded} size={18} strokeWidth={1.5} />
        )}
      </View>
    </Pressable>
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
  personRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: c.card,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 48,
  },
  personRowLinked: {
    borderColor: 'rgba(93,63,211,0.45)',
    backgroundColor: 'rgba(93,63,211,0.06)',
  },
  personRowValue: { ...typography.body, color: c.ink },
  personRowPlaceholder: { ...typography.body, color: c.inkFaded },
  personRowTag: { ...typography.meta, color: c.inkMuted },
  personRowTagLinked: { ...typography.meta, color: c.primary, fontWeight: '600' },
  linkedNote: { ...typography.meta, color: c.success, fontWeight: '600' },
});
}

