# Manual Fix for Cognito Confirmation Code Delivery

Since AWS CLI is not available, here's how to fix the "User Pool not configured properly for confirmation code delivery" error through the AWS Console:

## Step 1: Access AWS Cognito Console

1. Go to [AWS Console](https://console.aws.amazon.com/)
2. Navigate to **Cognito** service
3. Click on **User Pools**
4. Find and click on your User Pool: `eu-north-1_OM97wjySK`

## Step 2: Configure Email Settings

1. In your User Pool, go to the **"Messaging"** tab
2. Click **"Edit"** in the Email section
3. Configure the following:
   - **Email provider**: Select **"Send email with Cognito"** (recommended for development)
   - **FROM email address**: Leave as default or set a custom one
   - **Reply-to email address**: Optional
4. Click **"Save changes"**

## Step 3: Configure Message Templates

1. Still in the **"Messaging"** tab, scroll to **"Message templates"**
2. Click **"Edit"** 
3. Configure verification messages:
   - **Verification type**: Select **"Code"**
   - **Email message**: `Your verification code is {####}`
   - **Email subject**: `Verify your KCMS account`
   - **SMS message**: `Your verification code is {####}`
4. Click **"Save changes"**

## Step 4: Configure User Pool Properties

1. Go to the **"Sign-up experience"** tab
2. Click **"Edit"** in the **"Attribute verification and user account confirmation"** section
3. Configure:
   - **Attributes to verify**: Check **"Email"**
   - **Verification message delivery**: Select **"Send email"**
   - **Allow Cognito to automatically send messages**: Check this option
4. Click **"Save changes"**

## Step 5: Configure Sign-in Options

1. Still in **"Sign-up experience"** tab
2. In **"How do you want your end users to sign in?"** section:
   - Check **"Email"** (this allows users to sign in with email)
   - Uncheck other options if not needed
3. Click **"Save changes"**

## Step 6: Verify App Client Settings

1. Go to the **"App integration"** tab
2. Click on your app client: `7mqmc57sb18ideegj293pk81ib`
3. In **"Hosted UI"** section, verify:
   - **Allowed callback URLs**: Should include `http://localhost:3001` and `http://localhost:3001/dashboard`
   - **Allowed sign-out URLs**: Should include `http://localhost:3001`
   - **OAuth 2.0 grant types**: Should include **"Authorization code grant"**
   - **OpenID Connect scopes**: Should include **"openid"**, **"email"**, **"phone"**

## Step 7: Test the Configuration

1. **Clear your browser cache and cookies**
2. **Go to your application**
3. **Try signing up with a valid email address**
4. **Check your email inbox (and spam folder)**
5. **Look for the verification code email**

## Alternative: Use AWS CLI (if you want to install it)

If you prefer to use AWS CLI, install it first:

### Install AWS CLI on macOS:
```bash
# Using Homebrew
brew install awscli

# Or using pip
pip3 install awscli

# Configure AWS CLI
aws configure
```

Then run the fix script:
```bash
./fix-cognito-confirmation-delivery.sh
```

## Common Issues and Solutions

### Issue 1: Still not receiving emails
**Solution**: 
- Check spam/junk folder
- Try a different email address
- Verify the email address format is correct

### Issue 2: "Email already exists" error
**Solution**:
- Use a different email address
- Or delete the existing user from Cognito console

### Issue 3: Domain not configured
**Solution**:
1. Go to **"App integration"** tab in your User Pool
2. Click **"Create Cognito domain"** or **"Create custom domain"**
3. Enter a domain prefix (e.g., `your-app-name`)
4. Click **"Create domain"**

## Verification Checklist

After making changes, verify:
- [ ] Email provider is set to "Send email with Cognito"
- [ ] Email is selected as attribute to verify
- [ ] Verification message template is configured
- [ ] Users can sign in with email
- [ ] App client callback URLs are correct
- [ ] OAuth scopes include email and openid

## Testing Steps

1. Open your app in an incognito/private browser window
2. Try to sign up with a new email address
3. Check email for verification code
4. Enter the code to complete signup
5. Try signing in with the new account

If you're still having issues after following these steps, the problem might be:
- AWS account email sending limits
- Regional restrictions
- Account-level SES configuration issues

In that case, contact AWS support or try using a different AWS region for testing.