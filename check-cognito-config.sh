#!/bin/bash

# Check current Cognito configuration to diagnose issues

USER_POOL_ID="eu-north-1_OM97wjySK"
CLIENT_ID="7mqmc57sb18ideegj293pk81ib"
REGION="eu-north-1"

echo "🔍 Checking Cognito User Pool configuration..."
echo ""

echo "📋 User Pool Settings:"
aws cognito-idp describe-user-pool \
  --user-pool-id $USER_POOL_ID \
  --region $REGION \
  --query 'UserPool.{
    Name:Name,
    EmailConfiguration:EmailConfiguration,
    SmsConfiguration:SmsConfiguration,
    AutoVerifiedAttributes:AutoVerifiedAttributes,
    VerificationMessageTemplate:VerificationMessageTemplate,
    MfaConfiguration:MfaConfiguration,
    Policies:Policies
  }' \
  --output table

echo ""
echo "📋 User Pool Client Settings:"
aws cognito-idp describe-user-pool-client \
  --user-pool-id $USER_POOL_ID \
  --client-id $CLIENT_ID \
  --region $REGION \
  --query 'UserPoolClient.{
    ClientName:ClientName,
    CallbackURLs:CallbackURLs,
    LogoutURLs:LogoutURLs,
    AllowedOAuthFlows:AllowedOAuthFlows,
    AllowedOAuthScopes:AllowedOAuthScopes,
    SupportedIdentityProviders:SupportedIdentityProviders,
    ExplicitAuthFlows:ExplicitAuthFlows
  }' \
  --output table

echo ""
echo "🔍 Diagnosis:"
echo "   - Check if EmailConfiguration is set"
echo "   - Check if AutoVerifiedAttributes includes 'email'"
echo "   - Check if AllowedOAuthScopes includes required scopes"
echo "   - Check if CallbackURLs includes your local URL"