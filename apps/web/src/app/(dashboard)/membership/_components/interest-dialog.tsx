'use client';

import { useState } from 'react';
import {
  Button,
  Checkbox,
  CustomSelect,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Label,
} from '@kairos/ui';
import { MEMBERSHIP_CLASS_DAYS, type MembershipClassDay } from '@kairos/types';
import { DateSelect } from '@/components/date-select';

const DAY_LABELS: Record<MembershipClassDay, string> = {
  sunday: 'Sunday',
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
};

/**
 * Joining the membership-class waiting list.
 *
 * Every question here is optional, and the submit button is never disabled:
 * the pool is a waiting list, and refusing somebody a place on it because
 * they did not know which day suited them would be the wrong trade. What
 * they do answer helps the admin team stream the cohorts.
 *
 * "Started attending" is asked because `members` records no join date — the
 * one question from the legacy form that the system genuinely cannot answer
 * for itself.
 */
export function InterestDialog({
  isSubmitting,
  onCancel,
  onSubmit,
}: {
  isSubmitting: boolean;
  onCancel: () => void;
  onSubmit: (data: {
    preferredClassDay?: MembershipClassDay;
    startedAttendingOn?: string;
    attendsAnotherChurch?: boolean;
  }) => void;
}) {
  const [preferredClassDay, setPreferredClassDay] = useState<MembershipClassDay | ''>('');
  const [startedAttendingOn, setStartedAttendingOn] = useState('');
  const [attendsAnotherChurch, setAttendsAnotherChurch] = useState(false);

  const today = new Date().toISOString().slice(0, 10);

  return (
    <Dialog open onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Join the membership class list</DialogTitle>
          <DialogDescription>
            A membership admin will place you in an upcoming cohort. These
            questions are optional and only help them plan.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="interest-day">Which day suits you best?</Label>
            <CustomSelect
              id="interest-day"
              value={preferredClassDay}
              onValueChange={(v) => setPreferredClassDay(v as MembershipClassDay | '')}
              placeholder="No preference"
              options={[
                { value: '', label: 'No preference' },
                ...MEMBERSHIP_CLASS_DAYS.map((d) => ({
                  value: d,
                  label: DAY_LABELS[d],
                })),
              ]}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="interest-started">When did you start attending Kharis?</Label>
            <DateSelect
              id="interest-started"
              value={startedAttendingOn}
              onChange={setStartedAttendingOn}
              maxDate={today}
              placeholder="Select a date"
            />
          </div>

          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#5D3FD3]/20 bg-[#5D3FD3]/[0.04] p-4 dark:border-white/10 dark:bg-white/[0.03]">
            <Checkbox
              checked={attendsAnotherChurch}
              onChange={(e) => setAttendsAnotherChurch(e.target.checked)}
            />
            <span className="text-sm leading-relaxed">
              I currently attend another church as well
            </span>
          </label>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            disabled={isSubmitting}
            onClick={() =>
              onSubmit({
                preferredClassDay: preferredClassDay || undefined,
                startedAttendingOn: startedAttendingOn || undefined,
                // Only sent when ticked: an untouched checkbox is "not
                // answered", not a declared "no".
                attendsAnotherChurch: attendsAnotherChurch || undefined,
              })
            }
          >
            {isSubmitting ? 'Joining…' : 'Join the list'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
