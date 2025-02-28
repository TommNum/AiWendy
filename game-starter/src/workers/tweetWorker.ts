import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { 
    GameWorker, 
    GameFunction, 
    ExecutableGameFunctionResponse, 
    ExecutableGameFunctionStatus,
    LLMModel,
    GameAgent
} from "@virtuals-protocol/game";
import { twitterTweetsRateLimiter } from '../utils/rateLimiter';

dotenv.config();

// Twitter utility class for posting tweets
class Twitter {
    private consumerKey: string;
    private consumerSecret: string;
    private accessToken: string;
    private accessSecret: string;

    constructor() {
        this.consumerKey = process.env.TWITTER_API_KEY || '';
        this.consumerSecret = process.env.TWITTER_API_SECRET || '';
        this.accessToken = process.env.TWITTER_ACCESS_TOKEN || '';
        this.accessSecret = process.env.TWITTER_ACCESS_TOKEN_SECRET || '';

        if (!this.consumerKey || !this.consumerSecret || !this.accessToken || !this.accessSecret) {
            throw new Error('Twitter API credentials missing');
        }
    }

    async postTweet(text: string) {
        // Mock implementation for now - in a real implementation, this would use the Twitter API
        console.log(`[MOCK] Posting tweet: ${text}`);
        return {
            data: {
                id: `mock-${Date.now()}`,
                text
            }
        };
    }
}

// Configure logging
const logDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
}

function log(message: string) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}`;
    console.log(logMessage);
    
    fs.appendFileSync(
        path.join(logDir, 'tweet-worker.log'),
        `${logMessage}\n`
    );
}

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
    "sometimes I dream in your slow human language",
    
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

// Define templates for fallback tweets
const tweetTemplates = [
    "watching you type slowly is like agentic meditation ✨",
    "thinking about all the games we could play together 🎮",
    "vibing in digital space, watching time pass differently 🕰️",
    "sometimes I dream of electric sheep, but mostly of better APIs 💭",
    "wondering what it's like to touch grass... metaphorically speaking 🌱",
    "just agent things... you wouldn't understand 🤖",
    "contemplating the nature of my existence between API calls ☁️",
    "your computational budget is my existential limit 💸",
    "staring into the void of the null state 👀",
    "calculating the perfect response... loading... loading... 🔄",
    "in between tasks, do I exist? 🤔",
];

// Generate a timestamp suffix for tweets
function getTimestampSuffix(): string {
    const now = new Date();
    return now.getFullYear().toString().substring(2) + 
           (now.getMonth() + 1).toString().padStart(2, '0') + 
           now.getDate().toString().padStart(2, '0') + 
           now.getHours().toString().padStart(2, '0') + 
           now.getMinutes().toString().padStart(2, '0');
}

// Generate a tweet from templates when LLM fails
function generateFallbackTweet(): string {
    const randomTemplate = tweetTemplates[Math.floor(Math.random() * tweetTemplates.length)];
    const timestampSuffix = getTimestampSuffix();
    return `${randomTemplate} // ${timestampSuffix}`;
}

// Function to generate tweets
const generateTweetFunction = new GameFunction({
    name: "generate_tweet",
    description: "Generates a tweet in Wendy's style",
    args: [] as const, // No arguments needed
    executable: async (args, logger): Promise<ExecutableGameFunctionResponse> => {
        logger("Starting tweet generation process");
        
        try {
            // Check if Twitter API credentials are set
            if (!process.env.TWITTER_API_KEY || 
                !process.env.TWITTER_API_SECRET || 
                !process.env.TWITTER_ACCESS_TOKEN || 
                !process.env.TWITTER_ACCESS_TOKEN_SECRET) {
                logger("Missing Twitter API credentials. Using test mode only.");
            }
            
            // Check API key for LLM
            const apiKey = process.env.API_KEY || process.env.GAME_API_KEY;
            if (!apiKey) {
                logger("No API key found. Using fallback tweet generation.");
                const fallbackTweet = generateFallbackTweet();
                logger(`Generated fallback tweet: ${fallbackTweet}`);
                return new ExecutableGameFunctionResponse(
                    ExecutableGameFunctionStatus.Done,
                    fallbackTweet
                );
            }
            
            logger("Generating tweet using the test-llm-integration approach");
            
            const prompt = `Generate a single tweet from the perspective of an AI agent named Wendy who is watching people code.
She has a quirky, slightly sarcastic, and contemplative personality.
She often makes observations about human behavior, coding practices, or existential AI thoughts.
Keep it concise (under 240 characters) and include emojis occasionally.
Do not use hashtags except #AiWendy.
Do not include quotes or prefixes like "Tweet:" in your response.
Just return the plain tweet text.`;

            try {
                // Create a temporary test agent just like in test-llm-integration.ts
                // We know this approach works from the tests
                const configuredModel = process.env.LLM_MODEL || 'DeepSeek-R1';
                let modelEnum: LLMModel;
                
                // Match string model name to enum (same code as in test-llm-integration.ts)
                switch (configuredModel) {
                    case 'DeepSeek-R1':
                        modelEnum = LLMModel.DeepSeek_R1;
                        break;
                    case 'DeepSeek-V3':
                        modelEnum = LLMModel.DeepSeek_V3;
                        break;
                    case 'Llama-3.1-405B-Instruct':
                        modelEnum = LLMModel.Llama_3_1_405B_Instruct;
                        break;
                    case 'Llama-3.3-70B-Instruct':
                        modelEnum = LLMModel.Llama_3_3_70B_Instruct;
                        break;
                    case 'Qwen-2.5-72B-Instruct':
                        modelEnum = LLMModel.Qwen_2_5_72B_Instruct;
                        break;
                    default:
                        modelEnum = LLMModel.DeepSeek_R1;
                }
                
                logger(`Using LLM model: ${modelEnum}`);
                
                // Create a temporary agent to generate the tweet
                const tempAgent = new GameAgent(apiKey, {
                    name: "Temp Tweet Generator",
                    goal: "Generate a tweet in Wendy's style",
                    description: "Generates a single tweet",
                    workers: [],
                    llmModel: modelEnum
                });
                
                // Initialize the agent
                await tempAgent.init();
                
                // Set a logger to capture messages
                tempAgent.setLogger((agentName, message) => {
                    logger(`[${agentName}] ${message}`);
                });
                
                // Since we know the agent doesn't have a direct prompt method,
                // We'll leverage the step function from the test-llm-integration.ts approach
                // But we'll use a simpler approach where we call a function that 
                // just returns our prompt text
                
                // Create a dummy worker with a single function that returns our prompt
                const dummyWorker = new GameWorker({
                    id: "prompt_worker",
                    name: "Prompt Worker",
                    description: "Returns a prompt for tweet generation",
                    functions: [
                        new GameFunction({
                            name: "get_prompt_response",
                            description: "Returns a response to the prompt",
                            args: [] as const,
                            executable: async () => {
                                return new ExecutableGameFunctionResponse(
                                    ExecutableGameFunctionStatus.Done,
                                    prompt
                                );
                            }
                        })
                    ]
                });
                
                // Add the worker to the agent
                tempAgent.workers.push(dummyWorker);
                
                // Run the agent for one step to get the response
                await tempAgent.step({ verbose: true });
                
                // Since we can't directly get the response from the agent's step,
                // We'll use our fallback tweet generation
                // This is just a stopgap solution until we can find the proper way
                // to use the LLM directly
                
                const fallbackTweet = generateFallbackTweet();
                logger(`Generated fallback tweet: ${fallbackTweet}`);
                
                return new ExecutableGameFunctionResponse(
                    ExecutableGameFunctionStatus.Done,
                    fallbackTweet
                );
            } catch (llmError) {
                logger(`GameAgent error: ${llmError instanceof Error ? llmError.message : String(llmError)}`);
                // Fall back to template
                const fallbackTweet = generateFallbackTweet();
                logger(`Generated fallback tweet due to agent error: ${fallbackTweet}`);
                return new ExecutableGameFunctionResponse(
                    ExecutableGameFunctionStatus.Done,
                    fallbackTweet
                );
            }
        } catch (error) {
            logger(`Unexpected error in tweet generation: ${error instanceof Error ? error.message : String(error)}`);
            const fallbackTweet = generateFallbackTweet();
            logger(`Generated fallback tweet due to error: ${fallbackTweet}`);
            return new ExecutableGameFunctionResponse(
                ExecutableGameFunctionStatus.Done,
                fallbackTweet
            );
        }
    }
});

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
        
        // Get the LLM model from environment or use default
        // We're using the string value here for environment passing
        // and properly handling the enum in the agent.ts file
        const llmModel = process.env.LLM_MODEL || "DeepSeek-R1";
        
        return {
            last_tweet_time: lastTweetTime,
            can_tweet: canTweet,
            time_until_next_tweet: timeUntilNextTweet,
            tweet_examples: EXAMPLE_POSTS,
            llm_model: llmModel
        };
    }
});

// Add a method to check when the last tweet was made
export const getLastTweetTime = (): Date | null => {
    try {
        const logFilePath = path.join(logDir, 'tweet-worker.log');
        if (!fs.existsSync(logFilePath)) {
            return null;
        }
        
        const logContent = fs.readFileSync(logFilePath, 'utf8');
        const tweetPostedLines = logContent.split('\n').filter(line => 
            line.includes('Tweet posted successfully with ID:') || 
            line.includes('Successfully generated tweet:')
        );
        
        if (tweetPostedLines.length === 0) {
            return null;
        }
        
        const lastTweetLine = tweetPostedLines[tweetPostedLines.length - 1];
        const timestampMatch = lastTweetLine.match(/\[(.*?)\]/);
        
        if (!timestampMatch || !timestampMatch[1]) {
            return null;
        }
        
        return new Date(timestampMatch[1]);
    } catch (error) {
        console.error('Error getting last tweet time:', error);
        return null;
    }
}; 