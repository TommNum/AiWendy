#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}      AiWendy Logs Table Initialization     ${NC}"
echo -e "${GREEN}============================================${NC}"

# Create a temporary file for the SQL command
SQL_FILE=$(mktemp)

# Write the SQL query to create the logs table
cat > $SQL_FILE << 'EOF'
-- Create logs table if it doesn't exist
CREATE TABLE IF NOT EXISTS logs (
  id SERIAL PRIMARY KEY,
  level VARCHAR(10) NOT NULL,
  message TEXT NOT NULL,
  timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
  source VARCHAR(100),
  additional_data JSONB
);

-- Insert a test log entry
INSERT INTO logs (level, message, source, additional_data)
VALUES ('info', 'Logs table initialized manually', 'deployment-script', 
        ('{"manual_timestamp": "' || NOW() || '"}')::jsonb);

-- Verify the table exists and has the test record
SELECT * FROM logs;
EOF

# Run the query non-interactively
echo -e "${YELLOW}Creating logs table...${NC}"
railway connect Postgres < $SQL_FILE

# Clean up
rm $SQL_FILE

echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}      Table Initialization Complete!        ${NC}"
echo -e "${GREEN}============================================${NC}"

exit 0 