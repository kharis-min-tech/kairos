#!/bin/bash

# KCMS Infrastructure Deployment Script
# Usage: ./deploy.sh [dev|staging|prod]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default environment
ENVIRONMENT=${1:-dev}

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}KCMS Infrastructure Deployment${NC}"
echo -e "${GREEN}Environment: ${ENVIRONMENT}${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(dev|staging|prod)$ ]]; then
    echo -e "${RED}Error: Invalid environment '${ENVIRONMENT}'${NC}"
    echo "Usage: ./deploy.sh [dev|staging|prod]"
    exit 1
fi

# Check AWS credentials
echo -e "${YELLOW}Checking AWS credentials...${NC}"
if ! aws sts get-caller-identity > /dev/null 2>&1; then
    echo -e "${RED}Error: AWS credentials not configured${NC}"
    echo "Run: aws configure"
    exit 1
fi

ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
REGION=${AWS_REGION:-eu-north-1}

echo -e "${GREEN}✓ AWS Account: ${ACCOUNT_ID}${NC}"
echo -e "${GREEN}✓ Region: ${REGION}${NC}"
echo ""

# Check if CDK is bootstrapped
echo -e "${YELLOW}Checking CDK bootstrap...${NC}"
if ! aws cloudformation describe-stacks --stack-name CDKToolkit --region $REGION > /dev/null 2>&1; then
    echo -e "${YELLOW}CDK not bootstrapped. Bootstrapping now...${NC}"
    cdk bootstrap aws://${ACCOUNT_ID}/${REGION}
else
    echo -e "${GREEN}✓ CDK already bootstrapped${NC}"
fi
echo ""

# Install dependencies
echo -e "${YELLOW}Installing dependencies...${NC}"
npm install
echo -e "${GREEN}✓ Dependencies installed${NC}"
echo ""

# Build TypeScript
echo -e "${YELLOW}Building TypeScript...${NC}"
npm run build
echo -e "${GREEN}✓ Build complete${NC}"
echo ""

# Synthesize CloudFormation templates
echo -e "${YELLOW}Synthesizing CloudFormation templates...${NC}"
ENVIRONMENT=$ENVIRONMENT npm run synth
echo -e "${GREEN}✓ Synthesis complete${NC}"
echo ""

# Show diff
echo -e "${YELLOW}Showing changes...${NC}"
ENVIRONMENT=$ENVIRONMENT npm run diff || true
echo ""

# Confirm deployment
if [[ "$ENVIRONMENT" == "prod" ]]; then
    echo -e "${RED}WARNING: You are about to deploy to PRODUCTION!${NC}"
    read -p "Are you sure you want to continue? (yes/no): " -r
    echo
    if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
        echo -e "${YELLOW}Deployment cancelled${NC}"
        exit 0
    fi
else
    read -p "Deploy to ${ENVIRONMENT}? (y/n): " -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}Deployment cancelled${NC}"
        exit 0
    fi
fi

# Deploy
echo -e "${YELLOW}Deploying stacks...${NC}"
ENVIRONMENT=$ENVIRONMENT cdk deploy --all --require-approval never

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Deployment Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Get outputs
echo -e "${YELLOW}Stack Outputs:${NC}"
echo ""
aws cloudformation describe-stacks \
    --stack-name KcmsAuthStack-${ENVIRONMENT} \
    --query 'Stacks[0].Outputs[*].[OutputKey,OutputValue]' \
    --output table

echo ""
echo -e "${GREEN}Next Steps:${NC}"
echo "1. Update frontend .env.local with the outputs above"
echo "2. Build frontend: cd ../apps && npm run build"
echo "3. Deploy frontend to S3 (see README.md)"
echo ""
