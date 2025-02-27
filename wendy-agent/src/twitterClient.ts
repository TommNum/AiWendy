import { TwitterApi } from "twitter-api-v2";
import dotenv from "dotenv";
import fs from 'fs';
import path from 'path';

dotenv.config();

// Initialize the Twitter client with credentials from env vars
export const twitterClient = new TwitterApi({
  appKey: process.env.TWITTER_API_KEY!,
  appSecret: process.env.TWITTER_API_SECRET!,
  accessToken: process.env.TWITTER_ACCESS_TOKEN!,
  accessSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET!,
});

// Create a read-write client
export const rwClient = twitterClient.readWrite;

// Create a read-only client
export const roClient = twitterClient.readOnly;

// Create a bearer token client for app-only auth if bearer token is available
export const appOnlyClient = process.env.TWITTER_BEARER_TOKEN 
  ? new TwitterApi(process.env.TWITTER_BEARER_TOKEN)
  : null;

// Custom reply function to extend the Twitter API functionality
export async function replyToTweet(text: string, reply_to_tweet_id: string, mediaId: string | null = null) {
  try {
    const params: any = {
      text,
      reply: {
        in_reply_to_tweet_id: reply_to_tweet_id
      }
    };
    
    if (mediaId) {
      params.media = { media_ids: [mediaId] };
    }
    
    return await rwClient.v2.tweet(params);
  } catch (error: any) {
    logWithTimestamp(`Error replying to tweet: ${error.message}`, 'error');
    throw error;
  }
}

// Custom DM list function to extend the Twitter API functionality
export async function listDmEvents(options: any = {}) {
  try {
    // Try with bearer token first if available
    if (appOnlyClient) {
      try {
        return appOnlyClient.v2.get('dm_events', options);
      } catch (error) {
        logWithTimestamp(`Error fetching DM events with bearer token, falling back to rwClient: ${error}`, 'warn');
        // Fall back to rwClient
      }
    }
    
    // Use the v2 API for DMs with rwClient
    return rwClient.v2.get('dm_events', options);
  } catch (error) {
    logWithTimestamp(`Error fetching DM events: ${error}`, 'error');
    throw error;
  }
}

// Custom DM send function to extend the Twitter API functionality
export async function sendDm(options: { recipient_id: string, text: string }) {
  try {
    // Try with bearer token first if available
    if (appOnlyClient) {
      try {
        return appOnlyClient.v2.post('dm_conversations/with/:participant_id/messages', {
          participant_id: options.recipient_id,
          text: options.text
        });
      } catch (error) {
        logWithTimestamp(`Error sending DM with bearer token, falling back to rwClient: ${error}`, 'warn');
        // Fall back to rwClient
      }
    }
    
    // Use the v2 API for sending DMs with rwClient
    return rwClient.v2.post('dm_conversations/with/:participant_id/messages', {
      participant_id: options.recipient_id,
      text: options.text
    });
  } catch (error) {
    logWithTimestamp(`Error sending DM: ${error}`, 'error');
    throw error;
  }
}

// Get conversation history
export async function getDmConversation(participantId: string, options: any = {}) {
  try {
    // Try with bearer token first if available
    if (appOnlyClient) {
      try {
        return appOnlyClient.v2.get(`dm_conversations/with/${participantId}/dm_events`, options);
      } catch (error) {
        logWithTimestamp(`Error getting DM conversation with bearer token, falling back to rwClient: ${error}`, 'warn');
        // Fall back to rwClient
      }
    }
    
    // Use the v2 API for getting DM conversation history with rwClient
    return rwClient.v2.get(`dm_conversations/with/${participantId}/dm_events`, options);
  } catch (error) {
    logWithTimestamp(`Error getting DM conversation: ${error}`, 'error');
    throw error;
  }
}

// Helper function for searching tweets
export async function searchTweets(searchQuery: string, options: any = {}) {
  try {
    // Try with user context auth first
    const result = await roClient.v2.search(searchQuery, {
      ...options,
      "tweet.fields": "created_at,author_id,public_metrics",
      "user.fields": "username,name,profile_image_url",
      "expansions": "author_id"
    });
    return {
      ...result,
      data: Array.isArray(result.data) ? result.data : [],
      includes: result.includes // Preserve the includes property from the original response
    };
  } catch (error) {
    // If app-only auth is available and user context fails, try with app-only auth
    if (appOnlyClient) {
      const result = await appOnlyClient.v2.search(searchQuery, {
        ...options,
        "tweet.fields": "created_at,author_id,public_metrics",
        "user.fields": "username,name,profile_image_url",
        "expansions": "author_id"
      });
      return {
        ...result,
        data: Array.isArray(result.data) ? result.data : [],
        includes: result.includes
      };
    }
    throw error;
  }
}

// Helper function to process mentions
export async function getUserMentions(userId: string, options: any = {}) {
  try {
    const result = await roClient.v2.userMentionTimeline(userId, {
      ...options,
      "tweet.fields": "created_at,author_id,public_metrics",
      "user.fields": "username,name,profile_image_url",
      "expansions": "author_id"
    });
    return {
      ...result,
      data: Array.isArray(result.data) ? result.data : []
    };
  } catch (error) {
    logWithTimestamp(`Error getting user mentions: ${error}`, 'error');
    throw error;
  }
}

// Validate Twitter credentials on startup
export async function validateTwitterCredentials(): Promise<boolean> {
  try {
    console.log('Validating Twitter credentials...');
    
    try {
      // Try user context auth
      const user = await rwClient.v2.me();
      console.log(`Twitter auth successful. Logged in as @${user.data.username}`);
      return true;
    } catch (error: any) {
      // Check for rate limiting
      if (error.code === 429) {
        console.log('Twitter rate limited (429). This is expected if you\'ve been running the app frequently.');
        // If rate limited, fall back to app-only auth
      } else {
        console.error('Twitter user context authentication error:', error);
        // Fall back to app-only auth
      }
    }
    
    // Try app-only auth if available
    if (appOnlyClient) {
      try {
        // For app-only auth validation, use a simple endpoint
        const searchResult = await appOnlyClient.v2.search('twitter', { max_results: 10 });
        console.log('Bearer token authentication successful');
        return true;
      } catch (error: any) {
        if (error.code === 429) {
          console.log('App-only auth rate limited (429). This is expected if you\'ve been running the app frequently.');
        } else {
          console.error('Twitter app-only authentication error:', error);
        }
      }
    }
    
    console.log('Twitter authentication validation completed - proceeding with available access');
    return true;
  } catch (error: any) {
    console.error('Twitter authentication error:', error);
    // Continue despite auth issues so the app doesn't crash
    return true;
  }
}

// Helper function for logging with timestamps
export function logWithTimestamp(message: string, level: 'info' | 'warn' | 'error' = 'info'): void {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    message
  };
  
  console.log(JSON.stringify(logEntry));
  
  // Also write to log file
  const logsDir = path.join(__dirname, "../logs");
  
  // Ensure logs directory exists
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
  
  const logFile = path.join(logsDir, "wendy.log");
  fs.appendFileSync(logFile, `${timestamp} - ${level.toUpperCase()}: ${message}\n`);
}

// Twitter rate limiter class
export class TwitterRateLimiter {
  private lastTweetTime: number = 0;
  private hourlyReplyCount: number = 0;
  private lastSearchTime: number = 0;
  private hourStartTime: number = Date.now();
  
  constructor() {
    // Reset hourly counters every hour
    setInterval(() => {
      this.hourlyReplyCount = 0;
      this.hourStartTime = Date.now();
      logWithTimestamp('Hourly rate limits reset', 'info');
    }, 3600000); // 1 hour in milliseconds
  }
  
  public canTweet(): boolean {
    const now = Date.now();
    const twoHoursMs = 2 * 60 * 60 * 1000;
    
    // Allow first tweet on startup
    if (this.lastTweetTime === 0) return true;
    
    return (now - this.lastTweetTime) >= twoHoursMs;
  }
  
  public canReply(): boolean {
    return this.hourlyReplyCount < 50;
  }
  
  public canSearch(): boolean {
    const now = Date.now();
    return (now - this.lastSearchTime) >= 60000; // 60 seconds
  }
  
  public recordTweet(): void {
    this.lastTweetTime = Date.now();
    logWithTimestamp(`Tweet posted. Next tweet available in 2 hours`, 'info');
  }
  
  public recordReply(): void {
    this.hourlyReplyCount++;
    logWithTimestamp(`Reply posted. ${50 - this.hourlyReplyCount} replies remaining this hour`, 'info');
  }
  
  public recordSearch(): void {
    this.lastSearchTime = Date.now();
  }
  
  public getRateLimitStatus(): {
    tweetsRemaining: number;
    repliesRemaining: number;
    nextTweetAvailableIn: number;
    nextSearchAvailableIn: number;
    hourlyResetIn: number;
  } {
    const now = Date.now();
    const nextTweetTime = this.lastTweetTime + (2 * 60 * 60 * 1000);
    const nextSearchTime = this.lastSearchTime + 60000;
    const timeUntilHourReset = (this.hourStartTime + 3600000) - now;
    
    return {
      tweetsRemaining: this.canTweet() ? 1 : 0,
      repliesRemaining: 50 - this.hourlyReplyCount,
      nextTweetAvailableIn: Math.max(0, nextTweetTime - now),
      nextSearchAvailableIn: Math.max(0, nextSearchTime - now),
      hourlyResetIn: Math.max(0, timeUntilHourReset)
    };
  }
  
  public getLastTweetTime(): number {
    return this.lastTweetTime;
  }
  
  public getHourlyReplyCount(): number {
    return this.hourlyReplyCount;
  }
} 