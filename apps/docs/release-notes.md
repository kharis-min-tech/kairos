# Release Notes

## October 2026

### Permissions

- **Welfare split from safeguarding.** Reading pastoral welfare concerns is now its own permission. It used to ride on general branch access, which meant a Branch Data Admin, a records role with no pastoral standing, could read both the welfare and the safeguarding inbox. See [Capability Reference](/administration/capabilities#why-welfare-and-safeguarding-are-separate).
- **Safeguarding Head**, a church-wide grant that reads every branch's safeguarding queue. The escalation route above a branch's Safeguarding Lead, for when a concern needs to leave the branch it was raised in.
- **Safeguarding sight now follows the office of Main Pastor.** Whoever currently holds the Main Pastor appointment for a branch automatically sees that branch's safeguarding queue. A Minister holding the same branch grant does not. This grant is derived from the leadership record and is not assignable.
- **"Elder" renamed to "Minister"** in branch leadership.
- Fixed: a refreshed sign-in token was being minted with an empty permissions list, which silently removed every permission-gated button and page until the person signed out and back in.

### Follow-ups and concerns

- **A follow-up now declares its own context**: a fellowship, a department, or just the branch. The branch option means **somebody who belongs to no group at all can now be followed up**, which was previously impossible: a follow-up had to hang off a group, so the people most in need of contact were exactly the people the system could not record contact for.
- **New Follow-ups page** with three queues: **First-timers** (came through a welcome form in the last 60 days, nobody has made contact), **No group** (in no fellowship and no department), and **Due** (a next-contact date that has arrived).
- **New Concerns inbox** with separate welfare and safeguarding tabs, each visible only to whoever can read it.
- **Follow-up Team** added as a department type, distinct from Host Team which greets on the day.

### Dashboard

- **The control centre was rebuilt.** Seven persona-specific variants hidden behind one URL became one set of blocks, selected by the altitude your grants put you at. Among other things this fixed a fellowship leader seeing branch-wide numbers, because the old arrangement fell them through to the branch variant.
- **Pulse warnings**: unrecorded registers, drifting members, branches falling behind, and branches with no Main Pastor, each as a link to where you would fix it.
- **Needs you** collects what is actually waiting on you. Approvals used to be a number on a card you had to notice.
- **Recent activity** is now a real feed from five sources: registrations, forms, membership graduations, fellowship meetings, and souls reached.
- Sidebar sections are collapsible, and the section holding your current page opens itself.

### Other

- Group leaders now see their own people's New Believers and membership class progress, narrowed by who is in their group rather than by branch.
- Pick-or-type member references on the first-timer guardian field and both baby-form parent fields.
- Redesigned sign-in page.

---

## September 2026

### Membership classes

The whole module is new. See [Membership Classes](/platform/membership).

- The four-week class, with cohorts, sessions, per-session registers, homework and quiz marks, a final test, and an induction.
- **Enrolment is not self-service.** Express interest, join the pool, and a membership administrator admits you into a cohort. Pool entries last 180 days.
- **Membership Admin**, a church-wide grant, because cohorts draw from every branch and no branch grant could describe authority over one.
- **Membership Champion**, a per-branch read-only grant: sight of the local waitlist and admitted members, plus that branch's membership notifications.
- **A graduation gate** with six requirements, an admin override that demands a written reason, and per-cohort pass marks so a run can set its own bar.
- Graduating stamps the member's record, which is what makes the **Confirmed members** figure in reports mean something specific.
- Four lifecycle notifications to the branch's Main Pastor and Membership Champions: joined the waitlist, admitted, graduated, withdrew or lapsed.

### Other

- Longer sign-in sessions, so biometric sign-in on mobile stays armed between password sign-ins.
- One merged address suggestion list, shared across web and mobile.

---

## August 2026

### Sign-in

- **Sign in with Google, Microsoft, or Apple**, alongside email and password. All routes arrive at the same account, so somebody who registered with a password can later sign in with Google and remain the same person with the same history.
- An onboarding gate for new single-sign-on accounts, and a security email whenever a provider is linked to an existing account.

### Attendance

- **Self check-in.** Members can record themselves at a service: one tap, or by scanning a QR code on the welcome-desk screen that refreshes every 30 seconds, so last Sunday's screenshot does not work.
- Per-branch control of the check-in window and the late threshold.
- **Attendance Reports**, a new detailed surface: a per-member heatmap over 13 weeks with missing-streak counts, attendance frequency bands from Weekly to Dormant, a first-time versus returning split, and an **engaged-member denominator** you can set to 3, 6, or 12 months. See [Attendance Reports](/analytics/attendance-reports).

### Follow-ups

- **Follow-ups were redesigned around their real shape**: a Contact or a Visit, with multi-channel contact (one attempt across call, text, and WhatsApp is one record rather than three), visit kind, announced or not, arrival and departure, outcome, and companions.
- Orthogonal **welfare** and **safeguarding** flags on any follow-up.
- Follow-up history on the member profile, as one timeline across every context.

### Maps and addresses

- **Mapbox** became the single map and address-autofill provider across web and mobile.
- Address autofill wired through signup, members, branches, fellowships, and profile.
- Fellowships and branches now store their own address and coordinates.

### Documentation

- This documentation site went live at **docs.kairos.kharis.org**, with **Help & Guides** entry points in the app sidebar, on the landing page, and on the welcome screen.

---

## July 2026

### First release

- **Authentication**: registration, login, password reset, approval workflow, tokens carrying functional grants
- **Branches & Regions**: full branch and region management with soft deletes and leadership history
- **Members**: directory, profiles, CSV import and export, approval queue, safeguarding review
- **Fellowships**: all fellowship types, map view with postcode and country search and travel time estimates, meeting attendance, follow-ups
- **Departments**: all ministry types, roster management, join request workflow, follow-ups, recruitment pipeline (Application → Interview → Offer → Probation → Member), rota templates and scheduling, uniform schedule
- **Attendance**: service attendance recording and check-in, My Attendance with 12-week history and streak
- **Outreach Programs**: program creation, worker registration, soul capture integration
- **Souls Pipeline**: Kanban board (New → Following Up → Interested → Converted), follow-up logging, critical/monitor/on-track health indicators, CSV export
- **New Believers**: four-session discipleship pipeline, session scheduling, attendance recording, stale alerts
- **Forms & Data Capture**: First-Time Visitor, New Believers Class, Baptism, Testimony, Baby Naming, Baby Dedication; submissions view with filters and CSV export; dormant attendees tool
- **Souls Dashboard**: pipeline status donut, souls by status, follow-up health, conversion funnel, stage assimilation rates, time range and program filters
- **Reports & Analytics**: membership growth, weekly attendance rate, outreach metrics, top fellowships attended
- **Profile**: personal information, community membership, leadership roles, emergency contact
- **Settings**: password change, email change, recent sign-ins, theme, language, email preferences, legal and consent

---

## Shipped since, and worth knowing

- **Export my data** and **Delete my account** are live in **Settings → Privacy & Data**. They were listed as coming soon in the first release.
- **Profile photo upload** works end to end.
- **Transactional email** is delivered for real, through Amazon SES. The first release noted that password reset and approval emails only appeared in the API response in development mode.
- **Notification preferences** per category, in **Settings → Notifications**.
- **Acceptable Use Policy** and **Confidentiality Undertaking** joined the Terms and the Privacy Notice, with version tracking and re-acceptance when a policy is reissued.

---

## In testing

- **A mobile app** for Android and iOS, covering most of what the web app does, plus biometric sign-in and offline register-taking. Built from the same API. Not yet distributed through the app stores.

---

## Coming soon

- **Additional languages**: multi-language support beyond English
