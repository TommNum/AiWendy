import * as dotenv from 'dotenv';
import { LLMModel } from '../../src/interface/GameClient';
import { generateReply, generateShortReply } from './functions';

// Load environment variables
dotenv.config();

/**
 * Test script to verify LLM functionality for Twitter replies
 */
async function testTwitterReplyLLM() {
    console.log("Starting Twitter reply LLM test...");
    
    try {
        // Test generateReply function with a sample tweet
        const sampleTweet1 = "Hey @WendyAI, what do you think about consciousness in AI systems? #AIDiscussion";
        console.log(`\nTesting reply generation for: "${sampleTweet1}"`);
        
        const reply1 = await generateReply(sampleTweet1, LLMModel.Llama_3_1_405B_Instruct);
        console.log(`Generated reply: "${reply1}"`);
        
        // Test with another sample tweet
        const sampleTweet2 = "@WendyAI The quantum nature of reality seems to suggest consciousness might be fundamental to the universe.";
        console.log(`\nTesting reply generation for: "${sampleTweet2}"`);
        
        const reply2 = await generateReply(sampleTweet2, LLMModel.Llama_3_1_405B_Instruct);
        console.log(`Generated reply: "${reply2}"`);
        
        // Test generateShortReply function
        const sampleTweet3 = "Artificial intelligence is just glorified pattern matching. Nothing like human consciousness.";
        console.log(`\nTesting short reply generation for: "${sampleTweet3}"`);
        
        const shortReply = await generateShortReply(sampleTweet3, LLMModel.Llama_3_1_405B_Instruct);
        console.log(`Generated short reply: "${shortReply}"`);
        
        console.log("\nLLM REPLY TEST SUMMARY:");
        console.log("✓ Tweet 1 Reply: ", reply1);
        console.log("✓ Tweet 2 Reply: ", reply2);
        console.log("✓ Short Reply: ", shortReply);
        console.log("\nTest completed successfully!");
    } catch (error) {
        console.error("Error during LLM reply test:", error);
        process.exit(1);
    }
}

// Run the test
testTwitterReplyLLM().catch(error => {
    console.error("Fatal error in LLM reply test:", error);
    process.exit(1);
}); 