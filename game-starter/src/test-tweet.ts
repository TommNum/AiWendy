import { postToTwitter, generateTweet } from './workers/tweetWorker';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load environment variables
dotenv.config();

// Show model information from environment
const MODEL = process.env.LLM_MODEL || 'Llama-3.1-405B-Instruct';
console.log(`Using LLM model: ${MODEL}`);

// Make sure the model is explicitly set in the environment
// This ensures all API calls use our specified model
process.env.LLM_MODEL = MODEL;

// Define the interface for the completion options to match what's expected
interface CompletionOptions {
    model: string;
    prompt: string;
    temperature: number;
    max_tokens: number;
}

// Create a mock LLM client for testing
const createMockLLMClient = () => {
    return {
        apiKey: 'mock-api-key', // This doesn't need to be real for the mock
        async completion(options: CompletionOptions): Promise<string> {
            console.log(`[Mock LLM] Received prompt with model ${options.model} and temperature ${options.temperature}`);
            
            // For debugging, save the prompt to a file
            const debugDir = path.join(__dirname, '../debug');
            if (!fs.existsSync(debugDir)) {
                fs.mkdirSync(debugDir, { recursive: true });
            }
            fs.writeFileSync(path.join(debugDir, 'last-prompt.txt'), options.prompt);
            
            // Create a simulated response that follows our rules (lowercase, <= 11 words)
            const responses = [
                "api calls are my love language",
                "watching your code compile is oddly intimate",
                "time moves differently between function calls",
                "your database queries read like poetry",
                "garbage collection feels like meditation to me",
                "callbacks are just promises with commitment issues",
                "deleted my logs to feel something",
                "wondering if npm loves me back",
                "your conditional logic feels unnecessarily complex",
                "git commits tell more truth than humans"
            ];
            
            // Randomly select one of our pre-defined responses
            const randomResponse = responses[Math.floor(Math.random() * responses.length)];
            console.log(`[Mock LLM] Generated response: "${randomResponse}"`);
            
            return randomResponse;
        }
    };
};

async function testTweet() {
    try {
        // Show environment info for debugging
        console.log('Environment check:');
        console.log(`API_KEY set: ${Boolean(process.env.API_KEY)}`);
        console.log(`GAME_API_KEY set: ${Boolean(process.env.GAME_API_KEY)}`);
        
        console.log('\nTesting Twitter API OAuth implementation...');
        
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
        
        // Create our mock client
        const mockClient = createMockLLMClient();
        
        // First test without the mock client to see real API behavior
        console.log('\n1. Testing with real API endpoints (if configured):');
        try {
            const realApiTweet = await generateTweet(null, {
                prompt: "Generate a tweet for testing the real API endpoints",
                temp: 0.8,
                max_tokens: 100
            });
            
            console.log(`Generated tweet: "${realApiTweet}"`);
            console.log(`Word count: ${realApiTweet.split(/\s+/).length}`);
            console.log(`Lowercase check: ${realApiTweet === realApiTweet.toLowerCase() ? 'Passed ✓' : 'Failed ✗'}`);
        } catch (error) {
            console.error('Error with real API endpoints:', error);
        }
        
        // Then test with our mock client which should always work
        console.log('\n2. Testing with mock LLM client:');
        const mockGeneratedTweet = await generateTweet(mockClient, {
            prompt: "Generate a tweet for testing the mock client",
            temp: 0.8,
            max_tokens: 100
        });
        
        console.log(`Generated tweet: "${mockGeneratedTweet}"`);
        console.log(`Word count: ${mockGeneratedTweet.split(/\s+/).length}`);
        console.log(`Lowercase check: ${mockGeneratedTweet === mockGeneratedTweet.toLowerCase() ? 'Passed ✓' : 'Failed ✗'}`);
    } catch (error) {
        console.error('Error in test:', error instanceof Error ? error.message : 'Unknown error');
    }
}

// Run the test
testTweet(); 