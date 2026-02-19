# Kairos - Technology Stack Requirements

## Document Overview
This document defines the complete technology stack for Kairos, a cloud-based church administration SaaS platform. All decisions are optimized for a 10-week MVP delivery timeline targeting Easter 2026 (April 12, 2026).

---

## 1. Deployment Model

**Decision:** Cloud SaaS (Multi-tenant)

**Rationale:**
- Single deployment serving all churches
- Centralized updates and maintenance
- Recurring revenue model
- Aligns with existing multi-tenant database design (regions → branches)

---

## 2. User Interfaces

**Decision:** Web Application + Native Mobile Apps

**Platforms:**
- Web application for administrators and desktop users
- Native iOS and Android apps for members and field workers

**Rationale:**
- Web provides full-featured admin experience
- Mobile apps enable better engagement for members
- Matches typical church system usage patterns (admins at desks, members on phones)

---

## 3. Backend Architecture

**Decision:** Serverless with Granular Lambda Functions

**Approach:** One Lambda per operation (e.g., `events-create`, `events-list`, `events-get`, `events-update`, `events-delete`)

**Rationale:**
- True single responsibility principle
- Independent scaling per operation
- Smaller, faster cold starts
- Easier to optimize individually
- Safer deployments (smaller blast radius)

**Trade-offs Accepted:**
- More lambdas to manage (mitigated by Infrastructure as Code)
- Potential code duplication (mitigated with shared Lambda layers)

---

## 4. Programming Language

**Decision:** TypeScript (Node.js runtime)

**Rationale:**
- Fast cold starts (~100-200ms) critical for many lambdas
- Type safety catches bugs at compile time
- Excellent IDE support and developer experience
- Consistent language across entire stack (backend, infrastructure, web, mobile)
- Industry standard for serious Node.js projects
- Self-documenting code through types

---

## 5. Infrastructure as Code

**Decision:** AWS CDK (Cloud Development Kit)

**Rationale:**
- Write infrastructure in TypeScript (same language as application code)
- Type-safe with IDE autocomplete for AWS resources
- Great support for Lambda and serverless architectures
- Compiles to CloudFormation for AWS-native deployment
- Modern, actively developed by AWS

---

## 6. Database

**Decision:** Amazon Aurora Serverless v2 (PostgreSQL-compatible)

**Rationale:**
- Auto-scaling matches variable church workload (spikes on Sundays, quiet weekdays)
- Scales down to 0.5 ACU during idle periods (cost-effective)
- PostgreSQL compatibility with existing schema
- Faster scaling than traditional RDS
- Managed service (automated backups, patching, high availability)

---

## 7. API Layer

**Decision:** Amazon API Gateway (HTTP API)

**Rationale:**
- ~70% cheaper than REST API
- Faster performance than REST API
- Sufficient features for JWT-based authentication
- Native integration with Lambda functions
- Modern choice for serverless architectures

---

## 8. Authentication & Authorization

**Decision:** Amazon Cognito + Custom Authorization Lambda

**Components:**
- **Cognito User Pools:** User authentication (who you are)
- **Custom Authorizer Lambda:** Authorization logic (what you can do)

**Rationale:**
- Cognito handles authentication complexity (password reset, MFA, email verification)
- Custom authorizer enables complex multi-tenant permissions
- Supports branch-level, role-based, and leadership-based access control
- Integrates directly with API Gateway
- Essential for preventing cross-branch data access

---

## 9. Frontend Framework (Web)

**Decision:** Next.js (React framework) with TypeScript

**Rationale:**
- React ecosystem with built-in structure
- Server-side rendering for better performance and SEO
- Built-in routing and API routes
- Excellent TypeScript support
- Opinionated structure promotes consistency
- Great for admin dashboards with complex forms and tables
- Can deploy to AWS (Amplify, ECS, or Lambda@Edge)

---

## 10. Mobile Framework

**Decision:** React Native with Expo

**Rationale:**
- JavaScript/TypeScript (consistent with entire stack)
- Share code with Next.js web app (types, utilities, API clients)
- One codebase for iOS and Android
- Mature ecosystem with large community
- Expo simplifies development and deployment
- Near-native performance

---

## 11. File Storage & CDN

**Decision:** Amazon S3 + CloudFront CDN

**Use Cases:**
- Member photos
- Event flyers and documents
- Uploaded files

**Implementation:**
- S3 for object storage
- CloudFront for global content delivery
- Presigned URLs for direct client uploads (avoid routing through lambdas)

**Rationale:**
- Cost-effective at scale (caching reduces transfer costs by ~90%)
- Fast global delivery via edge locations
- Simple integration with CDK
- Industry standard

**Cost Comparison (1000 churches, 100GB storage, 1M views/month):**
- S3 only: ~$92/month
- S3 + CloudFront: ~$11/month (due to caching)

---

## 12. Real-time Features

**Decision:** Hybrid approach (Polling + WebSockets)

**Implementation:**
- **Polling:** Default for most features (30-60 second refresh)
- **WebSockets:** AWS API Gateway WebSocket API for specific real-time features

**Real-time Use Cases:**
- Live attendance check-ins during services
- Instant notification delivery
- Live donation counters during campaigns
- Multi-user collaborative editing

**Rationale:**
- Most church administration tasks don't require real-time updates
- WebSockets add complexity; use only where valuable
- Keeps architecture simple while enabling key real-time features

---

## 13. Monitoring & Observability

**Decision:** AWS CloudWatch + AWS X-Ray

**Components:**
- **CloudWatch Logs:** Application logs with 7-30 day retention (varies by lambda importance)
- **CloudWatch Metrics:** Performance metrics and alarms
- **CloudWatch Logs Insights:** Query and analyze logs
- **X-Ray:** Distributed tracing across lambdas

**Rationale:**
- Fully AWS-native (no additional vendors)
- Cost-effective for startup phase
- X-Ray provides request tracing across lambda chains
- Sufficient for MVP; can add Sentry later if error tracking needs improve

---

## 14. CI/CD Pipeline

**Decision:** GitHub Actions

**Workflow:**
- Run tests on pull requests
- Build and deploy CDK stacks
- Deploy to staging and production environments

**Rationale:**
- Free for private repos (2000 minutes/month)
- Excellent GitHub integration
- YAML-based workflows (easy to understand)
- Industry standard for modern projects
- Great for TypeScript projects and CDK deployments

---

## 15. Testing Strategy

**Decision:** Hybrid Testing Approach

**Coverage:**
- **Comprehensive testing (write tests first):**
  - Authentication & authorization
  - Donations and payment processing
  - Member data access and multi-tenancy logic
  - Branch isolation
  
- **Pragmatic testing:**
  - CRUD operations (events, fellowships, departments)
  - Attendance tracking
  - Notifications
  
- **Manual testing:**
  - UI flows
  - Edge cases
  
- **Skip for MVP:**
  - End-to-end tests
  - Performance tests

**Rationale:**
- 10-week timeline requires pragmatic approach
- Test critical paths (money, security, data isolation)
- Move fast on standard features
- Add tests post-launch as bugs appear

**Target Coverage:** 40-60% code coverage, focused on high-risk areas

---

## 16. Email Service

**Decision:** Amazon SES (Simple Email Service)

**Use Cases:**
- Password reset emails
- Notification emails
- Event reminders
- Donation receipts

**Implementation:**
- Code-based email templates (React Email or MJML)
- Version controlled templates
- Domain verification required

**Rationale:**
- Extremely cost-effective ($0.10 per 1000 emails)
- AWS-native integration
- Good deliverability
- Sufficient for transactional emails

---

## 17. Secrets Management

**Decision:** AWS Systems Manager Parameter Store + AWS Secrets Manager

**Distribution:**
- **Secrets Manager:** Database credentials (auto-rotation enabled)
- **Parameter Store (SecureString):** API keys, JWT secrets, other configuration

**Rationale:**
- Database credentials should auto-rotate for security
- Parameter Store is free for most secrets
- Both provide KMS encryption at rest
- IAM-controlled access
- CloudTrail audit logging

**Security:**
- All secrets encrypted with AWS KMS
- Encrypted in transit (TLS)
- IAM policies control access per lambda

---

## 18. Logging Strategy

**Decision:** CloudWatch Logs with Tiered Retention

**Retention Policies:**
- Critical lambdas (auth, donations): 30-90 days
- Standard lambdas: 7 days
- Archive to S3 for long-term storage (future enhancement)

**Rationale:**
- Cost-effective (don't pay to store debug logs forever)
- Sufficient for debugging recent issues
- Can add S3 archival + Athena querying later if needed

---

## 19. Code Organization

**Decision:** Monorepo with Turborepo

**Structure:**
```
kairos/
├── apps/
│   ├── web/              # Next.js web application
│   ├── mobile/           # React Native mobile app
│   └── api/              # Lambda functions
├── packages/
│   ├── types/            # Shared TypeScript types
│   ├── ui/               # Shared UI components
│   ├── utils/            # Shared utilities
│   └── api-client/       # Generated API client
├── infrastructure/       # AWS CDK code
└── turbo.json           # Turborepo configuration
```

**Rationale:**
- TypeScript everywhere enables code sharing
- Share types between API and clients (type-safe)
- Single repository simplifies development
- Turborepo provides fast, cached builds
- Easier refactoring (change API + clients together)
- Better for small teams with tight deadlines
- Simpler than Nx for this scale

---

## 20. Database ORM & Migrations

**Decision:** Drizzle ORM

**Rationale:**
- Lightweight (~30KB vs Prisma's 2-3MB) - critical for lambda cold starts
- Schema defined in TypeScript (not separate language)
- SQL-like syntax provides control over queries
- Better for serverless (no connection proxy needed)
- Type-safe database access
- Auto-generated TypeScript types from schema
- Built-in migration system

**Migration Strategy:**
- Version-controlled migration files
- Tracks applied migrations in database
- Up/down migrations supported

---

## 21. Payment Processing

**Decision:** Stripe

**Rationale:**
- Industry-standard payment processor
- Excellent API and documentation
- Handles PCI DSS compliance (saves $10k+/year in audits)
- Supports cards, ACH, digital wallets
- Built-in fraud detection
- Reliable dispute/chargeback handling
- 2.9% + $0.30 per transaction (industry standard)

**Integration:**
- Stripe SDK in lambdas
- Stripe Elements in web app
- Stripe SDK in React Native app

---

## 22. Background Jobs & Scheduling

**Decision:** AWS EventBridge (CloudWatch Events)

**Use Cases:**
- Daily: Generate attendance reports
- Weekly: Send engagement emails
- Monthly: Archive old notifications
- Nightly: Export data to S3 for Power BI

**Rationale:**
- Cron-based scheduling
- Native AWS integration
- Triggers lambdas on schedule
- Free tier: 1M events/month
- Simple for recurring tasks
- Can add SQS for retry logic later if needed

---

## 23. Search Functionality

**Decision:** PostgreSQL Full-Text Search

**Rationale:**
- Built into database (no additional service)
- Sufficient for structured data searches
- Good performance for MVP scale
- No extra cost
- Can upgrade to Algolia/OpenSearch later if needed

**Implementation:**
- Full-text indexes on searchable columns
- Search across members, events, donations

---

## 24. Analytics & Reporting

**Decision:** Hybrid approach with Power BI integration

**Components:**

### In-App Reports
- Basic dashboards with key metrics
- Simple charts and trends (attendance, donations, member growth)
- Real-time data from Aurora
- CSV/Excel export for any list view

### Power BI Integration (Analytics Team)
- Scheduled nightly data export to S3 (Parquet format)
- Power BI connects to S3 (no production DB load)
- Data is 1 day old (acceptable for analytics)
- EventBridge triggers export lambda at 2 AM

### CSV/Excel Export (End Users)
- Lambda generates file on-demand
- Upload to S3, return presigned URL
- Or stream directly for small datasets

**Rationale:**
- Protects production database from analytics queries
- Cost-effective (S3 storage vs read replica)
- Power BI team has full data access
- Users get ad-hoc export capability
- Minimal in-app reporting development

---

## 25. Environment Strategy

**Decision:** Two environments in single AWS account

**Environments:**
- **Staging:** Development and testing
- **Production:** Live customer data

**Implementation:**
- Resource naming: `kairos-staging-*` and `kairos-prod-*`
- Separate databases per environment
- Environment tags on all resources
- IAM policies restrict production access
- Different instance sizes (staging smaller/cheaper)

**Rationale:**
- Simpler than multi-account setup
- Cost-effective for small team
- Clear separation via naming and tags
- Local development uses Docker/local PostgreSQL

---

## 26. API Versioning

**Decision:** URL-based versioning

**Format:** `/v1/members`, `/v1/events`, etc.

**Rationale:**
- Clear and explicit
- Easy to maintain multiple versions simultaneously
- Standard REST approach
- Critical for mobile apps (users don't update immediately)
- Can run v1 and v2 lambdas in parallel during transitions

**Strategy:**
- Start with `/v1/` from day one
- Plan for `/v2/` when breaking changes needed
- Deprecate old versions with notice period

---

## 27. API Documentation

**Decision:** OpenAPI Spec + Generated TypeScript Client + Postman Collections

**Workflow:**
1. Define API in `openapi.yaml` (source of truth)
2. Generate TypeScript client with `openapi-typescript`
3. Generate Postman collection with `openapi-to-postman`
4. Optionally generate Swagger UI for interactive docs

**Benefits:**
- Type-safe API calls in web and mobile apps
- Postman collections for testing and internal use
- Single source of truth (OpenAPI spec)
- Auto-updates when API changes
- Catches breaking changes at compile time

**Rationale:**
- Monorepo enables powerful type sharing
- Reduces API integration bugs
- Great developer experience
- Industry standard documentation

---

## 28. Error Handling & User Support

**Decision:** Simple contact form + email (MVP)

**Implementation:**
- Contact form in application
- Lambda sends email via SES
- Manual tracking initially

**Rationale:**
- Cost-effective for MVP
- Sufficient for low support volume
- Can upgrade to help desk system (Zendesk, Intercom) later when volume justifies cost

---

## 29. Internationalization (i18n)

**Decision:** English only for MVP

**Rationale:**
- Faster development (20-30% time savings)
- Sufficient for initial target market
- Can add i18n post-launch if needed
- Libraries available (next-intl, i18next) when ready

**Future Consideration:**
- Add French, Spanish, Portuguese based on market demand

---

## 30. Shared Libraries & Code Reuse

**Monorepo Packages:**

### `@kairos/types`
- Shared TypeScript interfaces and types
- Database models (Drizzle schemas)
- API request/response types
- Used by all apps and lambdas

### `@kairos/ui`
- Shared React components
- Used by Next.js web and React Native mobile
- Design system components

### `@kairos/utils`
- Shared utility functions
- Date formatting, validation, etc.
- Used across all projects

### `@kairos/api-client`
- Generated from OpenAPI spec
- Type-safe API client
- Used by web and mobile apps

**Rationale:**
- Maximize code reuse across projects
- Ensure consistency
- Reduce duplication
- Type safety across boundaries

---

## Technology Stack Summary

| Category | Technology | Purpose |
|----------|-----------|---------|
| **Backend Runtime** | Node.js (TypeScript) | Lambda functions |
| **Backend Architecture** | AWS Lambda (granular) | Serverless compute |
| **API Gateway** | API Gateway HTTP API | REST API endpoints |
| **WebSocket** | API Gateway WebSocket API | Real-time features |
| **Database** | Aurora Serverless v2 (PostgreSQL) | Primary data store |
| **ORM** | Drizzle | Type-safe database access |
| **Authentication** | Amazon Cognito | User authentication |
| **Authorization** | Custom Lambda Authorizer | Permission logic |
| **Web Framework** | Next.js (React + TypeScript) | Web application |
| **Mobile Framework** | React Native + Expo | iOS/Android apps |
| **Infrastructure** | AWS CDK (TypeScript) | Infrastructure as Code |
| **File Storage** | Amazon S3 | Object storage |
| **CDN** | CloudFront | Content delivery |
| **Email** | Amazon SES | Transactional emails |
| **Payments** | Stripe | Payment processing |
| **Secrets** | Secrets Manager + Parameter Store | Secrets management |
| **Monitoring** | CloudWatch + X-Ray | Logging and tracing |
| **Scheduling** | EventBridge | Cron jobs |
| **CI/CD** | GitHub Actions | Deployment pipeline |
| **Monorepo** | Turborepo | Build orchestration |
| **API Docs** | OpenAPI + openapi-typescript | API documentation |
| **Testing** | Jest + React Testing Library | Unit/integration tests |
| **Analytics Export** | S3 (Parquet) | Power BI integration |

---

## Cost Estimates (Monthly)

### MVP Phase (5-10 churches, ~500 active users)
- Aurora Serverless v2: $30-50
- Lambda executions: $5-10
- API Gateway: $5-10
- S3 + CloudFront: $2-5
- Cognito: $0 (free tier)
- SES: $0 (free tier)
- Secrets Manager: $0.40
- CloudWatch: $5-10
- **Total: ~$50-90/month**

### Growth Phase (100 churches, ~5000 active users)
- Aurora Serverless v2: $100-200
- Lambda executions: $30-50
- API Gateway: $20-30
- S3 + CloudFront: $10-20
- Cognito: $25-50
- SES: $5-10
- Secrets Manager: $0.40
- CloudWatch: $20-30
- **Total: ~$210-390/month**

### Scale Phase (1000 churches, ~50,000 active users)
- Aurora Serverless v2: $500-800
- Lambda executions: $200-300
- API Gateway: $150-200
- S3 + CloudFront: $50-100
- Cognito: $250-500
- SES: $50-100
- Secrets Manager: $0.40
- CloudWatch: $100-150
- **Total: ~$1,300-2,150/month**

*Note: Stripe fees (2.9% + $0.30) are pass-through costs on donations*

---

## Development Timeline Considerations

**10-Week MVP Timeline (Easter 2026 - April 12):**

### Weeks 1-2: Foundation
- Set up monorepo with Turborepo
- Configure AWS CDK infrastructure
- Set up Aurora Serverless v2
- Implement Drizzle schema and migrations
- Set up Cognito authentication

### Weeks 3-4: Core Backend
- Implement critical lambdas (auth, members, donations)
- Set up API Gateway
- Implement custom authorizer
- Write tests for critical paths

### Weeks 5-6: Frontend Foundation
- Next.js web app setup
- React Native mobile app setup
- Shared component library
- Authentication flows

### Weeks 7-8: Feature Development
- Member management
- Attendance tracking
- Donation processing (Stripe integration)
- Event management

### Weeks 9-10: Polish & Deploy
- Bug fixes
- Performance optimization
- Staging deployment
- Production deployment
- User acceptance testing

**Critical Path Items:**
- Authentication and authorization (Week 2-3)
- Donation processing (Week 7) - requires Stripe integration
- Multi-tenancy validation (ongoing)

---

## Security Considerations

### Data Protection
- All data encrypted at rest (Aurora, S3)
- All data encrypted in transit (TLS)
- KMS-managed encryption keys
- Secrets rotation for database credentials

### Access Control
- IAM roles with least privilege
- Custom authorizer enforces branch isolation
- Cognito MFA available
- API rate limiting via API Gateway

### Compliance
- PCI DSS handled by Stripe
- GDPR considerations (data export, deletion)
- Audit logging via CloudTrail
- Regular security updates (managed services)

### Multi-tenancy Isolation
- Branch-level data isolation enforced in authorizer
- Database queries always filtered by branch_id
- No cross-branch data access
- Tested in authorization test suite

---

## Scalability Considerations

### Horizontal Scaling
- Lambda auto-scales per operation
- Aurora Serverless v2 auto-scales capacity
- CloudFront edge caching reduces origin load
- S3 scales infinitely

### Performance Optimization
- Lambda cold start optimization (small bundles, Drizzle)
- Database connection pooling
- CloudFront caching for static assets
- API response caching where appropriate

### Database Scaling Path
1. Aurora Serverless v2 (current)
2. Add read replicas for analytics (if needed)
3. Implement caching layer (Redis/ElastiCache)
4. Database sharding (future, if >10,000 churches)

---

## Risk Mitigation

### Technical Risks
- **Lambda cold starts:** Mitigated by lightweight Drizzle ORM, small bundles
- **Database connection limits:** Aurora Serverless v2 handles well; can add connection pooler
- **API Gateway limits:** 10,000 RPS default; can request increase
- **Vendor lock-in:** Acceptable for AWS; serverless benefits outweigh portability concerns

### Timeline Risks
- **10-week deadline:** Hybrid testing approach, ruthless feature prioritization
- **Scope creep:** Lock MVP features early, defer enhancements
- **Integration complexity:** Use managed services (Cognito, Stripe) to reduce custom code

### Operational Risks
- **Monitoring gaps:** CloudWatch + X-Ray provide visibility; add Sentry post-launch if needed
- **Support volume:** Simple contact form for MVP; upgrade to help desk when needed
- **Data loss:** Aurora automated backups, point-in-time recovery

---

## Post-MVP Enhancements

### Phase 2 (Post-Easter)
- Sentry for better error tracking
- Read replica for analytics (if needed)
- Enhanced in-app reporting
- Mobile push notifications
- Internationalization (i18n)

### Phase 3 (Growth)
- Advanced search (Algolia/OpenSearch)
- Help desk system (Zendesk/Intercom)
- SMS notifications (SNS/Twilio)
- Advanced analytics dashboards
- API rate limiting per tenant

### Phase 4 (Scale)
- Redis caching layer
- Database sharding strategy
- Multi-region deployment
- Advanced security features (WAF, DDoS protection)

---

## Decision Log

All 31 stack decisions were made collaboratively with the following priorities:
1. **Timeline:** 10-week MVP delivery to Easter 2026
2. **Cost:** Optimize for low initial costs, scale economically
3. **Consistency:** TypeScript everywhere for code reuse
4. **Simplicity:** Prefer managed services over custom solutions
5. **Security:** Protect member data and financial transactions
6. **Scalability:** Architecture supports growth to 1000+ churches

---

## Approval & Sign-off

**Document Version:** 1.0  
**Date:** February 2, 2026  
**Status:** Draft - Pending Review

**Next Steps:**
1. Review and approve stack decisions
2. Define MVP feature scope (architecture.md)
3. Create design requirements (design.md)
4. Begin infrastructure setup

---

*This document serves as the technical foundation for Kairos development. All architectural and design decisions should align with these stack choices.*
