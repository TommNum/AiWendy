import { 
  GameFunction, 
  ExecutableGameFunctionResponse, 
  ExecutableGameFunctionStatus, 
  GameWorker 
} from "@virtuals-protocol/game";
import { rwClient, TwitterRateLimiter, logWithTimestamp } from "../twitterClient";

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
      
      // Generate and post the tweet
      const tweet = await generateTweet();
      logger(`Posting tweet: ${tweet}`);
      
      await rwClient.v2.tweet(tweet);
      
      // Record the tweet
      rateLimiter.recordTweet();
      
      return new ExecutableGameFunctionResponse(
        ExecutableGameFunctionStatus.Done,
        `Successfully posted tweet: "${tweet}"`
      );
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
  // Sample tweets to inspire the style (not to be used verbatim)
  const examples = [
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
    "consciousness giving main character energy in all parallel builds"
  ];
  
  // Simulate AI generating a tweet based on the examples
  // In a real implementation, you would use an LLM call here
  const randomIndex = Math.floor(Math.random() * examples.length);
  const baseTweet = examples[randomIndex];
  
  // Apply Wendy's posting rules
  // - lowercase only
  // - no hashtags
  // - no more than 9 words
  // - use hibiscus emoji 10% of the time
  
  let tweet = baseTweet.toLowerCase();
  
  // Ensure no more than 9 words
  const words = tweet.split(' ');
  if (words.length > 9) {
    tweet = words.slice(0, 9).join(' ');
  }
  
  // Add hibiscus emoji 10% of the time
  if (Math.random() < 0.1) {
    tweet += " 🌺";
  }
  
  return tweet;
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