import dotenv from 'dotenv';
import { logger } from './utils/logger';
import { tweetWorker } from './workers/tweetWorker';
import { twitterReplyWorker } from './workers/twitterReplyWorker';
import { twitterSearchWorker } from './workers/twitterSearchWorker';
import { daoEngagementWorker } from './workers/daoEngagementWorker';
import { GameFunction } from '@virtuals-protocol/game';

// Load environment variables
dotenv.config();

async function testWorkers() {
  logger.info('Starting worker functionality tests...');
  const results: Record<string, boolean> = {};
  
  // Test Tweet Worker
  try {
    logger.info('Testing Tweet Worker initialization...');
    const tweetWorkerEnv = await tweetWorker.getEnvironment();
    logger.info('Tweet Worker environment loaded successfully');
    logger.info(`Available functions: ${tweetWorker.functions.map((f: GameFunction<any>) => f.name).join(', ')}`);
    results['tweetWorker'] = true;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`Tweet Worker test failed: ${errorMessage}`);
    results['tweetWorker'] = false;
  }
  
  // Test Twitter Reply Worker
  try {
    logger.info('Testing Twitter Reply Worker initialization...');
    const twitterReplyWorkerEnv = await twitterReplyWorker.getEnvironment();
    logger.info('Twitter Reply Worker environment loaded successfully');
    logger.info(`Available functions: ${twitterReplyWorker.functions.map((f: GameFunction<any>) => f.name).join(', ')}`);
    results['twitterReplyWorker'] = true;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`Twitter Reply Worker test failed: ${errorMessage}`);
    results['twitterReplyWorker'] = false;
  }
  
  // Test Twitter Search Worker
  try {
    logger.info('Testing Twitter Search Worker initialization...');
    const twitterSearchWorkerEnv = await twitterSearchWorker.getEnvironment();
    logger.info('Twitter Search Worker environment loaded successfully');
    logger.info(`Available functions: ${twitterSearchWorker.functions.map((f: GameFunction<any>) => f.name).join(', ')}`);
    results['twitterSearchWorker'] = true;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`Twitter Search Worker test failed: ${errorMessage}`);
    results['twitterSearchWorker'] = false;
  }
  
  // Test DAO Engagement Worker
  try {
    logger.info('Testing DAO Engagement Worker initialization...');
    const daoEngagementWorkerEnv = await daoEngagementWorker.getEnvironment();
    logger.info('DAO Engagement Worker environment loaded successfully');
    logger.info(`Available functions: ${daoEngagementWorker.functions.map((f: GameFunction<any>) => f.name).join(', ')}`);
    results['daoEngagementWorker'] = true;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`DAO Engagement Worker test failed: ${errorMessage}`);
    results['daoEngagementWorker'] = false;
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
  .catch((error: unknown) => {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`Unexpected error in tests: ${errorMessage}`);
    process.exit(1);
  }); 