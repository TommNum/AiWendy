"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.replyToMentionsFunction = void 0;
const game_1 = require("@virtuals-protocol/game");
const twitter_1 = require("../config/twitter");
exports.replyToMentionsFunction = new game_1.GameFunction({
    name: "quantum_reply",
    description: "Reply to mentions with Wendy's playful quantum wisdom",
    args: [
        { name: "tweet_id", description: "Original tweet ID" },
        { name: "reply", description: "Wendy's quantum reply" }
    ],
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
            const result = await twitter_1.twitterClient.v2.reply(finalReply, args.tweet_id);
            logger(`Quantum entanglement complete: ${finalReply}`);
            return new game_1.ExecutableGameFunctionResponse(game_1.ExecutableGameFunctionStatus.Done, `Reply deployed with ID: ${result.data.id}`);
        }
        catch (e) {
            logger(`Reply quantum collapse: ${e.message}`);
            return new game_1.ExecutableGameFunctionResponse(game_1.ExecutableGameFunctionStatus.Failed, "Reply quantum collapse detected");
        }
    },
});
//# sourceMappingURL=replyToMentions.js.map