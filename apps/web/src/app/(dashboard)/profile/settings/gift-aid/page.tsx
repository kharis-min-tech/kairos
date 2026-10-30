'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Check, HandCoins, History, Undo2 } from 'lucide-react';
import { Button, Card, CardContent, CardHeader, CardTitle, Textarea } from '@kairos/ui';
import {
  GIFT_AID_COVERAGE_LABEL,
  GIFT_AID_STATUS_LABEL,
  type GiftAidCoverage,
  type GiftAidStatus,
} from '@kairos/types';
import {
  GiftAidDeclarationForm,
  type GiftAidFormValues,
} from '@/components/gift-aid-declaration-form';
import {
  useDeclareGiftAid,
  useGiftAidDeclarationText,
  useMyGiftAid,
  useWithdrawGiftAid,
} from '@/hooks/use-gift-aid';
import { useAuthStore } from '@/lib/auth-store';

function formatDate(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/**
 * The member's own Gift Aid surface, sitting beside the policy acceptances in
 * profile settings — which is where people look for "what have I agreed to".
 *
 * It is NOT a consent toggle, and the copy is careful not to read like one. A
 * withdrawal is prospective: it stops Gift Aid on future gifts and leaves
 * everything already claimed in place, and the declaration itself is kept
 * either way because HMRC can ask to see it years later.
 */
export default function GiftAidSettingsPage() {
  const { data, isLoading, isError, error } = useMyGiftAid();
  const { data: wording } = useGiftAidDeclarationText();
  // Prefill only. The declared name and address are stored on the declaration
  // itself, so a later profile edit never rewrites what the donor declared.
  const profile = useAuthStore((s) => s.user);
  const declare = useDeclareGiftAid();
  const withdraw = useWithdrawGiftAid();

  const [showForm, setShowForm] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawNotes, setWithdrawNotes] = useState('');

  const active = data?.active ?? null;

  async function handleDeclare(values: GiftAidFormValues) {
    await declare.mutateAsync({ ...values, confirmedDeclaration: true as const });
    setShowForm(false);
  }

  async function handleWithdraw() {
    await withdraw.mutateAsync(withdrawNotes ? { notes: withdrawNotes } : undefined);
    setWithdrawing(false);
    setWithdrawNotes('');
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 pb-2">
        <Link href="/profile/settings">
          <Button variant="ghost" size="sm" className="gap-1">
            <ArrowLeft className="h-4 w-4" /> Settings
          </Button>
        </Link>
      </div>

      <div className="pb-4">
        <h1 className="text-2xl font-bold tracking-tight">Gift Aid</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          If you pay UK tax, the church can reclaim 25p for every 1 pound you give.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <HandCoins className="h-4 w-4 text-[#5D3FD3]" aria-hidden /> Your declaration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading && (
            <div className="py-8 text-center text-sm text-muted-foreground">Loading…</div>
          )}

          {isError && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              Couldn&apos;t load your Gift Aid declaration:{' '}
              {error instanceof Error ? error.message : 'Unknown error'}
            </div>
          )}

          {!isLoading && !isError && active && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-4 rounded-lg bg-[#5D3FD3]/[0.04] p-4">
                <div className="space-y-1">
                  <p className="flex items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-400">
                    <Check className="h-4 w-4" aria-hidden /> In place since{' '}
                    {formatDate(active.declaredAt)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {GIFT_AID_COVERAGE_LABEL[active.coverage as GiftAidCoverage]}
                    {active.coversFrom ? `, back to ${formatDate(active.coversFrom)}` : ''}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Declared as {[active.title, active.firstName, active.lastName]
                      .filter(Boolean)
                      .join(' ')}
                    , {[active.addressLine1, active.city, active.postcode]
                      .filter(Boolean)
                      .join(', ')}
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  <Button variant="outline" size="sm" onClick={() => setShowForm((v) => !v)}>
                    Update my details
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1 text-destructive hover:text-destructive"
                    onClick={() => setWithdrawing((v) => !v)}
                  >
                    <Undo2 className="h-4 w-4" aria-hidden /> Withdraw
                  </Button>
                </div>
              </div>

              {withdrawing && (
                <div className="space-y-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
                  <p className="text-sm font-medium">Withdraw your Gift Aid declaration?</p>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    Gift Aid will stop on gifts you make from today. Anything already claimed on
                    your earlier giving is unaffected, and we keep a record of the declaration and
                    of this withdrawal because HM Revenue and Customs requires it. You can make a
                    new declaration whenever you like.
                  </p>
                  <Textarea
                    value={withdrawNotes}
                    onChange={(e) => setWithdrawNotes(e.target.value)}
                    placeholder="Anything you'd like us to note (optional)"
                    rows={2}
                  />
                  {withdraw.isError && (
                    <p className="text-xs text-destructive">
                      {withdraw.error instanceof Error
                        ? withdraw.error.message
                        : 'Could not withdraw the declaration.'}
                    </p>
                  )}
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={handleWithdraw}
                      disabled={withdraw.isPending}
                    >
                      {withdraw.isPending ? 'Withdrawing…' : 'Yes, withdraw it'}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setWithdrawing(false)}>
                      Keep it
                    </Button>
                  </div>
                </div>
              )}

              {showForm && (
                <div className="space-y-3 rounded-lg border p-4">
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    A declaration cannot be edited in place. Saving this withdraws the one above
                    and records a new declaration from today, which is how HM Revenue and Customs
                    requires a change to be made.
                  </p>
                  <GiftAidDeclarationForm
                    wording={wording}
                    onSubmit={handleDeclare}
                    submitting={declare.isPending}
                    submitLabel="Replace my declaration"
                    defaults={{
                      title: active.title ?? undefined,
                      firstName: active.firstName,
                      lastName: active.lastName,
                      addressLine1: active.addressLine1,
                      addressLine2: active.addressLine2 ?? undefined,
                      city: active.city ?? undefined,
                      postcode: active.postcode ?? undefined,
                      countryCode: active.countryCode,
                      email: active.email ?? undefined,
                      phone: active.phone ?? undefined,
                    }}
                    errorMessage={
                      declare.error instanceof Error ? declare.error.message : null
                    }
                  />
                </div>
              )}
            </div>
          )}

          {!isLoading && !isError && !active && !showForm && (
            <div className="space-y-4">
              <p className="text-sm leading-relaxed text-muted-foreground">
                You have no Gift Aid declaration in place. Making one takes a minute, costs you
                nothing, and lets the church reclaim 25p for every 1 pound you give. It covers your
                future giving until you withdraw it, and can reach back over the past four years.
              </p>
              <Button
                onClick={() => setShowForm(true)}
                className="bg-gradient-to-r from-[#451ebb] to-[#5d3fd3] text-white hover:opacity-95"
              >
                Make a Gift Aid declaration
              </Button>
            </div>
          )}

          {!isLoading && !isError && !active && showForm && (
            <GiftAidDeclarationForm
              wording={wording}
              onSubmit={handleDeclare}
              submitting={declare.isPending}
              defaults={{
                firstName: profile?.firstName,
                lastName: profile?.lastName,
                addressLine1: profile?.address ?? undefined,
                city: profile?.city ?? undefined,
                postcode: profile?.postalCode ?? undefined,
                email: profile?.email,
                phone: profile?.phone ?? undefined,
              }}
              errorMessage={declare.error instanceof Error ? declare.error.message : null}
            />
          )}
        </CardContent>
      </Card>

      {!!data?.history.length && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <History className="h-4 w-4 text-muted-foreground" aria-hidden /> Earlier
              declarations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.history.map((d) => (
              <div key={d.id} className="space-y-0.5 text-sm">
                <p className="font-medium">
                  {GIFT_AID_STATUS_LABEL[d.status as GiftAidStatus]}
                  {d.cancelledAt ? ` on ${formatDate(d.cancelledAt)}` : ''}
                </p>
                <p className="text-xs text-muted-foreground">
                  Declared {formatDate(d.declaredAt)}
                  {d.cancellationNotes ? `. ${d.cancellationNotes}` : ''}
                </p>
              </div>
            ))}
            <p className="pt-2 text-xs text-muted-foreground">
              These are kept for as long as HM Revenue and Customs requires, which is why they are
              not removed if you ask us to delete your profile.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
