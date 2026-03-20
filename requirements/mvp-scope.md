# Kairos - MVP Scope Definition

## Document Overview
This document defines the Minimum Viable Product (MVP) scope for Kairos church administration system, targeting Easter 2026 launch (April 12, 2026). This represents a 10-week development timeline with a phased rollout approach.

---

## Timeline & Phasing Strategy

**Total Timeline:** 10 weeks (February 3 - April 12, 2026)

### Phase 1: Soft Launch (Week 8 - March 30, 2026)
- Core admin features functional
- Internal testing with leadership team
- Admin-only access

### Phase 2: Easter Launch (Week 10 - April 12, 2026)
- All MVP features live
- Member-facing features enabled
- Public launch for all church members

---

## User Personas (MVP)

### Primary Users
1. **Church Administrators** - Full system access, manage all aspects
2. **Pastors/Leadership** - Branch-level management, view reports
3. **Department/Fellowship Leaders** - Manage their groups, track members
4. **Regular Members** - Self-service profile, donations, forms

### Out of Scope for MVP
- Regional Coordinators (regional views deferred to Phase 2)
- System Admins (technical role, not user-facing features)

---

## Core Modules (MVP)

## 1. Authentication & Security

### Must Have (Week 2-3)
- User registration and login (Cognito)
- Password reset via email
- Role-based access control (Admin, Pastor, Leader, Member)
- Custom authorization lambda for branch-level isolation
- Session management (secure tokens)

### Authorization Rules
- **Admins:** Full access to all data
- **Pastors:** Access only to their assigned branch data
- **Leaders:** Access only to their department/fellowship data
- **Members:** Access only to their own profile and public data

### Security Requirements
- Encryption in transit (TLS 1.2+)
- Encryption at rest (AES-256 via Aurora)
- No hardcoded credentials
- Input validation on all forms
- SQL injection protection (via Drizzle ORM)
- XSS protection

### Out of Scope for MVP
- Multi-factor authentication (MFA)
- Audit logs (detailed access tracking)
- Advanced session controls (device management)

---

## 2. Membership Management

### Must Have (Week 3-4)

**Member Registration:**
- Self-registration flow (name, email, phone, DOB, gender, address)
- Member selects home branch during registration
- Email verification
- Branch admin approval required before full access granted
- Pending members can view their own profile and donations only
- Unique member ID generation
- Profile photo upload (S3 + CloudFront)

**Member Profile:**
- View/edit personal information
- Update contact details
- View membership status (active/inactive)
- View assigned departments
- View fellowship/K-group membership
- View donation history

**Admin Functions:**
- Add/edit/deactivate members (soft delete, keep history)
- Approve new member registrations
- Search members (by name, email, phone)
- Filter members (by branch, department, fellowship, status)
- Bulk member import (CSV upload)
- Export member list (CSV)
- Data retention follows industry standards (GDPR compliance)
- Handle explicit deletion requests on case-by-case basis

**Member Data Fields:**
- First name, last name
- Email, phone
- Date of birth, gender
- Address (street, city, postal code, country)
- Home branch
- Membership date
- Emergency contact (name, phone, relationship)
- Profile photo
- Active/inactive status

### Out of Scope for MVP
- Family grouping/relationships
- Custom fields
- Member history/audit trail
- Birthday reminders
- Digital ID cards with QR codes
- Door entry system integration
- Hidden member categories (super admin feature)

---

## 3. Branch & Pastor Management

### Must Have (Week 2)

**Branch Management:**
- Create/edit/deactivate branches
- Branch details (name, address, phone, email)
- Branch types (Main, Satellite, Cell, Campus, Online)
- Assign region to branch

**Leadership Assignment:**
- Assign main pastor to branch
- Assign elders to branch
- Track leadership start/end dates
- Only one current main pastor per branch
- Leadership history (who was pastor when)

**Branch Isolation:**
- Pastors see only their branch data
- Members assigned to home branch
- All data filtered by branch context

### Out of Scope for MVP
- Regional coordinator views
- Cross-branch reporting
- Leadership approval workflows
- Multiple pastor roles (associate pastors, etc.)

---

## 4. Department Management

### Must Have (Week 4-5)

**Department Setup:**
- Global department definitions (Choir, Ushers, Drama, etc.)
- Branch-specific department instances
- Assign lead member per department
- Assign deputy member (optional)

**Member Assignment:**
- Members request to join department (max 2 at once)
- Request goes to department leader for approval
- Branch admin can view requests (visibility only)
- Leader approves/rejects
- System warns if member already in 2 departments (admin can override)
- Members can belong to multiple departments
- View department roster

**Department Leader Functions:**
- View all department members
- Approve/reject join requests (branch admin has visibility only)
- Send broadcast messages to their own department only
- Send messages to subset of members in their department
- Add follow-up notes on members (date, time, notes)
- View member contact details
- Alerts for members not followed up (default: 7 days, configurable by admin)
- Follow-up notes visible to other leaders (for collaboration)

**Recruitment Workflow:**
- Member submits interest via form
- Request goes to department leader
- Leader approves/rejects
- Member added to department

### Out of Scope for MVP
- Department meeting attendance tracking
- Historical records of who left when
- Department-specific features (Choir audio uploads, uniform management, etc.)
- Rota/scheduling system
- Department calendars
- Self-check-in for members (Phase 2)

---

## 5. Fellowship Management (K-Groups)

### Must Have (Week 5)

**Fellowship Types:**
- K-Groups
- Kharis Express
- New Breeds
- Kharis on Campus
- Kharis on Campus Colleges
- (Configurable - can add more types)

**Fellowship Setup:**
- Create fellowship (name, type, branch, meeting day/time, location)
- Assign leader
- Assign co-leader (optional)
- Active/inactive status

**Member Management:**
- Members join fellowships
- View fellowship roster
- Leader can add/remove members
- Members can belong to ONE fellowship at a time

**Fellowship Leader Functions:**
- View all fellowship members
- Send broadcast messages to fellowship
- Send messages to subset of members
- Add follow-up notes on members
- View member contact details

**Fellowship Meetings:**
- Track meeting attendance (date, member, status: Present/Absent/Excused/Late)
- Record meeting notes/topics

### Out of Scope for MVP
- Fellowship calendars
- Recurring meeting schedules
- Meeting reminders

---

## 6. Attendance Tracking

### Must Have (Week 6)

**Service Attendance:**
- Record attendance for Sunday services
- Service details (date, type: Sunday Service/Midweek/Special, branch)
- Mark members as Present/Absent/Virtual
- Track first-time visitors
- Bulk attendance entry (select multiple members)
- Recorded by: Admins, Pastors, or Leaders

**Fellowship Attendance:**
- Record attendance for fellowship meetings
- Meeting details (date, fellowship, location)
- Mark members as Present/Absent/Excused/Late
- Notes per meeting
- Recorded by: Fellowship leader or designated delegate

**Attendance Reports:**
- Service attendance trends (last 4 weeks)
- Fellowship attendance summary
- Members missing from recent services (engagement tracking)
- Attendance percentage by branch

### Out of Scope for MVP
- Department meeting attendance
- Event attendance (events not in MVP)
- QR code check-in
- Automated attendance via door entry system

---

## 7. Outreach Program Management

### Must Have (Week 6-7)

**Outreach Program Creation:**
- Create outreach program (name, description, date, location, branch)
- Program types (Jesus Campaign, Community Outreach, etc.)
- Assign coordinator
- Active/inactive status

**Worker Registration:**
- Members can register to participate as workers
- Can only register for their own branch's outreach programs
- View registered workers
- Workers can see their assigned outreach programs

**Cross-Branch Note:**
- If member travels to another branch temporarily, admin can change their home_branch_id
- Phase 2 can add cross-branch outreach registration if needed

**Soul Capture Integration:**
- Link souls captured to specific outreach program
- Track which programs are most effective (conversion rates)

**Outreach Reports:**
- Souls captured per program
- Conversion rates per program
- Worker participation

### Out of Scope for MVP
- Worker check-in/attendance at programs
- Program budget tracking
- Program materials/resources management

---

## 8. Evangelism Management (Soul Capture & Follow-up)

### Must Have (Week 6-7) - CRITICAL

**Soul Capture:**
- Capture soul via form (name, phone, email, address, date, source)
- Source types:
  - Linked to outreach program
  - Ad-hoc (individual member evangelism)
- Capture location/context
- Immediate assignment to worker

**Soul Assignment:**
- Soul automatically assigned to the member who captured it
- Can be reassigned to different worker if needed
- Worker can see all assigned souls

**Follow-up Tracking:**
- Log follow-up interactions (date, time, method, notes)
- Follow-up methods: Phone Call, Home Visit, Text Message, Email, In-Person Meeting
- Follow-up status: Successful, No Answer, Call Back Later, Not Interested
- Track duration of follow-up

**Soul Status Pipeline:**
- New → Following Up → Interested → Converted / Not Interested
- Automated alerts if no follow-up in 2-3 days (configurable by admin)
- Status change triggers notifications

**Conversion:**
- Mark soul as converted
- Link converted soul to member record (optional)
- Track conversion date

**Follow-up Views:**
- Worker dashboard: My assigned souls
- Leader dashboard: All souls by branch/department
- Overdue follow-ups (needs attention)
- Conversion funnel report

### Out of Scope for MVP
- Automated follow-up reminders via SMS
- Follow-up scheduling/calendar
- Bulk soul import

---

## 9. Financial Management (Donations)

### Must Have (Week 7-8) - CRITICAL

**Donation Recording:**

**Online Donations (Stripe):**
- Stripe payment integration (GBP only for MVP)
- Member selects donation purpose (Offering, Tithe, Building Fund, Other)
- If "Other", description required
- Payment methods: Card, Bank Transfer
- Donation receipt via email (SES)
- Link donation to member and branch
- International cards accepted (Stripe handles currency conversion)

**Manual Donation Entry (Cash/Check):**
- Admin records cash/check donations
- Capture: member (optional), amount (GBP), currency, date, purpose, payment method
- Can record donation without linking to member (anonymous walk-in donor)
- Can link to member if known
- Payment methods: Cash, Check, Bank Transfer, Mobile Money
- Optional anonymity flag (shows as "Anonymous" in reports)
- Recorded by (admin who entered it)

**Donation History:**
- Members view their donation history
- Filter by date range, purpose
- Total giving summary

**Donation Reports:**
- Total donations by branch
- Donations by purpose (Offering, Tithe, Building Fund, Other)
- Top donors (shows "Anonymous" for anonymous donations, not hidden)
- Date range filtering
- CSV export

**Branch-Level Reporting:**
- Pastors see only their branch donations
- Admins see all branches

### Out of Scope for MVP
- HMRC tax year reports (Phase 2)
- Pledge tracking (Phase 2)
- Recurring donations
- Donation campaigns
- Gift aid tracking

---

## 10. Forms & Data Capture

### Must Have (Week 8-9)

**Form Builder:**
- Drag-and-drop form builder
- Field types: Text, Email, Phone, Number, Date, Dropdown, Checkbox, Radio, Textarea
- Required field validation
- Email format validation
- Form templates (save and reuse)
- Auto-populate fields from member profile (if logged in)
- Permissions: Admins and Leaders can create forms
- Form scope: Branch-specific or Church-wide (configurable)
- Branch-specific forms only accessible to that branch's members

**Pre-built Forms:**
1. Department signup request
2. Soul capture (evangelism)
3. Baby naming request
4. Baby dedication request
5. First-time visitor form
6. Altar call form (new believers)
7. Baptism request
8. Testimony submission

**Form Submissions:**
- Store submissions in database
- Admin views all submissions
- Filter by form type, date, branch
- Export submissions (CSV)
- Link submissions to member records where applicable

**Form Integration:**
- Soul capture form → creates soul record + assigns to worker
- Department signup form → creates join request for leader approval
- Baby dedication/naming → creates request for admin review

### Out of Scope for MVP
- Conditional logic (if X then show Y)
- Multi-page forms
- File uploads in forms
- Approval workflows (beyond department signup)
- Form analytics

---

## 11. Notifications & Communications

### Must Have (Week 9)

**Email Notifications (SES):**
- Welcome email on registration
- Password reset email
- Donation receipt email
- Form submission confirmation
- Follow-up assignment notification

**In-App Notifications:**
- Notification center (bell icon)
- Notification types: Announcement, Reminder, Alert
- Mark as read/unread (no read receipts for MVP)
- Notification targeting:
  - All members
  - Specific branch
  - Specific department
  - Specific fellowship
  - Specific role (pastors, leaders)

**Broadcast Messages:**
- Admins send to all members or specific branches
- Leaders send to their own department/fellowship only
- Message includes title, body, priority (Low, Normal, High, Urgent)
- Optional expiration date

### Out of Scope for MVP
- SMS notifications
- Push notifications (mobile app)
- Email templates with rich formatting
- Scheduled notifications
- Notification preferences (user controls)

---

## 12. Reporting & Analytics

### Must Have (Week 9-10)

**In-App Dashboards:**
- **Admin Dashboard:**
  - Total members (active)
  - Total branches
  - Total departments
  - Total fellowships
  - Recent donations (last 30 days)
  - Recent souls captured (last 30 days)
  - Service attendance % (last 4 weeks)

- **Pastor Dashboard (Branch-specific):**
  - Branch member count
  - Branch donations (last 30 days)
  - Branch attendance trends
  - Souls captured in branch
  - Overdue follow-ups
  - Pastors can only see their own branch reports

- **Leader Dashboard:**
  - Department/fellowship member count
  - Recent attendance
  - Members needing follow-up
  - Leaders can only see their own department/fellowship data

**Pre-built Reports:**
- Member list (filterable, exportable)
- Attendance trends (chart: last 8 weeks)
- Donation summary (by purpose, by branch)
- Soul conversion funnel
- Overdue follow-ups

**CSV Export:**
- Export any list view (members, donations, souls, attendance)
- Date range filtering
- Branch filtering

**Power BI Integration:**
- Nightly S3 export (Parquet format)
- Export tables: members, donations, attendance, souls, branches, departments, fellowships
- EventBridge scheduled lambda (2 AM daily)

### Out of Scope for MVP
- Custom report builder
- Advanced charts/visualizations
- Real-time dashboards
- Scheduled report emails

---

## 13. Data Import/Export

### Must Have (Week 3)

**Member Import:**
- CSV upload
- Map CSV columns to member fields
- Validation before import
- Preview import (show errors)
- Bulk create members
- Assign to branch during import

**Data Export:**
- Export members (CSV)
- Export donations (CSV)
- Export attendance (CSV)
- Export souls (CSV)
- Date range and filter support

### Out of Scope for MVP
- Import other entities (departments, fellowships, etc.)
- Excel file support (.xlsx)
- Import history/audit trail
- Scheduled exports

---

## Platform & Interface Requirements

### Web Application (Next.js)

**Must Have (Week 1-10):**
- Fully responsive (works on mobile browsers)
- Modern UI (clean, intuitive)
- Fast page loads (< 3 seconds)
- Works on Chrome, Firefox, Safari, Edge
- Accessible (WCAG 2.1 AA compliance)

**Key Screens:**
- Login/Registration
- Member dashboard
- Admin dashboard
- Pastor dashboard
- Leader dashboard
- Member list
- Department management
- Fellowship management
- Attendance tracking
- Donation entry/history
- Soul capture/follow-up
- Form builder
- Reports

### Mobile App (React Native)

**Deferred to Phase 2:**
- Native iOS/Android apps
- All web features available via mobile browser for MVP
- Native app development starts post-Easter

**Rationale:** Next.js web app is fully responsive and works perfectly on mobile browsers. This saves 2-3 weeks of development time. Native apps can be built in Phase 2 with real user feedback.

---

## Non-Functional Requirements (MVP)

### Performance
- Page load time: < 3 seconds
- API response time: < 500ms (p95)
- Support 500 concurrent users (MVP scale)
- Database queries optimized (indexes on foreign keys, search fields)
- UK timezone (Europe/London) for all timestamps

### Security
- All requirements from stack.md (encryption, RBAC, etc.)
- Branch-level data isolation enforced
- Input validation on all forms
- SQL injection protection (Drizzle ORM)
- XSS protection (React escaping)
- HTTPS only

### Availability
- 99% uptime target
- Automated backups (Aurora daily snapshots)
- Point-in-time recovery (7 days)
- Staging environment for testing

### Scalability
- Architecture supports 1000+ churches
- Lambda auto-scales per operation
- Aurora Serverless v2 auto-scales
- CloudFront caching reduces load

---

## Out of Scope for MVP (Phase 2+)

### Deferred Features
- Learning Management System
- Event sign-up and management (full events module)
- Inventory and requisition management
- Room booking system
- Data Protection compliance tools (SAR, DPIA, breach management)
- Cybersecurity audit tools
- Member-to-member household item exchange
- Digital ID cards with QR codes
- Department-specific features:
  - Choir audio recording review
  - Uniform management
  - Children's department (classes, teachers, allergies)
  - Rota systems
- Advanced forms (conditional logic, file uploads, multi-page)
- SMS notifications
- Push notifications
- Mobile native apps (iOS/Android)
- HMRC tax year reports
- Pledge tracking
- Regional coordinator views
- Multi-factor authentication
- Audit logs
- Advanced analytics
- Custom report builder

---

## Success Criteria (Easter Launch)

### Must Be Functional:
1. ✅ Members can register and log in
2. ✅ Admins can manage members, branches, departments, fellowships
3. ✅ Pastors can view their branch data only
4. ✅ Leaders can manage their departments/fellowships
5. ✅ Members can view/edit their profile
6. ✅ Members can view donation history
7. ✅ Donations can be recorded (online + manual)
8. ✅ Attendance can be tracked (services + fellowships)
9. ✅ Souls can be captured and assigned for follow-up
10. ✅ Workers can log follow-ups and track status
11. ✅ Forms can be created and submitted
12. ✅ Basic reports and dashboards work
13. ✅ CSV export works
14. ✅ Power BI data export works
15. ✅ Email notifications work
16. ✅ Web app works on mobile browsers

### Performance Targets:
- 500 members registered
- 5 branches active
- 20 departments active
- 10 fellowships active
- 100 souls captured
- 500 donations recorded
- < 3 second page loads
- 99% uptime

---

## Development Phases (10 Weeks)

### Week 1-2: Foundation
- Monorepo setup (Turborepo)
- AWS CDK infrastructure
- Aurora Serverless v2 setup
- Drizzle schema and migrations
- Cognito authentication
- Basic Next.js app structure
- CI/CD pipeline (GitHub Actions)

### Week 3-4: Core Entities
- Member management (CRUD, import, export)
- Branch management
- Department management
- Fellowship management
- Authentication flows
- Authorization lambda
- Admin dashboard skeleton

### Week 5-6: Attendance & Outreach
- Service attendance tracking
- Fellowship attendance tracking
- Outreach program management
- Soul capture forms
- Soul assignment and follow-up tracking
- Follow-up alerts

### Week 7-8: Financial & Forms
- Stripe integration
- Donation recording (online + manual)
- Donation history and reports
- Form builder
- Pre-built forms
- Form submissions

### Week 9: Notifications & Reports
- Email notifications (SES)
- In-app notifications
- Broadcast messages
- Dashboards (admin, pastor, leader)
- Pre-built reports
- CSV export

### Week 10: Polish & Launch
- Bug fixes
- Performance optimization
- User acceptance testing
- Staging deployment
- Production deployment
- Easter launch 🎉

---

## Risk Mitigation

### Timeline Risks
- **10 weeks is tight:** Hybrid testing approach, ruthless prioritization
- **Scope creep:** Lock features early, defer enhancements
- **Integration complexity:** Use managed services (Cognito, Stripe, SES)

### Technical Risks
- **Lambda cold starts:** Lightweight Drizzle ORM, small bundles
- **Database connections:** Aurora Serverless v2 handles well
- **Stripe integration:** Well-documented, use official SDK

### Operational Risks
- **Support volume:** Simple contact form for MVP
- **Data loss:** Aurora automated backups, point-in-time recovery
- **Security issues:** Follow security best practices, regular updates

---

## Assumptions

1. Starting with fresh data (no large-scale import needed immediately)
2. Web app on mobile browsers is acceptable for MVP (no native apps)
3. Email notifications sufficient (no SMS/push for MVP)
4. Power BI team can work with nightly S3 exports (not real-time)
5. Basic forms sufficient (no conditional logic for MVP)
6. Members can belong to ONE fellowship only
7. Members can belong to MULTIPLE departments
8. Pledge tracking can wait until Phase 2
9. HMRC reports can wait until Phase 2
10. Regional views can wait until Phase 2
11. Department-specific features (choir, children's, etc.) deferred to Phase 2
12. GBP-only for donations (Stripe handles international card conversions)
13. UK timezone only (Europe/London)
14. Branch admins approve new member registrations (not central admin bottleneck)
15. Department follow-up alerts default to 7 days (configurable)
16. Soul follow-up alerts default to 2-3 days (configurable)
17. Anonymous donations show as "Anonymous" in reports (not hidden)
18. Form builder accessible to Admins and Leaders
19. Leaders can only broadcast to their own departments/fellowships
20. Member deactivation is soft delete with data retention per GDPR

---

## Clarifications & Decisions

All open questions have been answered:

1. **Fellowship membership:** Members can belong to ONE fellowship only
2. **Department membership:** Members can belong to MULTIPLE departments (recommended max 2, system warns at 3rd, admin can override)
3. **Department follow-up alerts:** Default 7 days without follow-up triggers alert (configurable by admin)
4. **Soul follow-up alerts:** Default 2-3 days without follow-up triggers alert (configurable by admin)
5. **Donation anonymity:** Anonymous donations show as "Anonymous" in reports (not hidden from reports)
6. **Form builder permissions:** Admins and Leaders can create forms
7. **Form scope:** Forms can be branch-specific or church-wide (configurable); branch-specific forms only accessible to that branch
8. **Broadcast message permissions:** Leaders can only send to their own departments/fellowships (not cross-department)
9. **Member registration:** Members select branch during registration; pending approval members can view their own profile and donations only
10. **Department join requests:** Max 2 departments at once (system warns, admin can override); requests go to department leader (branch admin has visibility)
11. **Soul assignment:** Automatically assigned to member who captured it (can be reassigned)
12. **Attendance recording:** Admins, Pastors, or Leaders can record service attendance; Fellowship leaders or delegates record fellowship attendance
13. **Manual donations:** Can be recorded without linking to member (anonymous walk-in) or linked if known
14. **Outreach programs:** Members can only register for their own branch's programs (cross-branch via home_branch_id change)
15. **Follow-up notes:** Visible to other leaders for collaboration
16. **Reports access:** Pastors see only their branch; Leaders see only their department/fellowship data
17. **Read receipts:** Deferred to Phase 2
18. **Member deactivation:** Soft delete, keep history for potential return; follow GDPR data retention standards; handle explicit deletion requests case-by-case
19. **Currency support:** GBP only for MVP; Stripe handles international card conversions automatically
20. **Time zones:** UK timezone only (Europe/London) for MVP
21. **Self check-in:** Deferred to Phase 2

---

## Approval & Sign-off

**Document Version:** 1.0  
**Date:** February 3, 2026  
**Status:** Draft - Pending Review

**Next Steps:**
1. Review and approve MVP scope
2. Clarify open questions
3. Create architecture.md (system design)
4. Create design.md (UI/UX requirements)
5. Begin Week 1 development

---

*This document defines the realistic MVP scope for Kairos, balancing ambition with the 10-week Easter deadline. Features not listed here are explicitly deferred to Phase 2 or later.*
