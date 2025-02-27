// Rate limiter implementation for different API services
export class RateLimiter {
    private maxTokens: number;
    private tokensPerInterval: number;
    private intervalMs: number;
    private currentTokens: number;
    private lastRefillTime: number;
    private name: string;

    constructor(maxRequestsPerInterval: number, intervalMinutes: number, name: string) {
        this.maxTokens = maxRequestsPerInterval;
        this.intervalMs = intervalMinutes * 60 * 1000;
        this.tokensPerInterval = maxRequestsPerInterval;
        this.currentTokens = maxRequestsPerInterval;
        this.lastRefillTime = Date.now();
        this.name = name;
    }

    private refillTokens(): void {
        const now = Date.now();
        const elapsedTime = now - this.lastRefillTime;
        
        // Calculate tokens to add based on elapsed time
        const tokensToAdd = (elapsedTime / this.intervalMs) * this.tokensPerInterval;
        
        if (tokensToAdd > 0) {
            this.currentTokens = Math.min(this.maxTokens, this.currentTokens + tokensToAdd);
            this.lastRefillTime = now;
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
            return Promise.resolve();
        } else {
            // No tokens available, calculate wait time for next token
            const waitTime = this.calculateWaitTime();
            console.log(`[${this.name}] Rate limiting: Waiting ${Math.ceil(waitTime/1000)} seconds before next call...`);
            
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
}

// Singleton instances for different APIs
export const twitterApiRateLimiter = new RateLimiter(30, 5, "Twitter API");
export const twitterMentionsRateLimiter = new RateLimiter(2, 5, "Twitter Mentions");
export const virtualsApiRateLimiter = new RateLimiter(30, 5, "Virtuals API"); 