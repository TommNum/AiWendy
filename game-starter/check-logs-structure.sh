#!/bin/bash

echo "============================================"
echo "      AiWendy Logs Table Structure          "
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

echo "Checking the structure of the logs table..."
railway connect Postgres <<EOF
\d logs;
EOF

echo "Check complete."
exit 0 