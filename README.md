# KCMS - Kharis Church Management System

A modern, cloud-native church management system built with Next.js and AWS.

## Features

- 🔐 **Secure Authentication**: AWS Cognito with OAuth 2.0/OIDC
- 👥 **User Management**: Sign up, sign in, password reset, MFA
- 📱 **Responsive Design**: Mobile-first wireframe-based UI
- ☁️ **Cloud Infrastructure**: AWS CDK for Infrastructure as Code
- 🚀 **Global CDN**: CloudFront for fast content delivery
- 🔒 **Security First**: Auto-confirmation, advanced security features

## Quick Start

### Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Open http://localhost:3001

### Deploy Infrastructure

```bash
cd infrastructure
./deploy.sh dev
```

See [Infrastructure Guide](INFRASTRUCTURE_GUIDE.md) for details.

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

- [Infrastructure Guide](INFRASTRUCTURE_GUIDE.md) - Complete AWS deployment guide
- [Quick Start](infrastructure/QUICKSTART.md) - 5-minute setup
- [MFA Testing Guide](MFA_TESTING_GUIDE.md) - Multi-factor authentication
- [Profile Guide](PROFILE_FUNCTIONALITY_GUIDE.md) - User profile management
- [Sign Out Guide](SIGNOUT_TESTING_GUIDE.md) - Sign out functionality

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
npm run build        # Build TypeScript
npm run synth        # Synthesize CloudFormation
npm run deploy:all   # Deploy all stacks
./deploy.sh dev      # Deploy development environment
./get-outputs.sh dev # Get stack outputs
```

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
