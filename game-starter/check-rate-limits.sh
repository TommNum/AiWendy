#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}      AiWendy Twitter Rate Limit Check      ${NC}"
echo -e "${GREEN}============================================${NC}"

# Make sure the test script is compiled
echo -e "${YELLOW}Compiling rate limit test script...${NC}"
npx tsc

if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to compile the test script.${NC}"
    exit 1
fi

echo -e "${GREEN}Compilation successful.${NC}"

# Run the rate limit test
echo -e "${YELLOW}Running Twitter API rate limit check...${NC}"
node dist/test-rate-limit.js

if [ $? -ne 0 ]; then
    echo -e "${RED}Rate limit check failed.${NC}"
    exit 1
fi

echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}      Rate Limit Check Complete!            ${NC}"
echo -e "${GREEN}============================================${NC}"

exit 0 