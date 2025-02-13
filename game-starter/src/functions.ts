import {
    GameFunction,
    ExecutableGameFunctionResponse,
    ExecutableGameFunctionStatus,
} from "@virtuals-protocol/game";
import TwitterPlugin from "@virtuals-protocol/game-twitter-plugin";
import { TwitterClient } from "@virtuals-protocol/game-twitter-plugin";
import { RateLimiter } from "./rateLimiter";
import dotenv from "dotenv";

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
    private client: TwitterClient;
    private twitterPlugin: TwitterPlugin;
    private logger: (msg: string) => void;
    private rateLimits: TwitterRateLimits;

    constructor(twitterClient: TwitterClient) {
        this.client = twitterClient;
        this.logger = (msg: string) => {
            console.log('🐦 Twitter Operation:', msg);
        };

        // Initialize rate limits
        this.rateLimits = new TwitterRateLimits(this.logger);

        // Load environment variables if not already loaded
        if (!process.env.TWITTER_API_KEY) {
            dotenv.config();
        }

        // Validate Twitter credentials before initializing client
        const credentials = {
            apiKey: process.env.TWITTER_API_KEY || '',
            apiSecretKey: process.env.TWITTER_API_SECRET || '',
            accessToken: process.env.TWITTER_ACCESS_TOKEN || '',
            accessTokenSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET || ''
        };

        this.logger(`Initializing with credentials: ${JSON.stringify({
            hasApiKey: !!credentials.apiKey,
            hasApiSecret: !!credentials.apiSecretKey,
            hasAccessToken: !!credentials.accessToken,
            hasAccessTokenSecret: !!credentials.accessTokenSecret
        })}`);

        if (!credentials.apiKey || !credentials.apiSecretKey || 
            !credentials.accessToken || !credentials.accessTokenSecret) {
            throw new Error('Missing required Twitter credentials');
        }

        // Initialize Twitter plugin with validated credentials
        this.twitterPlugin = new TwitterPlugin({
            id: "twitter_worker",
            name: "Twitter Worker",
            description: "Worker for handling Twitter operations",
            twitterClient: twitterClient || new TwitterClient({
                apiKey: credentials.apiKey,
                apiSecretKey: credentials.apiSecretKey,
                accessToken: credentials.accessToken,
                accessTokenSecret: credentials.accessTokenSecret
            } as const)
        });

        // Validate plugin initialization
        if (!this.twitterPlugin || !this.twitterPlugin.searchTweetsFunction) {
            throw new Error('Failed to initialize Twitter plugin');
        }

        // Test search functionality
        this.validateTwitterSearch().catch(error => {
            this.logger(`Failed to validate Twitter search: ${error}`);
            throw error;
        });
    }

    // Add validation method for Twitter search
    private async validateTwitterSearch(): Promise<void> {
        try {
            const testResult = await this.twitterPlugin.searchTweetsFunction.executable(
                { query: "test" },
                this.logger
            );
            
            if (testResult.status === ExecutableGameFunctionStatus.Failed) {
                throw new Error(`Search validation failed: ${testResult.feedback}`);
            }
            
            this.logger('Twitter search functionality validated successfully');
        } catch (error) {
            throw new Error(`Failed to validate Twitter search: ${error}`);
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
                
                if (!args.query) {
                    return this.createResponse(
                        ExecutableGameFunctionStatus.Failed,
                        "Search query is required"
                    );
                }

                // Use the plugin's search function directly
                const result = await this.twitterPlugin.searchTweetsFunction.executable(args, logger);
                
                if (result.status === ExecutableGameFunctionStatus.Failed) {
                    this.logger(`Search failed: ${result.feedback}`);
                    return result;
                }

                try {
                    const tweets = JSON.parse(result.feedback.split('Tweets found:\n')[1]);
                    return this.createResponse(
                        ExecutableGameFunctionStatus.Done,
                        JSON.stringify(tweets)
                    );
                } catch (parseError) {
                    return this.createResponse(
                        ExecutableGameFunctionStatus.Failed,
                        `Failed to parse tweet data: ${parseError}`
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
                        try {
                            // Extract just the JSON part after "Tweets found:\n"
                            const jsonStr = newSearchResult.feedback.split('Tweets found:\n')[1];
                            const tweets = jsonStr ? JSON.parse(jsonStr) : null;
                            
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
                        } catch (parseError) {
                            this.logger(`Failed to parse tweet data: ${parseError}`);
                            return this.createResponse(
                                ExecutableGameFunctionStatus.Failed,
                                `Failed to parse tweet data: ${parseError}`
                            );
                        }
                    } else {
                        return this.createResponse(
                            ExecutableGameFunctionStatus.Failed,
                            'Failed to find alternative tweet'
                        );
                    }
                }

                // Add validation for reply content
                if (!args.reply || typeof args.reply !== 'string') {
                    return this.createResponse(
                        ExecutableGameFunctionStatus.Failed,
                        'Reply content is required and must be a string'
                    );
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
                this.logger(`Reply error: ${errorMessage}`);
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