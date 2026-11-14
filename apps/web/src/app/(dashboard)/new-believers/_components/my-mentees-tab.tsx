'use client';

import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { HeartHandshake, MessageSquarePlus } from 'lucide-react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Textarea,
} from '@kairos/ui';
import { formatShortDate } from '@kairos/core';
import { useCreateMentorFollowup, useMentorFollowups } from '@/hooks/use-new-believers';
import { getStageByValue, stageLabel } from './stage-config';
import type { EnrollmentCardData } from './types';
import { useTranslation } from 'react-i18next';

interface MyMenteesTabProps {
  enrollments: EnrollmentCardData[];
}

export function MyMenteesTab({ enrollments }: MyMenteesTabProps) {  const { t } = useTranslation(['newBelievers', 'common']);

  const [activeMenteeId, setActiveMenteeId] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const createFollowup = useCreateMentorFollowup();

  function openFollowupDialog(enrollmentId: string) {
    setActiveMenteeId(enrollmentId);
    setNote('');
  }

  function closeFollowupDialog() {
    setActiveMenteeId(null);
    setNote('');
  }

  async function handleSubmitFollowup() {
    if (!activeMenteeId || !note.trim()) return;
    try {
      await createFollowup.mutateAsync({
        enrollmentId: activeMenteeId,
        data: { note: note.trim() },
      });
      toast.success(t('newBelievers:followUpLogged'));
      closeFollowupDialog();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to log follow-up');
    }
  }

  if (enrollments.length === 0) {
    return (
      <div
        className="rounded-lg border border-dashed p-8 text-center"
        role="status"
      >
        <HeartHandshake className="mx-auto mb-2 h-6 w-6 text-muted-foreground" aria-hidden />
        <p className="text-sm font-medium text-muted-foreground">{t('newBelievers:youAreNotCurrentlyMentoringAnyone')}</p>
        <p className="mt-1 text-xs text-muted-foreground">{t('newBelievers:menteesWillAppearHereOnceThey')}</p>
      </div>
    );
  }

  return (
    <>
      <ul className="space-y-2" aria-label={t('newBelievers:enrollmentsIMentor')}>
        {enrollments.map((e) => (
          <MenteeRow
            key={e.id}
            enrollment={e}
            onAddFollowup={() => openFollowupDialog(e.id)}
          />
        ))}
      </ul>

      <Dialog open={!!activeMenteeId} onOpenChange={(open) => !open && closeFollowupDialog()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('newBelievers:logAFollowUp')}</DialogTitle>
            <DialogDescription>{t('newBelievers:recordAQuickNoteAboutYour')}</DialogDescription>
          </DialogHeader>
          <Textarea
            value={note}
            onChange={(ev) => setNote(ev.target.value)}
            placeholder={t('newBelievers:howWasTheConversationAnyConcerns')}
            rows={5}
            maxLength={2000}
          />
          <DialogFooter>
            <Button variant="outline" onClick={closeFollowupDialog}>{t('newBelievers:cancel')}</Button>
            <Button
              onClick={handleSubmitFollowup}
              disabled={!note.trim() || createFollowup.isPending}
              className="bg-gradient-to-br from-[#451ebb] to-[#5d3fd3] text-white hover:opacity-90 border-0"
            >
              {createFollowup.isPending ? t('newBelievers:saving') : t('newBelievers:saveFollowUp')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function MenteeRow({
  enrollment,
  onAddFollowup,
}: {
  enrollment: EnrollmentCardData;
  onAddFollowup: () => void;
}) {  const { t } = useTranslation(['newBelievers', 'common']);

  const stage = getStageByValue(enrollment.stage);
  const { data: followups } = useMentorFollowups(enrollment.id);
  const lastFollowupAt = followups?.[0]?.contactedAt;

  return (
    <li className="rounded-lg border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <Link
            href={`/new-believers/${enrollment.id}`}
            className="text-sm font-semibold hover:underline"
          >
            {enrollment.memberFirstName} {enrollment.memberLastName}
          </Link>
          <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <span
                className={`inline-block h-1.5 w-1.5 rounded-full ${stage?.dotColor ?? 'bg-slate-400'}`}
                aria-hidden
              />
              {stageLabel(t, stage, enrollment.stage)}
            </span>
            <span aria-hidden>·</span>
            <span>
              {lastFollowupAt
                ? t('newBelievers:lastFollowUpOn', { date: formatShortDate(lastFollowupAt) })
                : t('newBelievers:noFollowUpLoggedYet')}
            </span>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onAddFollowup}
          className="shrink-0"
        >
          <MessageSquarePlus className="mr-1 h-3.5 w-3.5" aria-hidden />{t('newBelievers:followUp')}</Button>
      </div>
    </li>
  );
}
