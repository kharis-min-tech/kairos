#!/bin/bash

# Fix AWS Cognito "Something went wrong" error
# This updates the Cognito configuration to match our application

USER_POOL_ID="eu-north-1_OM97wjySK"
CLIENT_ID="7mqmc57sb18ideegj293pk81ib"
REGION="eu-north-1"

echo "🔧 Fixing AWS Cognito 'Something went wrong' error..."
echo ""

echo "📋 Current configuration check:"
aws cognito-idp describe-user-pool-client \
  --user-pool-id $USER_POOL_ID \
  --client-id $CLIENT_ID \
  --region $REGION \
  --query 'UserPoolClient.{CallbackURLs:CallbackURLs,LogoutURLs:LogoutURLs,AllowedOAuthFlows:AllowedOAuthFlows,AllowedOAuthScopes:AllowedOAuthScopes}' \
  --output table

echo ""
echo "🔧 Updating User Pool Client with correct settings..."

# Update with the exact configuration that should work
aws cognito-idp update-user-pool-client \
  --user-pool-id $USER_POOL_ID \
  --client-id $CLIENT_ID \
  --callback-urls "http://localhost:3001/dashboard" \
  --logout-urls "http://localhost:3001" \
  --allowed-o-auth-flows "code" \
  --allowed-o-auth-scopes "openid" "email" "phone" \
  --allowed-o-auth-flows-user-pool-client \
  --supported-identity-providers "COGNITO" \
  --explicit-auth-flows "ALLOW_USER_SRP_AUTH" "ALLOW_REFRESH_TOKEN_AUTH" "ALLOW_USER_PASSWORD_AUTH" \
  --region $REGION

echo ""
echo "🔧 Ensuring User Pool has proper email configuration..."

# Make sure email delivery is configured
aws cognito-idp update-user-pool \
  --user-pool-id $USER_POOL_ID \
  --email-configuration EmailSendingAccount="COGNITO_DEFAULT" \
  --auto-verified-attributes "email" \
  --region $REGION

echo ""
echo "✅ Configuration updated!"
echo ""
echo "📋 Updated configuration:"
aws cognito-idp describe-user-pool-client \
  --user-pool-id $USER_POOL_ID \
  --client-id $CLIENT_ID \
  --region $REGION \
  --query 'UserPoolClient.{CallbackURLs:CallbackURLs,LogoutURLs:LogoutURLs,AllowedOAuthFlows:AllowedOAuthFlows,AllowedOAuthScopes:AllowedOAuthScopes}' \
  --output table

echo ""
echo "🔄 Please try the authentication flow again:"
echo "   1. Go to http://localhost:3001"
echo "   2. Click 'Sign In' or 'Create Account'"
echo "   3. You should be redirected to Cognito without errors"
echo ""
echo "⚠️  If you still get errors, check:"
echo "   - Your Cognito domain is correct: https://eu-north-1om97wjysk.auth.eu-north-1.amazoncognito.com"
echo "   - The User Pool ID and Client ID are correct"
echo "   - Your AWS credentials have proper permissions"