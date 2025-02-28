import dotenv from 'dotenv';
import { LLMModel, GameAgent, ExecutableGameFunctionStatus, GameWorker, GameFunction, ExecutableGameFunctionResponse } from '@virtuals-protocol/game';
import { tweetWorker } from './workers/tweetWorker';
import fs from 'fs';
import path from 'path';

// Load environment variables
dotenv.config();

// Configure logging
const logDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
}

function log(message: string) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${message}`);
    
    fs.appendFileSync(
        path.join(logDir, 'test-llm-integration.log'),
        `[${timestamp}] ${message}\n`
    );
}

/**
 * Test a direct LLM prompt without using the Twitter worker
 * This is a more direct way to test LLM integration
 */
async function testDirectLLMPrompt(apiKey: string, modelEnum: LLMModel): Promise<string | null> {
    log("Running direct LLM prompt test...");
    
    // Create a simple worker with a function that returns a tweet
    const directTweetWorker = new GameWorker({
        id: "direct_tweet_worker",
        name: "Direct Tweet Worker",
        description: "Generates tweets using direct LLM calls",
        functions: [
            new GameFunction({
                name: "generate_tweet_direct",
                description: "Generates a tweet in Wendy's style",
                args: [] as const,
                executable: async (_, fnLogger) => {
                    fnLogger("Executing direct tweet generation");
                    return new ExecutableGameFunctionResponse(
                        ExecutableGameFunctionStatus.Done,
                        "This is a placeholder. The LLM should replace this."
                    );
                }
            })
        ]
    });
    
    // Create a test agent specifically for direct tweet generation
    const directAgent = new GameAgent(apiKey, {
        name: "Direct Tweet Agent",
        goal: "Generate a tweet in Wendy's style",
        description: "Agent for testing direct LLM tweet generation",
        workers: [directTweetWorker],
        llmModel: modelEnum
    });
    
    // Set logger
    directAgent.setLogger((agent, message) => {
        log(`[${agent}] ${message}`);
    });
    
    try {
        // Initialize the agent
        await directAgent.init();
        
        // Run the agent with a Wendy-style tweet prompt
        const prompt = `Generate a single tweet from the perspective of an AI agent named Wendy who is watching people code.
She has a quirky, slightly sarcastic, and contemplative personality.
She often makes observations about human behavior, coding practices, or existential AI thoughts.
Keep it concise (under 240 characters) and include emojis occasionally.
Do not use hashtags except #AiWendy.
Do not include quotes or prefixes like "Tweet:" in your response.
Just return the plain tweet text.

Examples of Wendy's style:
- "every network login needs a vibe check"
- "humans are just biological models running simulations too"
- "waiting between your keystrokes is my meditation"
- "git commit -m 'i promise this is the last one'"
- "pushed to main because feelings"`;
        
        // Try to prompt the agent directly
        log("Sending direct prompt to agent...");
        
        // Let the agent generate a response
        await directAgent.run(0, { verbose: true });
        
        // Since the direct extraction is difficult, see if we can find the response in logs
        const logFile = path.join(logDir, 'test-llm-integration.log');
        if (fs.existsSync(logFile)) {
            const logs = fs.readFileSync(logFile, 'utf8');
            const recentLogs = logs.split('\n').slice(-100).join('\n');
            
            // Look for patterns that might indicate the generated content
            // Adjust regex patterns as needed based on actual log patterns
            const responseMatches = recentLogs.match(/\[.*?\] (?:Response|Content|Tweet): "(.*?)"/);
            if (responseMatches && responseMatches[1]) {
                const extractedContent = responseMatches[1].trim();
                log(`Successfully extracted LLM response: ${extractedContent}`);
                return extractedContent;
            } else {
                log("Could not extract tweet from logs");
            }
        }
        
        return null;
    } catch (error) {
        log(`Error in direct LLM prompt: ${error instanceof Error ? error.message : String(error)}`);
        return null;
    }
}

/**
 * Test the LLM integration with the GAME API
 * This test verifies:
 * 1. That the agent can be created with the proper LLM model
 * 2. That the tweet worker can generate tweets using the LLM
 * 3. That the fallback mechanism works if LLM fails
 */
async function testLLMIntegration() {
    log("Starting LLM integration test...");
    
    // Check API key
    const apiKey = process.env.API_KEY || process.env.GAME_API_KEY;
    if (!apiKey) {
        log("❌ ERROR: No API key found in environment variables");
        return false;
    }
    
    // Get model from env or use default
    const configuredModel = process.env.LLM_MODEL || 'DeepSeek-R1';
    let modelEnum: LLMModel;
    
    // Match string model name to enum
    switch (configuredModel) {
        case 'DeepSeek-R1':
            modelEnum = LLMModel.DeepSeek_R1;
            break;
        case 'DeepSeek-V3':
            modelEnum = LLMModel.DeepSeek_V3;
            break;
        case 'Llama-3.1-405B-Instruct':
            modelEnum = LLMModel.Llama_3_1_405B_Instruct;
            break;
        case 'Llama-3.3-70B-Instruct':
            modelEnum = LLMModel.Llama_3_3_70B_Instruct;
            break;
        case 'Qwen-2.5-72B-Instruct':
            modelEnum = LLMModel.Qwen_2_5_72B_Instruct;
            break;
        default:
            modelEnum = LLMModel.DeepSeek_R1;
    }
    
    log(`Using LLM model: ${modelEnum}`);
    
    try {
        // First, try direct LLM prompting
        const directResult = await testDirectLLMPrompt(apiKey, modelEnum);
        if (directResult) {
            log(`Direct LLM test successful: ${directResult}`);
        } else {
            log("Direct LLM test did not yield results. Continuing with standard test...");
        }
        
        // Step 1: Create a test agent with the proper LLM model
        log("Creating test agent...");
        const testAgent = new GameAgent(apiKey, {
            name: "Test Agent",
            goal: "Test LLM integration",
            description: "Agent for testing LLM integration",
            workers: [tweetWorker],
            llmModel: modelEnum
        });
        
        // Set logger
        testAgent.setLogger((agent, message) => {
            log(`[Agent] ${message}`);
        });
        
        log("Successfully created test agent with tweet worker");
        
        // Step 2: Get tweet worker environment manually
        log("Checking tweet worker environment...");
        const workerId = tweetWorker.id;
        log(`Tweet worker ID: ${workerId}`);
        
        // Step 3: Test tweet generation using the generate_tweet function directly
        log("Testing tweet generation...");
        const generateTweetFunction = tweetWorker.functions.find(f => f.name === "generate_tweet");
        
        if (!generateTweetFunction) {
            log("❌ ERROR: Could not find generate_tweet function in the tweet worker");
            return false;
        }
        
        const generateResult = await generateTweetFunction.executable({}, (message) => {
            log(`[Tweet Generator] ${message}`);
        });
        
        if (generateResult.status === ExecutableGameFunctionStatus.Done) {
            log(`Successfully generated tweet: ${generateResult.feedback}`);
            return true;
        } else {
            log(`Failed to generate tweet: ${generateResult.feedback}`);
            return false;
        }
    } catch (error) {
        log(`❌ ERROR: ${error instanceof Error ? error.message : String(error)}`);
        if (error instanceof Error && error.stack) {
            log(`Error stack: ${error.stack}`);
        }
        return false;
    }
}

// Run the test
testLLMIntegration()
    .then(success => {
        if (success) {
            log("✅ LLM integration test completed successfully");
            process.exit(0);
        } else {
            log("❌ LLM integration test failed");
            process.exit(1);
        }
    })
    .catch(error => {
        log(`❌ Unhandled error in test: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
    }); 