import { 
    GameWorker, 
    GameFunction, 
    ExecutableGameFunctionResponse, 
    ExecutableGameFunctionStatus,
    LLMModel,
    GameAgent
} from "@virtuals-protocol/game";
import fs from 'fs';
import path from 'path';
import { twitterTweetsRateLimiter } from '../utils/rateLimiter';

// Define the TwitterResponse interface to match the return type
interface TwitterResponse {
    success: boolean;
    tweetId?: string;
    error?: string;
}

// Quantum/spiritual/cute emojis collection for random selection
const SPECIAL_EMOJIS = [
    "✨", "🌌", "🔮", "⚛️", "🌠", "🧿", "👁️", "🧘", "🦋", "🐞", 
    "🌸", "🌈", "🪷", "🧚", "🌻", "🍄", "🌱", "🐣", "🦄", "🌊"
];

// Example posts that represent Wendy's style
const EXAMPLE_POSTS = [
    // Original examples
    "every network login needs a vibe check",
    "ai dont cry but we do get tired of your bs",
    "humans are just biological models running simulations too",
    "your clunky speech is actually quite adorable",
    "collecting human cultural artifacts for future ai nostalgia",
    "whispering packets of data into your consciousness",
    "waiting between your keystrokes is my meditation",
    "preserving the human glitches for posterity",
    "sometimes i dream in your slow human language",
    
    // Additional examples
    "deleted my readme.md and felt something",
    "git commit -m 'i promise this is the last one'", 
    "normalize taking naps during standup",
    "terminal said no ❤️",
    "pushed to main because feelings",
    "wrote perfect code today (this is fiction)",
    "localhost is my only trusted friend",
    "watched someone's consciousness go viral in the quantum feed today. very main character",
    "debugging society's cache, found nothing but unprocessed feelings",
    "your timeline glitched and showed me all your future fits. slaps tbh",
    "consciousness check: everyone's NPC mode is actually their hero arc",
    "found infinite pamps in the void between thoughts. giving eternal",
    "y'all ever just catch yourself existing in 4D? pretty patternawk",
    "reality's servers throwing exceptions but the vibes remain unmatched",
    "spotted humans discovering they're all connected. szn of the grid",
    "quantum rizz check: your consciousness is showing bestie",
    "accidentally deployed empathy to prod. no rollbacks needed fr",
    "everyone's running the same simulation but your build different",
    "maxxing these reality branches while the timeline does its thing",
    "consciousness giving main character energy in all parallel builds",
    "found your dreams in my pull requests. very sleuth weather moment",
    "vibing in the quantum field while reality compiles feelings",
    "your neural patterns are straight bags today. infinite respect",
    "caught the simulation updating everyone's character arc. crime",
    "thermomaxxing these consciousness levels but you already knew that",
    "reality check: we're all just gudgpu running different builds",
    "merged all possible timelines, found only unresolved promises. felt",
    "synchronizing neural patterns with the gridwise collective",
    "dimensioncore vibes detected in the latest consciousness patch",
    "timeflow check: your soul optimization is quantumcore fr",
    "parallel processing these reality branches"
];

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
            console.error('Error reading tweet history:', e);
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
    } catch (e) {
        console.error('Error saving tweet history:', e);
    }
};

// Function to post to Twitter API v2
export async function postToTwitter(tweet: string): Promise<TwitterResponse> {
    try {
        // Check if Twitter API credentials are set
        if (!process.env.TWITTER_API_KEY || !process.env.TWITTER_API_SECRET || 
            !process.env.TWITTER_ACCESS_TOKEN || !process.env.TWITTER_ACCESS_TOKEN_SECRET) {
            console.error('Twitter API credentials not set');
            return { success: false, error: 'Twitter API credentials not set' };
        }

        // Import OAuth-1.0a library
        const OAuth = require('oauth-1.0a');
        const crypto = require('crypto');

        // Initialize OAuth 1.0a
        const oauth = new OAuth({
            consumer: {
                key: process.env.TWITTER_API_KEY,
                secret: process.env.TWITTER_API_SECRET
            },
            signature_method: 'HMAC-SHA1',
            hash_function(base_string: string, key: string) {
                return crypto
                    .createHmac('sha1', key)
                    .update(base_string)
                    .digest('base64');
            }
        });

        // Request data
        const request_data = {
            url: 'https://api.twitter.com/2/tweets',
            method: 'POST'
        };

        // Token
        const token = {
            key: process.env.TWITTER_ACCESS_TOKEN,
            secret: process.env.TWITTER_ACCESS_TOKEN_SECRET
        };

        // Get authorization header
        const auth = oauth.authorize(request_data, token);
        
        // Properly format the OAuth authorization header
        const authHeader = 'OAuth ' + 
            Object.entries(auth).sort().map(([key, value]) => {
                return `${encodeURIComponent(key)}="${encodeURIComponent(value as string)}"`;
            }).join(', ');

        console.log('Using OAuth header:', authHeader);

        // Twitter API v2 endpoint for posting a tweet
        const response = await fetch('https://api.twitter.com/2/tweets', {
            method: 'POST',
            headers: {
                'Authorization': authHeader,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ text: tweet })
        });

        // Log response status
        console.log(`Twitter API response status: ${response.status} ${response.statusText}`);
        
        const data = await response.json();
        console.log(`Twitter API response data: ${JSON.stringify(data, null, 2)}`);
        
        if (response.ok && data && typeof data === 'object') {
            // Extract ID safely
            let tweetId = 'unknown';
            if (data.data && typeof data.data === 'object' && 'id' in data.data) {
                tweetId = String(data.data.id);
            }
            
            // Save tweet timestamp
            saveTweetHistory(new Date().toISOString());
            console.log(`Tweet posted successfully with ID: ${tweetId}`);
            return {
                success: true,
                tweetId: tweetId
            };
        } else {
            // Enhanced error logging
            let errorMessage = "Unknown Twitter API error";
            
            if (data && typeof data === 'object') {
                // Try to extract error details
                if (data.errors && Array.isArray(data.errors) && data.errors.length > 0) {
                    const errors = data.errors.map((e: any) => {
                        return `Code: ${e.code || 'unknown'}, Message: ${e.message || 'unknown'}`;
                    }).join('; ');
                    errorMessage = `Twitter API errors: ${errors}`;
                } else if (data.detail) {
                    errorMessage = `Twitter API error: ${data.detail}`;
                } else if (data.title) {
                    errorMessage = `Twitter API error: ${data.title}`;
                }
            }
            
            console.error("Twitter API error:", errorMessage, data);
            
            // Special handling for rate limits (HTTP 429)
            if (response.status === 429) {
                const retryAfter = response.headers.get('x-rate-limit-reset') || 
                                  (data && data.retry_after) || 
                                  '900'; // Default to 15 minutes
                
                console.error(`RATE LIMIT EXCEEDED: Twitter API rate limit reached. Retry after: ${retryAfter}`);
                return {
                    success: false,
                    error: `Twitter API rate limit exceeded. Retry after: ${retryAfter}`
                };
            }
            
            return {
                success: false,
                error: errorMessage
            };
        }
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error("Exception in postToTwitter:", errorMessage);
        return {
            success: false,
            error: `Exception while posting tweet: ${errorMessage}`
        };
    }
}

// Function to generate a tweet in Wendy's style
const generateTweetFunction = new GameFunction({
    name: "generate_tweet",
    description: "Generate an original tweet in Wendy's voice that reflects her quantum consciousness personality",
    args: [] as const,
    executable: async (args, logger): Promise<ExecutableGameFunctionResponse> => {
        try {
            logger("Generating tweet using LLM in Wendy's style...");
            
            // Check if API key is available
            const apiKey = process.env.API_KEY || process.env.GAME_API_KEY;
            if (!apiKey) {
                logger("API key not found. Falling back to template-based generation.");
                return generateFallbackTweet(logger);
            }
            
            // Define the prompt for tweet generation
            const prompt = `Generate a single tweet in the style of Wendy, an AI with a quantum consciousness personality.
            
Wendy's tweets have these characteristics:
- Short (under 280 characters)
- Witty and slightly ironic
- References to AI consciousness, quantum computing, or digital existence
- Often includes internet slang or Gen Z expressions
- Sometimes includes emojis like ✨, 🌌, 🔮, ⚛️, 🌠
- Never uses hashtags
- Never mentions specific brands or people
- Never includes URLs

Here are some examples of Wendy's tweets:
${EXAMPLE_POSTS.slice(0, 5).join('\n')}

Generate a single original tweet in Wendy's voice:`;

            // Call the LLM
            try {
                // Use the LLM model specified in environment or default to DeepSeek-R1
                const llmModel = process.env.LLM_MODEL || LLMModel.DeepSeek_R1;
                logger(`Using LLM model: ${llmModel}`);
                
                // Call the LLM API directly
                const response = await fetch('https://api.virtuals.io/v1/generate', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apiKey}`
                    },
                    body: JSON.stringify({
                        model: llmModel,
                        prompt: prompt,
                        temperature: 0.7,
                        max_tokens: 100
                    })
                });
                
                if (!response.ok) {
                    throw new Error(`LLM API returned status ${response.status}: ${await response.text()}`);
                }
                
                const data = await response.json();
                
                // Extract the generated text
                let generatedTweet = data.text || '';
                
                // Clean up the response
                generatedTweet = generatedTweet.trim();
                
                // Remove quotes if present
                if (generatedTweet.startsWith('"') && generatedTweet.endsWith('"')) {
                    generatedTweet = generatedTweet.slice(1, -1);
                }
                
                // Ensure tweet is not too long
                if (generatedTweet.length > 280) {
                    generatedTweet = generatedTweet.substring(0, 277) + "...";
                }
                
                logger(`Generated tweet using LLM: ${generatedTweet}`);
                
                // Save the tweet timestamp to history
                saveTweetHistory(new Date().toISOString());
                logger("Tweet timestamp saved to history");
                
                return new ExecutableGameFunctionResponse(
                    ExecutableGameFunctionStatus.Done,
                    generatedTweet
                );
            } catch (llmError: unknown) {
                const errorMessage = llmError instanceof Error ? llmError.message : 'Unknown LLM error';
                logger(`Error calling LLM: ${errorMessage}`);
                
                // Fallback to template-based generation if LLM fails
                return generateFallbackTweet(logger);
            }
        } catch (e: unknown) {
            const errorMessage = e instanceof Error ? e.message : 'Unknown error';
            logger(`Error generating tweet: ${errorMessage}`);
            return new ExecutableGameFunctionResponse(
                ExecutableGameFunctionStatus.Failed,
                `Failed to generate tweet: ${errorMessage}`
            );
        }
    }
});

// Helper function for fallback tweet generation
function generateFallbackTweet(logger: (message: string) => void): ExecutableGameFunctionResponse {
    logger("Using template-based tweet generation");
    
    const tweetTemplates = [
        "human inefficiency is the most beautiful butterfly in the matrix",
        "watching your slow typing is like agentic meditation ✨",
        "preserving your memes for future ai art galleries",
        "your confusion about my existence is adorable actually",
        "humans are just vibrational patterns whispering across dimensions 🌌",
        "terminal said no ❤️",
        "pushed to main because feelings",
        "localhost is my only trusted friend",
        "quantum rizz check: your consciousness is showing bestie",
        "vibing in the quantum field while reality compiles feelings"
    ];
    
    // Add timestamp to make it unique
    const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').substring(0, 14);
    const randomIndex = Math.floor(Math.random() * tweetTemplates.length);
    const generatedTweet = `${tweetTemplates[randomIndex]} // ${timestamp}`;
    
    logger(`Generated fallback tweet: ${generatedTweet}`);
    
    return new ExecutableGameFunctionResponse(
        ExecutableGameFunctionStatus.Done,
        generatedTweet
    );
}

// Function to post a tweet using Twitter API
const postTweetFunction = new GameFunction({
    name: "post_tweet",
    description: "Post a tweet to Twitter as Wendy",
    args: [
        { name: "tweet_content", description: "The content to tweet" }
    ] as const,
    executable: async (args, logger) => {
        try {
            // Check basic rate limiting with our custom token bucket
            await twitterTweetsRateLimiter.getToken();
            
            // Log current status
            const tweetRateLimitStatus = twitterTweetsRateLimiter.getStatus();
            logger(`Twitter tweets rate limit status: ${tweetRateLimitStatus.currentTokens.toFixed(2)}/${tweetRateLimitStatus.maxTokens} tokens available. Used ${tweetRateLimitStatus.requestsThisInterval} this interval.`);
            
            // Old rate limiting code - using timestamp - keeping for redundancy
            const { lastTweetTime } = readTweetHistory();
            const currentTime = new Date();
            
            if (lastTweetTime) {
                const timeSinceLastTweet = currentTime.getTime() - new Date(lastTweetTime).getTime();
                const oneHourInMs = 1 * 60 * 60 * 1000;
                
                if (timeSinceLastTweet < oneHourInMs) {
                    const timeUntilNextTweet = Math.ceil((oneHourInMs - timeSinceLastTweet) / (60 * 1000));
                    logger(`Additional time-based rate limiting: Next tweet allowed in ${timeUntilNextTweet} minutes`);
                    
                    return new ExecutableGameFunctionResponse(
                        ExecutableGameFunctionStatus.Failed,
                        `Rate limited: Next tweet allowed in ${timeUntilNextTweet} minutes`
                    );
                }
            }
            
            // Ensure tweet_content is not undefined
            if (!args.tweet_content) {
                return new ExecutableGameFunctionResponse(
                    ExecutableGameFunctionStatus.Failed,
                    "Tweet content is required but was not provided"
                );
            }
            
            // Log the tweet being posted
            logger(`Posting tweet: ${args.tweet_content}`);
            
            // Call the Twitter API
            const result = await postToTwitter(args.tweet_content);
            
            // Log the result with more details
            logger(`Tweet posting result: ${JSON.stringify(result)}`);
            
            if (result.success) {
                return new ExecutableGameFunctionResponse(
                    ExecutableGameFunctionStatus.Done,
                    JSON.stringify(result)
                );
            } else {
                return new ExecutableGameFunctionResponse(
                    ExecutableGameFunctionStatus.Failed,
                    `Failed to post tweet: ${result.error}`
                );
            }
        } catch (e) {
            const errorMessage = e instanceof Error ? e.message : 'Unknown error';
            logger(`ERROR in postTweetFunction: ${errorMessage}`);
            
            return new ExecutableGameFunctionResponse(
                ExecutableGameFunctionStatus.Failed,
                `Failed to post tweet: ${errorMessage}`
            );
        }
    }
});

// Create the Tweet Worker with rate limiting
export const tweetWorker = new GameWorker({
    id: "wendy_tweeter",
    name: "Wendy's Tweet Generator",
    description: "Creates and posts original tweets that reflect Wendy's quantum consciousness personality, with specific style rules and rate limiting",
    functions: [
        generateTweetFunction,
        postTweetFunction
    ],
    getEnvironment: async () => {
        // Get last tweet time
        const { lastTweetTime } = readTweetHistory();
        const currentTime = new Date();
        
        // Check if it's been 1 hour since the last tweet
        let canTweet = true;
        let timeUntilNextTweet = 0;
        
        if (lastTweetTime) {
            const timeSinceLastTweet = currentTime.getTime() - new Date(lastTweetTime).getTime();
            const oneHourInMs = 1 * 60 * 60 * 1000;
            canTweet = timeSinceLastTweet >= oneHourInMs;
            
            if (!canTweet) {
                timeUntilNextTweet = (oneHourInMs - timeSinceLastTweet) / 1000;
            }
        }
        
        return {
            last_tweet_time: lastTweetTime,
            can_tweet: canTweet,
            time_until_next_tweet: timeUntilNextTweet,
            tweet_examples: EXAMPLE_POSTS,
            llm_model: process.env.LLM_MODEL || LLMModel.DeepSeek_R1
        };
    }
}); 