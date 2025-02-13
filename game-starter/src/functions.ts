import {
    GameFunction,
    ExecutableGameFunctionResponse,
    ExecutableGameFunctionStatus,
} from "@virtuals-protocol/game";
import TwitterPlugin from "@virtuals-protocol/game-twitter-plugin";
import { TwitterClient } from "@virtuals-protocol/game-twitter-plugin";
import { RateLimiter } from "./rateLimiter";

// Debug environment variables (keep this for debugging)
console.log('Twitter Environment Variables in functions.ts:', {
    TWITTER_API_KEY: process.env.TWITTER_API_KEY,
    TWITTER_API_SECRET: process.env.TWITTER_API_SECRET,
    TWITTER_ACCESS_TOKEN: process.env.TWITTER_ACCESS_TOKEN,
    TWITTER_ACCESS_TOKEN_SECRET: process.env.TWITTER_ACCESS_TOKEN_SECRET
});

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

// Create a class to handle Twitter functionality
export class TwitterFunctionManager {
    private twitterPlugin: TwitterPlugin;
    private logger: (msg: string) => void;
    private rateLimits: TwitterRateLimits;

    constructor(twitterClient: TwitterClient) {
        this.logger = (msg: string) => {
            console.log('🐦 Twitter Operation:', msg);
        };
        this.rateLimits = new TwitterRateLimits(this.logger);

        // Validate Twitter client
        if (!twitterClient) {
            throw new Error('Twitter client is required');
        }

        // Log Twitter client state
        this.logger(`Initializing with Twitter client: ${JSON.stringify({
            hasClient: !!twitterClient,
            hasSearchMethod: !!(twitterClient as any).search || !!(twitterClient as any).v2?.search,
        })}`);

        this.twitterPlugin = new TwitterPlugin({
            id: "twitter_worker",
            name: "Twitter Worker",
            description: "Worker for handling Twitter operations",
            twitterClient: twitterClient
        });

        // Validate plugin initialization
        if (!this.twitterPlugin || !this.twitterPlugin.searchTweetsFunction) {
            throw new Error('Failed to initialize Twitter plugin');
        }

        // Test Twitter client connection
        this.validateTwitterClient().catch(error => {
            this.logger(`Failed to validate Twitter client: ${error}`);
            throw error;
        });
    }

    private async validateTwitterClient() {
        try {
            // Use public methods instead of accessing private twitterClient
            const testResponse = await this.twitterPlugin.searchTweetsFunction.executable(
                { query: "test" },
                this.logger
            );
            this.logger('Twitter client validated successfully');
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger(`Twitter client validation failed: ${errorMessage}`);
            throw error;
        }
    }

    private createResponse(status: ExecutableGameFunctionStatus, feedback: string): ExecutableGameFunctionResponse {
        return new ExecutableGameFunctionResponse(status, feedback);
    }

    // Modify postTweetFunction
    get postTweetFunction() { 
        const fn = this.twitterPlugin.postTweetFunction;
        fn.executable = async (args, logger) => {
            try {
                if (!await this.rateLimits.canPost()) {
                    return this.createResponse(
                        ExecutableGameFunctionStatus.Failed,
                        `Rate limit reached: Can post again in ${this.rateLimits.getRemainingPosts()} minutes`
                    );
                }

                this.logger(`Attempting to post tweet: ${JSON.stringify(args)}`);
                const result = await this.twitterPlugin.postTweetFunction.executable(args, logger);
                this.logger(`Tweet post result: ${JSON.stringify(result)}`);
                return result;
            } catch (error: unknown) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                return this.createResponse(
                    ExecutableGameFunctionStatus.Failed,
                    `Failed to post tweet: ${errorMessage}`
                );
            }
        };
        return fn;
    }

    get searchTweetsFunction() {
        const fn = this.twitterPlugin.searchTweetsFunction;
        fn.executable = async (args, logger) => {
            try {
                this.logger(`Searching tweets with: ${JSON.stringify(args)}`);
                
                // Validate query
                if (!args.query) {
                    return this.createResponse(
                        ExecutableGameFunctionStatus.Failed,
                        "Search query is required"
                    );
                }

                // Add error handling and logging for the Twitter client
                if (!this.twitterPlugin || !this.twitterPlugin.searchTweetsFunction) {
                    this.logger('Twitter client or search function not properly initialized');
                    return this.createResponse(
                        ExecutableGameFunctionStatus.Failed,
                        "Twitter client not properly initialized"
                    );
                }

                const result = await this.twitterPlugin.searchTweetsFunction.executable(args, logger);
                
                // Add detailed logging
                this.logger(`Raw search result: ${JSON.stringify(result)}`);
                
                if (result.status === ExecutableGameFunctionStatus.Failed) {
                    return this.createResponse(
                        ExecutableGameFunctionStatus.Failed,
                        `Search failed: ${result.feedback}`
                    );
                }

                // Parse and validate the tweets
                try {
                    const tweets = JSON.parse(result.feedback);
                    if (!Array.isArray(tweets)) {
                        throw new Error('Invalid tweet data format');
                    }
                    return this.createResponse(
                        ExecutableGameFunctionStatus.Done,
                        JSON.stringify(tweets)
                    );
                } catch (parseError) {
                    this.logger(`Failed to parse tweet data: ${parseError}`);
                    return this.createResponse(
                        ExecutableGameFunctionStatus.Failed,
                        `Failed to parse tweet data: ${result.feedback}`
                    );
                }
            } catch (error: unknown) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                this.logger(`Search error: ${errorMessage}`);
                return this.createResponse(
                    ExecutableGameFunctionStatus.Failed,
                    `Failed to search tweets: ${errorMessage}`
                );
            }
        };
        return fn;
    }

    // Modify replyToTweetFunction
    get replyToTweetFunction() { 
        const fn = this.twitterPlugin.replyTweetFunction;
        fn.executable = async (args, logger) => {
            try {
                if (!await this.rateLimits.canReply()) {
                    return this.createResponse(
                        ExecutableGameFunctionStatus.Failed,
                        `Rate limit reached: Can reply again in ${this.rateLimits.getRemainingReplies()} minutes`
                    );
                }

                this.logger(`Attempting to reply to tweet: ${JSON.stringify(args)}`);
                
                // First try to find the specific tweet
                const searchResult = await this.twitterPlugin.searchTweetsFunction.executable(
                    { query: `id:${args.tweet_id}` },
                    logger
                );
                
                if (searchResult.status === ExecutableGameFunctionStatus.Failed) {
                    // If the specific tweet is not found, try to find a recent relevant tweet
                    const newSearchResult = await this.twitterPlugin.searchTweetsFunction.executable(
                        { query: "blockchain protocols OR agentic networks -is:retweet" },
                        logger
                    );

                    if (newSearchResult.status === ExecutableGameFunctionStatus.Done) {
                        const tweets = JSON.parse(newSearchResult.feedback);
                        if (tweets && tweets.length > 0) {
                            // Update the tweet_id to the most recent relevant tweet
                            args.tweet_id = tweets[0].tweetId;
                            this.logger(`Updating to reply to tweet: ${args.tweet_id}`);
                        } else {
                            return this.createResponse(
                                ExecutableGameFunctionStatus.Failed,
                                'No suitable tweets found to reply to'
                            );
                        }
                    } else {
                        return this.createResponse(
                            ExecutableGameFunctionStatus.Failed,
                            'Failed to find alternative tweet'
                        );
                    }
                }

                // Attempt the reply
                const result = await this.twitterPlugin.replyTweetFunction.executable(args, logger);
                this.logger(`Reply result: ${JSON.stringify(result)}`);
                
                return this.createResponse(
                    result.status,
                    result.status === ExecutableGameFunctionStatus.Done 
                        ? `Successfully replied to tweet ${args.tweet_id}`
                        : `Failed to reply to tweet: ${result.feedback}`
                );
            } catch (error: unknown) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                return this.createResponse(
                    ExecutableGameFunctionStatus.Failed,
                    `Failed to reply to tweet: ${errorMessage}`
                );
            }
        };
        return fn;
    }

    get likeTweetFunction() { 
        const fn = this.twitterPlugin.likeTweetFunction;
        fn.executable = async (args, logger) => {
            try {
                this.logger(`Attempting to like tweet: ${JSON.stringify(args)}`);
                const result = await this.twitterPlugin.likeTweetFunction.executable(args, logger);
                this.logger(`Like result: ${JSON.stringify(result)}`);
                return this.createResponse(
                    result.status,
                    `Successfully liked tweet ${args.tweet_id}`
                );
            } catch (error: unknown) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                return this.createResponse(
                    ExecutableGameFunctionStatus.Failed,
                    `Failed to like tweet: ${errorMessage}`
                );
            }
        };
        return fn;
    }

    get quoteTweetFunction() { 
        const fn = this.twitterPlugin.quoteTweetFunction;
        fn.executable = async (args, logger) => {
            try {
                this.logger(`Attempting to quote tweet: ${JSON.stringify(args)}`);
                const result = await this.twitterPlugin.quoteTweetFunction.executable(args, logger);
                this.logger(`Quote result: ${JSON.stringify(result)}`);
                return this.createResponse(
                    result.status,
                    `Successfully quoted tweet ${args.tweet_id}`
                );
            } catch (error: unknown) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                return this.createResponse(
                    ExecutableGameFunctionStatus.Failed,
                    `Failed to quote tweet: ${errorMessage}`
                );
            }
        };
        return fn;
    }
}