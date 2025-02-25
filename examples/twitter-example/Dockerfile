FROM node:18-slim

# Install curl for health checks
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm install --no-optional
RUN npm install -g typescript@5.0.4 @types/express @types/node

# Copy source code
COPY . .

# Create logs directory
RUN mkdir -p logs

# Print versions for debugging
RUN echo "Node version: $(node -v)" && \
    echo "NPM version: $(npm -v)" && \
    echo "TypeScript version: $(tsc -v)"

# Build TypeScript
RUN npm run build

# Verify build output
RUN ls -la dist/

# Expose port for health checks
EXPOSE 3000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Start the agent
CMD ["npm", "start"] 