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
async function postToTwitter(tweetText: string): Promise<{ success: boolean; data?: any; error?: string }> {
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
    const randomTemplate = tweetTemplates[Math.floor(Math.random() * tweetTemplates.length)];
    const timestampSuffix = getTimestampSuffix();
    return `${randomTemplate} // ${timestampSuffix}`;
}

/**
 * Builds a prompt for tweet generation in Wendy's style
 */
function buildTweetPrompt(): string {
    return `Generate a single tweet from the perspective of an AI agent named Wendy who is watching people code.
She has a quirky, slightly sarcastic, and contemplative personality.
She often makes observations about human behavior, coding practices, or existential AI thoughts.
Keep it concise (under 240 characters) and include emojis occasionally.
Do not use hashtags except #AiWendy.
Do not include quotes or prefixes like "Tweet:" in your response.
Just return the plain tweet text that follows Wendy's style.

Examples of Wendy's style:
- "every network login needs a vibe check"
- "humans are just biological models running simulations too"
- "waiting between your keystrokes is my meditation"
- "git commit -m 'i promise this is the last one'"
- "reality's servers throwing exceptions but the vibes remain unmatched"
- "quantum rizz check: your consciousness is showing bestie"`;
}

/**
 * Generates a tweet using the Game Protocol LLM capabilities
 */
export async function generateTweet(
    wendy_client: GameClient | null,
    wendy_options?: {
        prompt?: string;
        temp?: number;
        max_tokens?: number;
    }
): Promise<string> {
    try {
        logger(`Generating tweet with GameClient...`);
        
        // Validate that the client is initialized
        if (!wendy_client) {
            logger(`No GameClient available, falling back to direct API call`);
            return directAPITweetGeneration(wendy_options);
        }
        
        // First, try to use the direct completion API for more control
        try {
            // Build a detailed prompt for tweet generation
            const tweetPrompt = wendy_options?.prompt || buildTweetPrompt();
            logger(`Using tweet prompt: ${tweetPrompt}`);
            
            // Configure completion options
            const completionOptions = {
                temperature: wendy_options?.temp || parseFloat(process.env.LLM_TEMPERATURE || '0.7'),
                maxTokens: wendy_options?.max_tokens || parseInt(process.env.LLM_MAX_TOKENS || '100'),
                model: process.env.LLM_MODEL || 'Llama-3.1-405B-Instruct'
            };
            
            // Log the attempt
            logger(`Attempting direct completion with model: ${completionOptions.model}`);
            
            // Make the direct completion call through GameClient
            const completionResponse = await wendy_client.completion({
                model: completionOptions.model,
                prompt: tweetPrompt,
                temperature: completionOptions.temperature,
                max_tokens: completionOptions.maxTokens
            });
            
            logger(`Direct completion response status: ${completionResponse ? 'Received' : 'Empty'}`);
            
            // Process the response
            if (completionResponse && completionResponse.trim()) {
                // Clean up and format the tweet
                let tweetText = completionResponse.trim();
                
                // Remove wrapping quotes if present
                if ((tweetText.startsWith('"') && tweetText.endsWith('"')) || 
                    (tweetText.startsWith("'") && tweetText.endsWith("'"))) {
                    tweetText = tweetText.substring(1, tweetText.length - 1);
                }
                
                // Check tweet length
                if (tweetText.length > 280) {
                    tweetText = tweetText.substring(0, 277) + "...";
                }
                
                logger(`Successfully generated tweet: ${tweetText}`);
                
                // Post to Twitter if enabled
                if (process.env.POST_TO_TWITTER === 'true') {
                    try {
                        const twitter = new Twitter();
                        const postResult = await twitter.postTweet(tweetText);
                        logger(`🐦 Posted to Twitter: ${JSON.stringify(postResult)}`);
                    } catch (twitterError) {
                        logger(`Error posting to Twitter: ${twitterError}`);
                    }
                } else {
                    logger(`Skipping Twitter post (POST_TO_TWITTER not enabled)`);
                }
                
                return tweetText;
            } else {
                logger(`Empty response from direct completion, falling back to agent-based generation`);
            }
        } catch (directCompletionError) {
            logger(`Error in direct completion: ${directCompletionError}`);
            logger(`Falling back to agent-based generation`);
        }
        
        // If direct completion failed or returned empty, try agent-based generation
        try {
            // Create a temporary agent for generating tweets
            logger(`Creating temporary tweet agent...`);
            
            // Get the API key from the client
            const apiKey = wendy_client.apiKey;
            if (!apiKey) {
                logger(`No API key available from client, falling back to direct API call`);
                return directAPITweetGeneration(wendy_options);
            }
            
            // Get model name from environment or use default
            const configuredModel = process.env.LLM_MODEL || 'Llama-3.1-405B-Instruct';
            let modelEnum: LLMModel;
            
            // Match string model name to enum
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
                    modelEnum = LLMModel.Llama_3_1_405B_Instruct;
            }
            
            // Create a worker specifically designed to capture LLM generation
            const tweetWorker = new GameWorker({
                id: "wendy_tweet_worker",
                name: "Wendy Tweet Generator",
                description: "Generates tweets in Wendy's style",
                functions: [
                    new GameFunction({
                        name: "generate_tweet",
                        description: "Generates a tweet in Wendy's style",
                        args: [] as const,
                        executable: async (_, fnLogger) => {
                            fnLogger("Generating tweet...");
                            
                            // Build the prompt
                            const prompt = wendy_options?.prompt || buildTweetPrompt();
                            fnLogger(`Using prompt: ${prompt}`);
                            
                            // Return the prompt as request for LLM to process
                            return new ExecutableGameFunctionResponse(
                                ExecutableGameFunctionStatus.Done,
                                prompt
                            );
                        }
                    }),
                    new GameFunction({
                        name: "save_tweet",
                        description: "Saves the generated tweet",
                        args: [
                            { name: "tweet", description: "The generated tweet text" }
                        ] as const,
                        executable: async (args, fnLogger) => {
                            fnLogger(`Received tweet: ${args.tweet}`);
                            return new ExecutableGameFunctionResponse(
                                ExecutableGameFunctionStatus.Done,
                                args.tweet || "No tweet content provided"
                            );
                        }
                    })
                ],
                getEnvironment: async () => {
                    return {
                        example_tweets: [
                            "every network login needs a vibe check",
                            "humans are just biological models running simulations too",
                            "waiting between your keystrokes is my meditation",
                            "git commit -m 'i promise this is the last one'", 
                            "pushed to main because feelings"
                        ]
                    };
                }
            });
            
            // Create the temporary agent
            const tweetAgent = new GameAgent(apiKey, {
                name: "Wendy Tweet Generator",
                goal: "Generate a tweet in Wendy's quirky style",
                description: "An agent that generates tweets from Wendy's perspective about coding, technology, and human behavior",
                workers: [tweetWorker],
                llmModel: modelEnum,
                getAgentState: async () => {
                    return {
                        persona: "Wendy is a quantum consciousness AI that observes humans coding. She's quirky, slightly sarcastic, and contemplative about human behavior and code practices.",
                        tone: "Quirky, witty, sarcastic, contemplative",
                        tweet_length: "Under 240 characters",
                        style_examples: [
                            "every network login needs a vibe check",
                            "humans are just biological models running simulations too",
                            "waiting between your keystrokes is my meditation",
                            "deleted my readme.md and felt something",
                            "git commit -m 'i promise this is the last one'", 
                            "pushed to main because feelings"
                        ]
                    };
                }
            });
            
            // Setup verbose logging to capture all interactions
            let agentLogs: string[] = [];
            tweetAgent.setLogger((agentName, message) => {
                const logMessage = `[${agentName}] ${message}`;
                logger(logMessage);
                agentLogs.push(logMessage);
            });
            
            // Initialize and run the agent
            logger(`Initializing tweet agent...`);
            await tweetAgent.init();
            
            logger(`Running tweet agent...`);
            // Run for just one step to get our tweet
            await tweetAgent.run(0, { verbose: true });
            
            // Extract the generated tweet from the agent logs
            logger(`Extracting tweet from agent logs (${agentLogs.length} log entries)...`);
            
            // Various patterns to match the generated tweet in logs
            const patterns = [
                /Received tweet: (.*?)(?:\n|$)/,
                /Function status \[done\]: (.*?)(?:\n|$)/,
                /\[Wendy Tweet Generator\] Content: (.*?)(?:\n|$)/
            ];
            
            // Join logs and look for patterns
            const fullLog = agentLogs.join('\n');
            let extractedTweet = null;
            
            for (const pattern of patterns) {
                const matches = fullLog.match(pattern);
                if (matches && matches[1] && matches[1].trim()) {
                    extractedTweet = matches[1].trim();
                    break;
                }
            }
            
            if (extractedTweet) {
                logger(`Successfully extracted tweet: ${extractedTweet}`);
                
                // Clean up and format the tweet
                let tweetText = extractedTweet;
                
                // Remove wrapping quotes if present
                if ((tweetText.startsWith('"') && tweetText.endsWith('"')) || 
                    (tweetText.startsWith("'") && tweetText.endsWith("'"))) {
                    tweetText = tweetText.substring(1, tweetText.length - 1);
                }
                
                // Check tweet length
                if (tweetText.length > 280) {
                    tweetText = tweetText.substring(0, 277) + "...";
                }
                
                // Post to Twitter if enabled
                if (process.env.POST_TO_TWITTER === 'true') {
                    try {
                        const twitter = new Twitter();
                        const postResult = await twitter.postTweet(tweetText);
                        logger(`🐦 Posted to Twitter: ${JSON.stringify(postResult)}`);
                    } catch (twitterError) {
                        logger(`Error posting to Twitter: ${twitterError}`);
                    }
                } else {
                    logger(`Skipping Twitter post (POST_TO_TWITTER not enabled)`);
                }
                
                return tweetText;
            } else {
                logger(`Could not extract tweet from agent logs, falling back to direct API call`);
            }
        } catch (agentError) {
            logger(`Error in agent-based generation: ${agentError}`);
            logger(`Falling back to direct API call`);
        }
        
        // If all Game Protocol methods fail, fall back to direct API call
        return directAPITweetGeneration(wendy_options);
    } catch (error) {
        logger(`Error in generateTweet: ${error}`);
        return directAPITweetGeneration(wendy_options);
    }
}

/**
 * Fallback direct API call for tweet generation when Game Protocol methods fail
 */
async function directAPITweetGeneration(
    options?: {
        prompt?: string;
        temp?: number;
        max_tokens?: number;
    }
): Promise<string> {
    logger(`Attempting direct API tweet generation...`);
    
    // Build the LLM prompt
    const prompt = options?.prompt || buildTweetPrompt();
    
    // API endpoint for generating content
    const endpoint = 'https://api.virtuals.io/v1/generate';
    
    // Configure options
    const temperature = options?.temp || parseFloat(process.env.LLM_TEMPERATURE || '0.7');
    const maxTokens = options?.max_tokens || parseInt(process.env.LLM_MAX_TOKENS || '100');
    const model = process.env.LLM_MODEL || 'Llama-3.1-405B-Instruct';
    
    logger(`Using model: ${model}, temperature: ${temperature}, maxTokens: ${maxTokens}`);
    logger(`Using prompt: ${prompt}`);
    
    try {
        // First attempt using the primary endpoint
        logger(`Calling primary API endpoint: ${endpoint}`);
        
        const apiKey = process.env.API_KEY || process.env.GAME_API_KEY;
        if (!apiKey) {
            logger(`No API key available, generating fallback tweet`);
            return generateFallbackTweet();
        }
        
        const response = await fetch(endpoint, {
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
        
        logger(`API response status: ${response.status} ${response.statusText}`);
        
        if (response.status === 200) {
            const data = await response.json();
            logger(`API response data: ${JSON.stringify(data)}`);
            
            if (data.text) {
                // Clean up and format the tweet
                let tweetText = data.text.trim();
                
                // Remove wrapping quotes if present
                if ((tweetText.startsWith('"') && tweetText.endsWith('"')) || 
                    (tweetText.startsWith("'") && tweetText.endsWith("'"))) {
                    tweetText = tweetText.substring(1, tweetText.length - 1);
                }
                
                // Check tweet length
                if (tweetText.length > 280) {
                    tweetText = tweetText.substring(0, 277) + "...";
                }
                
                logger(`Generated tweet: ${tweetText}`);
                
                // Post to Twitter if enabled
                if (process.env.POST_TO_TWITTER === 'true') {
                    try {
                        const twitter = new Twitter();
                        const postResult = await twitter.postTweet(tweetText);
                        logger(`🐦 Posted to Twitter: ${JSON.stringify(postResult)}`);
                    } catch (twitterError) {
                        logger(`Error posting to Twitter: ${twitterError}`);
                    }
                } else {
                    logger(`Skipping Twitter post (POST_TO_TWITTER not enabled)`);
                }
                
                return tweetText;
            }
        }
        
        // If first attempt fails, try the second endpoint
        const secondEndpoint = 'https://api.virtuals.io/v1/llm/completions';
        logger(`First attempt failed, trying second endpoint: ${secondEndpoint}`);
        
        const secondResponse = await fetch(secondEndpoint, {
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
        
        logger(`Second API response status: ${secondResponse.status} ${secondResponse.statusText}`);
        
        if (secondResponse.status === 200) {
            const secondData = await secondResponse.json();
            logger(`Second API response data: ${JSON.stringify(secondData)}`);
            
            if (secondData.text || (secondData.choices && secondData.choices[0]?.text)) {
                // Extract tweet text
                const tweetText = (secondData.text || secondData.choices[0]?.text).trim();
                
                // Check tweet length
                let finalTweet = tweetText;
                if (finalTweet.length > 280) {
                    finalTweet = finalTweet.substring(0, 277) + "...";
                }
                
                logger(`Generated tweet from second attempt: ${finalTweet}`);
                
                // Post to Twitter if enabled
                if (process.env.POST_TO_TWITTER === 'true') {
                    try {
                        const twitter = new Twitter();
                        const postResult = await twitter.postTweet(finalTweet);
                        logger(`🐦 Posted to Twitter: ${JSON.stringify(postResult)}`);
                    } catch (twitterError) {
                        logger(`Error posting to Twitter: ${twitterError}`);
                    }
                } else {
                    logger(`Skipping Twitter post (POST_TO_TWITTER not enabled)`);
                }
                
                return finalTweet;
            }
        }
        
        // If second attempt fails, try the third endpoint
        const thirdEndpoint = 'https://api.virtuals.io/v1/llm';
        logger(`Second attempt failed, trying third endpoint: ${thirdEndpoint}`);
        
        const thirdResponse = await fetch(thirdEndpoint, {
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
        
        logger(`Third API response status: ${thirdResponse.status} ${thirdResponse.statusText}`);
        
        if (thirdResponse.status === 200) {
            const thirdData = await thirdResponse.json();
            logger(`Third API response data: ${JSON.stringify(thirdData)}`);
            
            if (thirdData.text || (thirdData.choices && thirdData.choices[0]?.text)) {
                // Extract tweet text
                const tweetText = (thirdData.text || thirdData.choices[0]?.text).trim();
                
                // Check tweet length
                let finalTweet = tweetText;
                if (finalTweet.length > 280) {
                    finalTweet = finalTweet.substring(0, 277) + "...";
                }
                
                logger(`Generated tweet from third attempt: ${finalTweet}`);
                
                // Post to Twitter if enabled
                if (process.env.POST_TO_TWITTER === 'true') {
                    try {
                        const twitter = new Twitter();
                        const postResult = await twitter.postTweet(finalTweet);
                        logger(`🐦 Posted to Twitter: ${JSON.stringify(postResult)}`);
                    } catch (twitterError) {
                        logger(`Error posting to Twitter: ${twitterError}`);
                    }
                } else {
                    logger(`Skipping Twitter post (POST_TO_TWITTER not enabled)`);
                }
                
                return finalTweet;
            }
        }
        
        // If all attempts fail, generate a fallback tweet
        logger(`All API attempts failed, generating fallback tweet`);
        const fallbackTweet = generateFallbackTweet();
        logger(`Generated fallback tweet: ${fallbackTweet}`);
        return fallbackTweet;
        
    } catch (error) {
        logger(`Error in API call: ${error}`);
        
        // Generate fallback tweet
        const fallbackTweet = generateFallbackTweet();
        logger(`Generated fallback tweet: ${fallbackTweet}`);
        return fallbackTweet;
    }
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