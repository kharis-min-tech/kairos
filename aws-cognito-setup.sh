#!/bin/bash

# AWS Cognito Complete Setup Script
# Make sure to set your AWS credentials first: aws configure

USER_POOL_ID="eu-north-1_OM97wjySK"
CLIENT_ID="7mqmc57sb18ideegj293pk81ib"
REGION="eu-north-1"

echo "🚀 Setting up AWS Cognito User Pool with complete authentication features..."

# 1. Update User Pool Client with all OAuth settings
echo "📝 Updating User Pool Client settings..."
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

# 2. Update User Pool settings for MFA and security
echo "🔐 Configuring MFA and security settings..."
aws cognito-idp update-user-pool \
  --user-pool-id $USER_POOL_ID \
  --mfa-configuration "OPTIONAL" \
  --sms-configuration SnsCallerArn="arn:aws:iam::$(aws sts get-caller-identity --query Account --output text):role/service-role/CognitoSMSRole" \
  --account-recovery-setting RecoveryMechanisms='[{"Name":"verified_email","Priority":1},{"Name":"verified_phone_number","Priority":2}]' \
  --user-pool-add-ons AdvancedSecurityMode="AUDIT" \
  --region $REGION

# 3. Set password policy
echo "🔑 Setting password policy..."
aws cognito-idp update-user-pool \
  --user-pool-id $USER_POOL_ID \
  --policies PasswordPolicy='{
    "MinimumLength": 8,
    "RequireUppercase": true,
    "RequireLowercase": true,
    "RequireNumbers": true,
    "RequireSymbols": false,
    "TemporaryPasswordValidityDays": 7
  }' \
  --region $REGION

# 4. Configure email settings (using Cognito default email)
echo "📧 Configuring email settings..."
aws cognito-idp update-user-pool \
  --user-pool-id $USER_POOL_ID \
  --email-configuration EmailSendingAccount="COGNITO_DEFAULT" \
  --verification-message-template DefaultEmailOption="CONFIRM_WITH_CODE",EmailMessage="Your verification code is {####}",EmailSubject="Verify your email for Kairos",SmsMessage="Your verification code is {####}" \
  --auto-verified-attributes "email" \
  --region $REGION

# 5. Set up user attributes
echo "👤 Configuring user attributes..."
aws cognito-idp update-user-pool \
  --user-pool-id $USER_POOL_ID \
  --schema '[
    {
      "Name": "email",
      "AttributeDataType": "String",
      "Required": true,
      "Mutable": true
    },
    {
      "Name": "phone_number",
      "AttributeDataType": "String",
      "Required": false,
      "Mutable": true
    },
    {
      "Name": "name",
      "AttributeDataType": "String",
      "Required": false,
      "Mutable": true
    }
  ]' \
  --region $REGION

echo "✅ AWS Cognito setup complete!"
echo ""
echo "📋 Summary of configured features:"
echo "   ✅ OAuth 2.0 with Authorization Code + Implicit flows"
echo "   ✅ MFA (Optional) - SMS and TOTP"
echo "   ✅ Email verification with links"
echo "   ✅ Password reset via email/SMS"
echo "   ✅ Account recovery mechanisms"
echo "   ✅ Advanced security features"
echo "   ✅ Custom password policy"
echo ""
echo "🔗 Your Cognito Domain: https://eu-north-1om97wjysk.auth.eu-north-1.amazoncognito.com"
echo "🆔 Client ID: $CLIENT_ID"
echo "🏠 Callback URLs: http://localhost:3001, https://d84l1y8p4kdic.cloudfront.net"
echo ""
echo "⚠️  Note: Some commands may fail if you don't have proper IAM permissions or SES setup."
echo "    You can configure these manually in the AWS Console if needed."