#!/bin/bash

# Diagnostic script for Cognito confirmation code delivery issues
# This script helps identify what's causing the delivery problems

USER_POOL_ID="eu-north-1_OM97wjySK"
CLIENT_ID="7mqmc57sb18ideegj293pk81ib"
REGION="eu-north-1"

echo "🔍 Diagnosing Cognito confirmation code delivery issues..."
echo "=================================================="
echo ""

echo "📋 1. User Pool Basic Information:"
aws cognito-idp describe-user-pool \
  --user-pool-id $USER_POOL_ID \
  --region $REGION \
  --query 'UserPool.{
    Name:Name,
    Status:Status,
    CreationDate:CreationDate,
    LastModifiedDate:LastModifiedDate
  }' \
  --output table

echo ""
echo "📧 2. Email Configuration:"
EMAIL_CONFIG=$(aws cognito-idp describe-user-pool \
  --user-pool-id $USER_POOL_ID \
  --region $REGION \
  --query 'UserPool.EmailConfiguration' \
  --output json)

echo "$EMAIL_CONFIG" | jq '.'

if echo "$EMAIL_CONFIG" | jq -e '.EmailSendingAccount' > /dev/null; then
    SENDING_ACCOUNT=$(echo "$EMAIL_CONFIG" | jq -r '.EmailSendingAccount')
    echo "✅ Email sending account: $SENDING_ACCOUNT"
    
    if [ "$SENDING_ACCOUNT" = "COGNITO_DEFAULT" ]; then
        echo "✅ Using Cognito default email (good for testing)"
    elif [ "$SENDING_ACCOUNT" = "DEVELOPER" ]; then
        echo "⚠️  Using SES - make sure SES is configured properly"
        SES_ARN=$(echo "$EMAIL_CONFIG" | jq -r '.SourceArn // "Not configured"')
        echo "   SES Source ARN: $SES_ARN"
    fi
else
    echo "❌ No email configuration found!"
fi

echo ""
echo "🔐 3. Auto-Verification Settings:"
aws cognito-idp describe-user-pool \
  --user-pool-id $USER_POOL_ID \
  --region $REGION \
  --query 'UserPool.{
    AutoVerifiedAttributes:AutoVerifiedAttributes,
    UsernameAttributes:UsernameAttributes,
    AliasAttributes:AliasAttributes
  }' \
  --output table

echo ""
echo "📝 4. Verification Message Template:"
aws cognito-idp describe-user-pool \
  --user-pool-id $USER_POOL_ID \
  --region $REGION \
  --query 'UserPool.VerificationMessageTemplate' \
  --output json | jq '.'

echo ""
echo "🔧 5. User Pool Client Configuration:"
aws cognito-idp describe-user-pool-client \
  --user-pool-id $USER_POOL_ID \
  --client-id $CLIENT_ID \
  --region $REGION \
  --query 'UserPoolClient.{
    ClientName:ClientName,
    ExplicitAuthFlows:ExplicitAuthFlows,
    SupportedIdentityProviders:SupportedIdentityProviders,
    CallbackURLs:CallbackURLs,
    LogoutURLs:LogoutURLs,
    AllowedOAuthFlows:AllowedOAuthFlows,
    AllowedOAuthScopes:AllowedOAuthScopes,
    GenerateSecret:GenerateSecret
  }' \
  --output json | jq '.'

echo ""
echo "🌐 6. User Pool Domain Status:"
DOMAIN_STATUS=$(aws cognito-idp describe-user-pool-domain \
  --domain "eu-north-1om97wjysk" \
  --region $REGION 2>/dev/null)

if [ $? -eq 0 ]; then
    echo "✅ Domain is configured:"
    echo "$DOMAIN_STATUS" | jq '.DomainDescription.{Status:Status,CloudFrontDistribution:CloudFrontDistribution}'
else
    echo "❌ Domain is not configured or not found"
fi

echo ""
echo "📊 7. Recent CloudWatch Logs (if available):"
LOG_GROUPS=$(aws logs describe-log-groups \
  --log-group-name-prefix "/aws/cognito" \
  --region $REGION \
  --query 'logGroups[].logGroupName' \
  --output text 2>/dev/null)

if [ -n "$LOG_GROUPS" ]; then
    echo "Found log groups: $LOG_GROUPS"
    for LOG_GROUP in $LOG_GROUPS; do
        echo "Recent events in $LOG_GROUP:"
        aws logs describe-log-streams \
          --log-group-name "$LOG_GROUP" \
          --region $REGION \
          --order-by LastEventTime \
          --descending \
          --max-items 3 \
          --query 'logStreams[].{StreamName:logStreamName,LastEvent:lastEventTime}' \
          --output table 2>/dev/null || echo "No recent events"
    done
else
    echo "No Cognito CloudWatch logs found"
fi

echo ""
echo "🔍 8. AWS Account Email Sending Status:"
SES_SENDING_QUOTA=$(aws ses get-send-quota --region $REGION 2>/dev/null)
if [ $? -eq 0 ]; then
    echo "✅ SES is available in this region:"
    echo "$SES_SENDING_QUOTA" | jq '.'
else
    echo "⚠️  SES not configured or not available in $REGION"
fi

echo ""
echo "=================================================="
echo "🔍 DIAGNOSIS SUMMARY:"
echo "=================================================="

# Check for common issues
echo ""
echo "🚨 Common Issues to Check:"

# Check email configuration
if echo "$EMAIL_CONFIG" | jq -e '.EmailSendingAccount' > /dev/null; then
    echo "✅ Email configuration exists"
else
    echo "❌ ISSUE: No email configuration - this is likely the problem!"
fi

# Check auto-verified attributes
AUTO_VERIFIED=$(aws cognito-idp describe-user-pool \
  --user-pool-id $USER_POOL_ID \
  --region $REGION \
  --query 'UserPool.AutoVerifiedAttributes' \
  --output json)

if echo "$AUTO_VERIFIED" | jq -e '.[] | select(. == "email")' > /dev/null; then
    echo "✅ Email auto-verification is enabled"
else
    echo "❌ ISSUE: Email auto-verification is not enabled!"
fi

# Check verification template
TEMPLATE=$(aws cognito-idp describe-user-pool \
  --user-pool-id $USER_POOL_ID \
  --region $REGION \
  --query 'UserPool.VerificationMessageTemplate.DefaultEmailOption' \
  --output text)

if [ "$TEMPLATE" = "CONFIRM_WITH_CODE" ]; then
    echo "✅ Verification template is set to CONFIRM_WITH_CODE"
else
    echo "⚠️  Verification template: $TEMPLATE (should be CONFIRM_WITH_CODE)"
fi

echo ""
echo "🔧 RECOMMENDED ACTIONS:"
echo "1. Run: ./fix-cognito-confirmation-delivery.sh"
echo "2. Clear browser cache and cookies"
echo "3. Try signing up with a valid email address"
echo "4. Check email spam/junk folder"
echo "5. If still failing, check AWS account email sending limits"
echo ""
echo "📞 For further help, check AWS Cognito console or contact AWS support"