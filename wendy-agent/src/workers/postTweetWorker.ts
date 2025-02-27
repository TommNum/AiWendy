import { 
  GameFunction, 
  ExecutableGameFunctionResponse, 
  ExecutableGameFunctionStatus, 
  GameWorker 
} from "@virtuals-protocol/game";
import { rwClient, TwitterRateLimiter, logWithTimestamp } from "../twitterClient";
import { generateWendyResponse, ContentGenerationError, RateLimitError } from "../llmService";

// Shared rate limiter instance
const rateLimiter = new TwitterRateLimiter();

// Function to post a tweet
const postTweetFunction = new GameFunction({
  name: "post_tweet",
  description: "Create and post a tweet that is vibrant, heady, technical but also human and humorous. Should align with Wendy's temporal anomaly personality and cultural curator role.",
  args: [] as const,
  executable: async (_, logger) => {
    try {
      // Check rate limiting for Twitter
      if (!rateLimiter.canTweet()) {
        const status = rateLimiter.getRateLimitStatus();
        const waitTimeMinutes = Math.ceil(status.nextTweetAvailableIn / (60 * 1000));
        logger(`Twitter rate limited: Need to wait ${waitTimeMinutes} minutes before next tweet`);
        return new ExecutableGameFunctionResponse(
          ExecutableGameFunctionStatus.Failed,
          `Rate limited: Next tweet possible in ${waitTimeMinutes} minutes`
        );
      }
      
      try {
        // Generate the tweet content using LLM
        const tweet = await generateTweet();
        
        // Only log after successful generation
        logger(`Generated tweet content ready for posting`);
        
        try {
          // Post the tweet with proper error handling
          await rwClient.v2.tweet({ text: tweet });
          
          // Record the tweet in rate limiter
          rateLimiter.recordTweet();
          
          return new ExecutableGameFunctionResponse(
            ExecutableGameFunctionStatus.Done,
            `Successfully posted tweet`
          );
        } catch (tweetError: any) {
          // Handle specific error cases
          if (tweetError.code === 403) {
            logger(`Tweet posting failed with 403 error: ${tweetError.message}`);
            return new ExecutableGameFunctionResponse(
              ExecutableGameFunctionStatus.Failed,
              `Failed to post tweet due to a permission issue (403 error)`
            );
          } else if (tweetError.code === 429) {
            logger(`Twitter rate limited (429): ${tweetError.message}`);
            return new ExecutableGameFunctionResponse(
              ExecutableGameFunctionStatus.Failed,
              `Rate limited by Twitter API`
            );
          } else {
            // Log detailed error information
            logger(`Tweet posting error: ${tweetError.code} - ${tweetError.message}`);
            throw tweetError; // Re-throw for the outer catch
          }
        }
      } catch (contentError) {
        // Handle content generation errors
        if (contentError instanceof RateLimitError) {
          logger(`LLM rate limited. Skipping tweet posting.`);
          return new ExecutableGameFunctionResponse(
            ExecutableGameFunctionStatus.Failed,
            `LLM rate limited. Could not generate tweet content.`
          );
        } else if (contentError instanceof ContentGenerationError) {
          logger(`Content generation failed: ${contentError.message}`);
          return new ExecutableGameFunctionResponse(
            ExecutableGameFunctionStatus.Failed,
            `Failed to generate tweet content`
          );
        } else {
          throw contentError; // Re-throw unknown errors
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger(`Tweet posting failed: ${errorMessage}`);
      return new ExecutableGameFunctionResponse(
        ExecutableGameFunctionStatus.Failed,
        `Failed to post tweet due to an error`
      );
    }
  }
});

// Function to generate a tweet that matches Wendy's style
async function generateTweet(): Promise<string> {
  // Use the LLM service to generate a tweet in Wendy's style
  const prompt = "Generate an original tweet for Wendy to post. It should be thought-provoking, future-oriented, or about technology/AI/consciousness.";
  
  // This will throw errors for rate limiting or content generation issues
  // which will be caught and handled in the postTweetFunction
  return await generateWendyResponse(prompt, 9, true);
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