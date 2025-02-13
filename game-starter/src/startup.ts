import { initializeWorkers } from './worker';
import { TwitterFunctionManager } from './functions';
import { TwitterClient } from "@virtuals-protocol/game-twitter-plugin";
import * as dotenv from 'dotenv';

async function startup() {
    // Load environment variables
    dotenv.config();
    
    try {
        // Initialize Twitter client
        const twitterClient = new TwitterClient({
            apiKey: process.env.TWITTER_API_KEY!,
            apiSecretKey: process.env.TWITTER_API_SECRET!,
            accessToken: process.env.TWITTER_ACCESS_TOKEN!,
            accessTokenSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET!
        });

        // Initialize Twitter functions with client
        const twitterFunctions = new TwitterFunctionManager(twitterClient);
        
        // Initialize workers
        const workers = initializeWorkers(twitterFunctions);
        
        // Log successful initialization
        console.log('Workers initialized successfully');
        
        // Handle graceful shutdown
        process.on('SIGTERM', async () => {
            console.log('Received SIGTERM signal. Shutting down gracefully...');
            process.exit(0);
        });
        
        // Keep the process running
        process.on('uncaughtException', (error) => {
            console.error('Uncaught Exception:', error);
        });
        
        process.on('unhandledRejection', (reason, promise) => {
            console.error('Unhandled Rejection at:', promise, 'reason:', reason);
        });
        
    } catch (error) {
        console.error('Error during startup:', error);
        process.exit(1);
    }
}

startup(); 