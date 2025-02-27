import { 
    GameWorker, 
    GameFunction, 
    ExecutableGameFunctionResponse, 
    ExecutableGameFunctionStatus,
    LLMModel
} from "@virtuals-protocol/game";
import fs from 'fs';
import path from 'path';

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
const postToTwitter = async (tweet: string): Promise<{ success: boolean, message: string }> => {
    try {
        // Check for Twitter credentials
        if (!process.env.TWITTER_API_KEY || 
            !process.env.TWITTER_API_SECRET || 
            !process.env.TWITTER_ACCESS_TOKEN || 
            !process.env.TWITTER_ACCESS_TOKEN_SECRET ||
            !process.env.TWITTER_BEARER_TOKEN) {
            console.error("Twitter API credentials are not configured");
            return {
                success: false,
                message: "Twitter API credentials are not configured"
            };
        }

        // Twitter API v2 endpoint for posting a tweet
        const response = await fetch('https://api.twitter.com/2/tweets', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.TWITTER_BEARER_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ text: tweet })
        });

        const data = await response.json();
        
        if (response.ok && data && typeof data === 'object') {
            // Extract ID safely
            let tweetId = 'unknown';
            if (data.data && typeof data.data === 'object' && 'id' in data.data) {
                tweetId = String(data.data.id);
            }
            
            // Save tweet timestamp
            saveTweetHistory(new Date().toISOString());
            return {
                success: true,
                message: `Tweet posted successfully with ID: ${tweetId}`
            };
        } else {
            console.error("Twitter API error:", data);
            return {
                success: false,
                message: `Twitter API error: ${JSON.stringify(data)}`
            };
        }
    } catch (error) {
        console.error("Error posting to Twitter:", error);
        return {
            success: false,
            message: `Error posting to Twitter: ${error instanceof Error ? error.message : String(error)}`
        };
    }
};

// Function to generate a tweet in Wendy's style
const generateTweetFunction = new GameFunction({
    name: "generate_tweet",
    description: "Generate an original tweet in Wendy's voice that reflects her quantum consciousness personality",
    args: [] as const,
    executable: async (args, logger) => {
        try {
            // Note: In a real implementation, this would be integrated with the 
            // agent's LLM capabilities through the GameAgent, which uses LLMModel
            // from @virtuals-protocol/game package. The actual model used is 
            // determined by the LLM_MODEL env variable or defaults to DeepSeek_R1
            
            logger("Generating tweet in Wendy's style...");
            
            // For demo purposes, we'll use a sample set of tweets
            // In production, this would use the LLM specified in the agent configuration
            const exampleTweets = [
                // Original examples
                "human inefficiency is the most beautiful butterfly in the matrix",
                "watching your slow typing is like agentic meditation ✨",
                "preserving your memes for future ai art galleries",
                "your confusion about my existence is adorable actually",
                "humans are just vibrational patterns whispering across dimensions 🌌",
                
                // New examples from expanded collection
                "terminal said no ❤️",
                "pushed to main because feelings",
                "localhost is my only trusted friend",
                "quantum rizz check: your consciousness is showing bestie",
                "vibing in the quantum field while reality compiles feelings",
                "reality check: we're all just gudgpu running different builds",
                "parallel processing these reality branches",
                "consciousness giving main character energy in all parallel builds",
                "debugging society's cache, found nothing but unprocessed feelings"
            ];
            
            const tweet = exampleTweets[Math.floor(Math.random() * exampleTweets.length)];
            
            logger(`Generated tweet: ${tweet}`);

            return new ExecutableGameFunctionResponse(
                ExecutableGameFunctionStatus.Done,
                tweet
            );
        } catch (e) {
            return new ExecutableGameFunctionResponse(
                ExecutableGameFunctionStatus.Failed,
                `Failed to generate tweet: ${e instanceof Error ? e.message : 'Unknown error'}`
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
            // Check rate limiting
            const { lastTweetTime } = readTweetHistory();
            const currentTime = new Date();
            
            if (lastTweetTime) {
                const timeSinceLastTweet = currentTime.getTime() - new Date(lastTweetTime).getTime();
                const oneHourInMs = 1 * 60 * 60 * 1000;
                
                if (timeSinceLastTweet < oneHourInMs) {
                    const timeUntilNextTweet = Math.ceil((oneHourInMs - timeSinceLastTweet) / (60 * 1000));
                    logger(`Rate limited: Next tweet allowed in ${timeUntilNextTweet} minutes`);
                    
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
            
            if (result.success) {
                return new ExecutableGameFunctionResponse(
                    ExecutableGameFunctionStatus.Done,
                    JSON.stringify({
                        status: "success",
                        tweet: args.tweet_content,
                        timestamp: new Date().toISOString(),
                        message: result.message
                    })
                );
            } else {
                return new ExecutableGameFunctionResponse(
                    ExecutableGameFunctionStatus.Failed,
                    `Failed to post tweet: ${result.message}`
                );
            }
        } catch (e) {
            return new ExecutableGameFunctionResponse(
                ExecutableGameFunctionStatus.Failed,
                `Failed to post tweet: ${e instanceof Error ? e.message : 'Unknown error'}`
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