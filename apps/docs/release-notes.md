# Release Notes

## July 2026

### What's live

This is the first public release of Kairos. The following modules are fully shipped and available:

- **Authentication** — Registration, login, password reset, approval workflow, JWT tokens with functional grants
- **Branches & Regions** — Full branch and region management with soft deletes and leadership history
- **Members** — Complete member directory, profiles, CSV import/export, approval queue, safeguarding review
- **Fellowships** — All fellowship types, map view with postcode/country search and travel time estimates, meeting attendance, follow-ups
- **Departments** — All ministry types, roster management, join request workflow, follow-ups, recruitment pipeline (Application → Interview → Offer → Probation → Member), rota templates and scheduling, uniform schedule
- **Attendance** — Service attendance recording and check-in, My Attendance personal view with 12-week history and streak
- **Outreach Programs** — Program creation, worker registration, soul capture integration
- **Souls Pipeline** — Kanban board (New → Following Up → Interested → Converted), follow-up logging, critical/monitor/on-track health indicators, CSV export
- **New Believers** — Four-session discipleship pipeline (Foundations of Faith → Who is a Christian → Working out your Salvation → The Importance of Fellowship → Completed → Joined a Department), session scheduling, attendance recording, stale alerts
- **Forms & Data Capture** — First-Time Visitor, New Believers Class, Baptism, Testimony, Baby Naming, Baby Dedication; form submissions view with filters and CSV export; dormant attendees tool
- **Souls Dashboard** — Pipeline status donut, souls by status bar chart, follow-up health, conversion funnel, stage assimilation rates, time range and program filters
- **Reports & Analytics** — Admin and Pastor dashboards, membership growth chart, weekly attendance rate chart, outreach metrics, top fellowships attended
- **Profile** — Personal information, community membership, leadership roles, emergency contact
- **Settings** — Password change, email change, recent sign-ins, theme (light/dark/system), language, email preferences, legal & consent

---

### Coming soon

- **Additional languages** — Multi-language support beyond English

---

### Known limitations

- Profile photo upload (field exists, upload endpoint coming at cloud migration)
- Transactional email delivery (password reset and approval emails appear in API response in development mode — SES delivery wires up at cloud migration)
- Power BI / S3 data export (cloud-deferred)
