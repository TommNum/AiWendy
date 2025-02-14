import { GameAgent } from "@virtuals-protocol/game";
import { TwitterClient } from "@virtuals-protocol/game-twitter-plugin";
import { initializeWorkers } from "../worker";
import { TwitterFunctionManager } from "../functions";
import dotenv from "dotenv";
import path from "path";

// Load environment variables from the correct absolute path
const envPath = path.resolve('/Users/tripp/WenProd/AiWendy/game-starter/.env');
console.log('Loading environment from:', envPath);
dotenv.config({ path: envPath });

// Add more detailed debug logging
console.log('Environment variables loaded:', {
    TWITTER_API_KEY: process.env.TWITTER_API_KEY ? '✓' : '✗',
    TWITTER_API_SECRET: process.env.TWITTER_API_SECRET ? '✓' : '✗',
    TWITTER_ACCESS_TOKEN: process.env.TWITTER_ACCESS_TOKEN ? '✓' : '✗',
    TWITTER_ACCESS_TOKEN_SECRET: process.env.TWITTER_ACCESS_TOKEN_SECRET ? '✓' : '✗',
    GAME_API_KEY: process.env.GAME_API_KEY ? '✓' : '✗'
});

// Add error details logging to getDmEvents in TwitterClient
console.log('Current working directory:', process.cwd());

async function testDmManager() {
    // Verify environment variables are loaded
    console.log('Checking environment variables...');
    if (!process.env.TWITTER_API_KEY || !process.env.TWITTER_API_SECRET || 
        !process.env.TWITTER_ACCESS_TOKEN || !process.env.TWITTER_ACCESS_TOKEN_SECRET || 
        !process.env.GAME_API_KEY) {
        throw new Error('Required environment variables are not set');
    }

    // Initialize Twitter client with full credentials
    const twitterClient = new TwitterClient({
        apiKey: process.env.TWITTER_API_KEY,
        apiSecretKey: process.env.TWITTER_API_SECRET,
        accessToken: process.env.TWITTER_ACCESS_TOKEN,
        accessTokenSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET
    });

    // Initialize TwitterFunctionManager
    const twitterFunctions = new TwitterFunctionManager(twitterClient);

    // Get the DM manager worker from initializeWorkers
    const workers = initializeWorkers(twitterFunctions);
    const dmWorker = workers.dmManagerWorker;

    if (!dmWorker) {
        throw new Error('Failed to initialize DM manager worker');
    }

    // Create test agent with state management
    const agent = new GameAgent(process.env.GAME_API_KEY, {
        name: "DM Test Bot",
        goal: "Test DM conversation capabilities",
        description: "A bot that manages DM conversations",
        workers: [dmWorker],
        getAgentState: async () => ({
            role: "interviewer",
            currentTopic: "blockchain",
            messageCount: 0,
            lastMessage: "",
            goal: "Extract valuable insights about the user's contributions to blockchain and protocol development",
            templates: {
                initial: "GM! I'd love to learn more about the culture you push in the e/acc or protocol community.",
                error: "hmmm I'm not sure I understand. Let's try this again.",
                closing: "Rad taling! Let's continue this conversation later."
            }
        })
    });

    // Set up logging
    agent.setLogger((agent, message) => {
        console.log(`[${agent.name}] ${message}`);
    });

    // Initialize agent
    console.log('Initializing agent...');
    await agent.init();

    // Run test cycle
    console.log("Starting DM test cycle...");
    try {
        await agent.step({ verbose: true });
        console.log("DM test cycle completed successfully");
    } catch (error) {
        console.error("Error during DM test:", error);
        throw error; // Re-throw to ensure the process exits with an error code
    }
}

describe('DM Manager Tests', () => {
    let twitterClient: TwitterClient;
    let agent: GameAgent;

    beforeAll(() => {
        const envPath = path.resolve('/Users/tripp/WenProd/AiWendy/game-starter/.env');
        dotenv.config({ path: envPath });
    });

    afterAll(async () => {
        // Clean up Twitter client connections
        if (twitterClient?.client) {
            try {
                // Properly cleanup the Twitter client
                const httpAgent = (twitterClient.client as any)._requestMaker?._httpRequestConfig?.httpAgent;
                if (httpAgent?.destroy) {
                    httpAgent.destroy();
                }
            } catch (error) {
                console.warn('Error cleaning up Twitter client:', error);
            }
        }
        
        // Clean up agent if it exists
        if (agent) {
            try {
                // Clear any internal state
                agent.workers = [];
                
                // Clear any internal timers or intervals
                if ((agent as any).clearTimers) {
                    (agent as any).clearTimers();
                }

                // Attempt to clean up any remaining resources
                if ((agent as any).dispose) {
                    await (agent as any).dispose();
                }
            } catch (error) {
                console.warn('Error cleaning up agent:', error);
            }
        }
    });

    test('should initialize Twitter client with valid credentials', async () => {
        twitterClient = new TwitterClient({
            apiKey: process.env.TWITTER_API_KEY!,
            apiSecretKey: process.env.TWITTER_API_SECRET!,
            accessToken: process.env.TWITTER_ACCESS_TOKEN!,
            accessTokenSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET!
        });
        
        expect(twitterClient).toBeDefined();
        const me = await twitterClient.me();
        expect(me.data).toBeDefined();
        expect(me.data.id).toBeDefined();
    });

    test('should initialize DM manager worker', async () => {
        const twitterFunctions = new TwitterFunctionManager(twitterClient);
        const workers = initializeWorkers(twitterFunctions);
        expect(workers.dmManagerWorker).toBeDefined();
    });

    test('should create agent with DM worker', async () => {
        agent = new GameAgent(process.env.GAME_API_KEY!, {
            name: "DM Test Bot",
            goal: "Test DM conversation capabilities",
            description: "A bot that manages DM conversations",
            workers: [initializeWorkers(new TwitterFunctionManager(twitterClient)).dmManagerWorker],
            getAgentState: async () => ({
                role: "interviewer",
                currentTopic: "blockchain",
                messageCount: 0,
                lastMessage: "",
                goal: "Extract valuable insights",
                templates: {
                    initial: "GM!",
                    error: "Error occurred",
                    closing: "Goodbye"
                }
            })
        });

        await agent.init();
        expect(agent).toBeDefined();
        expect(agent.workers.length).toBeGreaterThan(0);
    });
});

// Keep the manual test function but make it conditional
if (process.env.MANUAL_TEST) {
    testDmManager().catch(error => {
        console.error('Manual test failed:', error);
        process.exit(1);
    });
} 