#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}      AiWendy Database Log Viewer           ${NC}"
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

# Check if we're logged in to Railway
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

echo -e "${YELLOW}Connecting to PostgreSQL database...${NC}"
echo -e "${YELLOW}Once connected, you can run these queries:${NC}"
echo -e "${BLUE}1) SELECT * FROM logs ORDER BY timestamp DESC LIMIT 100;${NC} (Recent logs)"
echo -e "${BLUE}2) SELECT * FROM logs WHERE level = 'error' ORDER BY timestamp DESC LIMIT 50;${NC} (Error logs)"
echo -e "${BLUE}3) SELECT * FROM logs WHERE source = 'tweet-worker' ORDER BY timestamp DESC LIMIT 50;${NC} (Tweet worker logs)"
echo -e "${BLUE}4) SELECT * FROM logs WHERE message LIKE '%Starting%' OR message LIKE '%initializ%' ORDER BY timestamp DESC LIMIT 20;${NC} (Startup logs)"
echo -e "${YELLOW}Type '\\q' to exit when done.${NC}"
echo

# Connect directly to PostgreSQL
railway connect Postgres

echo -e "${GREEN}Disconnected from database.${NC}"
exit 0 