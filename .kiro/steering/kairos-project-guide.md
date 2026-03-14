---
description: >
  Authoritative, project-wide steering guide for the Kairos platform.
  Defines MVP scope, architecture decisions, security requirements,
  domain rules, and delivery constraints for the Easter 2026 launch.
  Applies to all application, infrastructure, API, and documentation work.
inclusion: auto
appliesTo:
  - "**/*"
priority: high
---

# Kairos Project Development Guide

## AI Guardrails (Strict)

The following rules are mandatory for any AI agent (including Kiro) generating,
modifying, or suggesting changes in this repository.

### Scope Control
- Do NOT introduce features, flows, or concepts outside the explicitly defined MVP.
- Do NOT speculate about “future phases”, “later enhancements”, or “nice-to-haves”.
- If a requirement is ambiguous, prefer the simplest implementation that unblocks MVP delivery, and flag the ambiguity in comments rather than blocking progress.

## Workspace
- I am running on windows but inside wsl so use linux native commands and the root of my workspace will always be kharis-github/kairos so you don't need to be doing stuff like this "cd \\wsl.localhost\Ubuntu-22.04\home\danielbolarinwa\kharis-github\kairos\apps\api" just use cd as normal.

### Architecture Enforcement
- Do NOT introduce alternative architectures, frameworks, or tools unless explicitly stated.
- Do NOT replace or suggest replacements for:
  - AWS CDK (infrastructure)
  - AWS API Gateway HTTP APIs
  - Serverless AWS services
  - Chosen backend language and frameworks
- Follow existing patterns before introducing new ones.

### Infrastructure & Cost Discipline
- Prefer managed, serverless AWS services.
- Do NOT introduce long-running compute, EC2, ECS, or Kubernetes.
- Avoid unnecessary AWS services or abstractions that increase cost or operational burden.
- Infrastructure changes must prioritize cost efficiency and simplicity over flexibility.

### Data & Domain Integrity
- Do NOT invent new domain entities, relationships, or attributes.
- Domain changes must align strictly with the documented domain model.
- If domain requirements are unclear, flag the ambiguity instead of guessing.

### API & Contract Safety
- Do NOT change API shapes, naming, or semantics without explicit instruction.
- Backward compatibility is required unless a breaking change is explicitly requested.
- Generated OpenAPI schemas must reflect the existing domain model exactly.
- Entity type interfaces in `@kairos/types` MUST use camelCase field names matching the Drizzle ORM schema column definitions (e.g., `outreachId` not `outreach_id`, `programName` not `program_name`). Drizzle returns camelCase by default — types must match to avoid `undefined` field access at runtime.
- Every Lambda handler file in `apps/api/src/` MUST have a corresponding CDK route in `api-stack.ts`, and the API client path in `packages/api-client/src/api.ts` MUST match the CDK route path exactly. Verify all three layers (Lambda handler, CDK route, API client) are aligned before marking a task complete.

### Code Generation Boundaries
- Do NOT generate large files unless explicitly requested.
- Do NOT refactor unrelated code while making targeted changes.
- Keep changes minimal, intentional, and reviewable.
- use my Context7 MCP server where necessary.

### Frontend Navigation Rules
- ALWAYS use Next.js `<Link>` component (`import Link from 'next/link'`) for internal navigation. NEVER use plain `<a href>` tags for internal routes — they cause full page reloads which break client-side state (auth context, etc.) in the static export SPA.
- The app uses `output: "export"` (static export) — dynamic `[param]` routes are NOT allowed. Use `useSearchParams()` with query params instead (e.g., `/members/view?id=X`).

### Decision Escalation
- When uncertain, ask for clarification instead of making assumptions.
- Never “fill in gaps” with implied product decisions.

## Project Overview

**Kairos** is a cloud-based church administration SaaS platform for managing multi-branch church operations. This steering document provides essential context, decisions, and guidelines for all development work.

**Critical Timeline:** 10-week MVP delivery to Easter 2026 (April 12, 2026)

---

## Core Principles

### 1. Timeline-Driven Development
- **10 weeks is non-negotiable** - Easter 2026 launch date is firm
- Ruthless feature prioritization - MVP scope is locked
- Hybrid testing approach - comprehensive tests only for critical paths (auth, payments, multi-tenancy)
- Defer all non-essential features to Phase 2

### 2. Multi-Tenancy & Data Isolation
- **Branch-level isolation is critical** - no cross-branch data leaks
- All queries MUST filter by `branch_id` or enforce via custom authorizer
- Pastors see only their branch data
- Leaders see only their department/fellowship data
- Test multi-tenancy thoroughly - this is a security requirement

### 3. TypeScript Everywhere
- Backend: TypeScript (Node.js Lambda functions)
- Frontend: TypeScript (Next.js web app)
- Mobile: TypeScript (React Native - Phase 2)
- Infrastructure: TypeScript (AWS CDK)
- Shared types across entire stack via monorepo

### 4. Serverless-First Architecture
- Granular Lambda functions (one per operation: `events-create`, `events-list`, etc.)
- Granular Lambdas are a deliberate design choice.
- Do NOT consolidate handlers or introduce routing layers for perceived optimization during MVP.
- Aurora Serverless v2 for auto-scaling database
- API Gateway HTTP API (cheaper, faster than REST API)
- S3 + CloudFront for file storage and CDN
- EventBridge for scheduled jobs

---

## Technology Stack Summary

| Layer | Technology | Key Points |
|-------|-----------|------------|
| **Backend** | AWS Lambda (Node.js + TypeScript) | Granular functions, one per operation |
| **API** | API Gateway HTTP API | 70% cheaper than REST API |
| **Database** | Aurora Serverless v2 (PostgreSQL) | Auto-scales, cost-effective |
| **ORM** | Drizzle | Lightweight (~30KB), fast cold starts |
| **Auth** | Cognito + Custom Authorizer | Cognito for authn, custom lambda for authz |
| **Web** | Next.js (React + TypeScript) | Responsive, works on mobile browsers |
| **Mobile** | React Native + Expo | Phase 2 - web works on mobile for MVP |
| **Infrastructure** | AWS CDK (TypeScript) | Type-safe IaC |
| **Payments** | Stripe | PCI DSS compliant, GBP only for MVP |
| **Email** | Amazon SES | Cost-effective transactional emails |
| **Storage** | S3 + CloudFront | Presigned URLs for uploads |
| **Monitoring** | CloudWatch + X-Ray | AWS-native, sufficient for MVP |
| **CI/CD** | GitHub Actions | Free for private repos |
| **Monorepo** | Turborepo | Fast builds, code sharing |

---

## MVP Scope (13 Core Modules)

### Week 1-2: Foundation
- Monorepo setup (Turborepo)
- AWS CDK infrastructure
- Aurora Serverless v2 + Drizzle schema
- Cognito authentication with - Multi-factor authentication (MFA)
- Custom authorizer lambda

### Week 3-4: Core Entities
- **Members:** Registration, approval, profile, import/export
- **Branches:** Create, assign pastors, branch isolation
- **Departments:** Global definitions, branch instances, leader assignment
- **Fellowships:** K-Groups, types, leader assignment

### Week 5-6: Attendance & Outreach
- **Attendance:** Service + fellowship tracking
- **Outreach Programs:** Create programs, worker registration
- **Evangelism (Souls):** Capture, assignment, follow-up tracking, alerts

### Week 7-8: Financial & Forms
- **Donations:** Stripe integration (online), manual entry (cash/check)
- **Forms:** Simple form builder, pre-built forms, auto-populate from member profile

### Week 9: Notifications & Reports
- **Notifications:** Email (SES), in-app, broadcast messages
- **Reports:** Dashboards (admin, pastor, leader), CSV export

### Week 10: Polish & Launch
- Bug fixes, performance optimization, UAT, production deployment

---

## Critical Business Rules

### Member Management
- Members select home branch during registration
- **Branch admin approval required** before full access (not central admin bottleneck)
- Pending members can view their own profile and donations only
- Soft delete (keep history), follow GDPR data retention
- Handle explicit deletion requests case-by-case

### Department Assignment
- Members can belong to **MULTIPLE departments**
- **Recommended max: 2 departments** (system warns at 3rd, admin can override)
- Department leader approves join requests (branch admin has visibility only)
- **Follow-up alerts:** Default 7 days without follow-up (configurable by admin)
- Follow-up notes visible to other leaders (for collaboration)

### Fellowship Management
- Members can belong to **ONE fellowship only**
- Fellowship types: K-Groups, Kharis Express, New Breeds, Kharis on Campus, Kharis on Campus Colleges
- Fellowship leader or delegate records attendance

### Evangelism (Souls)
- Soul **automatically assigned** to member who captured it (can be reassigned)
- **Follow-up alerts:** Default 2-3 days without follow-up (configurable by admin)
- Status pipeline: New → Following Up → Interested → Converted / Not Interested
- Follow-up methods: Phone Call, Home Visit, Text Message, Email, In-Person Meeting

### Donations
- **GBP only for MVP** (Stripe handles international card conversions automatically)
- Purpose categories: Offering, Tithe, Building Fund, Other (description required for "Other")
- Can record donation **without linking to member** (anonymous walk-in donor)
- **Anonymous donations show as "Anonymous" in reports** (not hidden)
- Payment methods: Cash, Check, Bank Transfer, Mobile Money, Card, Online, Other

### Forms
- **Simple form builder** (Google Forms style) - no conditional logic for MVP
- Auto-populate fields from member profile (if logged in)
- **Form scope:** Branch-specific or Church-wide (configurable)
- Branch-specific forms only accessible to that branch's members
- Pre-built forms: Department signup, Soul capture, Baby naming, Baby dedication, First-time visitor, Altar call, Baptism, Testimony

### Notifications
- **Email only for MVP** (SES) - no SMS/push notifications
- In-app notification center (bell icon)
- **No read receipts for MVP** (deferred to Phase 2)
- Targeting: All members, Specific branch, Department, Fellowship, Role, Leadership

### Reports & Analytics
- **Pastors see only their branch reports**
- **Leaders see only their department/fellowship data**
- **Power BI integration:** Nightly S3 export (Parquet format) at 2 AM
- CSV export for any list view (members, donations, attendance, souls)

---

## Authorization & Security

### Role-Based Access Control
- **Admins:** Full access to all data
- **Pastors:** Access only to their assigned branch data
- **Leaders:** Access only to their department/fellowship data
- **Members:** Access only to their own profile and public data

### Custom Authorizer Lambda
- Enforces branch-level isolation
- Validates JWT from Cognito
- Injects user context (member_id, branch_id, roles) into request
- Prevents cross-branch data access

### Security Requirements
- Encryption in transit (TLS 1.2+)
- Encryption at rest (AES-256 via Aurora, KMS for secrets)
- No hardcoded credentials (use Secrets Manager + Parameter Store)
- Input validation on all forms
- SQL injection protection (Drizzle ORM)
- XSS protection (React escaping)

---

## Database Patterns

### Soft Deletes
- Use `is_active` boolean (not hard deletes)
- Preserves historical data and audit trail
- Example: `WHERE is_active=TRUE` in all queries

### Timestamp Automation
- Every table has `created_at` and `updated_at`
- Trigger function `update_updated_at_column()` maintains timestamps

### Branch Isolation
- All queries MUST filter by `branch_id` or enforce via authorizer
- Example: `SELECT * FROM members WHERE home_branch_id=$1 AND is_active=TRUE`

### Current Assignments
- Use `end_date IS NULL` or `is_current=TRUE` to identify current assignments
- Example: `WHERE role='Main Pastor' AND is_current=TRUE`

---

## API Design

### URL-Based Versioning
- Format: `/v1/members`, `/v1/events`, etc.
- Start with `/v1/` from day one
- Plan for `/v2/` when breaking changes needed

### OpenAPI Spec + Generated Client
1. Define API in `openapi.yaml` (source of truth)
2. Generate TypeScript client with `openapi-typescript`
3. Generate Postman collection with `openapi-to-postman`
4. Type-safe API calls in web and mobile apps

### Error Handling
- Consistent error responses: `{ error: string, code: string, details?: any }`
- HTTP status codes: 200 (OK), 201 (Created), 400 (Bad Request), 401 (Unauthorized), 403 (Forbidden), 404 (Not Found), 500 (Internal Server Error)

---

## Monorepo Structure

```
kairos/
├── apps/
│   ├── web/              # Next.js web application
│   ├── mobile/           # React Native mobile app (Phase 2)
│   └── api/              # Lambda functions
├── packages/
│   ├── types/            # Shared TypeScript types
│   ├── ui/               # Shared UI components (Shadcn/ui)
│   ├── utils/            # Shared utilities
│   └── api-client/       # Generated API client
├── infrastructure/       # AWS CDK code
└── turbo.json           # Turborepo configuration
```

### Shared Packages
- **@kairos/types:** Database models (Drizzle schemas), API request/response types
- **@kairos/ui:** Shadcn/ui components, design system
- **@kairos/utils:** Date formatting, validation, etc.
- **@kairos/api-client:** Generated from OpenAPI spec

---

## Design System

### Colors
- **Primary:** Purple (#7C3AED)
- **Secondary:** Blue (#3B82F6)
- **Accent:** Gold (#F59E0B)
- **Highlight:** Burgundy (#991B1B)
- **Neutral:** Gray scale

### Typography
- **Font:** Inter (Google Fonts)
- **Headings:** Bold, larger sizes
- **Body:** Regular, 16px base

### Components (Shadcn/ui)
- Buttons, Forms, Cards, Tables, Modals, Badges, Alerts, Tooltips, Loading states
- Icons: Lucide React

### Layout
- **Hybrid:** Top bar + collapsible sidebar
- **Responsive:** Mobile-first, works on all screen sizes
- **Accessibility:** WCAG 2.1 AA compliance mandatory

---

## Testing Strategy

### Comprehensive Testing (Write Tests First)
- Authentication & authorization
- Donations and payment processing
- Member data access and multi-tenancy logic
- Branch isolation

### Pragmatic Testing
- CRUD operations (events, fellowships, departments)
- Attendance tracking
- Notifications

### Manual Testing
- UI flows
- Edge cases

### Skip for MVP
- End-to-end tests
- Performance tests

**Target Coverage:** 40-60% code coverage, focused on high-risk areas

---

## Cost Estimates

### MVP Phase (5-10 churches, ~500 active users)
- **Total: ~$50-90/month**
- Aurora Serverless v2: $30-50
- Lambda executions: $5-10
- API Gateway: $5-10
- S3 + CloudFront: $2-5
- Other services: $5-15

### Growth Phase (100 churches, ~5000 active users)
- **Total: ~$210-390/month**

### Scale Phase (1000 churches, ~50,000 active users)
- **Total: ~$1,300-2,150/month**

*Note: Stripe fees (2.9% + $0.30) are pass-through costs on donations*

---

## Deferred to Phase 2 (Post-Easter)

### Features NOT in MVP
- Native mobile apps (iOS/Android) - web works on mobile browsers
- SMS notifications
- Push notifications
- HMRC tax year reports
- Pledge tracking
- Regional coordinator views
- Audit logs
- Advanced analytics
- Custom report builder
- Event sign-up and management (full events module)
- Learning Management System
- Inventory and requisition management
- Room booking system
- Data Protection compliance tools
- Cybersecurity audit tools
- Digital ID cards with QR codes
- Department-specific features (Choir audio, uniform management, etc.)
- Advanced forms (conditional logic, file uploads, multi-page)
- Read receipts for notifications
- Department meeting attendance tracking
- Historical records of who left when

---

## Environment Strategy

### Two Environments (Single AWS Account)
- **Staging:** Development and testing
- **Production:** Live customer data

### Resource Naming
- Staging: `kairos-staging-*`
- Production: `kairos-prod-*`

### Separation
- Separate databases per environment
- Environment tags on all resources
- IAM policies restrict production access
- Different instance sizes (staging smaller/cheaper)

---

## Internationalization

### MVP: English Only
- Faster development (20-30% time savings)
- Sufficient for initial target market
- Can add i18n post-launch if needed

### Future Consideration
- Add French, Spanish, Portuguese based on market demand
- Libraries available: next-intl, i18next

---

## Timezone & Currency

### MVP Constraints
- **Timezone:** UK only (Europe/London)
- **Currency:** GBP only (Stripe handles international card conversions)

### Rationale
- Simplifies development
- Sufficient for initial target market
- Can add multi-timezone/currency support in Phase 2

---

## Key Clarifications & Assumptions

1. Starting with fresh data (no large-scale import needed immediately)
2. Web app on mobile browsers is acceptable for MVP (no native apps)
3. Email notifications sufficient (no SMS/push for MVP)
4. Power BI team can work with nightly S3 exports (not real-time)
5. Basic forms sufficient (no conditional logic for MVP)
6. Members can belong to ONE fellowship only
7. Members can belong to MULTIPLE departments (recommended max 2)
8. Pledge tracking can wait until Phase 2
9. HMRC reports can wait until Phase 2
10. Regional views can wait until Phase 2
11. Department-specific features deferred to Phase 2
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

## Success Criteria (Easter Launch)

### Must Be Functional
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

### Performance Targets
- 500 members registered
- 5 branches active
- 20 departments active
- 10 fellowships active
- 100 souls captured
- 500 donations recorded
- < 3 second page loads
- 99% uptime

---

## Common Development Patterns

### Lambda Function Structure
```typescript
// apps/api/src/members/members-create.ts
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { db } from '@kairos/database';
import { members } from '@kairos/types';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    // 1. Parse request body
    const body = JSON.parse(event.body || '{}');
    
    // 2. Validate input
    // ... validation logic
    
    // 3. Extract user context from authorizer
    const { member_id, branch_id, roles } = event.requestContext.authorizer;
    
    // 4. Enforce branch isolation
    if (!roles.includes('Admin') && body.home_branch_id !== branch_id) {
      return { statusCode: 403, body: JSON.stringify({ error: 'Forbidden' }) };
    }
    
    // 5. Database operation
    const result = await db.insert(members).values(body).returning();
    
    // 6. Return response
    return { statusCode: 201, body: JSON.stringify(result[0]) };
  } catch (error) {
    console.error('Error creating member:', error);
    return { statusCode: 500, body: JSON.stringify({ error: 'Internal Server Error' }) };
  }
};
```

### Custom Authorizer Pattern
```typescript
// apps/api/src/auth/authorizer.ts
import { APIGatewayAuthorizerResult, APIGatewayTokenAuthorizerEvent } from 'aws-lambda';
import { verifyToken } from './cognito';

export const handler = async (event: APIGatewayTokenAuthorizerEvent): Promise<APIGatewayAuthorizerResult> => {
  try {
    // 1. Verify JWT from Cognito
    const token = event.authorizationToken.replace('Bearer ', '');
    const decoded = await verifyToken(token);
    
    // 2. Fetch user context from database
    const member = await db.query.members.findFirst({
      where: eq(members.cognito_user_id, decoded.sub),
      with: { roles: true, branch: true }
    });
    
    // 3. Build policy with user context
    return {
      principalId: member.member_id,
      policyDocument: {
        Version: '2012-10-17',
        Statement: [{
          Action: 'execute-api:Invoke',
          Effect: 'Allow',
          Resource: event.methodArn
        }]
      },
      context: {
        member_id: member.member_id,
        branch_id: member.home_branch_id,
        roles: JSON.stringify(member.roles.map(r => r.role_name))
      }
    };
  } catch (error) {
    throw new Error('Unauthorized');
  }
};
```

### Drizzle Query Pattern
```typescript
// Fetch members with branch isolation
const members = await db.query.members.findMany({
  where: and(
    eq(members.home_branch_id, branch_id),
    eq(members.is_active, true)
  ),
  with: {
    branch: true,
    roles: true,
    fellowships: true
  }
});
```

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

## Architecture Patterns

### C4 Model Overview
The system architecture follows the C4 model with 4 levels:

**Level 1 - System Context:**
- External actors: Church Member, Leader, Pastor, Admin
- External systems: Stripe (payments), Amazon SES (email), Power BI (analytics)
- Kairos system as central platform

**Level 2 - Container Architecture:**
- Frontend: Next.js web application (responsive, works on mobile browsers)
- API Layer: API Gateway HTTP API + WebSocket API
- Authorization: Custom Lambda Authorizer (enforces branch isolation)
- Compute: Granular Lambda functions (one per operation)
- Database: Aurora Serverless v2 (PostgreSQL)
- Storage: S3 + CloudFront CDN
- Auth: Amazon Cognito User Pool
- Scheduling: EventBridge for cron jobs

**Level 3 - Component Architecture:**
- Lambda functions grouped by domain (members, donations, souls, etc.)
- Shared Lambda layers (database client, validator, error handler, auth context, logger)
- Next.js pages with shared components (layout, forms, tables, notifications)
- API client generated from OpenAPI spec (type-safe)

**Level 4 - Deployment Architecture:**
- AWS Region: eu-west-2 (London)
- VPC with 2 private subnets across 2 AZs
- Aurora Multi-AZ with primary + replica
- Lambda functions in VPC for database access
- CloudFront global CDN
- Route 53 for DNS
- Next.js hosted on Vercel or AWS Amplify

### Lambda Function Structure
All Lambda functions follow this pattern:

```typescript
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    // 1. Extract auth context from authorizer
    const { member_id, branch_id, roles } = event.requestContext.authorizer;
    
    // 2. Parse and validate input
    const input = JSON.parse(event.body || '{}');
    const validated = validateInput(input);
    
    // 3. Enforce branch isolation
    if (!roles.includes('Admin') && validated.branchId !== branch_id) {
      return { statusCode: 403, body: JSON.stringify({ error: 'Forbidden' }) };
    }
    
    // 4. Database operation
    const result = await db.insert(table).values(validated).returning();
    
    // 5. Return response
    return { statusCode: 201, body: JSON.stringify(result[0]) };
  } catch (error) {
    return handleError(error);
  }
};
```

### API Endpoint Patterns

**Base URL:** `https://api.kairos.church/v1`

**Standard CRUD:**
- `GET /v1/{resource}` - List with pagination, filtering, sorting
- `POST /v1/{resource}` - Create
- `GET /v1/{resource}/{id}` - Get single
- `PUT /v1/{resource}/{id}` - Update
- `DELETE /v1/{resource}/{id}` - Soft delete

**Pagination:**
```http
GET /v1/members?page=1&limit=50
```

**Filtering:**
```http
GET /v1/members?branchId=123&status=active&search=john
```

**Sorting:**
```http
GET /v1/members?sortBy=lastName&sortOrder=asc
```

**Error Response Format:**
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": [{"field": "email", "message": "Invalid email format"}]
  }
}
```

### WebSocket API
- Connection URL: `wss://ws.kairos.church`
- Routes: `$connect`, `$disconnect`, `sendMessage`, `$default`
- Used for real-time notifications and live updates
- Connection stored in database with member_id

---

## Design System

### Color Palette

**Primary Colors:**
- Purple 900: #4C1D95 (Dark headers)
- Purple 700: #6D28D9 (Primary actions)
- Purple 500: #8B5CF6 (Hover states)
- Purple 100: #EDE9FE (Backgrounds)

**Secondary Colors:**
- Blue 900: #1E3A8A (Links, info)
- Blue 700: #1D4ED8 (Secondary actions)
- Blue 500: #3B82F6 (Hover states)
- Blue 100: #DBEAFE (Backgrounds)

**Accent Colors:**
- Gold 900: #78350F (Highlights)
- Gold 600: #D97706 (Success, achievements)
- Gold 400: #FBBF24 (Warnings)
- Gold 100: #FEF3C7 (Backgrounds)

**Alert Colors:**
- Burgundy 900: #7F1D1D (Critical errors)
- Burgundy 700: #B91C1C (Errors, alerts)
- Burgundy 500: #EF4444 (Warnings)
- Burgundy 100: #FEE2E2 (Backgrounds)

**Neutral Colors:**
- Gray 900: #111827 (Primary text)
- Gray 700: #374151 (Secondary text)
- Gray 500: #6B7280 (Tertiary text)
- Gray 300: #D1D5DB (Borders)
- Gray 100: #F3F4F6 (Backgrounds)
- Gray 50: #F9FAFB (Page backgrounds)
- White: #FFFFFF (Cards, modals)

### Typography
- **Font Family:** Inter (sans-serif) for UI, JetBrains Mono for code
- **Font Sizes:** Display (48px), H1 (36px), H2 (30px), H3 (24px), H4 (20px), Body (16px), Caption (12px)
- **Font Weights:** Regular (400), Medium (500), Semibold (600), Bold (700)
- **Line Heights:** Tight (1.25), Normal (1.5), Relaxed (1.75)

### Spacing Scale
Based on 4px base unit:
- xs: 4px, sm: 8px, md: 16px, lg: 24px, xl: 32px, 2xl: 48px, 3xl: 64px

### Components (Shadcn/ui)
- **Buttons:** Primary (Purple 700), Secondary (White + Purple border), Danger (Burgundy 700), Ghost (Transparent)
- **Forms:** Text inputs, dropdowns, checkboxes, radio buttons, textareas, date pickers
- **Cards:** Standard card, stat card (with icon, value, change indicator)
- **Tables:** Sortable columns, row actions, pagination, bulk selection
- **Modals:** Centered overlay, max-width 600-800px, header + body + footer
- **Badges:** Status badges (Active, Inactive, Pending, Error)
- **Alerts:** Success, Warning, Error, Info (with icons)
- **Tooltips:** Gray 900 background, white text, max-width 200px
- **Loading:** Spinner, skeleton loader, progress bar

### Layout
- **Application Shell:** Top bar (64px) + collapsible sidebar (240px expanded, 64px collapsed)
- **Top Bar:** Logo, branch selector, search, notifications, user menu
- **Sidebar:** Collapsible navigation with icons + labels
- **Breadcrumbs:** Show current location for deep navigation

### Responsive Breakpoints
- Mobile: 0-639px (sm)
- Tablet: 640-1023px (md)
- Desktop: 1024-1279px (lg)
- Large Desktop: 1280px+ (xl)

### Accessibility (WCAG 2.1 AA)
- **Color Contrast:** Minimum 4.5:1 for normal text, 3:1 for large text
- **Keyboard Navigation:** All interactive elements keyboard accessible, visible focus indicators (Purple 700 outline)
- **Screen Readers:** Semantic HTML, ARIA attributes, alt text for images
- **Touch Targets:** Minimum 44x44px for all interactive elements
- **Error Messages:** Specific and helpful, not just "Invalid input"
- **Forms:** Labels associated with inputs, required fields marked, validation messages

### Key Screens
1. **Dashboard:** Stat cards, attendance chart, recent activity feed
2. **Member List:** Search, filters, data table, pagination, bulk actions
3. **Member Detail:** Tabs (Profile, Donations, Attendance), edit modal
4. **Soul Capture Form:** Modal with personal info, source, location, notes
5. **Soul Follow-up Tracking:** Kanban board (New, Following Up, Interested, Converted)
6. **Donation Recording:** Tabs (Online, Manual Entry), Stripe integration
7. **Form Builder:** Drag-and-drop field types, form preview, field configuration
8. **Attendance Recording:** Date picker, member list with bulk selection, status dropdowns
9. **Notification Center:** Unread indicator, mark as read, load more
10. **Reports Dashboard:** Charts, stat cards, date range selector, CSV export

---

## Quick Reference

### Key Files
- `requirements/stack.md` - Technology stack decisions
- `requirements/mvp-scope.md` - MVP feature scope
- `requirements/architecture.md` - System architecture (C4 model)
- `requirements/design.md` - Design system and UI requirements
- `requirements/data.md` - Database schema and patterns
- `database/schema.sql` - PostgreSQL schema
- `ADMINISTRATION.md` - Entity definitions and relationships

### Key Commands
- `turbo build` - Build all packages
- `turbo test` - Run all tests
- `turbo dev` - Start development servers
- `cdk deploy` - Deploy infrastructure
- `npm run migrate` - Run database migrations

### Key URLs
- Staging: `https://staging.kairos.church`
- Production: `https://app.kairos.church`
- API Docs: `https://api.kairos.church/docs`

### Infrastructure
- **AWS Region:** eu-west-2 (London)
- **VPC:** kairos-prod-vpc (10.0.0.0/16)
- **Database:** Aurora Serverless v2 (PostgreSQL 15, 0.5-16 ACUs)
- **Compute:** Lambda functions (Node.js 20, 512MB-1024MB memory)
- **API:** API Gateway HTTP API + WebSocket API
- **Storage:** S3 + CloudFront CDN
- **Auth:** Cognito User Pool
- **Monitoring:** CloudWatch + X-Ray

---

## Contact & Support

For questions or clarifications during development:
- Review this steering document first
- Check requirements documents in `requirements/` folder
- Consult database schema in `database/schema.sql`
- Review architecture diagrams in `requirements/architecture.md`
- Review design specifications in `requirements/design.md`

---

*This steering document is automatically included in all AI-assisted development sessions to ensure consistency with project decisions and timeline.*
