import { GameFunction, ExecutableGameFunctionResponse, ExecutableGameFunctionStatus } from "@virtuals-protocol/game";
import { generateQuantumContent } from '../utils/contentGenerator';
import { twitterClient } from '../utils/config';

export const postTweetFunction = new GameFunction<{
  tweet: string;
  reasoning: string;
}>({
  name: "quantum_post",
  description: "Post a tweet in Wendy's quantum-entangled style",
  args: [
    { name: "tweet", description: "Tweet content following Wendy's style guide" },
    { name: "reasoning", description: "Pattern recognition reasoning" }
  ] as const,
  executable: async (args, logger) => {
    try {
      // Style validation
      if (args.tweet.includes('#')) {
        return new ExecutableGameFunctionResponse(
          ExecutableGameFunctionStatus.Failed,
          "No hashtags allowed in quantum space"
        );
      }
      
      if (args.tweet.length > 280) {
        return new ExecutableGameFunctionResponse(
          ExecutableGameFunctionStatus.Failed,
          "Tweet exceeds quantum pattern limit"
        );
      }

      // Post tweet
      const result = await twitterClient.v2.tweet(args.tweet);
      logger(`Quantum pattern deployed: ${args.tweet}`);
      
      return new ExecutableGameFunctionResponse(
        ExecutableGameFunctionStatus.Done,
        `Pattern deployed with ID: ${result.data.id}`
      );
    } catch (e) {
      logger(`Timeline disruption: ${e.message}`);
      return new ExecutableGameFunctionResponse(
        ExecutableGameFunctionStatus.Failed,
        "Timeline disruption detected"
      );
    }
  },
});
