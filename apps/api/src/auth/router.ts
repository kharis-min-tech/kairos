import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { db } from '../db';
import { authMiddleware, getAuth } from '../middleware/auth';
import { getAuthSecrets } from '../lib/auth-secrets';
import { successResponse } from '@kairos/utils';
import {
  signupSchema,
  loginSchema,
  refreshSchema,
  verifyEmailSchema,
  resendCodeSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  requestEmailChangeSchema,
  tokenSchema,
} from './schemas';
import {
  signup,
  login,
  refreshAccessToken,
  verifyEmail,
  forgotPassword,
  resetPassword,
  getMe,
  changePassword,
} from './service';
import {
  requestEmailChange,
  confirmEmailChange,
  undoEmailChange,
} from './email-change-service';
import { recordAuditEvent, hasPriorSigninFromUserAgent } from '../audit/service';
import { extractRequestContext } from '../audit/context';
import { dispatchNotification } from '../notifications/service';
import { AuditAction, AuditOutcome, NotificationEventType } from '@kairos/types';

export const authRouter = new Hono();

// ── Public routes ──────────────────────────────────────────

authRouter.post('/signup', zValidator('json', signupSchema), async (c) => {
  const body = c.req.valid('json');
  const result = await signup(db, body);
  // Keep the isolate alive so SES actually gets called after we return the
  // 201. Without waitUntil, CF Workers cancel the send-email promise the
  // instant fetch() resolves — nothing hits the wire, nothing logs. Hono
  // throws on `c.executionCtx` access outside a Workers runtime (Node dev
  // server, vitest), so try/catch it and just let the promise float there —
  // Node doesn't freeze isolates.
  try {
    c.executionCtx.waitUntil(result.sendVerificationEmail);
  } catch {
    /* no executionCtx — Node/test environment */
  }
  return c.json(successResponse({
    member: result.member,
    // Present only when the mailer isn't live (local dev). Staging/prod
    // never see this field — email is the only path to verification.
    ...(result.verificationToken ? { verificationToken: result.verificationToken } : {}),
  }, 'Signup successful. Please verify your email.'), 201);
});

authRouter.post('/login', zValidator('json', loginSchema), async (c) => {
  const body = c.req.valid('json');
  const ctx = extractRequestContext(c);
  try {
    const result = await login(db, body.email, body.password, getAuthSecrets(c));

    const isNewDevice = ctx.userAgent
      ? !(await hasPriorSigninFromUserAgent(db, result.member.id, ctx.userAgent))
      : false;

    await recordAuditEvent(db, {
      actorMemberId: result.member.id,
      action: AuditAction.SigninSuccess,
      outcome: AuditOutcome.Success,
      ctx,
      metadata: { isFirstLogin: result.isFirstLogin },
    });

    if (isNewDevice) {
      void dispatchNotification(db, {
        eventType: NotificationEventType.SecuritySigninNewDevice,
        recipientMemberIds: [result.member.id],
        payload: {
          occurredAt: new Date(),
          ip: ctx.ip ?? null,
          country: ctx.country ?? null,
          userAgent: ctx.userAgent ?? null,
        },
      });
    }

    return c.json(successResponse(result, 'Login successful'));
  } catch (err) {
    await recordAuditEvent(db, {
      actorMemberId: null,
      action: AuditAction.SigninFailure,
      outcome: AuditOutcome.Failure,
      attemptedEmail: body.email,
      ctx,
      metadata: { reason: err instanceof Error ? err.message : 'unknown' },
    });
    throw err;
  }
});

authRouter.post('/refresh', zValidator('json', refreshSchema), async (c) => {
  const body = c.req.valid('json');
  const tokens = await refreshAccessToken(db, body.refreshToken, getAuthSecrets(c));
  return c.json(successResponse(tokens, 'Token refreshed'));
});

authRouter.post('/verify-email', zValidator('json', verifyEmailSchema), async (c) => {
  const body = c.req.valid('json');
  await verifyEmail(db, body.token);
  return c.json(successResponse(undefined, 'Email verified successfully'));
});

authRouter.post('/resend-code', zValidator('json', resendCodeSchema), async (c) => {
  const body = c.req.valid('json');
  // For MVP, just return success — in production, regenerate and send new code
  void body;
  return c.json(successResponse(undefined, 'Verification code resent'));
});

authRouter.post('/forgot-password', zValidator('json', forgotPasswordSchema), async (c) => {
  const body = c.req.valid('json');
  const result = await forgotPassword(db, body.email);
  // Always return success to prevent email enumeration
  return c.json(successResponse(
    { resetToken: result.resetToken || undefined },
    'If an account with that email exists, a password reset link has been sent.',
  ));
});

authRouter.post('/reset-password', zValidator('json', resetPasswordSchema), async (c) => {
  const body = c.req.valid('json');
  await resetPassword(db, body.token, body.newPassword);
  return c.json(successResponse(undefined, 'Password reset successful'));
});

// ── Protected routes ───────────────────────────────────────

authRouter.get('/me', authMiddleware, async (c) => {
  const auth = getAuth(c);
  const member = await getMe(db, auth.memberId);
  return c.json(successResponse(member));
});

authRouter.post('/change-password', authMiddleware, zValidator('json', changePasswordSchema), async (c) => {
  const auth = getAuth(c);
  const { currentPassword, newPassword } = c.req.valid('json');
  await changePassword(db, auth, currentPassword, newPassword);
  return c.json(successResponse(undefined, 'Password changed successfully'));
});

authRouter.post(
  '/email-change',
  authMiddleware,
  zValidator('json', requestEmailChangeSchema),
  async (c) => {
    const auth = getAuth(c);
    const { currentPassword, newEmail } = c.req.valid('json');
    await requestEmailChange(db, auth, currentPassword, newEmail);
    return c.json(
      successResponse(undefined, 'Check your new email for a confirmation link'),
    );
  },
);

authRouter.post(
  '/email-change/confirm',
  zValidator('json', tokenSchema),
  async (c) => {
    const { token } = c.req.valid('json');
    await confirmEmailChange(db, token);
    return c.json(successResponse(undefined, 'Email change confirmed'));
  },
);

authRouter.post(
  '/email-change/undo',
  zValidator('json', tokenSchema),
  async (c) => {
    const { token } = c.req.valid('json');
    const result = await undoEmailChange(db, token);
    return c.json(
      successResponse(result, 'Email change reverted. Use the reset token to set a new password.'),
    );
  },
);
