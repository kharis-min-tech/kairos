# KCMS Infrastructure - Quick Start

Get your KCMS infrastructure deployed in 5 minutes.

## Prerequisites

- AWS Account
- AWS CLI configured (`aws configure`)
- Node.js v18+
- AWS CDK CLI (`npm install -g aws-cdk`)

## Step 1: Install Dependencies

```bash
cd infrastructure
npm install
```

## Step 2: Bootstrap CDK (First Time Only)

```bash
npm run bootstrap
```

## Step 3: Deploy Development Environment

```bash
./deploy.sh dev
```

This will:
- ✓ Check AWS credentials
- ✓ Build TypeScript
- ✓ Synthesize CloudFormation
- ✓ Deploy Cognito User Pool
- ✓ Deploy S3 + CloudFront
- ✓ Display configuration outputs

## Step 4: Get Configuration

```bash
./get-outputs.sh dev
```

Copy the environment variables displayed.

## Step 5: Update Frontend

Edit `apps/.env.local`:

```bash
NEXT_PUBLIC_COGNITO_USER_POOL_ID=<from-output>
NEXT_PUBLIC_COGNITO_CLIENT_ID=<from-output>
NEXT_PUBLIC_COGNITO_REGION=eu-north-1
NEXT_PUBLIC_COGNITO_DOMAIN=<from-output>
```

## Step 6: Test Locally

```bash
cd ../apps
npm run dev
```

Open http://localhost:3001

## What Was Created?

### Cognito User Pool
- User authentication
- OAuth 2.0/OIDC
- Auto-confirmation Lambda
- MFA support

### S3 Bucket
- Static website hosting
- Secure access via CloudFront

### CloudFront Distribution
- Global CDN
- HTTPS enforced
- SPA routing support

## Next Steps

- Deploy to staging: `./deploy.sh staging`
- Deploy to production: `./deploy.sh prod`
- Add custom domain
- Set up CI/CD pipeline

## Troubleshooting

### "CDK not bootstrapped"
```bash
cdk bootstrap aws://ACCOUNT-ID/eu-north-1
```

### "Permission denied"
Ensure IAM user has CloudFormation, S3, CloudFront, Cognito, Lambda permissions.

### "Stack already exists"
```bash
./destroy.sh dev
./deploy.sh dev
```

## Cost

Development environment: ~$2-6/month

## Support

See [INFRASTRUCTURE_GUIDE.md](../INFRASTRUCTURE_GUIDE.md) for detailed documentation.
