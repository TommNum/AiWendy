import { GameFunction, ExecutableGameFunctionResponse, ExecutableGameFunctionStatus } from "@virtuals-protocol/game";
import { generateQuantumContent } from '../utils/contentGenerator';
import { twitterClient } from '../utils/config';
import { GameFunctionArg, toMutableArgs } from '../utils/types';
import { logGeneratedContent } from '../utils/contentLogger';

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
        logGeneratedContent(args.tweet || '', args.reasoning || '', 'failed');
        return new ExecutableGameFunctionResponse(
          ExecutableGameFunctionStatus.Failed,
          "Missing tweet content or reasoning"
        );
      }

      // Log the generated content before posting
      logGeneratedContent(args.tweet, args.reasoning, 'generated');

      const result = await twitterClient.v2.tweet(args.tweet);
      
      // Log successful posting
      logGeneratedContent(args.tweet, args.reasoning, 'posted', result.data.id);
      
      return new ExecutableGameFunctionResponse(
        ExecutableGameFunctionStatus.Done,
        JSON.stringify({
          tweetId: result.data.id,
          text: result.data.text,
          timestamp: new Date().toISOString()
        })
      );
    } catch (error) {
      const e = error as Error;
      logGeneratedContent(args.tweet || '', args.reasoning || '', 'failed');
      return new ExecutableGameFunctionResponse(
        ExecutableGameFunctionStatus.Failed,
        e.message
      );
    }
  }
});
