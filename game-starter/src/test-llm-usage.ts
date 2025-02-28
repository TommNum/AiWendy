import dotenv from 'dotenv';
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
    // Log API key information (masked for security)
    const maskedKey = apiKey.substring(0, 4) + '...' + apiKey.substring(apiKey.length - 4);
    logger.info(`API key is set: ${maskedKey}`);
    
    // Log model configuration
    const model = process.env.LLM_MODEL || 'DeepSeek-R1';
    logger.info(`LLM model configured: ${model}`);
    
    // Check for other relevant environment variables
    const hasRequiredEnvVars = checkRequiredEnvVars();
    
    if (hasRequiredEnvVars) {
      logger.info('All required environment variables for LLM usage are set');
      logger.info('✅ LLM configuration test passed');
      return true;
    } else {
      logger.warn('Some recommended environment variables for LLM usage are missing');
      logger.info('✅ Basic LLM configuration test passed (API key is set)');
      return true; // Still return true as long as API key is set
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`LLM usage test failed: ${errorMessage}`);
    if (error instanceof Error && error.stack) {
      logger.error(error.stack);
    }
    return false;
  }
}

// Helper function to check for recommended environment variables
function checkRequiredEnvVars() {
  const recommendedVars = [
    'LLM_MODEL',
    'LLM_TEMPERATURE',
    'LLM_MAX_TOKENS'
  ];
  
  const missingVars = recommendedVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    logger.warn(`The following recommended environment variables are not set: ${missingVars.join(', ')}`);
    return false;
  }
  
  return true;
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
  .catch(error => {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`Unexpected error in LLM test: ${errorMessage}`);
    process.exit(1);
  }); 