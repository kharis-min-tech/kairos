# KCMS Infrastructure (AWS CDK)

Infrastructure as Code for Kharis Church Management System using AWS CDK.

## Architecture

This CDK project provisions the following AWS resources:

### Authentication Stack (`KcmsAuthStack`)
- **Cognito User Pool**: User authentication and management
- **Lambda Trigger**: Pre-signup auto-confirmation
- **User Pool Client**: OAuth 2.0/OIDC configuration
- **Hosted UI Domain**: Cognito hosted authentication pages

### Frontend Stack (`KcmsFrontendStack`)
- **S3 Bucket**: Static website hosting
- **CloudFront Distribution**: CDN for global content delivery
- **Origin Access Identity**: Secure S3 access

## Prerequisites

1. **AWS CLI** configured with credentials
   ```bash
   aws configure
   ```

2. **Node.js** (v18 or later)
   ```bash
   node --version
   ```

3. **AWS CDK CLI** installed globally
   ```bash
   npm install -g aws-cdk
   ```

4. **Bootstrap CDK** (first time only)
   ```bash
   npm run bootstrap
   ```

## Installation

```bash
npm install
```

## Available Commands

```bash
# Build TypeScript
npm run build

# Watch for changes
npm run watch

# Synthesize CloudFormation templates
npm run synth

# Show differences between deployed and local
npm run diff

# Deploy all stacks
npm run deploy:all

# Deploy specific stack
cdk deploy KcmsAuthStack-dev

# Destroy all stacks
npm run destroy
```

## Deployment

### Development Environment

```bash
# Set environment
export ENVIRONMENT=dev

# Deploy all stacks
npm run deploy:all
```

### Staging Environment

```bash
export ENVIRONMENT=staging
npm run deploy:all
```

### Production Environment

```bash
export ENVIRONMENT=prod
npm run deploy:all
```

## Environment Configuration

Edit `bin/kcms-infrastructure.ts` to configure:

- **Domain Prefix**: Cognito hosted UI domain
- **Callback URLs**: OAuth redirect URLs
- **Logout URLs**: Post-logout redirect URLs

### Current Environments

| Environment | Domain Prefix | Callback URLs |
|-------------|---------------|---------------|
| dev | kcms-dev | http://localhost:3001 |
| staging | kcms-staging | https://staging.kcms.example.com |
| prod | kcms-prod | https://kcms.example.com |

## Stack Outputs

After deployment, CDK outputs important values:

### Auth Stack Outputs
- `UserPoolId`: Cognito User Pool ID
- `UserPoolClientId`: OAuth Client ID
- `CognitoDomainUrl`: Hosted UI URL
- `AuthorityUrl`: OIDC Authority URL

### Frontend Stack Outputs
- `BucketName`: S3 bucket name
- `DistributionId`: CloudFront distribution ID
- `WebsiteUrl`: Public website URL
- `FrontendConfig`: JSON configuration for frontend app

## Updating Frontend Configuration

After deployment, update your frontend `.env.local`:

```bash
# Get outputs
aws cloudformation describe-stacks \
  --stack-name KcmsAuthStack-dev \
  --query 'Stacks[0].Outputs'

# Update .env.local with values
NEXT_PUBLIC_COGNITO_USER_POOL_ID=<UserPoolId>
NEXT_PUBLIC_COGNITO_CLIENT_ID=<UserPoolClientId>
NEXT_PUBLIC_COGNITO_REGION=eu-north-1
NEXT_PUBLIC_COGNITO_DOMAIN=<CognitoDomainUrl>
```

## Deploying Frontend to S3/CloudFront

```bash
# Build Next.js app
cd ../apps
npm run build

# Deploy to S3
aws s3 sync out/ s3://<BucketName>/ --delete

# Invalidate CloudFront cache
aws cloudfront create-invalidation \
  --distribution-id <DistributionId> \
  --paths "/*"
```

## Security Features

- **Auto-confirmation**: Lambda trigger auto-confirms users
- **MFA**: Optional multi-factor authentication
- **Advanced Security**: Cognito advanced security mode enabled
- **HTTPS Only**: CloudFront enforces HTTPS
- **S3 Private**: Bucket access only via CloudFront OAI
- **Password Policy**: Strong password requirements

## Cost Optimization

- **Development**: Uses cheaper CloudFront price class
- **Auto-delete**: Dev resources auto-delete on stack destroy
- **No versioning**: Dev S3 buckets don't use versioning

## Troubleshooting

### Bootstrap Error
```bash
cdk bootstrap aws://ACCOUNT-ID/REGION
```

### Deployment Fails
```bash
# Check AWS credentials
aws sts get-caller-identity

# Verify region
echo $AWS_REGION
```

### Stack Already Exists
```bash
# Import existing resources or destroy first
cdk destroy KcmsAuthStack-dev
```

## Project Structure

```
infrastructure/
├── bin/
│   └── kcms-infrastructure.ts    # CDK app entry point
├── lib/
│   ├── kcms-auth-stack.ts        # Cognito authentication
│   └── kcms-frontend-stack.ts    # S3 + CloudFront
├── cdk.json                       # CDK configuration
├── package.json                   # Dependencies
├── tsconfig.json                  # TypeScript config
└── README.md                      # This file
```

## Next Steps

1. Deploy infrastructure: `npm run deploy:all`
2. Note the stack outputs
3. Update frontend `.env.local` with outputs
4. Build and deploy frontend to S3
5. Access application via CloudFront URL

## Support

For issues or questions, refer to:
- [AWS CDK Documentation](https://docs.aws.amazon.com/cdk/)
- [Cognito Documentation](https://docs.aws.amazon.com/cognito/)
- [CloudFront Documentation](https://docs.aws.amazon.com/cloudfront/)
