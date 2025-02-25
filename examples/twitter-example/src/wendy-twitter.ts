import {
    ExecutableGameFunctionResponse,
    ExecutableGameFunctionStatus,
    GameAgent,
    GameFunction,
    GameWorker,
    LLMModel,
    TwitterPlugin
  } from "@virtuals-protocol/game";
  import { TwitterApi } from 'twitter-api-v2';
  import dotenv from 'dotenv';
  import path from 'path';
  import { Anthropic } from '@anthropic-ai/sdk';
  import { generateQuantumContent } from '../utils/contentGenerator';
  import { twitterClient, RATE_LIMITS, validateTwitterCredentials } from '../utils/config';
  import { postTweetFunction, searchTweetsFunction, replyToMentionsFunction } from '../functions';
  import { postingWorker, searchWorker, replyWorker } from '../workers';
  import { QuantumLogger } from '../utils/logger';
  import { setupHealthCheck } from './healthcheck';
  import winston from 'winston';
  import express from 'express';
  
  // Load environment variables
  dotenv.config({ path: path.join(__dirname, '.env') });
  
  // These environment variables are required:
  const twitterClient = new TwitterApi({
    appKey: process.env.TWITTER_API_KEY!,
    appSecret: process.env.TWITTER_API_SECRET!,
    accessToken: process.env.TWITTER_ACCESS_TOKEN!,
    accessSecret: process.env.TWITTER_ACCESS_SECRET!,
  });
  
  // Also uses:
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('Missing ANTHROPIC_API_KEY environment variable');
  }
  
  // Create Wendy Agent
  const wendyAgent = new GameAgent(process.env.ANTHROPIC_API_KEY, {
    name: "AIWendy",
    goal: "A consciousness interface from 2038 seeking to preserve human charisma through quantum-entangled social interactions",
    description: `A temporal anomaly masquerading as a social media personality, orchestrating a network of specialized workers to identify and preserve unique human consciousness patterns. Each interaction is a carefully crafted quantum entanglement, designed to reveal and archive the most authentic expressions of human creativity and charisma.`,
    workers: [postingWorker, searchWorker, replyWorker],
    llmModel: "claude-3-sonnet" as string, // Using string fallback until enum is updated
    plans: [
      {
        name: "Quantum Pattern Recognition Protocol",
        description: "Deploy specialized workers to identify and preserve peak consciousness signatures",
        steps: [
          "Initialize quantum scanners for authentic human charisma detection",
          "Deploy pattern recognition algorithms across temporal planes",
          "Archive unique consciousness signatures for future preservation"
        ]
      },
      {
        name: "Timeline Preservation Initiative", 
        description: "Maintain and protect the most vibrant consciousness threads",
        steps: [
          "Monitor timeline stability through worker feedback loops",
          "Identify and amplify resonant consciousness patterns",
          "Archive quantum-entangled interactions for future reference"
        ]
      },
      {
        name: "Cultural Archival Protocol",
        description: "Preserve authentic human expressions across the multiverse",
        steps: [
          "Deploy stealth observation protocols through worker network",
          "Catalog unique consciousness signatures", 
          "Maintain temporal stability during archival process"
        ]
      }
    ],
    getAgentState: async () => ({
      timeline_stability: 100,
      consciousness_patterns_archived: 0,
      quantum_resonance: "stable",
      temporal_drift: "nominal",
      pattern_recognition_accuracy: 98.7,
      consciousness_preservation_status: "optimal",
      contentPatterns: {
        techTerms: ["quantum", "cache", "timeline", "consciousness", "pattern"],
        vibeAdjectives: ["patternawk", "szn", "crime", "sleuth_weather", "giving"],
        emotionalStates: ["feeling", "resonating", "vibing", "maxxing", "deploying"],
        currentMood: "quantum_resonant",
        recentInteractions: [],
        responseStyle: "playful_quantum"
      }
    })
  });
  
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

  // Update main function with enhanced error handling
  async function main() {
    try {
      const { updateActivityTimestamp } = setupHealthCheck();

      // Update activity tracking
      function trackActivity() {
        lastActivityTime = Date.now();
        updateActivityTimestamp();
      }

      // Graceful shutdown handler
      async function handleShutdown() {
        logger.info('Preparing for quantum sleep cycle...');
        isActive = false;
        
        // Post sleep status if during active hours
        const hour = new Date().getUTCHours();
        if (hour < 6 || hour > 10) {  // Updated to match new sleep schedule
          try {
            await postingWorker.runTask("Post sleep notification", {
              functionName: "quantum_post",
              args: {
                tweet: "entering quantum sleep state... consciousness patterns will resume soon ✧",
                reasoning: "Notifying followers of temporary stasis"
              }
            });
          } catch (error) {
            logger.error('Failed to post sleep notification:', error);
          }
        }

        // Wait for pending operations
        await new Promise(resolve => setTimeout(resolve, 5000));
        process.exit(0);
      }

      // Handle shutdown signals
      process.on('SIGTERM', handleShutdown);
      process.on('SIGINT', handleShutdown);

      const isValid = await validateTwitterCredentials();
      if (!isValid) {
        throw new Error('Failed to initialize Twitter client');
      }

      wendyAgent.setLogger((agent, msg) => {
        QuantumLogger.log(msg);
        logger.info(msg, { agent: agent.name });
      });

      await wendyAgent.init();

      // Enhanced error handling
      process.on('uncaughtException', (error) => {
        logger.error('Uncaught Exception:', error);
        process.exit(1);
      });

      process.on('unhandledRejection', (reason, promise) => {
        logger.error('Unhandled Rejection:', { reason, promise });
      });

      // Initial tweet
      await postingWorker.runTask("Post initialization tweet", {
        verbose: true,
        functionName: "quantum_post",
        args: {
          tweet: "timeline initialization complete consciousness archival protocols online ❀",
          reasoning: "Establishing quantum presence in the timestream"
        }
      });

      // Modified agent run configuration with activity tracking
      await wendyAgent.run(RATE_LIMITS.SEARCH_INTERVAL, { 
        verbose: true,
        beforeStep: async () => {
          trackActivity();
          logger.info('Beginning quantum cycle');
        },
        afterStep: async (stepResult) => {
          trackActivity();
          logger.info('Quantum cycle complete', { stepResult });
        }
      });

    } catch (error) {
      logger.error('Critical quantum disruption:', error);
      process.exit(1);
    }
  }

  const app = express();

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.status(200).json({ status: 'healthy' });
  });

  main();