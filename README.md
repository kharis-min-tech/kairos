# KCMS - Kharis Church Management System

A modern, cloud-native church management system built with Next.js and AWS.

## Features

- 🔐 **Secure Authentication**: AWS Cognito with OAuth 2.0/OIDC
- 👥 **User Management**: Sign up, sign in, password reset, MFA
- 📱 **Responsive Design**: Mobile-first wireframe-based UI
- ☁️ **Cloud Infrastructure**: AWS CDK for Infrastructure as Code
- 🚀 **Global CDN**: CloudFront for fast content delivery
- 🔒 **Security First**: Auto-confirmation, advanced security features
- 🌐 **Multi-Device**: Works on any laptop automatically

## 🚀 Quick Start (5 Minutes)

### For Project Owner (First Time Setup)

**Prerequisites:**
- AWS Account ([Create one](https://aws.amazon.com/free))
- AWS CLI installed (`brew install awscli` on macOS)
- Node.js v18+ installed

**Step 1: Get AWS Credentials**

1. Go to https://console.aws.amazon.com/iam
2. Click "Users" → Your user → "Security credentials"
3. Click "Create access key" → Select "CLI"
4. Download the CSV file

**Step 2: Set Credentials**

```bash
export AWS_ACCESS_KEY_ID="your-access-key-id"
export AWS_SECRET_ACCESS_KEY="your-secret-access-key"
# If using temporary credentials, also set:
# export AWS_SESSION_TOKEN="your-session-token"
```

**Step 3: Deploy Everything**

```bash
cd Untitled
./DEPLOY_EVERYTHING.sh
```

This ONE command will:
- ✓ Install CDK CLI if needed
- ✓ Bootstrap CDK in your AWS account
- ✓ Deploy Cognito User Pool with auto-confirmation
- ✓ Deploy S3 + CloudFront
- ✓ Configure frontend automatically
- ✓ Install dependencies

**Step 4: Start Development**

```bash
npm run dev
```

Open http://localhost:3001

---

### For Team Members (New Laptop Setup)

```bash
git clone https://github.com/kharis-min-tech/kairos.git
cd kairos/Untitled
./COMPLETE_SETUP.sh
```

That's it! No AWS credentials needed for team members.

## Project Structure

```
.
├── apps/                    # Next.js frontend application
│   ├── src/
│   │   ├── app/            # Next.js 13+ app directory
│   │   ├── components/     # React components
│   │   ├── hooks/          # Custom React hooks
│   │   └── lib/            # Utilities and configurations
│   └── public/             # Static assets
│
├── infrastructure/          # AWS CDK infrastructure
│   ├── bin/                # CDK app entry point
│   ├── lib/                # CDK stacks
│   │   ├── kcms-auth-stack.ts       # Cognito authentication
│   │   └── kcms-frontend-stack.ts   # S3 + CloudFront
│   ├── deploy.sh           # Deployment script
│   └── README.md           # Infrastructure docs
│
└── kairos-wireframes-html/ # Design wireframes
```

## Technology Stack

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Authentication**: AWS Cognito (OAuth 2.0/OIDC)
- **Icons**: FontAwesome

### Infrastructure
- **IaC**: AWS CDK (TypeScript)
- **Authentication**: AWS Cognito User Pool
- **Hosting**: S3 + CloudFront
- **Functions**: AWS Lambda
- **Region**: eu-north-1 (Stockholm)

## Documentation

### Getting Started
- **[START_HERE.md](START_HERE.md)** - Quick reference for everyone
- **[SIMPLE_SETUP_GUIDE.md](SIMPLE_SETUP_GUIDE.md)** - 15-minute walkthrough
- **[GET_AWS_CREDENTIALS.md](GET_AWS_CREDENTIALS.md)** - How to get AWS keys

### Deployment & Infrastructure
- **[DEPLOY_EVERYTHING.sh](DEPLOY_EVERYTHING.sh)** - Automated deployment (run this first!)
- **[INFRASTRUCTURE_GUIDE.md](INFRASTRUCTURE_GUIDE.md)** - Complete deployment guide
- **[DEPLOYMENT_WORKFLOW.md](DEPLOYMENT_WORKFLOW.md)** - Step-by-step workflow
- **[CDK_MIGRATION_SUMMARY.md](CDK_MIGRATION_SUMMARY.md)** - What was built

### Team Setup
- **[COMPLETE_SETUP.sh](COMPLETE_SETUP.sh)** - Team member setup script
- **[SETUP_NEW_LAPTOP.md](SETUP_NEW_LAPTOP.md)** - New laptop setup guide
- **[UPDATE_COGNITO_URLS.md](UPDATE_COGNITO_URLS.md)** - Fix login issues

### Features & Testing
- **[MFA_TESTING_GUIDE.md](MFA_TESTING_GUIDE.md)** - Multi-factor authentication
- **[PROFILE_FUNCTIONALITY_GUIDE.md](PROFILE_FUNCTIONALITY_GUIDE.md)** - User profiles
- **[SIGNOUT_TESTING_GUIDE.md](SIGNOUT_TESTING_GUIDE.md)** - Sign out functionality
- **[QUICK_REFERENCE.md](QUICK_REFERENCE.md)** - Common commands

## Available Scripts

### Frontend

```bash
npm run dev          # Start development server (port 3001)
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
```

### Infrastructure

```bash
cd infrastructure
./DEPLOY_EVERYTHING.sh   # Deploy everything (first time - recommended!)
./deploy.sh dev          # Deploy to dev environment
./deploy.sh prod         # Deploy to production
./destroy.sh dev         # Destroy dev infrastructure
./get-outputs.sh dev     # Get stack outputs
npm run build            # Build TypeScript
npm run synth            # Synthesize CloudFormation
```

### Utilities

```bash
./COMPLETE_SETUP.sh      # Setup on new laptop (team members)
./update-cognito-urls.sh # Fix login issues
```

## Troubleshooting

### "CDK not bootstrapped" Error

```bash
cd infrastructure
cdk bootstrap
```

### "Connection refused" when logging in

The app now automatically detects your URL. If you still have issues:

```bash
./update-cognito-urls.sh
```

### "Module not found"

```bash
npm install
```

### AWS Credentials Expired

Temporary credentials expire after a few hours. Get new ones:

```bash
export AWS_ACCESS_KEY_ID="new-key"
export AWS_SECRET_ACCESS_KEY="new-secret"
export AWS_SESSION_TOKEN="new-token"  # If using temporary credentials
```

### Deployment Fails

1. Check AWS credentials: `aws sts get-caller-identity`
2. Check region: `echo $AWS_REGION`
3. Try bootstrapping again: `cd infrastructure && cdk bootstrap`

---

## Environment Configuration

Create `apps/.env.local`:

```bash
NEXT_PUBLIC_COGNITO_USER_POOL_ID=your-user-pool-id
NEXT_PUBLIC_COGNITO_CLIENT_ID=your-client-id
NEXT_PUBLIC_COGNITO_REGION=eu-north-1
NEXT_PUBLIC_COGNITO_DOMAIN=https://your-domain.auth.eu-north-1.amazoncognito.com
```

Get these values after deploying infrastructure:
```bash
cd infrastructure
./get-outputs.sh dev
```

## Authentication Features

- ✅ Sign up with email
- ✅ Sign in with username/email
- ✅ Forgot password flow
- ✅ Change password
- ✅ MFA setup (TOTP/SMS)
- ✅ User profile management
- ✅ Auto-confirmation (Lambda trigger)
- ✅ OAuth 2.0/OIDC integration
- ✅ Secure sign out

## Deployment

### Development
```bash
cd infrastructure
./deploy.sh dev
```

### Staging
```bash
./deploy.sh staging
```

### Production
```bash
./deploy.sh prod
```

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
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│              AWS Cognito User Pool                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   Users      │  │  OAuth 2.0   │  │  Hosted UI   │  │
│  │ Management   │  │    OIDC      │  │   Domain     │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Lambda Pre-Signup Trigger (Auto-confirm)        │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

## Cost Estimate

### Development
- ~$2-6/month (mostly free tier)

### Production
- ~$25-175/month (depends on usage)

See [Infrastructure Guide](INFRASTRUCTURE_GUIDE.md) for details.

## Security

- HTTPS enforced everywhere
- S3 bucket private (CloudFront OAI)
- Cognito advanced security mode
- MFA support (optional)
- Strong password policies
- Auto-confirmation via Lambda
- No credentials in code

## Contributing

1. Create a feature branch
2. Make your changes
3. Test locally
4. Push to your branch
5. Create a pull request

## Support

For issues or questions:
- Check documentation in `/docs`
- Review [Infrastructure Guide](INFRASTRUCTURE_GUIDE.md)
- Check AWS CloudWatch logs

## License

Proprietary - Kharis Church Management System

---

Built with ❤️ using Next.js and AWS
