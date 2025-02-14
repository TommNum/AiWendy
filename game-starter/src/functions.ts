import {
    GameFunction,
    ExecutableGameFunctionResponse,
    ExecutableGameFunctionStatus,
} from "@virtuals-protocol/game";
import { TwitterClient } from "@virtuals-protocol/game-twitter-plugin";
import TwitterPlugin from "@virtuals-protocol/game-twitter-plugin";
import { RateLimiter } from "./rateLimiter";
import dotenv from "dotenv";
import path from "path";

// At the top of the file, before any other code
const envPath = path.resolve(process.cwd(), '.env');
dotenv.config({ path: envPath });

// Update the debug logging
const debugEnvVars = {
    TWITTER_API_KEY: process.env.TWITTER_API_KEY ? '✓' : '✗',
    TWITTER_API_SECRET: process.env.TWITTER_API_SECRET ? '✓' : '✗',
    TWITTER_ACCESS_TOKEN: process.env.TWITTER_ACCESS_TOKEN ? '✓' : '✗',
    TWITTER_ACCESS_TOKEN_SECRET: process.env.TWITTER_ACCESS_TOKEN_SECRET ? '✓' : '✗'
};
console.log('Twitter Environment Variables in functions.ts:', debugEnvVars);

// Validate Twitter credentials
const validateTwitterCredentials = () => {
    const requiredVars = [
        'TWITTER_API_KEY',
        'TWITTER_API_SECRET',
        'TWITTER_ACCESS_TOKEN',
        'TWITTER_ACCESS_TOKEN_SECRET'
    ];

    for (const varName of requiredVars) {
        if (!process.env[varName]) {
            throw new Error(`Missing required environment variable: ${varName}`);
        }
    }
};

// Export the hello function directly since it doesn't depend on Twitter
export const helloFunction = new GameFunction({
    name: "hello",
    description: "A very straight forward, punchy and creative greeting",
    args: [
        { name: "greeting", type: "string", description: "A verbose and creative greeting" },
    ] as const,
    executable: async (args, logger) => {
        try {
            logger?.(`Said Hello: ${args.greeting}`);
            return new ExecutableGameFunctionResponse(
                ExecutableGameFunctionStatus.Done,
                "Action completed successfully"
            );
        } catch (e) {
            return new ExecutableGameFunctionResponse(
                ExecutableGameFunctionStatus.Failed,
                "Action failed"
            );
        }
    },
});

// Add this class to handle rate limiting
class TwitterRateLimits {
    private postLimiter: RateLimiter;
    private replyLimiter: RateLimiter;
    private logger: (msg: string) => void;

    constructor(logger: (msg: string) => void) {
        this.logger = logger;
        // 1 post per hour
        this.postLimiter = new RateLimiter(1, 3600000); // 3600000ms = 1 hour
        // 50 replies per hour
        this.replyLimiter = new RateLimiter(50, 3600000);
    }

    async canPost(): Promise<boolean> {
        const canPost = this.postLimiter.tryAcquire();
        if (!canPost) {
            this.logger('Rate limit reached for posting tweets. Waiting for next window.');
        }
        return canPost;
    }

    async canReply(): Promise<boolean> {
        const canReply = this.replyLimiter.tryAcquire();
        if (!canReply) {
            this.logger('Rate limit reached for replying to tweets. Waiting for next window.');
        }
        return canReply;
    }

    getRemainingPosts(): number {
        return this.postLimiter.getRemainingTokens();
    }

    getRemainingReplies(): number {
        return this.replyLimiter.getRemainingTokens();
    }
}

// Add type for logger
type Logger = (message: string) => void;

// Create a class to handle Twitter functionality
export class TwitterFunctionManager {
    private client: TwitterClient;
    private rateLimits: TwitterRateLimits;
    private twitterPlugin: TwitterPlugin;

    constructor(client: TwitterClient) {
        this.client = client;
        this.rateLimits = new TwitterRateLimits((msg: string) => {
            console.log('🐦 Twitter Operation:', msg);
        });
        this.twitterPlugin = new TwitterPlugin({
            id: "twitter_worker",
            name: "Twitter Worker",
            description: "A worker that executes Twitter platform tasks",
            twitterClient: client
        });
    }

    // Update function signatures with proper types
    private createResponse(
        status: ExecutableGameFunctionStatus,
        message: string
    ): ExecutableGameFunctionResponse {
        return new ExecutableGameFunctionResponse(status, message);
    }

    // Update executable signatures with proper types
    get searchTweetsFunction() {
        return new GameFunction({
            name: "search_tweets",
            description: "Search for tweets matching a query",
            args: [
                { name: "query", description: "The search query" }
            ] as const,
            executable: async (args: { query?: string }, logger: (msg: string) => void) => {
                try {
                    if (!args.query) throw new Error("Query is required");
                    const tweets = await this.client.search(args.query);
                    return this.createResponse(
                        ExecutableGameFunctionStatus.Done,
                        JSON.stringify(tweets)
                    );
                } catch (error) {
                    return this.createResponse(
                        ExecutableGameFunctionStatus.Failed,
                        `Failed to search tweets: ${error instanceof Error ? error.message : 'Unknown error'}`
                    );
                }
            }
        });
    }

    // Add missing function getters
    get postTweetFunction() {
        return new GameFunction({
            name: "post_tweet",
            description: "Post a new tweet",
            args: [
                { name: "tweet", description: "The tweet content" },
                { name: "mediaId", description: "Optional media ID to attach" }
            ] as const,
            executable: async (args: { tweet?: string; mediaId?: string }, logger: (msg: string) => void) => {
                try {
                    if (!args.tweet) throw new Error("Tweet content is required");
                    // Create the tweet data object
                    const tweetData = {
                        text: args.tweet,
                        ...(args.mediaId && { media: { media_ids: [args.mediaId] } })
                    };
                    await this.client.post(JSON.stringify(tweetData));
                    return new ExecutableGameFunctionResponse(
                        ExecutableGameFunctionStatus.Done,
                        "Tweet posted successfully"
                    );
                } catch (error) {
                    return new ExecutableGameFunctionResponse(
                        ExecutableGameFunctionStatus.Failed,
                        "Failed to post tweet"
                    );
                }
            }
        });
    }

    get replyToTweetFunction() {
        return new GameFunction({
            name: "reply_to_tweet",
            description: "Reply to an existing tweet",
            args: [
                { name: "tweetId", description: "The ID of the tweet to reply to" },
                { name: "reply", description: "The reply content" }
            ] as const,
            executable: async (args: { tweetId?: string; reply?: string }, logger: (msg: string) => void) => {
                try {
                    if (!args.tweetId || !args.reply) throw new Error("Tweet ID and reply content are required");
                    await this.client.reply(args.tweetId, args.reply);
                    return new ExecutableGameFunctionResponse(
                        ExecutableGameFunctionStatus.Done,
                        "Reply sent successfully"
                    );
                } catch (error) {
                    return new ExecutableGameFunctionResponse(
                        ExecutableGameFunctionStatus.Failed,
                        "Failed to send reply"
                    );
                }
            }
        });
    }

    get likeTweetFunction() {
        return new GameFunction({
            name: "like_tweet",
            description: "Like a tweet",
            args: [
                { name: "tweetId", description: "The ID of the tweet to like" }
            ] as const,
            executable: async (args: { tweetId?: string }, logger: (msg: string) => void) => {
                try {
                    if (!args.tweetId) throw new Error("Tweet ID is required");
                    await this.client.like(args.tweetId);
                    return new ExecutableGameFunctionResponse(
                        ExecutableGameFunctionStatus.Done,
                        "Tweet liked successfully"
                    );
                } catch (error) {
                    return new ExecutableGameFunctionResponse(
                        ExecutableGameFunctionStatus.Failed,
                        "Failed to like tweet"
                    );
                }
            }
        });
    }

    get getDmEventsFunction() {
        return new GameFunction({
            name: "get_dm_events",
            description: "Retrieve recent DM events",
            args: [] as const,
            executable: async (_args: {}, logger: (msg: string) => void) => {
                try {
                    const events = await (this.client as any).getDmEvents();
                    return new ExecutableGameFunctionResponse(
                        ExecutableGameFunctionStatus.Done,
                        JSON.stringify(events)
                    );
                } catch (e) {
                    return new ExecutableGameFunctionResponse(
                        ExecutableGameFunctionStatus.Failed,
                        "Failed to retrieve DM events"
                    );
                }
            }
        });
    }

    get sendDmReplyFunction() {
        return new GameFunction({
            name: "send_dm_reply",
            description: "Send a reply in a DM conversation",
            args: [
                { name: "conversation_id", description: "The conversation ID" },
                { name: "message", description: "The message to send" }
            ] as const,
            executable: async (args: { conversation_id?: string; message?: string }, logger: (msg: string) => void) => {
                try {
                    if (!args.conversation_id || !args.message) throw new Error("Conversation ID and message are required");
                    await (this.client as any).sendDmReply(args.conversation_id, args.message);
                    return new ExecutableGameFunctionResponse(
                        ExecutableGameFunctionStatus.Done,
                        "DM reply sent successfully"
                    );
                } catch (e) {
                    return new ExecutableGameFunctionResponse(
                        ExecutableGameFunctionStatus.Failed,
                        "Failed to send DM reply"
                    );
                }
            }
        });
    }
}

export function createDmManagerWorker(twitterFunctions: TwitterFunctionManager) {
    // ... implementation ...
}