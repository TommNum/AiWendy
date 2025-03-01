#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}      AiWendy Railway Deployment Script     ${NC}"
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

# Check if there's an existing Railway project linked
echo -e "${YELLOW}Checking for linked Railway project...${NC}"
PROJECT_INFO=$(railway status 2>&1)

if [[ $PROJECT_INFO == *"not linked to a project"* ]]; then
    echo -e "${YELLOW}No linked project found. Initializing a new project...${NC}"
    railway init
    
    if [ $? -ne 0 ]; then
        echo -e "${RED}Failed to initialize Railway project.${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}Project already linked.${NC}"
fi

# Create a fresh package-lock.json file
echo -e "${YELLOW}Removing existing package-lock.json if it exists...${NC}"
if [ -f "package-lock.json" ]; then
    rm package-lock.json
    echo -e "${GREEN}Existing package-lock.json removed.${NC}"
fi

# Install PostgreSQL client dependencies 
echo -e "${YELLOW}Installing PostgreSQL client dependencies...${NC}"
npm install pg @types/pg express @types/express --save

if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to install PostgreSQL and Express dependencies.${NC}"
    exit 1
fi

echo -e "${GREEN}Dependencies installed successfully.${NC}"

# Ensure all dependencies are properly installed
echo -e "${YELLOW}Installing all dependencies and generating fresh package-lock.json...${NC}"
npm install

if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to install dependencies.${NC}"
    exit 1
fi

echo -e "${GREEN}All dependencies installed successfully.${NC}"

# Build the application
echo -e "${YELLOW}Building the application...${NC}"
npm run build

if [ $? -ne 0 ]; then
    echo -e "${RED}Build failed.${NC}"
    exit 1
fi

echo -e "${GREEN}Build successful.${NC}"

# Check if database is already provisioned
echo -e "${YELLOW}Checking for PostgreSQL database...${NC}"
DB_CHECK=$(railway service ls 2>&1 | grep "postgresql")

if [[ -z "$DB_CHECK" ]]; then
    echo -e "${YELLOW}No PostgreSQL database found. You'll need to add one manually from the Railway dashboard.${NC}"
    echo -e "${YELLOW}Go to https://railway.app/dashboard and select your project.${NC}"
    echo -e "${YELLOW}Then click 'New' > 'Database' > 'PostgreSQL'${NC}"
    
    # Open the Railway dashboard
    echo -e "${YELLOW}Opening Railway dashboard...${NC}"
    railway open
    
    # Wait for user to confirm they've added the database
    read -p "Press enter once you've added the PostgreSQL database to continue..."
else
    echo -e "${GREEN}PostgreSQL database already provisioned.${NC}"
fi

# Deploy the application
echo -e "${YELLOW}Deploying to Railway...${NC}"
railway up

if [ $? -ne 0 ]; then
    echo -e "${RED}Deployment failed.${NC}"
    exit 1
fi

echo -e "${GREEN}Deployment successful!${NC}"
echo -e "${GREEN}Your application is now deployed on Railway.${NC}"

# Open the Railway dashboard
echo -e "${YELLOW}Opening Railway dashboard to view your deployment...${NC}"
railway open

echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}      Deployment Process Complete!          ${NC}"
echo -e "${GREEN}============================================${NC}"
echo -e "${YELLOW}View logs with: ${NC}railway logs"
echo -e "${YELLOW}Connect to PostgreSQL with: ${NC}railway connect"
echo -e "${YELLOW}Check status with: ${NC}railway status"
echo -e "${YELLOW}View database logs with: ${NC}./view-logs.sh"
echo -e "${GREEN}============================================${NC}"

exit 0 