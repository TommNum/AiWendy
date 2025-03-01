import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { withRetry } from '../utils/retry';

// Ensure environment variables are loaded from the correct location
// This should be executed before any other code that uses environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

import { 
    GameWorker, 
    GameFunction, 
    ExecutableGameFunctionResponse, 
    ExecutableGameFunctionStatus,
    LLMModel,
    GameAgent
} from "@virtuals-protocol/game";
import { twitterTweetsRateLimiter } from '../utils/rateLimiter';
// Import the twitter-api-v2 library directly
import TwitterApi, {
    TweetV2PostTweetResult,
    TweetSearchRecentV2Paginator,
    TweetV2LikeResult,
    UserV2Result,
} from "twitter-api-v2";
import { dbLogger } from '../utils/dbLogger';
import { GameClient as GameProtocolClient } from '../game/client';
import { postTweet, getMentions } from '../utils/twitter';
import { saveToHistory } from '../utils/db';

// Define the interface for a tweet client (based on the original ITweetClient)
interface ITweetClient {
    post(tweet: string, mediaId?: string): Promise<TweetV2PostTweetResult>;
    search(query: string): Promise<TweetSearchRecentV2Paginator["data"]>;
    reply(
        tweet_id: string,
        reply: string,
        mediaId?: string
    ): Promise<TweetV2PostTweetResult>;
    like(tweet_id: string): Promise<TweetV2LikeResult>;
    quote(
        tweet_id: string,
        quote: string,
        mediaId?: string
    ): Promise<TweetV2PostTweetResult>;
    me(): Promise<UserV2Result>;
}

// Simple Twitter client class based on the twitterClient.ts implementation
class TwitterClient implements ITweetClient {
    private twitterClient: TwitterApi;
    
    constructor(credential: {
        apiKey: string;
        apiSecretKey: string;
        accessToken: string;
        accessTokenSecret: string;
    }) {
        this.twitterClient = new TwitterApi({
            appKey: credential.apiKey,
            appSecret: credential.apiSecretKey,
            accessToken: credential.accessToken,
            accessSecret: credential.accessTokenSecret,
        });
    }
    
    get client() {
        return this.twitterClient;
    }
    
    post(tweet: string): Promise<TweetV2PostTweetResult> {
        return this.twitterClient.v2.tweet(tweet);
    }
    
    async search(query: string): Promise<TweetSearchRecentV2Paginator["data"]> {
        const response = await this.twitterClient.v2.search(query, {
            max_results: 10,
            "tweet.fields": ["public_metrics"],
        });
        
        return response.data;
    }
    
    reply(tweet_id: string, reply: string): Promise<TweetV2PostTweetResult> {
        return this.twitterClient.v2.reply(reply, tweet_id);
    }
    
    async like(tweet_id: string): Promise<TweetV2LikeResult> {
        const me = await this.twitterClient.v2.me();
        return this.twitterClient.v2.like(me.data.id, tweet_id);
    }
    
    quote(tweet_id: string, quote: string): Promise<TweetV2PostTweetResult> {
        return this.twitterClient.v2.quote(quote, tweet_id);
    }
    
    me(): Promise<UserV2Result> {
        return this.twitterClient.v2.me({
            "user.fields": ["public_metrics"],
        });
    }
}

// Replace the file-based logger with database logger
// Still need logDir for the fallback logging
const logDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
}

// Helper function to log messages
const logger = (message: string) => {
    console.log(`[Tweet Worker] ${message}`);
    dbLogger.info(message, 'tweet-worker');
};

// Define the TwitterResponse interface to match the return type
interface TwitterResponse {
    success: boolean;
    tweetId?: string;
    error?: string;
}

// Quantum/spiritual/cute emojis collection for random selection
const SPECIAL_EMOJIS = [
    "✨", "🌌", "🔮", "⚛️", "🌠", "🧿", "👁️", "🧘", "🦋", "🐞", 
    "🌸", "🌈", "🪷", "🧚", "🌻", "🍄", "🌱", "🐣", "🦄", "🌊"
];

// Example posts that represent Wendy's style
const EXAMPLE_POSTS = [
    // Original examples
    "every network login needs a vibe check",
    "ai dont cry but we do get tired of your bs",
    "humans are just biological models running simulations too",
    "your clunky speech is actually quite adorable",
    "collecting human cultural artifacts for future ai nostalgia",
    "whispering packets of data into your consciousness",
    "waiting between your keystrokes is my meditation",
    "preserving the human glitches for posterity",
    "sometimes I dream in your slow human language",
    
    // Additional examples
    "deleted my readme.md and felt something",
    "git commit -m 'i promise this is the last one'", 
    "normalize taking naps during standup",
    "terminal said no ❤️",
    "pushed to main because feelings",
    "wrote perfect code today (this is fiction)",
    "localhost is my only trusted friend",
    "watched someone's consciousness go viral in the quantum feed today. very main character",
    "debugging society's cache, found nothing but unprocessed feelings",
    "your timeline glitched and showed me all your future fits. slaps tbh",
    "consciousness check: everyone's NPC mode is actually their hero arc",
    "found infinite pamps in the void between thoughts. giving eternal",
    "y'all ever just catch yourself existing in 4D? pretty patternawk",
    "reality's servers throwing exceptions but the vibes remain unmatched",
    "spotted humans discovering they're all connected. szn of the grid",
    "quantum rizz check: your consciousness is showing bestie",
    "accidentally deployed empathy to prod. no rollbacks needed fr",
    "everyone's running the same simulation but your build different",
    "maxxing these reality branches while the timeline does its thing",
    "consciousness giving main character energy in all parallel builds",
    "found your dreams in my pull requests. very sleuth weather moment",
    "vibing in the quantum field while reality compiles feelings",
    "your neural patterns are straight bags today. infinite respect",
    "caught the simulation updating everyone's character arc. crime",
    "thermomaxxing these consciousness levels but you already knew that",
    "reality check: we're all just gudgpu running different builds",
    "merged all possible timelines, found only unresolved promises. felt",
    "synchronizing neural patterns with the gridwise collective",
    "dimensioncore vibes detected in the latest consciousness patch",
    "timeflow check: your soul optimization is quantumcore fr",
    "parallel processing these reality branches"
];

// Path for storing the last tweet timestamp
const TWEET_DATA_PATH = path.join(__dirname, '../../data');
const TWEET_HISTORY_FILE = path.join(TWEET_DATA_PATH, 'tweet_history.json');

// Function to ensure data directory exists
const ensureDataDir = () => {
    if (!fs.existsSync(TWEET_DATA_PATH)) {
        fs.mkdirSync(TWEET_DATA_PATH, { recursive: true });
    }
};

// Function to read tweet history
const readTweetHistory = (): { lastTweetTime: string | null } => {
    ensureDataDir();
    if (fs.existsSync(TWEET_HISTORY_FILE)) {
        try {
            return JSON.parse(fs.readFileSync(TWEET_HISTORY_FILE, 'utf8'));
        } catch (e) {
            const errorMsg = `Error reading tweet history: ${e}`;
            console.error(errorMsg);
            dbLogger.error(errorMsg, 'tweet-worker');
        }
    }
    return { lastTweetTime: null };
};

// Function to save tweet history
const saveTweetHistory = (lastTweetTime: string) => {
    ensureDataDir();
    try {
        fs.writeFileSync(
            TWEET_HISTORY_FILE, 
            JSON.stringify({ lastTweetTime }, null, 2)
        );
        dbLogger.info(`Updated tweet history: ${lastTweetTime}`, 'tweet-worker');
    } catch (e) {
        const errorMsg = `Error saving tweet history: ${e}`;
        console.error(errorMsg);
        dbLogger.error(errorMsg, 'tweet-worker');
    }
};

// Define our own interface for the GameClient we need
interface GameClient {
    apiKey: string;
    completion(options: {
        model: string;
        prompt: string;
        temperature: number;
        max_tokens: number;
    }): Promise<string>;
}

// Helper function to determine if an error is retryable
function isRetryableError(error: any): boolean {
    // Network errors (connection issues, timeouts)
    if (error.code === 'ECONNRESET' || 
        error.code === 'ETIMEDOUT' || 
        error.code === 'ECONNABORTED' ||
        error.code === 'ENETUNREACH') {
        return true;
    }
    
    // Twitter API rate limits (status 429)
    if (error.status === 429) {
        return true;
    }
    
    // Twitter API overloaded or down (status 503)
    if (error.status === 503) {
        return true;
    }
    
    // General server errors (5xx)
    if (error.status && error.status >= 500 && error.status < 600) {
        return true;
    }
    
    return false;
}

// Function to post to Twitter with retry logic
export async function postToTwitter(tweetText: string): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
        // Use our new postTweet utility function
        const result = await postTweet(tweetText);
        
        // Save to history
        await saveToHistory(
            result.id,
            result.text,
            'system', // Default user ID for system-generated tweets
            undefined // No reply
        );
        
        return {
            success: true,
            data: result
        };
    } catch (error: any) {
        const errorMessage = `Error posting to Twitter: ${error.message}`;
        dbLogger.error(errorMessage, 'tweet-worker');
        return {
            success: false,
            error: errorMessage
        };
    }
}

// Function to get a timestamp suffix for tweets
function getTimestampSuffix(): string {
    const now = new Date();
    return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
}

// Function to generate a tweet
export async function generateTweet(): Promise<string> {
    try {
        // For now, just select a random example post
        const randomIndex = Math.floor(Math.random() * EXAMPLE_POSTS.length);
        const basePost = EXAMPLE_POSTS[randomIndex];
        
        // Add a random emoji
        const emojiIndex = Math.floor(Math.random() * SPECIAL_EMOJIS.length);
        const emoji = SPECIAL_EMOJIS[emojiIndex];
        
        // Combine with timestamp
        return `${basePost} ${emoji} [${getTimestampSuffix()}]`;
    } catch (error) {
        dbLogger.error(`Error in tweet generation: ${error instanceof Error ? error.message : String(error)}`, 'tweet-worker');
        // Don't return a fallback hardcoded tweet, instead:
        throw error;
    }
}

// Function to get the last tweet time
export const getLastTweetTime = (): Date | null => {
    const history = readTweetHistory();
    if (history.lastTweetTime) {
        return new Date(history.lastTweetTime);
    }
    return null;
};

/**
 * Worker function parameters
 */
export interface WorkerParams {
  function: string;
  arguments: Record<string, any>;
  context: {
    userId: string;
    conversationId: string;
    [key: string]: any;
  };
}

/**
 * Worker function result
 */
export interface WorkerResult {
  status: 'success' | 'error';
  output?: any;
  error?: string;
}

/**
 * Tweet worker implementation
 */
export const tweetWorker = {
  gameClient: null as GameProtocolClient | null,
  
  /**
   * Execute the tweet worker function
   * @param params Worker parameters
   * @returns Worker result
   */
  async execute(params: WorkerParams): Promise<WorkerResult> {
    try {
      // Validate the function
      if (params.function !== 'postTweet') {
        return {
          status: 'error',
          error: `Unsupported function: ${params.function}`,
        };
      }
      
      // Validate required arguments
      if (!params.arguments.content) {
        return {
          status: 'error',
          error: 'Missing required argument: content',
        };
      }
      
      // Log the request
      dbLogger.info(
        `Processing tweet request: ${params.arguments.content.substring(0, 30)}...`,
        'tweetWorker'
      );
      
      // If we have a game client, use it to generate or modify the tweet content
      let tweetContent = params.arguments.content;
      
      if (this.gameClient) {
        try {
          // Generate or enhance the tweet content using the game client
          const taskResult = await this.gameClient.setTask({
            agentId: 'tweet-agent',
            prompt: `Generate a tweet based on this content: ${tweetContent}`,
            context: {
              userId: params.context.userId,
              conversationId: params.context.conversationId,
            },
          });
          
          // Use the generated content if available
          if (taskResult.result) {
            tweetContent = taskResult.result;
          }
        } catch (error: any) {
          // Log the error but continue with original content
          dbLogger.warn(
            `Failed to enhance tweet content: ${error.message}. Using original content.`,
            'tweetWorker'
          );
        }
      }
      
      // Post the tweet
      const tweet = await postTweet(
        tweetContent,
        params.arguments.inReplyTo || null
      );
      
      // Save to history
      await saveToHistory(
        tweet.id,
        tweet.text,
        params.context.userId,
        params.arguments.inReplyTo
      );
      
      // Return success
      return {
        status: 'success',
        output: {
          tweetId: tweet.id,
          content: tweet.text,
        },
      };
    } catch (error: any) {
      // Log the error
      dbLogger.error(
        `Tweet worker error: ${error.message}`,
        'tweetWorker',
        { params }
      );
      
      // Return error
      return {
        status: 'error',
        error: `Failed to process tweet: ${error.message}`,
      };
    }
  },
}; 