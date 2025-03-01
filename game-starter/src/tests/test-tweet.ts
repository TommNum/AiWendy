import dotenv from 'dotenv';
import path from 'path';
import { tweetWorker } from '../workers/tweetWorker';
import { logger } from '../utils/logger';

// Load environment variables from the root directory
dotenv.config({ path: path.join(__dirname, '../../.env') });

async function testTweet() {
  try {
    logger.info('Testing Twitter API implementation...');
    
    // Create a unique test tweet with timestamp
    const timestamp = new Date().toISOString()
      .replace(/[-:]/g, '')
      .replace(/\.\d+Z$/, '')
      .replace(/T/, '');
    
    const tweetContent = `Testing Twitter implementation at ${timestamp} #AiWendy`;
    logger.info(`Posting test tweet: "${tweetContent}"`);
    
    // Post the tweet using the tweetWorker
    const result = await tweetWorker.functions.find(f => f.name === "post_tweet")?.executable(
      { content: tweetContent },
      (message) => logger.info(`Worker log: ${message}`)
    );
    
    if (result?.status === 'done') {
      const output = JSON.parse(result.output);
      logger.info(`✅ Successfully posted tweet with ID: ${output.tweet_id}`);
      return true;
    } else {
      logger.error(`❌ Failed to post tweet: ${result?.output || 'unknown error'}`);
      return false;
    }
  } catch (error) {
    logger.error(`❌ Error testing tweet: ${error}`);
    return false;
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  testTweet()
    .then(success => {
      if (success) {
        logger.info('✅ Twitter API test completed successfully');
        process.exit(0);
      } else {
        logger.error('❌ Twitter API test failed');
        process.exit(1);
      }
    })
    .catch(error => {
      logger.error(`❌ Unhandled error in Twitter API test: ${error}`);
      process.exit(1);
    });
}

export { testTweet }; 