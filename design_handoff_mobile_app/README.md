# Handoff: Kairos (iKharis) Mobile App

## Overview
This is the developer handoff for the **Kairos mobile app** — a cross-platform (iOS + Android) companion to the existing web app at `kairos.kharis.org`. It is a church-management client that reuses the **same backend and API** as the web app. The mobile app serves members (self-service), fellowship/department leaders, branch admins, and pastors from a single role-aware shell.

The designs cover: onboarding (splash → language → branch), authentication (3 variants to choose from), a member Home dashboard, the core member tabs (Community/directory, Attendance check-in, Give, Profile, More), leader tools (Rota + swap, Follow-up kanban, Approvals inbox, New Believer journey, Notifications), and admin/pastor views (front-desk check-in, service attendance comparison).

## About the Design Files
The files in this bundle are **design references created in HTML** — high-fidelity prototypes showing the intended look, structure, and behavior. **They are not production code to copy directly.** The HTML is authored as a design-preview artifact (a single self-contained document rendering many phone frames), not as an app you can ship.

**The task is to recreate these designs in a real cross-platform mobile codebase** using that environment's established patterns — see the recommended stack and repo structure below. Match the visual design pixel-for-pixel, but implement it with native primitives and the app's own component library.

## Fidelity
**High-fidelity.** Final colors, typography, spacing, iconography, copy, and interaction intent are all represented. Recreate the UI faithfully using the target framework's libraries. Where a value isn't stated explicitly, read it from the prototype file (`Kairos Mobile.dc.html`) — every screen there is built with inline styles you can inspect directly.

---

## Recommended stack & repo structure

### Keep it in the existing monorepo
The mobile app shares the web app's backend, API surface, domain types, and auth. Do **not** create a separate repository. Add a new app and shared packages to the existing `kairos` monorepo:

```
kairos/
├─ apps/
│  ├─ web/            # existing Next.js web app
│  └─ mobile/         # NEW — Expo (React Native) app
├─ packages/
│  ├─ ui/             # existing KairosUI (React DOM + Tailwind) — web only
│  ├─ ui-native/      # NEW — React Native port of the DS (tokens + components)
│  └─ core/           # NEW or existing — API client, TS types, Zod schemas, auth helpers
│                     # shared by BOTH apps/web and apps/mobile
```

### Framework: Expo (React Native)
- Single codebase → iOS + Android.
- Closest mental model to the existing React web team.
- The mockups map 1:1 to RN components (each phone screen = one RN screen).

### Design system: port tokens, rebuild components
`KairosUI` (`packages/ui`) is **React DOM + Tailwind** and will **not** run on React Native. Plan:
- **Tokens port directly** — the color palette, radii, type scale, spacing (see Design Tokens below). Put them in `packages/ui-native/tokens`.
- **Components must be re-built** as thin RN equivalents in `packages/ui-native` (Button, Badge, Card, Input, Tabs, etc.) using the same names/props so the API feels identical. Use **NativeWind** (Tailwind-for-RN) if you want to keep the Tailwind class idiom, or StyleSheet objects.
- Keep the design rules from Modern Sanctuary: **sharp corners (max ~4–8px radius), gold `#f8b537` focus rings, tonal surface tiers instead of hard 1px borders, linear 1.5px-stroke icons** (`lucide-react-native`).

### Navigation
- **React Navigation** with a bottom tab navigator (5 tabs) + native stack navigators inside each tab.
- Onboarding + auth live in a separate stack shown before the authenticated tab shell.

### Shared logic (`packages/core`)
Extract from the web app and depend on from both apps:
- API client / fetch layer
- TypeScript domain types (Member, Branch, Fellowship, Department, Service, Attendance, Soul/FollowUp, NewBeliever, Approval, RotaDuty…)
- Zod validation schemas
- Auth token handling / session logic

---

## Global patterns (apply to every screen)

### App shell
- **Bottom tab bar, 5 tabs, all equal weight:** Home · Community · Check-in · Give · More.
- Active tab color `#5D3FD3`; inactive `rgba(0,0,0,.45)` light / `rgba(255,255,255,.45)` dark.
- Tab bar: translucent (`rgba(255,255,255,.92)` light / `rgba(20,20,25,.92)` dark) with `blur(16px)` and a hairline top border in the surface-border token. iOS tab bar height ~78px incl. home-indicator safe area; Android ~62px.
- Leader/admin tools are **not** extra tabs — they surface inside "More" (and inside Community/Check-in) only when the signed-in user holds the relevant capability. Design once, gate by permission.

### Roles / capability gating
One app, four modes: **member**, **leader** (fellowship/department), **branch admin**, **pastor**. The UI is member-first; leader and admin sections render conditionally. Admin full-CRUD/imports stay on web — mobile shows the read + approve + mark-attendance slice.

### Status bar / frames
Prototype draws iOS (dynamic island, home indicator) and Android (punch-hole, gesture pill) chrome for presentation only. In the real app these come from the OS + safe-area insets (`react-native-safe-area-context`).

### Theming
Light and dark both designed. Dark is class-driven in the DS; in RN drive it from `useColorScheme()` + a theme context. Dark surfaces: page `#0a0a0f`, card `#141419`, elevated `#1a1a22`. Light: page `#fafafa`, card `#ffffff`, subtle `#f4f2ee`.

---

## Screens / Views

> Content/copy below is the exact text used in the prototype (seeded with real Kharis data: head pastor **Rev Dr David Antwi**; branches Chatham, Bristol, Nottingham, Reading, Orpington, London Central, Accra, Freetown; K-Groups incl. Northfleet; Kharis Express (Swindon); services Sundays 10:00 AM at London HQ). Replace seed people/numbers with live API data.

### 1. Splash
- **Purpose:** brand entry while the app boots / restores session.
- **Layout:** full-screen dark radial gradient (`radial-gradient(ellipse at 50% 30%, #1e1050, #150d35 40%, #0c0a1a 70%, #050408)`), centered column.
- **Components:** logo tile 76×76, radius 20, brand gradient `linear-gradient(135deg,#451ebb,#5d3fd3)`, Kharis dove logo inside (52px). Wordmark "KAIROS" (Inter 800, 22px, letter-spacing .15em) + "Kharis Church" sublabel (11px, .22em, uppercase, 55% opacity). Scripture line: *"Let all things be done decently and in order."* with "decently" in `#a488ff` and "order" in `#f8b537`; caption "1 Cor 14:40". Loading spinner (20px, white top-border, 1s linear spin).

### 2. Language selection
- **Purpose:** first onboarding step; changeable later in Settings.
- **Layout:** light page, header (globe icon tile 44px), title "Choose your language", subtitle, vertical list of radio-style option cards, sticky bottom "Continue" (full-width, 46px, brand gradient).
- **Options (cards):** English (Default) — selected (1.5px `#5D3FD3` border + filled check circle); Twi (Akan · Ghana); Krio (Sierra Leone); Français (West Africa). Unselected: white card, hairline border, empty 18px ring.

### 3. Branch selection
- **Purpose:** choose home branch (step 2 of 3).
- **Layout:** back button + progress bar (66% / "2 of 3"); title "Where do you fellowship?"; search field (magnifier icon left); grouped lists under uppercase section labels "United Kingdom" and "West Africa"; sticky "Continue".
- **Branch rows:** name + service time subtitle (e.g. "Sundays · 10:00 AM"); "MAIN" badge on HQ branches. Selected row: 1.5px `#5D3FD3` border + purple check. UK: London Central (MAIN, 10:00), Chatham (10:30), Bristol (10:30), Nottingham (10:00), Reading (10:30), Orpington (11:00). West Africa: Accra (MAIN, Ghana), Freetown (MAIN, Sierra Leone).

### 4. Auth — three variants (pick one to ship)
All: light page, logo tile 48px + "Kharis Church" sublabel, card container `rounded-xl` with soft shadow.
- **4a — Email + password + biometric:** email + password fields, "Forgot?" link, primary "Sign in" (brand gradient, arrow icon), divider "Or use", dashed-border "Sign in with Face ID" button (`rgba(93,63,211,.06)` fill, `#5D3FD3` text), "Create account" footer.
- **4b — Magic link (passwordless):** single "Church email" field with gold focus ring (`1.5px #f8b537` + `0 0 0 3px rgba(248,181,55,.15)`); primary "Email me a sign-in link" (mail icon); gold info panel: only admin-added members can sign in.
- **4c — SSO-forward:** centered logo, "Continue with Apple" (black), "Continue with Google" (white, multicolor G), divider "or", outlined "Continue with email". Terms footer.

### 5. Home dashboard (member) — the hero screen
- **Purpose:** at-a-glance landing after sign-in. Designed in iOS-light, iOS-dark, Android-light (same content, native chrome).
- **Layout:** scrolling column, 16px h-padding.
- **Components (top → bottom):**
  - **Greeting row:** date ("Wednesday · 22 July", 11px muted) + "Good day, Daniel" (Inter 700, 22px); avatar 38px circle (gradient `#a488ff→#5D3FD3`, initials) with gold notification dot.
  - **Upcoming service card:** brand-gradient card (`linear-gradient(135deg,#3b0764,#5D3FD3)`), white text, gold radial glow top-right. "UPCOMING SERVICE" eyebrow, "Sunday Service", "Kharis London Central · Sun 10:00 AM"; footer row with pastor avatar (gold, "DA"), "Rev Dr David Antwi", translucent "Remind me" button.
  - **Two-up row:** Fellowship card (gold dot, "Grace K-Group", "Wed 7:00 PM · today", stacked member avatars +7) and Next-rota card (purple dot, "Ushering", "Sun 10:00 · door 2", outlined "Request swap").
  - **Alerts card:** gold-tinted, warning icon, "2 approvals awaiting you", "View →". (Leader-only.)
  - **Daily verse:** card with 3px gold left border, "DAILY VERSE" eyebrow (gold), italic verse, "— Psalm 46:10".
  - **Announcement card:** "ANNOUNCEMENT" + "PASTORAL" badge, title "Fasting week begins Monday", body.

### 6. Community (directory)
- **Purpose:** find members, fellowships, departments.
- **Layout:** title "Community" + subtitle; **segmented control** (People / Fellowships / Departments) on a `bg-muted` track; search field; horizontal filter chips (All 245, K-Group, Kharis Express, KOC, New Breeds, Choir — active chip filled `#5D3FD3`); vertical member list.
- **Member row:** 38px colored avatar (initials), name (600/13), meta line (branch or fellowship), chevron. Seed people: Ruth Adeleke, Tobi Balogun, Amina Bello, Chidera Nnamani, Sarah Williams, David Appiah.

### 7. Fellowship detail + meeting roll-call (leader)
- **Purpose:** a fellowship leader records who attended tonight's K-Group meeting.
- **Layout:** back + title ("Grace K-Group", "Wed 22 July · 7:00 PM") + overflow menu; brand-gradient summary card ("TONIGHT'S MEETING", "5 of 11 recorded", 45% progress bar, hint); filter chips (All (11), Not marked (6), Present (2), Absent (1), New here); member list; sticky bottom "Save meeting attendance".
- **Member row:** 36px avatar, name, sub, **status badge** tappable to cycle. Badge states/colors: PRESENT `#059669` on `rgba(16,185,129,.15)`; LATE `#b8801c` on `rgba(248,181,55,.18)`; ABSENT `#e11d48` on `rgba(225,29,72,.12)`; EXCUSED `#3b82f6` on `rgba(59,130,246,.12)`; unset "TAP" muted.

### 8. Attendance check-in (member)
- **Purpose:** one tap to self-mark present at the live service.
- **Layout:** title + subtitle; brand-gradient "HAPPENING NOW" card (Sunday Service, branch, "Check-in window open · 45 min" pill with pulsing green dot); centered identity chip (28px avatar "DB", name + branch) + **full-width primary "I'm here" pill** (56px, radius 12, brand gradient, check icon), caption "Tap once to mark yourself present"; bottom stat card ("This month · You checked in 3 of 3 Sundays · 100%").
- **Note:** the earlier big-yellow-circle button was removed — use the clean purple pill.

### 9. Give (WebView for MVP)
- **Purpose:** giving. **Confirmed: no native payment in the delivered MVP** — embed the existing giving web page.
- **Layout:** simulated in-app browser chrome bar ("give.kharis.org" + lock icon), then the giving page: logo tile, "Give to Kharis", scripture; purpose grid (Tithe selected / Offering / Building fund / Missions); amount display (£25.00) + quick chips (£10/£25/£50/£100); "Continue to payment"; "Secured by Stripe · payment stays on the web".
- **Implementation:** `react-native-webview` pointing at the giving URL. Native Stripe checkout is a **future** enhancement (design later). History (below) can be native.

### 10. Profile / My data (member)
- **Purpose:** view/edit own record.
- **Layout:** centered 88px avatar with edit badge; name; email · phone; badges "CONFIRMED MEMBER" (purple), "CHOIR LEAD" (gold); 3-up stat cards (Since 2021 / Attendance 86% / Given £340 YTD); grouped rows under "Church context" (Home branch, Fellowship, Departments) and "Personal" (DOB, Address, Emergency contact), each with chevron.

### 11. More (menu)
- **Purpose:** hub for everything outside the 4 primary tabs; role-gated sections.
- **Layout:** title; profile summary banner (48px avatar, name, "Kharis London Central · Choir lead", "LEADER" badge); grouped list rows (icon tile + label + sub + optional badge/chevron):
  - **For you:** Profile, Notifications (badge 3), My attendance, Giving history (£340 this year), New Believer journey (Session 3 of 4).
  - **Leader tools** (gated): Approvals (badge 2), Follow-ups (4 overdue), Rota.
  - **Settings:** Appearance (Auto), Language (English), Privacy & consent, Help & support, Sign out (destructive red).
  - Footer "Kairos v1.0 · Kharis Church".

### 12. Rota + swap request (leader)
- **Purpose:** see next duty, confirm, request/accept swaps.
- **Layout:** title "My rota"; brand-gradient **next-duty hero** ("NEXT DUTY · in 4 days", "Sunday · 26 July", Role/Time/Station columns, "Confirm" + "Request swap" buttons); swap-request panel (incoming request card: Tobi Balogun wants to swap Sun 2 Aug ↔ Sun 26 Jul, Accept/Decline); "Upcoming" list of duty rows (date tile + role + time + dept color: Ushers `#5D3FD3`, Choir `#f8b537`, Fellowship `#10b981`).

### 13. Follow-up kanban (leader / outreach)
- **Purpose:** manage the souls / follow-up pipeline.
- **Layout:** title "Follow-ups" + "Souls pipeline · 12 open"; filter + "Capture" primary button; 3-up stat tiles (4 OVERDUE red / 5 THIS WEEK gold / 3 CONVERTED green); **horizontally scrolling columns** (240px each): NEW `#5D3FD3`, FOLLOWING UP `#f8b537`, INTERESTED `#3b82f6`, CONVERTED `#10b981`. Cards: status dot (red overdue / green ok), name, source ("Sun 20 Jul · Sunday service"), footer with due text + assignee avatar. Hint "← swipe to move a card between columns" (implement drag or a move-action sheet).

### 14. Approvals inbox (leader/admin)
- **Purpose:** approve member signups, department joins, fellowship joins.
- **Layout:** title "Approvals" + "Waiting on you"; filter chips with counts (All 7, Members 3, Depts 2, Fellowship 2); cards:
  - **MEMBER SIGNUP** (purple tag): avatar, name, email·phone, 2-up detail (Home branch / DOB), actions Approve (primary) / Reject / overflow.
  - **DEPT JOIN** (blue tag): "wants to join Choir · London", applicant note, "Schedule interview" / "Reject".
  - **FELLOWSHIP** (green tag): "wants to join Grace K-Group".

### 15. New Believer journey (leader / member)
- **Purpose:** track a new believer through the discipleship sessions.
- **Layout:** back + title; enrolment card (avatar "RA" Ruth Adeleke, "Enrolled 16 Jun · Kharis London Central", gold progress bar "2 of 4 sessions · 50%", Teacher / Mentor); **vertical timeline** of sessions with a connecting rail. Session states: done (green check circle), active (gold circle + "IN PROGRESS" badge + "Mark attendance" button), locked (dashed ring). Real session titles: 1 Foundations of Faith, 2 Who is a Christian, 3 Working out your Salvation (active), 4 The Importance of Fellowship, ★ Completed (certificate + department match).

### 16. Notifications
- **Purpose:** activity + reminders feed.
- **Layout:** title + "3 unread" + "Mark all read"; grouped by Today / This week / Older; rows = colored icon tile + title + sub + timestamp; unread rows have a faint purple background + left purple dot. Types cover: overdue follow-up, member signup, rota reminder, pastoral announcement, NB session completion, rota swap request, giving receipt.

### 17. Admin check-in desk (branch admin) — turn 2 · `2a`
- **Purpose:** the desk team marks people in as they arrive for a service.
- **Layout:** brand-gradient sticky header (logo, "Check-in desk · Kharis London Central", "Sunday Service · 10:00 AM", "Live" chip) with 3 dark stat tiles (128 Checked in / 4 First-timers / 43 Absent); sticky action bar: **"Scan QR"** (primary) + **"Walk-in"** (outlined) + search field; queue heading "At the desk · last 6" + "View all →"; queue rows.
- **Queue row states:** CHECKED IN (green badge + time), CHECKING… (purple spinner, left purple border), FIRST-TIMER (gold left border + "Register" gold button), ready ("Check in" primary button). Family tip callout (gold) — long-press to check in a family group.

### 18. Service attendance comparison (pastor / admin) — turn 2 · `2b`
- **Purpose:** pastor/admin sees how today compares and who's missing.
- **Layout:** header (back, "Service attendance", "Kharis London Central · Sundays", add button) + range chips (6 weeks active / 3 months / YTD / Compare branches); **hero stat** "128 checked in today" with "−26% vs. 6-week avg" in red down-arrow, "43 confirmed members not yet seen"; **bar chart** of 6 weeks (22 Jun→27 Jul), today's bar in brand gradient, others muted; insight callout; **By fellowship · today** progress rows (Grace K-Group 8/11, Northfleet 6/9, Kharis Express 12/24, New Breeds 5/15 "LOW"); **Missing today** list (count badge 43) with per-person "Away N weeks" + "Assign →", and "See all 43 missing".

---

## Interactions & Behavior
- **Tab switching:** bottom bar swaps the active screen; active icon+label recolor to `#5D3FD3`. (Prototype's top interactive frame demonstrates this live.)
- **Onboarding flow:** Splash → Language → Branch (3-step progress) → Auth → authenticated tab shell.
- **Check-in (member):** single tap on "I'm here" posts attendance for the live service; success → confirmation + month stat updates.
- **Roll-call (leader):** tapping a member's status badge cycles Present → Late → Absent → Excused → unset; "Save meeting attendance" commits.
- **Rota swap:** "Request swap" opens a picker of swappable duties; incoming requests show Accept/Decline inline.
- **Kanban:** drag a card between columns (or long-press → "Move to…" action sheet as a simpler v1); "Capture" opens the new-soul form.
- **Approvals:** Approve/Reject are optimistic with undo; "Schedule interview" opens a date picker.
- **Admin desk:** Scan QR opens camera scanner; Walk-in opens a quick-add; row "Check in" posts attendance; "Register" (first-timer) opens the first-timer form.
- **Spinner animation:** 360° rotate, ~0.8–1s linear, infinite (loading/checking states).
- **Pulse dot:** opacity 0.35↔1, 1.5–1.6s ease-in-out, infinite (live indicators).
- **Transitions:** standard native stack push/pop; modals for capture/approve confirmations.

## State Management
Per-screen state the client needs (fetched from the shared API):
- **Session/auth:** current user, roles/capabilities, selected branch, language.
- **Home:** upcoming service, my fellowship + next meeting, my next rota duty, pending approvals count (if leader), daily verse, latest announcement.
- **Community:** paged member/fellowship/department lists, active segment, search query, active filter chip.
- **Roll-call:** meeting id, member list with per-member status (local until "Save"), counts.
- **Check-in:** live service id + check-in window state, my attendance status, month streak.
- **Rota:** my duties list, next duty, incoming swap requests.
- **Follow-ups:** souls grouped by pipeline stage, per-card assignee + due/overdue.
- **Approvals:** queued items by type with counts.
- **New Believer:** enrolment + ordered sessions with completion state.
- **Notifications:** grouped feed, unread count.
- **Admin desk:** live check-in counts, arrival queue, member search.
- **Attendance comparison:** weekly series, per-fellowship breakdown, missing list.

Use the shared `packages/core` API client + types; keep server state in React Query (TanStack Query) and only ephemeral UI state (selected filter, unsaved roll-call) in local component state.

## Design Tokens

### Colors
| Token | Hex | Use |
|---|---|---|
| Brand primary | `#5D3FD3` | primary actions, active states, accents |
| Brand gradient | `linear-gradient(135deg, #451ebb → #5d3fd3)` | primary buttons, hero cards |
| Deep hero gradient | `linear-gradient(135deg, #3b0764 → #5d3fd3)` | service/rota/check-in hero cards |
| Brand light | `#a488ff` | avatar gradients, scripture emphasis |
| Gold accent | `#f8b537` | highlights, focus rings, "in progress" |
| Gold text-on-light | `#b8801c` / `#8a5a08` | gold text needing contrast |
| Success | `#10b981` / text `#059669` | present, converted |
| Destructive | `#e11d48` | absent, overdue, reject, sign out |
| Info | `#3b82f6` | excused, dept tags |
| Page (light) | `#fafafa` | app background |
| Card (light) | `#ffffff` | cards |
| Subtle (light) | `#f4f2ee` | muted tracks/fills |
| Page (dark) | `#0a0a0f` | app background |
| Card (dark) | `#141419` | cards |
| Elevated (dark) | `#1a1a22` | raised surfaces |
| Ink (light) | `#1a1c1c` + opacity ramps (.9/.7/.55/.5/.45/.4/.3) | text tiers |

### Typography
- **Family:** Inter (300–800). Ship Inter with the app (`expo-font`); it's the DS face.
- **Scale used:** screen titles 22px/700 (letter-spacing −.01em); hero numbers 26–42px/700–800; card titles 13–15px/600–700; body 12.5–14px/400; meta 10.5–11px/400 muted; eyebrows 9.5–10px/600 uppercase letter-spacing .12–.14em.
- `text-wrap: pretty` on multi-line copy where the platform supports it.

### Radii
- Cards / buttons: 8–12px. Small chips/tags: 3–6px. Avatars: full circle. Pills (status/window): fully rounded. **Keep corners sharp per Modern Sanctuary — do not exceed ~12px.**

### Spacing
- Screen h-padding 16px. Card padding 12–18px. Inter-card gap 6–12px. Section eyebrow → content gap 8px.

### Shadows
- Card (light): `0 1px 3px rgba(0,0,0,.04)`. Hero button: `0 12px 30px -12px rgba(93,63,211,.55)`. Elevated logo/avatars: `0 20px 40px -12px rgba(93,63,211,.4)`. Dark cards: near-flat, use tonal surface tiers not shadows.

## Assets
- **Logo:** `Kharis_Logo_transparent_noText.png` (included in this bundle, under `assets/`). Transparent PNG, no wordmark — used on splash, auth, give, and admin-desk header. Ship at appropriate `@2x/@3x` densities; consider an SVG version for crispness.
- **Icons:** linear 1.5px-stroke line icons (the prototype uses inline SVG paths equivalent to **lucide**). Use `lucide-react-native`.
- No other raster assets — all UI is vector/CSS.

## Screenshots
Annotated PNG captures of every screen live in `screenshots/` (2× resolution). Use them to match pixel details without running the prototype:

| File | Screen |
|---|---|
| `01-splash.png` | Splash |
| `02-language.png` | Language selection |
| `03-branch.png` | Branch selection |
| `04-auth-password-biometric.png` | Auth 4a — email + password + biometric |
| `05-auth-magic-link.png` | Auth 4b — magic link |
| `06-auth-sso.png` | Auth 4c — SSO-forward |
| `07-home-ios-light.png` | Home dashboard — iOS light |
| `08-home-android-light.png` | Home dashboard — Android light |
| `09-home-ios-dark.png` | Home dashboard — iOS dark |
| `10-community.png` | Community / directory |
| `11-fellowship-rollcall.png` | Fellowship detail + meeting roll-call |
| `12-checkin-member.png` | Attendance check-in (member) |
| `13-give.png` | Give (WebView) |
| `14-profile.png` | Profile / My data |
| `15-rota-swap.png` | Rota + swap request |
| `16-followups-kanban.png` | Follow-up kanban |
| `17-approvals.png` | Approvals inbox |
| `18-new-believer-journey.png` | New Believer journey |
| `19-notifications.png` | Notifications |
| `20-admin-checkin-desk.png` | Admin check-in desk |
| `21-attendance-comparison.png` | Service attendance comparison |

## Files
- `Kairos Mobile.dc.html` — the full high-fidelity prototype (all 18 screens + the interactive iOS tab demo). Open in a browser to inspect exact inline-style values, colors, and copy for any element. This is the single source of visual truth.
- `assets/Kharis_Logo_transparent_noText.png` — logo asset.

> The `.dc.html` is a design-preview document (it uses a small preview runtime to render the phone frames). Treat it as a **visual reference**, not as importable app code.
