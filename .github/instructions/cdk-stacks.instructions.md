---
applyTo: "infrastructure/**/*.ts"
---

## CDK Rules

- Serverless only — no EC2, ECS, EKS resources
- Region: `eu-west-2` — hardcoded in config, never parameterized
- All Lambdas: ARM_64 architecture, VPC-attached, X-Ray tracing enabled
- Use the `route()` helper in `api-stack.ts` for new API endpoints — never create raw Lambda + integration manually
- Environment config goes in `src/config.ts` as `KairosConfig` — not inline conditionals
- Database credentials: Secrets Manager only — never env vars or plaintext
- Use `cdk.CfnOutput` for values needed by other stacks or CI/CD
- Tag all resources: `environment` + `project: kairos`
- Bundle with esbuild: `@aws-sdk/*` as external (provided by Lambda runtime)
- Never call `cdk deploy` directly — all deployments go through GitHub Actions CI/CD pipeline
- Use L2 constructs over L1 (Cfn*) whenever available
