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
    libtool-bin \
    autoconf \
    automake \
    libopus-dev \
    make \
    g++ \
    build-essential \
    libcairo2-dev \
    libjpeg-dev \
    libpango1.0-dev \
    libgif-dev \
    openssl \
    libssl-dev libsecret-1-dev && \
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

# Install TypeScript globally
RUN npm install -g typescript

# Copy only the game-starter source files
COPY tsconfig.json ./
COPY src/ ./src/
COPY .env* ./

# Create data directory
RUN mkdir -p ./data

# Build the project
RUN npm run build && npm prune --production

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
