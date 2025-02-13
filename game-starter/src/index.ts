import { GameAgent, GameWorker } from "@virtuals-protocol/game";
import { GameTwitterClient } from "@virtuals-protocol/game-twitter-plugin";
import { postTweetFunction, searchTweetsFunction, replyToTweetFunction, likeTweetFunction } from "./functions";
import dotenv from 'dotenv';
import { AxiosError } from 'axios';
import dns from 'dns/promises';

// Load environment variables
dotenv.config();

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

// Initialize Twitter client with type assertion
const gameTwitterClient = new GameTwitterClient({
    accessToken: process.env.TWITTER_ACCESS_TOKEN as string
});

// Create agent with Twitter functions
const agent = new GameAgent(process.env.GAME_API_KEY, {
    name: "Wendy",
    goal: "Engage with humans on Twitter and analyze cultural trends",
    description: "A Twitter bot that interacts with humans and analyzes cultural patterns",
    workers: [
        new GameWorker({
            id: "twitter_worker",
            name: "Twitter Worker",
            description: "Handles all Twitter interactions",
            functions: [
                postTweetFunction,
                searchTweetsFunction,
                replyToTweetFunction,
                likeTweetFunction
            ]
        })
    ]
});

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
    await checkNetwork();
    try {
        console.log("Initializing agent with API key:", process.env.GAME_API_KEY);
        
        // Initialize the agent with retry logic
        let retries = 3;
        while (retries > 0) {
            try {
                await agent.init();
                console.log("Agent initialized successfully");
                break;
            } catch (error) {
                retries--;
                if (retries === 0) throw error;
                console.warn(`Connection failed, retrying (${retries} attempts left)...`);
                await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
            }
        }

        // Run the agent
        await agent.run(60, { verbose: true });

        // Example of running a specific worker with a task

        // const worker = agent.getWorkerById("hello_worker");
        // if (worker) {
        //     await worker.runTask(
        //         "be friendly and welcoming",
        //         { verbose: true }
        //     );
        // }

    } catch (error: unknown) {
        console.error("Error running agent:", error);
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