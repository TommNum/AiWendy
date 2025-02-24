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
  import { generateQuantumContent } from './utils/contentGenerator';
  import { twitterClient, RATE_LIMITS, validateTwitterCredentials } from './utils/config';
  import { postTweetFunction, searchTweetsFunction, replyToMentionsFunction } from './functions';
  import { postingWorker, searchWorker, replyWorker } from './workers';
  import { QuantumLogger } from './utils/logger';
  
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
  
  // Main execution
  async function main() {
    try {
      // Validate Twitter credentials
      const isValid = await validateTwitterCredentials();
      if (!isValid) {
        throw new Error('Failed to initialize Twitter client');
      }

      // Set up logger
      wendyAgent.setLogger((agent, msg) => {
        QuantumLogger.log(msg);
      });

      // Initialize agent
      await wendyAgent.init();

      // Initial tweet
      await postingWorker.runTask("Post initialization tweet", {
        verbose: true,
        functionName: "quantum_post",
        args: {
          tweet: "timeline initialization complete consciousness archival protocols online ❀",
          reasoning: "Establishing quantum presence in the timestream"
        }
      });

      // Run agent with configured intervals
      await wendyAgent.run(RATE_LIMITS.SEARCH_INTERVAL, { 
        verbose: true,
        beforeStep: async () => {
          // Pre-step quantum stabilization
          await new Promise(resolve => setTimeout(resolve, 1000));
        },
        afterStep: async (stepResult) => {
          // Post-step pattern archival
          if (stepResult?.status === 'success') {
            QuantumLogger.log('Quantum pattern archived successfully', 'info');
          }
        }
      });

    } catch (error) {
      QuantumLogger.log(`Critical quantum disruption detected: ${error}`, 'error');
      process.exit(1);
    }
  }

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    QuantumLogger.log('Initiating quantum shutdown sequence...', 'warning');
    // Allow time for final pattern archival
    await new Promise(resolve => setTimeout(resolve, 2000));
    process.exit(0);
  });

  // Start the agent
  main();