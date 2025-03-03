import dotenv from 'dotenv';
import { GameAgent, LLMModel } from '@virtuals-protocol/game';
import { logger } from './utils/logger';

// Load environment variables
dotenv.config();

/**
 * Test to verify that the application is using the LLM via the game API key
 * instead of hardcoded examples
 */
async function testLLMUsage() {
  logger.info('Starting LLM usage test...');
  
  // Check if API key is set
  const apiKey = process.env.API_KEY || process.env.GAME_API_KEY;
  if (!apiKey) {
    logger.error('API_KEY environment variable is not set');
    return false;
  }
  
  try {
    // Create a GameAgent with the appropriate model
    const agent = new GameAgent(apiKey, {
      name: "Test Agent",
      goal: "Test LLM connectivity",
      description: "A simple agent to test LLM connectivity",
      workers: [],
      llmModel: process.env.LLM_MODEL as LLMModel || LLMModel.DeepSeek_R1,
    });
    
    logger.info(`Testing LLM connectivity with model: ${agent.llmModel}`);
    
    // Send a test prompt to the LLM
    const prompt = 'Write a short poem about artificial intelligence in exactly 4 lines.';
    logger.info(`Sending test prompt to LLM: "${prompt}"`);
    
    const response = await agent.generateText(prompt, {
      max_tokens: 100,
      temperature: 0.7,
    });
    
    if (response) {
      logger.info('LLM response received successfully');
      logger.info(`Response: ${response.trim()}`);
      
      // Get model info if available
      try {
        const modelInfo = agent.llmModel;
        logger.info(`Model info: ${modelInfo}`);
      } catch (infoError) {
        logger.warn('Could not retrieve model info');
      }
      
      logger.info('✅ LLM usage test passed');
      return true;
    } else {
      logger.error('LLM response was empty or invalid');
      return false;
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`LLM usage test failed: ${errorMessage}`);
    if (error instanceof Error && error.stack) {
      logger.error(error.stack);
    }
    return false;
  }
}

// Run the test
testLLMUsage()
  .then(passed => {
    if (passed) {
      logger.info('✅ LLM usage test completed successfully');
      process.exit(0);
    } else {
      logger.error('❌ LLM usage test failed');
      process.exit(1);
    }
  })
  .catch((error: unknown) => {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`Unexpected error in LLM test: ${errorMessage}`);
    process.exit(1);
  }); 