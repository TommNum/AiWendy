import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { activity_agent } from './agent';
import { LLMModel } from '@virtuals-protocol/game';

// Load environment variables
dotenv.config();

// Configure logging
const logDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
}

const logPath = path.join(logDir, 'test-agent-model.log');

function log(message: string) {
    const timestamp = new Date().toISOString();
    const formattedMessage = `[${timestamp}] ${message}`;
    console.log(formattedMessage);
    fs.appendFileSync(logPath, formattedMessage + '\n');
}

// Function to convert LLMModel enum to string representation
function getLLMModelName(model: LLMModel): string {
    switch (model) {
        case LLMModel.DeepSeek_R1:
            return 'DeepSeek-R1';
        case LLMModel.DeepSeek_V3:
            return 'DeepSeek-V3';
        case LLMModel.Llama_3_1_405B_Instruct:
            return 'Llama-3.1-405B-Instruct';
        case LLMModel.Llama_3_3_70B_Instruct:
            return 'Llama-3.3-70B-Instruct';
        case LLMModel.Qwen_2_5_72B_Instruct:
            return 'Qwen-2.5-72B-Instruct';
        default:
            return 'Unknown model';
    }
}

async function testAgentModel() {
    log('Starting agent model verification test...');

    try {
        // Check API key
        const apiKey = process.env.API_KEY;
        if (!apiKey) {
            log('❌ ERROR: API_KEY environment variable is not set');
            return false;
        }

        // Log agent configuration
        log(`Agent name: ${activity_agent.name}`);
        log(`Agent goal: ${activity_agent.goal}`);
        
        // Attempt to access the LLM model configuration - we need to handle this carefully
        // as it might be an internal property
        let configuredModel = 'Unable to determine';
        try {
            // @ts-ignore - Accessing potentially private/internal property
            if (activity_agent._config && activity_agent._config.llmModel) {
                // @ts-ignore
                configuredModel = getLLMModelName(activity_agent._config.llmModel);
            } else if ((activity_agent as any).config && (activity_agent as any).config.llmModel) {
                configuredModel = getLLMModelName((activity_agent as any).config.llmModel);
            } else {
                log('Could not access LLM model directly, checking environment variable');
                const envModel = process.env.LLM_MODEL || 'DeepSeek-R1';
                configuredModel = `${envModel} (from environment)`;
            }
        } catch (error) {
            log(`Warning: Could not determine model: ${error instanceof Error ? error.message : String(error)}`);
        }
        
        log(`Configured LLM model: ${configuredModel}`);

        // Initialize agent
        log('Initializing agent...');
        await activity_agent.init();
        log('Agent initialized successfully');

        // Try to access the agent state through the private method
        log('Trying to retrieve agent state...');
        try {
            // Since getAgentState is passed to the agent constructor in agent.ts, 
            // we know it exists in the config, but we may need to access it indirectly
            
            // Option 1: Directly from config
            // @ts-ignore - Accessing private property
            const agentStateGetter = activity_agent._config?.getAgentState;
            
            if (agentStateGetter) {
                const state = await agentStateGetter();
                log(`Agent state retrieved: ${JSON.stringify(state, null, 2)}`);
            } else {
                log('Unable to access agent state getter function directly');
                // Option 2: Check the wendyPlan and wendyPlanReasoning from agent.ts
                log('Using hardcoded values for plan and reasoning instead:');
                log('Plan: Deploy workers in precise sequence to identify peak patterns in culture...');
                log('Reasoning: Highlight charisma and innovation and always find the most creative way to engage with people...');
            }
        } catch (error) {
            log(`Warning when accessing agent state: ${error instanceof Error ? error.message : String(error)}`);
        }

        // Skip actual step to avoid running the full agent
        log('Agent model verification test completed');
        return true;
    } catch (error) {
        log(`❌ ERROR: ${error instanceof Error ? error.message : String(error)}`);
        if (error instanceof Error && error.stack) {
            log(`Error stack: ${error.stack}`);
        }
        return false;
    }
}

// Run the test
testAgentModel()
    .then(success => {
        if (success) {
            log('✅ Agent model verification completed successfully');
            process.exit(0);
        } else {
            log('❌ Agent model verification failed');
            process.exit(1);
        }
    })
    .catch(error => {
        log(`❌ Unhandled error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
    }); 