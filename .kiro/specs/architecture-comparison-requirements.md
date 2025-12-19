---
title: Kairos Architecture Comparison - AWS Well-Architected Framework Analysis
status: in-progress
created: 2024-12-15
domain: architecture
---

# Architecture Comparison Requirements

## Overview

This spec documents the comparison of two proposed serverless architectures for Kairos (church management system) using the AWS Well-Architected Framework. The goal is to provide a comprehensive analysis to inform the architecture decision.

## Context

Kairos is a church management system with a multi-domain Lambda architecture. Two architectural approaches have been proposed:

### Architecture 1: VPC-Based with Aurora Serverless v2
- **Title**: Multi-domain Lambdas + Aurora Serverless v2 in VPC
- **Database ORM**: Prisma
- **Database Access**: Traditional connection pooling (likely RDS Proxy)
- **Lambda Placement**: Inside VPC (Private Subnets)
- **Diagram**: `out/architecture/cloud-platform/kairos-cloud-platform.svg`
- **Source**: PlantUML source not found (only SVG available)

**Key Components Identified**:
- AWS Cloud (eu-west-2)
- CloudFront
- S3 Static Assets
- API Gateway
- Cognito User Pool
- SNS Topics
- SES
- CloudWatch
- KCMS VPC (10.0.0.0/16)
- Private Subnets (eu-west-2a/b)
- Multiple Lambda functions:
  - Core API Lambda
  - Events API Lambda
  - Finance API Lambda
  - Outreach Lambda (partial view)
- Aurora Serverless v2 (in VPC)

### Architecture 2: Serverless with RDS Data API
- **Title**: Multi-domain Lambdas + Aurora Serverless v2 with Data API
- **Database ORM**: Drizzle
- **Database Access**: RDS Data API (HTTPS-based)
- **Lambda Placement**: Outside VPC
- **Diagram**: `out/architecture/cloud-platform/kairos-cloud-platform-data-api.svg`
- **Source**: `architecture/cloud-platform.puml`

**Key Components**:
- Same frontend/API Gateway/auth components as Architecture 1
- Lambdas outside VPC
- Aurora Serverless v2 in AWS-managed VPC
- RDS Data API for database access
- No VPC networking overhead

## User Stories

### US-1: Architecture Decision Support
**As a** technical architect  
**I want** a comprehensive AWS Well-Architected Framework analysis of both architectures  
**So that** I can make an informed decision based on industry best practices

**Acceptance Criteria**:
- [ ] Analysis covers all 6 pillars of AWS Well-Architected Framework
- [ ] Each pillar includes specific considerations for both architectures
- [ ] Clear comparison of trade-offs between architectures
- [ ] Complexity scoring provided for both options
- [ ] Final recommendation with justification

### US-2: Operational Excellence Analysis
**As a** DevOps engineer  
**I want** to understand the operational implications of each architecture  
**So that** I can assess deployment, monitoring, and maintenance complexity

**Acceptance Criteria**:
- [ ] Deployment complexity compared
- [ ] Monitoring and observability requirements documented
- [ ] Infrastructure-as-Code considerations outlined
- [ ] Operational overhead quantified

### US-3: Security Posture Evaluation
**As a** security architect  
**I want** to understand the security implications of each approach  
**So that** I can ensure compliance and data protection

**Acceptance Criteria**:
- [ ] Network security model compared
- [ ] Data encryption (in-transit and at-rest) documented
- [ ] IAM and access control patterns outlined
- [ ] Attack surface analysis provided

### US-4: Cost Optimization Assessment
**As a** finance stakeholder  
**I want** to understand the cost implications of each architecture  
**So that** I can budget appropriately and optimize spending

**Acceptance Criteria**:
- [ ] Cost drivers identified for both architectures
- [ ] Comparative cost analysis provided
- [ ] Scaling cost implications documented
- [ ] Cost optimization opportunities highlighted

### US-5: Performance Characteristics
**As a** application developer  
**I want** to understand the performance characteristics of each architecture  
**So that** I can ensure acceptable user experience

**Acceptance Criteria**:
- [ ] Cold start performance compared
- [ ] Database connection latency analyzed
- [ ] Throughput capabilities documented
- [ ] Performance under load scenarios outlined

## Technical Requirements

### TR-1: Complete Architecture Documentation
- Both architecture diagrams must be fully analyzed
- All components and their interactions documented
- Data flow patterns identified

### TR-2: AWS Well-Architected Framework Coverage
Analysis must cover all 6 pillars:
1. Operational Excellence
2. Security
3. Reliability
4. Performance Efficiency
5. Cost Optimization
6. Sustainability

### TR-3: Complexity Scoring
- Provide objective complexity score (1-10 scale)
- Consider: VPC management, networking, connection pooling, cold starts, IAM policies

### TR-4: Recommendation
- Clear recommendation with justification
- Consider Kairos-specific requirements (church management, bursty workload patterns)
- Address trade-offs explicitly

## Current Status

### Completed
- ✅ Architecture 2 PlantUML source analyzed
- ✅ Architecture 2 comprehensive AWS Well-Architected analysis completed
- ✅ Architecture 1 SVG diagram identified (title and key components visible)
- ✅ Complexity scoring provided (Arch 1: 7/10, Arch 2: 3/10)
- ✅ Initial recommendation provided (Architecture 2 recommended)

### Incomplete
- ⚠️ Architecture 1 PlantUML source not found (only SVG available)
- ⚠️ Architecture 1 detailed component verification needed
- ⚠️ RDS Proxy presence in Architecture 1 assumed but not confirmed from source
- ⚠️ NAT Gateway presence in Architecture 1 not confirmed
- ⚠️ Complete data flow analysis for Architecture 1 pending

## Analysis Summary

### Architecture 1: VPC-Based (Complexity: 7/10)
**Strengths**:
- Traditional connection pooling (familiar pattern)
- Direct database connections (potentially lower latency for sustained workloads)
- Prisma ORM (mature, feature-rich)

**Challenges**:
- VPC networking complexity (ENIs, NAT Gateway, security groups)
- Cold start penalties (VPC attachment overhead)
- Higher operational overhead
- More complex IAM and networking policies
- Higher costs (NAT Gateway, VPC endpoints)

### Architecture 2: Data API (Complexity: 3/10)
**Strengths**:
- Simplified architecture (no VPC networking)
- Faster cold starts (no ENI attachment)
- Lower operational overhead
- Built-in connection pooling via Data API
- Lower costs (no NAT Gateway)
- Better suited for bursty workloads

**Challenges**:
- Data API has request/response size limits
- Drizzle ORM (less mature than Prisma)
- HTTPS overhead for each query
- Limited to Aurora Serverless v2

### Recommendation
**Architecture 2 (Drizzle + RDS Data API)** is recommended for Kairos because:
1. Lower complexity (3/10 vs 7/10)
2. Better cold start performance (critical for bursty church management workloads)
3. Lower operational overhead
4. More cost-effective
5. Simpler security model
6. Better sustainability profile

## Next Steps

1. **Verify Architecture 1 Components**
   - Confirm RDS Proxy usage
   - Identify NAT Gateway configuration
   - Document complete VPC setup

2. **Create Implementation Spec**
   - If Architecture 2 is chosen, create detailed implementation spec
   - Define migration path if moving from Architecture 1
   - Document infrastructure-as-code requirements

3. **Prototype and Validate**
   - Build proof-of-concept for chosen architecture
   - Performance testing under realistic load
   - Cost validation with actual usage patterns

## References

- AWS Well-Architected Framework: https://aws.amazon.com/architecture/well-architected/
- RDS Data API Documentation: https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/data-api.html
- Lambda VPC Networking: https://docs.aws.amazon.com/lambda/latest/dg/configuration-vpc.html
- Architecture Diagrams:
  - Architecture 1: `out/architecture/cloud-platform/kairos-cloud-platform.svg`
  - Architecture 2: `out/architecture/cloud-platform/kairos-cloud-platform-data-api.svg`
  - Architecture 2 Source: `architecture/cloud-platform.puml`

## Open Questions

1. What is the expected request/response size for Kairos API calls? (Data API has 1MB limit)
2. What are the peak concurrent user patterns for church management activities?
3. Are there any specific compliance requirements (e.g., data residency, encryption standards)?
4. What is the current database size and growth projection?
5. Are there any existing integrations that might influence the architecture choice?

## Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2024-12-15 | Initial analysis completed | Comprehensive AWS Well-Architected Framework analysis provided for both architectures |
| TBD | Final architecture selection | Pending stakeholder review and validation |
