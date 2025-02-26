FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install bash for improved scripting
RUN apk add --no-cache bash

# Set environment variables
ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=512"

# Copy AiWendy package files
COPY AiWendy/package*.json ./
COPY plugins/ ./plugins/

# Install dependencies
RUN npm install --production && \
    cd plugins/telegramPlugin && npm install --production && \
    cd ../twitterPlugin && npm install --production

# Copy application code
COPY AiWendy/ ./

# Create logs directory
RUN mkdir -p logs

# Create wrapper script with better error handling
RUN echo '#!/bin/bash\n\
LOG_DIR="/app/logs"\n\
mkdir -p $LOG_DIR\n\
\n\
# Function to log with timestamp\n\
log() {\n\
  echo "[$(date "+%Y-%m-%d %H:%M:%S")] $1" | tee -a $LOG_DIR/wrapper.log\n\
}\n\
\n\
# Initial startup\n\
log "Starting application..."\n\
\n\
# Loop to restart the application if it crashes\n\
while true; do\n\
  log "Starting node process..."\n\
  node dist/src/wendy-twitter.js 2>&1 | tee -a $LOG_DIR/app-output.log\n\
  EXIT_CODE=$?\n\
  \n\
  log "Application exited with code $EXIT_CODE"\n\
  \n\
  # If the application was terminated by a signal, exit cleanly\n\
  if [ $EXIT_CODE -gt 128 ]; then\n\
    log "Application terminated by signal $(($EXIT_CODE - 128)). Exiting wrapper."\n\
    exit 0\n\
  fi\n\
  \n\
  log "Waiting 10 seconds before restarting..."\n\
  sleep 10\n\
done' > /app/start.sh && chmod +x /app/start.sh

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 CMD node dist/src/healthcheck.js

# Run the wrapper script
CMD ["/app/start.sh"] 