FROM node:18-alpine AS builder

# Use alpine for smaller image size
WORKDIR /app

# Copy package files first to leverage Docker cache
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Production image
FROM node:18-alpine

WORKDIR /app

# Copy only necessary files from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./

# Environment variables will be provided at runtime
ENV NODE_ENV=production \
    TWITTER_API_KEY="" \
    TWITTER_API_SECRET="" \
    TWITTER_ACCESS_TOKEN="" \
    TWITTER_ACCESS_SECRET="" \
    ANTHROPIC_API_KEY=""

# Create non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/health', (r) => r.statusCode === 200 ? process.exit(0) : process.exit(1))"

# Start the agent
CMD ["node", "dist/wendy-twitter.js"] 