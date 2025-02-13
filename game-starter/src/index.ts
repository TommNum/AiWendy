import { GameAgent, GameWorker } from "@virtuals-protocol/game";
import { TwitterClient } from "@virtuals-protocol/game-twitter-plugin";
import { helloFunction, TwitterFunctionManager } from "./functions";
import dotenv from 'dotenv';
import { AxiosError } from 'axios';
import dns from 'dns/promises';
import path from 'path';
import { initializeWorkers, createAgent } from "./worker";
import './startup';

// Load environment variables with explicit path
dotenv.config({ path: '/Users/tripp/WenProd/AiWendy/game-starter/.env' });

// Add debug logging to verify the file is being loaded
console.log('Loading .env file from:', '/Users/tripp/WenProd/AiWendy/game-starter/.env');

// Debug: Check if environment variables are loaded
console.log('Environment variables:', {
    GAME_API_KEY: process.env.GAME_API_KEY,
    TWITTER_API_KEY: process.env.TWITTER_API_KEY,
    TWITTER_ACCESS_TOKEN: process.env.TWITTER_ACCESS_TOKEN
});

// Validate API key
if (!process.env.GAME_API_KEY) {
    console.error("Error: GAME_API_KEY is missing in .env file");
    process.exit(1);
}

if (!process.env.TWITTER_ACCESS_TOKEN) {
    console.error("Error: TWITTER_ACCESS_TOKEN is missing in .env file");
    process.exit(1);
}

console.log("Environment variables loaded successfully");
console.log("Using API key:", process.env.GAME_API_KEY);

// Validate Twitter credentials
const validateTwitterCredentials = () => {
    const requiredVars = [
        'TWITTER_API_KEY',
        'TWITTER_API_SECRET',
        'TWITTER_ACCESS_TOKEN',
        'TWITTER_ACCESS_TOKEN_SECRET'
    ];

    for (const varName of requiredVars) {
        if (!process.env[varName]) {
            throw new Error(`Missing required environment variable: ${varName}`);
        }
    }
};

// Initialize Twitter client with proper error handling
const initializeTwitterClient = () => {
    try {
        validateTwitterCredentials();
        
        const twitterClient = new TwitterClient({
            apiKey: process.env.TWITTER_API_KEY!,
            apiSecretKey: process.env.TWITTER_API_SECRET!,
            accessToken: process.env.TWITTER_ACCESS_TOKEN!,
            accessTokenSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET!
        });

        console.log('Twitter client initialized successfully');
        return twitterClient;
    } catch (error) {
        console.error('Failed to initialize Twitter client:', error);
        throw error;
    }
};

async function checkNetwork() {
    try {
        await dns.resolve('sdk.game.virtuals.io');
        console.log("Network connectivity verified");
    } catch (error) {
        console.error("Network connectivity issue:", error);
        process.exit(1);
    }
}

async function main() {
    try {
        // Initialize Twitter client first
        const twitterClient = initializeTwitterClient();
        const twitterFunctions = new TwitterFunctionManager(twitterClient);
        
        await checkNetwork();
        console.log("Initializing agent with API key:", process.env.GAME_API_KEY);
        
        // Initialize the agent with retry logic
        let retries = 3;
        let agent: GameAgent | null = null;  // Declare agent outside the loop

        while (retries > 0) {
            try {
                agent = createAgent(twitterFunctions);
                await agent.init();
                console.log("Agent initialized successfully");
                break;
            } catch (error) {
                retries--;
                if (retries === 0) throw error;
                console.warn(`Connection failed, retrying (${retries} attempts left)...`);
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }

        if (!agent) {
            throw new Error("Failed to initialize agent after retries");
        }

        // Run the agent
        await agent.step({ verbose: true });  // Use step instead of run for better control

        // Optional: Set up continuous operation
        while (true) {
            await agent.step({ verbose: true });
            await new Promise(resolve => setTimeout(resolve, 60000)); // Wait 1 minute between steps
        }

    } catch (error: unknown) {
        console.error("Error:", error);
        if (error instanceof AxiosError) {
            console.error("API Response:", error.response?.data);
            console.error("Request Config:", {
                url: error.config?.url,
                headers: error.config?.headers
            });
        }
        process.exit(1);
    }
}

console.log("GAME SDK Starter Project is running!");

main();

// Export any necessary items
export * from './worker';
export * from './functions';
export * from './agent';