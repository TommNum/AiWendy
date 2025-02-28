import { postToTwitter, generateTweet } from './workers/tweetWorker';
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
        
        // Now test our generateTweet function with the new styling rules
        console.log('\nTesting tweet generation with new styling rules...');
        const generatedTweet = await generateTweet(null, {
            prompt: "Generate a tweet for testing the new styling rules",
            temp: 0.8,
            max_tokens: 100
        });
        
        console.log(`\nGenerated tweet: "${generatedTweet}"`);
        console.log(`Word count: ${generatedTweet.split(/\s+/).length}`);
        console.log(`Lowercase check: ${generatedTweet === generatedTweet.toLowerCase() ? 'Passed ✓' : 'Failed ✗'}`);
    } catch (error) {
        console.error('Error in test:', error instanceof Error ? error.message : 'Unknown error');
    }
}

// Run the test
testTweet(); 