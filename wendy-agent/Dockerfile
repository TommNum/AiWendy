FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source files
COPY . .

# Build the project
RUN npm run build

# Health check
HEALTHCHECK --interval=60s --timeout=10s --start-period=60s --retries=3 \
  CMD node dist/healthcheck.js

# Command to run the application
CMD [ "node", "dist/index.js" ] 