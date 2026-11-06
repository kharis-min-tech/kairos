'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { UserPlus } from 'lucide-react';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CustomSelect,
  EmptyState,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
} from '@kairos/ui';
import type { AddMyChildRequest } from '@kairos/types';
import { DateSelect } from '@/components/date-select';
import { useAddMyChild, useMyChildren } from '@/hooks/use-me';

const RELATIONSHIPS = ['Mother', 'Father', 'Grandparent', 'Guardian', 'Carer', 'Other'] as const;

function ageFrom(dateOfBirth: string | null): string {
  if (!dateOfBirth) return 'Age unknown';
  const dob = new Date(dateOfBirth);
  if (Number.isNaN(dob.getTime())) return 'Age unknown';
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const beforeBirthday =
    now.getMonth() < dob.getMonth() ||
    (now.getMonth() === dob.getMonth() && now.getDate() < dob.getDate());
  if (beforeBirthday) age -= 1;
  if (age < 1) return 'Under 1';
  return `${age} year${age === 1 ? '' : 's'} old`;
}

/**
 * The children on your own record.
 *
 * Under-16s cannot sign in, so a parent holds the record on their behalf.
 * Before this, the only ways a child could enter the system were the
 * first-time-visitor form and the baby naming/dedication forms — so an
 * existing member whose children already attended had no route at all.
 *
 * Adding is self-service because the parent is the source of the data.
 * Claiming a child who already exists is NOT offered here: that needs
 * someone who can verify the claim, and it stays with the branch admins.
 */
export function MyChildrenCard() {
  const { data: children, isLoading } = useMyChildren();
  const addChild = useAddMyChild();
  const [open, setOpen] = useState(false);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <CardTitle>My children</CardTitle>
        <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
          <UserPlus className="mr-1.5 size-4" />
          Add a child
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2" aria-busy="true">
            <div className="h-12 animate-pulse rounded-lg bg-muted/40" />
            <div className="h-12 animate-pulse rounded-lg bg-muted/40" />
          </div>
        ) : (children ?? []).length === 0 ? (
          <EmptyState message="Nobody added yet. Add a child so they can be registered for the children's department and checked in at services." />
        ) : (
          <ul className="divide-y divide-border/60">
            {(children ?? []).map((child) => (
              <li key={child.id} className="flex items-center gap-3 py-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#5D3FD3]/10 text-sm font-semibold text-[#5D3FD3]">
                  {child.firstName.charAt(0)}
                  {child.lastName.charAt(0)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {child.firstName} {child.lastName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {ageFrom(child.dateOfBirth)}
                    {child.relationship ? ` · you are their ${child.relationship.toLowerCase()}` : ''}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-xs text-muted-foreground">
          Children have no login of their own — their record lives here with
          yours. To correct a record or add a second guardian, ask your branch
          admin.
        </p>
      </CardContent>

      {open && (
        <AddChildDialog
          isSubmitting={addChild.isPending}
          onCancel={() => setOpen(false)}
          onSubmit={(data) =>
            addChild.mutate(data, {
              onSuccess: (child) => {
                setOpen(false);
                toast.success(`${child.firstName} added to your record.`);
              },
              onError: (e: unknown) =>
                toast.error(e instanceof Error ? e.message : 'Could not add child.'),
            })
          }
        />
      )}
    </Card>
  );
}

function AddChildDialog({
  isSubmitting,
  onCancel,
  onSubmit,
}: {
  isSubmitting: boolean;
  onCancel: () => void;
  onSubmit: (data: AddMyChildRequest) => void;
}) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState<'Male' | 'Female' | ''>('');
  const [relationship, setRelationship] = useState<string>('');

  const today = new Date().toISOString().slice(0, 10);
  const canSubmit =
    firstName.trim().length > 0 &&
    lastName.trim().length > 0 &&
    dateOfBirth.length > 0 &&
    !isSubmitting;

  return (
    <Dialog open onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add a child</DialogTitle>
          <DialogDescription>
            They will be added to your record as someone you are responsible
            for. Children under 16 have no login of their own.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="child-first">First name</Label>
              <Input
                id="child-first"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                autoComplete="off"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="child-last">Last name</Label>
              <Input
                id="child-last"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                autoComplete="off"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="child-dob">Date of birth</Label>
            <DateSelect
              id="child-dob"
              value={dateOfBirth}
              onChange={setDateOfBirth}
              maxDate={today}
              placeholder="Select date of birth"
            />
            <p className="text-xs text-muted-foreground">
              Required — it decides which children&apos;s class they belong in
              and keeps their record protected as a minor.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="child-gender">
                Gender{' '}
                <span className="font-normal text-muted-foreground">(optional)</span>
              </Label>
              <CustomSelect
                id="child-gender"
                value={gender}
                onValueChange={(v) => setGender(v as 'Male' | 'Female' | '')}
                placeholder="Prefer not to say"
                options={[
                  { value: '', label: 'Prefer not to say' },
                  { value: 'Male', label: 'Male' },
                  { value: 'Female', label: 'Female' },
                ]}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="child-relationship">
                You are their{' '}
                <span className="font-normal text-muted-foreground">(optional)</span>
              </Label>
              <CustomSelect
                id="child-relationship"
                value={relationship}
                onValueChange={setRelationship}
                placeholder="Select"
                options={[
                  { value: '', label: 'Prefer not to say' },
                  ...RELATIONSHIPS.map((r) => ({ value: r, label: r })),
                ]}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            disabled={!canSubmit}
            onClick={() =>
              onSubmit({
                firstName: firstName.trim(),
                lastName: lastName.trim(),
                dateOfBirth,
                gender: gender || undefined,
                relationship: (relationship || undefined) as
                  | AddMyChildRequest['relationship']
                  | undefined,
              })
            }
          >
            {isSubmitting ? 'Adding…' : 'Add child'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
