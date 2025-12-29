# Cognito Confirmation Code Delivery Troubleshooting

## Error: "User Pool not configured properly for confirmation code delivery"

This error occurs when AWS Cognito cannot send verification codes to users during signup or password reset. Here's how to fix it:

## Quick Fix

Run the enhanced fix script:
```bash
./fix-cognito-confirmation-delivery.sh
```

## Diagnostic Steps

1. **Run the diagnostic script first:**
   ```bash
   ./diagnose-cognito-delivery.sh
   ```

2. **Check the output for common issues:**
   - Missing email configuration
   - Auto-verification not enabled for email
   - Incorrect verification message template
   - Domain configuration issues

## Common Causes and Solutions

### 1. Email Configuration Missing
**Problem:** User Pool has no email configuration
**Solution:** Configure Cognito to use default email service
```bash
aws cognito-idp update-user-pool \
  --user-pool-id eu-north-1_OM97wjySK \
  --email-configuration EmailSendingAccount="COGNITO_DEFAULT" \
  --region eu-north-1
```

### 2. Auto-Verification Not Enabled
**Problem:** Email is not set as auto-verified attribute
**Solution:** Enable email auto-verification
```bash
aws cognito-idp update-user-pool \
  --user-pool-id eu-north-1_OM97wjySK \
  --auto-verified-attributes "email" \
  --region eu-north-1
```

### 3. Incorrect Verification Template
**Problem:** Verification message template is not set properly
**Solution:** Set proper verification template
```bash
aws cognito-idp update-user-pool \
  --user-pool-id eu-north-1_OM97wjySK \
  --verification-message-template '{
    "DefaultEmailOption": "CONFIRM_WITH_CODE",
    "EmailMessage": "Your verification code is: {####}",
    "EmailSubject": "Verify your account"
  }' \
  --region eu-north-1
```

### 4. Username Attributes Configuration
**Problem:** Users can't sign up with email as username
**Solution:** Configure email as username attribute
```bash
aws cognito-idp update-user-pool \
  --user-pool-id eu-north-1_OM97wjySK \
  --username-attributes "email" \
  --region eu-north-1
```

### 5. SES Sandbox Mode (for custom email)
**Problem:** If using SES, account might be in sandbox mode
**Solution:** 
- Either use Cognito default email (recommended for development)
- Or request SES production access in AWS console

## Step-by-Step Manual Fix

If the scripts don't work, follow these manual steps:

### Step 1: Check Current Configuration
```bash
aws cognito-idp describe-user-pool \
  --user-pool-id eu-north-1_OM97wjySK \
  --region eu-north-1 \
  --query 'UserPool.{EmailConfiguration:EmailConfiguration,AutoVerifiedAttributes:AutoVerifiedAttributes}'
```

### Step 2: Update User Pool
```bash
aws cognito-idp update-user-pool \
  --user-pool-id eu-north-1_OM97wjySK \
  --region eu-north-1 \
  --email-configuration EmailSendingAccount="COGNITO_DEFAULT" \
  --auto-verified-attributes "email" \
  --username-attributes "email" \
  --verification-message-template '{
    "DefaultEmailOption": "CONFIRM_WITH_CODE",
    "EmailMessage": "Welcome! Your verification code is: {####}",
    "EmailSubject": "Verify your account",
    "SmsMessage": "Your verification code is: {####}"
  }'
```

### Step 3: Update User Pool Client
```bash
aws cognito-idp update-user-pool-client \
  --user-pool-id eu-north-1_OM97wjySK \
  --client-id 7mqmc57sb18ideegj293pk81ib \
  --region eu-north-1 \
  --explicit-auth-flows "ALLOW_USER_SRP_AUTH" "ALLOW_REFRESH_TOKEN_AUTH" "ALLOW_USER_PASSWORD_AUTH"
```

### Step 4: Verify Configuration
```bash
aws cognito-idp describe-user-pool \
  --user-pool-id eu-north-1_OM97wjySK \
  --region eu-north-1 \
  --query 'UserPool.{EmailConfig:EmailConfiguration,AutoVerified:AutoVerifiedAttributes,UsernameAttrs:UsernameAttributes}'
```

## Testing the Fix

1. **Clear browser cache and cookies**
2. **Try signing up with a valid email address**
3. **Check email inbox (and spam folder)**
4. **Look for verification code email**

## Alternative Solutions

### Option 1: Use Cognito Hosted UI
If the custom implementation still has issues, you can use Cognito's hosted UI:
```javascript
// Redirect to Cognito hosted signup
const signUpUrl = `${cognitoDomain}/signup?client_id=${clientId}&response_type=code&scope=openid+email&redirect_uri=${redirectUri}`;
window.location.href = signUpUrl;
```

### Option 2: Configure SES (Advanced)
For production with custom email templates:
1. Set up Amazon SES in your region
2. Verify your domain or email address in SES
3. Request production access if needed
4. Update Cognito to use SES:
```bash
aws cognito-idp update-user-pool \
  --user-pool-id eu-north-1_OM97wjySK \
  --email-configuration EmailSendingAccount="DEVELOPER",SourceArn="arn:aws:ses:eu-north-1:ACCOUNT:identity/your-domain.com" \
  --region eu-north-1
```

## Troubleshooting Checklist

- [ ] Email configuration is set to COGNITO_DEFAULT
- [ ] Auto-verified attributes includes "email"
- [ ] Username attributes is set to "email"
- [ ] Verification message template is CONFIRM_WITH_CODE
- [ ] User Pool domain is configured
- [ ] Client callback URLs are correct
- [ ] Browser cache is cleared
- [ ] Email address is valid and accessible
- [ ] Spam folder has been checked

## Common Error Messages

| Error | Cause | Solution |
|-------|-------|----------|
| "User Pool not configured properly for confirmation code delivery" | Missing email config | Run fix script |
| "Invalid email address" | Email format wrong | Use valid email |
| "User already exists" | Email already registered | Use different email or reset |
| "Code delivery failure" | SES issues | Switch to COGNITO_DEFAULT |

## Getting Help

If you're still having issues:

1. **Check AWS CloudWatch Logs:**
   ```bash
   aws logs describe-log-groups --log-group-name-prefix "/aws/cognito" --region eu-north-1
   ```

2. **Check AWS Cognito Console:**
   - Go to AWS Console > Cognito > User Pools
   - Select your pool: eu-north-1_OM97wjySK
   - Check "Message customizations" tab
   - Check "App integration" tab

3. **Contact AWS Support** if the issue persists

## Prevention

To avoid this issue in the future:
- Always configure email settings when creating User Pools
- Test signup flow in development before production
- Monitor CloudWatch logs for Cognito errors
- Keep backup of working configurations