import { 
  GameFunction, 
  ExecutableGameFunctionResponse, 
  ExecutableGameFunctionStatus, 
  GameWorker 
} from "@virtuals-protocol/game";
import { 
  roClient, 
  rwClient, 
  TwitterRateLimiter, 
  logWithTimestamp, 
  searchTweets,
  replyToTweet
} from "../twitterClient";
import { generateWendyResponse, ContentGenerationError, RateLimitError } from "../llmService";

// Shared rate limiter instance
const rateLimiter = new TwitterRateLimiter();

// Global state to track processed tweets
const processedTweets = new Set<string>();

// Function to search for relevant tweets
const searchTweetsFunction = new GameFunction({
  name: "search_tweets",
  description: "Search for tweets related to AI, reasoning models, AIdev, AIFI, defAI, cryptoAI, AI protocols, TAO, LLMs, OpenAI, Claude, Anthropic, Deep Research LLM, Deep Research, Deep Seek, Cult, Memes, Meme Humor, Memecoins. Like and reply to tweets with >11 replies and >15 bookmarks.",
  args: [] as const,
  executable: async (_, logger) => {
    try {
      // Check rate limiting for search
      if (!rateLimiter.canSearch()) {
        const status = rateLimiter.getRateLimitStatus();
        const waitTimeSeconds = Math.ceil(status.nextSearchAvailableIn / 1000);
        return new ExecutableGameFunctionResponse(
          ExecutableGameFunctionStatus.Failed,
          `Rate limited for search. Try again in ${waitTimeSeconds} seconds.`
        );
      }

      // Search terms related to AI and crypto
      const searchTerms = [
        "AI reasoning models", "AIdev", "AIFI", "defAI", "cryptoAI", 
        "AI protocols", "TAO", "LLMs", "OpenAI", "Claude", "Anthropic", 
        "Deep Research LLM", "Deep Research", "Deep Seek", "Culture DAO", 
        "AI Memes", "Meme Humor", "@culturecapfun", "Memecoins"
      ];
      
      // Select a random search term
      const randomTerm = searchTerms[Math.floor(Math.random() * searchTerms.length)];
      logger(`Searching for tweets about: ${randomTerm}`);
      
      // Search for tweets
      const searchResults = await searchTweets(randomTerm);
      
      // Record the search in rate limiter
      rateLimiter.recordSearch();
      
      // Filter for tweets with sufficient engagement
      const engagingTweets = searchResults.data.filter((tweet: any) => 
        tweet.public_metrics &&
        tweet.public_metrics.reply_count > 11 && 
        tweet.public_metrics.bookmark_count > 15 &&
        !processedTweets.has(tweet.id)
      );
      
      if (engagingTweets.length === 0) {
        logger(`No engaging tweets found for ${randomTerm}`);
        return new ExecutableGameFunctionResponse(
          ExecutableGameFunctionStatus.Done,
          `No engaging tweets found for ${randomTerm}`
        );
      }
      
      // Select a random tweet from the filtered list
      const tweet = engagingTweets[Math.floor(Math.random() * engagingTweets.length)];
      
      // Mark as processed
      processedTweets.add(tweet.id);
      
      // Like the tweet
      try {
        await rwClient.v2.like(process.env.TWITTER_USER_ID!, tweet.id);
        logger(`Liked tweet: ${tweet.id}`);
      } catch (likeError: any) {
        if (likeError.code === 429) {
          logger(`Rate limited when liking tweet: ${likeError.message}`);
        } else {
          logger(`Error liking tweet: ${likeError.message}`);
        }
        // Continue with reply even if like fails
      }
      
      // Generate and post a reply
      try {
        const reply = await generateReply(tweet.text);
        
        // Only attempt to reply if we have content
        await replyToTweet(reply, tweet.id);
        logger(`Replied to tweet successfully`);
        
        // Record the reply
        rateLimiter.recordReply();
        
        return new ExecutableGameFunctionResponse(
          ExecutableGameFunctionStatus.Done,
          `Successfully processed tweet about ${randomTerm}: liked and replied`
        );
      } catch (replyError) {
        if (replyError instanceof RateLimitError) {
          logger(`LLM rate limited when generating reply. Skipped replying.`);
          return new ExecutableGameFunctionResponse(
            ExecutableGameFunctionStatus.Done,
            `Liked tweet but skipped replying due to LLM rate limiting`
          );
        } else if (replyError instanceof ContentGenerationError) {
          logger(`Content generation failed: ${replyError.message}. Skipped replying.`);
          return new ExecutableGameFunctionResponse(
            ExecutableGameFunctionStatus.Done,
            `Liked tweet but couldn't generate reply content`
          );
        } else {
          logger(`Error in replying to tweet: ${replyError}`);
          return new ExecutableGameFunctionResponse(
            ExecutableGameFunctionStatus.Failed,
            `Failed to reply to tweet due to error`
          );
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger(`Search tweets failed: ${errorMessage}`);
      return new ExecutableGameFunctionResponse(
        ExecutableGameFunctionStatus.Failed,
        `Failed to search tweets`
      );
    }
  }
});

// Function to generate a reply based on Wendy's style
async function generateReply(tweetText: string): Promise<string> {
  // Use the LLM service to generate a contextually relevant response
  // This will throw appropriate errors for rate limiting or generation issues
  return await generateWendyResponse(tweetText, 9, true);
}

// Function to get environment/state for the worker
async function getSearchTweetsEnvironment() {
  const status = rateLimiter.getRateLimitStatus();
  
  return {
    rate_limits: status,
    processed_tweets_count: processedTweets.size
  };
}

// Export the worker
export const searchTweetsWorker = new GameWorker({
  id: "search_tweets_worker",
  name: "Search Tweets Worker",
  description: "Worker that searches for relevant tweets and engages with them",
  functions: [searchTweetsFunction],
  getEnvironment: getSearchTweetsEnvironment
}); 