'use client';

import { useId, useState } from 'react';
import type { FormFieldDef, FormMemberSearchResult } from '@kairos/types';
import { memberReferenceState } from '@kairos/types';
import { Badge, Input, cn } from '@kairos/ui';
import { Search, X, UserCheck, PenLine } from 'lucide-react';
import { useAuthStore } from '@/lib/auth-store';
import { useFormMemberSearch } from '@/hooks/use-forms';
import { FieldError, FieldLabel } from './field';

/**
 * The one way to find a person anywhere in the forms surface.
 *
 * There used to be three: this combobox for `member` fields, a `MemberSearchLink`
 * card for the bespoke forms' subject link, and a third hand-rolled typeahead
 * inlined in the declarative renderer. All three searched the same endpoint and
 * none of them looked or behaved quite the same — and the card hardcoded
 * `id="member-search"`, so two of them on one page shared a DOM id and the
 * labels pointed at whichever won.
 *
 * It answers one question with one control. Typing searches the directory and
 * the matches are offered as options. Where a typed name is a legitimate answer
 * — a visiting child's guardian, a baby's parent, people who may simply not be
 * in the directory — the caller passes `onTypeName`, the text being typed IS the
 * answer already, and the last option merely confirms "keep what I typed". So
 * the fallback needs no second control and is discovered exactly when it's
 * needed rather than sitting underneath as an afterthought.
 *
 * Mutual exclusion is structural, not a rule applied afterwards: while nothing
 * is linked the input is bound to the free-text key, and the moment a match is
 * picked the input is replaced by a resolved token and the free-text key is
 * cleared. There is no state in which both are editable, so the payload can
 * never carry both. A reader can trust that an id means a real person.
 */
export interface MemberComboboxProps {
  /** Label above the control. */
  label: string;
  /** Helper line, shown while nothing has been answered. */
  helpText?: string;
  placeholder?: string;
  required?: boolean;
  /** Current member id, or '' when nothing is linked. */
  memberId: string;
  /** Current typed name. Always '' for a reference-only control. */
  typedName?: string;
  /** Picking writes the id and clears the typed name; `null` clears both. */
  onPick: (member: FormMemberSearchResult | null) => void;
  /**
   * Writes the typed name and clears the id. Omit for a reference-only control,
   * where a name we can't route to is worth nothing and typing is search only.
   */
  onTypeName?: (name: string) => void;
  /** Extra line shown under a linked answer, e.g. what submitting will do. */
  linkedNote?: string;
  errorMessage?: string;
  /** De-emphasise and lock the control — an anonymous submission has nothing to link. */
  disabled?: boolean;
  /** Shown in place of the control's guidance while disabled. */
  disabledHint?: string;
  /** Overrides the generated input id, for a stable label association. */
  id?: string;
}

export function MemberCombobox({
  label,
  helpText,
  placeholder,
  required,
  memberId,
  typedName = '',
  onPick,
  onTypeName,
  linkedNote,
  errorMessage,
  disabled = false,
  disabledHint,
  id,
}: MemberComboboxProps) {
  const user = useAuthStore((s) => s.user);
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const listId = `${inputId}-options`;

  const allowTypedName = typeof onTypeName === 'function';
  const linked = memberId.trim().length > 0;
  const named = !linked && typedName.trim().length > 0;

  // The picked person's name only ever lives here: writing it into the
  // free-text key as well would put a name and an id under the same answer,
  // which is the one thing this control exists to prevent.
  const [picked, setPicked] = useState<FormMemberSearchResult | null>(null);
  // Reference-only controls have nowhere to keep the search text, so it stays local.
  const [draft, setDraft] = useState('');
  const [open, setOpen] = useState(false);

  const text = allowTypedName ? typedName : draft;
  const canSearch = text.trim().length >= 2;

  const { data: results, isFetching: searching } = useFormMemberSearch(
    { q: text, branchId: user?.homeBranchId },
    { enabled: !disabled && open && canSearch },
  );

  function handleText(next: string) {
    setOpen(true);
    if (onTypeName) onTypeName(next);
    else {
      setDraft(next);
      if (linked) onPick(null);
    }
  }

  function handlePick(member: FormMemberSearchResult) {
    setPicked(member);
    setDraft(`${member.firstName} ${member.lastName}`);
    setOpen(false);
    onPick(member);
  }

  function handleUnlink() {
    setPicked(null);
    setDraft('');
    setOpen(false);
    onPick(null);
  }

  // `htmlFor` only where there is an input to point at: a linked answer is a
  // resolved token, not a control, so the label stands on its own.
  const renderLabel = (forInput: boolean) => (
    <FieldLabel htmlFor={forInput ? inputId : undefined} required={required}>
      {label}
    </FieldLabel>
  );

  if (linked && !disabled) {
    const name =
      picked && picked.id === memberId
        ? `${picked.firstName} ${picked.lastName}`
        : 'A directory record';
    return (
      <div className="space-y-2">
        {renderLabel(false)}
        <div className="flex items-center gap-3 rounded-lg border border-[#5D3FD3]/30 bg-[#5D3FD3]/5 p-3 dark:border-[#5D3FD3]/45 dark:bg-[#5D3FD3]/10">
          <UserCheck className="h-4 w-4 shrink-0 text-[#5D3FD3]" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-foreground">{name}</p>
            {picked && picked.id === memberId ? (
              <p className="truncate text-xs text-muted-foreground">
                {picked.phone ?? 'No phone'} · {picked.memberType}
              </p>
            ) : null}
          </div>
          <Badge
            variant="outline"
            className="shrink-0 border-[#5D3FD3]/25 bg-[#5D3FD3]/10 text-[#5D3FD3]"
          >
            Directory member
          </Badge>
          <button
            type="button"
            onClick={handleUnlink}
            aria-label={`Change ${label.toLowerCase()}`}
            className="shrink-0 text-sm font-medium text-[#5D3FD3] hover:underline"
          >
            Change
          </button>
        </div>
        {linkedNote ? (
          <p className="text-xs font-medium text-[#16A34A]">{linkedNote}</p>
        ) : null}
        <FieldError message={errorMessage} />
      </div>
    );
  }

  const expanded = !disabled && open && text.trim().length > 0;

  return (
    <div
      className={cn('space-y-2', disabled && 'opacity-50')}
      // Closing on blur is what lets the settled answer announce itself below.
      // `relatedTarget` keeps a click on an option from closing the list before
      // the click lands.
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      {renderLabel(true)}

      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          id={inputId}
          role="combobox"
          aria-expanded={expanded}
          aria-controls={listId}
          aria-autocomplete="list"
          autoComplete="off"
          className="pl-9 pr-9"
          disabled={disabled}
          placeholder={
            placeholder ??
            (allowTypedName ? 'Search the directory, or type a name' : 'Search by name or phone…')
          }
          value={disabled ? '' : text}
          onChange={(e) => handleText(e.target.value)}
          onFocus={() => setOpen(true)}
        />
        {text && !disabled ? (
          <button
            type="button"
            aria-label={`Clear ${label.toLowerCase()}`}
            onClick={handleUnlink}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      {expanded ? (
        <div
          id={listId}
          role="listbox"
          aria-label={`${label} matches`}
          className="overflow-hidden rounded-lg border border-input/15 dark:border-white/10"
        >
          {!canSearch ? (
            <p className="px-3 py-2 text-sm text-muted-foreground">
              Keep typing to search the directory.
            </p>
          ) : searching ? (
            <p className="px-3 py-2 text-sm text-muted-foreground">Searching…</p>
          ) : results && results.length > 0 ? (
            results.map((r) => (
              <button
                key={r.id}
                type="button"
                role="option"
                aria-selected={false}
                onClick={() => handlePick(r)}
                className="flex w-full flex-col items-start px-3 py-2 text-left text-sm hover:bg-[#5D3FD3]/5"
              >
                <span className="font-medium text-foreground">
                  {r.firstName} {r.lastName}
                </span>
                <span className="text-xs text-muted-foreground">
                  {r.phone ?? 'No phone'} · {r.memberType}
                </span>
              </button>
            ))
          ) : (
            <p className="px-3 py-2 text-sm text-muted-foreground">
              No one in your branch matches “{text.trim()}”.
            </p>
          )}

          {/* The way out, offered where it is needed rather than as a second
              field underneath. It commits nothing new — the typed text is
              already the answer — it only confirms that a name is all we have. */}
          {allowTypedName && canSearch ? (
            <button
              type="button"
              role="option"
              aria-selected={false}
              onClick={() => setOpen(false)}
              className="flex w-full items-start gap-2 border-t border-input/15 bg-foreground/[0.02] px-3 py-2 text-left text-sm hover:bg-[#5D3FD3]/5 dark:border-white/10"
            >
              <PenLine
                className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground"
                aria-hidden="true"
              />
              <span>
                <span className="font-medium text-foreground">
                  Use “{text.trim()}” as a name only
                </span>
                <span className="block text-xs text-muted-foreground">
                  They aren’t in the directory, so we’ll record the name without a record.
                </span>
              </span>
            </button>
          ) : null}
        </div>
      ) : null}

      {/* While the list is open it is doing the explaining; once it closes, this
          says which of the two things was actually recorded. */}
      {disabled ? (
        disabledHint ? (
          <p className="text-xs text-muted-foreground">{disabledHint}</p>
        ) : null
      ) : expanded ? null : named ? (
        <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
          <PenLine className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
          <span>Recorded as a name only — not linked to anyone in the directory.</span>
        </p>
      ) : helpText ? (
        <p className="text-xs text-muted-foreground">{helpText}</p>
      ) : allowTypedName ? (
        <p className="text-xs text-muted-foreground">
          Pick them from the directory so they can be followed up, or just type their name.
        </p>
      ) : null}

      <FieldError message={errorMessage} />
    </div>
  );
}

/**
 * Adapter for a declarative `member` field: the definition already says what to
 * call it, whether it's required, and whether a typed name is acceptable
 * (`freeTextFieldId`). Nothing here but the mapping.
 */
export function MemberPickOrType({
  field,
  memberId,
  typedName,
  onPickMember,
  onTypeName,
  errorMessage,
}: {
  field: FormFieldDef;
  memberId: string;
  typedName: string;
  onPickMember: (member: FormMemberSearchResult | null) => void;
  onTypeName?: (name: string) => void;
  errorMessage?: string;
}) {
  // Reads the pair through the shared matcher so the control and validation
  // agree on what counts as linked.
  const linked =
    memberReferenceState(field, {
      [field.id]: memberId,
      ...(field.freeTextFieldId ? { [field.freeTextFieldId]: typedName } : {}),
    }) === 'linked';

  return (
    <MemberCombobox
      label={field.label}
      helpText={field.helpText}
      placeholder={field.placeholder}
      required={field.required}
      memberId={linked ? memberId : ''}
      typedName={field.freeTextFieldId ? typedName : ''}
      onPick={onPickMember}
      onTypeName={onTypeName}
      errorMessage={errorMessage}
    />
  );
}
