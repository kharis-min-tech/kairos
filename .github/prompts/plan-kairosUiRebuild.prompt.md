# Plan: Kairos UI Rebuild — All 19 Screens

**TL;DR**: Implement all 19 Figma screens across 23 steps and 7 phases. Figma uses dark navy — we adapt every dark header to **dark purple** (`#3b0764`/`#4c1d95`). "Login As" is functional role validation. "Fellowships" is always the primary label. Service schedule is a `jsonb` column.

---

## Decisions locked in

- **Colors**: Primary `#6D28D9` · Gold `#D97706` · Emerald `#059669` · Rose `#E11D48` · Dark headers = dark purple (`from-purple-900 to-purple-800`), NO navy
- **Login As**: Functional — validates `systemRole` in DB; wrong role → "You don't have [role] access"; success stores `activeRoleContext` in JWT + localStorage; governs all subsequent dashboard routing/guards
- **Fellowship naming**: Headers/page titles always say "Fellowships"; K-Groups / Kharis Express / New Breeds / Kharis on Campus / Kharis on Campus Colleges appear as **subtype filter options only**
- **Service schedule**: `service_schedule jsonb` column on branches table
- **Google/Apple OAuth, 2FA toggle, Delete Account**: UI-only placeholders

---

## Phase 1 — Foundation *(all 3 steps parallel)*

1. **Install dependencies** — `recharts` → `apps/web`; `nodemailer` + `@types/nodemailer` → `apps/api`
2. **Mailer utility** — `packages/utils/src/mailer.ts`: Nodemailer Ethereal SMTP, `sendPasswordResetEmail(to, resetLink)`, logs preview URL to console
3. **Auth token infra** — Drizzle migration: add `password_reset_token` + `password_reset_expiry` cols to members; fix `forgotPassword()` (store hashed token + send email), fix `resetPassword()` (verify token vs hash); add `activeRole` to JWT payload + `@kairos/types` auth DTOs

---

## Phase 2 — Auth Pages *(parallel after Phase 1)*

4. **Login** (3:19869) — church logo, "Login As" Member/Pastor/Admin card toggle; submit → API validates role exists on user → error if unauthorized → on success: JWT contains `activeRole`, redirect by role (`/dashboard` or `/members`)
5. **Welcome/Onboarding** (3:5921) — NEW `/welcome` page; 4-slide carousel; dot pagination; Skip/Next; `localStorage.hasSeenWelcome` guard
6. **Signup** (3:5934) — polish: 3-step progress bar with purple checkmark circles, all Figma fields
7. **Email Verification** (3:6817) — 6-box OTP, auto-focus chain, 60s countdown, Resend
8. **Forgot Password** (3:10415) — lock icon, Need Help box, Contact Support + Back to Login
9. **Reset Password** (3:7626) — key icon, 4-bullet requirements checklist, strength meter, Security Notice

---

## Phase 3 — Dashboards *(parallel; depend on Phase 1 for Recharts)*

10. **Branch Dashboard** (3:6156) — dark purple header (`bg-gradient-to-r from-purple-900 to-purple-800`), week nav, 4 stat cards, Recharts `LineChart`, 2×2 quick actions, "Attention Needed" section; route-guarded: `activeRole` = `admin` or `pastor`
11. **Member Dashboard** (3:9224) — purple welcome header, stat row, events list, attendance donut (`PieChart`), departments grid, quick actions; shown when `activeRole` = `member`
12. **Reports** (3:13807) — NEW `/reports` route (admin/pastor only); dark purple header; 4 stat cards; Attendance/Giving/Growth tabs; `LineChart` + `PieChart` + `BarChart` + demographics table; same purple palette for chart colors

---

## Phase 4 — Members *(sequential)*

13. **Members Directory** (3:9280) — dark purple header, stats, alphabetical list grouping, member cards with Call/Email/⋯, floating action button
14. **Add New Member** (3:8039) — NEW `/members/new` (admin/pastor only); photo upload; 5 form sections; admin flow sets `isActive=true` directly
15. **Member Profile** (3:12143) — dark purple header with photo + "Active Member" gold badge + action buttons; Contact / Attendance / Follow-Up Notes (mock) / Financial (mock) / Ministry sections
16. **Member Status Modal** (3:12074) — dialog: Deactivate / Reactivate using existing `useDeactivateMember`

---

## Phase 5 — Fellowships *(sequential)*

17. **Fellowships List** (3:11697) — header always **"Fellowships"**; subtype filter: All / K-Groups / Kharis Express / New Breeds / Kharis on Campus / Kharis on Campus Colleges; dark purple header, stats row, group cards with leader + schedule + status badge
18. **Fellowship Detail** (3:10875) — header "Fellowships / [Group Name]"; 3 tabs: Meetings / Attendance / Members; dark purple header; next meeting card
19. **Attendance Tab** (3:11061) — inside `fellowships/[id]` as the Attendance tab; rate cards, Recharts `LineChart` trend, meetings list with progress bars, member summary table

---

## Phase 6 — Profile & Settings *(parallel)*

20. **Profile Settings** (3:19338) — purple profile card, editable personal info section, Change Password row, 2FA UI-only toggle, notification preference toggles, Danger Zone (Log Out functional, Delete Account disabled)
21. **App Settings** (3:14581) — NEW `/profile/settings`; notification toggles (localStorage), data management buttons, storage usage bar, preferences, Log Out

---

## Phase 7 — Admin *(step 22)*

22. **Branch Settings** (3:15617) — rebuild `/admin/branches/[id]`; all 6 sections (Basic Info / Location / Contact / Leadership / Service Schedule / Capacity); service schedule: dynamic add/remove rows stored as `jsonb`; Branch Status toggle; Delete + Save (purple) buttons

---

## Key files

- `apps/web/src/app/(auth)/login/page.tsx` — Login page (Step 4)
- `apps/web/src/app/(dashboard)/dashboard/page.tsx` — Branch dashboard (Step 10)
- `apps/web/src/app/(dashboard)/fellowships/page.tsx` — Fellowships list (Step 17)
- `apps/api/src/auth/service.ts` — forgotPassword/resetPassword fixes (Step 3)
- `packages/api-client/src/api.ts` — add login role context to auth endpoint types (Steps 3/4)
- `packages/database/src/schema/` — migrations for reset token cols + service_schedule jsonb (Steps 3/22)

---

## Verification checklist

1. Login with `systemRole=member`, select "Admin" → error shown; select "Member" → redirected to member dashboard
2. `recharts` renders without error on branch dashboard and reports page
3. Password reset: forgot-password → Ethereal preview URL logged → reset form → new password works
4. Fellowships page title displays "Fellowships" (not "K-Groups")
5. Branch Settings saves `service_schedule` JSON and retrieves correctly
6. Reports page dark headers use purple gradient, not navy

---

## Scope exclusions

- No real OAuth (Google/Apple = disabled buttons)
- No real 2FA
- No Delete Account functionality
- No Nodemailer production transport (Ethereal only)
- No backend for App Settings toggles (localStorage only)
