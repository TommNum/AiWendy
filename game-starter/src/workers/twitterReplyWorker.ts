import { GameWorker } from "@virtuals-protocol/game";
import { getMentionsFunction, replyToTweetFunction } from "../functions";

// Twitter reply worker
export const twitterReplyWorker = new GameWorker({
    id: "twitter_reply_worker",
    name: "Twitter Reply Worker",
    description: "Monitors for mentions of @AiWendy on Twitter and replies to them in Wendy's style with the goal in mind of capturing attention and getting them to understand who is incharge of Culture DAO simply by being a master at engaging and capturing attention.",
    getEnvironment: async () => {
        return {
            twitter_handle: process.env.TWITTER_HANDLE || "AiWendy",
            last_check: new Date().toISOString()
        };
    },
    functions: [
        getMentionsFunction,
        replyToTweetFunction
    ]
}); 