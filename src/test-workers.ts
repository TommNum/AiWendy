import dotenv from 'dotenv';
import { logger } from './utils/logger';
import { twitter_worker } from './workers/twitterWorker';
import { twitter_reply_worker } from './workers/twitterReplyWorker';
import { twitter_search_worker } from './workers/twitterSearchWorker';
import { dao_engagement_worker } from './workers/daoEngagementWorker';

// Load environment variables
dotenv.config();

async function testWorkers() {
  logger.info('Starting worker functionality tests...');
  const results: Record<string, boolean> = {};
  
  // Test Twitter Worker
  try {
    logger.info('Testing Twitter Worker initialization...');
    const twitterWorkerEnv = await twitter_worker.getEnvironment();
    logger.info('Twitter Worker environment loaded successfully');
    logger.info(`Available functions: ${twitter_worker.functions.map(f => f.name).join(', ')}`);
    results['twitter_worker'] = true;
  } catch (error) {
    logger.error(`Twitter Worker test failed: ${error.message}`);
    results['twitter_worker'] = false;
  }
  
  // Test Twitter Reply Worker
  try {
    logger.info('Testing Twitter Reply Worker initialization...');
    const twitterReplyWorkerEnv = await twitter_reply_worker.getEnvironment();
    logger.info('Twitter Reply Worker environment loaded successfully');
    logger.info(`Available functions: ${twitter_reply_worker.functions.map(f => f.name).join(', ')}`);
    results['twitter_reply_worker'] = true;
  } catch (error) {
    logger.error(`Twitter Reply Worker test failed: ${error.message}`);
    results['twitter_reply_worker'] = false;
  }
  
  // Test Twitter Search Worker
  try {
    logger.info('Testing Twitter Search Worker initialization...');
    const twitterSearchWorkerEnv = await twitter_search_worker.getEnvironment();
    logger.info('Twitter Search Worker environment loaded successfully');
    logger.info(`Available functions: ${twitter_search_worker.functions.map(f => f.name).join(', ')}`);
    results['twitter_search_worker'] = true;
  } catch (error) {
    logger.error(`Twitter Search Worker test failed: ${error.message}`);
    results['twitter_search_worker'] = false;
  }
  
  // Test DAO Engagement Worker
  try {
    logger.info('Testing DAO Engagement Worker initialization...');
    const daoEngagementWorkerEnv = await dao_engagement_worker.getEnvironment();
    logger.info('DAO Engagement Worker environment loaded successfully');
    logger.info(`Available functions: ${dao_engagement_worker.functions.map(f => f.name).join(', ')}`);
    results['dao_engagement_worker'] = true;
  } catch (error) {
    logger.error(`DAO Engagement Worker test failed: ${error.message}`);
    results['dao_engagement_worker'] = false;
  }
  
  // Test function execution (optional, only if safe to execute)
  // This section is commented out as it would actually execute functions
  // Uncomment and modify if you want to test actual function execution
  /*
  try {
    logger.info('Testing a safe function execution...');
    // Example: Test a read-only function that doesn't post or modify anything
    const result = await twitter_search_worker.functions
      .find(f => f.name === 'searchTweets')
      ?.executable({ query: 'test', max_results: 5 });
    
    logger.info(`Function execution result: ${JSON.stringify(result)}`);
    results['function_execution'] = true;
  } catch (error) {
    logger.error(`Function execution test failed: ${error.message}`);
    results['function_execution'] = false;
  }
  */
  
  // Log summary of results
  logger.info('Worker tests completed. Summary:');
  let allPassed = true;
  
  for (const [worker, passed] of Object.entries(results)) {
    logger.info(`${worker}: ${passed ? '✅ Passed' : '❌ Failed'}`);
    if (!passed) allPassed = false;
  }
  
  return allPassed;
}

// Run the tests
testWorkers()
  .then(allPassed => {
    if (allPassed) {
      logger.info('✅ All worker tests passed');
      process.exit(0);
    } else {
      logger.error('❌ Some worker tests failed');
      process.exit(1);
    }
  })
  .catch(error => {
    logger.error(`Unexpected error in tests: ${error.message}`);
    process.exit(1);
  }); 