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
import { recordAuditEvent, hasPriorSigninFromUserAgent } from '../audit/service';
import { extractRequestContext } from '../audit/context';
import { dispatchNotification } from '../notifications/service';
import { AuditAction, AuditOutcome, NotificationEventType } from '@kairos/types';

export const authRouter = new Hono();

// ── Public routes ──────────────────────────────────────────

authRouter.post('/signup', zValidator('json', signupSchema), async (c) => {
  const body = c.req.valid('json');
  const result = await signup(db, body);
  return c.json(successResponse({
    member: result.member,
    // In dev mode, include token for easy testing — remove in production
    verificationToken: result.verificationToken,
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
