import { GameFunction, ExecutableGameFunctionResponse, ExecutableGameFunctionStatus } from "@virtuals-protocol/game";
import { twitterClient } from '../utils/config';

export const searchTweetsFunction = new GameFunction({
  name: "searchTweets",
  description: "Search for tweets based on topics",
  args: [
    { name: "topics", description: "Comma-separated list of topics to search for" }
  ] as const,
  executable: async (args: { topics?: string }, logger: (msg: string) => void) => {
    try {
      if (!args.topics) {
        return new ExecutableGameFunctionResponse(
          ExecutableGameFunctionStatus.Failed,
          "No topics provided"
        );
      }

      const topicsArray = args.topics.split(',').map((t: string) => t.trim());
      const query = topicsArray.join(' OR ');
      
      const tweets = await twitterClient.v2.search(query);
      
      return new ExecutableGameFunctionResponse(
        ExecutableGameFunctionStatus.Done,
        JSON.stringify(tweets.data)
      );
    } catch (error) {
      const e = error as Error;
      logger(`Pattern scan interference: ${e.message}`);
      return new ExecutableGameFunctionResponse(
        ExecutableGameFunctionStatus.Failed,
        e.message
      );
    }
  }
}); 