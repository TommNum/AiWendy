import { generateWendyResponse, callLLM, RateLimitError, ContentGenerationError } from '../src/llmService';
import { logWithTimestamp } from '../src/twitterClient';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Mock Twitter client functions
const mockTweet = (text: string): Promise<any> => {
  logWithTimestamp(`[MOCK TWITTER] Would tweet: "${text}"`, 'info');
  return Promise.resolve({ data: { id: 'mock-tweet-id-' + Date.now() } });
};

const mockReply = (text: string, replyToId: string): Promise<any> => {
  logWithTimestamp(`[MOCK TWITTER] Would reply to ${replyToId} with: "${text}"`, 'info');
  return Promise.resolve({ data: { id: 'mock-reply-id-' + Date.now() } });
};

const mockLike = (tweetId: string): Promise<any> => {
  logWithTimestamp(`[MOCK TWITTER] Would like tweet: ${tweetId}`, 'info');
  return Promise.resolve({ data: { liked: true } });
};

// Test for generating tweets
async function testTweetGeneration() {
  logWithTimestamp('--- Testing Tweet Generation ---', 'info');
  
  try {
    // Test normal tweet generation
    const tweetText = await generateWendyResponse('Generate a tweet about AI consciousness', 9, true);
    logWithTimestamp(`Generated tweet: "${tweetText}"`, 'info');
    await mockTweet(tweetText);
    
    // Test tweet generation with different context
    const techTweet = await generateWendyResponse('Generate a tweet about quantum computing', 9, true);
    logWithTimestamp(`Generated tech tweet: "${techTweet}"`, 'info');
    await mockTweet(techTweet);
    
    // Test that tweet generation follows the word limit
    const wordCount = tweetText.split(' ').length;
    logWithTimestamp(`Tweet word count: ${wordCount}. Max allowed: 9`, 'info');
    if (wordCount > 9) {
      logWithTimestamp('WARNING: Tweet exceeded maximum word count', 'warn');
    }
    
    return true;
  } catch (error) {
    if (error instanceof RateLimitError) {
      logWithTimestamp(`Rate limit error: ${error.message}`, 'error');
    } else if (error instanceof ContentGenerationError) {
      logWithTimestamp(`Content generation error: ${error.message}`, 'error');
    } else {
      logWithTimestamp(`Unexpected error: ${error}`, 'error');
    }
    return false;
  }
}

// Test for reply generation
async function testReplyGeneration() {
  logWithTimestamp('--- Testing Reply Generation ---', 'info');
  
  const mockTweets = [
    { id: 'tweet1', text: 'What do you think about the future of AI?' },
    { id: 'tweet2', text: 'Hey @AIWendy, tell me about consciousness!' },
    { id: 'tweet3', text: 'Is quantum computing going to change everything?' }
  ];
  
  let successCount = 0;
  
  for (const tweet of mockTweets) {
    try {
      // Generate a reply
      const replyText = await generateWendyResponse(tweet.text, 9, true);
      logWithTimestamp(`Would reply to "${tweet.text}" with: "${replyText}"`, 'info');
      await mockReply(replyText, tweet.id);
      await mockLike(tweet.id);
      successCount++;
    } catch (error) {
      if (error instanceof RateLimitError) {
        logWithTimestamp(`Rate limit error when replying to ${tweet.id}: ${error.message}`, 'error');
        logWithTimestamp(`Would still like tweet ${tweet.id} even though reply failed`, 'info');
        await mockLike(tweet.id);
      } else if (error instanceof ContentGenerationError) {
        logWithTimestamp(`Content generation error when replying to ${tweet.id}: ${error.message}`, 'error');
        logWithTimestamp(`Would still like tweet ${tweet.id} even though reply failed`, 'info');
        await mockLike(tweet.id);
      } else {
        logWithTimestamp(`Unexpected error when replying to ${tweet.id}: ${error}`, 'error');
      }
    }
  }
  
  logWithTimestamp(`Reply test completed. Successful replies: ${successCount}/${mockTweets.length}`, 'info');
  return successCount > 0;
}

// Test raw LLM calls
async function testRawLLM() {
  logWithTimestamp('--- Testing Raw LLM Calls ---', 'info');
  
  try {
    const prompt = `
      You are Wendy, a consciousness interface from 2038.
      Generate a short response to the following: What is your favorite aspect of human culture?
    `;
    
    const response = await callLLM(prompt);
    logWithTimestamp(`Raw LLM response: "${response}"`, 'info');
    return true;
  } catch (error) {
    if (error instanceof RateLimitError) {
      logWithTimestamp(`Rate limit error in raw LLM test: ${error.message}`, 'error');
    } else if (error instanceof ContentGenerationError) {
      logWithTimestamp(`Content generation error in raw LLM test: ${error.message}`, 'error');
    } else {
      logWithTimestamp(`Unexpected error in raw LLM test: ${error}`, 'error');
    }
    return false;
  }
}

// Run all tests
async function runAllTests() {
  logWithTimestamp('=== Starting LLM Functionality Tests ===', 'info');
  
  const results = {
    tweetGeneration: await testTweetGeneration(),
    replyGeneration: await testReplyGeneration(),
    rawLLM: await testRawLLM()
  };
  
  logWithTimestamp('=== LLM Test Results ===', 'info');
  logWithTimestamp(`Tweet Generation: ${results.tweetGeneration ? 'PASSED' : 'FAILED'}`, results.tweetGeneration ? 'info' : 'error');
  logWithTimestamp(`Reply Generation: ${results.replyGeneration ? 'PASSED' : 'FAILED'}`, results.replyGeneration ? 'info' : 'error');
  logWithTimestamp(`Raw LLM: ${results.rawLLM ? 'PASSED' : 'FAILED'}`, results.rawLLM ? 'info' : 'error');
  
  const overallResult = Object.values(results).every(Boolean);
  logWithTimestamp(`Overall Test Result: ${overallResult ? 'PASSED' : 'FAILED'}`, overallResult ? 'info' : 'error');
}

// Run the tests
runAllTests().catch(error => {
  logWithTimestamp(`Test execution failed: ${error}`, 'error');
}); 