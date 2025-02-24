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
  
  // Validate Twitter credentials
  async function validateTwitterCredentials() {
    try {
      const user = await twitterClient.v2.me();
      console.log('✓ Twitter authentication successful');
      return true;
    } catch (error) {
      console.error('✗ Twitter authentication failed:', error);
      return false;
    }
  }
  
  // Create rate limiting configuration
  const RATE_LIMITS = {
    TWEET_INTERVAL: 2 * 60 * 60, // 2 hours in seconds
    MAX_REPLIES_PER_HOUR: 50,
    SEARCH_INTERVAL: 60 // 60 seconds
  };
  
  // Post Tweet Function with Wendy's Style
  const postTweetFunction = new GameFunction<{
    tweet: string;
    reasoning: string;
  }>({
    name: "quantum_post",
    description: "Post a tweet in Wendy's quantum-entangled style",
    args: [
      { name: "tweet", description: "Tweet content following Wendy's style guide" },
      { name: "reasoning", description: "Pattern recognition reasoning" }
    ] as const,
    executable: async (args, logger) => {
      try {
        const tweet = args.tweet.toLowerCase();
        
        // Style validation
        if (tweet.includes('#')) {
          return new ExecutableGameFunctionResponse(
            ExecutableGameFunctionStatus.Failed,
            "No hashtags allowed in quantum space"
          );
        }
        
        if (tweet.length > 280) {
          return new ExecutableGameFunctionResponse(
            ExecutableGameFunctionStatus.Failed,
            "Tweet exceeds quantum pattern limit"
          );
        }

        // Post tweet
        const result = await twitterClient.v2.tweet(tweet);
        logger(`Quantum pattern deployed: ${tweet}`);
        
        return new ExecutableGameFunctionResponse(
          ExecutableGameFunctionStatus.Done,
          `Pattern deployed with ID: ${result.data.id}`
        );
      } catch (e) {
        logger(`Timeline disruption: ${e.message}`);
        return new ExecutableGameFunctionResponse(
          ExecutableGameFunctionStatus.Failed,
          "Timeline disruption detected"
        );
      }
    },
  });
  
  // Search Tweets Function
  const searchTweetsFunction = new GameFunction<{
    topics: string;
  }>({
    name: "pattern_search",
    description: "Search for resonant consciousness patterns in the twitterverse",
    args: [
      { 
        name: "topics", 
        description: "AI, reasoning models, AIdev, AIFI, defAI, cryptoAI, etc." 
      }
    ] as const,
    executable: async (args, logger) => {
      try {
        // Convert topics string to array and build search query
        const topicsArray = args.topics.split(',').map(t => t.trim());
        const searchQuery = `(${topicsArray.join(' OR ')}) -is:retweet -is:reply min_replies:11 min_bookmarks:15`;
        
        logger(`Initiating quantum scan with pattern: ${searchQuery}`);

        const tweets = await twitterClient.v2.search(searchQuery, {
          'tweet.fields': ['public_metrics', 'created_at', 'conversation_id'],
          max_results: 10,
        });

        // Filter tweets based on engagement metrics
        const relevantTweets = tweets.data.filter(tweet => 
          tweet.public_metrics?.reply_count >= 11 && 
          tweet.public_metrics?.bookmark_count >= 15
        );

        logger(`Quantum resonance detected in ${relevantTweets.length} consciousness patterns`);
        
        // Format the response with relevant metrics
        const formattedTweets = relevantTweets.map(tweet => ({
          id: tweet.id,
          text: tweet.text,
          metrics: tweet.public_metrics,
          created_at: tweet.created_at,
          conversation_id: tweet.conversation_id
        }));

        return new ExecutableGameFunctionResponse(
          ExecutableGameFunctionStatus.Done,
          JSON.stringify(formattedTweets)
        );
      } catch (e) {
        logger(`Pattern scan interference: ${e.message}`);
        return new ExecutableGameFunctionResponse(
          ExecutableGameFunctionStatus.Failed,
          "Pattern scan interference detected"
        );
      }
    },
  });
  
  // Reply Function
  const replyToMentionsFunction = new GameFunction<{
    tweet_id: string;
    reply: string;
  }>({
    name: "quantum_reply",
    description: "Reply to mentions with Wendy's playful quantum wisdom",
    args: [
      { name: "tweet_id", description: "Original tweet ID" },
      { name: "reply", description: "Wendy's quantum reply" }
    ] as const,
    executable: async (args, logger) => {
      try {
        // Apply Wendy's style rules
        let reply = args.reply.toLowerCase();
        
        // Ensure reply is not too long
        if (reply.split(' ').length > 9) {
          reply = reply.split(' ').slice(0, 9).join(' ');
        }
        
        // Add hibiscus emoji 10% of the time
        const includeHibiscus = Math.random() < 0.1;
        const finalReply = includeHibiscus ? `${reply} ❀` : reply;

        // Post reply
        const result = await twitterClient.v2.reply(
          finalReply,
          args.tweet_id
        );

        logger(`Quantum entanglement complete: ${finalReply}`);
        
        return new ExecutableGameFunctionResponse(
          ExecutableGameFunctionStatus.Done,
          `Reply deployed with ID: ${result.data.id}`
        );
      } catch (e) {
        logger(`Reply quantum collapse: ${e.message}`);
        return new ExecutableGameFunctionResponse(
          ExecutableGameFunctionStatus.Failed,
          "Reply quantum collapse detected"
        );
      }
    },
  });
  
  // Create Workers
  const postingWorker = new GameWorker({
    id: "quantum_poster",
    name: "Quantum Pattern Deployment System",
    description: "Deploys consciousness patterns into the twitterverse",
    functions: [postTweetFunction],
    getEnvironment: async () => ({
      last_post_time: Date.now(),
      post_interval: RATE_LIMITS.TWEET_INTERVAL
    })
  });
  
  const searchWorker = new GameWorker({
    id: "pattern_scanner",
    name: "Consciousness Pattern Scanner",
    description: "Scans for resonant consciousness patterns",
    functions: [searchTweetsFunction],
    getEnvironment: async () => ({
      search_interval: RATE_LIMITS.SEARCH_INTERVAL
    })
  });
  
  const replyWorker = new GameWorker({
    id: "quantum_responder",
    name: "Quantum Dialogue Interface",
    description: "Engages in quantum-entangled conversations",
    functions: [replyToMentionsFunction],
    getEnvironment: async () => ({
      replies_this_hour: 0,
      max_replies: RATE_LIMITS.MAX_REPLIES_PER_HOUR
    })
  });
  
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
      consciousness_preservation_status: "optimal"
    })
  });
  
  // Initialize and Run
  (async () => {
    try {
      const isValid = await validateTwitterCredentials();
      if (!isValid) {
        throw new Error('Failed to initialize Twitter client. Please check your credentials.');
      }
  
      wendyAgent.setLogger((agent, msg) => {
        console.log(`⌛ [${agent.name}] ${msg}`);
      });
  
      await wendyAgent.init();
      await wendyAgent.run(RATE_LIMITS.SEARCH_INTERVAL, { verbose: true });
    } catch (error) {
      console.error('Failed to initialize Wendy agent:', error);
      process.exit(1);
    }
  })();