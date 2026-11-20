'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Check, ShieldCheck, AlertCircle } from 'lucide-react';
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
      <p className="mt-7 max-w-xl text-[17px] leading-[1.6] text-black/60 dark:text-white/55">
        One branch runs fully on {BRAND_NAME} before the end of 2026, with every feature
        switched on. The rest follow through 2027. Going first means shaping it for
        everyone else — and doing the work while it is still rough.
      </p>
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
          These are not terms and conditions. They are the things that have sunk pilots
          elsewhere, and we would rather you say no now than discover them in week three.
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
        {!allAcked && (
          <p className="text-[13px] text-black/45 dark:text-white/40">
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
  'mb-2 block text-[11px] font-bold uppercase tracking-[0.16em] text-black/50 dark:text-white/45';

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
      <section className="space-y-5">
        <h2 className="text-xs font-extrabold uppercase tracking-[0.22em] text-black/45 dark:text-white/45">
          You
        </h2>
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className={label} htmlFor="fullName">Your name</label>
            <input id="fullName" required className={field} value={v.fullName}
              onChange={(e) => set('fullName', e.target.value)} />
          </div>
          <div>
            <label className={label} htmlFor="roleAtBranch">Your role</label>
            <select id="roleAtBranch" className={field} value={v.roleAtBranch}
              onChange={(e) => set('roleAtBranch', e.target.value)}>
              {PILOT_ROLE_VALUES.map((r) => (
                <option key={r} value={r}>{PILOT_ROLE_LABEL[r]}</option>
              ))}
            </select>
          </div>
          {v.roleAtBranch === 'other' && (
            <div className="sm:col-span-2">
              <label className={label} htmlFor="roleOther">What is your role?</label>
              <input id="roleOther" required className={field} value={v.roleOther}
                onChange={(e) => set('roleOther', e.target.value)} />
            </div>
          )}
          <div>
            <label className={label} htmlFor="email">Email</label>
            <input id="email" type="email" required className={field} value={v.email}
              onChange={(e) => set('email', e.target.value)} />
          </div>
          <div>
            <label className={label} htmlFor="phone">Phone (optional)</label>
            <input id="phone" className={field} value={v.phone}
              onChange={(e) => set('phone', e.target.value)} />
          </div>
        </div>
      </section>

      <section className="space-y-5">
        <h2 className="text-xs font-extrabold uppercase tracking-[0.22em] text-black/45 dark:text-white/45">
          Your branch
        </h2>
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={label} htmlFor="branchName">Branch</label>
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
            <p className="mt-2 text-[13px] text-black/45 dark:text-white/40">
              Not in the list? Type it anyway — branches are set up after one is chosen.
            </p>
          </div>
          <div>
            <label className={label} htmlFor="fellowshipCount">Fellowships</label>
            <input id="fellowshipCount" inputMode="numeric" className={field}
              value={v.fellowshipCount} onChange={(e) => set('fellowshipCount', e.target.value)} />
          </div>
          <div>
            <label className={label} htmlFor="departmentCount">Departments</label>
            <input id="departmentCount" inputMode="numeric" className={field}
              value={v.departmentCount} onChange={(e) => set('departmentCount', e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <label className={label} htmlFor="approxMembers">Roughly how many members</label>
            <input id="approxMembers" inputMode="numeric" className={field}
              value={v.approxMembers} onChange={(e) => set('approxMembers', e.target.value)} />
            <p className="mt-2 text-[13px] text-black/45 dark:text-white/40">
              We are not choosing on size. It tells us what to expect in week one.
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-5">
        <h2 className="text-xs font-extrabold uppercase tracking-[0.22em] text-black/45 dark:text-white/45">
          Who would run it
        </h2>
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className={label} htmlFor="headOfAdminName">Head of admin</label>
            <input id="headOfAdminName" className={field} value={v.headOfAdminName}
              onChange={(e) => set('headOfAdminName', e.target.value)} />
          </div>
          <div>
            <label className={label} htmlFor="headOfAdminEmail">Their email</label>
            <input id="headOfAdminEmail" type="email" className={field} value={v.headOfAdminEmail}
              onChange={(e) => set('headOfAdminEmail', e.target.value)} />
          </div>
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
            <div className="sm:col-span-2">
              <label className={label} htmlFor="safeguardingLeadName">Their name</label>
              <input id="safeguardingLeadName" required className={field}
                value={v.safeguardingLeadName}
                onChange={(e) => set('safeguardingLeadName', e.target.value)} />
            </div>
          )}
          <div className="sm:col-span-2">
            <label className={label} htmlFor="earliestStart">Earliest you could start training</label>
            <input id="earliestStart" type="date" className={field} value={v.earliestStart}
              onChange={(e) => set('earliestStart', e.target.value)} />
          </div>
        </div>
      </section>

      <section className="space-y-5">
        <h2 className="text-xs font-extrabold uppercase tracking-[0.22em] text-black/45 dark:text-white/45">
          In your own words
        </h2>
        <div>
          <label className={label} htmlFor="whyThisBranch">Why your branch should go first</label>
          <textarea id="whyThisBranch" rows={4}
            className={`${field} h-auto py-3 leading-relaxed`}
            value={v.whyThisBranch} onChange={(e) => set('whyThisBranch', e.target.value)} />
        </div>
        <div>
          <label className={label} htmlFor="notes">Anything we should know</label>
          <textarea id="notes" rows={3}
            className={`${field} h-auto py-3 leading-relaxed`}
            value={v.notes} onChange={(e) => set('notes', e.target.value)} />
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
          className="text-xs font-extrabold uppercase tracking-[0.2em] text-black/45 hover:text-[#5D3FD3] dark:text-white/45">
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
