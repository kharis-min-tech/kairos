#!/bin/bash

# Quick fix for Cognito scope error
# Run this to fix the invalid_scope error

USER_POOL_ID="eu-north-1_OM97wjySK"
CLIENT_ID="7mqmc57sb18ideegj293pk81ib"
REGION="eu-north-1"

echo "🔧 Fixing Cognito OAuth scopes..."

# Update User Pool Client with correct scopes
aws cognito-idp update-user-pool-client \
  --user-pool-id $USER_POOL_ID \
  --client-id $CLIENT_ID \
  --callback-urls "http://localhost:3001/dashboard" "https://d84l1y8p4kdic.cloudfront.net/dashboard" \
  --logout-urls "http://localhost:3001" "https://d84l1y8p4kdic.cloudfront.net" \
  --allowed-o-auth-flows "code" \
  --allowed-o-auth-scopes "openid" "email" "phone" \
  --allowed-o-auth-flows-user-pool-client \
  --supported-identity-providers "COGNITO" \
  --region $REGION

echo "✅ Cognito scopes fixed!"
echo "🔄 Please refresh your browser and try again."