# Kairos - MVP Implementation Specification

## Document Overview
This document provides a detailed implementation specification for delivering the Kairos MVP by Easter 2026 (April 12, 2026). It breaks down the 10-week timeline into actionable tasks, technical specifications, and acceptance criteria.

**Timeline:** February 3 - April 12, 2026 (10 weeks)  
**Target:** Fully functional MVP with all 13 core modules  
**Deployment:** Production-ready on AWS with staging environment

---

## Table of Contents
1. [Week 1-2: Foundation & Infrastructure](#week-1-2-foundation--infrastructure)
2. [Week 3-4: Core Entities & Authentication](#week-3-4-core-entities--authentication)
3. [Week 5-6: Attendance & Outreach](#week-5-6-attendance--outreach)
4. [Week 7-8: Financial & Forms](#week-7-8-financial--forms)
5. [Week 9: Notifications & Reports](#week-9-notifications--reports)
6. [Week 10: Polish & Launch](#week-10-polish--launch)
7. [Testing Strategy](#testing-strategy)
8. [Deployment Strategy](#deployment-strategy)
9. [Success Criteria](#success-criteria)

---

## Week 1-2: Foundation & Infrastructure

### Objectives
- Set up development environment and tooling
- Create monorepo structure with Turborepo
- Deploy AWS infrastructure with CDK
- Set up database with Drizzle ORM
- Implement authentication with Cognito
- Create basic Next.js application shell

### Tasks

#### Task 1.1: Monorepo Setup (Day 1-2)
**Description:** Initialize Turborepo monorepo with all packages

**Technical Spec:**
```bash
# Initialize monorepo
npx create-turbo@latest kairos
cd kairos

# Package structure
kairos/
├── apps/
│   ├── web/              # Next.js web app
│   └── api/              # Lambda functions
├── packages/
│   ├── types/            # Shared TypeScript types
│   ├── ui/               # Shadcn/ui components
│   ├── utils/            # Shared utilities
│   ├── database/         # Drizzle ORM schemas
│   └── api-client/       # Generated API client
├── infrastructure/       # AWS CDK code
├── turbo.json
└── package.json
```

**Dependencies:**
- turborepo
- typescript
- eslint
- prettier

**Acceptance Criteria:**
- [ ] Monorepo structure created
- [ ] All packages can import from each other
- [ ] `turbo build` builds all packages
- [ ] `turbo dev` starts all dev servers
- [ ] ESLint and Prettier configured


#### Task 1.2: AWS CDK Infrastructure Setup (Day 2-3)
**Description:** Create AWS infrastructure using CDK (TypeScript)

**Technical Spec:**
```typescript
// infrastructure/lib/stacks/network-stack.ts
export class NetworkStack extends Stack {
  public readonly vpc: ec2.Vpc;
  
  constructor(scope: Construct, id: string, props: StackProps) {
    super(scope, id, props);
    
    // VPC with 2 private subnets across 2 AZs
    this.vpc = new ec2.Vpc(this, 'KairosVpc', {
      cidr: '10.0.0.0/16',
      maxAzs: 2,
      natGateways: 0, // Use VPC endpoints instead
      subnetConfiguration: [
        {
          name: 'Private',
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
          cidrMask: 24,
        },
      ],
    });
    
    // VPC Endpoints (avoid NAT Gateway costs)
    this.vpc.addGatewayEndpoint('S3Endpoint', {
      service: ec2.GatewayVpcEndpointAwsService.S3,
    });
    
    this.vpc.addInterfaceEndpoint('SecretsManagerEndpoint', {
      service: ec2.InterfaceVpcEndpointAwsService.SECRETS_MANAGER,
    });
  }
}
```

**Stacks to Create:**
1. NetworkStack (VPC, subnets, endpoints)
2. DatabaseStack (Aurora Serverless v2)
3. AuthStack (Cognito User Pool)
4. StorageStack (S3 buckets, CloudFront)
5. SecretsStack (Secrets Manager, Parameter Store)

**Acceptance Criteria:**
- [ ] VPC created with 2 private subnets
- [ ] Aurora Serverless v2 cluster created
- [ ] Cognito User Pool created
- [ ] S3 buckets created (files, exports)
- [ ] CloudFront distribution created
- [ ] Secrets Manager configured
- [ ] `cdk deploy` deploys to staging
- [ ] All resources tagged with environment

#### Task 1.3: Database Schema with Drizzle (Day 3-4)
**Description:** Implement database schema using Drizzle ORM

**Technical Spec:**
```typescript
// packages/database/src/schema/members.ts
import { pgTable, serial, varchar, date, boolean, timestamp } from 'drizzle-orm/pg-core';

export const members = pgTable('members', {
  memberId: serial('member_id').primaryKey(),
  firstName: varchar('first_name', { length: 100 }).notNull(),
  lastName: varchar('last_name', { length: 100 }).notNull(),
  email: varchar('email', { length: 100 }).unique(),
  phone: varchar('phone', { length: 20 }),
  homeBranchId: integer('home_branch_id').notNull().references(() => branches.branchId),
  membershipDate: date('membership_date').notNull().defaultNow(),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
```

**Tables to Implement (from schema.sql):**
1. regions
2. branches
3. members
4. branch_leadership
5. roles
6. member_roles
7. fellowships
8. fellowship_members
9. departments
10. branch_departments
11. department_members
12. services
13. service_attendance
14. fellowship_meetings
15. fellowship_meeting_attendance
16. outreach_programs
17. souls
18. follow_ups
19. donations
20. notifications
21. notification_recipients
22. events
23. event_registrations

**Acceptance Criteria:**
- [ ] All 23 tables defined in Drizzle schema
- [ ] Foreign key relationships configured
- [ ] Indexes created on foreign keys
- [ ] Migrations generated
- [ ] `npm run migrate` applies migrations
- [ ] Database connection tested


#### Task 1.4: Cognito Authentication Setup (Day 4-5)
**Description:** Configure Cognito User Pool and implement auth flows

**Technical Spec:**
```typescript
// infrastructure/lib/stacks/auth-stack.ts
export class AuthStack extends Stack {
  public readonly userPool: cognito.UserPool;
  public readonly userPoolClient: cognito.UserPoolClient;
  
  constructor(scope: Construct, id: string, props: StackProps) {
    super(scope, id, props);
    
    this.userPool = new cognito.UserPool(this, 'KairosUserPool', {
      userPoolName: `kairos-${props.env}-users`,
      selfSignUpEnabled: true,
      signInAliases: {
        email: true,
      },
      autoVerify: {
        email: true,
      },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: false,
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      standardAttributes: {
        email: {
          required: true,
          mutable: true,
        },
        givenName: {
          required: true,
          mutable: true,
        },
        familyName: {
          required: true,
          mutable: true,
        },
      },
      customAttributes: {
        memberId: new cognito.StringAttribute({ mutable: false }),
        branchId: new cognito.StringAttribute({ mutable: true }),
        role: new cognito.StringAttribute({ mutable: true }),
      },
    });
    
    this.userPoolClient = this.userPool.addClient('WebClient', {
      authFlows: {
        userPassword: true,
        userSrp: true,
      },
      oAuth: {
        flows: {
          authorizationCodeGrant: true,
        },
        scopes: [cognito.OAuthScope.EMAIL, cognito.OAuthScope.OPENID, cognito.OAuthScope.PROFILE],
      },
    });
  }
}
```

**Acceptance Criteria:**
- [ ] Cognito User Pool created
- [ ] Email verification enabled
- [ ] Password policy configured
- [ ] Custom attributes added (memberId, branchId, role)
- [ ] User Pool Client created
- [ ] Test user can register and login

#### Task 1.5: Custom Authorizer Lambda (Day 5-6)
**Description:** Implement custom authorizer for branch-level isolation

**Technical Spec:**
```typescript
// apps/api/src/auth/authorizer.ts
import { APIGatewayAuthorizerResult, APIGatewayTokenAuthorizerEvent } from 'aws-lambda';
import { CognitoJwtVerifier } from 'aws-jwt-verify';
import { db } from '@kairos/database';
import { members, memberRoles } from '@kairos/database/schema';
import { eq } from 'drizzle-orm';

const verifier = CognitoJwtVerifier.create({
  userPoolId: process.env.USER_POOL_ID!,
  tokenUse: 'access',
  clientId: process.env.USER_POOL_CLIENT_ID!,
});

export const handler = async (event: APIGatewayTokenAuthorizerEvent): Promise<APIGatewayAuthorizerResult> => {
  try {
    // 1. Extract and verify JWT
    const token = event.authorizationToken.replace('Bearer ', '');
    const payload = await verifier.verify(token);
    
    // 2. Get member details from database
    const member = await db.query.members.findFirst({
      where: eq(members.email, payload.email),
      with: {
        roles: true,
        branch: true,
      },
    });
    
    if (!member || !member.isActive) {
      throw new Error('Member not found or inactive');
    }
    
    // 3. Build authorization context
    const roles = member.roles.map(r => r.roleName);
    const isAdmin = roles.includes('Admin');
    const isPastor = roles.includes('Pastor');
    
    // 4. Return policy with context
    return {
      principalId: member.memberId.toString(),
      policyDocument: {
        Version: '2012-10-17',
        Statement: [{
          Action: 'execute-api:Invoke',
          Effect: 'Allow',
          Resource: event.methodArn,
        }],
      },
      context: {
        memberId: member.memberId.toString(),
        branchId: member.homeBranchId.toString(),
        roles: JSON.stringify(roles),
        isAdmin: isAdmin.toString(),
        isPastor: isPastor.toString(),
      },
    };
  } catch (error) {
    console.error('Authorization failed:', error);
    throw new Error('Unauthorized');
  }
};
```

**Acceptance Criteria:**
- [ ] Authorizer validates JWT from Cognito
- [ ] Authorizer fetches member details from database
- [ ] Authorizer injects context (memberId, branchId, roles)
- [ ] Authorizer denies access for inactive members
- [ ] Test with valid and invalid tokens


#### Task 1.6: Next.js Application Shell (Day 6-8)
**Description:** Create basic Next.js app with layout and navigation

**Technical Spec:**
```typescript
// apps/web/src/app/layout.tsx
import { Inter } from 'next/font/google';
import { AuthProvider } from '@/components/providers/auth-provider';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}

// apps/web/src/app/(dashboard)/layout.tsx
import { Header } from '@/components/layout/header';
import { Sidebar } from '@/components/layout/sidebar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
```

**Components to Create:**
1. Layout components (Header, Sidebar, Footer)
2. Auth components (LoginForm, RegisterForm)
3. UI components (Button, Input, Card, Table, Modal)
4. Auth provider (React Context)

**Acceptance Criteria:**
- [ ] Next.js app created with App Router
- [ ] Shadcn/ui installed and configured
- [ ] Layout components created (Header, Sidebar)
- [ ] Auth pages created (Login, Register)
- [ ] Auth provider implemented
- [ ] Tailwind CSS configured with design tokens
- [ ] App runs on `localhost:3002`

#### Task 1.7: API Gateway Setup (Day 8-9)
**Description:** Create API Gateway HTTP API with custom authorizer

**Technical Spec:**
```typescript
// infrastructure/lib/stacks/api-stack.ts
export class ApiStack extends Stack {
  public readonly httpApi: apigatewayv2.HttpApi;
  public readonly authorizer: apigatewayv2.HttpAuthorizer;
  
  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id, props);
    
    // Create HTTP API
    this.httpApi = new apigatewayv2.HttpApi(this, 'KairosHttpApi', {
      apiName: `kairos-${props.env}-api`,
      corsPreflight: {
        allowOrigins: ['http://localhost:3002', 'https://app.kairos.church'],
        allowMethods: [apigatewayv2.CorsHttpMethod.ANY],
        allowHeaders: ['*'],
        allowCredentials: true,
      },
    });
    
    // Create custom authorizer
    this.authorizer = new apigatewayv2.HttpAuthorizer(this, 'CustomAuthorizer', {
      httpApi: this.httpApi,
      identitySource: ['$request.header.Authorization'],
      type: apigatewayv2.HttpAuthorizerType.LAMBDA,
      authorizerName: 'custom-authorizer',
      responseTypes: [apigatewayv2.HttpAuthorizerResponseType.SIMPLE],
      handler: props.authorizerFunction,
      resultsCacheTtl: Duration.minutes(5),
    });
  }
}
```

**Acceptance Criteria:**
- [ ] HTTP API created
- [ ] Custom authorizer attached
- [ ] CORS configured
- [ ] API URL exported
- [ ] Test endpoint responds

#### Task 1.8: Shared Lambda Layer (Day 9-10)
**Description:** Create shared Lambda layer with common utilities

**Technical Spec:**
```typescript
// packages/lambda-layer/src/index.ts
export { db } from './db-client';
export { validateInput } from './validator';
export { handleError } from './error-handler';
export { getAuthContext } from './auth-context';
export { logger } from './logger';

// packages/lambda-layer/src/db-client.ts
import { drizzle } from 'drizzle-orm/aws-data-api/pg';
import { RDSDataClient } from '@aws-sdk/client-rds-data';
import * as schema from '@kairos/database/schema';

const rdsClient = new RDSDataClient({});

export const db = drizzle(rdsClient, {
  database: process.env.DATABASE_NAME!,
  secretArn: process.env.DATABASE_SECRET_ARN!,
  resourceArn: process.env.DATABASE_CLUSTER_ARN!,
  schema,
});
```

**Acceptance Criteria:**
- [ ] Lambda layer created with shared utilities
- [ ] Database client configured
- [ ] Validator using Zod
- [ ] Error handler with standard format
- [ ] Auth context extractor
- [ ] Logger with structured logging
- [ ] Layer deployed to AWS

---

## Week 3-4: Core Entities & Authentication

### Objectives
- Implement member management (CRUD, import, export, approval)
- Implement branch management
- Implement department management
- Implement fellowship management
- Create admin dashboard
- Implement role-based access control


### Tasks

#### Task 3.1: Member Management API (Day 11-13)
**Description:** Implement all member management Lambda functions

**Lambda Functions to Create:**
1. `members-create` - POST /v1/members
2. `members-list` - GET /v1/members
3. `members-get` - GET /v1/members/{id}
4. `members-update` - PUT /v1/members/{id}
5. `members-delete` - DELETE /v1/members/{id}
6. `members-approve` - POST /v1/members/{id}/approve
7. `members-import` - POST /v1/members/import
8. `members-export` - GET /v1/members/export

**Example Implementation:**
```typescript
// apps/api/src/members/members-create.ts
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { db, validateInput, handleError, getAuthContext, logger } from '@kairos/lambda-layer';
import { members } from '@kairos/database/schema';
import { z } from 'zod';

const memberSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.string().email().optional(),
  phone: z.string().max(20).optional(),
  homeBranchId: z.number().int().positive(),
  dateOfBirth: z.string().date().optional(),
  gender: z.enum(['Male', 'Female']).optional(),
  address: z.string().optional(),
});

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    // 1. Get auth context
    const authContext = getAuthContext(event);
    
    // 2. Parse and validate input
    const input = JSON.parse(event.body || '{}');
    const validated = memberSchema.parse(input);
    
    // 3. Enforce branch isolation (non-admins can only create for their branch)
    if (!authContext.isAdmin && validated.homeBranchId !== authContext.branchId) {
      return {
        statusCode: 403,
        body: JSON.stringify({ error: { code: 'FORBIDDEN', message: 'Cannot create member for different branch' } }),
      };
    }
    
    // 4. Create member
    const [member] = await db.insert(members).values({
      ...validated,
      isActive: false, // Pending approval
    }).returning();
    
    // 5. Log and return
    logger.info('Member created', { memberId: member.memberId, branchId: member.homeBranchId });
    
    return {
      statusCode: 201,
      body: JSON.stringify(member),
    };
  } catch (error) {
    return handleError(error);
  }
};
```

**Acceptance Criteria:**
- [ ] All 8 member Lambda functions created
- [ ] Input validation with Zod
- [ ] Branch isolation enforced
- [ ] Soft delete implemented
- [ ] CSV import/export working
- [ ] Approval workflow working
- [ ] Tests written for critical paths

#### Task 3.2: Member Management UI (Day 13-15)
**Description:** Create member management pages in Next.js

**Pages to Create:**
1. `/members` - Member list with search, filters, pagination
2. `/members/new` - Create new member form
3. `/members/[id]` - Member detail page with tabs
4. `/members/pending` - Pending approvals list
5. `/members/import` - CSV import page

**Example Implementation:**
```typescript
// apps/web/src/app/(dashboard)/members/page.tsx
'use client';

import { useState } from 'react';
import { useMembers } from '@/hooks/use-members';
import { DataTable } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Plus, Download, Upload } from 'lucide-react';

export default function MembersPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  
  const { data, isLoading } = useMembers({ search, status, page, limit: 50 });
  
  const columns = [
    { key: 'firstName', label: 'First Name', sortable: true },
    { key: 'lastName', label: 'Last Name', sortable: true },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Phone' },
    { key: 'branch.branchName', label: 'Branch' },
    { key: 'status', label: 'Status', render: (row) => <StatusBadge status={row.isActive ? 'active' : 'pending'} /> },
    { key: 'actions', label: 'Actions', render: (row) => <MemberActions member={row} /> },
  ];
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-semibold">Members</h1>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => window.location.href = '/members/import'}>
            <Upload className="w-4 h-4 mr-2" />
            Import
          </Button>
          <Button variant="secondary" onClick={() => exportMembers()}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button onClick={() => window.location.href = '/members/new'}>
            <Plus className="w-4 h-4 mr-2" />
            Add Member
          </Button>
        </div>
      </div>
      
      <div className="flex gap-4">
        <Input
          placeholder="Search by name, email, or phone"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-md"
        />
        <Select value={status} onChange={setStatus}>
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="pending">Pending</option>
        </Select>
      </div>
      
      <DataTable
        columns={columns}
        data={data?.data || []}
        isLoading={isLoading}
        pagination={{
          page: data?.pagination.page || 1,
          totalPages: data?.pagination.totalPages || 1,
          onPageChange: setPage,
        }}
      />
    </div>
  );
}
```

**Acceptance Criteria:**
- [ ] Member list page with search and filters
- [ ] Create member form with validation
- [ ] Member detail page with tabs (Profile, Donations, Attendance)
- [ ] Pending approvals page
- [ ] CSV import page with preview
- [ ] CSV export functionality
- [ ] Responsive design (works on mobile)


#### Task 3.3: Branch & Department Management (Day 15-17)
**Description:** Implement branch and department management

**Lambda Functions:**
- Branches: create, list, get, update, assign-pastor
- Departments: create, list, get, update, assign-member, approve-request

**Key Business Logic:**
- Only one current Main Pastor per branch
- Department join requests require leader approval
- Branch admins have visibility on requests
- Max 2 departments recommended (warn at 3rd)

**Acceptance Criteria:**
- [ ] Branch CRUD operations
- [ ] Pastor assignment with history tracking
- [ ] Department CRUD operations
- [ ] Department join request workflow
- [ ] Branch and department UI pages
- [ ] Tests for business logic

#### Task 3.4: Fellowship Management (Day 17-19)
**Description:** Implement fellowship management

**Lambda Functions:**
- Fellowships: create, list, get, update, add-member, remove-member
- Fellowship meetings: create, record-attendance

**Key Business Logic:**
- Members can belong to ONE fellowship only
- Fellowship types: K-Groups, Kharis Express, New Breeds, etc.
- Leader or delegate can record attendance

**Acceptance Criteria:**
- [ ] Fellowship CRUD operations
- [ ] Member assignment (one fellowship only)
- [ ] Meeting creation and attendance recording
- [ ] Fellowship UI pages
- [ ] Tests for one-fellowship constraint

#### Task 3.5: Admin Dashboard (Day 19-20)
**Description:** Create role-based dashboard

**Dashboard Variants:**
1. Admin Dashboard - All metrics, all branches
2. Pastor Dashboard - Branch-specific metrics
3. Leader Dashboard - Department/fellowship metrics
4. Member Dashboard - Personal info and history

**Metrics to Display:**
- Total members (active)
- Total branches/departments/fellowships
- Recent donations (last 30 days)
- Recent souls captured (last 30 days)
- Service attendance % (last 4 weeks)
- Recent activity feed

**Acceptance Criteria:**
- [ ] Dashboard shows correct metrics based on role
- [ ] Charts display attendance trends
- [ ] Activity feed shows recent actions
- [ ] Stat cards with change indicators
- [ ] Responsive design

---

## Week 5-6: Attendance & Outreach

### Objectives
- Implement service attendance tracking
- Implement fellowship attendance tracking
- Implement outreach program management
- Implement soul capture and follow-up tracking
- Create Kanban board for soul follow-ups

### Tasks

#### Task 5.1: Service Attendance API (Day 21-22)
**Description:** Implement service attendance tracking

**Lambda Functions:**
- `attendance-record-service` - POST /v1/attendance/services
- `attendance-list-services` - GET /v1/attendance/services
- `attendance-get-trends` - GET /v1/attendance/trends

**Key Business Logic:**
- Admins, Pastors, or Leaders can record attendance
- Status: Present, Absent, Virtual
- Track first-time visitors
- Bulk attendance entry

**Example Implementation:**
```typescript
// apps/api/src/attendance/record-service.ts
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const authContext = getAuthContext(event);
    const input = JSON.parse(event.body || '{}');
    
    // Validate input
    const validated = z.object({
      serviceId: z.number().int().positive(),
      attendanceRecords: z.array(z.object({
        memberId: z.number().int().positive(),
        attendanceStatus: z.enum(['Present', 'Absent', 'Virtual']),
        isFirstTimeVisitor: z.boolean().optional(),
      })),
    }).parse(input);
    
    // Check permissions (must be Admin, Pastor, or Leader)
    if (!authContext.isAdmin && !authContext.isPastor && !authContext.roles.includes('Leader')) {
      return { statusCode: 403, body: JSON.stringify({ error: 'Forbidden' }) };
    }
    
    // Bulk insert attendance records
    await db.insert(serviceAttendance).values(
      validated.attendanceRecords.map(record => ({
        ...record,
        recordedBy: authContext.memberId,
        recordedAt: new Date(),
      }))
    );
    
    return {
      statusCode: 201,
      body: JSON.stringify({ message: 'Attendance recorded', count: validated.attendanceRecords.length }),
    };
  } catch (error) {
    return handleError(error);
  }
};
```

**Acceptance Criteria:**
- [ ] Service attendance recording API
- [ ] Bulk attendance entry
- [ ] Attendance trends calculation
- [ ] Service attendance UI page
- [ ] Tests for permissions


#### Task 5.2: Fellowship Attendance API (Day 22-23)
**Description:** Implement fellowship meeting attendance

**Lambda Functions:**
- `fellowship-meetings-create` - POST /v1/fellowships/{id}/meetings
- `fellowship-meetings-record-attendance` - POST /v1/fellowships/{id}/meetings/{meetingId}/attendance
- `fellowship-meetings-list` - GET /v1/fellowships/{id}/meetings

**Key Business Logic:**
- Fellowship leader or delegate can record attendance
- Status: Present, Absent, Excused, Late
- Track meeting notes and topics

**Acceptance Criteria:**
- [ ] Fellowship meeting creation API
- [ ] Fellowship attendance recording API
- [ ] Fellowship attendance UI page
- [ ] Tests for leader permissions

#### Task 5.3: Outreach Program Management (Day 23-24)
**Description:** Implement outreach program management

**Lambda Functions:**
- `outreach-create` - POST /v1/outreach/programs
- `outreach-list` - GET /v1/outreach/programs
- `outreach-get` - GET /v1/outreach/programs/{id}
- `outreach-register-worker` - POST /v1/outreach/programs/{id}/workers

**Key Business Logic:**
- Members can only register for their own branch's programs
- Track coordinator and participants
- Link souls captured to specific programs

**Acceptance Criteria:**
- [ ] Outreach program CRUD operations
- [ ] Worker registration
- [ ] Outreach program UI pages
- [ ] Tests for branch isolation

#### Task 5.4: Soul Capture & Follow-up API (Day 24-26)
**Description:** Implement evangelism tracking

**Lambda Functions:**
- `souls-capture` - POST /v1/souls
- `souls-list` - GET /v1/souls
- `souls-get` - GET /v1/souls/{id}
- `souls-assign` - POST /v1/souls/{id}/assign
- `souls-log-followup` - POST /v1/souls/{id}/followups
- `souls-update-status` - PUT /v1/souls/{id}/status

**Key Business Logic:**
- Soul automatically assigned to member who captured it
- Can be reassigned to different worker
- Status pipeline: New → Following Up → Interested → Converted / Not Interested
- Follow-up alerts: 2-3 days without follow-up (configurable)
- Follow-up notes visible to other leaders

**Example Implementation:**
```typescript
// apps/api/src/souls/souls-capture.ts
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const authContext = getAuthContext(event);
    const input = JSON.parse(event.body || '{}');
    
    const validated = z.object({
      outreachId: z.number().int().positive(),
      firstName: z.string().min(1).max(100),
      lastName: z.string().min(1).max(100),
      phone: z.string().max(20).optional(),
      email: z.string().email().optional(),
      address: z.string().optional(),
      notes: z.string().optional(),
    }).parse(input);
    
    // Create soul record
    const [soul] = await db.insert(souls).values({
      ...validated,
      assignedMemberId: authContext.memberId, // Auto-assign to capturer
      status: 'New',
    }).returning();
    
    // Create initial follow-up record
    await db.insert(followUps).values({
      soulId: soul.soulId,
      memberId: authContext.memberId,
      followUpDate: new Date(),
      contactStatus: 'Successful',
      notes: 'Initial contact - soul captured',
    });
    
    return {
      statusCode: 201,
      body: JSON.stringify(soul),
    };
  } catch (error) {
    return handleError(error);
  }
};
```

**Acceptance Criteria:**
- [ ] Soul capture API
- [ ] Soul assignment/reassignment API
- [ ] Follow-up logging API
- [ ] Status update API
- [ ] Follow-up alerts (EventBridge scheduled lambda)
- [ ] Tests for auto-assignment

#### Task 5.5: Soul Follow-up Kanban Board UI (Day 26-28)
**Description:** Create Kanban board for soul tracking

**Features:**
- Columns: New, Following Up, Interested, Converted
- Drag-and-drop to update status
- Soul cards show name, phone, days since last follow-up
- Warning icon if no follow-up in 2+ days
- Click card to open detail modal
- Quick actions: Call, Log Follow-up

**Acceptance Criteria:**
- [ ] Kanban board with 4 columns
- [ ] Drag-and-drop working
- [ ] Soul cards display correctly
- [ ] Warning indicators for overdue follow-ups
- [ ] Detail modal with follow-up history
- [ ] Log follow-up modal
- [ ] Responsive design

---

## Week 7-8: Financial & Forms

### Objectives
- Implement Stripe payment integration
- Implement donation recording (online + manual)
- Implement donation history and reports
- Implement form builder
- Implement form submissions
- Create pre-built forms

### Tasks

#### Task 7.1: Stripe Integration (Day 29-30)
**Description:** Integrate Stripe for online donations

**Lambda Functions:**
- `donations-create-payment-intent` - POST /v1/donations/payment-intent
- `donations-stripe-webhook` - POST /v1/donations/stripe-webhook

**Technical Spec:**
```typescript
// apps/api/src/donations/create-payment-intent.ts
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const authContext = getAuthContext(event);
    const input = JSON.parse(event.body || '{}');
    
    const validated = z.object({
      amount: z.number().positive(),
      currency: z.literal('GBP'),
      donationPurpose: z.enum(['Offering', 'Building Fund', 'Other']),
      description: z.string().optional(),
    }).parse(input);
    
    // Create Stripe payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(validated.amount * 100), // Convert to pence
      currency: validated.currency.toLowerCase(),
      metadata: {
        memberId: authContext.memberId,
        branchId: authContext.branchId,
        donationPurpose: validated.donationPurpose,
        description: validated.description || '',
      },
    });
    
    return {
      statusCode: 200,
      body: JSON.stringify({ clientSecret: paymentIntent.client_secret }),
    };
  } catch (error) {
    return handleError(error);
  }
};
```

**Acceptance Criteria:**
- [ ] Stripe SDK configured
- [ ] Payment intent creation API
- [ ] Stripe webhook handler
- [ ] Webhook signature verification
- [ ] Donation record created on successful payment
- [ ] Receipt email sent via SES
- [ ] Tests for payment flow


#### Task 7.2: Donation Management API (Day 30-32)
**Description:** Implement donation recording and reporting

**Lambda Functions:**
- `donations-create-manual` - POST /v1/donations/manual
- `donations-list` - GET /v1/donations
- `donations-get` - GET /v1/donations/{id}
- `donations-reports` - GET /v1/donations/reports
- `donations-export` - GET /v1/donations/export

**Key Business Logic:**
- GBP only for MVP
- Purpose: Offering, Tithe, Building Fund, Other (description required for Other)
- Can record without linking to member (anonymous walk-in)
- Anonymous donations show as "Anonymous" in reports (not hidden)
- Payment methods: Cash, Check, Bank Transfer, Mobile Money, Card, Online, Other

**Acceptance Criteria:**
- [ ] Manual donation recording API
- [ ] Donation list with filters (date range, purpose, branch)
- [ ] Donation reports (total by purpose, top donors)
- [ ] CSV export
- [ ] Tests for anonymity handling

#### Task 7.3: Donation UI (Day 32-34)
**Description:** Create donation management pages

**Pages:**
1. `/donations` - Donation list with filters
2. `/donations/new` - Record donation (tabs: Online, Manual Entry)
3. `/donations/reports` - Donation reports and charts

**Online Donation Flow:**
1. Member enters amount and purpose
2. Stripe Elements for card input
3. Submit payment
4. Show success message with receipt

**Manual Donation Flow:**
1. Search for member (optional)
2. Enter amount, purpose, payment method
3. Select date
4. Optional anonymity checkbox
5. Submit and show success

**Acceptance Criteria:**
- [ ] Donation list page
- [ ] Online donation page with Stripe Elements
- [ ] Manual donation entry page
- [ ] Donation reports page with charts
- [ ] Receipt display/download
- [ ] Responsive design

#### Task 7.4: Form Builder API (Day 34-36)
**Description:** Implement form builder and submissions

**Lambda Functions:**
- `forms-create` - POST /v1/forms
- `forms-list` - GET /v1/forms
- `forms-get` - GET /v1/forms/{id}
- `forms-submit` - POST /v1/forms/{id}/submit
- `forms-list-submissions` - GET /v1/forms/{id}/submissions
- `forms-export-submissions` - GET /v1/forms/{id}/submissions/export

**Form Schema:**
```typescript
const formSchema = z.object({
  formName: z.string().min(1).max(200),
  formScope: z.enum(['Church-wide', 'Branch-specific']),
  branchId: z.number().int().positive().optional(),
  fields: z.array(z.object({
    fieldId: z.string(),
    fieldType: z.enum(['Text', 'Email', 'Phone', 'Number', 'Date', 'Dropdown', 'Checkbox', 'Radio', 'Textarea']),
    label: z.string(),
    placeholder: z.string().optional(),
    required: z.boolean(),
    autoPopulate: z.boolean().optional(), // From member profile
    options: z.array(z.string()).optional(), // For dropdown, radio
  })),
});
```

**Key Business Logic:**
- Admins and Leaders can create forms
- Form scope: Church-wide or Branch-specific
- Branch-specific forms only accessible to that branch
- Auto-populate fields from member profile (if logged in)

**Acceptance Criteria:**
- [ ] Form CRUD operations
- [ ] Form submission API
- [ ] Submission list and export
- [ ] Auto-populate from member profile
- [ ] Branch-specific access control
- [ ] Tests for permissions

#### Task 7.5: Form Builder UI (Day 36-38)
**Description:** Create form builder and submission pages

**Pages:**
1. `/forms` - Form list
2. `/forms/new` - Form builder (drag-and-drop)
3. `/forms/[id]` - Form detail and submissions
4. `/forms/[id]/submit` - Public form submission page

**Form Builder Features:**
- Drag field types from left panel to preview area
- Click field to configure (label, placeholder, required, etc.)
- Reorder fields by dragging
- Delete field
- Preview form
- Save form

**Acceptance Criteria:**
- [ ] Form list page
- [ ] Form builder with drag-and-drop
- [ ] Field configuration panel
- [ ] Form preview
- [ ] Form submission page
- [ ] Submissions list page
- [ ] CSV export of submissions
- [ ] Responsive design

#### Task 7.6: Pre-built Forms (Day 38-40)
**Description:** Create pre-built form templates

**Forms to Create:**
1. Department signup request
2. Soul capture (evangelism)
3. Baby naming request
4. Baby dedication request
5. First-time visitor form
6. Altar call form (new believers)
7. Baptism request
8. Testimony submission

**Acceptance Criteria:**
- [ ] All 8 pre-built forms created
- [ ] Forms integrated with relevant modules (e.g., soul capture → souls table)
- [ ] Forms accessible from relevant pages
- [ ] Tests for form integrations

---

## Week 9: Notifications & Reports

### Objectives
- Implement email notifications (SES)
- Implement in-app notifications
- Implement broadcast messages
- Create dashboards (admin, pastor, leader)
- Implement pre-built reports
- Implement CSV export

### Tasks

#### Task 9.1: Email Notifications (Day 41-42)
**Description:** Implement email notifications using SES

**Lambda Functions:**
- `notifications-send-email` - Internal function (not exposed via API)

**Email Templates:**
1. Welcome email (on registration)
2. Password reset email
3. Donation receipt email
4. Form submission confirmation
5. Follow-up assignment notification

**Technical Spec:**
```typescript
// apps/api/src/notifications/send-email.ts
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

const sesClient = new SESClient({});

export async function sendEmail(params: {
  to: string;
  subject: string;
  htmlBody: string;
  textBody: string;
}) {
  const command = new SendEmailCommand({
    Source: process.env.FROM_EMAIL!,
    Destination: {
      ToAddresses: [params.to],
    },
    Message: {
      Subject: {
        Data: params.subject,
      },
      Body: {
        Html: {
          Data: params.htmlBody,
        },
        Text: {
          Data: params.textBody,
        },
      },
    },
  });
  
  await sesClient.send(command);
}
```

**Acceptance Criteria:**
- [ ] SES configured and verified
- [ ] Email templates created
- [ ] Welcome email sent on registration
- [ ] Donation receipt email sent
- [ ] Form submission confirmation sent
- [ ] Tests for email sending


#### Task 9.2: In-App Notifications API (Day 42-43)
**Description:** Implement in-app notification system

**Lambda Functions:**
- `notifications-create` - POST /v1/notifications
- `notifications-list` - GET /v1/notifications
- `notifications-mark-read` - POST /v1/notifications/{id}/read

**Key Business Logic:**
- Targeting: All, Branch, Region, Department, Fellowship, Role, Leadership
- Priority: Low, Normal, High, Urgent
- No read receipts for MVP (deferred to Phase 2)
- Populate notification_recipients table for targeted members

**Acceptance Criteria:**
- [ ] Notification creation API
- [ ] Notification list API (filtered by member)
- [ ] Mark as read API
- [ ] Notification targeting logic
- [ ] Tests for targeting

#### Task 9.3: Broadcast Messages (Day 43-44)
**Description:** Implement broadcast messaging

**Features:**
- Admins can send to all members or specific branches
- Leaders can only send to their own department/fellowship
- Message includes title, body, priority
- Optional expiration date

**Acceptance Criteria:**
- [ ] Broadcast message API
- [ ] Permission checks (leaders can only send to their groups)
- [ ] Broadcast message UI page
- [ ] Tests for permissions

#### Task 9.4: Notification Center UI (Day 44-45)
**Description:** Create notification center component

**Features:**
- Bell icon in header with badge count
- Dropdown shows recent notifications
- Unread indicator (filled circle)
- Click notification to mark as read and navigate
- "Mark all as read" link
- "View all" link to full notification page

**Acceptance Criteria:**
- [ ] Notification center component in header
- [ ] Badge count shows unread notifications
- [ ] Dropdown shows recent notifications
- [ ] Mark as read on click
- [ ] Full notification page
- [ ] Responsive design

#### Task 9.5: Reports & Dashboards (Day 45-47)
**Description:** Create reporting dashboards

**Dashboards:**
1. Admin Dashboard - All metrics, all branches
2. Pastor Dashboard - Branch-specific metrics
3. Leader Dashboard - Department/fellowship metrics

**Reports:**
1. Attendance trends (line chart, last 8 weeks)
2. Donation summary (bar chart, by purpose)
3. Soul conversion funnel (funnel chart)
4. Member growth (line chart)
5. Top donors (table, anonymity-aware)

**Lambda Functions:**
- `reports-dashboard` - GET /v1/reports/dashboard
- `reports-attendance` - GET /v1/reports/attendance
- `reports-donations` - GET /v1/reports/donations
- `reports-souls` - GET /v1/reports/souls

**Acceptance Criteria:**
- [ ] Dashboard APIs return correct data based on role
- [ ] Charts display correctly
- [ ] Date range filtering
- [ ] CSV export for all reports
- [ ] Responsive design

#### Task 9.6: Power BI Integration (Day 47-48)
**Description:** Implement nightly data export for Power BI

**Lambda Function:**
- `analytics-export` - Scheduled by EventBridge (2 AM daily)

**Technical Spec:**
```typescript
// apps/api/src/analytics/export.ts
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { db } from '@kairos/lambda-layer';
import { members, donations, attendance, souls } from '@kairos/database/schema';

const s3Client = new S3Client({});

export const handler = async () => {
  try {
    // Export members
    const membersData = await db.select().from(members);
    await uploadToS3('members', membersData);
    
    // Export donations
    const donationsData = await db.select().from(donations);
    await uploadToS3('donations', donationsData);
    
    // Export attendance
    const attendanceData = await db.select().from(attendance);
    await uploadToS3('attendance', attendanceData);
    
    // Export souls
    const soulsData = await db.select().from(souls);
    await uploadToS3('souls', soulsData);
    
    console.log('Analytics export completed');
  } catch (error) {
    console.error('Analytics export failed:', error);
    throw error;
  }
};

async function uploadToS3(tableName: string, data: any[]) {
  const key = `analytics/${new Date().toISOString().split('T')[0]}/${tableName}.json`;
  
  await s3Client.send(new PutObjectCommand({
    Bucket: process.env.ANALYTICS_BUCKET!,
    Key: key,
    Body: JSON.stringify(data),
    ContentType: 'application/json',
  }));
}
```

**Acceptance Criteria:**
- [ ] Export lambda created
- [ ] EventBridge schedule configured (2 AM daily)
- [ ] Data exported to S3 in JSON format
- [ ] Power BI can read from S3
- [ ] Tests for export logic

---

## Week 10: Polish & Launch

### Objectives
- Bug fixes and refinements
- Performance optimization
- User acceptance testing (UAT)
- Staging deployment
- Production deployment
- Easter launch preparation

### Tasks

#### Task 10.1: Bug Fixes & Refinements (Day 49-51)
**Description:** Address bugs and polish UI/UX

**Focus Areas:**
- Fix any reported bugs from testing
- Improve error messages
- Add loading states
- Improve form validation feedback
- Polish UI components
- Optimize database queries
- Add missing indexes

**Acceptance Criteria:**
- [ ] All critical bugs fixed
- [ ] All high-priority bugs fixed
- [ ] UI polish complete
- [ ] Error messages clear and helpful
- [ ] Loading states consistent

#### Task 10.2: Performance Optimization (Day 51-52)
**Description:** Optimize application performance

**Focus Areas:**
- Lambda cold start optimization (bundle size)
- Database query optimization
- Add database indexes where needed
- CloudFront caching configuration
- Next.js build optimization
- Image optimization

**Performance Targets:**
- Page load time: < 3 seconds
- API response time: < 500ms (p95)
- Lambda cold start: < 1 second

**Acceptance Criteria:**
- [ ] Lighthouse score > 90
- [ ] Page load time < 3 seconds
- [ ] API response time < 500ms (p95)
- [ ] Lambda cold starts < 1 second
- [ ] CloudFront cache hit rate > 80%

#### Task 10.3: User Acceptance Testing (Day 52-54)
**Description:** Conduct UAT with church leadership

**Test Scenarios:**
1. Member registration and approval
2. Record service attendance
3. Capture soul and log follow-up
4. Record donation (online and manual)
5. Create and submit form
6. Send broadcast message
7. View reports and export CSV

**UAT Participants:**
- Church Administrator
- Pastor
- Department Leader
- Fellowship Leader
- Regular Member

**Acceptance Criteria:**
- [ ] All test scenarios completed successfully
- [ ] Feedback collected and prioritized
- [ ] Critical issues fixed
- [ ] UAT sign-off received

#### Task 10.4: Staging Deployment (Day 54-55)
**Description:** Deploy to staging environment

**Deployment Steps:**
1. Run all tests (unit + integration)
2. Build all packages
3. Deploy CDK stacks to staging
4. Run database migrations
5. Deploy Lambda functions
6. Deploy Next.js app
7. Run smoke tests
8. Verify all features working

**Acceptance Criteria:**
- [ ] All tests passing
- [ ] CDK stacks deployed
- [ ] Database migrations applied
- [ ] Lambda functions deployed
- [ ] Next.js app deployed
- [ ] Smoke tests passing
- [ ] All features verified

#### Task 10.5: Production Deployment (Day 56-57)
**Description:** Deploy to production environment

**Pre-Deployment Checklist:**
- [ ] All staging tests passing
- [ ] UAT sign-off received
- [ ] Database backup created
- [ ] Rollback plan documented
- [ ] Monitoring alerts configured
- [ ] Support team briefed

**Deployment Steps:**
1. Create database backup
2. Deploy CDK stacks to production
3. Run database migrations
4. Deploy Lambda functions
5. Deploy Next.js app
6. Run smoke tests
7. Monitor CloudWatch for errors
8. Verify all features working

**Acceptance Criteria:**
- [ ] Production deployment successful
- [ ] All features working
- [ ] No critical errors in CloudWatch
- [ ] Performance metrics within targets
- [ ] Rollback plan tested

#### Task 10.6: Easter Launch Preparation (Day 58-60)
**Description:** Prepare for Easter launch

**Launch Activities:**
1. Create user documentation
2. Create video tutorials
3. Train church staff
4. Prepare launch announcement
5. Set up support channels
6. Monitor system health

**Documentation to Create:**
- User guide (PDF)
- Quick start guide
- Video tutorials (5-10 minutes each)
- FAQ document
- Support contact information

**Acceptance Criteria:**
- [ ] User documentation complete
- [ ] Video tutorials recorded
- [ ] Church staff trained
- [ ] Launch announcement ready
- [ ] Support channels set up
- [ ] System monitoring active
- [ ] Easter launch successful! 🎉

---

## Testing Strategy

### Unit Tests
**Coverage Target:** 40-60% (focused on high-risk areas)

**Test Framework:** Jest + React Testing Library

**What to Test:**
- Lambda function business logic
- Input validation (Zod schemas)
- Authorization logic
- Database queries (with mocked DB)
- React components (user interactions)

**Example:**
```typescript
// apps/api/src/members/__tests__/members-create.test.ts
import { handler } from '../members-create';
import { db } from '@kairos/lambda-layer';

jest.mock('@kairos/lambda-layer');

describe('members-create', () => {
  it('should create member with valid input', async () => {
    const event = {
      body: JSON.stringify({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        homeBranchId: 1,
      }),
      requestContext: {
        authorizer: {
          memberId: '1',
          branchId: '1',
          roles: '["Admin"]',
          isAdmin: 'true',
        },
      },
    };
    
    const mockInsert = jest.fn().mockReturnValue({
      values: jest.fn().mockReturnValue({
        returning: jest.fn().mockResolvedValue([{ memberId: 1, firstName: 'John' }]),
      }),
    });
    
    (db.insert as jest.Mock).mockReturnValue(mockInsert());
    
    const result = await handler(event as any);
    
    expect(result.statusCode).toBe(201);
    expect(JSON.parse(result.body)).toHaveProperty('memberId');
  });
  
  it('should enforce branch isolation for non-admins', async () => {
    const event = {
      body: JSON.stringify({
        firstName: 'John',
        lastName: 'Doe',
        homeBranchId: 2, // Different branch
      }),
      requestContext: {
        authorizer: {
          memberId: '1',
          branchId: '1',
          roles: '["Member"]',
          isAdmin: 'false',
        },
      },
    };
    
    const result = await handler(event as any);
    
    expect(result.statusCode).toBe(403);
  });
});
```

### Integration Tests
**What to Test:**
- API Gateway → Lambda → Database flow
- Stripe payment flow
- Email sending flow
- File upload to S3 flow

**Example:**
```typescript
// apps/api/__tests__/integration/members.test.ts
import { APIGatewayProxyEvent } from 'aws-lambda';
import { handler as createMember } from '../../src/members/members-create';
import { handler as listMembers } from '../../src/members/members-list';

describe('Members Integration', () => {
  it('should create and list members', async () => {
    // Create member
    const createEvent = {
      body: JSON.stringify({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        homeBranchId: 1,
      }),
      requestContext: {
        authorizer: {
          memberId: '1',
          branchId: '1',
          roles: '["Admin"]',
          isAdmin: 'true',
        },
      },
    } as any;
    
    const createResult = await createMember(createEvent);
    expect(createResult.statusCode).toBe(201);
    
    const createdMember = JSON.parse(createResult.body);
    
    // List members
    const listEvent = {
      queryStringParameters: {},
      requestContext: {
        authorizer: {
          memberId: '1',
          branchId: '1',
          roles: '["Admin"]',
          isAdmin: 'true',
        },
      },
    } as any;
    
    const listResult = await listMembers(listEvent);
    expect(listResult.statusCode).toBe(200);
    
    const members = JSON.parse(listResult.body);
    expect(members.data).toContainEqual(expect.objectContaining({
      memberId: createdMember.memberId,
    }));
  });
});
```

### Manual Testing
**What to Test:**
- UI flows (user journeys)
- Edge cases
- Browser compatibility
- Mobile responsiveness
- Accessibility (keyboard navigation, screen reader)

**Test Checklist:**
- [ ] Member registration and approval flow
- [ ] Service attendance recording
- [ ] Soul capture and follow-up
- [ ] Online donation with Stripe
- [ ] Manual donation entry
- [ ] Form builder and submission
- [ ] Broadcast message
- [ ] Reports and CSV export
- [ ] Keyboard navigation
- [ ] Screen reader compatibility
- [ ] Mobile browser testing

---

## Deployment Strategy

### Environments
1. **Local Development** - Docker Compose (PostgreSQL, LocalStack)
2. **Staging** - AWS (kairos-staging-*)
3. **Production** - AWS (kairos-prod-*)

### CI/CD Pipeline (GitHub Actions)

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main, staging]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 20
      - run: npm ci
      - run: npm run test
      - run: npm run lint
  
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
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
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
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          ENVIRONMENT: production
```

### Deployment Checklist

**Pre-Deployment:**
- [ ] All tests passing
- [ ] Code review completed
- [ ] Database migrations tested
- [ ] Environment variables configured
- [ ] Secrets stored in Secrets Manager
- [ ] Backup created (production only)

**Deployment:**
- [ ] Deploy CDK stacks
- [ ] Run database migrations
- [ ] Deploy Lambda functions
- [ ] Deploy Next.js app
- [ ] Verify deployment

**Post-Deployment:**
- [ ] Run smoke tests
- [ ] Check CloudWatch logs
- [ ] Verify all features working
- [ ] Monitor performance metrics
- [ ] Update documentation

### Rollback Plan

**If deployment fails:**
1. Identify the issue (check CloudWatch logs)
2. Decide: Fix forward or rollback
3. If rollback:
   - Revert CDK stacks to previous version
   - Restore database from backup (if needed)
   - Deploy previous Lambda functions
   - Deploy previous Next.js app
4. Verify rollback successful
5. Investigate root cause
6. Fix and redeploy

---

## Success Criteria

### Functional Requirements
- [ ] All 13 core modules implemented
- [ ] All MVP features working
- [ ] Branch-level data isolation enforced
- [ ] Role-based access control working
- [ ] Stripe payments working
- [ ] Email notifications working
- [ ] CSV import/export working
- [ ] Power BI data export working

### Performance Requirements
- [ ] Page load time < 3 seconds
- [ ] API response time < 500ms (p95)
- [ ] Lambda cold start < 1 second
- [ ] 99% uptime

### User Acceptance
- [ ] 500 members registered
- [ ] 5 branches active
- [ ] 20 departments active
- [ ] 10 fellowships active
- [ ] 100 souls captured
- [ ] 500 donations recorded
- [ ] UAT sign-off received

### Easter Launch (April 12, 2026)
- [ ] Production deployment successful
- [ ] All features accessible to members
- [ ] No critical bugs
- [ ] Support channels active
- [ ] User documentation available
- [ ] Church staff trained
- [ ] 🎉 Easter launch successful!

---

## Appendix

### Key Technologies
- **Monorepo:** Turborepo
- **Backend:** AWS Lambda (Node.js 20, TypeScript)
- **Database:** Aurora Serverless v2 (PostgreSQL 15)
- **ORM:** Drizzle
- **API:** API Gateway HTTP API
- **Auth:** Cognito + Custom Authorizer
- **Frontend:** Next.js 14 (React, TypeScript)
- **UI:** Shadcn/ui + Tailwind CSS
- **Payments:** Stripe
- **Email:** Amazon SES
- **Storage:** S3 + CloudFront
- **Infrastructure:** AWS CDK (TypeScript)
- **CI/CD:** GitHub Actions
- **Monitoring:** CloudWatch + X-Ray

### Useful Commands
```bash
# Development
npm run dev              # Start all dev servers
npm run build            # Build all packages
npm run test             # Run all tests
npm run lint             # Lint all packages

# Database
npm run migrate          # Run migrations
npm run migrate:generate # Generate migration
npm run db:studio        # Open Drizzle Studio

# Infrastructure
cdk deploy               # Deploy all stacks
cdk deploy --all         # Deploy all stacks
cdk diff                 # Show changes
cdk destroy              # Destroy all stacks

# Deployment
npm run deploy:staging   # Deploy to staging
npm run deploy:prod      # Deploy to production
```

### Contact & Support
- **Project Lead:** [Name]
- **Tech Lead:** [Name]
- **Slack Channel:** #kairos-dev
- **Documentation:** https://docs.kairos.church
- **Support Email:** support@kairos.church

---

**Document Version:** 1.0  
**Date:** February 7, 2026  
**Status:** Final  
**Next Review:** Weekly during development

---

*This implementation specification provides a detailed roadmap for delivering the Kairos MVP by Easter 2026. Follow this spec closely to ensure on-time delivery with all required features.*
