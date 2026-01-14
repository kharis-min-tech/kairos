#!/bin/bash

# Update Cognito User Pool Client Callback URLs
# This allows the app to work from multiple devices/laptops

USER_POOL_ID="eu-north-1_OM97wjySK"
CLIENT_ID="7mqmc57sb18ideegj293pk81ib"
REGION="eu-north-1"

echo "========================================="
echo "Updating Cognito Callback URLs"
echo "========================================="
echo ""
echo "User Pool: $USER_POOL_ID"
echo "Client ID: $CLIENT_ID"
echo "Region: $REGION"
echo ""

# Check if AWS CLI is configured
if ! aws sts get-caller-identity > /dev/null 2>&1; then
    echo "❌ Error: AWS CLI not configured"
    echo "Run: aws configure"
    exit 1
fi

echo "✓ AWS credentials verified"
echo ""

# Update the user pool client
echo "Updating callback URLs..."
aws cognito-idp update-user-pool-client \
  --user-pool-id $USER_POOL_ID \
  --client-id $CLIENT_ID \
  --region $REGION \
  --callback-urls \
    "http://localhost:3001/dashboard" \
    "http://localhost:3001" \
    "http://127.0.0.1:3001/dashboard" \
    "http://127.0.0.1:3001" \
  --logout-urls \
    "http://localhost:3001" \
    "http://127.0.0.1:3001" \
  --allowed-o-auth-flows "code" \
  --allowed-o-auth-scopes "openid" "email" "phone" "profile" \
  --allowed-o-auth-flows-user-pool-client \
  --supported-identity-providers "COGNITO" \
  > /dev/null 2>&1

if [ $? -eq 0 ]; then
    echo ""
    echo "========================================="
    echo "✅ Success!"
    echo "========================================="
    echo ""
    echo "Callback URLs updated to:"
    echo "  - http://localhost:3001/dashboard"
    echo "  - http://localhost:3001"
    echo "  - http://127.0.0.1:3001/dashboard"
    echo "  - http://127.0.0.1:3001"
    echo ""
    echo "Logout URLs updated to:"
    echo "  - http://localhost:3001"
    echo "  - http://127.0.0.1:3001"
    echo ""
    echo "You can now log in from any laptop! 🎉"
    echo ""
else
    echo ""
    echo "❌ Error updating Cognito"
    echo "Check your AWS permissions and try again"
    exit 1
fi
