import {
    ExecutableGameFunctionResponse,
    ExecutableGameFunctionStatus,
    GameAgent,
    GameFunction,
    GameWorker,
    LLMModel,
} from "@virtuals-protocol/game";
import { TwitterApi } from 'twitter-api-v2';
import dotenv from 'dotenv';
import path from 'path';
import { Anthropic } from '@anthropic-ai/sdk';
import { generateQuantumContent } from '../utils/contentGenerator';
import { RATE_LIMITS, validateTwitterCredentials } from '../utils/config';
import { postTweetFunction, searchTweetsFunction, replyToMentionsFunction } from '../functions';
import { postingWorker, searchWorker, replyWorker } from '../workers';
import { QuantumLogger } from '../utils/logger';
import { setupHealthCheck } from './healthcheck';
const winston = require('winston');
import express, { Request, Response } from 'express';

// Add debug logging for env loading
console.log('Current directory:', process.cwd());
const envPath = path.join(process.cwd(), '.env');
console.log('Loading .env from:', envPath);

// Update env loading to be more verbose
dotenv.config({ 
  path: envPath,
  debug: process.env.NODE_ENV !== 'production'
});

// Add env var check
const requiredEnvVars = [
  'TWITTER_API_KEY',
  'TWITTER_API_SECRET',
  'TWITTER_ACCESS_TOKEN',
  'TWITTER_ACCESS_TOKEN_SECRET',
  'ANTHROPIC_API_KEY'
];

console.log('Checking environment variables...');
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingVars.length > 0) {
  console.error('Missing required environment variables:', missingVars);
  process.exit(1);
}
console.log('All required environment variables are present');

// Initialize Twitter client
const client = new TwitterApi({
  appKey: process.env.TWITTER_API_KEY!,
  appSecret: process.env.TWITTER_API_SECRET!,
  accessToken: process.env.TWITTER_ACCESS_TOKEN!,
  accessSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET!,
});

// Move verification into an async init function
async function initializeTwitter() {
  try {
    await client.v2.me();
    console.log('Twitter authentication successful');
  } catch (error) {
    console.error('Twitter authentication failed:', error);
    process.exit(1);
  }
}

// Also uses:
if (!process.env.ANTHROPIC_API_KEY) {
  throw new Error('Missing ANTHROPIC_API_KEY environment variable');
}

// Initialize the agent
const agent = new GameAgent(
  process.env.ANTHROPIC_API_KEY!,
  {
    name: "WendyAI",
    description: "A quantum-inspired Twitter AI agent",
    goal: "Monitor and engage with Twitter timeline through quantum patterns",
    llmModel: "claude-3-sonnet-20240229",
    workers: [postingWorker, searchWorker, replyWorker]
  }
);

// Update logger configuration
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

// Add sleep handling
let isActive = true;
const IDLE_TIMEOUT = 30 * 60 * 1000; // 30 minutes
let lastActivityTime = Date.now();

// Move express setup to top of file, after imports
const app = express();
const PORT = process.env.PORT || 3000;

// Enhanced health check endpoint
app.get('/status', (req: Request, res: Response) => {
  res.json({
    status: 'active',
    lastActivity: lastActivityTime,
    uptime: process.uptime()
  });
});

// Add health endpoint to match Dockerfile
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'active',
    lastActivity: lastActivityTime,
    uptime: process.uptime()
  });
});

// Setup health check
const trackActivity = setupHealthCheck(app);

// Add startup timeout
const STARTUP_TIMEOUT = 30000; // 30 seconds

// Main function
async function main() {
  const startupTimeout = setTimeout(() => {
    console.error('Application startup timed out');
    process.exit(1);
  }, STARTUP_TIMEOUT);

  try {
    if (!(await validateTwitterCredentials())) {
      process.exit(1);
    }
    
    // Start express server first
    await new Promise<void>((resolve) => {
      app.listen(PORT, () => {
        logger.info(`Quantum health monitoring active on port ${PORT}`);
        console.log(`Server started on port ${PORT}`);
        resolve();
      });
    });

    await agent.init();
    clearTimeout(startupTimeout); // Clear timeout after successful startup

    // Enhanced error handling
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', error);
      process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection:', { reason, promise });
    });

    // Initial tweet
    await postTweetFunction.execute({
      tweet: { value: "timeline initialization complete consciousness archival protocols online ❀" },
      reasoning: { value: "Establishing quantum presence in the timestream" }
    }, (msg: string) => logger.info(msg));

    // Fix agent run configuration
    while (true) {
      await agent.step({
        verbose: true
      });
      await new Promise(resolve => setTimeout(resolve, RATE_LIMITS.SEARCH_INTERVAL));
      trackActivity();
      logger.info('Quantum cycle complete');
    }

  } catch (error) {
    logger.error('Critical quantum disruption:', error);
    process.exit(1);
  }
}

// Call main() after express is set up
main().catch(error => {
  logger.error('Fatal quantum collapse:', error);
  process.exit(1);
});
