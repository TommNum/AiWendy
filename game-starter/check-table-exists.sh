#!/bin/bash

# Create a temporary file for the SQL command
SQL_FILE=$(mktemp)

# Write the SQL query to check if the logs table exists
echo "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'logs');" > $SQL_FILE

# Run the query non-interactively
echo "Checking if logs table exists..."
railway connect Postgres < $SQL_FILE

# Clean up
rm $SQL_FILE

exit 0 