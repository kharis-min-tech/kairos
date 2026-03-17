# Infrastructure — AWS CDK

## Architecture

Serverless-only. No EC2, ECS, or Kubernetes.

## Stack Layout

```
src/stacks/
  network-stack.ts      → VPC, subnets, security groups
  database-stack.ts     → Aurora Serverless v2 cluster
  auth-stack.ts         → Cognito user pool + client
  storage-stack.ts      → S3 buckets + CloudFront
  api-stack.ts          → Lambda handlers + API Gateway
  web-stack.ts          → Next.js deployment
  analytics-stack.ts    → Analytics Lambda handlers
  monitoring-stack.ts   → CloudWatch alarms
  cicd-stack.ts         → CodePipeline
```

## Route Helper Pattern

New API endpoints use the `route()` helper in `api-stack.ts`:

```typescript
route(
  'HandlerName',           // CloudFormation logical ID
  'domain/handler-file.ts', // Entry point relative to apps/api/src/
  HttpMethod.POST,          // HTTP method
  '/v1/resource',           // API path
  {
    environment: { /* extra env vars */ },
    grants: (fn) => { /* IAM grants */ },
    skipAuth: false,         // true for public endpoints (register, login)
  }
);
```

The `route()` helper automatically:
- Creates `NodejsFunction` with `ARM_64`, VPC, security group, X-Ray tracing
- Sets shared env vars (DB_SECRET_ARN, COGNITO_USER_POOL_ID, etc.)
- Grants Secrets Manager access for database credentials
- Adds API Gateway HTTP integration with Cognito authorizer
- Uses esbuild bundling with `@aws-sdk/*` as external

## Environment Config

`src/config.ts` defines `KairosConfig` with staging/prod variants:
- Region: `eu-west-2` (London)
- Domain: `khar.is`
- Aurora ACU: staging 0.5–2, prod 2–8

## Conventions

- All Lambda functions run in VPC (for Aurora access)
- Use `cdk.CfnOutput` for cross-stack references
- Tag all resources with `environment`, `project: kairos`
- Do NOT run `cdk deploy` without human review — use CI/CD pipeline

## Testing

CDK snapshot tests validate synthesized CloudFormation templates.
