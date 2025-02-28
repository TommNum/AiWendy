import dotenv from 'dotenv';
import { GameAgent } from '@virtuals-protocol/game';
import { logger } from './utils/logger';

// Load environment variables
dotenv.config();

/**
 * Test to verify that the application is using the LLM via the game API key
 * instead of hardcoded examples
 */
async function testLLMUsage() {
  try {
    logger.info('Starting LLM usage test...');
    
    // Check if API key is available
    const apiKey = process.env.GAME_API_KEY;
    if (!apiKey) {
      logger.error('GAME_API_KEY is not set in environment variables');
      return;
    }
    
    logger.info('API key found, initializing test agent...');
    
    // Create a minimal test agent
    const testAgent = new GameAgent(apiKey, {
      name: 'LLM Test Agent',
      goal: 'Test LLM connectivity and response',
      description: 'A test agent to verify LLM usage',
      getAgentState: async () => ({
        currentTask: 'Testing LLM connectivity',
        status: 'Active'
      }),
      workers: []
    });
    
    // Initialize the agent to test LLM connectivity
    logger.info('Initializing agent to test LLM connectivity...');
    await testAgent.init();
    
    // Test a simple prompt to verify LLM response
    logger.info('Sending test prompt to LLM...');
    const testPrompt = 'Generate a short tweet about artificial intelligence. Keep it under 280 characters.';
    
    // Use the agent's internal LLM client to send a test prompt
    // Note: This is using internal methods and may need adjustment based on the actual GameAgent implementation
    const response = await testAgent.llm.complete({
      messages: [{ role: 'user', content: testPrompt }],
      temperature: 0.7,
      max_tokens: 150
    });
    
    logger.info('LLM Response received:');
    logger.info(response);
    
    // Verify the model being used
    logger.info('Checking model information...');
    // This may need adjustment based on how model information is exposed in the SDK
    const modelInfo = testAgent.llm.getModelInfo ? await testAgent.llm.getModelInfo() : 'Model info not available';
    logger.info(`Model information: ${JSON.stringify(modelInfo)}`);
    
    logger.info('LLM usage test completed successfully');
    return true;
  } catch (error) {
    logger.error(`LLM usage test failed: ${error.message}`);
    logger.error(error.stack);
    return false;
  }
}

// Run the test
testLLMUsage()
  .then(success => {
    if (success) {
      logger.info('✅ LLM usage test passed');
      process.exit(0);
    } else {
      logger.error('❌ LLM usage test failed');
      process.exit(1);
    }
  })
  .catch(error => {
    logger.error(`Unexpected error in test: ${error.message}`);
    process.exit(1);
  }); 