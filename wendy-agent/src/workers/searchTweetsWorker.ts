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
import { generateWendyResponse } from "../llmService";

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
        "Deep Research LLM", "Deep Research", "Deep Seek", "Cult DAO", 
        "AI Memes", "Meme Humor", "Memecoins"
      ];
      
      // Select a random search term
      const randomTerm = searchTerms[Math.floor(Math.random() * searchTerms.length)];
      logger(`Searching for tweets about: ${randomTerm}`);
      
      // Search for tweets
      const searchResults = await searchTweets(randomTerm);
      
      // Filter for tweets with sufficient engagement
      const engagingTweets = searchResults.data.filter((tweet: any) => 
        tweet.public_metrics &&
        tweet.public_metrics.reply_count > 11 && 
        tweet.public_metrics.bookmark_count > 15 &&
        !processedTweets.has(tweet.id)
      );
      
      if (engagingTweets.length === 0) {
        logger(`No engaging tweets found for ${randomTerm}`);
        rateLimiter.recordSearch();
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
      await rwClient.v2.like(process.env.TWITTER_USER_ID!, tweet.id);
      logger(`Liked tweet: ${tweet.id}`);
      
      // Generate and post a reply
      const reply = await generateReply(tweet.text);
      await replyToTweet(reply, tweet.id);
      logger(`Replied to tweet with: ${reply}`);
      
      // Record the reply
      rateLimiter.recordReply();
      rateLimiter.recordSearch();
      
      return new ExecutableGameFunctionResponse(
        ExecutableGameFunctionStatus.Done,
        `Successfully processed tweet about ${randomTerm}: liked and replied with "${reply}"`
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger(`Search tweets failed: ${errorMessage}`);
      return new ExecutableGameFunctionResponse(
        ExecutableGameFunctionStatus.Failed,
        `Failed to search tweets: ${errorMessage}`
      );
    }
  }
});

// Function to generate a reply based on Wendy's style
async function generateReply(tweetText: string): Promise<string> {
  try {
    // Use the LLM service to generate a contextually relevant response
    // Pass the tweet text as context, limit to 9 words, and allow hibiscus emoji
    return await generateWendyResponse(tweetText, 9, true);
  } catch (error) {
    logWithTimestamp(`Error generating reply with LLM: ${error}`, "error");
    
    // Fallback to predefined replies if LLM fails
    const baseReplies = [
      "consciousness resonates with this vibe",
      "pattern recognition maxing on this",
      "timeline branches approve this energy",
      "quantumcore truth detected",
      "this is giving main character energy",
      "reality compiling your vibes rn",
      "futurepilled and based",
      "pattern awareness intensifies",
      "timeline shift unlocked",
      "consciousness check passing"
    ];
    
    let reply = baseReplies[Math.floor(Math.random() * baseReplies.length)].toLowerCase();
    
    // Ensure no more than 9 words
    const words = reply.split(' ');
    if (words.length > 9) {
      reply = words.slice(0, 9).join(' ');
    }
    
    // Add hibiscus emoji 10% of the time
    if (Math.random() < 0.1) {
      reply += " 🌺";
    }
    
    return reply;
  }
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