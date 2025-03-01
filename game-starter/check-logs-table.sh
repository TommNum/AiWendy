#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}      AiWendy Logs Table Check              ${NC}"
echo -e "${GREEN}============================================${NC}"

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null
then
    echo -e "${RED}Railway CLI not found. Installing...${NC}"
    npm install -g @railway/cli
    
    if [ $? -ne 0 ]; then
        echo -e "${RED}Failed to install Railway CLI. Please install it manually.${NC}"
        exit 1
    fi
fi

# Check if user is logged in to Railway
echo -e "${YELLOW}Checking Railway login status...${NC}"
railway whoami &> /dev/null

if [ $? -ne 0 ]; then
    echo -e "${YELLOW}Not logged in. Please login to Railway.${NC}"
    railway login
    
    if [ $? -ne 0 ]; then
        echo -e "${RED}Failed to login to Railway.${NC}"
        exit 1
    fi
fi

echo -e "${GREEN}Successfully logged in to Railway.${NC}"

echo -e "${YELLOW}Checking database for logs table...${NC}"

# Check if logs table exists
echo -e "${YELLOW}Checking if logs table exists...${NC}"
railway connect Postgres

echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}      Check Complete!                       ${NC}"
echo -e "${GREEN}============================================${NC}"

exit 0 