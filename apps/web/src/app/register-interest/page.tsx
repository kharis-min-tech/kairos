'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Check, ShieldCheck, AlertCircle, Info } from 'lucide-react';
import {
  BRAND_NAME,
  PILOT_REQUIREMENTS,
  PILOT_SELECTION_NOTES,
  PILOT_ROLE_LABEL,
  PILOT_ROLE_VALUES,
  type PilotRequirement,
  type PilotRole,
} from '@kairos/types';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useSubmitPilotInterest } from '@/hooks/use-pilot-interest';

type AckKey = PilotRequirement['key'];

const BLANK_ACKS = Object.fromEntries(
  PILOT_REQUIREMENTS.map((r) => [r.key, false]),
) as Record<AckKey, boolean>;

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
  const [acks, setAcks] = useState<Record<AckKey, boolean>>(BLANK_ACKS);
  const allAcked = useMemo(() => PILOT_REQUIREMENTS.every((r) => acks[r.key]), [acks]);

  if (step === 'done') return <Submitted />;

  return (
    <div className="mx-auto max-w-3xl px-6 py-14 md:py-20">
      <Hero step={step} />
      {step === 'requirements' ? (
        <Requirements
          acks={acks}
          setAcks={setAcks}
          allAcked={allAcked}
          onContinue={() => setStep('form')}
        />
      ) : (
        <InterestForm
          acks={acks}
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

function Requirements({
  acks,
  setAcks,
  allAcked,
  onContinue,
}: {
  acks: Record<AckKey, boolean>;
  setAcks: (v: Record<AckKey, boolean>) => void;
  allAcked: boolean;
  onContinue: () => void;
}) {
  return (
    <div className="space-y-10">
      <section>
        <h2 className="text-xs font-extrabold uppercase tracking-[0.22em] text-black/45 dark:text-white/45">
          Before you volunteer
        </h2>
        <p className="mt-3 text-[15px] leading-relaxed text-black/60 dark:text-white/55">
          Tick each one you can genuinely commit to.
        </p>

        <ul className="mt-7 space-y-3">
          {PILOT_REQUIREMENTS.map((r) => {
            const on = acks[r.key];
            return (
              <li key={r.key}>
                <button
                  type="button"
                  aria-pressed={on}
                  onClick={() => setAcks({ ...acks, [r.key]: !on })}
                  className={`group flex w-full gap-4 rounded-2xl border p-5 text-left transition ${
                    on
                      ? 'border-[#5D3FD3]/40 bg-[#5D3FD3]/[0.06]'
                      : 'border-black/10 bg-black/[0.015] hover:border-black/20 dark:border-white/10 dark:bg-white/[0.02] dark:hover:border-white/20'
                  }`}
                >
                  <span
                    className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border transition ${
                      on
                        ? 'border-[#5D3FD3] bg-gradient-to-br from-[#451ebb] to-[#5d3fd3]'
                        : 'border-black/20 dark:border-white/25'
                    }`}
                  >
                    {on && <Check className="h-4 w-4 text-white" aria-hidden />}
                  </span>
                  <span>
                    <span className="block text-[15px] font-bold text-[#1a1c1c] dark:text-white">
                      {r.title}
                    </span>
                    <span className="mt-1.5 block text-[14px] leading-relaxed text-black/55 dark:text-white/50">
                      {r.detail}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="rounded-2xl border border-black/[0.08] bg-[#f9f9f9] p-6 dark:border-white/[0.08] dark:bg-white/[0.03]">
        <h2 className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.22em] text-black/45 dark:text-white/45">
          <ShieldCheck className="h-4 w-4" aria-hidden />
          What we are looking for
        </h2>
        <ul className="mt-4 space-y-2">
          {PILOT_SELECTION_NOTES.map((n) => (
            <li
              key={n}
              className="flex gap-3 text-[14px] leading-relaxed text-black/60 dark:text-white/55"
            >
              <span className="mt-[9px] h-1 w-1 shrink-0 rounded-full bg-[#f8b537]" aria-hidden />
              {n}
            </li>
          ))}
        </ul>
      </section>

      <div>
        <div className="flex flex-wrap items-center gap-4">
          <button
            type="button"
            disabled={!allAcked}
            onClick={onContinue}
            className="inline-flex h-12 items-center gap-2 rounded-full bg-gradient-to-br from-[#451ebb] to-[#5d3fd3] px-7 text-xs font-extrabold uppercase tracking-[0.2em] text-white transition disabled:cursor-not-allowed disabled:opacity-35"
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

        {/*
          Under the button rather than beside it: it explains why Continue is
          dim, and the gold asterisk is the same marker the form uses on a
          required field, so the symbol means one thing across both steps.
        */}
        {!allAcked && (
          <p className="mt-3 text-[12px] text-black/45 dark:text-white/40">
            <span aria-hidden className="mr-1 text-[#f8b537]">
              *
            </span>
            Tick all {PILOT_REQUIREMENTS.length} to continue.
          </p>
        )}
      </div>
    </div>
  );
}

// ── Step two ──────────────────────────────────────────────

const field =
  'h-12 w-full rounded-xl border border-black/10 bg-white px-4 text-[15px] text-[#1a1c1c] outline-none transition placeholder:text-black/30 focus:border-[#5D3FD3] dark:border-white/10 dark:bg-white/[0.04] dark:text-white dark:placeholder:text-white/25';
const label =
  'text-[11px] font-bold uppercase tracking-[0.16em] text-black/50 dark:text-white/45';

/**
 * The required marker.
 *
 * aria-hidden because the asterisk is for sighted readers only: the input
 * itself carries `required`, which is what a screen reader announces. Reading
 * out "star" on top of that is noise, and an asterisk with no explanation is
 * meaningless anyway -- hence the legend above the form.
 */
function Req() {
  return (
    <span aria-hidden className="ml-1 text-[#f8b537]">
      *
    </span>
  );
}

/**
 * One form field: its label, an explanation behind an info button, and the
 * input itself.
 *
 * The hint opens below the input rather than floating over it. A floating
 * tooltip needs hover to appear, and most of the people filling this in are
 * on a phone, where there is no hover -- and the page sits inside an
 * `overflow-hidden` container, so anything positioned past the edge of a
 * field would be clipped. Putting it after the input also means opening one
 * never shoves its own input out of line with the field beside it, which is
 * what happens if the hint pushes from above in a two-column row.
 */
function Field({
  htmlFor,
  text,
  hint,
  required = false,
  className,
  children,
}: {
  htmlFor: string;
  text: string;
  hint: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const hintId = `${htmlFor}-hint`;

  return (
    <div className={className}>
      <div className="mb-2 flex items-center gap-1.5">
        <label className={label} htmlFor={htmlFor}>
          {text}
          {required && <Req />}
        </label>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls={hintId}
          aria-label={`What to put in ${text}`}
          // -m-1.5 keeps the icon the same size on screen while giving the
          // tap target the padding a thumb needs.
          className={`-m-1.5 shrink-0 rounded-full p-1.5 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5D3FD3] ${
            open
              ? 'text-[#5D3FD3] dark:text-[#a78bfa]'
              : 'text-black/30 hover:text-[#5D3FD3] dark:text-white/30 dark:hover:text-[#a78bfa]'
          }`}
        >
          <Info className="h-4 w-4" aria-hidden />
        </button>
      </div>

      {children}

      {open && (
        <p
          id={hintId}
          className="mt-2 rounded-lg border border-[#5D3FD3]/25 bg-[#5D3FD3]/[0.05] px-3 py-2 text-[13px] leading-relaxed text-black/65 dark:text-white/60"
        >
          {hint}
        </p>
      )}
    </div>
  );
}

function InterestForm({
  acks,
  onBack,
  onDone,
}: {
  acks: Record<AckKey, boolean>;
  onBack: () => void;
  onDone: () => void;
}) {
  const submit = useSubmitPilotInterest();
  // The dropdown is a convenience, not a gate: the plan seeds a branch only
  // after one is chosen, so a branch that is not in this list yet is exactly
  // the kind of answer we still want.
  const branches = useQuery({
    queryKey: ['public-branches'],
    queryFn: async () => (await api.branches.listPublic()).data ?? [],
    staleTime: 5 * 60 * 1000,
  });

  const [v, setV] = useState({
    fullName: '',
    roleAtBranch: 'branch_pastor' as PilotRole,
    roleOther: '',
    email: '',
    phone: '',
    branchId: '',
    branchName: '',
    fellowshipCount: '',
    departmentCount: '',
    approxMembers: '',
    headOfAdminName: '',
    headOfAdminEmail: '',
    safeguardingLeadInPost: false,
    safeguardingLeadName: '',
    earliestStart: '',
    whyThisBranch: '',
    notes: '',
  });
  const set = (k: keyof typeof v, value: string | boolean) => setV({ ...v, [k]: value });
  const [error, setError] = useState<string | null>(null);

  const num = (s: string) => (s.trim() === '' ? undefined : Number(s));
  const blank = (s: string) => (s.trim() === '' ? undefined : s.trim());

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await submit.mutateAsync({
        fullName: v.fullName,
        roleAtBranch: v.roleAtBranch,
        roleOther: blank(v.roleOther),
        email: v.email,
        phone: blank(v.phone),
        branchId: blank(v.branchId),
        branchName: v.branchName,
        fellowshipCount: num(v.fellowshipCount),
        departmentCount: num(v.departmentCount),
        approxMembers: num(v.approxMembers),
        headOfAdminName: blank(v.headOfAdminName),
        headOfAdminEmail: blank(v.headOfAdminEmail),
        safeguardingLeadInPost: v.safeguardingLeadInPost,
        safeguardingLeadName: blank(v.safeguardingLeadName),
        earliestStart: blank(v.earliestStart),
        acknowledgements: acks,
        whyThisBranch: blank(v.whyThisBranch),
        notes: blank(v.notes),
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
      <p className="text-[13px] text-black/45 dark:text-white/40">
        Fields marked <span className="text-[#f8b537]">*</span> are required.
      </p>

      <section className="space-y-5">
        <h2 className="text-xs font-extrabold uppercase tracking-[0.22em] text-black/45 dark:text-white/45">
          You
        </h2>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            htmlFor="fullName"
            text="Your name"
            required
            hint="The name your branch knows you by."
          >
            <input id="fullName" required className={field} value={v.fullName}
              onChange={(e) => set('fullName', e.target.value)} />
          </Field>
          <Field
            htmlFor="roleAtBranch"
            text="Your role"
            required
            hint="Your position at the branch. Choose 'Another role at the branch' if you are filling this in on a leader's behalf."
          >
            <select id="roleAtBranch" className={field} value={v.roleAtBranch}
              onChange={(e) => set('roleAtBranch', e.target.value)}>
              {PILOT_ROLE_VALUES.map((r) => (
                <option key={r} value={r}>{PILOT_ROLE_LABEL[r]}</option>
              ))}
            </select>
          </Field>
          {v.roleAtBranch === 'other' && (
            <Field
              htmlFor="roleOther"
              text="What is your role?"
              required
              hint="Your position in your own words, for example head of admin or branch administrator."
              className="sm:col-span-2"
            >
              <input id="roleOther" required className={field} value={v.roleOther}
                onChange={(e) => set('roleOther', e.target.value)} />
            </Field>
          )}
          <Field
            htmlFor="email"
            text="Email"
            required
            hint="The address we will reply to. Please use one you check regularly."
          >
            <input id="email" type="email" required className={field} value={v.email}
              onChange={(e) => set('email', e.target.value)} />
          </Field>
          <Field
            htmlFor="phone"
            text="Phone (optional)"
            hint="A number we can call if we need a quick answer. Leave it blank if you would rather we only email."
          >
            <input id="phone" className={field} value={v.phone}
              onChange={(e) => set('phone', e.target.value)} />
          </Field>
        </div>
      </section>

      <section className="space-y-5">
        <h2 className="text-xs font-extrabold uppercase tracking-[0.22em] text-black/45 dark:text-white/45">
          Your branch
        </h2>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            htmlFor="branchName"
            text="Branch"
            required
            hint="The branch you are putting forward. Start typing and pick it from the list. If it is not there, type the full name anyway — branches are set up after one is chosen."
            className="sm:col-span-2"
          >
            <input id="branchName" required list="known-branches" className={field}
              placeholder="Kharis London Central"
              value={v.branchName}
              onChange={(e) => {
                const name = e.target.value;
                const hit = (branches.data ?? []).find((b) => b.branchName === name);
                setV({ ...v, branchName: name, branchId: hit?.id ?? '' });
              }} />
            <datalist id="known-branches">
              {(branches.data ?? []).map((b) => (
                <option key={b.id} value={b.branchName} />
              ))}
            </datalist>
          </Field>
          <Field
            htmlFor="fellowshipCount"
            text="Fellowships"
            required
            hint="How many fellowships your branch runs at the moment, such as men's, women's or youth. Your best count is fine. Enter 0 if you have none."
          >
            <input id="fellowshipCount" inputMode="numeric" required min={0} className={field}
              value={v.fellowshipCount} onChange={(e) => set('fellowshipCount', e.target.value)} />
          </Field>
          <Field
            htmlFor="departmentCount"
            text="Departments"
            required
            hint="How many departments your branch runs, such as choir, ushering, media or protocol. Your best count is fine. Enter 0 if you have none."
          >
            <input id="departmentCount" inputMode="numeric" required min={0} className={field}
              value={v.departmentCount} onChange={(e) => set('departmentCount', e.target.value)} />
          </Field>
          <Field
            htmlFor="approxMembers"
            text="Roughly how many members (optional)"
            hint="An approximate figure is fine. We are not choosing a branch on size; it only tells us what to expect in the first week."
            className="sm:col-span-2"
          >
            <input id="approxMembers" inputMode="numeric" className={field}
              value={v.approxMembers} onChange={(e) => set('approxMembers', e.target.value)} />
          </Field>
        </div>
      </section>

      <section className="space-y-5">
        <h2 className="text-xs font-extrabold uppercase tracking-[0.22em] text-black/45 dark:text-white/45">
          Who would run it
        </h2>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            htmlFor="headOfAdminName"
            text="Head of admin"
            hint="The person who would clear the daily sign-up queue and handle day-to-day admin. Leave it blank if you have not decided yet."
          >
            <input id="headOfAdminName" className={field} value={v.headOfAdminName}
              onChange={(e) => set('headOfAdminName', e.target.value)} />
          </Field>
          <Field
            htmlFor="headOfAdminEmail"
            text="Their email"
            hint="The address we would use to set up the head of admin's account before members start signing up."
          >
            <input id="headOfAdminEmail" type="email" className={field} value={v.headOfAdminEmail}
              onChange={(e) => set('headOfAdminEmail', e.target.value)} />
          </Field>
          <div className="sm:col-span-2">
            <button type="button" aria-pressed={v.safeguardingLeadInPost}
              onClick={() => set('safeguardingLeadInPost', !v.safeguardingLeadInPost)}
              className={`flex w-full items-center gap-3 rounded-xl border p-4 text-left transition ${
                v.safeguardingLeadInPost
                  ? 'border-[#5D3FD3]/40 bg-[#5D3FD3]/[0.06]'
                  : 'border-black/10 dark:border-white/10'
              }`}>
              <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                v.safeguardingLeadInPost
                  ? 'border-[#5D3FD3] bg-gradient-to-br from-[#451ebb] to-[#5d3fd3]'
                  : 'border-black/20 dark:border-white/25'
              }`}>
                {v.safeguardingLeadInPost && <Check className="h-3.5 w-3.5 text-white" aria-hidden />}
              </span>
              <span className="text-[14px] text-[#1a1c1c] dark:text-white">
                We already have a safeguarding lead in post
              </span>
            </button>
          </div>
          {v.safeguardingLeadInPost && (
            <Field
              htmlFor="safeguardingLeadName"
              text="Their name"
              required
              hint="The person who already holds the safeguarding role at your branch."
              className="sm:col-span-2"
            >
              <input id="safeguardingLeadName" required className={field}
                value={v.safeguardingLeadName}
                onChange={(e) => set('safeguardingLeadName', e.target.value)} />
            </Field>
          )}
          <Field
            htmlFor="earliestStart"
            text="Earliest you could start training"
            hint="The earliest date your branch could begin the first round of training. An estimate is fine — it is not a commitment."
            className="sm:col-span-2"
          >
            <input id="earliestStart" type="date" className={field} value={v.earliestStart}
              onChange={(e) => set('earliestStart', e.target.value)} />
          </Field>
        </div>
      </section>

      <section className="space-y-5">
        <h2 className="text-xs font-extrabold uppercase tracking-[0.22em] text-black/45 dark:text-white/45">
          In your own words
        </h2>
        <Field
          htmlFor="whyThisBranch"
          text="Why your branch should go first"
          hint="Anything that makes your branch a good first choice: how ready your leaders are, how well attendance is already kept, or why the timing suits you."
        >
          <textarea id="whyThisBranch" rows={4}
            className={`${field} h-auto py-3 leading-relaxed`}
            value={v.whyThisBranch} onChange={(e) => set('whyThisBranch', e.target.value)} />
        </Field>
        <Field
          htmlFor="notes"
          text="Anything we should know"
          hint="Anything that might affect the timing or the setup, such as a building move, a busy season or a leader on leave. Leave it blank if there is nothing."
        >
          <textarea id="notes" rows={3}
            className={`${field} h-auto py-3 leading-relaxed`}
            value={v.notes} onChange={(e) => set('notes', e.target.value)} />
        </Field>
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
        needs, and we will come back to you either way — including if we choose another
        branch to go first.
      </p>
      <Link href="/"
        className="mt-10 inline-flex h-12 items-center rounded-full border border-black/10 px-7 text-xs font-extrabold uppercase tracking-[0.2em] text-[#1a1c1c] dark:border-white/15 dark:text-white">
        Back to {BRAND_NAME}
      </Link>
    </div>
  );
}
