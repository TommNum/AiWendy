#!/bin/bash

echo "============================================"
echo "      AiWendy Database Logs Check           "
echo "============================================"

# Check if we're logged in to Railway
if ! command -v railway &> /dev/null; then
  echo "Railway CLI not found. Please install it first."
  exit 1
fi

# Check login status
if ! railway whoami &> /dev/null; then
  echo "Not logged in to Railway. Please run 'railway login' first."
  exit 1
fi

echo "Checking for logs in the database..."
# Use positional parameter for the service name
railway connect Postgres <<EOF
SELECT 
  id, 
  timestamp, 
  level, 
  module, 
  message, 
  data
FROM logs 
ORDER BY timestamp DESC 
LIMIT 10;
EOF

echo "Check complete."
exit 0 