'use client';

import { useState } from 'react';
import { Input, Card, CardContent, cn } from '@kairos/ui';
import { Search, X } from 'lucide-react';
import type { FormMemberSearchResult } from '@kairos/types';
import { useAuthStore } from '@/lib/auth-store';
import { useFormMemberSearch } from '@/hooks/use-forms';
import { FieldLabel } from './field';

interface MemberSearchLinkProps {
  /** The currently linked member id (subjectMemberId), if any. */
  value?: string;
  /** Called when a search result is picked. Receives the full match. */
  onSelect: (member: FormMemberSearchResult) => void;
  /** Called when the link is cleared (search emptied / X pressed). */
  onClear: () => void;
  /** Field label shown above the search input. */
  label?: string;
  /** Helper text under the label. */
  helpText?: string;
  /** The green confirmation line shown once a person is linked. */
  linkedNote?: string;
  /** When true the control is visually de-emphasised and disabled. */
  disabled?: boolean;
  /** Optional hint shown in place of the control when disabled. */
  disabledHint?: string;
}

/**
 * Shared "find an existing person" typeahead used by the data-capture forms
 * (altar-call, baptism, testimony, baby-naming/dedication). Wraps
 * `useFormMemberSearch` scoped to the submitter's home branch, owns its own
 * search input + dropdown state, and hands the picked match back to the parent
 * so it can set `subjectMemberId` and pre-fill name/phone fields.
 */
export function MemberSearchLink({
  value,
  onSelect,
  onClear,
  label = 'Find an existing person',
  helpText = 'Search by name or phone. Leave blank to create a new contact.',
  linkedNote = 'Linked to an existing person.',
  disabled = false,
  disabledHint,
}: MemberSearchLinkProps) {
  const user = useAuthStore((s) => s.user);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);

  const { data: searchResults, isFetching: searching } = useFormMemberSearch(
    { q: searchTerm, branchId: user?.homeBranchId },
    { enabled: !disabled && searchOpen && searchTerm.trim().length >= 2 },
  );

  function handleSelect(r: FormMemberSearchResult) {
    onSelect(r);
    setSearchOpen(false);
    setSearchTerm(`${r.firstName} ${r.lastName}`);
  }

  function handleClear() {
    setSearchTerm('');
    setSearchOpen(false);
    onClear();
  }

  return (
    <Card className={cn(disabled && 'opacity-50')}>
      <CardContent className="space-y-3 py-5">
        <FieldLabel htmlFor="member-search">{label}</FieldLabel>
        <p className="text-xs text-muted-foreground">{helpText}</p>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="member-search"
            className="pl-9 pr-9"
            placeholder="Search by name or phone…"
            disabled={disabled}
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setSearchOpen(true);
              if (value) onClear();
            }}
            onFocus={() => setSearchOpen(true)}
          />
          {(searchTerm || value) && !disabled ? (
            <button
              type="button"
              aria-label="Clear search"
              onClick={handleClear}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>

        {disabled && disabledHint ? (
          <p className="text-xs text-muted-foreground">{disabledHint}</p>
        ) : null}

        {!disabled && value ? (
          <p className="text-xs font-medium text-[#16A34A]">{linkedNote}</p>
        ) : null}

        {!disabled && searchOpen && searchTerm.trim().length >= 2 && !value ? (
          <div className="rounded-lg border border-input/15">
            {searching ? (
              <p className="px-3 py-2 text-sm text-muted-foreground">Searching…</p>
            ) : searchResults && searchResults.length > 0 ? (
              <ul>
                {searchResults.map((r) => (
                  <li key={r.id}>
                    <button
                      type="button"
                      onClick={() => handleSelect(r)}
                      className="flex w-full flex-col items-start px-3 py-2 text-left text-sm hover:bg-foreground/5"
                    >
                      <span className="font-medium text-foreground">
                        {r.firstName} {r.lastName}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {r.phone ?? 'No phone'} · {r.memberType}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-3 py-2 text-sm text-muted-foreground">
                No matches — a new contact will be created.
              </p>
            )}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
