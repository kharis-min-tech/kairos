import { and, desc, asc, eq, gte, ilike, isNull, or, sql, type SQL } from 'drizzle-orm';
import type { Database } from '@kairos/database';
import { branches, giftAidDeclarations, members } from '@kairos/database';
import {
  type AuthContext,
  type GiftAidCancellationMethod,
  type GiftAidChannel,
  type GiftAidCoverage,
  type GiftAidDeclaration,
  type GiftAidRegisterRow,
  type GiftAidStatus,
  type MyGiftAidStatus,
  CHURCH_SCOPE,
  GIFT_AID_WORDING_VERSION,
  backdateFloor,
  normalisePostcode,
  renderDeclarationText,
  retentionReviewDateFor,
} from '@kairos/types';
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '@kairos/utils';
import { authHasCapability } from '../lib/grants';
import type {
  CaptureDeclarationInput,
  ListDeclarationsQuery,
  MyDeclarationInput,
  PublicDeclarationInput,
  RecordWithdrawalInput,
  RegisterExportQuery,
} from './schemas';

// ── Authority ─────────────────────────────────────────────────────────────
//
// A Gift Aid declaration names the CHARITY, so authority over it is
// church-scoped: `giftaid:admin` at CHURCH_SCOPE, carried by the Gift Aid
// Admin role. A BranchAdmin grant must never satisfy it — the church contains
// every branch, not the reverse, and `matchesCapability` enforces that.
//
// Deliberately NOT given to branch leadership. A declaration carries a home
// address and a statement about the donor's personal tax affairs; that is
// finance data, not branch-operations data. `branch_id` on the row is a query
// handle for the review queue, nothing more.
//
// The donor-facing surfaces (make a declaration, see your own, withdraw it)
// are gated on being the donor and on nothing else, which is why there is one
// capability here rather than a read/write split.

function enforceGiftAidAdmin(auth: AuthContext): void {
  if (!authHasCapability(auth, 'giftaid:admin', CHURCH_SCOPE)) {
    throw new ForbiddenError('Only Gift Aid admins can administer Gift Aid declarations');
  }
}

// ── Mapping ───────────────────────────────────────────────────────────────

type Row = typeof giftAidDeclarations.$inferSelect;

function toDto(row: Row): GiftAidDeclaration {
  return {
    id: row.id,
    memberId: row.memberId,
    branchId: row.branchId,
    title: row.title,
    firstName: row.firstName,
    lastName: row.lastName,
    addressLine1: row.addressLine1,
    addressLine2: row.addressLine2,
    city: row.city,
    postcode: row.postcode,
    countryCode: row.countryCode,
    email: row.email,
    phone: row.phone,
    coverage: row.coverage as GiftAidCoverage,
    coversFrom: row.coversFrom,
    singleGiftDescription: row.singleGiftDescription,
    channel: row.channel as GiftAidChannel,
    wordingVersion: row.wordingVersion,
    declarationText: row.declarationText,
    evidenceUrl: row.evidenceUrl,
    declaredAt: row.declaredAt.toISOString(),
    capturedById: row.capturedById,
    status: row.status as GiftAidStatus,
    cancelledAt: row.cancelledAt?.toISOString() ?? null,
    cancellationMethod: row.cancellationMethod as GiftAidCancellationMethod | null,
    cancellationNotes: row.cancellationNotes,
    supersededById: row.supersededById,
    retentionReviewAt: row.retentionReviewAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** ISO date (no time) for a `date` column. */
function toDateColumn(value: Date): string {
  return value.toISOString().slice(0, 10);
}

// ── Insert shaping ────────────────────────────────────────────────────────
//
// One place builds the row, so every channel stores the same shape: the
// declaration TEXT comes from the shared renderer rather than from the
// client, and the postcode is normalised to HMRC's claim format (capitals,
// single space) at the boundary rather than at export time.

interface DeclarantFields {
  title?: string | undefined;
  firstName: string;
  lastName: string;
  addressLine1: string;
  addressLine2?: string | undefined;
  city?: string | undefined;
  postcode?: string | undefined;
  countryCode: string;
  email?: string | undefined;
  phone?: string | undefined;
  coverage: string;
  singleGiftDescription?: string | undefined;
}

function buildInsert(
  input: DeclarantFields,
  opts: {
    channel: GiftAidChannel;
    declaredAt: Date;
    memberId?: string | null;
    branchId?: string | null;
    capturedById?: string | null;
    evidenceUrl?: string | null;
    sourceIp?: string | null;
    userAgent?: string | null;
    writtenConfirmationSentAt?: Date | null;
  },
) {
  const coverage = input.coverage as GiftAidCoverage;
  const declarationText = renderDeclarationText({
    coverage,
    ...(input.singleGiftDescription !== undefined
      ? { singleGiftDescription: input.singleGiftDescription }
      : {}),
  });

  return {
    memberId: opts.memberId ?? null,
    branchId: opts.branchId ?? null,
    title: input.title ?? null,
    firstName: input.firstName,
    lastName: input.lastName,
    addressLine1: input.addressLine1,
    addressLine2: input.addressLine2 ?? null,
    city: input.city ?? null,
    postcode: input.postcode ? normalisePostcode(input.postcode) : null,
    countryCode: input.countryCode,
    email: input.email ?? null,
    phone: input.phone ?? null,
    coverage,
    // Backdated coverage has to say how far back, or it is not unambiguous
    // (HMRC 3.9.4). Four years is where the claim window closes.
    coversFrom:
      coverage === 'past_and_future' ? toDateColumn(backdateFloor(opts.declaredAt)) : null,
    singleGiftDescription: input.singleGiftDescription ?? null,
    channel: opts.channel,
    wordingVersion: GIFT_AID_WORDING_VERSION,
    declarationText,
    evidenceUrl: opts.evidenceUrl ?? null,
    sourceIp: opts.sourceIp ?? null,
    userAgent: opts.userAgent ?? null,
    writtenConfirmationSentAt: opts.writtenConfirmationSentAt ?? null,
    declaredAt: opts.declaredAt,
    capturedById: opts.capturedById ?? null,
    status: 'active' as const,
  };
}

// ── Donor-facing ──────────────────────────────────────────────────────────

async function findActiveForMember(db: Database, memberId: string): Promise<Row | undefined> {
  const [row] = await db
    .select()
    .from(giftAidDeclarations)
    .where(
      and(eq(giftAidDeclarations.memberId, memberId), eq(giftAidDeclarations.status, 'active')),
    )
    .limit(1);
  return row;
}

export async function getMyGiftAidStatus(
  db: Database,
  auth: AuthContext,
): Promise<MyGiftAidStatus> {
  const rows = await db
    .select()
    .from(giftAidDeclarations)
    .where(eq(giftAidDeclarations.memberId, auth.memberId))
    .orderBy(desc(giftAidDeclarations.declaredAt));

  const active = rows.find((r) => r.status === 'active');
  return {
    active: active ? toDto(active) : null,
    history: rows.filter((r) => r.status !== 'active').map(toDto),
    canDeclare: !active,
  };
}

/**
 * The member declares, from their own profile.
 *
 * If a declaration is already in force this withdraws it and supersedes it
 * with the new one, rather than editing it in place. That is HMRC's required
 * route for changing what a declaration covers (3.30.1): a declaration's
 * scope cannot be amended, only cancelled and replaced. Editing in place
 * would also destroy the evidence for claims already made under the old
 * wording.
 *
 * Note what is NOT validated here: whether the person actually pays UK tax.
 * That is the donor's statement to make and their liability if it is wrong,
 * which is precisely what the declaration text explains. Kairos recording a
 * tax status it cannot verify would be worse than useless.
 */
export async function declareMine(
  db: Database,
  auth: AuthContext,
  input: MyDeclarationInput,
): Promise<GiftAidDeclaration> {
  const now = new Date();
  const existing = await findActiveForMember(db, auth.memberId);

  const [created] = await db
    .insert(giftAidDeclarations)
    .values(
      buildInsert(input, {
        channel: 'online',
        declaredAt: now,
        memberId: auth.memberId,
        branchId: auth.branchId,
      }),
    )
    .returning();

  if (!created) throw new ConflictError('Could not record the declaration');

  if (existing) {
    await db
      .update(giftAidDeclarations)
      .set({
        status: 'cancelled',
        cancelledAt: now,
        cancellationMethod: 'online',
        cancellationNotes: 'Replaced by a new declaration made by the donor',
        cancelledById: auth.memberId,
        supersededById: created.id,
        retentionReviewAt: retentionReviewDateFor(now),
        updatedAt: now,
      })
      .where(eq(giftAidDeclarations.id, existing.id));
  }

  return toDto(created);
}

/**
 * The donor withdraws. Prospective only: Gift Aid stops on gifts made from
 * today, and claims already made stand (HMRC 3.8.2). Nothing is deleted —
 * the declaration and the record of its withdrawal are both evidence.
 */
export async function withdrawMine(
  db: Database,
  auth: AuthContext,
  notes?: string,
): Promise<GiftAidDeclaration> {
  const existing = await findActiveForMember(db, auth.memberId);
  if (!existing) throw new NotFoundError('Active Gift Aid declaration');

  const now = new Date();
  const [updated] = await db
    .update(giftAidDeclarations)
    .set({
      status: 'cancelled',
      cancelledAt: now,
      cancellationMethod: 'online',
      cancellationNotes: notes ?? null,
      cancelledById: auth.memberId,
      retentionReviewAt: retentionReviewDateFor(now),
      updatedAt: now,
    })
    .where(eq(giftAidDeclarations.id, existing.id))
    .returning();

  if (!updated) throw new NotFoundError('Active Gift Aid declaration');
  return toDto(updated);
}

// ── Public (unauthenticated) ──────────────────────────────────────────────

/**
 * The pre-rollout form, open to anyone. No auth, by design: the people it
 * collects from do not have Kairos accounts yet.
 *
 * The declaration is in force immediately — the donor made it, exactly as
 * they would on paper at a service — and sits UNMATCHED until an admin links
 * it to a member. `memberId` is auto-filled on an exact, unique, active email
 * match because members.email is unique, which makes it a strong signal; a
 * human still confirms it in the review queue before it is treated as that
 * member's declaration on their profile.
 */
export async function submitPublicDeclaration(
  db: Database,
  input: PublicDeclarationInput,
  meta: { sourceIp?: string | null; userAgent?: string | null },
): Promise<{ id: string; declaredAt: string }> {
  const now = new Date();

  const [match] = await db
    .select({ id: members.id, homeBranchId: members.homeBranchId })
    .from(members)
    .where(and(eq(members.email, input.email.toLowerCase()), eq(members.isActive, true)))
    .limit(1);

  // Someone who already has a declaration in force should not be able to
  // stack a second one through the public form. Their existing one stands;
  // changing it is a profile action, where they are authenticated.
  if (match) {
    const existing = await findActiveForMember(db, match.id);
    if (existing) {
      throw new ConflictError(
        'A Gift Aid declaration is already in place for this email address. Sign in to update or withdraw it.',
      );
    }
  }

  const [created] = await db
    .insert(giftAidDeclarations)
    .values(
      buildInsert(input, {
        channel: 'online',
        declaredAt: now,
        memberId: match?.id ?? null,
        branchId: input.branchId ?? match?.homeBranchId ?? null,
        sourceIp: meta.sourceIp ?? null,
        userAgent: meta.userAgent ?? null,
      }),
    )
    .returning({ id: giftAidDeclarations.id, declaredAt: giftAidDeclarations.declaredAt });

  if (!created) throw new ConflictError('Could not record the declaration');
  return { id: created.id, declaredAt: created.declaredAt.toISOString() };
}

// ── Admin ────────────────────────────────────────────────────────────────

export async function listDeclarations(
  db: Database,
  auth: AuthContext,
  query: ListDeclarationsQuery,
): Promise<{ items: GiftAidDeclaration[]; total: number; page: number; limit: number }> {
  enforceGiftAidAdmin(auth);

  const conditions: SQL[] = [];
  if (query.status) conditions.push(eq(giftAidDeclarations.status, query.status));
  if (query.channel) conditions.push(eq(giftAidDeclarations.channel, query.channel));
  if (query.branchId) conditions.push(eq(giftAidDeclarations.branchId, query.branchId));
  if (query.unmatched) conditions.push(isNull(giftAidDeclarations.memberId));
  if (query.search) {
    const needle = `%${query.search}%`;
    const search = or(
      ilike(giftAidDeclarations.lastName, needle),
      ilike(giftAidDeclarations.firstName, needle),
      ilike(giftAidDeclarations.email, needle),
      ilike(giftAidDeclarations.postcode, needle),
    );
    if (search) conditions.push(search);
  }
  const where = conditions.length ? and(...conditions) : undefined;

  const order =
    query.sortOrder === 'asc'
      ? asc(giftAidDeclarations.declaredAt)
      : desc(giftAidDeclarations.declaredAt);

  const rows = await db
    .select()
    .from(giftAidDeclarations)
    .where(where)
    .orderBy(order)
    .limit(query.limit)
    .offset((query.page - 1) * query.limit);

  const [count] = await db
    .select({ total: sql<number>`COUNT(*)::int` })
    .from(giftAidDeclarations)
    .where(where);

  return {
    items: rows.map(toDto),
    total: count?.total ?? 0,
    page: query.page,
    limit: query.limit,
  };
}

export async function getDeclaration(
  db: Database,
  auth: AuthContext,
  id: string,
): Promise<GiftAidDeclaration> {
  enforceGiftAidAdmin(auth);
  const [row] = await db
    .select()
    .from(giftAidDeclarations)
    .where(eq(giftAidDeclarations.id, id))
    .limit(1);
  if (!row) throw new NotFoundError('Gift Aid declaration');
  return toDto(row);
}

/**
 * Capture a declaration made elsewhere: a paper form handed in, an imported
 * pre-Kairos register row, or a verbal declaration whose written confirmation
 * has been sent.
 *
 * `declaredAt` is the donor's date, not today's, because that is the date the
 * claim rests on.
 */
export async function captureDeclaration(
  db: Database,
  auth: AuthContext,
  input: CaptureDeclarationInput,
): Promise<GiftAidDeclaration> {
  enforceGiftAidAdmin(auth);

  if (input.declaredAt.getTime() > Date.now()) {
    throw new ValidationError('A declaration cannot be dated in the future');
  }

  let branchId = input.branchId ?? null;
  if (input.memberId) {
    const [member] = await db
      .select({ id: members.id, homeBranchId: members.homeBranchId })
      .from(members)
      .where(eq(members.id, input.memberId))
      .limit(1);
    if (!member) throw new NotFoundError('Member');

    const existing = await findActiveForMember(db, input.memberId);
    if (existing) {
      throw new ConflictError(
        'This member already has a Gift Aid declaration in force. Record a withdrawal of it first.',
      );
    }
    branchId = branchId ?? member.homeBranchId;
  }

  const [created] = await db
    .insert(giftAidDeclarations)
    .values(
      buildInsert(input, {
        channel: input.channel,
        declaredAt: input.declaredAt,
        memberId: input.memberId ?? null,
        branchId,
        capturedById: auth.memberId,
        evidenceUrl: input.evidenceUrl ?? null,
        writtenConfirmationSentAt: input.writtenConfirmationSentAt ?? null,
      }),
    )
    .returning();

  if (!created) throw new ConflictError('Could not record the declaration');
  return toDto(created);
}

/**
 * Attach an unmatched declaration to the member it belongs to. Matching sets
 * the LINK only: the declared name and address on the row are left exactly as
 * the donor gave them, because those are the HMRC evidence and the member's
 * current profile may well disagree with them.
 */
export async function matchDeclaration(
  db: Database,
  auth: AuthContext,
  id: string,
  memberId: string,
): Promise<GiftAidDeclaration> {
  enforceGiftAidAdmin(auth);

  const [row] = await db
    .select()
    .from(giftAidDeclarations)
    .where(eq(giftAidDeclarations.id, id))
    .limit(1);
  if (!row) throw new NotFoundError('Gift Aid declaration');
  if (row.memberId) {
    throw new ConflictError('This declaration is already matched to a member');
  }

  const [member] = await db
    .select({ id: members.id, homeBranchId: members.homeBranchId })
    .from(members)
    .where(eq(members.id, memberId))
    .limit(1);
  if (!member) throw new NotFoundError('Member');

  if (row.status === 'active') {
    const existing = await findActiveForMember(db, memberId);
    if (existing) {
      throw new ConflictError(
        'This member already has a Gift Aid declaration in force. Record a withdrawal of it first.',
      );
    }
  }

  const [updated] = await db
    .update(giftAidDeclarations)
    .set({
      memberId,
      branchId: row.branchId ?? member.homeBranchId,
      updatedAt: new Date(),
    })
    .where(eq(giftAidDeclarations.id, id))
    .returning();

  if (!updated) throw new NotFoundError('Gift Aid declaration');
  return toDto(updated);
}

/**
 * Record a withdrawal that reached us by phone, letter, email or in person.
 * The 2016 Regulations require the date AND the method, which is why neither
 * is optional and why the DB carries a CHECK that they travel together.
 */
export async function recordWithdrawal(
  db: Database,
  auth: AuthContext,
  id: string,
  input: RecordWithdrawalInput,
): Promise<GiftAidDeclaration> {
  enforceGiftAidAdmin(auth);

  const [row] = await db
    .select()
    .from(giftAidDeclarations)
    .where(eq(giftAidDeclarations.id, id))
    .limit(1);
  if (!row) throw new NotFoundError('Gift Aid declaration');
  if (row.status !== 'active') {
    throw new ConflictError('Only a declaration in force can be withdrawn');
  }

  const cancelledAt = input.cancelledAt ?? new Date();
  if (cancelledAt.getTime() < row.declaredAt.getTime()) {
    throw new ValidationError('A withdrawal cannot predate the declaration it withdraws');
  }

  const [updated] = await db
    .update(giftAidDeclarations)
    .set({
      status: 'cancelled',
      cancelledAt,
      cancellationMethod: input.method,
      cancellationNotes: input.notes ?? null,
      cancelledById: auth.memberId,
      retentionReviewAt: retentionReviewDateFor(cancelledAt),
      updatedAt: new Date(),
    })
    .where(eq(giftAidDeclarations.id, id))
    .returning();

  if (!updated) throw new NotFoundError('Gift Aid declaration');
  return toDto(updated);
}

/**
 * Mark a declaration as not meeting HMRC's requirements: a missing address,
 * an illegible scan, a written confirmation returned undeliverable (HMRC
 * 3.8.1 says treat that as cancelled). The row is KEPT — we need to be able
 * to show why nothing was claimed on it.
 */
export async function markInvalid(
  db: Database,
  auth: AuthContext,
  id: string,
  reason: string,
): Promise<GiftAidDeclaration> {
  enforceGiftAidAdmin(auth);

  const now = new Date();
  const [updated] = await db
    .update(giftAidDeclarations)
    .set({
      status: 'invalid',
      cancellationNotes: reason,
      retentionReviewAt: retentionReviewDateFor(now),
      updatedAt: now,
    })
    .where(eq(giftAidDeclarations.id, id))
    .returning();

  if (!updated) throw new NotFoundError('Gift Aid declaration');
  return toDto(updated);
}

// ── Claim register ───────────────────────────────────────────────────────

/**
 * The register finance joins their donation data against to build an HMRC
 * claim. Kairos does not hold donations — giving runs through the website and
 * text giving — so this stops at the declaration side on purpose. Shaped to
 * the Charities Online schedule columns (title 4 chars, name 35, house name
 * or number, postcode in capitals with a space) so the join output can be
 * pasted straight into HMRC's spreadsheet.
 */
export async function exportRegister(
  db: Database,
  auth: AuthContext,
  query: RegisterExportQuery,
): Promise<GiftAidRegisterRow[]> {
  enforceGiftAidAdmin(auth);

  const conditions: SQL[] = [eq(giftAidDeclarations.status, query.status)];
  if (query.branchId) conditions.push(eq(giftAidDeclarations.branchId, query.branchId));
  if (query.from) {
    conditions.push(gte(giftAidDeclarations.declaredAt, query.from));
  }

  const rows = await db
    .select({
      declaration: giftAidDeclarations,
      branchName: branches.branchName,
    })
    .from(giftAidDeclarations)
    .leftJoin(branches, eq(giftAidDeclarations.branchId, branches.id))
    .where(and(...conditions))
    .orderBy(asc(giftAidDeclarations.lastName), asc(giftAidDeclarations.firstName));

  return rows.map(({ declaration: d, branchName }) => ({
    title: d.title ?? '',
    name: `${d.firstName} ${d.lastName}`.trim(),
    houseNameOrNumber: d.addressLine1,
    // HMRC rejects a postcode for an overseas address, so it is blank there
    // and the full address travels in its own column instead.
    postcode: d.countryCode === 'GB' ? (d.postcode ?? '') : '',
    overseasAddress:
      d.countryCode === 'GB'
        ? ''
        : [d.addressLine1, d.addressLine2, d.city, d.countryCode].filter(Boolean).join(', '),
    declaredAt: d.declaredAt.toISOString().slice(0, 10),
    coversFrom: d.coversFrom ?? d.declaredAt.toISOString().slice(0, 10),
    status: d.status as GiftAidStatus,
    cancelledAt: d.cancelledAt?.toISOString().slice(0, 10) ?? '',
    email: d.email ?? '',
    branchName: branchName ?? '',
  }));
}

const REGISTER_COLUMNS: readonly (keyof GiftAidRegisterRow)[] = [
  'title',
  'name',
  'houseNameOrNumber',
  'postcode',
  'overseasAddress',
  'declaredAt',
  'coversFrom',
  'status',
  'cancelledAt',
  'email',
  'branchName',
];

const REGISTER_HEADERS: Record<keyof GiftAidRegisterRow, string> = {
  title: 'Title',
  name: 'Name',
  houseNameOrNumber: 'House name or number',
  postcode: 'Postcode',
  overseasAddress: 'Overseas address',
  declaredAt: 'Declared on',
  coversFrom: 'Covers donations from',
  status: 'Status',
  cancelledAt: 'Withdrawn on',
  email: 'Email',
  branchName: 'Branch',
};

function csvCell(value: string): string {
  // Leading =, +, - or @ makes a spreadsheet treat the cell as a formula. The
  // register is opened in Excel by definition, so neutralise it.
  const guarded = /^[=+\-@]/.test(value) ? `'${value}` : value;
  return /[",\n]/.test(guarded) ? `"${guarded.replace(/"/g, '""')}"` : guarded;
}

export function registerToCsv(rows: GiftAidRegisterRow[]): string {
  const header = REGISTER_COLUMNS.map((c) => csvCell(REGISTER_HEADERS[c])).join(',');
  const body = rows.map((row) => REGISTER_COLUMNS.map((c) => csvCell(row[c])).join(','));
  return [header, ...body].join('\r\n');
}
