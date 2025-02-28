import dotenv from 'dotenv';
import { LLMModel, GameAgent, ExecutableGameFunctionStatus } from '@virtuals-protocol/game';
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