#!/bin/bash

# KCMS Infrastructure Destroy Script
# Usage: ./destroy.sh [dev|staging|prod]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default environment
ENVIRONMENT=${1:-dev}

echo -e "${RED}========================================${NC}"
echo -e "${RED}KCMS Infrastructure Destroy${NC}"
echo -e "${RED}Environment: ${ENVIRONMENT}${NC}"
echo -e "${RED}========================================${NC}"
echo ""

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(dev|staging|prod)$ ]]; then
    echo -e "${RED}Error: Invalid environment '${ENVIRONMENT}'${NC}"
    echo "Usage: ./destroy.sh [dev|staging|prod]"
    exit 1
fi

# Extra confirmation for production
if [[ "$ENVIRONMENT" == "prod" ]]; then
    echo -e "${RED}⚠️  WARNING: You are about to DESTROY PRODUCTION resources!${NC}"
    echo -e "${RED}This action CANNOT be undone!${NC}"
    echo ""
    read -p "Type 'DELETE PRODUCTION' to confirm: " -r
    echo
    if [[ "$REPLY" != "DELETE PRODUCTION" ]]; then
        echo -e "${YELLOW}Destroy cancelled${NC}"
        exit 0
    fi
else
    echo -e "${YELLOW}This will destroy all ${ENVIRONMENT} resources.${NC}"
    read -p "Are you sure? (yes/no): " -r
    echo
    if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
        echo -e "${YELLOW}Destroy cancelled${NC}"
        exit 0
    fi
fi

# Check AWS credentials
echo -e "${YELLOW}Checking AWS credentials...${NC}"
if ! aws sts get-caller-identity > /dev/null 2>&1; then
    echo -e "${RED}Error: AWS credentials not configured${NC}"
    exit 1
fi

echo -e "${GREEN}✓ AWS credentials verified${NC}"
echo ""

# Destroy stacks
echo -e "${YELLOW}Destroying stacks...${NC}"
ENVIRONMENT=$ENVIRONMENT cdk destroy --all --force

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Destroy Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
