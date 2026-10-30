import { z } from 'zod';
import {
  GIFT_AID_CANCELLATION_METHOD_VALUES,
  GIFT_AID_CHANNEL_VALUES,
  GIFT_AID_COVERAGE_VALUES,
  GIFT_AID_HOUSE_MAX,
  GIFT_AID_NAME_MAX,
  GIFT_AID_STATUS_VALUES,
  GIFT_AID_TITLE_MAX,
  isUkPostcode,
  requiresPostcode,
} from '@kairos/types';

// ── The declarant block ───────────────────────────────────
//
// Field widths come from HMRC's Charities Online schedule spreadsheet, not
// from a guess: title is a 4-character column and the name column is 35.
// Validating here means a declaration can never be captured in a shape that
// cannot be entered on a claim four years later.
//
// `superRefine` carries the one cross-field rule HMRC imposes: a UK donor
// must give a postcode, and an overseas donor must not (HMRC rejects Isle of
// Man and Channel Islands postcodes, so those count as overseas).

const declarantShape = {
  title: z.string().trim().max(GIFT_AID_TITLE_MAX).optional(),
  firstName: z.string().trim().min(1, 'First name is required').max(GIFT_AID_NAME_MAX),
  lastName: z.string().trim().min(1, 'Last name is required').max(GIFT_AID_NAME_MAX),
  addressLine1: z
    .string()
    .trim()
    .min(1, 'Your house name or number and street are required')
    .max(200),
  addressLine2: z.string().trim().max(200).optional(),
  city: z.string().trim().max(100).optional(),
  postcode: z.string().trim().max(10).optional(),
  countryCode: z.string().trim().length(2).toUpperCase().default('GB'),
  email: z.string().trim().email('Enter a valid email address').max(100).optional(),
  phone: z.string().trim().max(20).optional(),
};

const coverageShape = {
  coverage: z.enum(GIFT_AID_COVERAGE_VALUES as [string, ...string[]]).default('past_and_future'),
  singleGiftDescription: z.string().trim().max(200).optional(),
};

function enforceAddressRules(
  value: { countryCode: string; postcode?: string; city?: string },
  ctx: z.RefinementCtx,
): void {
  if (requiresPostcode(value.countryCode)) {
    if (!value.postcode) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['postcode'],
        message: 'A postcode is required for a UK address',
      });
      return;
    }
    if (!isUkPostcode(value.postcode)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['postcode'],
        message: 'Enter a valid UK postcode',
      });
    }
    return;
  }
  // Overseas: HMRC wants a full address instead of a postcode.
  if (value.postcode) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['postcode'],
      message: 'Leave the postcode blank for an address outside the UK',
    });
  }
  if (!value.city) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['city'],
      message: 'A town or city is required for an address outside the UK',
    });
  }
}

function enforceCoverageRules(
  value: { coverage: string; singleGiftDescription?: string },
  ctx: z.RefinementCtx,
): void {
  if (value.coverage === 'single' && !value.singleGiftDescription) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['singleGiftDescription'],
      message: 'Describe the gift this declaration covers',
    });
  }
}

/**
 * The public, unauthenticated form. Two things it deliberately does NOT
 * accept: a `channel` (it is always 'online') and a `declarationText` (the
 * server renders that from the one shared renderer, so a crafted request
 * cannot store wording the donor never saw).
 *
 * `confirmedDeclaration` is the positive opt-in HMRC requires: a tick box
 * counts as the declaration only if it is not pre-ticked, so a submission
 * without it is a validation failure rather than a declaration with a false
 * flag on it.
 */
export const publicDeclarationSchema = z
  .object({
    ...declarantShape,
    ...coverageShape,
    email: z.string().trim().email('Enter a valid email address').max(100),
    branchId: z.string().uuid().optional(),
    confirmedDeclaration: z.literal(true, {
      errorMap: () => ({ message: 'Tick the box to make your Gift Aid declaration' }),
    }),
  })
  .superRefine((value, ctx) => {
    enforceAddressRules(value, ctx);
    enforceCoverageRules(value, ctx);
  });

/** The signed-in member's own declaration, from their profile. */
export const myDeclarationSchema = z
  .object({
    ...declarantShape,
    ...coverageShape,
    confirmedDeclaration: z.literal(true, {
      errorMap: () => ({ message: 'Tick the box to make your Gift Aid declaration' }),
    }),
  })
  .superRefine((value, ctx) => {
    enforceAddressRules(value, ctx);
    enforceCoverageRules(value, ctx);
  });

/**
 * Admin capture of a declaration made somewhere else: a paper form handed in
 * at a service, an imported pre-Kairos register row, or (once there is a UI
 * for it) a verbal declaration.
 *
 * `declaredAt` is accepted because the date the donor declared is not the
 * date an admin keyed it in, and the former is what HMRC cares about.
 */
export const captureDeclarationSchema = z
  .object({
    ...declarantShape,
    ...coverageShape,
    memberId: z.string().uuid().optional(),
    branchId: z.string().uuid().optional(),
    channel: z.enum(['paper', 'verbal', 'imported']),
    declaredAt: z.coerce.date(),
    evidenceUrl: z.string().trim().url().optional(),
    writtenConfirmationSentAt: z.coerce.date().optional(),
  })
  .superRefine((value, ctx) => {
    enforceAddressRules(value, ctx);
    enforceCoverageRules(value, ctx);
    // A paper declaration's auditable original is the scan. Without it there
    // is nothing to produce on an HMRC audit, so it is not optional.
    if (value.channel === 'paper' && !value.evidenceUrl) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['evidenceUrl'],
        message: 'Attach a scan of the signed paper form',
      });
    }
    // A verbal declaration is not effective until the written record is sent
    // (HMRC 3.6.3), so recording one without that date would overstate it.
    if (value.channel === 'verbal' && !value.writtenConfirmationSentAt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['writtenConfirmationSentAt'],
        message: 'Record the date the written confirmation was sent to the donor',
      });
    }
  });

/** Withdrawal recorded by the donor themselves. Method is always 'online'. */
export const withdrawMineSchema = z.object({
  notes: z.string().trim().max(1000).optional(),
});

/** Withdrawal that reached us by phone, letter, email or in person. */
export const recordWithdrawalSchema = z.object({
  method: z.enum(GIFT_AID_CANCELLATION_METHOD_VALUES as [string, ...string[]]),
  /** Defaults to now. Never earlier than the declaration itself. */
  cancelledAt: z.coerce.date().optional(),
  notes: z.string().trim().max(1000).optional(),
});

/** Attach a pending-match declaration to the member it belongs to. */
export const matchDeclarationSchema = z.object({
  memberId: z.string().uuid(),
});

export const markInvalidSchema = z.object({
  reason: z.string().trim().min(1, 'Say why this declaration is not valid').max(1000),
});

export const listDeclarationsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(25),
  status: z.enum(GIFT_AID_STATUS_VALUES as [string, ...string[]]).optional(),
  channel: z.enum(GIFT_AID_CHANNEL_VALUES as [string, ...string[]]).optional(),
  branchId: z.string().uuid().optional(),
  search: z.string().trim().max(100).optional(),
  /**
   * The review queue. Unmatched is not a status — a declaration with no
   * `member_id` is in force all the same — so it filters on its own axis.
   */
  unmatched: z
    .union([z.literal('true'), z.literal('false'), z.boolean()])
    .transform((v) => v === true || v === 'true')
    .optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const registerExportQuerySchema = z.object({
  /** Only declarations covering donations on or after this date. */
  from: z.coerce.date().optional(),
  status: z.enum(GIFT_AID_STATUS_VALUES as [string, ...string[]]).default('active'),
  branchId: z.string().uuid().optional(),
});

export type PublicDeclarationInput = z.infer<typeof publicDeclarationSchema>;
export type MyDeclarationInput = z.infer<typeof myDeclarationSchema>;
export type CaptureDeclarationInput = z.infer<typeof captureDeclarationSchema>;
export type RecordWithdrawalInput = z.infer<typeof recordWithdrawalSchema>;
export type ListDeclarationsQuery = z.infer<typeof listDeclarationsQuerySchema>;
export type RegisterExportQuery = z.infer<typeof registerExportQuerySchema>;
export const GIFT_AID_HOUSE_COLUMN_MAX = GIFT_AID_HOUSE_MAX;
