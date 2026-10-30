'use client';

import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Card, CardContent, Checkbox, CustomSelect, Input, Label } from '@kairos/ui';
import {
  GIFT_AID_COVERAGE_LABEL,
  GIFT_AID_NAME_MAX,
  GIFT_AID_TITLE_MAX,
  type GiftAidCoverage,
  type GiftAidDeclarationTextResponse,
  isUkPostcode,
} from '@kairos/types';

// Mirrors apps/api/src/gift-aid/schemas.ts. The widths are HMRC's claim
// columns, not arbitrary limits: title is a 4-character column on the
// Charities Online schedule and the name column is 35.
//
// Email is required on the public form, where it is the only handle an admin
// has for matching the declaration to a member later, and optional on the
// profile form, where the member is already known.
const makeSchema = (requireEmail: boolean) => z
  .object({
    title: z.string().trim().max(GIFT_AID_TITLE_MAX, 'Use a short title, like Mr or Dr').optional(),
    firstName: z.string().trim().min(1, 'Enter your first name').max(GIFT_AID_NAME_MAX),
    lastName: z.string().trim().min(1, 'Enter your last name').max(GIFT_AID_NAME_MAX),
    addressLine1: z.string().trim().min(1, 'Enter your house name or number and street').max(200),
    addressLine2: z.string().trim().max(200).optional(),
    city: z.string().trim().max(100).optional(),
    // No max length here on purpose. A length message for a postcode reads as
    // nonsense to a donor; the UK format check below is the one that should
    // speak, and it implies 8 characters or fewer. An overseas postcode has
    // to be blank, so nothing longer can reach the column.
    postcode: z.string().trim().optional(),
    countryCode: z.string().trim().length(2).default('GB'),
    // `.or(z.literal(''))` because an untouched input registers as '', which
    // `.email()` rejects. Without it, a donor who leaves the optional email
    // blank is told their email address is invalid. `stripBlanks` on submit
    // turns the '' back into undefined so the API never sees it.
    email: z
      .string()
      .trim()
      .email('Enter a valid email address')
      .max(100)
      .optional()
      .or(z.literal('')),
    phone: z.string().trim().max(20).optional(),
    coverage: z.enum(['past_and_future', 'future']),
    confirmedDeclaration: z.literal(true, {
      errorMap: () => ({ message: 'Tick the box to make your declaration' }),
    }),
  })
  .superRefine((value, ctx) => {
    const uk = value.countryCode.toUpperCase() === 'GB';
    if (uk && !value.postcode) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['postcode'],
        message: 'HM Revenue and Customs needs your postcode to identify you as a UK taxpayer',
      });
    } else if (uk && value.postcode && !isUkPostcode(value.postcode)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['postcode'],
        message: 'Enter a valid UK postcode',
      });
    }
    if (!uk && value.postcode) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['postcode'],
        message: 'Leave the postcode blank for an address outside the UK',
      });
    }
    if (!uk && !value.city) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['city'],
        message: 'Enter the town or city',
      });
    }
    if (requireEmail && !value.email) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['email'],
        message: 'Enter your email address so we can match your declaration to your giving',
      });
    }
  });

export type GiftAidFormValues = z.infer<ReturnType<typeof makeSchema>>;

/**
 * Untouched inputs register as '', which the API's own schemas reject on any
 * field with a format (`email`) and would otherwise store as an empty string
 * rather than a null. Drop them on the way out.
 */
function stripBlanks(values: GiftAidFormValues): GiftAidFormValues {
  const out = { ...values } as Record<string, unknown>;
  for (const [key, value] of Object.entries(out)) {
    if (typeof value === 'string' && value.trim() === '') delete out[key];
  }
  return out as GiftAidFormValues;
}

export interface GiftAidDeclarationFormProps {
  /** Served by the API from the one shared renderer, never written here. */
  wording: GiftAidDeclarationTextResponse | undefined;
  onSubmit: (values: GiftAidFormValues) => void | Promise<void>;
  submitting?: boolean;
  /** Error from the mutation, surfaced verbatim. */
  errorMessage?: string | null;
  /** Prefill from the signed-in member's profile, where there is one. */
  defaults?: Partial<GiftAidFormValues>;
  /** Email is required on the public form, where it is the match handle. */
  requireEmail?: boolean;
  submitLabel?: string;
}

/**
 * The declaration form, shared by the public pre-rollout page and the
 * member's own profile. One component, because a donor who fills in the
 * public form and a donor who declares from their profile must be agreeing
 * to exactly the same thing.
 *
 * Two things this deliberately does not do:
 *
 *   - It does not render the declaration wording itself. The text comes from
 *     the API, which renders it with the same function that stores it on the
 *     row, so what is on screen is provably what gets recorded.
 *   - It does not pre-tick the confirmation. HMRC accepts a tick box as a
 *     declaration only where the tick is a positive act by the donor, so the
 *     box starts empty and the form will not submit without it.
 */
export function GiftAidDeclarationForm({
  wording,
  onSubmit,
  submitting = false,
  errorMessage,
  defaults,
  requireEmail = false,
  submitLabel = 'Make my Gift Aid declaration',
}: GiftAidDeclarationFormProps) {
  const schema = useMemo(() => makeSchema(requireEmail), [requireEmail]);
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<GiftAidFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      countryCode: 'GB',
      coverage: 'past_and_future',
      ...defaults,
    } as GiftAidFormValues,
  });

  const coverage = watch('coverage');
  const countryCode = watch('countryCode');
  const confirmed = watch('confirmedDeclaration');
  const isUk = (countryCode ?? 'GB').toUpperCase() === 'GB';
  const declarationText = wording?.texts[coverage as 'past_and_future' | 'future'] ?? '';

  return (
    <form onSubmit={handleSubmit((values) => onSubmit(stripBlanks(values)))} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-[6rem_1fr_1fr]">
        <div className="space-y-1.5">
          <Label htmlFor="ga-title">Title</Label>
          <Input id="ga-title" placeholder="Mr" {...register('title')} />
          {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ga-first">First name</Label>
          <Input id="ga-first" autoComplete="given-name" {...register('firstName')} />
          {errors.firstName && (
            <p className="text-xs text-destructive">{errors.firstName.message}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ga-last">Last name</Label>
          <Input id="ga-last" autoComplete="family-name" {...register('lastName')} />
          {errors.lastName && <p className="text-xs text-destructive">{errors.lastName.message}</p>}
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Please give your full name as HM Revenue and Customs would know it, not a shortened
        version. Initials are not enough for a valid declaration.
      </p>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="ga-address1">House name or number and street</Label>
          <Input
            id="ga-address1"
            autoComplete="address-line1"
            placeholder="12 High Street"
            {...register('addressLine1')}
          />
          {errors.addressLine1 && (
            <p className="text-xs text-destructive">{errors.addressLine1.message}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ga-address2">
            Address line 2 <span className="text-muted-foreground">(optional)</span>
          </Label>
          <Input id="ga-address2" autoComplete="address-line2" {...register('addressLine2')} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="ga-city">Town or city</Label>
            <Input id="ga-city" autoComplete="address-level2" {...register('city')} />
            {errors.city && <p className="text-xs text-destructive">{errors.city.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ga-postcode">{isUk ? 'Postcode' : 'Postcode (not needed)'}</Label>
            <Input
              id="ga-postcode"
              autoComplete="postal-code"
              disabled={!isUk}
              placeholder={isUk ? 'SE1 2AB' : ''}
              {...register('postcode')}
            />
            {errors.postcode && (
              <p className="text-xs text-destructive">{errors.postcode.message}</p>
            )}
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="ga-country">Country</Label>
            <CustomSelect
              id="ga-country"
              value={countryCode ?? 'GB'}
              onValueChange={(v) => {
                setValue('countryCode', v, { shouldValidate: true });
                if (v !== 'GB') setValue('postcode', '', { shouldValidate: true });
              }}
              options={[
                { value: 'GB', label: 'United Kingdom' },
                { value: 'IE', label: 'Ireland' },
                { value: 'US', label: 'United States' },
                { value: 'GH', label: 'Ghana' },
                { value: 'SL', label: 'Sierra Leone' },
                { value: 'NG', label: 'Nigeria' },
                { value: 'ZZ', label: 'Somewhere else' },
              ]}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ga-email">
              Email {requireEmail ? '' : <span className="text-muted-foreground">(optional)</span>}
            </Label>
            <Input id="ga-email" type="email" autoComplete="email" {...register('email')} />
            {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
          </div>
        </div>
      </div>

      {!isUk && (
        <div className="rounded-lg border border-[#f8b537]/40 bg-[#f8b537]/10 px-4 py-3 text-sm">
          Gift Aid can only be reclaimed where you pay UK Income Tax or Capital Gains Tax. If you
          do not, please do not complete this form.
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="ga-coverage">Which gifts should this cover?</Label>
        <CustomSelect
          id="ga-coverage"
          value={coverage}
          onValueChange={(v) => setValue('coverage', v as 'past_and_future' | 'future')}
          options={(['past_and_future', 'future'] as GiftAidCoverage[]).map((c) => ({
            value: c,
            label: GIFT_AID_COVERAGE_LABEL[c],
          }))}
        />
        <p className="text-xs text-muted-foreground">
          HM Revenue and Customs lets a charity go back four years, so covering past gifts usually
          recovers more. Choose the second option if you would rather it applied only from today.
        </p>
      </div>

      <Card className="border-[#5D3FD3]/30 bg-[#5D3FD3]/[0.04]">
        <CardContent className="space-y-4 pt-6">
          <div className="space-y-3 text-sm leading-relaxed">
            {declarationText
              .split('\n\n')
              .map((para, i) => <p key={i}>{para}</p>)}
          </div>

          {/*
            Not a <label> wrapping the input: a click on the box inside a
            wrapping label is re-dispatched by the label, which toggles the
            value twice and leaves it where it started. htmlFor keeps the text
            clickable without that.
          */}
          <div className="flex items-start gap-3 rounded-lg border border-[#5D3FD3]/30 bg-white/60 p-3 dark:bg-black/20">
            <Checkbox
              id="ga-confirm"
              checked={confirmed === true}
              onChange={(e) =>
                // The box starts empty and only a tick submits: HMRC accepts a
                // tick box as the declaration only where ticking it is the
                // donor's own positive act.
                setValue('confirmedDeclaration', e.target.checked as true, {
                  shouldValidate: true,
                })
              }
            />
            <Label htmlFor="ga-confirm" className="cursor-pointer text-sm font-medium">
              Yes, I want to Gift Aid my gifts to {wording?.charityName ?? 'the church'}, and I
              confirm the statement above applies to me.
            </Label>
          </div>
          {errors.confirmedDeclaration && (
            <p className="text-xs text-destructive">{errors.confirmedDeclaration.message}</p>
          )}
        </CardContent>
      </Card>

      {wording?.notes && (
        <details className="rounded-lg border bg-muted/30 px-4 py-3">
          <summary className="cursor-pointer text-sm font-medium">
            What you should know before you declare
          </summary>
          <div className="mt-3 space-y-2 text-xs leading-relaxed text-muted-foreground">
            {wording.notes.split('\n\n').map((para, i) => (
              <p key={i}>{para}</p>
            ))}
          </div>
        </details>
      )}

      {errorMessage && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {errorMessage}
        </div>
      )}

      <Button
        type="submit"
        disabled={submitting}
        className="w-full bg-gradient-to-r from-[#451ebb] to-[#5d3fd3] text-white hover:opacity-95 sm:w-auto"
      >
        {submitting ? 'Recording your declaration…' : submitLabel}
      </Button>
    </form>
  );
}
