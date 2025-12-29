#!/bin/bash

# Enhanced fix for Cognito User Pool confirmation code delivery issues
# This script addresses common configuration problems that prevent code delivery

USER_POOL_ID="eu-north-1_OM97wjySK"
CLIENT_ID="7mqmc57sb18ideegj293pk81ib"
REGION="eu-north-1"

echo "🔧 Enhanced fix for Cognito confirmation code delivery..."
echo ""

# Check current configuration first
echo "📋 Checking current User Pool configuration..."
aws cognito-idp describe-user-pool \
  --user-pool-id $USER_POOL_ID \
  --region $REGION \
  --query 'UserPool.{
    EmailConfiguration:EmailConfiguration,
    SmsConfiguration:SmsConfiguration,
    AutoVerifiedAttributes:AutoVerifiedAttributes,
    AliasAttributes:AliasAttributes,
    UsernameAttributes:UsernameAttributes,
    Policies:Policies.PasswordPolicy,
    VerificationMessageTemplate:VerificationMessageTemplate
  }' \
  --output table

echo ""
echo "🔧 Step 1: Configuring User Pool for proper email delivery..."

# Update User Pool with comprehensive email configuration
aws cognito-idp update-user-pool \
  --user-pool-id $USER_POOL_ID \
  --region $REGION \
  --email-configuration EmailSendingAccount="COGNITO_DEFAULT" \
  --auto-verified-attributes "email" \
  --username-attributes "email" \
  --verification-message-template '{
    "DefaultEmailOption": "CONFIRM_WITH_CODE",
    "EmailMessage": "Welcome to KCMS! Your verification code is: {####}",
    "EmailSubject": "Verify your KCMS account",
    "SmsMessage": "Your KCMS verification code is: {####}"
  }' \
  --policies '{
    "PasswordPolicy": {
      "MinimumLength": 8,
      "RequireUppercase": true,
      "RequireLowercase": true,
      "RequireNumbers": true,
      "RequireSymbols": false
    }
  }'

if [ $? -eq 0 ]; then
    echo "✅ User Pool updated successfully"
else
    echo "❌ Failed to update User Pool"
    exit 1
fi

echo ""
echo "🔧 Step 2: Configuring User Pool Client..."

# Update client with proper OAuth and auth flow settings
aws cognito-idp update-user-pool-client \
  --user-pool-id $USER_POOL_ID \
  --client-id $CLIENT_ID \
  --region $REGION \
  --callback-urls "http://localhost:3001" "http://localhost:3001/dashboard" "https://d84l1y8p4kdic.cloudfront.net" "https://d84l1y8p4kdic.cloudfront.net/dashboard" \
  --logout-urls "http://localhost:3001" "https://d84l1y8p4kdic.cloudfront.net" \
  --allowed-o-auth-flows "code" \
  --allowed-o-auth-scopes "openid" "email" "phone" "profile" \
  --allowed-o-auth-flows-user-pool-client \
  --supported-identity-providers "COGNITO" \
  --explicit-auth-flows "ALLOW_USER_SRP_AUTH" "ALLOW_REFRESH_TOKEN_AUTH" "ALLOW_USER_PASSWORD_AUTH" "ALLOW_ADMIN_USER_PASSWORD_AUTH" \
  --generate-secret false \
  --prevent-user-existence-errors "ENABLED"

if [ $? -eq 0 ]; then
    echo "✅ User Pool Client updated successfully"
else
    echo "❌ Failed to update User Pool Client"
    exit 1
fi

echo ""
echo "🔧 Step 3: Verifying User Pool Domain configuration..."

# Check if domain is properly configured
DOMAIN_INFO=$(aws cognito-idp describe-user-pool-domain \
  --domain "eu-north-1om97wjysk" \
  --region $REGION 2>/dev/null)

if [ $? -eq 0 ]; then
    echo "✅ User Pool Domain is configured"
    echo "$DOMAIN_INFO" | jq '.DomainDescription.Status'
else
    echo "⚠️  User Pool Domain might need configuration"
fi

echo ""
echo "🔧 Step 4: Testing email configuration..."

# Try to get user pool configuration to verify changes
echo "📋 Verifying updated configuration..."
aws cognito-idp describe-user-pool \
  --user-pool-id $USER_POOL_ID \
  --region $REGION \
  --query 'UserPool.{
    EmailConfig:EmailConfiguration.EmailSendingAccount,
    AutoVerified:AutoVerifiedAttributes,
    UsernameAttrs:UsernameAttributes,
    VerificationTemplate:VerificationMessageTemplate.DefaultEmailOption
  }' \
  --output table

echo ""
echo "✅ Configuration update complete!"
echo ""
echo "📋 Summary of changes:"
echo "   ✅ Email delivery: Cognito Default (no SES setup required)"
echo "   ✅ Auto-verified attributes: email only"
echo "   ✅ Username attributes: email (users sign in with email)"
echo "   ✅ Verification method: Email with confirmation code"
echo "   ✅ OAuth flows: Authorization code flow enabled"
echo "   ✅ OAuth scopes: openid, email, phone, profile"
echo "   ✅ Password policy: 8+ chars, upper/lower/numbers required"
echo ""
echo "🔄 Next steps:"
echo "   1. Clear your browser cache and cookies"
echo "   2. Try signing up with a valid email address"
echo "   3. Check your email (including spam folder) for verification code"
echo "   4. If still having issues, check AWS CloudWatch logs"
echo ""
echo "🐛 Troubleshooting:"
echo "   - Make sure the email address is valid and accessible"
echo "   - Check spam/junk folder for verification emails"
echo "   - Ensure your AWS account has email sending permissions"
echo "   - If using a new AWS account, email sending might be in sandbox mode"
echo ""
echo "📞 If problems persist, run: aws logs describe-log-groups --log-group-name-prefix '/aws/cognito'"