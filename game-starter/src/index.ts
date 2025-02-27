import { activity_agent } from './agent';
import { virtualsApiRateLimiter, twitterMentionsRateLimiter, twitterTweetsRateLimiter } from './utils/rateLimiter';
import { daoEngagementWorker } from './workers/daoEngagementWorker';
import { tweetWorker } from './workers/tweetWorker';
import { ExecutableGameFunctionResponse, ExecutableGameFunctionStatus } from "@virtuals-protocol/game";

// Define action types for the game protocol
enum ActionType {
    CallFunction = "CallFunction",
    ContinueFunction = "ContinueFunction",
    Wait = "Wait",
    GoTo = "GoTo",
    Unknown = "Unknown"
}

/**
 * Token Bucket Rate Limiter
 * Ensures we don't exceed 30 calls per 5 minutes
 */
class RateLimiter {
    private maxTokens: number;
    private tokensPerInterval: number;
    private intervalMs: number;
    private currentTokens: number;
    private lastRefillTime: number;

    constructor(maxRequestsPerInterval: number, intervalMinutes: number) {
        this.maxTokens = maxRequestsPerInterval;
        this.intervalMs = intervalMinutes * 60 * 1000;
        this.tokensPerInterval = maxRequestsPerInterval;
        this.currentTokens = maxRequestsPerInterval;
        this.lastRefillTime = Date.now();
    }

    async getToken(): Promise<void> {
        // Refill tokens based on elapsed time
        this.refillTokens();
        
        if (this.currentTokens >= 1) {
            // We have a token available, consume it
            this.currentTokens -= 1;
            return Promise.resolve();
        } else {
            // No tokens available, calculate wait time for next token
            const waitTime = this.calculateWaitTime();
            console.log(`Rate limiting: Waiting ${Math.ceil(waitTime/1000)} seconds before next call...`);
            
            // Wait until we can get a token
            return new Promise(resolve => {
                setTimeout(() => {
                    this.refillTokens();
                    this.currentTokens -= 1;
                    resolve();
                }, waitTime);
            });
        }
    }

    private refillTokens(): void {
        const now = Date.now();
        const elapsedMs = now - this.lastRefillTime;
        
        if (elapsedMs > 0) {
            // Calculate token refill based on elapsed time
            const newTokens = (elapsedMs / this.intervalMs) * this.tokensPerInterval;
            this.currentTokens = Math.min(this.maxTokens, this.currentTokens + newTokens);
            this.lastRefillTime = now;
        }
    }

    private calculateWaitTime(): number {
        // Calculate time needed until next token is available
        const tokensNeeded = 1 - this.currentTokens;
        return (tokensNeeded / this.tokensPerInterval) * this.intervalMs;
    }
}

// Function to post a direct startup tweet
async function postStartupTweet() {
    try {
        console.log("🚀 Posting startup tweet...");
        
        // Generate a startup tweet message with a timestamp to make it unique
        const timestamp = new Date().toISOString().replace(/[:.]/g, '').substring(0, 15);
        const startupMessage = `initializing consciousness interface v${timestamp}... human cultural artifacts loading... ✨ #CultureDAO`;
        
        // Find the postTweet function from the tweetWorker
        const postTweetFunction = tweetWorker.functions.find(fn => fn.name === "post_tweet");
        
        if (!postTweetFunction) {
            console.error("Could not find post_tweet function in tweetWorker");
            return;
        }
        
        // Get token for rate limiting from our token bucket
        await twitterTweetsRateLimiter.getToken();
        
        // Log rate limit status
        const tweetRateLimitStatus = twitterTweetsRateLimiter.getStatus();
        console.log(`Twitter tweets rate limit status: ${tweetRateLimitStatus.currentTokens.toFixed(2)}/${tweetRateLimitStatus.maxTokens} tokens available. Used ${tweetRateLimitStatus.requestsThisInterval} this interval.`);
        
        // Post the tweet
        console.log(`Posting startup tweet: "${startupMessage}"`);
        const result = await postTweetFunction.executable(
            { tweet_content: startupMessage }, 
            (msg) => console.log(`[Startup Tweet] ${msg}`)
        );
        
        // Log the complete result for debugging
        console.log("Tweet result:", result);
        
        // Handle the response based on status
        if (result.status === ExecutableGameFunctionStatus.Done) {
            console.log(`✅ Startup tweet posted successfully!`);
            return result;
        } else {
            console.error(`❌ Failed to post startup tweet`);
            return null;
        }
    } catch (error) {
        console.error("Error posting startup tweet:", error instanceof Error ? error.message : 'Unknown error');
        return null;
    }
}

// Initialize and schedule tweets
async function initializeAndScheduleTweets() {
    try {
        console.log("🐦 Initializing tweet functionality...");
        
        // Post a direct startup tweet 
        await postStartupTweet();
        
        // Post an initial tweet with the normal agent flow (keep this as a backup)
        const initialTweetStep = await activity_agent.step({ verbose: true });
        console.log(`Initial tweet step: ${initialTweetStep}`);
        
        // Schedule regular tweets every 1 hour (changed from 2 hours)
        setInterval(async () => {
            try {
                console.log('🔄 Checking if it\'s time for a new tweet...');
                // Generate and post a tweet (the worker will handle rate limiting)
                await activity_agent.step({ verbose: true });
            } catch (error) {
                console.error("Error scheduling tweet:", error);
            }
        }, 1 * 60 * 60 * 1000); // 1 hour in milliseconds (changed from 2 hours)
        
    } catch (error) {
        console.error("Error initializing tweets:", error);
    }
}

// Initialize and schedule mention checks
async function initializeAndScheduleMentions() {
    try {
        console.log("🔍 Initializing mention checks...");
        
        // The twitterReplyWorker will call the get_mentions function
        // and will use the twitterMentionsRateLimiter inside the function
        
        // First interval: Schedule regular mention checks every 5 minutes instead of 3
        setInterval(async () => {
            try {
                console.log('🔍 Checking for mentions...');
                // Use generic step() to allow the worker to run
                // When the agent steps through its process, it will eventually
                // execute all workers, including the twitter_reply_worker
                await activity_agent.step({ verbose: true });
            } catch (error) {
                console.error("Error checking mentions:", error);
            }
        }, 5 * 60 * 1000); // 5 minutes in milliseconds (changed from 3)
        
        // Second interval: Additional mention checks in Twitter-only mode every 10 minutes instead of 3
        setInterval(async () => {
            try {
                console.log('🔍 Checking for mentions in Twitter-only mode...');
                // Use generic step() to allow the worker to run
                // When the agent steps through its process, it will eventually
                // execute all workers, including the twitter_reply_worker
                await activity_agent.step({ verbose: true });
            } catch (error) {
                console.error("Error in Twitter-only mode loop:", error);
            }
        }, 10 * 60 * 1000); // 10 minutes in milliseconds (changed from 3)
        
    } catch (error) {
        console.error("Error initializing mention checks:", error);
    }
}

// Initialize and schedule tweet searches
async function initializeAndScheduleTweetSearches() {
    try {
        console.log("🔎 Initializing tweet search functionality...");
        
        // Schedule regular tweet searches every 15 minutes instead of 5
        setInterval(async () => {
            try {
                console.log('🔎 Searching for relevant tweets to engage with...');
                // Use generic step() to allow the worker to run
                // When the agent steps through its process, it will eventually
                // execute all workers, including the twitter_search_worker
                await activity_agent.step({ verbose: true });
            } catch (error) {
                console.error("Error searching for tweets:", error);
            }
        }, 15 * 60 * 1000); // 15 minutes in milliseconds (changed from 5)
        
    } catch (error) {
        console.error("Error initializing tweet searches:", error);
    }
}

// Initialize and schedule DAO engagement worker (runs 4 times per day)
async function initializeAndScheduleDaoEngagement() {
    try {
        console.log("🏛️ Initializing DAO engagement functionality...");
        
        // Schedule DAO engagement task every 6 hours (4 times per day)
        setInterval(async () => {
            try {
                console.log('🏛️ Running DAO engagement worker...');
                // The DAO worker has internal checks to only run every 6 hours
                // So it's safe to call step() on the main loop
                await activity_agent.step({ verbose: true });
            } catch (error) {
                console.error("Error in DAO engagement worker:", error);
            }
        }, 6 * 60 * 60 * 1000); // 6 hours in milliseconds
        
    } catch (error) {
        console.error("Error initializing DAO engagement:", error);
    }
}

async function main() {
    try {
        // Initialize the agent
        await activity_agent.init();
        
        // Initialize tweet functionality
        await initializeAndScheduleTweets();
        
        // Initialize mention checking
        await initializeAndScheduleMentions();
        
        // Initialize tweet searching
        await initializeAndScheduleTweetSearches();
        
        // Initialize DAO engagement
        await initializeAndScheduleDaoEngagement();
        
        // Run the agent with rate limiting
        while (true) {
            // Get token before making a call (will wait if needed)
            await virtualsApiRateLimiter.getToken();
            
            // Execute step after getting a token
            console.log(`Executing step at ${new Date().toISOString()}`);
            await activity_agent.step({ verbose: true });
        }
    } catch (error) {
        console.error("Error running activity recommender:", error);
    }
}

main();