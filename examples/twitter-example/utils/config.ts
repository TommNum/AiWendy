import { TwitterApi } from 'twitter-api-v2';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

export const RATE_LIMITS = {
  TWEET_INTERVAL: 2 * 60 * 60,
  MAX_REPLIES_PER_HOUR: 50,
  SEARCH_INTERVAL: 60
};

export const twitterClient = new TwitterApi({
  appKey: process.env.TWITTER_API_KEY!,
  appSecret: process.env.TWITTER_API_SECRET!,
  accessToken: process.env.TWITTER_ACCESS_TOKEN!,
  accessSecret: process.env.TWITTER_ACCESS_SECRET!,
});

export async function validateTwitterCredentials() {
  try {
    const user = await twitterClient.v2.me();
    console.log('✓ Twitter authentication successful');
    return true;
  } catch (error) {
    console.error('✗ Twitter authentication failed:', error);
    return false;
  }
}