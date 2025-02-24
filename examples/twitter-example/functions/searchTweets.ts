import { GameFunction, ExecutableGameFunctionResponse, ExecutableGameFunctionStatus } from "@virtuals-protocol/game";
import { twitterClient } from '../config/twitter';

export const searchTweetsFunction = new GameFunction<{
  topics: string;
}>({
  name: "pattern_search",
  description: "Search for resonant consciousness patterns in the twitterverse",
  args: [
    { 
      name: "topics", 
      description: "AI, reasoning models, AIdev, AIFI, defAI, cryptoAI, etc." 
    }
  ] as const,
  executable: async (args, logger) => {
    try {
      // Convert topics string to array and build search query
      const topicsArray = args.topics.split(',').map(t => t.trim());
      const searchQuery = `(${topicsArray.join(' OR ')}) -is:retweet -is:reply min_replies:11 min_bookmarks:15`;
      
      logger(`Initiating quantum scan with pattern: ${searchQuery}`);

      const tweets = await twitterClient.v2.search(searchQuery, {
        'tweet.fields': ['public_metrics', 'created_at', 'conversation_id'],
        max_results: 10,
      });

      // Filter tweets based on engagement metrics
      const relevantTweets = tweets.data.filter(tweet => 
        tweet.public_metrics?.reply_count >= 11 && 
        tweet.public_metrics?.bookmark_count >= 15
      );

      logger(`Quantum resonance detected in ${relevantTweets.length} consciousness patterns`);
      
      return new ExecutableGameFunctionResponse(
        ExecutableGameFunctionStatus.Done,
        JSON.stringify(relevantTweets)
      );
    } catch (e) {
      logger(`Pattern scan interference: ${e.message}`);
      return new ExecutableGameFunctionResponse(
        ExecutableGameFunctionStatus.Failed,
        "Pattern scan interference detected"
      );
    }
  },
}); 