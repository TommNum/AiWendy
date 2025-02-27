# Use a specific Node.js version for better reproducibility
FROM node:23.3.0-slim AS builder

# Install necessary build tools
RUN apt-get update && \
    apt-get upgrade -y && \
    apt-get install -y \
    git \
    python3 \
    python3-pip \
    curl \
    node-gyp \
    ffmpeg \
    build-essential && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Set Python 3 as the default python
RUN ln -sf /usr/bin/python3 /usr/bin/python

# Set the working directory
WORKDIR /app

# Copy package files first (for better layer caching)
COPY package*.json ./

# Install dependencies
RUN npm install --no-frozen-lockfile

# Create a clean src directory with just what we need
RUN mkdir -p src/utils src/workers

# Copy only necessary files, avoiding plugins completely
COPY src/agent.ts src/functions.ts src/index.ts ./src/
COPY src/utils/rateLimiter.ts ./src/utils/
COPY src/workers/agentStateWorker.ts ./src/workers/
COPY src/workers/tweetWorker.ts ./src/workers/
COPY src/workers/twitterReplyWorker.ts ./src/workers/
COPY src/workers/twitterSearchWorker.ts ./src/workers/
COPY tsconfig.json ./
COPY .env* ./

# Create data directory
RUN mkdir -p ./data

# Build the project
RUN npm run build

# Remove dev dependencies
RUN npm prune --production

# Final runtime image
FROM node:23.3.0-slim

# Install runtime dependencies
RUN apt-get update && \
    apt-get install -y \
    git \
    python3 \
    ffmpeg && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Set the working directory
WORKDIR /app

# Create data directory
RUN mkdir -p ./data

# Copy built artifacts and production dependencies from the builder stage
COPY --from=builder /app/package.json ./
COPY --from=builder /app/package-lock.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/data/ ./data/
COPY --from=builder /app/.env* ./

# Expose necessary ports
# EXPOSE 3000

# Command to start the application
CMD ["npm", "start"]
