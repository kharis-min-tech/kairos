'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button, Textarea } from '@kairos/ui';
import { useUpdateSession } from '@/hooks/use-new-believers';
import type { NewBelieverSession } from '@kairos/types';

interface Props {
  session: NewBelieverSession;
  canEdit: boolean;
}

export function NotesTab({ session, canEdit }: Props) {
  const [value, setValue] = useState(session.feedback ?? '');
  const [saved, setSaved] = useState(false);
  const updateSession = useUpdateSession();

  // Reset local state when the selected session changes
  useEffect(() => {
    setValue(session.feedback ?? '');
    setSaved(false);
  }, [session.id, session.feedback]);

  async function handleSave() {
    try {
      await updateSession.mutateAsync({
        id: session.id,
        data: { feedback: value.trim() },
      });
      toast.success('Session notes saved');
      setSaved(true);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to save session notes');
    }
  }

  if (!canEdit) {
    return (
      <div className="rounded-lg bg-muted px-3 py-3 text-sm text-muted-foreground">
        {session.feedback || 'No session notes recorded yet.'}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Class-level notes for this session, visible to other leaders.
      </p>
      <Textarea
        rows={5}
        placeholder="Capture class-wide observations, questions raised, or follow-up themes."
        value={value}
        onChange={(event) => {
          setValue(event.target.value);
          setSaved(false);
        }}
      />
      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          size="sm"
          onClick={handleSave}
          disabled={updateSession.isPending}
        >
          {updateSession.isPending ? 'Saving...' : 'Save Notes'}
        </Button>
        {saved && (
          <span className="text-xs font-medium text-emerald-600">Notes saved.</span>
        )}
      </div>
    </div>
  );
}
