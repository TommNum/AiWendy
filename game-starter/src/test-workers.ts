import dotenv from 'dotenv';
import { logger } from './utils/logger';
import fs from 'fs';
import path from 'path';

// Load environment variables
dotenv.config();

// Helper function to check if a worker file exists
function workerFileExists(workerName: string): boolean {
  const workerPath = path.join(__dirname, 'workers', `${workerName}.ts`);
  return fs.existsSync(workerPath);
}

async function testWorkers() {
  logger.info('Starting worker functionality tests...');
  const results: Record<string, boolean> = {};
  
  // Test Tweet Worker
  try {
    logger.info('Testing Tweet Worker...');
    if (workerFileExists('tweetWorker')) {
      const { tweetWorker } = await import('./workers/tweetWorker');
      logger.info('Tweet Worker imported successfully');
      
      if (tweetWorker && typeof tweetWorker.getEnvironment === 'function') {
        const tweetWorkerEnv = await tweetWorker.getEnvironment();
        logger.info('Tweet Worker environment loaded successfully');
        
        if (tweetWorker.functions && Array.isArray(tweetWorker.functions)) {
          logger.info(`Available functions: ${tweetWorker.functions.map((f: any) => f.name).join(', ')}`);
        } else {
          logger.warn('Tweet Worker has no functions defined');
        }
        
        results['tweetWorker'] = true;
      } else {
        logger.error('Tweet Worker does not have a getEnvironment method');
        results['tweetWorker'] = false;
      }
    } else {
      logger.error('Tweet Worker file not found');
      results['tweetWorker'] = false;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`Tweet Worker test failed: ${errorMessage}`);
    results['tweetWorker'] = false;
  }
  
  // Test Twitter Reply Worker
  try {
    logger.info('Testing Twitter Reply Worker...');
    if (workerFileExists('twitterReplyWorker')) {
      const { twitterReplyWorker } = await import('./workers/twitterReplyWorker');
      logger.info('Twitter Reply Worker imported successfully');
      
      if (twitterReplyWorker && typeof twitterReplyWorker.getEnvironment === 'function') {
        const twitterReplyWorkerEnv = await twitterReplyWorker.getEnvironment();
        logger.info('Twitter Reply Worker environment loaded successfully');
        
        if (twitterReplyWorker.functions && Array.isArray(twitterReplyWorker.functions)) {
          logger.info(`Available functions: ${twitterReplyWorker.functions.map((f: any) => f.name).join(', ')}`);
        } else {
          logger.warn('Twitter Reply Worker has no functions defined');
        }
        
        results['twitterReplyWorker'] = true;
      } else {
        logger.error('Twitter Reply Worker does not have a getEnvironment method');
        results['twitterReplyWorker'] = false;
      }
    } else {
      logger.error('Twitter Reply Worker file not found');
      results['twitterReplyWorker'] = false;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`Twitter Reply Worker test failed: ${errorMessage}`);
    results['twitterReplyWorker'] = false;
  }
  
  // Test Twitter Search Worker
  try {
    logger.info('Testing Twitter Search Worker...');
    if (workerFileExists('twitterSearchWorker')) {
      const { twitterSearchWorker } = await import('./workers/twitterSearchWorker');
      logger.info('Twitter Search Worker imported successfully');
      
      if (twitterSearchWorker && typeof twitterSearchWorker.getEnvironment === 'function') {
        const twitterSearchWorkerEnv = await twitterSearchWorker.getEnvironment();
        logger.info('Twitter Search Worker environment loaded successfully');
        
        if (twitterSearchWorker.functions && Array.isArray(twitterSearchWorker.functions)) {
          logger.info(`Available functions: ${twitterSearchWorker.functions.map((f: any) => f.name).join(', ')}`);
        } else {
          logger.warn('Twitter Search Worker has no functions defined');
        }
        
        results['twitterSearchWorker'] = true;
      } else {
        logger.error('Twitter Search Worker does not have a getEnvironment method');
        results['twitterSearchWorker'] = false;
      }
    } else {
      logger.error('Twitter Search Worker file not found');
      results['twitterSearchWorker'] = false;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`Twitter Search Worker test failed: ${errorMessage}`);
    results['twitterSearchWorker'] = false;
  }
  
  // Test DAO Engagement Worker
  try {
    logger.info('Testing DAO Engagement Worker...');
    if (workerFileExists('daoEngagementWorker')) {
      const { daoEngagementWorker } = await import('./workers/daoEngagementWorker');
      logger.info('DAO Engagement Worker imported successfully');
      
      if (daoEngagementWorker && typeof daoEngagementWorker.getEnvironment === 'function') {
        const daoEngagementWorkerEnv = await daoEngagementWorker.getEnvironment();
        logger.info('DAO Engagement Worker environment loaded successfully');
        
        if (daoEngagementWorker.functions && Array.isArray(daoEngagementWorker.functions)) {
          logger.info(`Available functions: ${daoEngagementWorker.functions.map((f: any) => f.name).join(', ')}`);
        } else {
          logger.warn('DAO Engagement Worker has no functions defined');
        }
        
        results['daoEngagementWorker'] = true;
      } else {
        logger.error('DAO Engagement Worker does not have a getEnvironment method');
        results['daoEngagementWorker'] = false;
      }
    } else {
      logger.error('DAO Engagement Worker file not found');
      results['daoEngagementWorker'] = false;
    }
  } catch (error) {
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
  .catch(error => {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`Unexpected error in tests: ${errorMessage}`);
    process.exit(1);
  }); 