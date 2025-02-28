import dotenv from 'dotenv';
import { tweetWorker } from './workers/tweetWorker';
import fs from 'fs';
import path from 'path';
import { ExecutableGameFunctionStatus } from '@virtuals-protocol/game';

// Load environment variables
dotenv.config();

// Simple logger function
function log(message: string) {
    console.log(`[${new Date().toISOString()}] ${message}`);
    
    // Also append to log file
    const logDir = path.join(__dirname, '../logs');
    if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
    }
    
    fs.appendFileSync(
        path.join(logDir, 'app.log'),
        `[INFO] ${new Date().toISOString()} - ${message}\n`
    );
}

async function testTweetGeneration() {
    log('Starting tweet generation test...');
    
    try {
        // Get the environment for the tweet worker
        if (typeof tweetWorker.getEnvironment === 'function') {
            const env = await tweetWorker.getEnvironment();
            log(`Tweet worker environment loaded: ${JSON.stringify(env)}`);
        } else {
            log('Tweet worker getEnvironment is not a function');
        }
        
        // Generate a tweet
        log('Generating tweet using LLM...');
        const generateFunction = tweetWorker.functions[0];
        if (!generateFunction) {
            log('Generate tweet function not found');
            return false;
        }
        
        const generateResult = await generateFunction.executable({}, log);
        
        if (generateResult.status === ExecutableGameFunctionStatus.Done) {
            const tweetContent = generateResult.feedback;
            log(`Successfully generated tweet: ${tweetContent}`);
            
            // Post the tweet (optional - uncomment if you want to actually post)
            // log('Posting tweet...');
            // const postFunction = tweetWorker.functions[1];
            // if (postFunction) {
            //     const postResult = await postFunction.executable({ tweet_content: tweetContent }, log);
            //     log(`Tweet posting result: ${JSON.stringify(postResult)}`);
            // }
            
            return true;
        } else {
            const errorMessage = generateResult.feedback;
            log(`Failed to generate tweet: ${errorMessage}`);
            return false;
        }
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        log(`Error in tweet generation test: ${errorMessage}`);
        return false;
    }
}

// Run the test
testTweetGeneration()
    .then(success => {
        if (success) {
            log('✅ Tweet generation test passed');
            process.exit(0);
        } else {
            log('❌ Tweet generation test failed');
            process.exit(1);
        }
    })
    .catch(error => {
        log(`Unhandled error in test: ${error}`);
        process.exit(1);
    }); 