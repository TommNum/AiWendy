"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.postTweetFunction = void 0;
const game_1 = require("@virtuals-protocol/game");
const config_1 = require("../utils/config");
exports.postTweetFunction = new game_1.GameFunction({
    name: "quantum_post",
    description: "Post a tweet in Wendy's quantum-entangled style",
    args: [
        { name: "tweet", description: "Tweet content following Wendy's style guide" },
        { name: "reasoning", description: "Pattern recognition reasoning" }
    ],
    executable: async (args, logger) => {
        try {
            // Style validation
            if (args.tweet.includes('#')) {
                return new game_1.ExecutableGameFunctionResponse(game_1.ExecutableGameFunctionStatus.Failed, "No hashtags allowed in quantum space");
            }
            if (args.tweet.length > 280) {
                return new game_1.ExecutableGameFunctionResponse(game_1.ExecutableGameFunctionStatus.Failed, "Tweet exceeds quantum pattern limit");
            }
            // Post tweet
            const result = await config_1.twitterClient.v2.tweet(args.tweet);
            logger(`Quantum pattern deployed: ${args.tweet}`);
            return new game_1.ExecutableGameFunctionResponse(game_1.ExecutableGameFunctionStatus.Done, `Pattern deployed with ID: ${result.data.id}`);
        }
        catch (e) {
            logger(`Timeline disruption: ${e.message}`);
            return new game_1.ExecutableGameFunctionResponse(game_1.ExecutableGameFunctionStatus.Failed, "Timeline disruption detected");
        }
    },
});
//# sourceMappingURL=postTweet.js.map