import { activity_agent } from './agent';
import { virtualsApiRateLimiter, twitterMentionsRateLimiter } from './utils/rateLimiter';

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

// Initialize and schedule tweets
async function initializeAndScheduleTweets() {
    try {
        console.log("🐦 Initializing tweet functionality...");
        
        // Post an initial tweet at startup
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
        
        // First interval: Schedule regular mention checks every 3 minutes
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
        }, 3 * 60 * 1000); // 3 minutes in milliseconds
        
        // Second interval: Additional mention checks in Twitter-only mode every 3 minutes
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
        }, 3 * 60 * 1000); // 3 minutes in milliseconds
        
    } catch (error) {
        console.error("Error initializing mention checks:", error);
    }
}

// Initialize and schedule tweet searches
async function initializeAndScheduleTweetSearches() {
    try {
        console.log("🔎 Initializing tweet search functionality...");
        
        // Schedule regular tweet searches every 5 minutes
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
        }, 5 * 60 * 1000); // 5 minutes in milliseconds
        
    } catch (error) {
        console.error("Error initializing tweet searches:", error);
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