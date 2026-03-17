---
description: "Add a new AWS resource via CDK. Input: resource type, stack, configuration."
mode: agent
agent: infrastructure
---

# Add CDK Resource

## Inputs
- **Resource Type**: ${{RESOURCE_TYPE}} (e.g., Lambda route, S3 bucket, SQS queue, EventBridge rule)
- **Stack**: ${{STACK_NAME}} (e.g., api-stack, storage-stack)

## For API Routes

Add to `infrastructure/src/stacks/api-stack.ts` using the `route()` helper:

```typescript
route(
  '${{HANDLER_NAME}}',
  '${{DOMAIN}}/${{HANDLER_FILE}}.ts',
  HttpMethod.${{METHOD}},
  '/v1/${{PATH}}',
  {
    skipAuth: false,
    environment: {},
    grants: (fn) => {},
  }
);
```

## For Other Resources

1. Identify the correct stack in `infrastructure/src/stacks/`
2. Add the resource using L2 constructs
3. Tag with `environment` and `project: kairos`
4. Use `cdk.CfnOutput` if other stacks or CI/CD need the value
5. Add environment-specific config to `src/config.ts` if needed

## Verification

Since the infrastructure agent has no execute access:
1. Review the synthesized template logic
2. Verify resource naming follows `kairos-{env}-{resource}` convention
3. Confirm no hardcoded secrets or credentials
4. Confirm all Lambdas are VPC-attached and ARM_64
5. Flag the changes for human review before deployment
