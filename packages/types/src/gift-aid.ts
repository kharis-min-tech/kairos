// ── Gift Aid ───────────────────────────────────────────────
//
// A Gift Aid declaration is a TAX DOCUMENT, not a consent record. Two
// consequences shape everything in this file:
//
//   1. HMRC requires an auditable record of the declaration the donor
//      actually made. Chapter 3.7.2 of HMRC's detailed guidance is explicit
//      that "transcribing of declarations ... into a database will not
//      satisfy the requirements". So the exact wording the donor agreed to
//      is stored ON the declaration row, and `renderDeclarationText` below
//      is the ONE place that text is produced — shared by the web renderer
//      and the API validator, the same way `form-engine.ts` is shared.
//
//   2. The donor's name and home address must be the name and address they
//      DECLARED. They cannot be read through to the member row, because
//      `deleteMyAccount` scrubs those fields on a GDPR erasure request and
//      that would destroy the evidence for claims already made.
//
// Scope: a declaration names the CHARITY, and one charity contains every
// branch, so this is church-scoped (RoleScope kind 'church'), not
// branch-scoped. See the GiftAidAdmin role in rbac.ts.

// ── The charity ────────────────────────────────────────────

/** Named in the declaration, as HMRC requires. */
export const GIFT_AID_CHARITY_NAME = 'Kharis Ministries';

/** Registered charity number, shown beneath the declaration. */
export const GIFT_AID_CHARITY_NUMBER = '1139291';

/**
 * The charity is a company limited by guarantee (Companies House 07308725),
 * so both the claim deadline and the record-retention clock run from the end
 * of the ACCOUNTING period, not the tax year.
 *
 * The accounting period runs June to May, so it ends on 31 MAY.
 *
 * NOTE for whoever reads this next: Companies House lists the charity's next
 * accounts as made up to 30 June, which disagrees. The June-to-May period is
 * what Kharis finance stated, so that is what is encoded here; the conflict
 * is flagged for finance to confirm against the HMRC registration. If it
 * turns out to be 30 June after all, this is the only place to change —
 * every deadline and retention date is derived from these two constants.
 *
 * Month/day only — the year is whichever period a given date falls in.
 */
export const GIFT_AID_PERIOD_END_MONTH = 5;
export const GIFT_AID_PERIOD_END_DAY = 31;

/** Years after the accounting period end in which a claim may still be made. */
export const GIFT_AID_CLAIM_WINDOW_YEARS = 4;

/**
 * Years after the end of the accounting period for which records must be
 * kept. Six is the figure in the 2016 Regulations and in current HMRC
 * guidance; the two word the start of the clock differently, so we take the
 * longer reading and run it from the LAST donation rather than from the date
 * the declaration was given.
 */
export const GIFT_AID_RETENTION_YEARS = 6;

/**
 * How far back a new declaration may reach. HMRC permits backdating, and the
 * claim window makes four years the useful limit.
 */
export const GIFT_AID_BACKDATE_YEARS = 4;

// ── Wording version ────────────────────────────────────────

/**
 * Bumped whenever `renderDeclarationText` changes. Unlike a consent version,
 * a bump NEVER invalidates an existing declaration and never re-prompts a
 * donor: an enduring declaration stays valid until the donor cancels it. The
 * version exists so that, years later, we can reproduce the exact text each
 * donor agreed to.
 */
export const GIFT_AID_WORDING_VERSION = '2026-10-v1';

// ── Coverage ───────────────────────────────────────────────

/**
 * Which donations the declaration covers. HMRC requires this to be
 * unambiguous (3.9.4), so each value renders its own unambiguous sentence.
 */
export const GiftAidCoverage = {
  /** Today's gift, the past 4 years, and all future gifts. The default. */
  PastAndFuture: 'past_and_future',
  /** Today's gift and all future gifts, nothing backdated. */
  Future: 'future',
  /** One named gift only. Cannot be cancelled once the gift is made. */
  Single: 'single',
} as const;
export type GiftAidCoverage = (typeof GiftAidCoverage)[keyof typeof GiftAidCoverage];

export const GIFT_AID_COVERAGE_VALUES: readonly GiftAidCoverage[] = [
  GiftAidCoverage.PastAndFuture,
  GiftAidCoverage.Future,
  GiftAidCoverage.Single,
];

export const GIFT_AID_COVERAGE_LABEL: Record<GiftAidCoverage, string> = {
  past_and_future: 'This gift, the past 4 years, and all future gifts',
  future: 'This gift and all future gifts',
  single: 'One gift only',
};

// ── Channel ────────────────────────────────────────────────

/**
 * How the declaration reached us. Drives what counts as the auditable
 * original: `online` keeps the stored submission, `paper` keeps a scan,
 * `verbal` keeps a recording or the written confirmation we sent.
 */
export const GiftAidChannel = {
  Online: 'online',
  Paper: 'paper',
  Verbal: 'verbal',
  /** Migrated from a pre-Kairos register. Evidence lives outside Kairos. */
  Imported: 'imported',
} as const;
export type GiftAidChannel = (typeof GiftAidChannel)[keyof typeof GiftAidChannel];

export const GIFT_AID_CHANNEL_VALUES: readonly GiftAidChannel[] = [
  GiftAidChannel.Online,
  GiftAidChannel.Paper,
  GiftAidChannel.Verbal,
  GiftAidChannel.Imported,
];

export const GIFT_AID_CHANNEL_LABEL: Record<GiftAidChannel, string> = {
  online: 'Online form',
  paper: 'Paper form',
  verbal: 'Verbal declaration',
  imported: 'Imported register',
};

// ── Status ─────────────────────────────────────────────────

/**
 * Whether the declaration is in force as a tax document. Note what is NOT a
 * status: being unmatched to a Kairos member. A declaration made on the
 * pre-rollout form is in force the moment the donor makes it, exactly like a
 * paper form handed in at a service — HMRC does not care whether our CRM has
 * caught up. "Needs matching" is therefore `memberId === null`, a separate
 * axis, and conflating the two would have made every pre-rollout declaration
 * look unclaimable until an admin got to it.
 */
export const GiftAidStatus = {
  Active: 'active',
  /** Withdrawn by the donor. Prospective only: past claims stand. */
  Cancelled: 'cancelled',
  /**
   * Found not to meet HMRC's requirements (missing address, illegible scan,
   * undeliverable written confirmation). Kept, never claimed on.
   */
  Invalid: 'invalid',
} as const;
export type GiftAidStatus = (typeof GiftAidStatus)[keyof typeof GiftAidStatus];

export const GIFT_AID_STATUS_VALUES: readonly GiftAidStatus[] = [
  GiftAidStatus.Active,
  GiftAidStatus.Cancelled,
  GiftAidStatus.Invalid,
];

export const GIFT_AID_STATUS_LABEL: Record<GiftAidStatus, string> = {
  active: 'Active',
  cancelled: 'Withdrawn',
  invalid: 'Not valid',
};

/** How a withdrawal reached us. HMRC requires the date AND the method. */
export const GiftAidCancellationMethod = {
  Online: 'online',
  Email: 'email',
  Phone: 'phone',
  Letter: 'letter',
  InPerson: 'in_person',
} as const;
export type GiftAidCancellationMethod =
  (typeof GiftAidCancellationMethod)[keyof typeof GiftAidCancellationMethod];

export const GIFT_AID_CANCELLATION_METHOD_VALUES: readonly GiftAidCancellationMethod[] = [
  GiftAidCancellationMethod.Online,
  GiftAidCancellationMethod.Email,
  GiftAidCancellationMethod.Phone,
  GiftAidCancellationMethod.Letter,
  GiftAidCancellationMethod.InPerson,
];

export const GIFT_AID_CANCELLATION_METHOD_LABEL: Record<GiftAidCancellationMethod, string> = {
  online: 'Withdrawn online',
  email: 'By email',
  phone: 'By phone',
  letter: 'By letter',
  in_person: 'In person',
};

// ── Claim-schedule limits ──────────────────────────────────
//
// HMRC's Charities Online schedule spreadsheet has fixed field widths. We
// validate at CAPTURE against them, so a declaration can never be collected
// in a shape that cannot be claimed on months later.

/** Title column: maximum 4 characters. */
export const GIFT_AID_TITLE_MAX = 4;
/** Name column: maximum 35 characters, holding the donor's full name. */
export const GIFT_AID_NAME_MAX = 35;
/** House name or number column. */
export const GIFT_AID_HOUSE_MAX = 40;
/** One spreadsheet carries at most 1,000 donation lines. */
export const GIFT_AID_SCHEDULE_ROW_LIMIT = 1000;

/**
 * Does `first last` fit HMRC's 35-character name column? A longer name is
 * not invalid as a declaration, but it cannot be entered on a claim as
 * given, so capture warns rather than rejects.
 */
export function fitsScheduleNameColumn(firstName: string, lastName: string): boolean {
  return `${firstName.trim()} ${lastName.trim()}`.trim().length <= GIFT_AID_NAME_MAX;
}

/**
 * UK postcode, loosely. Deliberately permissive: a wrong postcode costs a
 * claim line, but a rejected valid one costs a donor. Isle of Man and
 * Channel Islands postcodes must NOT be entered on a claim, so those are
 * treated as overseas by `requiresPostcode`.
 */
const UK_POSTCODE = /^[A-Z]{1,2}\d[A-Z\d]?\d[A-Z]{2}$/i;

/** Normalise to HMRC's claim format: capitals with a single space. */
export function normalisePostcode(input: string): string {
  const compact = input.replace(/\s+/g, '').toUpperCase();
  if (compact.length < 5) return compact;
  return `${compact.slice(0, compact.length - 3)} ${compact.slice(-3)}`;
}

export function isUkPostcode(input: string): boolean {
  return UK_POSTCODE.test(input.replace(/\s+/g, ''));
}

/**
 * Postcodes are mandatory for UK addresses and must be omitted for the Isle
 * of Man and the Channel Islands. Overseas donors give a full address
 * instead.
 */
export function requiresPostcode(countryCode: string): boolean {
  return countryCode.toUpperCase() === 'GB';
}

// ── Accounting periods ─────────────────────────────────────

/**
 * End of the accounting period containing `on`. Both the claim deadline and
 * the retention clock hang off this.
 */
export function accountingPeriodEnd(on: Date): Date {
  const year = on.getUTCFullYear();
  // Compare DATES, not timestamps. Comparing `on` directly against the
  // period end at midnight pushed a gift received at any time of day on the
  // final day of the period into the NEXT period, which would have moved its
  // claim deadline and its retention date a whole year late.
  const onDate = Date.UTC(on.getUTCFullYear(), on.getUTCMonth(), on.getUTCDate());
  const endThisYear = Date.UTC(year, GIFT_AID_PERIOD_END_MONTH - 1, GIFT_AID_PERIOD_END_DAY);
  return onDate <= endThisYear
    ? new Date(endThisYear)
    : new Date(Date.UTC(year + 1, GIFT_AID_PERIOD_END_MONTH - 1, GIFT_AID_PERIOD_END_DAY));
}

/** Last date on which a donation received `on` can still be claimed. */
export function claimDeadlineFor(on: Date): Date {
  const end = accountingPeriodEnd(on);
  return new Date(
    Date.UTC(
      end.getUTCFullYear() + GIFT_AID_CLAIM_WINDOW_YEARS,
      end.getUTCMonth(),
      end.getUTCDate(),
    ),
  );
}

/**
 * Date before which records relating to a donation received `on` may be
 * destroyed. Nothing in Kairos acts on this automatically: it is a review
 * date for a person, because an open HMRC enquiry extends it indefinitely.
 */
export function retentionReviewDateFor(on: Date): Date {
  const end = accountingPeriodEnd(on);
  return new Date(
    Date.UTC(end.getUTCFullYear() + GIFT_AID_RETENTION_YEARS, end.getUTCMonth(), end.getUTCDate()),
  );
}

/**
 * Earliest donation date a declaration given on `declaredOn` can reach back
 * to. HMRC allows backdating; four years is where the claim window closes.
 */
export function backdateFloor(declaredOn: Date): Date {
  return new Date(
    Date.UTC(
      declaredOn.getUTCFullYear() - GIFT_AID_BACKDATE_YEARS,
      declaredOn.getUTCMonth(),
      declaredOn.getUTCDate(),
    ),
  );
}

// ── The declaration text ───────────────────────────────────

export interface DeclarationTextInput {
  coverage: GiftAidCoverage;
  /** Only used by `single` coverage, to name the gift. */
  singleGiftDescription?: string;
}

/**
 * The exact words a donor agrees to. THE one implementation: the public form
 * renders this, the API stores what this returns on the row, and the paper
 * form is typeset from it, so all three can never drift.
 *
 * Every element HMRC requires is here (see 3.6.2 and 3.6.7):
 *   - the charity is named
 *   - the gifts covered are unambiguous
 *   - the donor asks for Gift Aid to apply
 *   - the tax liability is EXPLAINED, not merely asserted. "I am a UK
 *     taxpayer" on its own is explicitly not sufficient, which is why the
 *     responsibility-for-the-difference sentence is not optional.
 *
 * Finance and legal review this text, not the code around it. Any edit here
 * bumps GIFT_AID_WORDING_VERSION.
 */
export function renderDeclarationText(input: DeclarationTextInput): string {
  const charity = GIFT_AID_CHARITY_NAME;
  const covered =
    input.coverage === 'single'
      ? `my gift of ${input.singleGiftDescription ?? '(gift not described)'} to ${charity}`
      : input.coverage === 'future'
        ? `all qualifying gifts of money I make to ${charity} today and in the future`
        : `all qualifying gifts of money I make to ${charity} today, in the future, and in the past 4 years`;

  return [
    `I want to Gift Aid ${covered}.`,
    `I am a UK taxpayer. I understand that ${charity} will reclaim 25p of tax on every 1 pound I give, and that if I pay less Income Tax and/or Capital Gains Tax in a tax year than the amount of Gift Aid claimed on all my donations to all charities in that year, it is my responsibility to pay the difference to HM Revenue and Customs.`,
    `I confirm this is my own money, that it is not the proceeds of a collection or a payment from a company, and that I am not receiving anything in return for it.`,
    `I will tell ${charity} if I change my name or home address, if I stop paying enough tax, or if I want to withdraw this declaration.`,
  ].join('\n\n');
}

/** Shown beside the declaration. Not part of the declaration itself. */
export function renderDeclarationNotes(): string {
  return [
    `${GIFT_AID_CHARITY_NAME} is a registered charity, number ${GIFT_AID_CHARITY_NUMBER}.`,
    'Your home address is needed so HM Revenue and Customs can identify you as a UK taxpayer. It is not used for anything else without your agreement.',
    'Gift Aid cannot be claimed on gifts made from a business account, on the proceeds of a collection, or on payments for tickets, courses or goods.',
    'You can withdraw this declaration at any time. Withdrawing it stops Gift Aid on gifts you make from the day you tell us, and does not affect Gift Aid already claimed on earlier gifts.',
    'We keep this declaration, and the record of any withdrawal, for as long as HM Revenue and Customs requires. That is why it is not removed if you later ask us to delete your profile.',
  ].join('\n\n');
}

// ── DTOs ───────────────────────────────────────────────────

/** The donor identity a declaration carries in its own right. */
export interface GiftAidDeclarant {
  title: string | null;
  firstName: string;
  lastName: string;
  addressLine1: string;
  addressLine2: string | null;
  city: string | null;
  postcode: string | null;
  countryCode: string;
  email: string | null;
  phone: string | null;
}

export interface GiftAidDeclaration extends GiftAidDeclarant {
  id: string;
  memberId: string | null;
  branchId: string | null;
  coverage: GiftAidCoverage;
  /** Earliest donation date covered. Null for `future` and `single`. */
  coversFrom: string | null;
  singleGiftDescription: string | null;
  channel: GiftAidChannel;
  wordingVersion: string;
  declarationText: string;
  evidenceUrl: string | null;
  declaredAt: string;
  capturedById: string | null;
  status: GiftAidStatus;
  cancelledAt: string | null;
  cancellationMethod: GiftAidCancellationMethod | null;
  cancellationNotes: string | null;
  supersededById: string | null;
  retentionReviewAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** What a member sees about their own Gift Aid position, on their profile. */
export interface MyGiftAidStatus {
  /** The declaration currently in force, if any. */
  active: GiftAidDeclaration | null;
  /** Earlier declarations and withdrawals, newest first. */
  history: GiftAidDeclaration[];
  /**
   * False when a declaration is already in force. The profile then offers
   * "update your details", which withdraws the old declaration and makes a
   * new one — HMRC's required route for changing what a declaration covers
   * (3.30.1), rather than editing one in place.
   */
  canDeclare: boolean;
}

// ── Requests ───────────────────────────────────────────────

/** The declarant fields every capture route shares. */
export interface GiftAidDeclarantRequest {
  title?: string;
  firstName: string;
  lastName: string;
  addressLine1: string;
  addressLine2?: string;
  city?: string;
  postcode?: string;
  countryCode?: string;
  email?: string;
  phone?: string;
  coverage?: GiftAidCoverage;
  singleGiftDescription?: string;
}

/**
 * A declaration made by the signed-in member from their own profile.
 * `confirmedDeclaration` is the positive opt-in: HMRC accepts a tick box only
 * if it is not pre-ticked, so the literal `true` is the declaration itself
 * rather than a flag alongside one.
 */
export interface GiftAidDeclarationRequest extends GiftAidDeclarantRequest {
  confirmedDeclaration: true;
}

/** The public pre-rollout form. Email is required: it is the match handle. */
export interface PublicGiftAidDeclarationRequest extends GiftAidDeclarationRequest {
  email: string;
  branchId?: string;
}

/** Admin capture of a declaration made on paper, verbally, or elsewhere. */
export interface CaptureGiftAidDeclarationRequest extends GiftAidDeclarantRequest {
  memberId?: string;
  branchId?: string;
  channel: 'paper' | 'verbal' | 'imported';
  /** The donor's date, not today's. ISO date or date-time. */
  declaredAt: string;
  evidenceUrl?: string;
  writtenConfirmationSentAt?: string;
}

export interface RecordGiftAidWithdrawalRequest {
  method: GiftAidCancellationMethod;
  cancelledAt?: string;
  notes?: string;
}

export interface GiftAidListParams {
  page?: number;
  limit?: number;
  status?: GiftAidStatus;
  channel?: GiftAidChannel;
  branchId?: string;
  search?: string;
  /** The review queue: declarations not yet linked to a member. */
  unmatched?: boolean;
  sortOrder?: 'asc' | 'desc';
}

export interface GiftAidDeclarationTextResponse {
  charityName: string;
  charityNumber: string;
  wordingVersion: string;
  coverageLabels: Record<GiftAidCoverage, string>;
  texts: Record<'past_and_future' | 'future', string>;
  notes: string;
}

/** One row of the claim register, shaped for HMRC's schedule spreadsheet. */
export interface GiftAidRegisterRow {
  title: string;
  name: string;
  houseNameOrNumber: string;
  postcode: string;
  /** Blank for UK donors; the full address for overseas ones. */
  overseasAddress: string;
  declaredAt: string;
  coversFrom: string;
  status: GiftAidStatus;
  cancelledAt: string;
  email: string;
  branchName: string;
}
