import dotenv from 'dotenv';
import { postToTwitter } from './workers/tweetWorker';
import { logger } from './utils/logger';

// Load environment variables
dotenv.config();

async function testTweet() {
  try {
    logger.info('Testing Twitter API OAuth implementation...');
    
    // Create a unique test tweet with timestamp
    const timestamp = new Date().toISOString()
      .replace(/[-:]/g, '')
      .replace(/\.\d+Z$/, '')
      .replace(/T/, '');
    
    const tweetContent = `Testing OAuth implementation at ${timestamp} #AiWendy`;
    logger.info(`Posting test tweet: "${tweetContent}"`);
    
    // Post the tweet
    const result = await postToTwitter(tweetContent);
    logger.info(`Tweet result: ${JSON.stringify(result, null, 2)}`);
    
    if (result.success) {
      logger.info(`✅ Successfully posted tweet with ID: ${result.data.id}`);
      return true;
    } else {
      logger.error(`❌ Failed to post tweet: ${result.error}`);
      return false;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`Error during Twitter API test: ${errorMessage}`);
    return false;
  }
}

// Run the test
testTweet()
  .then(success => {
    if (success) {
      logger.info('✅ Twitter API test passed');
      process.exit(0);
    } else {
      logger.error('❌ Twitter API test failed');
      process.exit(1);
    }
  })
  .catch(error => {
    logger.error(`Unexpected error in test: ${error}`);
    process.exit(1);
  }); 