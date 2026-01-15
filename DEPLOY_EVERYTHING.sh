#!/bin/bash

# KCMS Master Deployment Script
# This script does EVERYTHING needed to deploy the infrastructure

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo ""
echo -e "${BLUE}=========================================${NC}"
echo -e "${BLUE}   KCMS COMPLETE DEPLOYMENT${NC}"
echo -e "${BLUE}=========================================${NC}"
echo ""

# Step 1: Check AWS CLI
echo -e "${YELLOW}[1/8] Checking AWS CLI...${NC}"
if ! command -v aws &> /dev/null; then
    echo -e "${RED}❌ AWS CLI is not installed${NC}"
    echo ""
    echo "Install AWS CLI:"
    echo "  macOS:   brew install awscli"
    echo "  Linux:   curl 'https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip' -o 'awscliv2.zip' && unzip awscliv2.zip && sudo ./aws/install"
    echo "  Windows: Download from https://aws.amazon.com/cli/"
    echo ""
    exit 1
fi
echo -e "${GREEN}✓ AWS CLI installed${NC}"
echo ""

# Step 2: Check AWS credentials
echo -e "${YELLOW}[2/8] Checking AWS credentials...${NC}"
if ! aws sts get-caller-identity > /dev/null 2>&1; then
    echo -e "${RED}❌ AWS credentials not configured${NC}"
    echo ""
    echo "Configure AWS credentials:"
    echo "  aws configure"
    echo ""
    echo "You'll need:"
    echo "  - AWS Access Key ID"
    echo "  - AWS Secret Access Key"
    echo "  - Default region: eu-north-1"
    echo ""
    exit 1
fi

ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
REGION=${AWS_REGION:-eu-north-1}
echo -e "${GREEN}✓ AWS Account: $ACCOUNT_ID${NC}"
echo -e "${GREEN}✓ Region: $REGION${NC}"
echo ""

# Step 3: Check CDK CLI
echo -e "${YELLOW}[3/8] Checking AWS CDK CLI...${NC}"
if ! command -v cdk &> /dev/null; then
    echo -e "${YELLOW}⚠ CDK CLI not installed. Installing...${NC}"
    npm install -g aws-cdk
    echo -e "${GREEN}✓ CDK CLI installed${NC}"
else
    CDK_VERSION=$(cdk --version)
    echo -e "${GREEN}✓ CDK CLI installed: $CDK_VERSION${NC}"
fi
echo ""

# Step 4: Install infrastructure dependencies
echo -e "${YELLOW}[4/8] Installing infrastructure dependencies...${NC}"
cd infrastructure
npm install
echo -e "${GREEN}✓ Infrastructure dependencies installed${NC}"
echo ""

# Step 5: Bootstrap CDK (if needed)
echo -e "${YELLOW}[5/8] Checking CDK bootstrap...${NC}"
if ! aws cloudformation describe-stacks --stack-name CDKToolkit --region $REGION > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠ CDK not bootstrapped. Bootstrapping now...${NC}"
    cdk bootstrap aws://${ACCOUNT_ID}/${REGION}
    echo -e "${GREEN}✓ CDK bootstrapped${NC}"
else
    echo -e "${GREEN}✓ CDK already bootstrapped${NC}"
fi
echo ""

# Step 6: Build and synthesize
echo -e "${YELLOW}[6/8] Building and synthesizing CDK stacks...${NC}"
npm run build
ENVIRONMENT=dev npm run synth > /dev/null 2>&1
echo -e "${GREEN}✓ CDK stacks synthesized${NC}"
echo ""

# Step 7: Deploy infrastructure
echo -e "${YELLOW}[7/8] Deploying infrastructure to AWS...${NC}"
echo ""
echo -e "${BLUE}This will create:${NC}"
echo "  - Cognito User Pool with auto-confirmation"
echo "  - Lambda function for user auto-confirmation"
echo "  - S3 bucket for frontend hosting"
echo "  - CloudFront distribution for CDN"
echo ""
read -p "Continue with deployment? (y/n): " -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Deployment cancelled${NC}"
    exit 0
fi

ENVIRONMENT=dev cdk deploy --all --require-approval never

echo -e "${GREEN}✓ Infrastructure deployed${NC}"
echo ""

# Step 8: Get outputs and update frontend
echo -e "${YELLOW}[8/8] Configuring frontend...${NC}"

USER_POOL_ID=$(aws cloudformation describe-stacks \
    --stack-name KcmsAuthStack-dev \
    --query 'Stacks[0].Outputs[?OutputKey==`UserPoolId`].OutputValue' \
    --output text 2>/dev/null)

CLIENT_ID=$(aws cloudformation describe-stacks \
    --stack-name KcmsAuthStack-dev \
    --query 'Stacks[0].Outputs[?OutputKey==`UserPoolClientId`].OutputValue' \
    --output text 2>/dev/null)

DOMAIN_URL=$(aws cloudformation describe-stacks \
    --stack-name KcmsAuthStack-dev \
    --query 'Stacks[0].Outputs[?OutputKey==`CognitoDomainUrl`].OutputValue' \
    --output text 2>/dev/null)

AUTHORITY_URL=$(aws cloudformation describe-stacks \
    --stack-name KcmsAuthStack-dev \
    --query 'Stacks[0].Outputs[?OutputKey==`AuthorityUrl`].OutputValue' \
    --output text 2>/dev/null)

cd ..

# Create .env.local
cat > .env.local << EOF
# Cognito Configuration (Auto-generated from CDK deployment)
NEXT_PUBLIC_COGNITO_USER_POOL_ID=$USER_POOL_ID
NEXT_PUBLIC_COGNITO_CLIENT_ID=$CLIENT_ID
NEXT_PUBLIC_COGNITO_REGION=$REGION
NEXT_PUBLIC_COGNITO_DOMAIN=$DOMAIN_URL
NEXT_PUBLIC_COGNITO_AUTHORITY=$AUTHORITY_URL
EOF

echo -e "${GREEN}✓ Frontend configured${NC}"
echo ""

# Install frontend dependencies
echo "Installing frontend dependencies..."
npm install > /dev/null 2>&1
echo -e "${GREEN}✓ Frontend dependencies installed${NC}"
echo ""

# Success summary
echo ""
echo -e "${BLUE}=========================================${NC}"
echo -e "${GREEN}✅ DEPLOYMENT COMPLETE!${NC}"
echo -e "${BLUE}=========================================${NC}"
echo ""
echo -e "${GREEN}Infrastructure Details:${NC}"
echo "  User Pool ID:  $USER_POOL_ID"
echo "  Client ID:     $CLIENT_ID"
echo "  Region:        $REGION"
echo "  Domain:        $DOMAIN_URL"
echo ""
echo -e "${GREEN}Next Steps:${NC}"
echo "  1. Start the development server:"
echo "     ${BLUE}npm run dev${NC}"
echo ""
echo "  2. Open your browser:"
echo "     ${BLUE}http://localhost:3001${NC}"
echo ""
echo "  3. Test authentication:"
echo "     - Sign up with a new account"
echo "     - Sign in"
echo "     - Access the dashboard"
echo ""
echo -e "${GREEN}Configuration saved to:${NC}"
echo "  .env.local"
echo ""
echo -e "${YELLOW}To share with team members:${NC}"
echo "  1. Commit and push changes"
echo "  2. Team members run: ./COMPLETE_SETUP.sh"
echo ""
echo -e "${BLUE}=========================================${NC}"
echo ""
