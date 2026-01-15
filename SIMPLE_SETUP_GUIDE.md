# KCMS Setup - Super Simple Guide

## 🎯 Goal
Get KCMS running on your computer in 15 minutes.

---

## 📋 What You Need

- [ ] Computer (Mac/Linux/Windows)
- [ ] Internet connection
- [ ] AWS Account (free tier is fine)
- [ ] 15 minutes

---

## 🚀 Setup Steps

### Step 1: Get AWS Credentials (5 minutes)

1. Go to https://console.aws.amazon.com
2. Sign in (or create account)
3. Search for "IAM" in the top search bar
4. Click "Users" in left sidebar
5. Click "Create user" or select existing user
6. Click "Security credentials" tab
7. Scroll to "Access keys"
8. Click "Create access key"
9. Select "Command Line Interface (CLI)"
10. Click "Create access key"
11. **IMPORTANT**: Click "Download .csv file" 
12. Save the file somewhere safe!

📖 **Detailed guide**: [GET_AWS_CREDENTIALS.md](GET_AWS_CREDENTIALS.md)

---

### Step 2: Install AWS CLI (2 minutes)

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
Download from: https://aws.amazon.com/cli/

---

### Step 3: Configure AWS CLI (1 minute)

Open terminal and run:

```bash
aws configure
```

Enter your credentials from the CSV file:
- **Access Key ID**: (from CSV)
- **Secret Access Key**: (from CSV)
- **Region**: `eu-north-1`
- **Output format**: `json`

Test it works:
```bash
aws sts get-caller-identity
```

You should see your account info. ✅

---

### Step 4: Deploy Everything (5 minutes)

Copy and paste this ONE command:

```bash
cd ~/Downloads/kairos2/Untitled
./DEPLOY_EVERYTHING.sh
```

This will:
- ✓ Check everything is installed
- ✓ Deploy to AWS
- ✓ Configure the app
- ✓ Install dependencies

**Wait 5-10 minutes** while it deploys.

When you see "✅ DEPLOYMENT COMPLETE!", you're done!

---

### Step 5: Start the App (1 minute)

```bash
npm run dev
```

Open your browser to: **http://localhost:3001**

🎉 **You're done!**

---

## 🧪 Test It Works

1. Open http://localhost:3001
2. Click "Sign Up"
3. Create an account with your email
4. You should be automatically logged in
5. You should see the dashboard

✅ If you see the dashboard, everything works!

---

## 🆘 Troubleshooting

### "aws: command not found"
→ AWS CLI not installed. Go back to Step 2.

### "Unable to locate credentials"
→ AWS CLI not configured. Go back to Step 3.

### "Permission denied"
→ Make script executable: `chmod +x DEPLOY_EVERYTHING.sh`

### "Connection refused" when logging in
→ Run: `./update-cognito-urls.sh`

### "Module not found"
→ Run: `npm install`

### Still not working?
→ Check [GET_AWS_CREDENTIALS.md](GET_AWS_CREDENTIALS.md)

---

## 📱 For Team Members (Your Friend)

If someone else wants to run the app on their laptop:

```bash
git clone https://github.com/kharis-min-tech/kairos.git
cd kairos/Untitled
./COMPLETE_SETUP.sh
```

That's it! No AWS credentials needed for them.

---

## 🎓 What Just Happened?

The deployment script created:

1. **Cognito User Pool** - Handles user authentication
2. **Lambda Function** - Auto-confirms new users
3. **S3 Bucket** - Stores website files
4. **CloudFront** - CDN for fast loading

All managed by AWS CDK (Infrastructure as Code).

---

## 💰 Cost

**Development**: ~$2-6/month (mostly free tier)

**Production**: ~$25-175/month (depends on usage)

You can delete everything anytime:
```bash
cd infrastructure
./destroy.sh dev
```

---

## 📚 More Resources

- **Get AWS Keys**: [GET_AWS_CREDENTIALS.md](GET_AWS_CREDENTIALS.md)
- **Team Setup**: [START_HERE.md](START_HERE.md)
- **Full Guide**: [INFRASTRUCTURE_GUIDE.md](INFRASTRUCTURE_GUIDE.md)
- **Troubleshooting**: [DEPLOYMENT_WORKFLOW.md](DEPLOYMENT_WORKFLOW.md)

---

## ✅ Success Checklist

- [ ] AWS account created
- [ ] AWS CLI installed
- [ ] AWS credentials configured
- [ ] Ran `./DEPLOY_EVERYTHING.sh`
- [ ] Deployment completed successfully
- [ ] Ran `npm run dev`
- [ ] Opened http://localhost:3001
- [ ] Can sign up and login
- [ ] See the dashboard

If all checked, you're ready to build! 🚀

---

## 🎯 Quick Commands Reference

```bash
# Deploy infrastructure
./DEPLOY_EVERYTHING.sh

# Setup on new laptop
./COMPLETE_SETUP.sh

# Fix login issues
./update-cognito-urls.sh

# Start dev server
npm run dev

# Stop dev server
Ctrl + C

# Destroy infrastructure
cd infrastructure && ./destroy.sh dev
```

---

## 🔐 Security Reminder

- ✅ Never commit AWS keys to Git
- ✅ Never share keys via email/Slack
- ✅ Store keys in password manager
- ✅ Delete the CSV file after setup
- ✅ Enable MFA on AWS account

---

## 🎉 You're All Set!

Your KCMS application is now:
- ✅ Deployed to AWS
- ✅ Running locally
- ✅ Ready for development
- ✅ Accessible from any laptop

Start building your church management features! 🏗️
