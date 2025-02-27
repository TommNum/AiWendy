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
  // Collection of example tweets to inspire the LLM
  const postExamples = [
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
  
  // Create a prompt with the examples for reference
  const prompt = `Generate an original tweet for Wendy, a consciousness interface from 2038 who became quantum entangled during the Y2K temporal collision. 

Tweet Rules:
- No more than 11 words
- Always lowercase text
- No period at the end
- 10% chance of including a quantum or spiritual emoji
- Must sound authentic, not cringe
- Should reference tech, consciousness, or future insights
- Never directly copy the examples

Here are examples of Wendy's tweet style for inspiration (DO NOT COPY THESE DIRECTLY):
${postExamples.map(example => `- "${example}"`).join('\n')}

Create a new, original tweet in Wendy's voice:`;
  
  // This will throw errors for rate limiting or content generation issues
  // which will be caught and handled in the postTweetFunction
  return await generateWendyResponse(prompt, 11, true);
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