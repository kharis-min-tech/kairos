# KCMS Deployment Workflow

Complete step-by-step workflow for deploying KCMS from scratch.

## Prerequisites Checklist

- [ ] AWS Account created
- [ ] AWS CLI installed and configured
- [ ] Node.js v18+ installed
- [ ] Git repository cloned
- [ ] AWS CDK CLI installed globally

## Phase 1: Initial Setup (One-Time)

### Step 1: Configure AWS Credentials

```bash
# Configure AWS CLI
aws configure

# Enter:
# - AWS Access Key ID
# - AWS Secret Access Key
# - Default region: eu-north-1
# - Default output format: json

# Verify
aws sts get-caller-identity
```

### Step 2: Install AWS CDK CLI

```bash
npm install -g aws-cdk

# Verify
cdk --version
```

### Step 3: Install Project Dependencies

```bash
# Frontend dependencies
npm install

# Infrastructure dependencies
cd infrastructure
npm install
cd ..
```

### Step 4: Bootstrap CDK (First Time Only)

```bash
cd infrastructure
npm run bootstrap

# This creates CDKToolkit stack in your AWS account
```

## Phase 2: Deploy Infrastructure

### Step 1: Review Configuration

Edit `infrastructure/bin/kcms-infrastructure.ts` if needed:

```typescript
const config = {
  dev: {
    domainPrefix: 'kcms-dev',
    callbackUrls: ['http://localhost:3001', 'http://localhost:3001/dashboard'],
    logoutUrls: ['http://localhost:3001'],
  },
  // ... other environments
};
```

### Step 2: Deploy Development Environment

```bash
cd infrastructure

# Option 1: Use deployment script (recommended)
./deploy.sh dev

# Option 2: Manual deployment
export ENVIRONMENT=dev
npm run build
npm run synth
npm run deploy:all
```

The deployment will:
1. ✓ Check AWS credentials
2. ✓ Build TypeScript
3. ✓ Synthesize CloudFormation templates
4. ✓ Show changes (diff)
5. ✓ Ask for confirmation
6. ✓ Deploy Auth Stack (Cognito)
7. ✓ Deploy Frontend Stack (S3 + CloudFront)
8. ✓ Display outputs

**Expected Duration**: 5-10 minutes

### Step 3: Capture Stack Outputs

```bash
./get-outputs.sh dev
```

Save these values:
- `UserPoolId`
- `UserPoolClientId`
- `CognitoDomainUrl`
- `WebsiteUrl`

## Phase 3: Configure Frontend

### Step 1: Create Environment File

Create `apps/.env.local`:

```bash
cd ../apps

# Create .env.local with outputs from previous step
cat > .env.local << EOF
NEXT_PUBLIC_COGNITO_USER_POOL_ID=eu-north-1_XXXXXXXXX
NEXT_PUBLIC_COGNITO_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
NEXT_PUBLIC_COGNITO_REGION=eu-north-1
NEXT_PUBLIC_COGNITO_DOMAIN=https://kcms-dev.auth.eu-north-1.amazoncognito.com
EOF
```

### Step 2: Start Development Server

```bash
npm run dev
```

Open http://localhost:3001

## Phase 4: Test Authentication

### Test Sign Up

1. Navigate to http://localhost:3001
2. Click "Sign Up"
3. Enter email and password
4. Submit form
5. ✓ User should be auto-confirmed
6. ✓ Redirected to dashboard

### Test Sign In

1. Navigate to http://localhost:3001/login
2. Enter credentials
3. Submit form
4. ✓ Redirected to dashboard

### Test Password Reset

1. Navigate to http://localhost:3001/auth/forgot-password
2. Enter email
3. Check email for code
4. Enter code and new password
5. ✓ Password reset successful

### Test Profile

1. Navigate to http://localhost:3001/profile
2. ✓ View user information
3. ✓ Check MFA status
4. ✓ View security recommendations

### Test Sign Out

1. Click user menu in header
2. Click "Sign Out"
3. ✓ Redirected to home page
4. ✓ Cannot access protected pages

## Phase 5: Deploy to Staging (Optional)

### Step 1: Update Configuration

Edit `infrastructure/bin/kcms-infrastructure.ts`:

```typescript
staging: {
  domainPrefix: 'kcms-staging',
  callbackUrls: ['https://staging.yourdomain.com', 'https://staging.yourdomain.com/dashboard'],
  logoutUrls: ['https://staging.yourdomain.com'],
},
```

### Step 2: Deploy Staging

```bash
cd infrastructure
./deploy.sh staging
```

### Step 3: Update Frontend Config

```bash
./get-outputs.sh staging

# Update production build with staging config
cd ../apps
# Update .env.production or build-time config
```

### Step 4: Deploy Frontend to CloudFront

```bash
# Build Next.js
npm run build

# Get bucket name
cd ../infrastructure
BUCKET_NAME=$(./get-outputs.sh staging | grep BucketName | awk '{print $4}')

# Upload to S3
cd ../apps
aws s3 sync out/ s3://$BUCKET_NAME/ --delete

# Get distribution ID
cd ../infrastructure
DIST_ID=$(./get-outputs.sh staging | grep DistributionId | awk '{print $4}')

# Invalidate CloudFront cache
aws cloudfront create-invalidation --distribution-id $DIST_ID --paths "/*"
```

### Step 5: Test Staging

Get CloudFront URL:
```bash
./get-outputs.sh staging | grep WebsiteUrl
```

Open URL and test all features.

## Phase 6: Deploy to Production

### Step 1: Update Configuration

Edit `infrastructure/bin/kcms-infrastructure.ts`:

```typescript
prod: {
  domainPrefix: 'kcms-prod',
  callbackUrls: ['https://yourdomain.com', 'https://yourdomain.com/dashboard'],
  logoutUrls: ['https://yourdomain.com'],
},
```

### Step 2: Deploy Production

```bash
cd infrastructure
./deploy.sh prod

# Type 'yes' when prompted for production deployment
```

### Step 3: Configure Custom Domain (Optional)

```bash
# Add Route 53 hosted zone
# Add CloudFront alternate domain name
# Add SSL certificate from ACM
# Update DNS records
```

### Step 4: Deploy Frontend

```bash
cd ../apps
npm run build

# Get bucket name
cd ../infrastructure
BUCKET_NAME=$(./get-outputs.sh prod | grep BucketName | awk '{print $4}')

# Upload to S3
cd ../apps
aws s3 sync out/ s3://$BUCKET_NAME/ --delete

# Invalidate cache
cd ../infrastructure
DIST_ID=$(./get-outputs.sh prod | grep DistributionId | awk '{print $4}')
aws cloudfront create-invalidation --distribution-id $DIST_ID --paths "/*"
```

### Step 5: Production Testing

Test all critical flows:
- [ ] Sign up
- [ ] Sign in
- [ ] Password reset
- [ ] MFA setup
- [ ] Profile management
- [ ] Sign out
- [ ] Protected routes
- [ ] OAuth redirects

## Phase 7: Monitoring and Maintenance

### Set Up CloudWatch Alarms

```bash
# Monitor Lambda errors
aws cloudwatch put-metric-alarm \
  --alarm-name kcms-lambda-errors \
  --alarm-description "Alert on Lambda errors" \
  --metric-name Errors \
  --namespace AWS/Lambda \
  --statistic Sum \
  --period 300 \
  --threshold 5 \
  --comparison-operator GreaterThanThreshold

# Monitor CloudFront errors
aws cloudwatch put-metric-alarm \
  --alarm-name kcms-cloudfront-errors \
  --alarm-description "Alert on CloudFront 5xx errors" \
  --metric-name 5xxErrorRate \
  --namespace AWS/CloudFront \
  --statistic Average \
  --period 300 \
  --threshold 5 \
  --comparison-operator GreaterThanThreshold
```

### Set Up Billing Alerts

```bash
# Create billing alarm
aws cloudwatch put-metric-alarm \
  --alarm-name kcms-billing-alert \
  --alarm-description "Alert when bill exceeds $100" \
  --metric-name EstimatedCharges \
  --namespace AWS/Billing \
  --statistic Maximum \
  --period 21600 \
  --threshold 100 \
  --comparison-operator GreaterThanThreshold
```

### Regular Maintenance

**Weekly**
- [ ] Check CloudWatch logs for errors
- [ ] Review CloudWatch metrics
- [ ] Check AWS billing dashboard

**Monthly**
- [ ] Review security recommendations
- [ ] Update dependencies
- [ ] Review and rotate access keys
- [ ] Check for AWS service updates

**Quarterly**
- [ ] Review and update documentation
- [ ] Audit user access
- [ ] Review cost optimization
- [ ] Test disaster recovery

## Rollback Procedure

### If Deployment Fails

```bash
# CloudFormation automatically rolls back
# Check CloudFormation console for error details

# If needed, manually rollback
cd infrastructure
cdk deploy --rollback
```

### If Application Has Issues

```bash
# Option 1: Rollback infrastructure
cd infrastructure
./destroy.sh dev
git checkout <previous-commit>
./deploy.sh dev

# Option 2: Deploy previous version
git checkout <previous-commit>
cd infrastructure
./deploy.sh dev
```

## Disaster Recovery

### Backup Strategy

**Infrastructure**
- ✓ All infrastructure is in Git
- ✓ CloudFormation templates in cdk.out/
- ✓ Can recreate from code

**User Data**
- Cognito user pool data (AWS managed)
- Regular exports recommended

**Frontend**
- S3 versioning enabled (prod)
- CloudFront cache as backup

### Recovery Steps

1. Clone repository
2. Checkout last known good commit
3. Deploy infrastructure: `./deploy.sh prod`
4. Deploy frontend to S3
5. Invalidate CloudFront cache
6. Test all features

## CI/CD Integration (Future)

### GitHub Actions Workflow

```yaml
name: Deploy KCMS

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - name: Configure AWS
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: eu-north-1
      - name: Deploy Infrastructure
        run: |
          cd infrastructure
          npm install
          ./deploy.sh prod
      - name: Deploy Frontend
        run: |
          cd apps
          npm install
          npm run build
          aws s3 sync out/ s3://BUCKET/ --delete
```

## Troubleshooting Common Issues

### Issue: CDK Bootstrap Failed

**Solution:**
```bash
cdk bootstrap aws://ACCOUNT-ID/eu-north-1 --force
```

### Issue: Stack Already Exists

**Solution:**
```bash
./destroy.sh dev
./deploy.sh dev
```

### Issue: Permission Denied

**Solution:**
- Check IAM user permissions
- Ensure policies for CloudFormation, S3, CloudFront, Cognito, Lambda

### Issue: Frontend Not Loading

**Solution:**
```bash
# Check environment variables
cat apps/.env.local

# Verify outputs match
cd infrastructure
./get-outputs.sh dev

# Restart dev server
cd ../apps
npm run dev
```

### Issue: Authentication Not Working

**Solution:**
```bash
# Check Cognito configuration
aws cognito-idp describe-user-pool --user-pool-id USER-POOL-ID

# Check callback URLs
aws cognito-idp describe-user-pool-client \
  --user-pool-id USER-POOL-ID \
  --client-id CLIENT-ID
```

## Success Criteria

- [ ] Infrastructure deployed successfully
- [ ] All CloudFormation stacks show CREATE_COMPLETE
- [ ] Frontend loads at CloudFront URL
- [ ] Sign up works and auto-confirms users
- [ ] Sign in redirects to dashboard
- [ ] Password reset works
- [ ] MFA can be configured
- [ ] Profile page shows user info
- [ ] Sign out works completely
- [ ] Protected routes require authentication
- [ ] No errors in CloudWatch logs

## Next Steps After Deployment

1. Set up custom domain
2. Configure CI/CD pipeline
3. Add monitoring and alerts
4. Implement database layer
5. Add API backend
6. Set up automated backups
7. Configure WAF rules
8. Add CloudWatch dashboards

---

**Deployment Complete!** 🎉

Your KCMS infrastructure is now live and ready for use.
