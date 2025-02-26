#!/bin/bash
set -e

# Clean up any previous temporary files
rm -rf ./temp-plugins
mkdir -p ./temp-plugins/twitterPlugin
mkdir -p ./temp-plugins/telegramPlugin

# Copy the plugin files for the build
echo "Copying Twitter plugin files..."
cp -R ./plugins/twitterPlugin/* ./temp-plugins/twitterPlugin/
echo "Copying Telegram plugin files..."
cp -R ./plugins/telegramPlugin/* ./temp-plugins/telegramPlugin/

# Success message
echo "Files copied successfully for Docker build" 

# Now let's make the setup script executable and run it to prepare the files for Docker build: 