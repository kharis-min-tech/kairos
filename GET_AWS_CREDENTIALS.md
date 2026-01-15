# How to Get AWS Access Keys

## Step-by-Step Guide

### Step 1: Sign in to AWS Console

1. Go to https://console.aws.amazon.com
2. Sign in with your AWS account
   - If you don't have an account, click "Create a new AWS account"

### Step 2: Navigate to IAM

1. In the AWS Console search bar at the top, type: **IAM**
2. Click on **IAM** (Identity and Access Management)

Or go directly to: https://console.aws.amazon.com/iam

### Step 3: Create a New User (If You Don't Have One)

1. In the left sidebar, click **Users**
2. Click **Create user** (orange button)
3. Enter a username (e.g., `kcms-admin` or your name)
4. Click **Next**

### Step 4: Set Permissions

1. Select **Attach policies directly**
2. Search for and check these policies:
   - ✅ **AdministratorAccess** (for full access)
   
   OR for more restricted access, select these:
   - ✅ **AWSCloudFormationFullAccess**
   - ✅ **AmazonS3FullAccess**
   - ✅ **CloudFrontFullAccess**
   - ✅ **AmazonCognitoPowerUser**
   - ✅ **AWSLambda_FullAccess**
   - ✅ **IAMFullAccess**

3. Click **Next**
4. Click **Create user**

### Step 5: Create Access Key

1. Click on the user you just created (or your existing user)
2. Click on the **Security credentials** tab
3. Scroll down to **Access keys** section
4. Click **Create access key**
5. Select **Command Line Interface (CLI)**
6. Check the confirmation box at the bottom
7. Click **Next**
8. (Optional) Add a description tag like "KCMS Development"
9. Click **Create access key**

### Step 6: Save Your Credentials

⚠️ **IMPORTANT**: This is the ONLY time you'll see the Secret Access Key!

You'll see:
- **Access key ID**: Something like `AKIAIOSFODNN7EXAMPLE`
- **Secret access key**: Something like `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY`

**Save these immediately!**

Options to save:
1. Click **Download .csv file** (recommended)
2. Copy both values to a secure password manager
3. Write them down temporarily (delete after setup)

⚠️ **Never share these keys or commit them to Git!**

### Step 7: Configure AWS CLI

Now that you have your keys, open your terminal and run:

```bash
aws configure
```

Enter the values when prompted:

```
AWS Access Key ID [None]: PASTE_YOUR_ACCESS_KEY_ID_HERE
AWS Secret Access Key [None]: PASTE_YOUR_SECRET_ACCESS_KEY_HERE
Default region name [None]: eu-north-1
Default output format [None]: json
```

### Step 8: Verify Configuration

Test that it works:

```bash
aws sts get-caller-identity
```

You should see output like:
```json
{
    "UserId": "AIDAI...",
    "Account": "123456789012",
    "Arn": "arn:aws:iam::123456789012:user/your-username"
}
```

✅ If you see this, you're ready to deploy!

---

## Quick Visual Guide

### Where to Find Things in AWS Console:

```
AWS Console Home
    ↓
Search bar (top) → Type "IAM"
    ↓
IAM Dashboard
    ↓
Left sidebar → "Users"
    ↓
Click your user (or "Create user")
    ↓
"Security credentials" tab
    ↓
Scroll to "Access keys"
    ↓
"Create access key"
    ↓
Select "CLI"
    ↓
"Create access key"
    ↓
💾 DOWNLOAD .CSV FILE
```

---

## Troubleshooting

### "I don't see the IAM option"

Make sure you're logged in as the root user or an admin user.

### "I can't create access keys"

You might not have permission. Ask your AWS account administrator.

### "I lost my secret access key"

You can't retrieve it. You need to:
1. Delete the old access key
2. Create a new one
3. Save it this time!

### "Access Denied" errors

Your user needs more permissions. Add the policies mentioned in Step 4.

---

## Security Best Practices

1. ✅ **Never commit keys to Git**
2. ✅ **Don't share keys via email/Slack**
3. ✅ **Use a password manager** to store them
4. ✅ **Rotate keys regularly** (every 90 days)
5. ✅ **Delete unused keys**
6. ✅ **Use MFA** on your AWS account
7. ✅ **Create separate users** for different team members

---

## After Getting Your Keys

Run the deployment script:

```bash
cd ~/Downloads/kairos2/Untitled
./DEPLOY_EVERYTHING.sh
```

The script will automatically use your configured AWS credentials!

---

## Alternative: AWS SSO (For Organizations)

If your company uses AWS SSO:

1. Ask your admin for SSO access
2. Install AWS CLI v2
3. Run: `aws configure sso`
4. Follow the prompts

This is more secure than access keys!

---

## Need Help?

### Can't find IAM?
- Direct link: https://console.aws.amazon.com/iam

### Don't have AWS account?
- Create one: https://aws.amazon.com/free
- You get 12 months free tier!

### Forgot root password?
- Reset: https://console.aws.amazon.com/

### Still stuck?
- AWS Support: https://console.aws.amazon.com/support

---

## Quick Reference

```bash
# Configure AWS CLI
aws configure

# Test configuration
aws sts get-caller-identity

# View current configuration
aws configure list

# Change region
aws configure set region eu-north-1
```

---

## What's Next?

Once you have AWS credentials configured:

1. ✅ Run `./DEPLOY_EVERYTHING.sh`
2. ✅ Wait 5-10 minutes for deployment
3. ✅ Run `npm run dev`
4. ✅ Open http://localhost:3001
5. ✅ Start building! 🚀
