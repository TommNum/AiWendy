import { postToTwitter } from './workers/tweetWorker';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testTweet() {
    try {
        console.log('Testing Twitter API OAuth implementation...');
        
        // Create a unique test tweet
        const timestamp = new Date().toISOString().replace(/[:.]/g, '').substring(0, 15);
        const tweetContent = `Testing OAuth implementation at ${timestamp} #AiWendy`;
        
        console.log(`Posting test tweet: "${tweetContent}"`);
        
        // Post the tweet using our updated function
        const result = await postToTwitter(tweetContent);
        
        // Log the result
        console.log('Tweet result:', JSON.stringify(result, null, 2));
        
        if (result.success) {
            console.log(`✅ Tweet posted successfully with ID: ${result.data?.id || 'unknown'}`);
        } else {
            console.error(`❌ Failed to post tweet: ${result.error}`);
        }
    } catch (error) {
        console.error('Error in test:', error instanceof Error ? error.message : 'Unknown error');
    }
}

// Run the test
testTweet(); 