FROM node:18-slim

WORKDIR /app

# Install curl for healthcheck
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

# Install dependencies first (better caching)
COPY package*.json ./
RUN npm install --no-optional

# Install TypeScript globally to ensure tsc is available
RUN npm install -g typescript@5.0.4

# Copy all source code and config files
COPY . .

# Create logs directory
RUN mkdir -p logs

# Set NODE_ENV for the build
ENV NODE_ENV=production

# Debug and build
RUN echo "Node version: $(node -v)" && \
    echo "NPM version: $(npm -v)" && \
    echo "TypeScript version: $(tsc --version)" && \
    echo "Project structure:" && \
    find . -type f -not -path "./node_modules/*" && \
    echo "Starting TypeScript compilation..." && \
    npm run build

# Expose port for health checks
EXPOSE 3000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Start the bot
CMD ["npm", "start"] 