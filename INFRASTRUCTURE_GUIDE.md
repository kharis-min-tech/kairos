# KCMS Infrastructure Guide

Complete guide for deploying and managing KCMS infrastructure using AWS CDK.

## Overview

KCMS uses Infrastructure as Code (IaC) with AWS CDK to provision all AWS resources. This ensures:
- **Reproducibility**: Deploy identical environments
- **Version Control**: Track infrastructure changes in Git
- **Automation**: Automated deployments and rollbacks
- **Best Practices**: Security and cost optimization built-in

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    CloudFront CDN                        │
│              (Global Content Delivery)                   │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│                   S3 Bucket                              │
│              (Static Website Hosting)                    │
│         Next.js Build Output (HTML/CSS/JS)               │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│              AWS Cognito User Pool                       │
│                                                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   Users      │  │  OAuth 2.0   │  │  Hosted UI   │  │
│  │ Management   │  │    OIDC      │  │   Domain     │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│                                                           │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Lambda Pre-Signup Trigger                       │   │
│  │  (Auto-confirm users)                            │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

## Prerequisites

### 1. AWS Account Setup

1. Create an AWS account at https://aws.amazon.com
2. Create an IAM user with administrator access
3. Generate access keys for the IAM user

### 2. Install AWS CLI

**macOS:**
```bash
brew install awscli
```

**Linux:**
```bash
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install
```

**Windows:**
Download from https://aws.amazon.com/cli/

### 3. Configure AWS Credentials

```bash
aws configure
```

Enter:
- AWS Access Key ID
- AWS Secret Access Key
- Default region: `eu-north-1`
- Default output format: `json`

Verify:
```bash
aws sts get-caller-identity
```

### 4. Install Node.js

Download from https://nodejs.org (v18 or later)

Verify:
```bash
node --version
npm --version
```

### 5. Install AWS CDK CLI

```bash
npm install -g aws-cdk
```

Verify:
```bash
cdk --version
```

## Initial Setup

### 1. Install Dependencies

```bash
cd infrastructure
npm install
```

### 2. Bootstrap CDK (First Time Only)

```bash
npm run bootstrap
```

This creates the CDK toolkit stack in your AWS account.

### 3. Review Configuration

Edit `infrastructure/bin/kcms-infrastructure.ts` to customize:

```typescript
const config = {
  dev: {
    domainPrefix: 'kcms-dev',
    callbackUrls: ['http://localhost:3001', 'http://localhost:3001/dashboard'],
    logoutUrls: ['http://localhost:3001'],
  },
  // ... staging and prod configs
};
```

## Deployment

### Development Environment

```bash
cd infrastructure
./deploy.sh dev
```

Or manually:
```bash
export ENVIRONMENT=dev
npm run build
npm run synth
npm run deploy:all
```

### Staging Environment

```bash
./deploy.sh staging
```

### Production Environment

```bash
./deploy.sh prod
```

The script will:
1. ✓ Check AWS credentials
2. ✓ Bootstrap CDK if needed
3. ✓ Install dependencies
4. ✓ Build TypeScript
5. ✓ Synthesize CloudFormation
6. ✓ Show changes (diff)
7. ✓ Ask for confirmation
8. ✓ Deploy all stacks
9. ✓ Display outputs

## Getting Stack Outputs

After deployment, get the configuration values:

```bash
./get-outputs.sh dev
```

This displays:
- User Pool ID
- Client ID
- Cognito Domain URL
- CloudFront URL
- Environment variables for `.env.local`

## Updating Frontend Configuration

### 1. Get Outputs

```bash
cd infrastructure
./get-outputs.sh dev
```

### 2. Update .env.local

Copy the environment variables to `apps/.env.local`:

```bash
NEXT_PUBLIC_COGNITO_USER_POOL_ID=eu-north-1_XXXXXXXXX
NEXT_PUBLIC_COGNITO_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
NEXT_PUBLIC_COGNITO_REGION=eu-north-1
NEXT_PUBLIC_COGNITO_DOMAIN=https://kcms-dev.auth.eu-north-1.amazoncognito.com
```

### 3. Restart Dev Server

```bash
cd apps
npm run dev
```

## Deploying Frontend to CloudFront

### 1. Build Next.js App

```bash
cd apps
npm run build
npm run export  # If using static export
```

### 2. Get S3 Bucket Name

```bash
cd ../infrastructure
./get-outputs.sh dev | grep BucketName
```

### 3. Upload to S3

```bash
aws s3 sync apps/out/ s3://BUCKET-NAME/ --delete
```

### 4. Invalidate CloudFront Cache

```bash
# Get Distribution ID
./get-outputs.sh dev | grep DistributionId

# Create invalidation
aws cloudfront create-invalidation \
  --distribution-id DISTRIBUTION-ID \
  --paths "/*"
```

### 5. Access Website

```bash
./get-outputs.sh dev | grep WebsiteUrl
```

Open the CloudFront URL in your browser.

## Managing Infrastructure

### View Changes Before Deploying

```bash
export ENVIRONMENT=dev
npm run diff
```

### Deploy Specific Stack

```bash
cdk deploy KcmsAuthStack-dev
```

### List All Stacks

```bash
cdk list
```

### Synthesize CloudFormation

```bash
npm run synth
```

Output is in `cdk.out/` directory.

### Destroy Infrastructure

```bash
./destroy.sh dev
```

⚠️ **Warning**: This deletes all resources!

For production:
```bash
./destroy.sh prod
# Type: DELETE PRODUCTION
```

## Environment-Specific Configuration

### Development
- Auto-deletes resources on destroy
- No S3 versioning
- Cheaper CloudFront price class
- Local callback URLs

### Staging
- Mimics production
- Custom domain support
- Full monitoring

### Production
- Retention policies enabled
- S3 versioning enabled
- Global CloudFront distribution
- Enhanced security

## Troubleshooting

### CDK Bootstrap Error

```bash
cdk bootstrap aws://ACCOUNT-ID/REGION
```

Replace `ACCOUNT-ID` with your AWS account ID.

### Stack Already Exists

If you get "Stack already exists" error:

```bash
# Option 1: Update existing stack
cdk deploy KcmsAuthStack-dev

# Option 2: Destroy and recreate
./destroy.sh dev
./deploy.sh dev
```

### Permission Denied

Ensure your IAM user has these policies:
- CloudFormation full access
- S3 full access
- CloudFront full access
- Cognito full access
- Lambda full access
- IAM limited access

### Region Mismatch

Ensure consistent region:
```bash
export AWS_REGION=eu-north-1
aws configure set region eu-north-1
```

### Deployment Timeout

Increase timeout in `cdk.json`:
```json
{
  "context": {
    "@aws-cdk/core:stackRelativeExports": true
  }
}
```

## Cost Estimation

### Development Environment
- Cognito: ~$0 (free tier)
- Lambda: ~$0 (free tier)
- S3: ~$0.50/month
- CloudFront: ~$1-5/month
- **Total: ~$2-6/month**

### Production Environment
- Cognito: ~$0-50/month (depends on MAU)
- Lambda: ~$0-5/month
- S3: ~$5-20/month
- CloudFront: ~$20-100/month
- **Total: ~$25-175/month**

## Security Best Practices

1. **Never commit AWS credentials** to Git
2. **Use IAM roles** for production deployments
3. **Enable MFA** on AWS root account
4. **Rotate access keys** regularly
5. **Use separate AWS accounts** for dev/staging/prod
6. **Enable CloudTrail** for audit logging
7. **Set up billing alerts**

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Deploy Infrastructure

on:
  push:
    branches: [main]
    paths:
      - 'infrastructure/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Configure AWS Credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: eu-north-1
      
      - name: Install Dependencies
        run: |
          cd infrastructure
          npm install
      
      - name: Deploy
        run: |
          cd infrastructure
          export ENVIRONMENT=prod
          npm run deploy:all
```

## Monitoring and Logging

### CloudWatch Logs

View Lambda logs:
```bash
aws logs tail /aws/lambda/KcmsAuthStack-dev-PreSignupTrigger --follow
```

### CloudFront Metrics

```bash
aws cloudwatch get-metric-statistics \
  --namespace AWS/CloudFront \
  --metric-name Requests \
  --dimensions Name=DistributionId,Value=DISTRIBUTION-ID \
  --start-time 2024-01-01T00:00:00Z \
  --end-time 2024-01-02T00:00:00Z \
  --period 3600 \
  --statistics Sum
```

### Cognito Metrics

```bash
aws cloudwatch get-metric-statistics \
  --namespace AWS/Cognito \
  --metric-name SignInSuccesses \
  --dimensions Name=UserPool,Value=USER-POOL-ID \
  --start-time 2024-01-01T00:00:00Z \
  --end-time 2024-01-02T00:00:00Z \
  --period 3600 \
  --statistics Sum
```

## Next Steps

1. ✅ Deploy infrastructure
2. ✅ Update frontend configuration
3. ✅ Test authentication locally
4. ✅ Deploy frontend to CloudFront
5. ✅ Set up custom domain (optional)
6. ✅ Configure monitoring and alerts
7. ✅ Set up CI/CD pipeline
8. ✅ Add database stack (DynamoDB/RDS)
9. ✅ Add API Gateway + Lambda backend

## Support Resources

- [AWS CDK Documentation](https://docs.aws.amazon.com/cdk/)
- [AWS Cognito Documentation](https://docs.aws.amazon.com/cognito/)
- [CloudFormation Documentation](https://docs.aws.amazon.com/cloudformation/)
- [AWS CLI Reference](https://docs.aws.amazon.com/cli/)

## Common Commands Reference

```bash
# Infrastructure
cd infrastructure
npm install              # Install dependencies
npm run build           # Build TypeScript
npm run synth           # Synthesize CloudFormation
npm run diff            # Show changes
npm run deploy:all      # Deploy all stacks
npm run destroy         # Destroy all stacks
./deploy.sh dev         # Deploy dev environment
./get-outputs.sh dev    # Get stack outputs

# Frontend
cd apps
npm run dev             # Start dev server
npm run build           # Build for production
npm run export          # Export static site

# AWS CLI
aws sts get-caller-identity              # Check credentials
aws cloudformation list-stacks           # List all stacks
aws s3 ls                                # List S3 buckets
aws cognito-idp list-user-pools --max-results 10  # List user pools
```
