import { TwitterApi, TweetV2, Tweetv2TimelineResult } from 'twitter-api-v2';
import { dbLogger } from './dbLogger';
import { withRetry } from './retry';

// Load environment variables
const TWITTER_API_KEY = process.env.TWITTER_API_KEY || '';
const TWITTER_API_SECRET = process.env.TWITTER_API_SECRET || '';
const TWITTER_ACCESS_TOKEN = process.env.TWITTER_ACCESS_TOKEN || '';
const TWITTER_ACCESS_SECRET = process.env.TWITTER_ACCESS_SECRET || '';
const TWITTER_BEARER_TOKEN = process.env.TWITTER_BEARER_TOKEN || '';

/**
 * Tweet data structure
 */
export interface Tweet {
  id: string;
  text: string;
  author?: string;
  createdAt?: Date;
}

/**
 * Initialize Twitter client
 */
function getTwitterClient(): TwitterApi {
  try {
    // Check if we have the required credentials
    if (!TWITTER_API_KEY || !TWITTER_API_SECRET || 
        !TWITTER_ACCESS_TOKEN || !TWITTER_ACCESS_SECRET) {
      throw new Error('Twitter API credentials not configured');
    }
    
    // Create and return the client
    return new TwitterApi({
      appKey: TWITTER_API_KEY,
      appSecret: TWITTER_API_SECRET,
      accessToken: TWITTER_ACCESS_TOKEN,
      accessSecret: TWITTER_ACCESS_SECRET,
    });
  } catch (error) {
    const err = error as Error;
    dbLogger.error(`Failed to initialize Twitter client: ${err.message}`, 'twitter');
    throw err;
  }
}

/**
 * Post a tweet
 * @param content The tweet content
 * @param inReplyTo Optional tweet ID to reply to
 * @returns The posted tweet data
 */
export async function postTweet(content: string, inReplyTo: string | null = null): Promise<Tweet> {
  try {
    const client = getTwitterClient();
    const twitterClient = client.readWrite;
    
    // Prepare tweet options
    const tweetOptions: any = {};
    if (inReplyTo) {
      tweetOptions.reply = { in_reply_to_tweet_id: inReplyTo };
    }
    
    // Post the tweet with retry logic
    const response = await withRetry(
      () => twitterClient.v2.tweet(content, tweetOptions),
      {
        maxRetries: 3,
        loggerTag: 'twitter:postTweet',
      }
    );
    
    dbLogger.info(`Tweet posted successfully: ${response.data.id}`, 'twitter');
    
    return {
      id: response.data.id,
      text: response.data.text,
    };
  } catch (error) {
    const err = error as Error;
    dbLogger.error(`Failed to post tweet: ${err.message}`, 'twitter');
    throw err;
  }
}

/**
 * Get recent mentions of the authenticated user
 * @param userId User ID to get mentions for
 * @param count Number of mentions to retrieve (default: 10)
 * @returns Array of tweets mentioning the user
 */
export async function getMentions(userId: number, count: number = 10): Promise<Tweet[]> {
  try {
    const client = getTwitterClient();
    const twitterClient = client.readOnly;
    
    // Get the user ID if not provided
    const me = userId ? { data: { id: userId.toString(), username: '' } } : await twitterClient.v2.me();
    
    // Get mentions with retry logic
    const response = await withRetry(
      () => twitterClient.v2.search(`@${me.data.username}`, {
        'tweet.fields': ['created_at', 'author_id'],
        'user.fields': ['username'],
        max_results: count,
      }),
      {
        maxRetries: 3,
        loggerTag: 'twitter:getMentions',
      }
    );
    
    // Map the response to our Tweet interface
    const mentions = Array.isArray(response.data) 
      ? response.data.map((tweet: TweetV2) => ({
          id: tweet.id,
          text: tweet.text,
          author: tweet.author_id,
          createdAt: tweet.created_at ? new Date(tweet.created_at) : undefined,
        }))
      : [];
    
    dbLogger.info(`Retrieved ${mentions.length} mentions`, 'twitter');
    
    return mentions;
  } catch (error) {
    const err = error as Error;
    dbLogger.error(`Failed to get mentions: ${err.message}`, 'twitter');
    throw err;
  }
} 