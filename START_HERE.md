# 🚀 KCMS - Start Here

## For New Team Members (Your Friend)

### Quick Setup (5 Minutes)

Copy and paste this into your terminal:

```bash
cd Untitled
./COMPLETE_SETUP.sh
```

That's it! The script will:
1. ✓ Check Node.js
2. ✓ Install dependencies
3. ✓ Configure environment
4. ✓ Update Cognito (if you have AWS access)
5. ✓ Start the dev server

Open http://localhost:3001 when done!

---

## For Project Owner (You)

### First Time Deployment

Copy and paste this into your terminal:

```bash
cd Untitled
./DEPLOY_EVERYTHING.sh
```

This will:
1. ✓ Check AWS CLI and credentials
2. ✓ Install CDK CLI if needed
3. ✓ Bootstrap CDK
4. ✓ Deploy Cognito User Pool
5. ✓ Deploy S3 + CloudFront
6. ✓ Configure frontend automatically
7. ✓ Install dependencies
8. ✓ Ready to run!

Then run:
```bash
npm run dev
```

---

## Troubleshooting

### "AWS CLI not installed"

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

### "AWS credentials not configured"

```bash
aws configure
```

Enter:
- AWS Access Key ID: (from AWS Console)
- AWS Secret Access Key: (from AWS Console)
- Default region: `eu-north-1`
- Default output format: `json`

### "Connection refused" when logging in

The Cognito callback URLs need to be updated. Run:

```bash
./update-cognito-urls.sh
```

Or the project owner needs to redeploy:

```bash
cd infrastructure
./deploy.sh dev
```

### "Module not found"

```bash
npm install
```

### Still not working?

1. Make sure you're in the `Untitled` directory
2. Make sure `.env.local` exists
3. Make sure the dev server is running: `npm run dev`
4. Clear browser cache and cookies
5. Try in incognito/private mode

---

## What Each Script Does

### `COMPLETE_SETUP.sh` (For team members)
- Installs dependencies
- Creates `.env.local` with correct values
- Updates Cognito URLs (if AWS access available)
- Starts dev server
- **Use this on new laptops**

### `DEPLOY_EVERYTHING.sh` (For project owner)
- Deploys complete AWS infrastructure
- Creates Cognito User Pool
- Creates S3 + CloudFront
- Configures everything automatically
- **Use this for first deployment**

### `update-cognito-urls.sh` (For fixing login issues)
- Updates Cognito callback URLs
- Allows login from any laptop
- **Use this if login fails**

---

## Quick Commands

```bash
# Setup on new laptop
./COMPLETE_SETUP.sh

# Deploy infrastructure (owner only)
./DEPLOY_EVERYTHING.sh

# Fix login issues
./update-cognito-urls.sh

# Start dev server
npm run dev

# Build for production
npm run build
```

---

## File Structure

```
Untitled/
├── COMPLETE_SETUP.sh          ← Run this on new laptops
├── DEPLOY_EVERYTHING.sh       ← Run this to deploy (owner)
├── update-cognito-urls.sh     ← Run this to fix login
├── .env.local                 ← Auto-created config
├── apps/                      ← Frontend code
└── infrastructure/            ← AWS CDK code
```

---

## Support

- **Setup issues**: Check this file
- **Login issues**: Run `./update-cognito-urls.sh`
- **Deployment issues**: Check [INFRASTRUCTURE_GUIDE.md](INFRASTRUCTURE_GUIDE.md)
- **Code issues**: Check [README.md](README.md)

---

## Success Checklist

- [ ] Cloned repository
- [ ] Ran `./COMPLETE_SETUP.sh`
- [ ] Dev server started
- [ ] Opened http://localhost:3001
- [ ] Can see the homepage
- [ ] Can click "Sign In"
- [ ] Can sign up/login
- [ ] Redirected to dashboard after login

If all checked, you're good to go! 🎉
