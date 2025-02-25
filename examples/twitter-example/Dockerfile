FROM node:18-alpine AS builder

WORKDIR /app

# Install build essentials and curl for healthcheck
RUN apk add --no-cache python3 make g++ curl

# Copy package files
COPY package*.json ./

# Install ALL dependencies with clean npm cache
RUN npm cache clean --force && \
    npm ci

# Copy source code
COPY . .

# Build TypeScript with explicit path to tsc
RUN npm run build || (echo "Build failed" && exit 1)

# Production stage
FROM node:18-alpine

WORKDIR /app

# Install only production dependencies
COPY package*.json ./
RUN npm ci --only=production --no-cache

# Copy built files from builder stage
COPY --from=builder /app/dist ./dist

# Create log directory and set permissions
RUN mkdir -p logs && chmod 777 logs

# Expose port
EXPOSE 3000

# Health check using curl
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/status || exit 1

# Start command
CMD ["node", "dist/src/wendy-twitter.js"] 