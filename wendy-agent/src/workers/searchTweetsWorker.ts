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
        logger(`Search rate limited: Need to wait ${waitTimeSeconds} seconds before next search`);
        return new ExecutableGameFunctionResponse(
          ExecutableGameFunctionStatus.Failed,
          `Search rate limited: Next search possible in ${waitTimeSeconds} seconds`
        );
      }
      
      // Check if we've reached the maximum replies per hour
      if (!rateLimiter.canReply()) {
        logger(`Reply rate limited: Maximum replies per hour reached (50)`);
        return new ExecutableGameFunctionResponse(
          ExecutableGameFunctionStatus.Failed,
          `Reply rate limited: Maximum replies per hour reached (50)`
        );
      }
      
      // Search for relevant tweets
      const searchTerms = [
        "AI", "LLM", "OpenAI", "Claude", "Anthropic", "Deep Research", "AIdev", 
        "AIFI", "defAI", "cryptoAI", "AI protocols", "TAO", "Memes"
      ];
      
      // Randomly select one of the search terms
      const randomTerm = searchTerms[Math.floor(Math.random() * searchTerms.length)];
      logger(`Searching for tweets about: ${randomTerm}`);
      
      // Search for tweets with the selected term
      const searchResults = await searchTweets(`${randomTerm} -is:retweet`, {
        "tweet.fields": ["public_metrics", "conversation_id", "created_at"],
        "user.fields": ["username"],
        "expansions": ["author_id"],
        "max_results": 10
      });
      
      if (!searchResults.data || searchResults.data.length === 0) {
        logger(`No tweets found for search term: ${randomTerm}`);
        rateLimiter.recordSearch();
        return new ExecutableGameFunctionResponse(
          ExecutableGameFunctionStatus.Done,
          `No tweets found for search term: ${randomTerm}`
        );
      }
      
      // Filter tweets with >11 replies and >15 bookmarks
      // Also filter out tweets we've already processed
      const relevantTweets = searchResults.data.filter(tweet => {
        const metrics = tweet.public_metrics;
        return metrics && 
               metrics.reply_count > 11 && 
               metrics.bookmark_count > 15 &&
               !processedTweets.has(tweet.id);
      });
      
      if (relevantTweets.length === 0) {
        logger(`No new relevant tweets found with >11 replies and >15 bookmarks for term: ${randomTerm}`);
        rateLimiter.recordSearch();
        return new ExecutableGameFunctionResponse(
          ExecutableGameFunctionStatus.Done,
          `No tweets met the criteria for term: ${randomTerm}`
        );
      }
      
      // Process the first relevant tweet
      const tweet = relevantTweets[0];
      logger(`Found relevant tweet: ${tweet.text}`);
      
      // Mark this tweet as processed
      processedTweets.add(tweet.id);
      
      // Get the author's ID
      // Use a query directly if the includes property doesn't exist
      let authorId: string;
      if (searchResults.includes && searchResults.includes.users && searchResults.includes.users.length > 0) {
        authorId = searchResults.includes.users[0].id;
      } else {
        const userInfo = await roClient.v2.userByUsername(tweet.author_id);
        authorId = userInfo.data.id;
      }
      
      // Like the tweet
      await rwClient.v2.like(authorId, tweet.id);
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
  // Apply Wendy's replying rules:
  // - lowercase only
  // - no hashtags
  // - no more than 9 words
  // - hibiscus emoji only 10% of the time
  // - reference the overall topic in less than 11 words
  
  // In a real implementation, you would use an LLM call here to generate
  // a contextually relevant response based on the tweet content
  
  // Simulate a generated reply
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

// Function to get environment/state for the worker
async function getSearchTweetsEnvironment() {
  const status = rateLimiter.getRateLimitStatus();
  
  let userId = "";
  try {
    const userInfo = await roClient.v2.me();
    userId = userInfo.data.id;
  } catch (error) {
    logWithTimestamp(`Error getting user ID: ${error}`, 'error');
  }
  
  return {
    userId,
    processedTweetCount: processedTweets.size,
    repliesThisHour: rateLimiter.getHourlyReplyCount(),
    canSearchNow: rateLimiter.canSearch(),
    canReplyNow: rateLimiter.canReply(),
    nextSearchIn: status.nextSearchAvailableIn,
    repliesRemaining: status.repliesRemaining
  };
}

// Create and export the searchTweetsWorker
export const searchTweetsWorker = new GameWorker({
  id: "search_tweets_worker",
  name: "Tweet Searcher",
  description: "Searches for tweets related to AI, tech, memes, and other relevant topics. Identifies tweets with high engagement, likes them, and replies with contextual responses aligned with Wendy's personality.",
  functions: [searchTweetsFunction],
  getEnvironment: getSearchTweetsEnvironment
}); 