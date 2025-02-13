import {
    GameFunction,
    ExecutableGameFunctionResponse,
    ExecutableGameFunctionStatus,
} from "@virtuals-protocol/game";
import TwitterPlugin from "@virtuals-protocol/game-twitter-plugin";
import { TwitterClient } from "@virtuals-protocol/game-twitter-plugin";

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

// Create a class to handle Twitter functionality
export class TwitterFunctionManager {
    private twitterPlugin: TwitterPlugin;
    private logger: (msg: string) => void;

    constructor(twitterClient: TwitterClient) {
        this.logger = (msg: string) => {
            console.log('🐦 Twitter Operation:', msg);
        };

        // Validate Twitter client
        if (!twitterClient) {
            throw new Error('Twitter client is required');
        }

        this.twitterPlugin = new TwitterPlugin({
            id: "twitter_worker",
            name: "Twitter Worker",
            description: "Worker for handling Twitter operations",
            twitterClient: twitterClient
        });

        // Test Twitter client connection
        this.validateTwitterClient();
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

    // Wrap the Twitter functions with logging
    get postTweetFunction() { 
        const fn = this.twitterPlugin.postTweetFunction;
        fn.executable = async (args, logger) => {
            this.logger(`Attempting to post tweet: ${JSON.stringify(args)}`);
            const result = await this.twitterPlugin.postTweetFunction.executable(args, logger);
            this.logger(`Tweet post result: ${JSON.stringify(result)}`);
            return result;
        };
        return fn;
    }

    get searchTweetsFunction() {
        const fn = this.twitterPlugin.searchTweetsFunction;
        fn.executable = async (args, logger) => {
            try {
                this.logger(`Searching tweets with: ${JSON.stringify(args)}`);
                const result = await this.twitterPlugin.searchTweetsFunction.executable(args, logger);
                this.logger(`Search result: ${JSON.stringify(result)}`);
                return this.createResponse(
                    result.status,
                    result.feedback || 'Search completed successfully'
                );
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

    get replyToTweetFunction() { 
        const fn = this.twitterPlugin.replyTweetFunction;
        fn.executable = async (args, logger) => {
            try {
                this.logger(`Attempting to reply to tweet: ${JSON.stringify(args)}`);
                
                const searchResult = await this.twitterPlugin.searchTweetsFunction.executable(
                    { query: `id:${args.tweet_id}` },
                    logger
                );
                
                if (searchResult.status === ExecutableGameFunctionStatus.Failed) {
                    return this.createResponse(
                        ExecutableGameFunctionStatus.Failed,
                        'Tweet not found or inaccessible'
                    );
                }

                const result = await this.twitterPlugin.replyTweetFunction.executable(args, logger);
                
                if (result.status === ExecutableGameFunctionStatus.Failed) {
                    const errorMsg = result.feedback || 'Failed to reply to tweet';
                    this.logger(`Reply failed: ${errorMsg}`);
                    return this.createResponse(
                        ExecutableGameFunctionStatus.Failed,
                        errorMsg
                    );
                }

                this.logger(`Reply successful: ${JSON.stringify(result)}`);
                return this.createResponse(
                    ExecutableGameFunctionStatus.Done,
                    `Successfully replied to tweet ${args.tweet_id}`
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