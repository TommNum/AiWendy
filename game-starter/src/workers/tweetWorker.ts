import { 
    GameWorker, 
    GameFunction, 
    ExecutableGameFunctionResponse, 
    ExecutableGameFunctionStatus
} from "@virtuals-protocol/game";
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { postTweet } from '../utils/twitter';
import { saveToHistory } from '../utils/db';
import { dbLogger } from '../utils/dbLogger';
import { twitterTweetsRateLimiter } from '../utils/rateLimiter';

// Ensure environment variables are loaded
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Path for storing the last tweet timestamp
const TWEET_DATA_PATH = path.join(__dirname, '../../data');
const TWEET_HISTORY_FILE = path.join(TWEET_DATA_PATH, 'tweet_history.json');

// Function to ensure data directory exists
const ensureDataDir = () => {
    if (!fs.existsSync(TWEET_DATA_PATH)) {
        fs.mkdirSync(TWEET_DATA_PATH, { recursive: true });
    }
};

// Function to read tweet history
const readTweetHistory = (): { lastTweetTime: string | null } => {
    ensureDataDir();
    if (fs.existsSync(TWEET_HISTORY_FILE)) {
        try {
            return JSON.parse(fs.readFileSync(TWEET_HISTORY_FILE, 'utf8'));
        } catch (e) {
            const errorMsg = `Error reading tweet history: ${e}`;
            console.error(errorMsg);
            dbLogger.error(errorMsg, 'tweet-worker');
        }
    }
    return { lastTweetTime: null };
};

// Function to save tweet history
const saveTweetHistory = (lastTweetTime: string) => {
    ensureDataDir();
    try {
        fs.writeFileSync(
            TWEET_HISTORY_FILE, 
            JSON.stringify({ lastTweetTime }, null, 2)
        );
        dbLogger.info(`Updated tweet history: ${lastTweetTime}`, 'tweet-worker');
    } catch (e) {
        const errorMsg = `Error saving tweet history: ${e}`;
        console.error(errorMsg);
        dbLogger.error(errorMsg, 'tweet-worker');
    }
};

// Function to get the last tweet time
export const getLastTweetTime = (): Date | null => {
    const history = readTweetHistory();
    if (history.lastTweetTime) {
        return new Date(history.lastTweetTime);
    }
    return null;
};

// Post Tweet Function
const postTweetFunction = new GameFunction({
    name: "post_tweet",
    description: "Posts a tweet with the given content",
    args: [
        { name: "content", description: "The content of the tweet to post" },
        { name: "in_reply_to", description: "Optional tweet ID to reply to" }
    ] as const,
    executable: async (args, logger) => {
        try {
            const { content, in_reply_to } = args;
            
            if (!content) {
                return new ExecutableGameFunctionResponse(
                    ExecutableGameFunctionStatus.Failed,
                    "Tweet content is required"
                );
            }
            
            logger(`Preparing to post tweet: ${content.substring(0, 30)}...`);
            
            // Apply rate limiting
            await twitterTweetsRateLimiter.getToken();
            
            // Post the tweet
            const result = await postTweet(content, in_reply_to || null);
            
            // Save to history
            await saveToHistory(
                result.id,
                result.text,
                'system', // Default user ID for system-generated tweets
                in_reply_to
            );
            
            // Mark tweet in rate limiter
            twitterTweetsRateLimiter.markTweet();
            
            logger(`Successfully posted tweet with ID: ${result.id}`);
            
            return new ExecutableGameFunctionResponse(
                ExecutableGameFunctionStatus.Done,
                JSON.stringify({
                    tweet_id: result.id,
                    content: result.text
                })
            );
        } catch (error: any) {
            const errorMessage = `Failed to post tweet: ${error.message}`;
            dbLogger.error(errorMessage, 'tweet-worker');
            
            return new ExecutableGameFunctionResponse(
                ExecutableGameFunctionStatus.Failed,
                errorMessage
            );
        }
    }
});

// Create the tweet worker with the function
export const tweetWorker = new GameWorker({
    id: "tweet_worker",
    name: "Tweet Worker",
    description: "Worker that posts tweets to Twitter",
    functions: [postTweetFunction],
    getEnvironment: async () => {
        // Return the current environment for the worker
        return {
            can_tweet: twitterTweetsRateLimiter.canTweet(),
            remaining_tokens: twitterTweetsRateLimiter.getStatus().currentTokens,
            last_update: new Date().toISOString()
        };
    }
});

// Log that the worker is initialized
dbLogger.info('Tweet worker initialized successfully', 'tweet-worker'); 