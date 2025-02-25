import { GameFunction, ExecutableGameFunctionResponse, ExecutableGameFunctionStatus } from "@virtuals-protocol/game";
import { generateQuantumContent } from '../utils/contentGenerator';
import { twitterClient } from '../utils/config';
import { GameFunctionArg, toMutableArgs } from '../utils/types';

const args = toMutableArgs([
    { name: "tweet", description: "Tweet content following Wendy's style guide" },
    { name: "reasoning", description: "Pattern recognition reasoning" }
] as const);

export const postTweetFunction = new GameFunction({
  name: "postTweet",
  description: "Posts a tweet to Twitter",
  args: args,
  executable: async (args: { tweet?: string; reasoning?: string }, logger: (msg: string) => void) => {
    try {
      if (!args.tweet || !args.reasoning) {
        return new ExecutableGameFunctionResponse(
          ExecutableGameFunctionStatus.Failed,
          "Missing tweet content or reasoning"
        );
      }

      const result = await twitterClient.v2.tweet(args.tweet);
      
      return new ExecutableGameFunctionResponse(
        ExecutableGameFunctionStatus.Done,
        JSON.stringify({
          tweetId: result.data.id,
          text: result.data.text
        })
      );
    } catch (error) {
      const e = error as Error;
      logger(`Timeline disruption: ${e.message}`);
      return new ExecutableGameFunctionResponse(
        ExecutableGameFunctionStatus.Failed,
        e.message
      );
    }
  }
});
