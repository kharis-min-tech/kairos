'use client';

import { useState } from 'react';
import {
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Textarea,
} from '@kairos/ui';

/**
 * The Kingdom Service application.
 *
 * Replaces what used to be a one-click "Request to Join": serving in a
 * department is an undertaking, and the paper form it grew out of asked the
 * applicant to say what they bring, accept a declaration, and sign it.
 *
 * Only the declaration and the printed signature are required. Experience and
 * profession are genuinely optional — a willing first-timer with no track
 * record is exactly who this form should let through.
 *
 * Neither the signature date nor the acceptance time is collected here: the
 * API stamps both server-side from a single instant, so there is no field for
 * the applicant to get wrong and no way to backdate a signature.
 */
export function ApplyDialog({
  departmentName,
  isSubmitting,
  onCancel,
  onSubmit,
}: {
  departmentName: string;
  isSubmitting: boolean;
  onCancel: () => void;
  onSubmit: (data: {
    experience?: string;
    profession?: string;
    notes?: string;
    declarationAccepted: true;
    signatureName: string;
  }) => void;
}) {
  const [experience, setExperience] = useState('');
  const [profession, setProfession] = useState('');
  const [notes, setNotes] = useState('');
  const [declarationAccepted, setDeclarationAccepted] = useState(false);
  const [signatureName, setSignatureName] = useState('');

  const trimmedSignature = signatureName.trim();
  const canSubmit = declarationAccepted && trimmedSignature.length > 0 && !isSubmitting;

  function handleSubmit() {
    if (!canSubmit) return;
    onSubmit({
      experience: experience.trim() || undefined,
      profession: profession.trim() || undefined,
      notes: notes.trim() || undefined,
      declarationAccepted: true,
      signatureName: trimmedSignature,
    });
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Apply to join {departmentName}</DialogTitle>
          <DialogDescription>
            Tell the department a little about yourself, then sign the
            declaration below.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="apply-experience">
              Relevant experience{' '}
              <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              id="apply-experience"
              rows={3}
              value={experience}
              onChange={(e) => setExperience(e.target.value)}
              placeholder="Anything you have done before that is relevant — in or outside church."
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="apply-profession">
              Profession{' '}
              <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="apply-profession"
              value={profession}
              onChange={(e) => setProfession(e.target.value)}
              placeholder="e.g. Radiographer"
            />
            <p className="text-xs text-muted-foreground">
              Saved to your profile, so you are only ever asked once.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="apply-notes">
              Anything else{' '}
              <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              id="apply-notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Availability, questions, anything the department should know."
            />
          </div>

          {/* The declaration. Deliberately spelled out rather than hidden
              behind a link: this is the sentence the applicant is signing. */}
          <div className="rounded-xl border border-[#5D3FD3]/20 bg-[#5D3FD3]/[0.04] p-4 dark:border-white/10 dark:bg-white/[0.03]">
            <label className="flex cursor-pointer items-start gap-3">
              <Checkbox
                checked={declarationAccepted}
                onChange={(e) => setDeclarationAccepted(e.target.checked)}
                aria-describedby="apply-declaration-text"
              />
              <span id="apply-declaration-text" className="text-sm leading-relaxed">
                I am willing to serve in this department. I will attend
                rehearsals, meetings and rotas as required, carry out what I am
                given faithfully, and let a leader know in good time if I am
                unable to.
              </span>
            </label>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="apply-signature">Signature (type your full name)</Label>
            <Input
              id="apply-signature"
              value={signatureName}
              onChange={(e) => setSignatureName(e.target.value)}
              placeholder="Your full name"
              autoComplete="name"
            />
            <p className="text-xs text-muted-foreground">
              Today&apos;s date is recorded automatically when you submit.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            {isSubmitting ? 'Submitting…' : 'Submit application'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
