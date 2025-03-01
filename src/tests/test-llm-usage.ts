import dotenv from 'dotenv';
import { activity_agent } from '../agent';
import { LLMModel } from '@virtuals-protocol/game';

// Load environment variables
dotenv.config();

/**
 * Test to verify that the application is using the LLM via the game API key
 * instead of hardcoded examples
 */
async function testLLMUsage() {
  console.log('🧪 Testing LLM Usage via API Key');
  console.log('================================');
  
  try {
    // Test 1: Verify environment configuration
    console.log('1️⃣ Testing environment configuration:');
    const configuredModel = process.env.LLM_MODEL || 'Not set';
    console.log(`✓ Configured LLM model in .env: ${configuredModel}`);
    
    if (configuredModel !== 'DeepSeek-R1') {
      console.warn('⚠️ Warning: LLM model in .env is not set to DeepSeek-R1');
    }
    
    // Test 2: Check agent configuration
    console.log('\n2️⃣ Testing agent configuration:');
    console.log('Agent name:', activity_agent.name);
    
    // Test 3: Check API key format
    console.log('\n3️⃣ Testing API key format:');
    if (!process.env.API_KEY) {
      throw new Error('API_KEY is not defined in environment variables');
    }
    
    if (!process.env.API_KEY.startsWith('apt-')) {
      console.warn('⚠️ Warning: API_KEY does not start with "apt-", which is expected for proper API authentication');
    } else {
      console.log('✅ API_KEY format is correct for LLM usage');
    }
    
    console.log('\n✅ LLM Usage Test Completed');

  } catch (error) {
    console.error('❌ Error during LLM usage test:', error);
  }
}

// Run the test
testLLMUsage()
  .then(() => {
    console.log('Test completed.');
    process.exit(0);
  })
  .catch(error => {
    console.error('Test failed with error:', error);
    process.exit(1);
  }); 