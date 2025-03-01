import dotenv from 'dotenv';
import { generateReply, generateShortReply } from './src/functions';
import { LLMModel } from "@virtuals-protocol/game";

// Mock fetch to prevent actual API calls to Twitter
const originalFetch = global.fetch;

// Load environment variables
dotenv.config();

// Function to mock API calls
function mockFetch(url: string, options: any) {
  // Allow API calls to other services but block Twitter posting
  if (url.includes('/tweets') && options?.method === 'POST') {
    console.log('🚫 BLOCKED ACTUAL TWITTER POST:');
    console.log('URL:', url);
    console.log('Request body:', options.body);
    
    // Return a mock successful response
    return Promise.resolve({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: () => Promise.resolve({
        data: {
          id: 'mock-tweet-id-' + Date.now(),
          text: JSON.parse(options.body).text
        }
      })
    });
  }
  
  // For all other requests, use the original fetch
  return originalFetch(url, options);
}

// Replace global fetch with our mock version
(global as any).fetch = mockFetch;

async function testFullTwitterReplyProcess() {
  console.log("Testing Full Twitter Reply Process");
  console.log("=================================");
  
  try {
    // 1. Test generating reply with LLM
    const testTweet = "Hey @AiWendy, what do you think about quantum computing?";
    console.log(`\nTest Tweet: "${testTweet}"`);
    
    console.log("\n1. Testing generateReply function:");
    console.log("--------------------------------");
    const longReply = await generateReply(testTweet, LLMModel.Llama_3_1_405B_Instruct);
    console.log(`Generated Reply: "${longReply}"`);
    
    console.log("\n2. Testing generateShortReply function:");
    console.log("-------------------------------------");
    const shortReply = await generateShortReply(testTweet, LLMModel.Llama_3_1_405B_Instruct);
    console.log(`Generated Short Reply: "${shortReply}"`);
    
    // 3. Test Twitter API post endpoint (will be mocked)
    console.log("\n3. Testing Twitter API Post (mocked):");
    console.log("-----------------------------------");
    
    const twitterApiBaseUrl = process.env.TWITTER_API_BASE_URL || 'https://api.twitter.com/2';
    const response = await fetch(`${twitterApiBaseUrl}/tweets`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.TWITTER_BEARER_TOKEN || ''}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text: longReply,
        reply: {
          in_reply_to_tweet_id: "1234567890"
        }
      })
    });
    
    const data = await response.json();
    console.log('Response from Twitter API (mocked):', data);
    
    console.log("\nAll tests completed successfully!");
    return true;
  } catch (error) {
    console.error("Test failed with error:", error);
    return false;
  } finally {
    // Restore original fetch
    (global as any).fetch = originalFetch;
  }
}

// Run the test
testFullTwitterReplyProcess()
  .then(success => {
    console.log("\nTest summary:");
    if (success) {
      console.log("✅ All tests passed successfully");
    } else {
      console.log("❌ Some tests failed");
      process.exit(1);
    }
  })
  .catch(error => {
    console.error("Unexpected error during tests:", error);
    process.exit(1);
  }); 