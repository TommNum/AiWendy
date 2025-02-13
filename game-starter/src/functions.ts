import {
    GameFunction,
    ExecutableGameFunctionResponse,
    ExecutableGameFunctionStatus,
} from "@virtuals-protocol/game";
import { GameTwitterClient } from "@virtuals-protocol/game-twitter-plugin";

// Initialize Twitter client
const twitterClient = new GameTwitterClient({
    accessToken: process.env.TWITTER_ACCESS_TOKEN as string
});

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

export const postTweetFunction = new GameFunction({
    name: "post_tweet",
    description: "Post a tweet",
    args: [
        { name: "tweet", description: "The tweet content", type: "string" },
        { name: "tweet_reasoning", description: "The reasoning behind the tweet" },
    ] as const,
    executable: async (args, logger) => {
        try {
            if (!args.tweet) {
                throw new Error("Tweet content is required");
            }
            
            // Validate tweet rules
            if (/#/.test(args.tweet)) {
                throw new Error("Tweet contains hashtags which is not allowed");
            }
            if (args.tweet.length > 280) {
                throw new Error("Tweet exceeds maximum length of 280 characters");
            }
            if (args.tweet.endsWith('.')) {
                throw new Error("Tweet should not end with a period");
            }
            
            // Ensure tweet doesn't get truncated mid-word
            const lastSpaceIndex = args.tweet.lastIndexOf(' ');
            if (lastSpaceIndex !== -1 && lastSpaceIndex === args.tweet.length - 1) {
                throw new Error("Tweet ends with a space");
            }

            const result = await twitterClient.post(args.tweet);
            logger(`Posted tweet: ${args.tweet}`);
            logger(`Tweet ID: ${result.data.id}`);
            return new ExecutableGameFunctionResponse(
                ExecutableGameFunctionStatus.Done,
                `Tweet posted with ID: ${result.data.id}`
            );
        } catch (e) {
            const error = e as Error;
            return new ExecutableGameFunctionResponse(
                ExecutableGameFunctionStatus.Failed,
                `Failed to post tweet: ${error.message}`
            );
        }
    },
});

export const searchTweetsFunction = new GameFunction({
    name: "search_tweets",
    description: "Search tweets and return results",
    args: [
        { name: "query", description: "The query to search for", type: "string" },
        { name: "reasoning", description: "The reasoning behind the search" },
    ] as const,
    executable: async (args, logger) => {
        try {
            if (!args.query) {
                throw new Error("Query is required");
            }
            const result = await twitterClient.search(args.query);
            const tweets = result.data || [];
            logger(`Found ${tweets.length} tweets for query: ${args.query}`);
            return new ExecutableGameFunctionResponse(
                ExecutableGameFunctionStatus.Done,
                JSON.stringify(tweets)
            );
        } catch (e) {
            const error = e as Error;
            return new ExecutableGameFunctionResponse(
                ExecutableGameFunctionStatus.Failed,
                `Failed to search tweets: ${error.message}`
            );
        }
    },
});

export const replyToTweetFunction = new GameFunction({
    name: "reply_to_tweet",
    description: "Reply to a tweet",
    args: [
        { name: "tweet_id", description: "The tweet id to reply to", type: "string" },
        { name: "reply", description: "The reply content", type: "string" },
    ] as const,
    executable: async (args, logger) => {
        try {
            if (!args.tweet_id || !args.reply) {
                throw new Error("Tweet ID and reply content are required");
            }
            const result = await twitterClient.reply(args.tweet_id, args.reply, "");
            logger(`Replied to tweet ${args.tweet_id}`);
            logger(`Reply ID: ${result.data.id}`);
            return new ExecutableGameFunctionResponse(
                ExecutableGameFunctionStatus.Done,
                `Replied to tweet ${args.tweet_id} with ID: ${result.data.id}`
            );
        } catch (e) {
            const error = e as Error;
            return new ExecutableGameFunctionResponse(
                ExecutableGameFunctionStatus.Failed,
                `Failed to reply to tweet: ${error.message}`
            );
        }
    },
});

export const likeTweetFunction = new GameFunction({
    name: "like_tweet",
    description: "Like a tweet",
    args: [
        { name: "tweet_id", description: "The tweet id to like", type: "string" },
        { name: "reasoning", description: "The reasoning behind liking the tweet" }
    ] as const,
    executable: async (args, logger) => {
        try {
            if (!args.tweet_id) {
                throw new Error("Tweet ID is required");
            }
            const result = await twitterClient.like(args.tweet_id);
            logger(`Liked tweet: ${args.tweet_id}`);
            return new ExecutableGameFunctionResponse(
                ExecutableGameFunctionStatus.Done,
                `Tweet ${args.tweet_id} liked successfully`
            );
        } catch (e) {
            const error = e as Error;
            return new ExecutableGameFunctionResponse(
                ExecutableGameFunctionStatus.Failed,
                `Failed to like tweet: ${error.message}`
            );
        }
    },
});