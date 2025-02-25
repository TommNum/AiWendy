import { GameFunction, ExecutableGameFunctionResponse, ExecutableGameFunctionStatus } from "@virtuals-protocol/game";
import { twitterClient } from '../utils/config';

export const replyToMentionsFunction = new GameFunction({
  name: "replyToMentions",
  description: "Reply to mentions on Twitter",
  args: [
    { name: "tweet_id", description: "ID of the tweet to reply to" },
    { name: "reply", description: "Reply content" }
  ] as const,
  executable: async (args: { tweet_id?: string; reply?: string }, logger: (msg: string) => void) => {
    try {
      if (!args.reply || !args.tweet_id) {
        return new ExecutableGameFunctionResponse(
          ExecutableGameFunctionStatus.Failed,
          "Missing reply content or tweet ID"
        );
      }

      const reply = args.reply.toLowerCase();
      const result = await twitterClient.v2.reply(reply, args.tweet_id);

      return new ExecutableGameFunctionResponse(
        ExecutableGameFunctionStatus.Done,
        JSON.stringify({
          replyId: result.data.id,
          text: result.data.text
        })
      );
    } catch (error) {
      const e = error as Error;
      logger(`Reply quantum collapse: ${e.message}`);
      return new ExecutableGameFunctionResponse(
        ExecutableGameFunctionStatus.Failed,
        e.message
      );
    }
  }
}); 