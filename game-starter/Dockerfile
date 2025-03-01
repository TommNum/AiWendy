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
    postgresql-client \
    build-essential && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Set Python 3 as the default python
RUN ln -sf /usr/bin/python3 /usr/bin/python

# Set the working directory
WORKDIR /app

# Copy package files first (for better layer caching)
COPY package*.json ./

# Generate a fresh package-lock.json with all dependencies explicitly included
RUN rm -f package-lock.json && \
    npm install && \
    npm install pg @types/pg express @types/express --save && \
    npm install

# Copy the entire source directory
RUN mkdir -p src

# Copy all source files including tests
COPY src/ ./src/
COPY tsconfig.json ./
COPY .env* ./

# Create data directory and logs directory
RUN mkdir -p ./data ./logs

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
    ffmpeg \
    postgresql-client && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Set the working directory
WORKDIR /app

# Create data and logs directories
RUN mkdir -p ./data ./logs

# Copy built artifacts and production dependencies from the builder stage
COPY --from=builder /app/package.json ./
COPY --from=builder /app/package-lock.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/data/ ./data/
COPY --from=builder /app/logs/ ./logs/
COPY --from=builder /app/.env* ./

# Expose necessary ports
# EXPOSE 3000

# Command to start the application
CMD ["npm", "start"]
