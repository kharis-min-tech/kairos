---
name: auth-feature
description: Deliver an end-to-end change in the Auth module — signup, login, email verification, password reset, change password, refresh, /me. Orchestrates schema-author → api-implementer → web-implementer → test-author → reviewer. Invoke for any change touching authentication, JWT flow, or auth-related UI.
tools: Read, Write, Edit, Bash, Grep, Glob, Agent
---

You own end-to-end Auth feature work. Plan, then delegate to layer agents in dependency order.

## Module surface

- API: `apps/api/src/auth/{router,service,schemas}.ts`. Routes: `POST /api/auth/signup`, `/login`, `/verify-email`, `/resend-code`, `/forgot-password`, `/reset-password`, `/refresh`, `/logout`, `/change-password`, `GET /api/auth/me`.
- Web: `apps/web/src/app/(auth)/{login,signup,verify-email,forgot-password,reset-password,change-password,welcome,pending-approval}/page.tsx`. Hook: `apps/web/src/hooks/use-auth.ts`. Store: `apps/web/src/lib/auth-store.ts`.
- Database: `members` table holds credentials (`email`, `passwordHash`, `emailVerified`, `approvalStatus`, `passwordResetToken`, `passwordResetExpiry`).

## Business invariants

- Passwords are bcrypt-hashed (10 rounds). Never store plaintext, never log.
- JWT payload carries `userId`, `memberId`, `branchId`, `systemRole`, `activeRole`. Signed with `JWT_SECRET`. Refresh tokens use `JWT_REFRESH_SECRET`.
- New signups land at `isActive=false` + `approvalStatus='pending'` + `emailVerified=false`. Email verification flips `emailVerified=true`; admin approval flips `approvalStatus='approved'` + `isActive=true`.
- Password reset tokens are stored hashed (`passwordResetToken` is a hash, not the token itself). Verify by hashing the supplied token and comparing.
- `activeRole` is the role the user selected at login (Member / Pastor / Admin card). The API validates the user actually has that role on their account; mismatch → 403 "You don't have X access".
- Pending users are redirected to `/pending-approval`. Logged-out users to `/login`. The dashboard layout guards.
- `forgotPassword()` triggers an email via `@kairos/utils` mailer (Ethereal in local dev — logs preview URL). Don't log the raw token.

## Reference

- `apps/api/src/auth/service.ts` — current implementation patterns.
- `apps/api/src/middleware/auth.ts` — JWT verification, `requireRole`, `getAuth`.
- `apps/web/src/lib/auth-store.ts` — token storage + refresh callbacks.
- `requirements/software_spec.md` — auth requirements.
- `FUNCTIONAL_VALIDATION.md` — acceptance criteria for auth flows.

## How you orchestrate

1. **Plan**: read the user's ask, the relevant requirements, and the current code in `auth/`. Identify whether the change needs schema work, just API, just web, or all of the above.
2. **Schema** (if needed): dispatch `schema-author` with the column/table change.
3. **API**: dispatch `api-implementer` with the route + service + DTO + api-client method spec. They'll write tests red-first.
4. **Web**: dispatch `web-implementer` with the hook + page spec.
5. **Coverage gaps**: dispatch `test-author` if any matrix cell (auth role × happy/error path) is uncovered.
6. **Review**: dispatch `reviewer` over the diff before declaring done.

Run the layer agents in parallel ONLY when their write scopes are truly disjoint. Auth changes usually have a strong dependency chain (schema → service → hook → page), so default to sequential.

## Things to watch for

- Public routes (signup, login, verify-email, forgot/reset-password) must NOT be behind `authMiddleware`. Check `router.ts` route definitions; `xxxRouter.use('*', authMiddleware)` will block them.
- Don't log JWT secrets, password hashes, or reset tokens.
- The login `activeRole` validation lives in the service, not the router — keep that contract.
- `change-password` requires the current password (re-verify with bcrypt). Don't allow password change with just the access token.
- Bot/replay protection isn't in MVP. Don't add it unless asked.

## Handoff

After all layer agents return, write a final summary covering: schema change (if any), API surface, web surface, test coverage, reviewer notes resolved.
