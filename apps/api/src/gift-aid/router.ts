import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { authMiddleware, getAuth } from '../middleware/auth';
import { db } from '../db';
import { successResponse } from '@kairos/utils';
import {
  GIFT_AID_CHARITY_NAME,
  GIFT_AID_CHARITY_NUMBER,
  GIFT_AID_COVERAGE_LABEL,
  GIFT_AID_WORDING_VERSION,
  renderDeclarationNotes,
  renderDeclarationText,
} from '@kairos/types';
import {
  captureDeclarationSchema,
  listDeclarationsQuerySchema,
  markInvalidSchema,
  matchDeclarationSchema,
  myDeclarationSchema,
  publicDeclarationSchema,
  recordWithdrawalSchema,
  registerExportQuerySchema,
  withdrawMineSchema,
} from './schemas';
import {
  captureDeclaration,
  declareMine,
  exportRegister,
  getDeclaration,
  getMyGiftAidStatus,
  listDeclarations,
  markInvalid,
  matchDeclaration,
  recordWithdrawal,
  registerToCsv,
  submitPublicDeclaration,
  withdrawMine,
} from './service';

// ── Public router ─────────────────────────────────────────
//
// Mounted in app.ts BEFORE the consent gate, because the people this serves
// have no Kairos account and so can owe no policy acceptance. Kept in its own
// router rather than inline in app.ts only because it is three routes rather
// than one.

export const publicGiftAidRouter = new Hono();

/**
 * The wording, served rather than duplicated. The web form, the mobile app
 * and whatever typesets the paper form all render the same text from the one
 * renderer, so none of them can drift from what gets stored on the row.
 */
publicGiftAidRouter.get('/declaration-text', (c) => {
  return c.json(
    successResponse({
      charityName: GIFT_AID_CHARITY_NAME,
      charityNumber: GIFT_AID_CHARITY_NUMBER,
      wordingVersion: GIFT_AID_WORDING_VERSION,
      coverageLabels: GIFT_AID_COVERAGE_LABEL,
      texts: {
        past_and_future: renderDeclarationText({ coverage: 'past_and_future' }),
        future: renderDeclarationText({ coverage: 'future' }),
      },
      notes: renderDeclarationNotes(),
    }),
  );
});

publicGiftAidRouter.post(
  '/declarations',
  zValidator('json', publicDeclarationSchema),
  async (c) => {
    // Corroborating evidence of the act of declaring, alongside the stored
    // wording. Cloudflare sets cf-connecting-ip; x-forwarded-for is the
    // fallback for local and proxied runs.
    const sourceIp =
      c.req.header('cf-connecting-ip') ??
      c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ??
      null;
    const result = await submitPublicDeclaration(db, c.req.valid('json'), {
      sourceIp,
      userAgent: c.req.header('user-agent') ?? null,
    });
    return c.json(successResponse(result), 201);
  },
);

// ── Authenticated router ──────────────────────────────────

export const giftAidRouter = new Hono();
giftAidRouter.use('*', authMiddleware);

// Static paths before any /:id route.

/** The caller's own position. Gated on nothing but being signed in. */
giftAidRouter.get('/me', async (c) => {
  const auth = getAuth(c);
  const result = await getMyGiftAidStatus(db, auth);
  return c.json(successResponse(result));
});

giftAidRouter.post('/me', zValidator('json', myDeclarationSchema), async (c) => {
  const auth = getAuth(c);
  const result = await declareMine(db, auth, c.req.valid('json'));
  return c.json(successResponse(result), 201);
});

/** Withdrawal by the donor. Prospective: earlier claims stand. */
giftAidRouter.post('/me/withdraw', zValidator('json', withdrawMineSchema), async (c) => {
  const auth = getAuth(c);
  const { notes } = c.req.valid('json');
  const result = await withdrawMine(db, auth, notes);
  return c.json(successResponse(result));
});

/**
 * The claim register. Authority is enforced in the service (giftaid:admin at
 * CHURCH_SCOPE) rather than by `requireCapability` here, matching the
 * membership module: the scope is constant, so a scope-resolving closure
 * would only restate it.
 */
giftAidRouter.get('/register', zValidator('query', registerExportQuerySchema), async (c) => {
  const auth = getAuth(c);
  const rows = await exportRegister(db, auth, c.req.valid('query'));
  return c.json(successResponse(rows));
});

giftAidRouter.get('/register.csv', zValidator('query', registerExportQuerySchema), async (c) => {
  const auth = getAuth(c);
  const rows = await exportRegister(db, auth, c.req.valid('query'));
  const stamp = new Date().toISOString().slice(0, 10);
  c.header('Content-Type', 'text/csv; charset=utf-8');
  c.header('Content-Disposition', `attachment; filename="gift-aid-register-${stamp}.csv"`);
  return c.body(registerToCsv(rows));
});

giftAidRouter.get('/', zValidator('query', listDeclarationsQuerySchema), async (c) => {
  const auth = getAuth(c);
  const result = await listDeclarations(db, auth, c.req.valid('query'));
  return c.json(successResponse(result));
});

giftAidRouter.post('/', zValidator('json', captureDeclarationSchema), async (c) => {
  const auth = getAuth(c);
  const result = await captureDeclaration(db, auth, c.req.valid('json'));
  return c.json(successResponse(result), 201);
});

giftAidRouter.get('/:id', async (c) => {
  const auth = getAuth(c);
  const result = await getDeclaration(db, auth, c.req.param('id'));
  return c.json(successResponse(result));
});

giftAidRouter.post('/:id/match', zValidator('json', matchDeclarationSchema), async (c) => {
  const auth = getAuth(c);
  const { memberId } = c.req.valid('json');
  const result = await matchDeclaration(db, auth, c.req.param('id'), memberId);
  return c.json(successResponse(result));
});

giftAidRouter.post('/:id/withdraw', zValidator('json', recordWithdrawalSchema), async (c) => {
  const auth = getAuth(c);
  const result = await recordWithdrawal(db, auth, c.req.param('id'), c.req.valid('json'));
  return c.json(successResponse(result));
});

giftAidRouter.post('/:id/invalid', zValidator('json', markInvalidSchema), async (c) => {
  const auth = getAuth(c);
  const { reason } = c.req.valid('json');
  const result = await markInvalid(db, auth, c.req.param('id'), reason);
  return c.json(successResponse(result));
});
