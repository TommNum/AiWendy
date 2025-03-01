import { generateReply, generateShortReply } from './src/functions';
import { LLMModel } from "@virtuals-protocol/game";
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testTwitterReplyFunctions() {
  console.log("Testing Twitter Reply Functions");
  console.log("==============================");
  
  // Test tweets
  const testTweets = [
    "Hey @AiWendy, what do you think about the future of AI?",
    "@AiWendy I'm curious about your thoughts on consciousness",
    "Do you believe in digital immortality @AiWendy?",
    "@AiWendy Tell me something about quantum computing"
  ];
  
  console.log("\nTesting generateReply function:");
  console.log("------------------------------");
  
  try {
    // Test generateReply with the first tweet
    const reply = await generateReply(testTweets[0], LLMModel.Llama_3_1_405B_Instruct);
    console.log(`Tweet: "${testTweets[0]}"`);
    console.log(`Generated Reply: "${reply}"`);
  } catch (error) {
    console.error("Error testing generateReply:", error);
  }
  
  console.log("\nTesting generateShortReply function:");
  console.log("-----------------------------------");
  
  try {
    // Test generateShortReply with the remaining tweets
    for (let i = 1; i < testTweets.length; i++) {
      const reply = await generateShortReply(testTweets[i], LLMModel.Llama_3_1_405B_Instruct);
      console.log(`Tweet: "${testTweets[i]}"`);
      console.log(`Generated Short Reply: "${reply}"`);
      console.log();
    }
  } catch (error) {
    console.error("Error testing generateShortReply:", error);
  }
  
  console.log("Test completed!");
}

// Run the test
testTwitterReplyFunctions().catch(error => {
  console.error("Test failed with error:", error);
  process.exit(1);
}); 