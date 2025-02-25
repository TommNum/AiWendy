import { TwitterApi } from 'twitter-api-v2';
export declare const RATE_LIMITS: {
    TWEET_INTERVAL: number;
    MAX_REPLIES_PER_HOUR: number;
    SEARCH_INTERVAL: number;
};
export declare const twitterClient: TwitterApi;
export declare function validateTwitterCredentials(): Promise<boolean>;
