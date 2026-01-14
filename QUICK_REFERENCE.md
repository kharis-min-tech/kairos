# KCMS Quick Reference

## 🚀 Quick Commands

### Development Server
```bash
npm run dev                    # Start at http://localhost:3001
```

### Infrastructure Deployment
```bash
cd infrastructure
./deploy.sh dev               # Deploy development
./deploy.sh staging           # Deploy staging
./deploy.sh prod              # Deploy production
./get-outputs.sh dev          # Get configuration values
./destroy.sh dev              # Destroy infrastructure
```

### CDK Commands
```bash
cd infrastructure
npm run build                 # Build TypeScript
npm run synth                 # Generate CloudFormation
npm run diff                  # Show changes
npm run deploy:all            # Deploy all stacks
cdk list                      # List all stacks
```

## 📋 Environment Variables

Create `apps/.env.local`:
```bash
NEXT_PUBLIC_COGNITO_USER_POOL_ID=eu-north-1_XXXXXXXXX
NEXT_PUBLIC_COGNITO_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
NEXT_PUBLIC_COGNITO_REGION=eu-north-1
NEXT_PUBLIC_COGNITO_DOMAIN=https://kcms-dev.auth.eu-north-1.amazoncognito.com
```

Get values:
```bash
cd infrastructure && ./get-outputs.sh dev
```

## 🏗️ Project Structure

```
apps/                          # Next.js frontend
  src/
    app/                       # Pages (App Router)
    components/                # React components
    hooks/                     # Custom hooks
    lib/                       # Utilities

infrastructure/                # AWS CDK
  bin/                         # CDK app entry
  lib/                         # CDK stacks
    kcms-auth-stack.ts        # Cognito
    kcms-frontend-stack.ts    # S3 + CloudFront
```

## 🔐 Authentication Pages

- `/` - Home page
- `/login` - Sign in
- `/signup` - Sign up
- `/auth/forgot-password` - Password reset
- `/dashboard` - Protected dashboard
- `/profile` - User profile
- `/auth/change-password` - Change password
- `/auth/mfa-setup` - MFA configuration

## 📚 Documentation

- [Infrastructure Guide](INFRASTRUCTURE_GUIDE.md) - Complete deployment guide
- [Quick Start](infrastructure/QUICKSTART.md) - 5-minute setup
- [CDK Migration Summary](CDK_MIGRATION_SUMMARY.md) - What was built
- [MFA Testing](MFA_TESTING_GUIDE.md) - MFA setup and testing
- [Profile Guide](PROFILE_FUNCTIONALITY_GUIDE.md) - Profile features
- [Sign Out Guide](SIGNOUT_TESTING_GUIDE.md) - Sign out functionality

## 🔧 Troubleshooting

### CDK Bootstrap
```bash
cdk bootstrap aws://ACCOUNT-ID/eu-north-1
```

### AWS Credentials
```bash
aws configure
aws sts get-caller-identity
```

### Stack Already Exists
```bash
cd infrastructure
./destroy.sh dev
./deploy.sh dev
```

### Frontend Not Loading
```bash
# Check environment variables
cat apps/.env.local

# Restart dev server
npm run dev
```

## 💰 Cost Estimate

- **Development**: ~$2-6/month
- **Production**: ~$25-175/month

## 🎯 Common Tasks

### Deploy New Environment
```bash
cd infrastructure
./deploy.sh dev
./get-outputs.sh dev
# Update apps/.env.local
cd ../apps && npm run dev
```

### Update Infrastructure
```bash
cd infrastructure
# Edit lib/*.ts files
npm run build
npm run diff
./deploy.sh dev
```

### Deploy Frontend to CloudFront
```bash
cd apps
npm run build
aws s3 sync out/ s3://BUCKET-NAME/ --delete
aws cloudfront create-invalidation --distribution-id DIST-ID --paths "/*"
```

### View Logs
```bash
# Lambda logs
aws logs tail /aws/lambda/FUNCTION-NAME --follow

# CloudFront logs
aws cloudfront get-distribution --id DIST-ID
```

## 🔗 Useful Links

- AWS Console: https://console.aws.amazon.com
- Cognito: https://console.aws.amazon.com/cognito
- CloudFormation: https://console.aws.amazon.com/cloudformation
- S3: https://console.aws.amazon.com/s3
- CloudFront: https://console.aws.amazon.com/cloudfront

## 📞 Support

Check documentation or AWS CloudWatch logs for issues.

---

**Region**: eu-north-1 (Stockholm)
**Branch**: princewills
