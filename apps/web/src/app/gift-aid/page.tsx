'use client';

import { useState } from 'react';
import { Check, HandCoins } from 'lucide-react';
import { Button, Card, CardContent } from '@kairos/ui';
import {
  GiftAidDeclarationForm,
  type GiftAidFormValues,
} from '@/components/gift-aid-declaration-form';
import { useGiftAidDeclarationText, useSubmitPublicGiftAid } from '@/hooks/use-gift-aid';

/**
 * The public Gift Aid declaration form.
 *
 * This is the pre-rollout surface: open to anyone, no account needed, because
 * the people it collects from do not have Kairos logins yet. A declaration
 * made here is in force immediately, exactly as a paper form handed in at a
 * service would be, and is matched to a Kairos member later by a Gift Aid
 * admin. That ordering is deliberate — a donor's declaration is not waiting
 * on our CRM to catch up.
 */
export default function PublicGiftAidPage() {
  const { data: wording, isLoading } = useGiftAidDeclarationText();
  const submit = useSubmitPublicGiftAid();
  const [done, setDone] = useState(false);

  async function handleSubmit(values: GiftAidFormValues) {
    const payload = {
      ...values,
      email: values.email!,
      confirmedDeclaration: true as const,
    };
    await submit.mutateAsync(payload);
    setDone(true);
  }

  if (done) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-md bg-[#5D3FD3]/10">
            <Check className="h-5 w-5 text-[#5D3FD3]" aria-hidden />
          </span>
          <h1 className="text-2xl font-bold tracking-tight">Thank you</h1>
        </div>
        <Card>
          <CardContent className="space-y-4 pt-6 text-sm leading-relaxed">
            <p>
              Your Gift Aid declaration has been recorded. It applies from today and keeps
              applying until you tell us otherwise, so there is nothing further to do.
            </p>
            <p>
              You can cancel it at any time by emailing the church office, or from your profile
              once you have a Kairos account. Cancelling it stops Gift Aid on gifts you make from
              the day you tell us, and does not affect anything already claimed.
            </p>
            <p className="text-muted-foreground">
              Please let us know if you change your name or home address, or if you stop paying
              enough UK tax to cover the Gift Aid claimed on your giving.
            </p>
          </CardContent>
        </Card>
        {/*
          kharis.org, not `/`. A donor who finishes this form has no Kairos
          account, so the Kairos landing page is a dead end for them.
        */}
        <a href="https://kharis.org">
          <Button variant="outline">Back to Kharis Church</Button>
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-md bg-[#5D3FD3]/10">
            <HandCoins className="h-5 w-5 text-[#5D3FD3]" aria-hidden />
          </span>
          <h1 className="text-2xl font-bold tracking-tight">Gift Aid declaration</h1>
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground">
          If you pay UK Income Tax or Capital Gains Tax, Gift Aid lets the church reclaim 25p for
          every £1 you give, at no extra cost to you. Making a declaration takes a minute and can
          cover your past four years&rsquo; and future giving until you cancel it.
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-3" aria-busy="true">
          <div className="h-10 animate-pulse rounded-md bg-muted" />
          <div className="h-10 animate-pulse rounded-md bg-muted" />
          <div className="h-32 animate-pulse rounded-md bg-muted" />
        </div>
      ) : (
        <GiftAidDeclarationForm
          wording={wording}
          onSubmit={handleSubmit}
          submitting={submit.isPending}
          requireEmail
          errorMessage={
            submit.error instanceof Error
              ? submit.error.message
              : submit.isError
                ? 'Something went wrong recording your declaration. Please try again.'
                : null
          }
        />
      )}
    </div>
  );
}
