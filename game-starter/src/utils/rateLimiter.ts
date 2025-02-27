// Rate limiter implementation for different API services
export class RateLimiter {
    private maxTokens: number;
    private tokensPerInterval: number;
    private intervalMs: number;
    private currentTokens: number;
    private lastRefillTime: number;
    private name: string;
    private requestsThisInterval: number = 0;
    private intervalStartTime: number;

    constructor(maxRequestsPerInterval: number, intervalMinutes: number, name: string) {
        this.maxTokens = maxRequestsPerInterval;
        this.intervalMs = intervalMinutes * 60 * 1000;
        this.tokensPerInterval = maxRequestsPerInterval;
        this.currentTokens = maxRequestsPerInterval;
        this.lastRefillTime = Date.now();
        this.intervalStartTime = Date.now();
        this.name = name;
    }

    private refillTokens(): void {
        const now = Date.now();
        const elapsedTime = now - this.lastRefillTime;
        
        // Check if we've moved to a new interval
        if (now - this.intervalStartTime >= this.intervalMs) {
            console.log(`[${this.name}] New rate limit interval started. Used ${this.requestsThisInterval}/${this.maxTokens} in previous interval.`);
            this.intervalStartTime = now;
            this.requestsThisInterval = 0;
        }
        
        // Calculate tokens to add based on elapsed time
        const tokensToAdd = (elapsedTime / this.intervalMs) * this.tokensPerInterval;
        
        if (tokensToAdd > 0) {
            const oldTokens = this.currentTokens;
            this.currentTokens = Math.min(this.maxTokens, this.currentTokens + tokensToAdd);
            this.lastRefillTime = now;
            
            if (Math.floor(oldTokens) !== Math.floor(this.currentTokens)) {
                console.log(`[${this.name}] Refilled tokens: ${oldTokens.toFixed(2)} → ${this.currentTokens.toFixed(2)}`);
            }
        }
    }

    private calculateWaitTime(): number {
        // Calculate how long until we get one token
        const tokensNeeded = 1 - this.currentTokens;
        return (tokensNeeded / this.tokensPerInterval) * this.intervalMs;
    }

    async getToken(): Promise<void> {
        // Refill tokens based on elapsed time
        this.refillTokens();
        
        if (this.currentTokens >= 1) {
            // We have a token available, consume it
            this.currentTokens -= 1;
            this.requestsThisInterval += 1;
            console.log(`[${this.name}] Token consumed. ${this.currentTokens.toFixed(2)} tokens remaining. Used ${this.requestsThisInterval}/${this.maxTokens} this interval.`);
            return Promise.resolve();
        } else {
            // No tokens available, calculate wait time for next token
            const waitTime = this.calculateWaitTime();
            console.log(`[${this.name}] Rate limiting: Waiting ${Math.ceil(waitTime/1000)} seconds before next call... (${this.requestsThisInterval}/${this.maxTokens} requests used this interval)`);
            
            // Wait until we can get a token
            return new Promise(resolve => {
                setTimeout(() => {
                    this.refillTokens();
                    this.currentTokens -= 1;
                    this.requestsThisInterval += 1;
                    console.log(`[${this.name}] Token consumed after waiting. ${this.currentTokens.toFixed(2)} tokens remaining.`);
                    resolve();
                }, waitTime);
            });
        }
    }

    // Public method to check current token status without consuming
    getStatus(): {currentTokens: number, requestsThisInterval: number, maxTokens: number} {
        this.refillTokens();
        return {
            currentTokens: this.currentTokens,
            requestsThisInterval: this.requestsThisInterval,
            maxTokens: this.maxTokens
        };
    }
}

// Singleton instances for different APIs

// Primary Twitter API rate limiter - 300 requests per 15 min (Basic tier)
export const twitterApiRateLimiter = new RateLimiter(300, 15, "Twitter API");

// Mentions endpoint rate limiter - 10 requests per 15 min (Basic tier)
export const twitterMentionsRateLimiter = new RateLimiter(10, 15, "Twitter Mentions");

// Virtuals API rate limiter
export const virtualsApiRateLimiter = new RateLimiter(30, 5, "Virtuals API");

// Replies rate limiter - 50 per hour (user's requirement)
export const twitterRepliesRateLimiter = new RateLimiter(50, 60, "Twitter Replies");

// Likes rate limiter - 200 per day (Basic tier)
export const twitterLikesRateLimiter = new RateLimiter(200, 24 * 60, "Twitter Likes");

// Tweets rate limiter - 100 per 24 hours (Basic tier)
export const twitterTweetsRateLimiter = new RateLimiter(100, 24 * 60, "Twitter Tweets"); 