# Design Document: Kairos MVP Church Administration System

## Overview

Kairos is a serverless, cloud-native church administration platform built on AWS using a modern TypeScript stack. The system follows a multi-tenant architecture with branch-level data isolation, supporting 13 core modules across authentication, membership, attendance, evangelism, financial management, forms, notifications, and reporting.

**Architecture Principles:**
- Serverless-first (AWS Lambda, Aurora Serverless v2)
- Event-driven where appropriate
- Branch-level data isolation enforced at authorization layer
- Stateless API design
- Infrastructure as Code (AWS CDK)
- Type safety across the entire stack (TypeScript)

**Technology Stack:**
- **Backend:** AWS Lambda (TypeScript, Node.js 20)
- **Database:** Aurora Serverless v2 (PostgreSQL 15) with Drizzle ORM
- **API:** API Gateway HTTP API + WebSocket API
- **Auth:** Amazon Cognito + Custom Authorizer Lambda
- **Frontend:** Next.js 14 (React, TypeScript, Shadcn/ui)
- **Infrastructure:** AWS CDK (TypeScript)
- **Payments:** Stripe (GBP only)
- **Email:** Amazon SES
- **Storage:** S3 + CloudFront
- **CI/CD:** GitHub Actions

**Key Design Decisions:**
1. **Granular Lambda Functions:** One Lambda per operation (e.g., members-create, members-list) for independent scaling and smaller blast radius
2. **Custom Authorizer:** Enforces branch-level data isolation and role-based access control before requests reach business logic
3. **Drizzle ORM:** Lightweight (~30KB) for fast Lambda cold starts, SQL-like syntax for control
4. **Monorepo:** Turborepo for code sharing across web, mobile, and API with shared types and utilities
5. **Hybrid Testing:** Comprehensive tests for critical paths (auth, payments, data isolation), pragmatic for CRUD operations

**Target Performance:**
- Page load: < 3 seconds
- API response: < 500ms (p95)
- Concurrent users: 500
- Uptime: 99%


## Architecture

### System Context

Kairos interacts with four external systems:

1. **Amazon Cognito:** User authentication and JWT issuance
2. **Stripe:** Payment processing for online donations
3. **Amazon SES:** Transactional email delivery
4. **Power BI:** Analytics via nightly S3 exports

### Container Architecture

The system consists of the following containers:

**Frontend Layer:**
- **Next.js Web Application:** Server-side rendered React application providing UI for all user personas
  - Deployed on Vercel or AWS Amplify
  - Responsive design works on mobile browsers
  - Communicates with API Gateway via HTTPS

**API Layer:**
- **HTTP API (API Gateway):** RESTful endpoints for CRUD operations
  - URL-based versioning (/v1/)
  - JWT authentication via Custom Authorizer
  - Regional endpoint in eu-west-2 (London)

- **WebSocket API (API Gateway):** Real-time notifications and updates
  - Connection management via Lambda
  - Server-to-client push notifications
  - Used for live attendance updates and instant notifications

- **Custom Authorizer Lambda:** JWT validation and authorization
  - Validates JWT with Cognito
  - Extracts user context (userId, branchId, role)
  - Enforces branch-level data isolation
  - Returns IAM policy (Allow/Deny)

**Compute Layer:**
- **Lambda Functions:** Granular functions per operation
  - Member Management: create, list, get, update, delete, import, export, approve
  - Branch Management: create, list, get, update, assign-pastor, assign-elder
  - Department Management: create, list, get, update, assign-member, approve-request
  - Fellowship Management: create, list, get, update, add-member, record-meeting
  - Attendance: record-service, list-service, record-fellowship, list-fellowship
  - Outreach: create-program, list-programs, register-worker
  - Evangelism: capture-soul, list-souls, log-followup, update-status
  - Donations: create-online, create-manual, list, get-reports, export
  - Forms: create-form, list-forms, submit-form, list-submissions
  - Notifications: create, list, mark-read, send-broadcast
  - Reports: get-dashboard, get-attendance-trends, get-donation-summary
  - Analytics Export: export-to-s3 (scheduled)
  - WebSocket: connect, disconnect, send-message

**Data Layer:**
- **Aurora Serverless v2:** PostgreSQL 15 database
  - Auto-scales from 0.5 to 16 ACUs
  - Multi-AZ deployment for high availability
  - Automated daily backups with 7-day retention
  - Point-in-time recovery

- **S3 Buckets:** File storage
  - Member photos
  - Form uploads
  - CSV exports
  - Analytics exports (Parquet format)

- **CloudFront CDN:** Global content delivery
  - Caches S3 objects at edge locations
  - Reduces latency and transfer costs

**Security Layer:**
- **Secrets Manager:** Database credentials with auto-rotation
- **Parameter Store:** API keys and configuration
- **Cognito User Pool:** User authentication and JWT issuance

**Scheduling Layer:**
- **EventBridge:** Scheduled tasks
  - Nightly analytics export (2 AM)
  - Follow-up alerts
  - Notification cleanup

**Monitoring Layer:**
- **CloudWatch:** Logs, metrics, and alarms
- **X-Ray:** Distributed tracing across Lambda chains


### Network Architecture

```
VPC: kairos-prod-vpc (10.0.0.0/16)
├── Private Subnet 1 (10.0.1.0/24) - AZ: eu-west-2a
│   ├── Aurora Primary Instance
│   └── Lambda ENIs (when accessing VPC resources)
├── Private Subnet 2 (10.0.2.0/24) - AZ: eu-west-2b
│   ├── Aurora Replica Instance
│   └── Lambda ENIs (when accessing VPC resources)
└── VPC Endpoints
    ├── S3 Gateway Endpoint (no data transfer charges)
    ├── Secrets Manager Interface Endpoint
    └── Systems Manager Interface Endpoint
```

**Key Network Decisions:**
- Lambda functions access Aurora via VPC ENIs in private subnets
- S3 access uses VPC Gateway Endpoint to avoid NAT Gateway costs
- Aurora instances in private subnets with no public access
- API Gateway and CloudFront provide public-facing endpoints

### Deployment Architecture

**Environments:**
- **Staging:** Pre-production testing (smaller Aurora: 0.5-2 ACUs)
- **Production:** Live customer data (full Aurora: 0.5-16 ACUs)

**Resource Naming:**
- Staging: `kairos-staging-{resource}`
- Production: `kairos-prod-{resource}`

**Deployment Process:**
1. Developer pushes code to GitHub
2. GitHub Actions runs tests (unit + integration)
3. Build artifacts (Lambda bundles, Next.js build)
4. CDK synthesizes CloudFormation templates
5. Deploy to staging environment
6. Run smoke tests on staging
7. Manual approval for production
8. Deploy to production environment
9. Monitor CloudWatch for errors


## Components and Interfaces

### Lambda Function Pattern

All Lambda functions follow a consistent structure:

```typescript
// Example: members-create Lambda
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { db } from '@kairos/db-client'; // Shared layer
import { validateMemberInput } from '@kairos/validator'; // Shared layer
import { handleError } from '@kairos/error-handler'; // Shared layer
import { getAuthContext } from '@kairos/auth-context'; // Shared layer
import { logger } from '@kairos/logger'; // Shared layer

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    // 1. Extract auth context (user, branch, role)
    const authContext = getAuthContext(event);
    
    // 2. Parse and validate input
    const input = JSON.parse(event.body || '{}');
    const validatedInput = validateMemberInput(input);
    
    // 3. Enforce branch-level authorization
    if (authContext.role !== 'Admin' && validatedInput.branchId !== authContext.branchId) {
      return handleError(new Error('Unauthorized'), 403);
    }
    
    // 4. Business logic
    const member = await db.members.create({
      ...validatedInput,
      createdBy: authContext.userId,
    });
    
    // 5. Log and return
    logger.info('Member created', { memberId: member.id, branchId: member.branchId });
    
    return {
      statusCode: 201,
      body: JSON.stringify(member),
    };
  } catch (error) {
    return handleError(error);
  }
};
```

**Shared Lambda Layers:**
- **Database Client:** Drizzle ORM connection and query builder
- **Input Validator:** Zod schemas for request validation
- **Error Handler:** Standardized error responses
- **Auth Context:** Extracts user info from authorizer
- **Logger:** Structured logging to CloudWatch

### Custom Authorizer

The Custom Authorizer Lambda validates JWT tokens and enforces branch-level permissions:

```typescript
import { APIGatewayAuthorizerResult, APIGatewayTokenAuthorizerEvent } from 'aws-lambda';
import { CognitoJwtVerifier } from 'aws-jwt-verify';
import { db } from '@kairos/db-client';

const verifier = CognitoJwtVerifier.create({
  userPoolId: process.env.USER_POOL_ID!,
  tokenUse: 'access',
  clientId: process.env.CLIENT_ID!,
});

export const handler = async (
  event: APIGatewayTokenAuthorizerEvent
): Promise<APIGatewayAuthorizerResult> => {
  try {
    // 1. Validate JWT with Cognito
    const token = event.authorizationToken.replace('Bearer ', '');
    const payload = await verifier.verify(token);
    
    // 2. Extract user context
    const userId = payload.sub;
    const email = payload.email;
    const role = payload['custom:role'];
    const branchId = payload['custom:branchId'];
    
    // 3. Check user is active
    const user = await db.members.findOne({ where: { id: userId, isActive: true } });
    if (!user) {
      throw new Error('User not active');
    }
    
    // 4. Return policy with context
    return {
      principalId: userId,
      policyDocument: {
        Version: '2012-10-17',
        Statement: [{
          Action: 'execute-api:Invoke',
          Effect: 'Allow',
          Resource: event.methodArn,
        }],
      },
      context: {
        userId,
        email,
        role,
        branchId,
      },
    };
  } catch (error) {
    throw new Error('Unauthorized');
  }
};
```

### API Endpoints

**Base URL:** `https://api.kairos.church/v1`

**Authentication:** All endpoints require `Authorization: Bearer <JWT>` header

**Common Patterns:**

**Pagination:**
```
GET /v1/members?page=1&limit=50
Response: { data: [...], pagination: { page, limit, total, totalPages } }
```

**Filtering:**
```
GET /v1/members?branchId=123&status=active&search=john
```

**Sorting:**
```
GET /v1/members?sortBy=lastName&sortOrder=asc
```

**Error Response:**
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": [
      { "field": "email", "message": "Invalid email format" }
    ]
  }
}
```

**HTTP Status Codes:**
- 200 OK - Success
- 201 Created - Resource created
- 400 Bad Request - Invalid input
- 401 Unauthorized - Missing/invalid token
- 403 Forbidden - Insufficient permissions
- 404 Not Found - Resource not found
- 409 Conflict - Duplicate resource
- 422 Unprocessable Entity - Validation error
- 500 Internal Server Error - Server error


### Next.js Application Structure

```
apps/web/
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── (auth)/              # Auth layout group
│   │   │   ├── login/
│   │   │   └── register/
│   │   ├── (dashboard)/         # Dashboard layout group
│   │   │   ├── layout.tsx       # Shared dashboard layout
│   │   │   ├── page.tsx         # Dashboard home
│   │   │   ├── members/
│   │   │   ├── attendance/
│   │   │   ├── donations/
│   │   │   ├── souls/
│   │   │   ├── forms/
│   │   │   └── reports/
│   │   └── api/                 # API routes (if needed)
│   ├── components/              # Shared components
│   │   ├── ui/                  # Base UI components (Shadcn/ui)
│   │   ├── layout/              # Layout components
│   │   ├── forms/               # Form components
│   │   └── notifications/       # Notification components
│   ├── lib/                     # Utilities and clients
│   │   ├── api-client.ts        # Generated API client
│   │   ├── ws-client.ts         # WebSocket client
│   │   ├── auth.ts              # Auth utilities
│   │   └── validation.ts        # Validation schemas
│   ├── hooks/                   # Custom React hooks
│   │   ├── useAuth.ts
│   │   ├── useMembers.ts
│   │   └── useNotifications.ts
│   ├── store/                   # Zustand stores
│   │   ├── authStore.ts
│   │   └── notificationStore.ts
│   └── types/                   # TypeScript types
└── public/                      # Static assets
```

**Key Components:**

**Layout Component:**
- Top bar with logo, branch selector, search, notifications, user menu
- Collapsible sidebar navigation (240px expanded, 64px collapsed)
- Main content area with breadcrumbs
- Responsive: collapses to hamburger menu on mobile

**Auth Provider:**
- React Context for authentication state
- Token management and refresh
- Cognito SDK integration
- Redirects to login if unauthenticated

**API Client:**
- Type-safe API calls generated from OpenAPI spec
- Automatic token injection
- Error handling and retry logic
- Request/response interceptors

**WebSocket Client:**
- Connection management with auto-reconnect
- Message routing to appropriate handlers
- Heartbeat to keep connection alive
- Integration with notification store

**Data Table Component:**
- Sortable columns
- Filterable rows
- Pagination
- Bulk selection
- Export to CSV
- Built with TanStack Table

**Form Builder Component:**
- Drag-and-drop interface with React DnD
- Field configuration panel
- Live preview
- Save as template
- Export form definition

**Notification Center:**
- Bell icon with unread count badge
- Dropdown with notification list
- Mark as read/unread
- Navigate to relevant page on click
- Real-time updates via WebSocket


## Data Models

### Database Schema Overview

The database follows a multi-tenant branch architecture with the following entity hierarchy:

```
REGIONS → BRANCHES → MEMBERS
                  ↓
    DEPARTMENTS, FELLOWSHIPS, OUTREACH_PROGRAMS
                  ↓
         ATTENDANCE, SOULS, DONATIONS
```

### Core Entities

**regions**
```typescript
interface Region {
  region_id: number;
  region_name: string;
  country: string;
  created_at: Date;
  updated_at: Date;
}
```

**branches**
```typescript
interface Branch {
  branch_id: number;
  branch_name: string;
  region_id: number;
  branch_type: 'Main' | 'Satellite' | 'Cell' | 'Campus' | 'Online';
  address?: string;
  city?: string;
  postal_code?: string;
  phone?: string;
  email?: string;
  established_date?: Date;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}
```

**members**
```typescript
interface Member {
  member_id: number;
  first_name: string;
  last_name: string;
  middle_name?: string;
  date_of_birth?: Date;
  gender?: 'Male' | 'Female';
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  postal_code?: string;
  home_branch_id: number;
  membership_date: Date;
  is_active: boolean;
  photo_url?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  created_at: Date;
  updated_at: Date;
}
```

**branch_leadership**
```typescript
interface BranchLeadership {
  leadership_id: number;
  branch_id: number;
  member_id: number;
  role: 'Main Pastor' | 'Elder';
  start_date: Date;
  end_date?: Date;
  is_current: boolean;
  created_at: Date;
  updated_at: Date;
}
```

**departments**
```typescript
interface Department {
  department_id: number;
  department_name: string;
  description?: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}
```

**branch_departments**
```typescript
interface BranchDepartment {
  branch_department_id: number;
  branch_id: number;
  department_id: number;
  lead_member_id: number;
  deputy_member_id?: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}
```

**fellowships**
```typescript
interface Fellowship {
  fellowship_id: number;
  fellowship_name: string;
  branch_id: number;
  description?: string;
  leader_id?: number;
  co_leader_id?: number;
  meeting_schedule?: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}
```

**services**
```typescript
interface Service {
  service_id: number;
  branch_id: number;
  service_date: Date;
  service_type: 'Sunday Service' | 'Midweek Service' | 'Special Service';
  service_time?: string;
  notes?: string;
  created_by?: number;
  created_at: Date;
  updated_at: Date;
}
```

**service_attendance**
```typescript
interface ServiceAttendance {
  service_id: number;
  member_id: number;
  attendance_status: 'Present' | 'Absent' | 'Virtual';
  is_first_time: boolean;
  arrival_time?: Date;
  notes?: string;
  recorded_at: Date;
  recorded_by?: number;
}
```

**outreach_programs**
```typescript
interface OutreachProgram {
  outreach_id: number;
  branch_id: number;
  program_name: string;
  program_date: Date;
  location: string;
  address?: string;
  city?: string;
  description?: string;
  coordinator_id?: number;
  total_souls_reached: number;
  notes?: string;
  is_completed: boolean;
  created_at: Date;
  updated_at: Date;
}
```

**souls**
```typescript
interface Soul {
  soul_id: number;
  outreach_id?: number;
  first_name: string;
  last_name: string;
  phone: string;
  email?: string;
  address?: string;
  city?: string;
  capture_date: Date;
  capture_location?: string;
  assigned_member_id?: number;
  status: 'New' | 'Following Up' | 'Interested' | 'Converted' | 'Not Interested';
  converted_to_member_id?: number;
  conversion_date?: Date;
  notes?: string;
  created_at: Date;
  updated_at: Date;
}
```

**follow_ups**
```typescript
interface FollowUp {
  followup_id: number;
  soul_id: number;
  contact_date: Date;
  contact_method: 'Phone Call' | 'Home Visit' | 'Text Message' | 'Email' | 'In-Person Meeting';
  contact_status: 'Successful' | 'No Answer' | 'Call Back Later' | 'Not Interested';
  duration_minutes?: number;
  notes?: string;
  followed_up_by?: number;
  created_at: Date;
}
```

**donations**
```typescript
interface Donation {
  donation_id: number;
  member_id?: number;
  branch_id: number;
  amount: number;
  currency: string;
  donation_date: Date;
  donation_purpose: 'Offering' | 'Tithe' | 'Building Fund' | 'Other';
  description?: string;
  payment_method: 'Cash' | 'Check' | 'Bank Transfer' | 'Mobile Money' | 'Card' | 'Online' | 'Other';
  stripe_payment_id?: string;
  is_anonymous: boolean;
  recorded_by?: number;
  created_at: Date;
  updated_at: Date;
}
```

**forms**
```typescript
interface Form {
  form_id: number;
  form_name: string;
  form_description?: string;
  form_definition: object; // JSON schema
  scope: 'Church-wide' | 'Branch-specific';
  target_branch_id?: number;
  is_active: boolean;
  created_by?: number;
  created_at: Date;
  updated_at: Date;
}
```

**form_submissions**
```typescript
interface FormSubmission {
  submission_id: number;
  form_id: number;
  member_id?: number;
  submission_data: object; // JSON data
  submitted_at: Date;
}
```

**notifications**
```typescript
interface Notification {
  notification_id: number;
  title: string;
  message: string;
  notification_type: 'Announcement' | 'Reminder' | 'Alert' | 'Event' | 'General';
  priority: 'Low' | 'Normal' | 'High' | 'Urgent';
  target_scope: 'All' | 'Branch' | 'Region' | 'Department' | 'Fellowship' | 'Role' | 'Leadership';
  target_branch_id?: number;
  target_region_id?: number;
  target_department_id?: number;
  target_fellowship_id?: number;
  target_role_id?: number;
  target_leadership_role?: string;
  sent_by?: number;
  sent_at: Date;
  scheduled_for?: Date;
  expires_at?: Date;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}
```

**notification_recipients**
```typescript
interface NotificationRecipient {
  recipient_id: number;
  notification_id: number;
  member_id: number;
  is_read: boolean;
  read_at?: Date;
  is_dismissed: boolean;
  dismissed_at?: Date;
}
```

### Data Validation Rules

**Member Validation:**
- Email must be unique among active members
- Phone must be unique among active members
- Date of birth must not be in the future
- Membership date must not be in the future
- Emergency contact phone required if member is a leader

**Branch Leadership Validation:**
- Only one current main pastor per branch
- End date must be >= start date
- Member cannot hold same role twice in same branch simultaneously

**Department Assignment Validation:**
- Member can belong to multiple departments (recommended max 2)
- System warns at 3rd department, admin can override
- Lead and deputy must be different members
- Lead and deputy must be from the same branch

**Fellowship Assignment Validation:**
- Member can belong to only ONE fellowship at a time
- Leader and co-leader must be different members
- Leader and co-leader must be from the same branch

**Attendance Validation:**
- No duplicate attendance records for same member and service/meeting
- Arrival time must be <= service/meeting date
- Recorded_by must be an active member

**Soul Validation:**
- Phone number required
- Assigned member must be active
- When status is Converted, converted_to_member_id required
- Follow-up contact date must be <= current date

**Donation Validation:**
- Amount must be > 0
- When purpose is Other, description required
- Currency must be GBP for MVP
- Stripe payment ID required for online donations

**Form Validation:**
- When scope is Branch-specific, target_branch_id required
- Form definition must be valid JSON schema
- Submission data must match form definition schema

**Notification Validation:**
- Target scope must match target_*_id field
- When scope is Branch, target_branch_id required
- When scope is Department, target_department_id required
- Scheduled_for must be <= expires_at if both set


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Branch-Level Data Isolation

*For any* user with role Pastor or Leader, when accessing any resource (members, donations, attendance, souls, reports), the system should return only data from their assigned branch and reject attempts to access data from other branches.

**Validates: Requirements 1.5, 1.7, 4.3, 13.3, 22.4, 25.2, 27.7, 29.3**

### Property 2: Role-Based Access Control

*For any* user and any resource, the system should grant access only if the user's role has permission for that resource type, where Admin has full access, Pastor has branch-level access, Leader has department/fellowship access, and Member has self-only access.

**Validates: Requirements 1.6, 1.7, 1.8, 1.9**

### Property 3: User Registration and JWT Issuance

*For any* valid user credentials, when registering or logging in, the system should create a Cognito account or issue a JWT token respectively, and the token should be valid for exactly 24 hours.

**Validates: Requirements 1.1, 1.2**

### Property 4: Input Validation and Security

*For any* user input containing SQL injection patterns or XSS payloads, the system should reject the input with a validation error and not execute the malicious code.

**Validates: Requirements 1.12, 2.9, 36.6, 36.7**

### Property 5: Member Registration Approval Workflow

*For any* new member registration, the system should create a pending member record, restrict their access to profile and donations only, and when approved by a branch admin, change status to active and send a welcome email.

**Validates: Requirements 2.1, 2.5, 2.7**

### Property 6: Unique Email and Phone for Active Members

*For any* active member, their email and phone number should be unique among all active members, and the system should reject registration or updates that would create duplicates.

**Validates: Requirements 2.10, 3.3**

### Property 7: Profile Data Completeness

*For any* member profile view, the response should include all personal information, church information, department assignments, and fellowship membership where they exist.

**Validates: Requirements 3.1**

### Property 8: Soft Delete Preservation

*For any* member deactivation, the system should set is_active to FALSE and preserve all historical data including the member record, donations, and attendance.

**Validates: Requirements 3.8**

### Property 9: Search and Filter Correctness

*For any* search query with filters (branch, department, fellowship, status), the system should return only members matching all specified criteria, and results should be paginated with correct page counts.

**Validates: Requirements 4.1, 4.2, 4.3, 4.6**

### Property 10: CSV Import Validation and Creation

*For any* CSV file import, the system should validate each row for required fields and data format, report errors with row numbers for invalid data, and create member records only for valid rows.

**Validates: Requirements 5.1, 5.2, 5.3, 5.4**

### Property 11: CSV Export Completeness

*For any* member export request, the system should generate a CSV file containing all member fields for members matching the current filters, respecting branch-level authorization.

**Validates: Requirements 5.5, 5.6, 5.7, 31.2**

### Property 12: Single Current Pastor Per Branch

*For any* branch, when assigning a new main pastor, the system should mark any existing current main pastor as not current, ensuring only one pastor has is_current=TRUE at any time.

**Validates: Requirements 6.3, 6.4**

### Property 13: Referential Integrity for Branch Deletion

*For any* branch with active members assigned, the system should prevent deletion and return an error indicating the branch has dependencies.

**Validates: Requirements 6.7**

### Property 14: Department Join Request Workflow

*For any* member requesting to join a department, the system should create a join request sent to the department leader, warn if the member already has 2 departments, and allow admin override for the 3rd department.

**Validates: Requirements 7.4, 7.6, 7.7**

### Property 15: Department Lead and Deputy Uniqueness

*For any* branch department, the system should prevent assigning the same member as both lead and deputy.

**Validates: Requirements 7.9**

### Property 16: Follow-up Alert Threshold

*For any* member in a department or soul assigned to a worker, when the last follow-up date is more than the configured threshold (7 days for departments, 2-3 days for souls), the system should display an alert to the responsible leader or worker.

**Validates: Requirements 8.4, 15.4**

### Property 17: Follow-up Note Visibility

*For any* department or fellowship, follow-up notes created by any leader should be visible to all other leaders of that group for collaboration.

**Validates: Requirements 8.6**

### Property 18: Single Fellowship Membership

*For any* member, the system should enforce that they can belong to only ONE fellowship at a time, rejecting attempts to join a second fellowship while already in one.

**Validates: Requirements 9.5, 9.6**

### Property 19: Duplicate Attendance Prevention

*For any* service or fellowship meeting, the system should prevent creating duplicate attendance records for the same member, enforcing uniqueness on (service_id/meeting_id, member_id).

**Validates: Requirements 10.8, 11.6**

### Property 20: Attendance Percentage Calculation

*For any* member and fellowship, the attendance percentage should equal (count of Present records / total meetings) * 100, calculated correctly across all meetings.

**Validates: Requirements 11.7**

### Property 21: Attendance Trend Reporting

*For any* branch and date range, the attendance trend report should display a line chart with correct attendance percentages calculated as (present count / total members) for each service.

**Validates: Requirements 12.1, 12.2**

### Property 22: Consecutive Absence Detection

*For any* member who has missed the last 4 consecutive services, the system should include them in the "members needing attention" report.

**Validates: Requirements 12.5**

### Property 23: Automatic Soul Assignment

*For any* soul captured by a member, the system should automatically assign that soul to the capturing member by setting assigned_member_id to the capturer's ID.

**Validates: Requirements 14.4**

### Property 24: Follow-up Date Update

*For any* follow-up logged for a soul, the system should update the soul's last_follow_up_date to the follow-up contact_date.

**Validates: Requirements 15.7**

### Property 25: Soul Status Transition Validation

*For any* soul status update, the system should validate the transition is valid (e.g., New → Following Up → Interested → Converted), and when marking as Converted, require a converted_to_member_id.

**Validates: Requirements 16.2, 16.3**

### Property 26: Donation Purpose and Description Validation

*For any* donation with purpose="Other", the system should require a description field and reject the donation if description is missing or empty.

**Validates: Requirements 17.5, 18.7**

### Property 27: Stripe Payment Integration

*For any* online donation, the system should create a Stripe payment intent, handle the webhook response, and update the donation record with the stripe_payment_id and final status.

**Validates: Requirements 17.1, 17.2, 17.9**

### Property 28: Anonymous Donation Handling

*For any* donation with is_anonymous=TRUE, the system should display "Anonymous" instead of the donor name in all reports and top donor lists.

**Validates: Requirements 18.3, 19.4**

### Property 29: Form Scope and Access Control

*For any* form with scope="Branch-specific", the system should restrict access to members of the target_branch_id only, and for scope="Church-wide", allow access to all members.

**Validates: Requirements 20.4, 20.5**

### Property 30: Form Field Auto-population

*For any* logged-in member viewing a form, the system should auto-populate form fields from their profile where field names match profile attributes (email, phone, name, address).

**Validates: Requirements 20.7**

### Property 31: Form Submission Integration

*For any* pre-built form submission (department signup, soul capture, baby dedication), the system should create the appropriate record (join request, soul, dedication request) and link it to the submitting member.

**Validates: Requirements 21.2, 21.3, 21.4**

### Property 32: Email Notification Delivery

*For any* triggering event (registration, password reset, donation, form submission, soul assignment), the system should call SES to send the appropriate email with correct recipient and content.

**Validates: Requirements 23.1, 23.2, 23.3, 23.4, 23.5**

### Property 33: Unread Notification Count

*For any* user, the unread notification count should equal the number of notifications where is_read=FALSE and the notification targets the user based on their branch/department/fellowship/role, capped at 99 for display.

**Validates: Requirements 24.6**

### Property 34: Broadcast Message Authorization

*For any* leader sending a broadcast message, the system should restrict targeting to only their own department or fellowship, rejecting attempts to target other groups.

**Validates: Requirements 25.2**

### Property 35: Dashboard Data Authorization

*For any* user viewing a dashboard, the system should display only data they have permission to see: Admins see all branches, Pastors see their branch only, Leaders see their department/fellowship only.

**Validates: Requirements 26.1-26.7, 27.1-27.7, 28.1-28.5, 29.3**

### Property 36: Date and Currency Formatting

*For any* date or currency value in exports or API responses, the system should format dates as DD/MM/YYYY in UK timezone (Europe/London) and currency amounts with GBP (£) symbol.

**Validates: Requirements 31.6, 37.2, 37.3**

### Property 37: Accessibility Attributes

*For any* interactive element in the web application, the system should provide appropriate ARIA labels, alt text for images, sufficient color contrast (4.5:1), and keyboard navigation support.

**Validates: Requirements 33.2, 33.3, 33.4, 33.5, 33.7**


## Error Handling

### Error Response Format

All API errors follow a consistent JSON structure:

```typescript
interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Array<{
      field?: string;
      message: string;
    }>;
  };
}
```

### Error Categories

**Validation Errors (400, 422):**
```typescript
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": [
      { "field": "email", "message": "Invalid email format" },
      { "field": "phone", "message": "Phone number required" }
    ]
  }
}
```

**Authentication Errors (401):**
```typescript
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid or expired token"
  }
}
```

**Authorization Errors (403):**
```typescript
{
  "error": {
    "code": "FORBIDDEN",
    "message": "Insufficient permissions to access this resource"
  }
}
```

**Not Found Errors (404):**
```typescript
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Member not found"
  }
}
```

**Conflict Errors (409):**
```typescript
{
  "error": {
    "code": "CONFLICT",
    "message": "Email already exists",
    "details": [
      { "field": "email", "message": "A member with this email already exists" }
    ]
  }
}
```

**Server Errors (500):**
```typescript
{
  "error": {
    "code": "INTERNAL_SERVER_ERROR",
    "message": "An unexpected error occurred"
  }
}
```

### Error Handling Strategy

**Lambda Functions:**
1. Wrap all business logic in try-catch blocks
2. Use shared error handler for consistent responses
3. Log errors to CloudWatch with context (userId, branchId, operation)
4. Never expose internal error details to clients
5. Return appropriate HTTP status codes

**Database Errors:**
- Unique constraint violations → 409 Conflict
- Foreign key violations → 400 Bad Request
- Connection errors → 500 Internal Server Error (retry with exponential backoff)
- Query timeouts → 504 Gateway Timeout

**External Service Errors:**
- Stripe API errors → Return Stripe error message to client
- SES errors → Log error, return 500 to client (email is async, don't block request)
- Cognito errors → Return appropriate auth error (401 or 403)

**Validation Errors:**
- Use Zod schemas for input validation
- Return all validation errors in a single response (don't fail fast)
- Include field names and human-readable messages

**Branch Isolation Errors:**
- When user attempts to access data from another branch → 403 Forbidden
- Log security violations for audit
- Include minimal information in error message (don't reveal other branch data)

### Retry Logic

**Lambda Invocations:**
- API Gateway automatically retries failed Lambda invocations (up to 2 retries)
- Use idempotency keys for operations that shouldn't be retried (donations, soul capture)

**Database Connections:**
- Drizzle ORM handles connection pooling
- Retry transient errors (connection timeouts) up to 3 times with exponential backoff
- Fail fast on permanent errors (syntax errors, constraint violations)

**External API Calls:**
- Stripe: Use Stripe SDK's built-in retry logic (3 retries with exponential backoff)
- SES: Retry up to 3 times for transient errors, log and continue for permanent errors
- Cognito: No retries for auth errors (fail fast)

### Monitoring and Alerting

**CloudWatch Alarms:**
- Lambda error rate > 5% → Alert on-call engineer
- Lambda duration > 10 seconds (p99) → Alert performance team
- API Gateway 5xx errors > 1% → Alert on-call engineer
- Aurora CPU > 80% → Alert database team
- Aurora connections > 80% of max → Alert database team

**X-Ray Tracing:**
- Sample 10% of requests for distributed tracing
- Identify slow queries and bottlenecks
- Trace errors across Lambda chains

**Error Logging:**
- Log all errors to CloudWatch with structured JSON
- Include context: userId, branchId, operation, input (sanitized)
- Retention: 30 days for critical Lambdas, 7 days for standard Lambdas


## Testing Strategy

### Dual Testing Approach

The system uses a hybrid testing strategy that balances comprehensive coverage for critical paths with pragmatic testing for standard features:

**Comprehensive Testing (Write Tests First):**
- Authentication and authorization (branch isolation, role-based access)
- Donations and payment processing (Stripe integration)
- Member data access and multi-tenancy logic
- Branch-level data isolation

**Pragmatic Testing:**
- CRUD operations (events, fellowships, departments)
- Attendance tracking
- Notifications
- Reporting

**Manual Testing:**
- UI flows and user experience
- Edge cases discovered during development
- Accessibility compliance

**Target Coverage:** 40-60% code coverage, focused on high-risk areas

### Unit Testing

**Purpose:** Verify specific examples, edge cases, and error conditions

**Framework:** Jest with TypeScript

**Focus Areas:**
- Input validation (Zod schemas)
- Error handling (error handler utility)
- Business logic (status transitions, calculations)
- Edge cases (empty lists, null values, boundary conditions)

**Example Unit Tests:**
```typescript
describe('Member Validation', () => {
  it('should reject invalid email format', () => {
    const input = { email: 'invalid-email' };
    expect(() => validateMemberInput(input)).toThrow('Invalid email format');
  });

  it('should reject future membership date', () => {
    const input = { membershipDate: '2030-01-01' };
    expect(() => validateMemberInput(input)).toThrow('Membership date cannot be in the future');
  });

  it('should accept valid member input', () => {
    const input = {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      phone: '+447700900000',
      homeBranchId: 1,
      membershipDate: '2020-01-01',
    };
    expect(() => validateMemberInput(input)).not.toThrow();
  });
});
```

### Property-Based Testing

**Purpose:** Verify universal properties across all inputs

**Framework:** fast-check (JavaScript property-based testing library)

**Configuration:**
- 25-50 iterations per property test (balances coverage with execution speed)
- Each test references its design document property
- Tag format: `Feature: kairos-mvp, Property {number}: {property_text}`

**Example Property Tests:**
```typescript
import fc from 'fast-check';

describe('Property 6: Unique Email and Phone for Active Members', () => {
  it('should reject duplicate email among active members', async () => {
    // Feature: kairos-mvp, Property 6: Unique Email and Phone for Active Members
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          firstName: fc.string({ minLength: 1, maxLength: 50 }),
          lastName: fc.string({ minLength: 1, maxLength: 50 }),
          email: fc.emailAddress(),
          phone: fc.string({ minLength: 10, maxLength: 20 }),
          homeBranchId: fc.integer({ min: 1, max: 10 }),
        }),
        async (member1) => {
          // Create first member
          const created1 = await db.members.create(member1);
          
          // Attempt to create second member with same email
          const member2 = { ...member1, firstName: 'Different' };
          
          // Should reject duplicate email
          await expect(db.members.create(member2)).rejects.toThrow('Email already exists');
          
          // Cleanup
          await db.members.delete(created1.id);
        }
      ),
      { numRuns: 50 }
    );
  });
});

describe('Property 12: Single Current Pastor Per Branch', () => {
  it('should mark existing pastor as not current when assigning new pastor', async () => {
    // Feature: kairos-mvp, Property 12: Single Current Pastor Per Branch
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          branchId: fc.integer({ min: 1, max: 10 }),
          pastor1Id: fc.integer({ min: 1, max: 100 }),
          pastor2Id: fc.integer({ min: 1, max: 100 }),
        }).filter(({ pastor1Id, pastor2Id }) => pastor1Id !== pastor2Id),
        async ({ branchId, pastor1Id, pastor2Id }) => {
          // Assign first pastor
          await assignPastor(branchId, pastor1Id);
          
          // Verify first pastor is current
          const pastor1 = await db.branchLeadership.findOne({
            where: { branchId, memberId: pastor1Id, role: 'Main Pastor' }
          });
          expect(pastor1.isCurrent).toBe(true);
          
          // Assign second pastor
          await assignPastor(branchId, pastor2Id);
          
          // Verify first pastor is no longer current
          const pastor1Updated = await db.branchLeadership.findOne({
            where: { branchId, memberId: pastor1Id, role: 'Main Pastor' }
          });
          expect(pastor1Updated.isCurrent).toBe(false);
          
          // Verify second pastor is current
          const pastor2 = await db.branchLeadership.findOne({
            where: { branchId, memberId: pastor2Id, role: 'Main Pastor' }
          });
          expect(pastor2.isCurrent).toBe(true);
          
          // Verify only one current pastor
          const currentPastors = await db.branchLeadership.findMany({
            where: { branchId, role: 'Main Pastor', isCurrent: true }
          });
          expect(currentPastors.length).toBe(1);
        }
      ),
      { numRuns: 50 }
    );
  });
});

describe('Property 18: Single Fellowship Membership', () => {
  it('should prevent member from joining second fellowship', async () => {
    // Feature: kairos-mvp, Property 18: Single Fellowship Membership
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          memberId: fc.integer({ min: 1, max: 100 }),
          fellowship1Id: fc.integer({ min: 1, max: 20 }),
          fellowship2Id: fc.integer({ min: 1, max: 20 }),
        }).filter(({ fellowship1Id, fellowship2Id }) => fellowship1Id !== fellowship2Id),
        async ({ memberId, fellowship1Id, fellowship2Id }) => {
          // Add member to first fellowship
          await addMemberToFellowship(memberId, fellowship1Id);
          
          // Attempt to add to second fellowship
          await expect(
            addMemberToFellowship(memberId, fellowship2Id)
          ).rejects.toThrow('Member already belongs to a fellowship');
          
          // Verify member is only in first fellowship
          const fellowships = await db.fellowshipMembers.findMany({
            where: { memberId, isActive: true }
          });
          expect(fellowships.length).toBe(1);
          expect(fellowships[0].fellowshipId).toBe(fellowship1Id);
        }
      ),
      { numRuns: 50 }
    );
  });
});
```

### Integration Testing

**Purpose:** Test interactions between components

**Framework:** Jest with test database

**Setup:**
- Use Docker container with PostgreSQL for test database
- Run migrations before tests
- Clean database between tests

**Focus Areas:**
- API endpoint flows (request → authorizer → Lambda → database → response)
- Stripe webhook handling
- Email sending via SES (mocked)
- WebSocket connection and messaging

**Example Integration Test:**
```typescript
describe('Member Registration Flow', () => {
  it('should create pending member and send verification email', async () => {
    // Mock SES
    const sesMock = jest.spyOn(ses, 'sendEmail').mockResolvedValue({});
    
    // Register member
    const response = await request(app)
      .post('/v1/members/register')
      .send({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        phone: '+447700900000',
        homeBranchId: 1,
      });
    
    expect(response.status).toBe(201);
    expect(response.body.status).toBe('pending');
    
    // Verify member in database
    const member = await db.members.findOne({ where: { email: 'john@example.com' } });
    expect(member).toBeDefined();
    expect(member.isActive).toBe(false);
    
    // Verify email sent
    expect(sesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'john@example.com',
        subject: 'Welcome to Kairos',
      })
    );
  });
});
```

### End-to-End Testing

**Status:** Deferred to post-MVP

**Rationale:** 10-week timeline requires focus on unit and property tests. E2E tests can be added post-launch.

**Future Approach:**
- Use Playwright for browser automation
- Test critical user journeys (registration, donation, soul capture)
- Run in CI/CD pipeline before production deployment

### Performance Testing

**Status:** Monitored in production, not tested pre-launch

**Rationale:** Performance targets (< 3s page load, < 500ms API response) are better validated with real traffic patterns.

**Monitoring Approach:**
- CloudWatch metrics for Lambda duration and API Gateway latency
- X-Ray tracing for slow queries
- Alarms for performance degradation

### Accessibility Testing

**Automated Testing:**
- Use axe-core for automated WCAG 2.1 AA checks
- Run in CI/CD pipeline on every commit
- Catch common issues (missing alt text, insufficient contrast, missing ARIA labels)

**Manual Testing:**
- Screen reader testing (NVDA, JAWS)
- Keyboard navigation testing
- Color contrast verification
- Focus indicator visibility

### Test Data Generation

**Property-Based Testing:**
- Use fast-check arbitraries to generate random test data
- Define custom arbitraries for domain objects (members, branches, donations)
- Ensure generated data respects constraints (valid emails, phone numbers, dates)

**Example Arbitraries:**
```typescript
const memberArbitrary = fc.record({
  firstName: fc.string({ minLength: 1, maxLength: 50 }),
  lastName: fc.string({ minLength: 1, maxLength: 50 }),
  email: fc.emailAddress(),
  phone: fc.string({ minLength: 10, maxLength: 20 }),
  dateOfBirth: fc.date({ max: new Date() }),
  gender: fc.constantFrom('Male', 'Female'),
  homeBranchId: fc.integer({ min: 1, max: 10 }),
  membershipDate: fc.date({ max: new Date() }),
});

const donationArbitrary = fc.record({
  memberId: fc.integer({ min: 1, max: 100 }),
  branchId: fc.integer({ min: 1, max: 10 }),
  amount: fc.float({ min: 0.01, max: 10000, noNaN: true }),
  currency: fc.constant('GBP'),
  donationPurpose: fc.constantFrom('Offering', 'Tithe', 'Building Fund', 'Other'),
  paymentMethod: fc.constantFrom('Cash', 'Check', 'Bank Transfer', 'Card'),
  donationDate: fc.date({ max: new Date() }),
}).chain((donation) => {
  // If purpose is Other, add description
  if (donation.donationPurpose === 'Other') {
    return fc.record({
      ...donation,
      description: fc.string({ minLength: 1, maxLength: 200 }),
    });
  }
  return fc.constant(donation);
});
```

### CI/CD Testing Pipeline

**GitHub Actions Workflow:**

```yaml
name: Test and Deploy

on:
  push:
    branches: [main, staging]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run test:unit
      - run: npm run test:property
      - run: npm run test:integration
      - run: npm run lint
      - run: npm run type-check
      - run: npm run test:accessibility

  deploy-staging:
    needs: test
    if: github.ref == 'refs/heads/staging'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run build
      - run: npx cdk deploy --all --require-approval never
        env:
          AWS_REGION: eu-west-2
          ENVIRONMENT: staging

  deploy-production:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run build
      - run: npx cdk deploy --all --require-approval never
        env:
          AWS_REGION: eu-west-2
          ENVIRONMENT: production
```

### Test Coverage Goals

**By Module:**
- Authentication & Authorization: 80%+ (critical security)
- Donations & Payments: 80%+ (financial transactions)
- Member Management: 60%+ (core functionality)
- Attendance Tracking: 50%+ (standard CRUD)
- Reporting: 40%+ (read-only queries)

**Overall Target:** 40-60% code coverage with focus on high-risk areas

---

## Document Metadata

**Version:** 1.0  
**Date:** February 3, 2026  
**Status:** Draft - Pending Review  
**Target Launch:** April 12, 2026 (Easter)  
**Development Timeline:** 10 weeks

**Next Steps:**
1. Review and approve design document
2. Create implementation tasks document
3. Begin Week 1 development (infrastructure setup)

---

*This design document provides the complete technical architecture for the Kairos MVP, covering system architecture, component design, data models, 37 correctness properties, error handling, and testing strategy. All design decisions are optimized for the 10-week Easter deadline while maintaining security, scalability, and code quality.*
