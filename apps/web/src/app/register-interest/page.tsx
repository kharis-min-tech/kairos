'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Check, AlertCircle } from 'lucide-react';
import { BRAND_NAME, PILOT_BRANCHES, PILOT_REQUIREMENTS } from '@kairos/types';
import { CustomSelect, Input, Label } from '@kairos/ui';
import { useSubmitPilotInterest } from '@/hooks/use-pilot-interest';

/**
 * The pilot sign-up.
 *
 * Two steps on purpose, and in this order. The rollout plan says the time
 * cost "belongs in the announcement rather than in a later conversation",
 * because "a branch that volunteers on enthusiasm alone and then meets the
 * daily approval queue will sour by the third week". So the commitments are
 * the whole of step one, and the form does not exist until they have been
 * read and ticked. Nobody can scroll past them to the fields.
 */
export default function RegisterInterestPage() {
  const [step, setStep] = useState<'requirements' | 'form' | 'done'>('requirements');

  if (step === 'done') return <Submitted />;

  return (
    <div className="mx-auto max-w-3xl px-6 py-14 md:py-20">
      <Hero step={step} />
      {step === 'requirements' ? (
        <Requirements onContinue={() => setStep('form')} />
      ) : (
        <InterestForm
          onBack={() => setStep('requirements')}
          onDone={() => setStep('done')}
        />
      )}
    </div>
  );
}

function Hero({ step }: { step: 'requirements' | 'form' }) {
  return (
    <header className="mb-12">
      <p className="mb-5 text-[11px] font-semibold uppercase tracking-[0.3em] text-black/45 dark:text-white/45">
        {step === 'requirements' ? 'Step 1 of 2 · What it asks of you' : 'Step 2 of 2 · Your branch'}
      </p>
      <h1 className="text-[clamp(38px,6vw,64px)] font-black uppercase leading-[0.92] tracking-[-0.04em] text-[#1a1c1c] dark:text-white">
        <span className="block">Put your</span>
        <span className="block bg-gradient-to-r from-[#f8b537] via-[#d9965e] to-[#b98a8a] bg-clip-text text-transparent">
          branch forward.
        </span>
      </h1>
    </header>
  );
}

/**
 * What the pilot asks of a branch, to be read before the form.
 *
 * Deliberately not a set of checkboxes. Ticking five boxes turns reading into
 * a task to be got through, and a tick is worth nothing anyway: nobody is
 * held to it, and storing six booleans would have implied we were. What a
 * branch leader needs is to know what they are putting their branch up for
 * before they give us their name, which is a matter of reading, not of
 * agreeing. The version they were shown is recorded with the submission.
 */
function Requirements({ onContinue }: { onContinue: () => void }) {
  return (
    <div className="space-y-10">
      <section>
        <h2 className="text-xs font-extrabold uppercase tracking-[0.22em] text-black/45 dark:text-white/45">
          Before you fill in the form
        </h2>
        <p className="mt-3 text-[15px] leading-relaxed text-black/60 dark:text-white/55">
          Please read these carefully as they detail the expectations and commitments required for a successful onboarding of your branch onto iKharis, so you know what your
          branch would be taking on.
        </p>

        {/*
          No cards. Five bordered boxes stacked in a column read as five
          separate objects to be dealt with, when this is one list to be read
          straight through. A hairline between items does the same separating
          work without drawing a frame around every sentence.
        */}
        <ul className="mt-8 divide-y divide-black/[0.07] border-y border-black/[0.07] dark:divide-white/[0.07] dark:border-white/[0.07]">
          {PILOT_REQUIREMENTS.map((r, i) => (
            <li key={r.key} className="flex gap-5 py-6">
              {/*
                A number, not a checkbox. It reads as "one of five things to
                read" rather than as a control the reader has to operate.
              */}
              <span
                aria-hidden
                className="shrink-0 pt-[3px] font-mono text-[13px] font-bold tabular-nums text-[#5D3FD3] dark:text-[#a78bfa]"
              >
                {String(i + 1).padStart(2, '0')}
              </span>
              <span>
                <span className="block text-[15px] font-bold text-[#1a1c1c] dark:text-white">
                  {r.title}
                </span>
                <span className="mt-1.5 block text-[14px] leading-relaxed text-black/55 dark:text-white/50">
                  {r.detail}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <div>
        <div className="flex flex-wrap items-center gap-4">
          <button
            type="button"
            onClick={onContinue}
            className="inline-flex h-12 items-center gap-2 rounded-full bg-gradient-to-br from-[#451ebb] to-[#5d3fd3] px-7 text-xs font-extrabold uppercase tracking-[0.2em] text-white transition"
          >
            Continue
            <ArrowRight className="h-4 w-4" aria-hidden />
          </button>
          {/*
            A link rather than a button: on step one there is no earlier step
            to go back to, so back means leaving the flow for the site.
          */}
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-[0.2em] text-black/45 transition hover:text-[#5D3FD3] dark:text-white/45 dark:hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Back
          </Link>
        </div>
      </div>
    </div>
  );
}

// ── Step two ──────────────────────────────────────────────

/**
 * The form.
 *
 * Built out of the same pieces as the signup form, deliberately: `Label` with
 * a plain `*` in the text, `Input` at `h-11`, `CustomSelect` for anything with
 * a fixed set of answers. The earlier version of this page invented its own
 * input class, its own gold asterisk and a per-field info button, none of
 * which appear anywhere else in the product. A public form is the first thing
 * a branch leader ever sees of it, so it is the last place that should look
 * like a different application.
 *
 * What it asks for is deliberately short. There is no role field because the
 * form is addressed to the branch leader; no phone because we reply by email;
 * no head of admin or safeguarding lead because confirming those is a
 * commitment on the previous step rather than a question here; no start date
 * because we set the cadence; and no free text, because a paragraph on why a
 * branch should go first was never going to be what decided it.
 */
function InterestForm({
  onBack,
  onDone,
}: {
  onBack: () => void;
  onDone: () => void;
}) {
  const submit = useSubmitPilotInterest();

  const [v, setV] = useState({
    firstName: '',
    lastName: '',
    email: '',
    branchName: '',
    approxMembers: '',
  });
  const set = (k: keyof typeof v, value: string) => setV((prev) => ({ ...prev, [k]: value }));
  const [error, setError] = useState<string | null>(null);

  const num = (s: string) => (s.trim() === '' ? undefined : Number(s));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // The select cannot be left empty by the keyboard, but it starts empty,
    // so submitting without touching it has to be caught here: a native
    // `required` on a CustomSelect trigger would not fire.
    if (!v.branchName) {
      setError('Please choose your branch.');
      return;
    }

    try {
      await submit.mutateAsync({
        firstName: v.firstName.trim(),
        lastName: v.lastName.trim(),
        email: v.email.trim(),
        branchName: v.branchName,
        approxMembers: num(v.approxMembers),
      });
      onDone();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Something went wrong. Please try again.',
      );
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-10">
      <section className="space-y-5">
        <h2 className="text-xs font-extrabold uppercase tracking-[0.22em] text-black/45 dark:text-white/45">
          You
        </h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="firstName">First Name *</Label>
            <Input id="firstName" required className="h-11" value={v.firstName}
              onChange={(e) => set('firstName', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName">Last Name *</Label>
            <Input id="lastName" required className="h-11" value={v.lastName}
              onChange={(e) => set('lastName', e.target.value)} />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email *</Label>
          <Input id="email" type="email" required className="h-11"
            placeholder="you@example.co.uk" value={v.email}
            onChange={(e) => set('email', e.target.value)} />
        </div>
      </section>

      <section className="space-y-5">
        <h2 className="text-xs font-extrabold uppercase tracking-[0.22em] text-black/45 dark:text-white/45">
          Your branch
        </h2>

        <div className="space-y-2">
          <Label htmlFor="branchName">Branch *</Label>
          <CustomSelect
            id="branchName"
            value={v.branchName}
            onValueChange={(value) => set('branchName', value)}
            placeholder="Select a branch..."
            options={PILOT_BRANCHES.map((b) => ({ value: b, label: b }))}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="approxMembers">Roughly how many members</Label>
          <Input id="approxMembers" type="number" inputMode="numeric" min={0}
            className="h-11" value={v.approxMembers}
            onChange={(e) => set('approxMembers', e.target.value)} />
        </div>
      </section>

      {error && (
        <p role="alert" className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/[0.06] p-4 text-[14px] text-red-600 dark:text-red-400">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-4">
        <button type="submit" disabled={submit.isPending}
          className="inline-flex h-12 items-center gap-2 rounded-full bg-gradient-to-br from-[#451ebb] to-[#5d3fd3] px-7 text-xs font-extrabold uppercase tracking-[0.2em] text-white disabled:opacity-50">
          {submit.isPending ? 'Sending…' : 'Submit'}
          <ArrowRight className="h-4 w-4" aria-hidden />
        </button>
        <button type="button" onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-[0.2em] text-black/45 transition hover:text-[#5D3FD3] dark:text-white/45 dark:hover:text-white">
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Back
        </button>
      </div>
    </form>
  );
}

function Submitted() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-24 text-center">
      <span className="mx-auto mb-8 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[#451ebb] to-[#5d3fd3]">
        <Check className="h-8 w-8 text-white" aria-hidden />
      </span>
      <h1 className="text-[clamp(32px,5vw,52px)] font-black uppercase leading-[0.95] tracking-[-0.04em] text-[#1a1c1c] dark:text-white">
        Thank you.
      </h1>
      <p className="mx-auto mt-6 max-w-lg text-[17px] leading-[1.6] text-black/60 dark:text-white/55">
        Your branch is on the list. We are reading every response against what the pilot
        needs, and we will come back to you either way, including if we choose another
        branch to go first.
      </p>
      <Link href="/"
        className="mt-10 inline-flex h-12 items-center rounded-full border border-black/10 px-7 text-xs font-extrabold uppercase tracking-[0.2em] text-[#1a1c1c] dark:border-white/15 dark:text-white">
        Back to {BRAND_NAME}
      </Link>
    </div>
  );
}
