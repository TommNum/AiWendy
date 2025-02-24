import { GameFunction, ExecutableGameFunctionResponse, ExecutableGameFunctionStatus } from "@virtuals-protocol/game";
import { twitterClient } from '../config/twitter';

export const replyToMentionsFunction = new GameFunction<{
  tweet_id: string;
  reply: string;
}>({
  name: "quantum_reply",
  description: "Reply to mentions with Wendy's playful quantum wisdom",
  args: [
    { name: "tweet_id", description: "Original tweet ID" },
    { name: "reply", description: "Wendy's quantum reply" }
  ] as const,
  executable: async (args, logger) => {
    try {
      // Apply Wendy's style rules
      let reply = args.reply.toLowerCase();
      
      // Ensure reply is not too long
      if (reply.split(' ').length > 9) {
        reply = reply.split(' ').slice(0, 9).join(' ');
      }
      
      // Add hibiscus emoji 10% of the time
      const includeHibiscus = Math.random() < 0.1;
      const finalReply = includeHibiscus ? `${reply} ❀` : reply;

      // Post reply
      const result = await twitterClient.v2.reply(
        finalReply,
        args.tweet_id
      );

      logger(`Quantum entanglement complete: ${finalReply}`);
      
      return new ExecutableGameFunctionResponse(
        ExecutableGameFunctionStatus.Done,
        `Reply deployed with ID: ${result.data.id}`
      );
    } catch (e) {
      logger(`Reply quantum collapse: ${e.message}`);
      return new ExecutableGameFunctionResponse(
        ExecutableGameFunctionStatus.Failed,
        "Reply quantum collapse detected"
      );
    }
  },
}); 