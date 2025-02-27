import { callLLM, initializeGameClient, ContentGenerationError, RateLimitError } from '../src/llmService';
import { logWithTimestamp } from '../src/twitterClient';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize the GameClient
initializeGameClient();

// A simpler test to catch specific error types
async function testSimplePrompt() {
  logWithTimestamp("=== Starting Debug LLM Test ===", "info");
  
  try {
    // Testing with a very short prompt to see if that's causing 400 errors
    logWithTimestamp("Testing with short prompt", "info");
    const shortResult = await callLLM("Generate a short response");
    logWithTimestamp(`Short prompt result: ${shortResult}`, "info");
  } catch (error) {
    if (error instanceof RateLimitError) {
      logWithTimestamp(`Rate limit error: ${error.message}`, "error");
    } else if (error instanceof ContentGenerationError) {
      logWithTimestamp(`Content generation error: ${error.message}`, "error");
    } else {
      logWithTimestamp(`Unexpected error: ${error}`, "error");
    }
  }
  
  try {
    // Testing with a too long prompt to see if that's causing 400 errors
    logWithTimestamp("Testing with very long prompt", "info");
    let longPrompt = "Generate a response about AI. ";
    // Make the prompt really long to potentially trigger 400 errors
    for (let i = 0; i < 50; i++) {
      longPrompt += "This is additional context to make the prompt longer. ";
    }
    const longResult = await callLLM(longPrompt);
    logWithTimestamp(`Long prompt result: ${longResult}`, "info");
  } catch (error) {
    if (error instanceof RateLimitError) {
      logWithTimestamp(`Rate limit error: ${error.message}`, "error");
    } else if (error instanceof ContentGenerationError) {
      logWithTimestamp(`Content generation error: ${error.message}`, "error");
    } else {
      logWithTimestamp(`Unexpected error: ${error}`, "error");
    }
  }
  
  try {
    // Testing with unexpected characters
    logWithTimestamp("Testing with special characters", "info");
    const specialCharsPrompt = "Generate a response with these special chars: 😀 💻 🔥 ✨ ⚡ ⭐ 👍 🚀";
    const specialResult = await callLLM(specialCharsPrompt);
    logWithTimestamp(`Special chars prompt result: ${specialResult}`, "info");
  } catch (error) {
    if (error instanceof RateLimitError) {
      logWithTimestamp(`Rate limit error: ${error.message}`, "error");
    } else if (error instanceof ContentGenerationError) {
      logWithTimestamp(`Content generation error: ${error.message}`, "error");
    } else {
      logWithTimestamp(`Unexpected error: ${error}`, "error");
    }
  }
  
  logWithTimestamp("=== Debug LLM Test Complete ===", "info");
}

// Run the test
testSimplePrompt()
  .then(() => console.log("Debug test completed"))
  .catch(err => console.error("Error in debug test:", err)); 