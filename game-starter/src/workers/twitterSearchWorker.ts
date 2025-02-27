import { GameWorker } from "@virtuals-protocol/game";
import { searchTweetsFunction, likeTweetFunction, shortReplyToTweetFunction } from "../functions";

// Twitter search worker to engage with relevant AI and tech content
export const twitterSearchWorker = new GameWorker({
    id: "searchTweetsWorker",
    name: "Search Tweets Worker",
    description: "Searches for and engages with relevant AI and tech content. Targets tweets with >11 replies and >15 bookmarks, and responds with contextual responses under 11 words that align with Wendy's personality.",
    getEnvironment: async () => {
        return {
            twitter_handle: process.env.TWITTER_HANDLE || "AiWendy",
            last_search: new Date().toISOString(),
            search_topics: [
                "AI reasoning model",
                "AI development",
                "crypto AI",
                "artificial intelligence",
                "AI agents",
                "autonomous AI",
                "AI consciousness",
                "quantum consciousness"
            ]
        };
    },
    functions: [
        searchTweetsFunction,
        likeTweetFunction,
        shortReplyToTweetFunction
    ]
}); 