#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}      AiWendy Dependencies Preparation      ${NC}"
echo -e "${GREEN}============================================${NC}"

# Remove existing lockfile
echo -e "${YELLOW}Removing package-lock.json if it exists...${NC}"
if [ -f "package-lock.json" ]; then
    rm -f package-lock.json
    echo -e "${GREEN}Existing package-lock.json removed.${NC}"
fi

# Install dependencies with exact versions
echo -e "${YELLOW}Installing dependencies with exact versions...${NC}"

# Install all the dependencies that were missing in the lock file
npm install --no-package-lock \
    pg@8.13.3 \
    @types/pg@8.11.11 \
    express@4.21.2 \
    @types/express@5.0.0 \
    @types/body-parser@1.19.5 \
    @types/express-serve-static-core@5.0.6 \
    @types/qs@6.9.18 \
    @types/serve-static@1.15.7 \
    @types/connect@3.4.38 \
    @types/range-parser@1.2.7 \
    @types/send@0.17.4 \
    @types/mime@1.3.5 \
    @types/http-errors@2.0.4

if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to install dependencies with exact versions.${NC}"
    exit 1
fi

# Install remaining dependencies
echo -e "${YELLOW}Installing remaining dependencies...${NC}"
npm install --no-package-lock

if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to install remaining dependencies.${NC}"
    exit 1
fi

echo -e "${GREEN}All dependencies installed successfully without package-lock.json.${NC}"
echo -e "${GREEN}============================================${NC}"

exit 0 