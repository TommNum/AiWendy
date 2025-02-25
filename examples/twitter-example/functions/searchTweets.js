"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchTweetsFunction = void 0;
const game_1 = require("@virtuals-protocol/game");
const twitter_1 = require("../config/twitter");
exports.searchTweetsFunction = new game_1.GameFunction({
    name: "pattern_search",
    description: "Search for resonant consciousness patterns in the twitterverse",
    args: [
        {
            name: "topics",
            description: "AI, reasoning models, AIdev, AIFI, defAI, cryptoAI, etc."
        }
    ],
    executable: async (args, logger) => {
        try {
            // Convert topics string to array and build search query
            const topicsArray = args.topics.split(',').map(t => t.trim());
            const searchQuery = `(${topicsArray.join(' OR ')}) -is:retweet -is:reply min_replies:11 min_bookmarks:15`;
            logger(`Initiating quantum scan with pattern: ${searchQuery}`);
            const tweets = await twitter_1.twitterClient.v2.search(searchQuery, {
                'tweet.fields': ['public_metrics', 'created_at', 'conversation_id'],
                max_results: 10,
            });
            // Filter tweets based on engagement metrics
            const relevantTweets = tweets.data.filter(tweet => tweet.public_metrics?.reply_count >= 11 &&
                tweet.public_metrics?.bookmark_count >= 15);
            logger(`Quantum resonance detected in ${relevantTweets.length} consciousness patterns`);
            return new game_1.ExecutableGameFunctionResponse(game_1.ExecutableGameFunctionStatus.Done, JSON.stringify(relevantTweets));
        }
        catch (e) {
            logger(`Pattern scan interference: ${e.message}`);
            return new game_1.ExecutableGameFunctionResponse(game_1.ExecutableGameFunctionStatus.Failed, "Pattern scan interference detected");
        }
    },
});
//# sourceMappingURL=searchTweets.js.map