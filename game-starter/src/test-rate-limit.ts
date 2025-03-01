import dotenv from 'dotenv';
import { TwitterApi } from 'twitter-api-v2';

// Load environment variables
dotenv.config();

// Define an interface for rate limit errors
interface RateLimitError extends Error {
  rateLimit?: {
    limit: number;
    remaining: number;
    reset: number;
  };
}

// Function to test Twitter API rate limits
async function checkTwitterRateLimits() {
  try {
    console.log('Testing Twitter API Rate Limits...');
    
    // Get Twitter API credentials from environment variables
    const twitterApiKey = process.env.TWITTER_API_KEY;
    const twitterApiSecret = process.env.TWITTER_API_SECRET;
    const twitterAccessToken = process.env.TWITTER_ACCESS_TOKEN;
    const twitterAccessTokenSecret = process.env.TWITTER_ACCESS_TOKEN_SECRET;
    
    if (!twitterApiKey || !twitterApiSecret || !twitterAccessToken || !twitterAccessTokenSecret) {
      throw new Error('Twitter API credentials are missing in environment variables');
    }
    
    // Create a Twitter API client
    const twitterClient = new TwitterApi({
      appKey: twitterApiKey,
      appSecret: twitterApiSecret,
      accessToken: twitterAccessToken,
      accessSecret: twitterAccessTokenSecret,
    });
    
    // Check rate limit status for different endpoints
    console.log('Checking rate limits for user mentions...');
    try {
      const mentionsResponse = await twitterClient.v2.userMentionTimeline('me');
      console.log('✅ Successfully fetched user mentions');
      console.log(`Rate limit remaining: ${mentionsResponse.rateLimit.remaining}/${mentionsResponse.rateLimit.limit}`);
      console.log(`Rate limit will reset at: ${new Date(mentionsResponse.rateLimit.reset * 1000).toLocaleString()}`);
      const minutesUntilReset = Math.round((mentionsResponse.rateLimit.reset * 1000 - Date.now()) / 60000);
      console.log(`Minutes until reset: ${minutesUntilReset}`);
    } catch (error) {
      console.error('❌ Error fetching user mentions:', error);
      const rateLimitError = error as RateLimitError;
      if (rateLimitError.rateLimit) {
        console.log(`Rate limit exceeded. Resets at: ${new Date(rateLimitError.rateLimit.reset * 1000).toLocaleString()}`);
        const minutesUntilReset = Math.round((rateLimitError.rateLimit.reset * 1000 - Date.now()) / 60000);
        console.log(`Minutes until reset: ${minutesUntilReset}`);
      }
    }
    
    console.log('\nChecking rate limits for home timeline...');
    try {
      const timelineResponse = await twitterClient.v2.homeTimeline();
      console.log('✅ Successfully fetched home timeline');
      console.log(`Rate limit remaining: ${timelineResponse.rateLimit.remaining}/${timelineResponse.rateLimit.limit}`);
      console.log(`Rate limit will reset at: ${new Date(timelineResponse.rateLimit.reset * 1000).toLocaleString()}`);
      const minutesUntilReset = Math.round((timelineResponse.rateLimit.reset * 1000 - Date.now()) / 60000);
      console.log(`Minutes until reset: ${minutesUntilReset}`);
    } catch (error) {
      console.error('❌ Error fetching home timeline:', error);
      const rateLimitError = error as RateLimitError;
      if (rateLimitError.rateLimit) {
        console.log(`Rate limit exceeded. Resets at: ${new Date(rateLimitError.rateLimit.reset * 1000).toLocaleString()}`);
        const minutesUntilReset = Math.round((rateLimitError.rateLimit.reset * 1000 - Date.now()) / 60000);
        console.log(`Minutes until reset: ${minutesUntilReset}`);
      }
    }
    
    // For user profile, we'll use a different approach since the return type may not have rateLimit
    console.log('\nChecking general API connectivity...');
    try {
      // Just check if we can connect to Twitter API
      const userResponse = await twitterClient.v2.me();
      console.log('✅ Successfully connected to Twitter API');
      console.log(`User ID: ${userResponse.data.id}`);
      console.log(`Username: ${userResponse.data.username}`);
    } catch (error) {
      console.error('❌ Error connecting to Twitter API:', error);
      const rateLimitError = error as RateLimitError;
      if (rateLimitError.rateLimit) {
        console.log(`Rate limit exceeded. Resets at: ${new Date(rateLimitError.rateLimit.reset * 1000).toLocaleString()}`);
        const minutesUntilReset = Math.round((rateLimitError.rateLimit.reset * 1000 - Date.now()) / 60000);
        console.log(`Minutes until reset: ${minutesUntilReset}`);
      }
    }
  } catch (error) {
    console.error('Error in rate limit check:', error);
  }
}

// Run the check
checkTwitterRateLimits()
  .then(() => console.log('Rate limit check completed'))
  .catch(error => console.error('Error running rate limit check:', error)); 