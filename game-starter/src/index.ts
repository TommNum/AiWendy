import { activity_agent } from './agent';

// Define action types for the game protocol
enum ActionType {
    CallFunction = "call_function",
    ContinueFunction = "continue_function",
    Wait = "wait",
    GoTo = "go_to",
    Unknown = "unknown"
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

/**
 * Post an initial tweet and schedule future tweets
 */
async function initializeAndScheduleTweets() {
    try {
        console.log('🐦 Initializing tweet functionality...');
        
        // Navigate to tweet worker first (if not already there)
        await activity_agent.step({ verbose: true });
        
        // Generate the initial tweet
        const generateAction = await activity_agent.step({ verbose: true });
        if (generateAction === ActionType.CallFunction || generateAction === ActionType.ContinueFunction) {
            console.log('Generated initial tweet');
            
            // Post the tweet
            const postAction = await activity_agent.step({ verbose: true });
            console.log(`Initial tweet posted: ${postAction}`);
        }
        
        // Schedule tweet checks every 30 minutes
        setInterval(async () => {
            try {
                console.log('🔄 Checking if it\'s time for a new tweet...');
                
                // Navigate to tweet worker (if not there)
                await activity_agent.step({ verbose: true });
                
                // Generate tweet (this will respect the rate limiting)
                const generateAction = await activity_agent.step({ verbose: true });
                if (generateAction === ActionType.CallFunction || generateAction === ActionType.ContinueFunction) {
                    // Post the tweet
                    await activity_agent.step({ verbose: true });
                }
            } catch (error) {
                console.error('Error in tweet scheduling:', error);
            }
        }, 30 * 60 * 1000); // Check every 30 minutes
        
    } catch (error) {
        console.error('Error initializing tweet functionality:', error);
    }
}

async function main() {
    try {
        // Initialize the agent
        await activity_agent.init();
        
        // Create rate limiter: 30 calls per 5 minutes
        const rateLimiter = new RateLimiter(30, 5);
        
        // Initialize tweet functionality
        await initializeAndScheduleTweets();
        
        // Run the agent with rate limiting
        while (true) {
            // Get token before making a call (will wait if needed)
            await rateLimiter.getToken();
            
            // Execute step after getting a token
            console.log(`Executing step at ${new Date().toISOString()}`);
            await activity_agent.step({ verbose: true });
        }
    } catch (error) {
        console.error("Error running activity recommender:", error);
    }
}

main();