'use client';

import type { FormFieldDef } from '@kairos/types';
import type { FormMemberSearchResult } from '@kairos/types';
import { Input } from '@kairos/ui';
import { MemberSearchLink } from './member-search-link';
import { FieldLabel } from './field';

/**
 * A person who may or may not be in the directory.
 *
 * A baby's parent and a visiting child's guardian are often members — and
 * when they are, we want a reference so the record can be followed up. But
 * requiring a pick would block the form for everyone else, so the typed name
 * stays available.
 *
 * The two are mutually exclusive by construction: picking clears the typed
 * name, typing clears the pick. The payload therefore never carries an
 * ambiguous value, and a reader can trust that an id means a real member.
 */
export function MemberPickOrType({
  field,
  memberId,
  typedName,
  onPickMember,
  onTypeName,
}: {
  field: FormFieldDef;
  memberId: string;
  typedName: string;
  onPickMember: (id: string) => void;
  onTypeName: (name: string) => void;
}) {
  const linked = memberId.length > 0;

  return (
    <div className="space-y-2">
      <MemberSearchLink
        value={linked ? memberId : undefined}
        onSelect={(m: FormMemberSearchResult) => onPickMember(m.id)}
        onClear={() => onPickMember('')}
        label={field.label}
        helpText={field.placeholder ?? 'Search by name or phone.'}
        linkedNote="Linked to an existing person."
      />

      {/* Hidden once a member is linked — showing both would invite someone to
          fill in two different people and wonder which one counted. */}
      {!linked ? (
        <div className="space-y-1.5">
          <FieldLabel>…or type their name if they’re not a member</FieldLabel>
          <Input
            value={typedName}
            onChange={(e) => onTypeName(e.target.value)}
            placeholder="Full name"
          />
        </div>
      ) : null}
    </div>
  );
}
