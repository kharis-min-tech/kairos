#!/bin/bash

# Get CDK Stack Outputs
# Usage: ./get-outputs.sh [dev|staging|prod]

set -e

ENVIRONMENT=${1:-dev}

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(dev|staging|prod)$ ]]; then
    echo "Error: Invalid environment '${ENVIRONMENT}'"
    echo "Usage: ./get-outputs.sh [dev|staging|prod]"
    exit 1
fi

echo "========================================="
echo "KCMS Stack Outputs (${ENVIRONMENT})"
echo "========================================="
echo ""

# Auth Stack Outputs
echo "Authentication Stack:"
echo "---------------------"
aws cloudformation describe-stacks \
    --stack-name KcmsAuthStack-${ENVIRONMENT} \
    --query 'Stacks[0].Outputs[*].[OutputKey,OutputValue]' \
    --output table 2>/dev/null || echo "Stack not found"

echo ""

# Frontend Stack Outputs
echo "Frontend Stack:"
echo "---------------"
aws cloudformation describe-stacks \
    --stack-name KcmsFrontendStack-${ENVIRONMENT} \
    --query 'Stacks[0].Outputs[*].[OutputKey,OutputValue]' \
    --output table 2>/dev/null || echo "Stack not found"

echo ""
echo "========================================="
echo "Environment Variables for .env.local:"
echo "========================================="

USER_POOL_ID=$(aws cloudformation describe-stacks \
    --stack-name KcmsAuthStack-${ENVIRONMENT} \
    --query 'Stacks[0].Outputs[?OutputKey==`UserPoolId`].OutputValue' \
    --output text 2>/dev/null)

CLIENT_ID=$(aws cloudformation describe-stacks \
    --stack-name KcmsAuthStack-${ENVIRONMENT} \
    --query 'Stacks[0].Outputs[?OutputKey==`UserPoolClientId`].OutputValue' \
    --output text 2>/dev/null)

DOMAIN_URL=$(aws cloudformation describe-stacks \
    --stack-name KcmsAuthStack-${ENVIRONMENT} \
    --query 'Stacks[0].Outputs[?OutputKey==`CognitoDomainUrl`].OutputValue' \
    --output text 2>/dev/null)

REGION=${AWS_REGION:-eu-north-1}

if [ -n "$USER_POOL_ID" ]; then
    echo ""
    echo "NEXT_PUBLIC_COGNITO_USER_POOL_ID=${USER_POOL_ID}"
    echo "NEXT_PUBLIC_COGNITO_CLIENT_ID=${CLIENT_ID}"
    echo "NEXT_PUBLIC_COGNITO_REGION=${REGION}"
    echo "NEXT_PUBLIC_COGNITO_DOMAIN=${DOMAIN_URL}"
    echo ""
else
    echo "No outputs found. Deploy the stack first."
fi
