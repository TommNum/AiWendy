// Rate limiter implementation for different API services
import fs from 'fs';
import path from 'path';

// Default storage location for rate limiter state
const RATE_LIMITER_DIR = path.join(process.cwd(), 'data', 'rate-limiters');

// Make sure the directory exists
if (!fs.existsSync(RATE_LIMITER_DIR)) {
    fs.mkdirSync(RATE_LIMITER_DIR, { recursive: true });
}

export class RateLimiter {
    private maxTokens: number;
    private tokensPerInterval: number;
    private intervalMs: number;
    private currentTokens: number = 0;
    private lastRefillTime: number = Date.now();
    private name: string;
    private requestsThisInterval: number = 0;
    private intervalStartTime: number = Date.now();
    private lastTweetTime: number = 0;
    private persistencePath: string;
    private persistenceEnabled: boolean;

    constructor(maxRequestsPerInterval: number, intervalMinutes: number, name: string, enablePersistence: boolean = true) {
        this.maxTokens = maxRequestsPerInterval;
        this.intervalMs = intervalMinutes * 60 * 1000;
        this.tokensPerInterval = maxRequestsPerInterval;
        this.name = name;
        this.persistenceEnabled = enablePersistence;
        this.persistencePath = path.join(RATE_LIMITER_DIR, `${this.name.replace(/[^a-z0-9_-]/gi, '_').toLowerCase()}.json`);
        
        // Try to load persisted state if enabled
        if (this.persistenceEnabled) {
            const loadedState = this.loadState();
            if (loadedState) {
                // Check if saved state is still valid (not too old)
                const now = Date.now();
                if ((now - loadedState.lastRefillTime) < (intervalMinutes * 120 * 1000)) { // 2x interval as max age
                    this.currentTokens = loadedState.currentTokens;
                    this.lastRefillTime = loadedState.lastRefillTime;
                    this.requestsThisInterval = loadedState.requestsThisInterval;
                    this.intervalStartTime = loadedState.intervalStartTime;
                    this.lastTweetTime = loadedState.lastTweetTime || 0;
                    console.log(`[${this.name}] Loaded persisted state: ${this.currentTokens.toFixed(2)} tokens, ${this.requestsThisInterval} requests this interval`);
                } else {
                    console.log(`[${this.name}] Persisted state too old, starting fresh`);
                    this.initializeDefaultState();
                }
            } else {
                this.initializeDefaultState();
            }
        } else {
            this.initializeDefaultState();
        }
    }
    
    private initializeDefaultState(): void {
        this.currentTokens = this.maxTokens;
        this.lastRefillTime = Date.now();
        this.intervalStartTime = Date.now();
    }
    
    private persistState(): void {
        if (!this.persistenceEnabled) return;
        
        try {
            const state = {
                maxTokens: this.maxTokens,
                tokensPerInterval: this.tokensPerInterval,
                intervalMs: this.intervalMs,
                currentTokens: this.currentTokens,
                lastRefillTime: this.lastRefillTime,
                requestsThisInterval: this.requestsThisInterval,
                intervalStartTime: this.intervalStartTime,
                lastTweetTime: this.lastTweetTime,
                lastUpdate: Date.now()
            };
            
            fs.writeFileSync(this.persistencePath, JSON.stringify(state, null, 2));
        } catch (error) {
            console.error(`[${this.name}] Error persisting rate limiter state:`, error);
        }
    }
    
    private loadState(): any {
        try {
            if (fs.existsSync(this.persistencePath)) {
                const data = fs.readFileSync(this.persistencePath, 'utf8');
                return JSON.parse(data);
            }
        } catch (error) {
            console.error(`[${this.name}] Error loading rate limiter state:`, error);
        }
        return null;
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
            
            // Persist state after significant token changes
            if (Math.floor(oldTokens) !== Math.floor(this.currentTokens)) {
                this.persistState();
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
            this.persistState();
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
                    this.persistState();
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

    // Method to check if we can tweet
    canTweet(): boolean {
        this.refillTokens();
        return this.currentTokens >= 1;
    }

    // Method to mark a tweet as posted
    markTweet(): void {
        this.currentTokens -= 1;
        this.requestsThisInterval += 1;
        this.lastTweetTime = Date.now();
        console.log(`[${this.name}] Tweet posted. ${this.currentTokens.toFixed(2)} tokens remaining. Used ${this.requestsThisInterval}/${this.maxTokens} this interval.`);
        this.persistState();
    }

    // Method to get time until next tweet
    timeUntilNextTweet(): number {
        this.refillTokens();
        if (this.canTweet()) {
            return 0;
        }
        return this.calculateWaitTime();
    }
    
    /**
     * Schedule a function to be executed with rate limiting
     * @param fn Function to execute after obtaining a rate limit token
     * @returns Result of the function
     */
    async schedule<T>(fn: () => Promise<T>): Promise<T> {
        // Get a token before executing the function
        await this.getToken();
        
        // Execute the function
        try {
            return await fn();
        } catch (error) {
            // If function fails, we still consumed the token
            console.error(`[${this.name}] Scheduled function failed:`, error);
            throw error;
        }
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