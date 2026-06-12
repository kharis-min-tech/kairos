import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { db } from '../db';
import { authMiddleware, getAuth } from '../middleware/auth';
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
  finalizeRoleSchema,
  switchRoleSchema,
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
  finalizeRole,
  switchRole,
  listAvailableRolesForCurrent,
} from './service';

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
  const result = await login(db, body.email, body.password, body.activeRole);
  // Message varies by result arm so the client can render appropriately
  // without re-deriving from the shape.
  const message = result.roleSelectionRequired ? 'Role selection required' : 'Login successful';
  return c.json(successResponse(result, message));
});

// Step 2 of the two-step login: finalize the picked role + scope. Public —
// authority comes from the short-lived sessionToken in the body.
authRouter.post('/finalize-role', zValidator('json', finalizeRoleSchema), async (c) => {
  const body = c.req.valid('json');
  const result = await finalizeRole(db, body);
  return c.json(successResponse(result, 'Login successful'));
});

authRouter.post('/refresh', zValidator('json', refreshSchema), async (c) => {
  const body = c.req.valid('json');
  const tokens = await refreshAccessToken(db, body.refreshToken);
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

// Phase 3 header-dropdown support: swap to a different available role
// without re-authenticating. Re-validates against the caller's CURRENT
// leadership footprint — revocations propagate instantly.
authRouter.post('/switch-role', authMiddleware, zValidator('json', switchRoleSchema), async (c) => {
  const auth = getAuth(c);
  const body = c.req.valid('json');
  const result = await switchRole(db, auth, body);
  return c.json(successResponse(result, 'Role switched'));
});

// Expose the available role list to an authenticated caller so the header
// dropdown can render without recomputing on the client.
authRouter.get('/available-roles', authMiddleware, async (c) => {
  const auth = getAuth(c);
  const result = await listAvailableRolesForCurrent(db, auth);
  return c.json(successResponse(result));
});
