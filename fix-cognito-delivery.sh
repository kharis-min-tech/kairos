#!/bin/bash

# Fix Cognito User Pool for confirmation code delivery
# This configures email delivery for verification codes

USER_POOL_ID="eu-north-1_OM97wjySK"
CLIENT_ID="7mqmc57sb18ideegj293pk81ib"
REGION="eu-north-1"

echo "🔧 Fixing Cognito confirmation code delivery..."

# First, let's check current configuration
echo "📋 Current User Pool configuration:"
aws cognito-idp describe-user-pool \
  --user-pool-id $USER_POOL_ID \
  --region $REGION \
  --query 'UserPool.{EmailConfiguration:EmailConfiguration,SmsConfiguration:SmsConfiguration,VerificationMessageTemplate:VerificationMessageTemplate,AutoVerifiedAttributes:AutoVerifiedAttributes}' \
  --output table

echo ""
echo "🔧 Updating User Pool for email delivery..."

# Configure email delivery using Cognito's default email
aws cognito-idp update-user-pool \
  --user-pool-id $USER_POOL_ID \
  --email-configuration EmailSendingAccount="COGNITO_DEFAULT" \
  --verification-message-template DefaultEmailOption="CONFIRM_WITH_CODE",EmailMessage="Your verification code is {####}",EmailSubject="Verify your email for Kairos",SmsMessage="Your verification code is {####}" \
  --auto-verified-attributes "email" \
  --region $REGION

echo ""
echo "🔧 Updating User Pool Client settings..."

# Update client with proper settings
aws cognito-idp update-user-pool-client \
  --user-pool-id $USER_POOL_ID \
  --client-id $CLIENT_ID \
  --callback-urls "http://localhost:3001/dashboard" "https://d84l1y8p4kdic.cloudfront.net/dashboard" \
  --logout-urls "http://localhost:3001" "https://d84l1y8p4kdic.cloudfront.net" \
  --allowed-o-auth-flows "code" \
  --allowed-o-auth-scopes "openid" "email" "phone" \
  --allowed-o-auth-flows-user-pool-client \
  --supported-identity-providers "COGNITO" \
  --explicit-auth-flows "ALLOW_USER_SRP_AUTH" "ALLOW_REFRESH_TOKEN_AUTH" "ALLOW_USER_PASSWORD_AUTH" \
  --region $REGION

echo ""
echo "✅ Cognito User Pool updated!"
echo ""
echo "📋 Updated configuration:"
echo "   ✅ Email delivery: Cognito Default (no SES required)"
echo "   ✅ Auto-verified attributes: email"
echo "   ✅ Verification method: Email with code"
echo "   ✅ OAuth flows: Authorization code"
echo "   ✅ OAuth scopes: openid, email, phone"
echo ""
echo "🔄 Please refresh your browser and try signing up again."
echo ""
echo "⚠️  Note: If you want custom email templates or higher sending limits,"
echo "    you'll need to configure Amazon SES separately."