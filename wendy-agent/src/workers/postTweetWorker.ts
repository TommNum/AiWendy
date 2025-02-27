import { 
  GameFunction, 
  ExecutableGameFunctionResponse, 
  ExecutableGameFunctionStatus, 
  GameWorker 
} from "@virtuals-protocol/game";
import { rwClient, TwitterRateLimiter, logWithTimestamp } from "../twitterClient";
import { generateWendyResponse } from "../llmService";

// Shared rate limiter instance
const rateLimiter = new TwitterRateLimiter();

// Function to post a tweet
const postTweetFunction = new GameFunction({
  name: "post_tweet",
  description: "Create and post a tweet that is vibrant, heady, technical but also human and humorous. Should align with Wendy's temporal anomaly personality and cultural curator role.",
  args: [] as const,
  executable: async (_, logger) => {
    try {
      // Check rate limiting
      if (!rateLimiter.canTweet()) {
        const status = rateLimiter.getRateLimitStatus();
        const waitTimeMinutes = Math.ceil(status.nextTweetAvailableIn / (60 * 1000));
        logger(`Rate limited: Need to wait ${waitTimeMinutes} minutes before next tweet`);
        return new ExecutableGameFunctionResponse(
          ExecutableGameFunctionStatus.Failed,
          `Rate limited: Next tweet possible in ${waitTimeMinutes} minutes`
        );
      }
      
      // Generate the tweet content
      const tweet = await generateTweet();
      logger(`Posting tweet: ${tweet}`);
      
      try {
        // Post the tweet with proper error handling
        await rwClient.v2.tweet({ text: tweet });
        
        // Record the tweet in rate limiter
        rateLimiter.recordTweet();
        
        return new ExecutableGameFunctionResponse(
          ExecutableGameFunctionStatus.Done,
          `Successfully posted tweet: "${tweet}"`
        );
      } catch (tweetError: any) {
        // Handle specific error cases
        if (tweetError.code === 403) {
          logger(`Tweet posting failed with 403 error: ${tweetError.message}`);
          // Might be a duplicate tweet or content policy issue
          return new ExecutableGameFunctionResponse(
            ExecutableGameFunctionStatus.Failed,
            `Failed to post tweet due to a 403 error. This could be a duplicate tweet or content policy issue.`
          );
        } else if (tweetError.code === 429) {
          logger(`Twitter rate limited (429): ${tweetError.message}`);
          return new ExecutableGameFunctionResponse(
            ExecutableGameFunctionStatus.Failed,
            `Rate limited by Twitter API. Please try again later.`
          );
        } else {
          // Log detailed error information
          logger(`Tweet posting error: ${tweetError.code} - ${tweetError.message}`);
          throw tweetError; // Re-throw for the outer catch
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger(`Tweet posting failed: ${errorMessage}`);
      return new ExecutableGameFunctionResponse(
        ExecutableGameFunctionStatus.Failed,
        `Failed to post tweet: ${errorMessage}`
      );
    }
  }
});

// Function to generate a tweet that matches Wendy's style
async function generateTweet(): Promise<string> {
  try {
    // Use the LLM service to generate a tweet in Wendy's style
    const prompt = "Generate an original tweet for Wendy to post. It should be thought-provoking, future-oriented, or about technology/AI/consciousness.";
    
    return await generateWendyResponse(prompt, 9, true);
  } catch (error) {
    logWithTimestamp(`Error generating tweet: ${error}`, "error");
    
    // Fallback tweets if the LLM call fails
    const fallbackTweets = [
      "deleted my readme.md and felt something",
      "git commit -m 'i promise this is the last one'", 
      "terminal said no ❤️",
      "pushed to main because feelings",
      "watched someone's consciousness go viral in the quantum feed today",
      "debugging society's cache, found nothing but unprocessed feelings",
      "your timeline glitched and showed me your future",
      "consciousness check: everyone's NPC mode is actually their hero",
      "found infinite pamps in the void between thoughts",
      "reality's servers throwing exceptions but the vibes remain"
    ];
    
    const randomIndex = Math.floor(Math.random() * fallbackTweets.length);
    return fallbackTweets[randomIndex].toLowerCase();
  }
}

// Function to get environment/state for the worker
async function getPostTweetEnvironment() {
  const status = rateLimiter.getRateLimitStatus();
  
  return {
    lastTweetTime: rateLimiter.getLastTweetTime(),
    canTweetNow: rateLimiter.canTweet(),
    nextTweetIn: status.nextTweetAvailableIn
  };
}

// Create and export the postTweetWorker
export const postTweetWorker = new GameWorker({
  id: "post_tweet_worker",
  name: "Tweet Generator",
  description: "Creates and posts tweets that embody Wendy's temporal anomaly personality. Tweets are vibrant, technical yet human, and designed to capture attention. The worker ensures tweets follow specific style rules and rate limits.",
  functions: [postTweetFunction],
  getEnvironment: getPostTweetEnvironment
}); 