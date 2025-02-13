import { initializeWorkers } from './worker';
import { TwitterFunctionManager } from './functions';
import { TwitterClient } from "@virtuals-protocol/game-twitter-plugin";
import * as dotenv from 'dotenv';
import path from 'path';
import { createAgent } from './agent';

async function startup() {
    try {
        // Load environment variables with explicit path
        const envPath = path.resolve(process.cwd(), '.env');
        dotenv.config({ path: envPath });
        
        console.log('Loading environment from:', envPath);
        
        // Validate Twitter credentials
        const requiredEnvVars = [
            'TWITTER_API_KEY',
            'TWITTER_API_SECRET',
            'TWITTER_ACCESS_TOKEN',
            'TWITTER_ACCESS_TOKEN_SECRET'
        ];

        const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
        if (missingVars.length > 0) {
            throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
        }

        // Initialize Twitter client with logging
        console.log('Initializing Twitter client...');
        const twitterClient = new TwitterClient({
            apiKey: process.env.TWITTER_API_KEY!,
            apiSecretKey: process.env.TWITTER_API_SECRET!,
            accessToken: process.env.TWITTER_ACCESS_TOKEN!,
            accessTokenSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET!
        });

        // Test Twitter client connection
        try {
            console.log('Testing Twitter client connection...');
            // Add a simple test API call here if available in your TwitterClient
            console.log('Twitter client initialized successfully');
        } catch (error) {
            console.error('Failed to verify Twitter client:', error);
            throw error;
        }

        // Initialize Twitter functions with client
        console.log('Initializing Twitter functions...');
        const twitterFunctions = new TwitterFunctionManager(twitterClient);
        
        // Create and initialize the agent
        console.log('Creating agent...');
        const agent = createAgent(twitterFunctions);

        // Enhanced logging for agent initialization
        agent.setLogger((agent, message) => {
            console.log(`\n🤖 [${agent.name}] ${new Date().toISOString()}`);
            console.log(message);
            
            // Log worker transitions
            if (message.includes('worker')) {
                console.log('🔄 Worker Transition:', message);
            }
            
            // Log function calls
            if (message.includes('function')) {
                console.log('⚡ Function Call:', message);
            }
            
            // Log state changes
            if (message.includes('state')) {
                console.log('📊 State Change:', message);
            }
            
            console.log("✨ End of action ✨\n");
        });

        console.log('Initializing agent...');
        await agent.init();

        // Start the agent loop with all workers
        console.log('Starting agent loop...');
        while (true) {
            try {
                await agent.step({ verbose: true });
                
                // Log current worker status
                const workers = Object.values(initializeWorkers(twitterFunctions));
                console.log('\n🔍 Current Workers Status:');
                workers.forEach(worker => {
                    console.log(`- ${worker.name}: Active`);
                });
                
                // Add a delay between steps to prevent rate limiting
                await new Promise(resolve => setTimeout(resolve, 30000)); // 30 second delay
            } catch (error) {
                console.error('Error in agent step:', error);
                // Continue running even if there's an error
                await new Promise(resolve => setTimeout(resolve, 60000)); // 1 minute delay on error
            }
        }
        
    } catch (error) {
        console.error('Error during startup:', error);
        console.error('Stack trace:', error instanceof Error ? error.stack : '');
        process.exit(1);
    }
}

// Handle process signals
process.on('SIGTERM', async () => {
    console.log('Received SIGTERM signal. Shutting down gracefully...');
    process.exit(0);
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    console.error('Stack trace:', error.stack);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise);
    console.error('Reason:', reason);
});

startup(); 