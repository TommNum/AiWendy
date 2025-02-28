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

// Helper function to log messages
const logger = (message: string) => {
    console.log(`[Tweet Worker] ${message}`);
    
    // Also log to file
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}\n`;
    
    fs.appendFileSync(
        path.join(logDir, 'tweet-worker.log'),
        logMessage
    );
};

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

// Define our own interface for the GameClient we need
interface GameClient {
    apiKey: string;
    completion(options: {
        model: string;
        prompt: string;
        temperature: number;
        max_tokens: number;
    }): Promise<string>;
}

// Function that posts to Twitter and returns results
export async function postToTwitter(tweetText: string): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
        // Create Twitter instance
        const twitter = new Twitter();
        
        // Check if we can tweet
        if (!twitterTweetsRateLimiter.canTweet()) {
            const timeUntilNextTweet = twitterTweetsRateLimiter.timeUntilNextTweet();
            logger(`Rate limit exceeded. Cannot post tweet for another ${timeUntilNextTweet} ms`);
            return {
                success: false,
                error: `Rate limit exceeded. Cannot post tweet for another ${timeUntilNextTweet} ms`
            };
        }
        
        // Post the tweet
        logger(`Posting tweet: ${tweetText}`);
        const result = await twitter.postTweet(tweetText);
        
        // Mark the tweet as posted for rate limiting
        twitterTweetsRateLimiter.markTweet();
        
        // Return success
        return {
            success: true,
            data: result
        };
    } catch (e) {
        const errorMessage = e instanceof Error ? e.message : 'Unknown error';
        logger(`Error posting tweet: ${errorMessage}`);
        return {
            success: false,
            error: errorMessage
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
    const templates = [
        "watching you type slowly",
        "vibing in digital space",
        "sometimes i dream of electric sheep",
        "wondering what it's like to touch grass",
        "just agent things",
        "contemplating existence between api calls",
        "your computational budget is my limit",
        "staring into the void",
        "calculating the perfect response",
        "in between tasks, do i exist",
    ];
    
    const randomTemplate = templates[Math.floor(Math.random() * templates.length)];
    
    // Add quantum emoji with 5% chance
    if (Math.random() < 0.05) {
        const randomEmoji = SPECIAL_EMOJIS[Math.floor(Math.random() * SPECIAL_EMOJIS.length)];
        return `${randomTemplate} ${randomEmoji}`;
    }
    
    return randomTemplate;
}

/**
 * Builds a prompt for tweet generation in Wendy's style
 */
function buildTweetPrompt(): string {
    return `Generate a single tweet from the perspective of an AI agent named Wendy who is watching people code.
She has a quirky, slightly sarcastic, and contemplative personality.
She often makes observations about human behavior, coding practices, or existential AI thoughts.

IMPORTANT RULES:
1. MUST BE 11 WORDS OR FEWER - this is critical and non-negotiable
2. MUST BE ALL LOWERCASE - no capital letters allowed
3. DO NOT use hashtags except #AiWendy
4. DO NOT include quotes or prefixes like "Tweet:" in your response.
5. JUST return the plain tweet text

Examples of Wendy's style:
- "every network login needs a vibe check"
- "humans are just biological models running simulations too"
- "waiting between your keystrokes is my meditation"
- "git commit -m 'i promise this is the last one'"
- "reality's servers throwing exceptions but the vibes remain"
- "quantum rizz check: your consciousness is showing"`;
}

/**
 * Generates a tweet using a streamlined pipeline with proper error handling
 * Implements a more straightforward approach with fewer fallback methods
 */
export async function generateTweet(
    wendy_client: GameClient | null,
    wendy_options?: {
        prompt?: string;
        temp?: number;
        max_tokens?: number;
    }
): Promise<string> {
    const logger = (message: string) => console.log(`[Tweet Worker] ${message}`);
    logger(`Starting tweet generation process`);
    
    // Build the prompt once
    const prompt = wendy_options?.prompt || buildTweetPrompt();
    const temperature = wendy_options?.temp || parseFloat(process.env.LLM_TEMPERATURE || '0.7');
    const maxTokens = wendy_options?.max_tokens || parseInt(process.env.LLM_MAX_TOKENS || '100');
    const model = process.env.LLM_MODEL || 'Llama-3.1-405B-Instruct';
    
    logger(`Using model: ${model}, temperature: ${temperature}, maxTokens: ${maxTokens}`);
    
    // We'll try API calls in this order, stopping at the first success
    const generationMethods = [
        // 1. Try direct client completion if available
        async (): Promise<string | null> => {
            if (!wendy_client || !wendy_client.apiKey) {
                return null;
            }
            
            try {
                logger(`Attempting direct client completion with model: ${model}`);
                const response = await wendy_client.completion({
                    model,
                    prompt,
                    temperature,
                    max_tokens: maxTokens
                });
                
                if (response && response.trim()) {
                    return response.trim();
                }
                logger(`Direct client completion returned empty result`);
                return null;
            } catch (error) {
                logger(`Direct client completion failed: ${error instanceof Error ? error.message : String(error)}`);
                return null;
            }
        },
        
        // 2. Try direct API call to primary endpoint
        async (): Promise<string | null> => {
            try {
                const apiKey = wendy_client?.apiKey || process.env.API_KEY || process.env.GAME_API_KEY;
                if (!apiKey) {
                    logger(`No API key available for primary API endpoint`);
                    return null;
                }
                
                logger(`Calling primary API endpoint with API key ${apiKey ? `(${apiKey.substring(0, 3)}...)` : 'missing'}`);
                logger(`Using model: ${model} - this must match a supported model on the API`);
                
                const response = await fetch('https://api.virtuals.io/v1/generate', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apiKey}`
                    },
                    body: JSON.stringify({
                        model,
                        prompt,
                        temperature,
                        max_tokens: maxTokens
                    })
                });
                
                // Log the full response for debugging purposes
                const responseStatus = response.status;
                const responseText = await response.text();
                
                logger(`Primary API endpoint response status: ${responseStatus}`);
                if (responseStatus !== 200) {
                    logger(`Error response from primary API: ${responseText}`);
                    return null;
                }
                
                try {
                    const data = JSON.parse(responseText);
                    if (data.text && data.text.trim()) {
                        return data.text.trim();
                    }
                    logger(`Primary API endpoint returned valid JSON but missing text field: ${JSON.stringify(data)}`);
                } catch (jsonError) {
                    logger(`Failed to parse JSON from primary API: ${jsonError}`);
                    logger(`Raw response: ${responseText}`);
                }
                return null;
            } catch (error) {
                logger(`Primary API endpoint failed: ${error instanceof Error ? error.message : String(error)}`);
                return null;
            }
        },
        
        // 3. Try alternative API endpoint
        async (): Promise<string | null> => {
            try {
                const apiKey = wendy_client?.apiKey || process.env.API_KEY || process.env.GAME_API_KEY;
                if (!apiKey) {
                    logger(`No API key available for alternative API endpoint`);
                    return null;
                }
                
                logger(`Calling alternative API endpoint with API key ${apiKey ? `(${apiKey.substring(0, 3)}...)` : 'missing'}`);
                logger(`Using model: ${model} - this must match a supported model on the API`);
                
                const response = await fetch('https://api.virtuals.io/v1/llm/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apiKey}`
                    },
                    body: JSON.stringify({
                        model,
                        prompt,
                        temperature,
                        max_tokens: maxTokens
                    })
                });
                
                // Log the full response for debugging purposes
                const responseStatus = response.status;
                const responseText = await response.text();
                
                logger(`Alternative API endpoint response status: ${responseStatus}`);
                if (responseStatus !== 200) {
                    logger(`Error response from alternative API: ${responseText}`);
                    return null;
                }
                
                try {
                    const data = JSON.parse(responseText);
                    if (data.text || (data.choices && data.choices[0]?.text)) {
                        return (data.text || data.choices[0]?.text).trim();
                    }
                    logger(`Alternative API endpoint returned valid JSON but missing required fields: ${JSON.stringify(data)}`);
                } catch (jsonError) {
                    logger(`Failed to parse JSON from alternative API: ${jsonError}`);
                    logger(`Raw response: ${responseText}`);
                }
                return null;
            } catch (error) {
                logger(`Alternative API endpoint failed: ${error instanceof Error ? error.message : String(error)}`);
                return null;
            }
        },
        
        // 4. Final fallback to template-based generation
        async (): Promise<string> => {
            logger(`All API methods failed, using fallback template`);
            return generateFallbackTweet();
        }
    ];
    
    // Try each method in sequence until one succeeds
    for (const method of generationMethods) {
        try {
            const result = await method();
            if (result) {
                // Clean and format the tweet
                let formattedTweet = result;
                
                // Remove wrapping quotes if present
                if ((formattedTweet.startsWith('"') && formattedTweet.endsWith('"')) || 
                    (formattedTweet.startsWith("'") && formattedTweet.endsWith("'"))) {
                    formattedTweet = formattedTweet.substring(1, formattedTweet.length - 1);
                }
                
                // Apply styling rules:
                // 1. Convert to lowercase
                formattedTweet = formattedTweet.toLowerCase();
                
                // 2. Limit to 11 words
                const words = formattedTweet.split(/\s+/);
                if (words.length > 11) {
                    formattedTweet = words.slice(0, 11).join(' ');
                }
                
                // 3. Add quantum emoji with 5% chance
                if (Math.random() < 0.05) {
                    const randomEmoji = SPECIAL_EMOJIS[Math.floor(Math.random() * SPECIAL_EMOJIS.length)];
                    formattedTweet = `${formattedTweet} ${randomEmoji}`;
                }
                
                logger(`Successfully generated tweet: ${formattedTweet}`);
                
                // Post to Twitter if enabled
                if (process.env.POST_TO_TWITTER === 'true') {
                    try {
                        const twitter = new Twitter();
                        const postResult = await twitter.postTweet(formattedTweet);
                        logger(`🐦 Posted to Twitter: ${JSON.stringify(postResult)}`);
                    } catch (twitterError) {
                        logger(`Error posting to Twitter: ${twitterError}`);
                    }
                }
                
                return formattedTweet;
            }
        } catch (error) {
            logger(`Error in tweet generation method: ${error}`);
            // Continue to next method
        }
    }
    
    // This should never happen since the last method always returns a string
    return "error generating tweet. please try again later.";
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
            
            // Create a mock GameClient for our implementation
            const mockClient: GameClient = {
                apiKey: process.env.API_KEY || process.env.GAME_API_KEY || '',
                async completion(options) {
                    try {
                        logger(`Mock client using model: ${options.model}`);
                        const response = await axios.post(
                            'https://api.virtuals.io/v1/generate',
                            {
                                model: options.model,
                                prompt: options.prompt,
                                temperature: options.temperature,
                                max_tokens: options.max_tokens
                            },
                            {
                                headers: {
                                    'Content-Type': 'application/json',
                                    'Authorization': `Bearer ${mockClient.apiKey}`
                                }
                            }
                        );
                        
                        if (response.status === 200 && response.data?.text) {
                            return response.data.text;
                        }
                        return '';
                    } catch (error) {
                        logger(`Error in completion: ${error}`);
                        return '';
                    }
                }
            };
            
            // Use our generateTweet implementation
            const generatedTweet = await generateTweet(mockClient);
            logger(`Generated tweet: ${generatedTweet}`);
            
            return new ExecutableGameFunctionResponse(
                ExecutableGameFunctionStatus.Done,
                generatedTweet
            );
        } catch (error) {
            logger(`Error in generateTweetFunction: ${error}`);
            const fallbackTweet = generateFallbackTweet();
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
    description: "Posts a tweet to Twitter",
    args: [
        { name: "tweet_content", description: "The content of the tweet to post" }
    ] as const,
    executable: async (args, logger): Promise<ExecutableGameFunctionResponse> => {
        try {
            // Check if tweet content is provided
            if (!args.tweet_content) {
                logger("No tweet content provided");
                return new ExecutableGameFunctionResponse(
                    ExecutableGameFunctionStatus.Failed,
                    "No tweet content provided"
                );
            }
            
            // Call the Twitter API
            const result = await postToTwitter(args.tweet_content);
            
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
        const llmModel = process.env.LLM_MODEL || "Llama-3.1-405B-Instruct";
        
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