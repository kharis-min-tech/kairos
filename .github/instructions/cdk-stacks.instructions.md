---
applyTo: "infrastructure/**/*.ts"
---

## Future CDK Rules

There is no active infrastructure package in the current local-first app. Only apply these rules when deployment infrastructure is explicitly reintroduced.

- Serverless only: no EC2, ECS, or EKS.
- Target AWS region: `eu-west-2`.
- Lambdas should use ARM_64, VPC attachment where database access requires it, and X-Ray tracing.
- Environment-specific configuration belongs in a typed config module, not inline conditionals.
- Secrets go in Secrets Manager or SSM Parameter Store; never plaintext env defaults for deployed environments.
- Use L2 constructs where available.
- Do not run `cdk deploy` from local agent work unless the user explicitly requests deployment.
