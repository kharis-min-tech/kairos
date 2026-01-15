#!/bin/bash

# KCMS Complete Automated Setup Script
# Run this on any laptop to get the app working

set -e

echo "========================================="
echo "KCMS Complete Setup"
echo "========================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Step 1: Check Node.js
echo -e "${YELLOW}Step 1: Checking Node.js...${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed${NC}"
    echo "Please install Node.js from https://nodejs.org"
    exit 1
fi
NODE_VERSION=$(node -v)
echo -e "${GREEN}✓ Node.js installed: $NODE_VERSION${NC}"
echo ""

# Step 2: Install dependencies
echo -e "${YELLOW}Step 2: Installing dependencies...${NC}"
npm install
echo -e "${GREEN}✓ Dependencies installed${NC}"
echo ""

# Step 3: Setup environment file
echo -e "${YELLOW}Step 3: Setting up environment configuration...${NC}"
if [ ! -f .env.local ]; then
    cat > .env.local << 'EOF'
# Cognito Configuration
NEXT_PUBLIC_COGNITO_USER_POOL_ID=eu-north-1_OM97wjySK
NEXT_PUBLIC_COGNITO_CLIENT_ID=7mqmc57sb18ideegj293pk81ib
NEXT_PUBLIC_COGNITO_REGION=eu-north-1
NEXT_PUBLIC_COGNITO_DOMAIN=https://eu-north-1om97wjysk.auth.eu-north-1.amazoncognito.com
NEXT_PUBLIC_COGNITO_AUTHORITY=https://cognito-idp.eu-north-1.amazonaws.com/eu-north-1_OM97wjySK
EOF
    echo -e "${GREEN}✓ Created .env.local${NC}"
else
    echo -e "${GREEN}✓ .env.local already exists${NC}"
fi
echo ""

# Step 4: Update Cognito URLs (if AWS CLI is available)
echo -e "${YELLOW}Step 4: Checking AWS CLI for Cognito update...${NC}"
if command -v aws &> /dev/null; then
    if aws sts get-caller-identity > /dev/null 2>&1; then
        echo -e "${GREEN}✓ AWS CLI configured${NC}"
        echo "Updating Cognito callback URLs..."
        
        aws cognito-idp update-user-pool-client \
          --user-pool-id eu-north-1_OM97wjySK \
          --client-id 7mqmc57sb18ideegj293pk81ib \
          --region eu-north-1 \
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
            echo -e "${GREEN}✓ Cognito URLs updated${NC}"
        else
            echo -e "${YELLOW}⚠ Could not update Cognito (may need permissions)${NC}"
        fi
    else
        echo -e "${YELLOW}⚠ AWS CLI not configured (skipping Cognito update)${NC}"
        echo "  Run 'aws configure' if you have AWS credentials"
    fi
else
    echo -e "${YELLOW}⚠ AWS CLI not installed (skipping Cognito update)${NC}"
    echo "  The app will still work if Cognito is already configured"
fi
echo ""

# Step 5: Start development server
echo -e "${YELLOW}Step 5: Starting development server...${NC}"
echo ""
echo "========================================="
echo -e "${GREEN}✅ Setup Complete!${NC}"
echo "========================================="
echo ""
echo "The development server will start now."
echo "Open your browser to: http://localhost:3001"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""
echo "========================================="
echo ""

npm run dev
