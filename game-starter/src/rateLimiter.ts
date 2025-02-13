export class RateLimiter {
    private tokens: number;
    private lastRefill: number;
    private maxTokens: number;
    private refillTime: number;

    constructor(maxTokens: number, refillTimeMs: number) {
        this.maxTokens = maxTokens;
        this.tokens = maxTokens;
        this.lastRefill = Date.now();
        this.refillTime = refillTimeMs;
    }

    private refill() {
        const now = Date.now();
        const timePassed = now - this.lastRefill;
        const refillCycles = Math.floor(timePassed / this.refillTime);
        
        if (refillCycles > 0) {
            this.tokens = Math.min(this.maxTokens, this.tokens + (refillCycles * this.maxTokens));
            this.lastRefill = now;
        }
    }

    tryAcquire(): boolean {
        this.refill();
        if (this.tokens > 0) {
            this.tokens--;
            return true;
        }
        return false;
    }

    getRemainingTokens(): number {
        this.refill();
        return this.tokens;
    }

    getTimeUntilNextRefill(): number {
        const now = Date.now();
        const timeSinceLastRefill = now - this.lastRefill;
        return Math.max(0, this.refillTime - timeSinceLastRefill);
    }
} 