import dotenv from 'dotenv';
import path from 'path';
import TwitterApi from 'twitter-api-v2';

// Load environment variables from the correct location
dotenv.config({ path: path.join(__dirname, '../.env') });

// Helper function to mask sensitive information
function maskString(str: string, visibleChars = 4): string {
  if (!str) return 'undefined';
  if (str.length <= visibleChars) return str;
  return str.substring(0, visibleChars) + '...' + str.substring(str.length - 4);
}

async function testTwitterCredentials() {
  console.log('🔍 Testing Twitter API credentials...');
  
  // First, log the credentials we're using (masked for security)
  console.log(`API Key: ${maskString(process.env.TWITTER_API_KEY || '')}`);
  console.log(`API Secret: ${maskString(process.env.TWITTER_API_SECRET || '')}`);
  console.log(`Access Token: ${maskString(process.env.TWITTER_ACCESS_TOKEN || '')}`);
  console.log(`Access Token Secret: ${maskString(process.env.TWITTER_ACCESS_TOKEN_SECRET || '')}`);
  
  // Check if any credentials are missing
  const requiredEnvVars = [
    'TWITTER_API_KEY',
    'TWITTER_API_SECRET',
    'TWITTER_ACCESS_TOKEN',
    'TWITTER_ACCESS_TOKEN_SECRET'
  ];
  
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:', missingVars.join(', '));
    return;
  }
  
  try {
    // Initialize the client
    console.log('🔄 Initializing Twitter client...');
    const client = new TwitterApi({
      appKey: process.env.TWITTER_API_KEY!,
      appSecret: process.env.TWITTER_API_SECRET!,
      accessToken: process.env.TWITTER_ACCESS_TOKEN!,
      accessSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET!,
    });
    
    // First, try to get the user info (me endpoint) to test credentials
    console.log('🔄 Testing credentials by fetching user info...');
    try {
      const me = await client.v2.me();
      console.log('✅ Successfully authenticated with Twitter API!');
      console.log(`User ID: ${me.data.id}`);
      console.log(`Username: ${me.data.username}`);
      console.log(`Name: ${me.data.name}`);
    } catch (meError: any) {
      console.error('❌ Error fetching user info:');
      console.error(`Status: ${meError.status || 'Unknown'}`);
      console.error(`Message: ${meError.message || 'Unknown error'}`);
      if (meError.errors) {
        console.error('Error details:', JSON.stringify(meError.errors, null, 2));
      }
    }
    
    // Test tweet posting with a test message
    const testTweet = `Testing Twitter API connection at ${new Date().toISOString()} [DEBUG]`;
    console.log(`🔄 Attempting to post test tweet: "${testTweet}"`);
    
    try {
      const result = await client.v2.tweet(testTweet);
      console.log('✅ Successfully posted a tweet!');
      console.log(`Tweet ID: ${result.data.id}`);
      console.log(`Tweet text: ${result.data.text}`);
    } catch (tweetError: any) {
      console.error('❌ Error posting tweet:');
      console.error(`Status: ${tweetError.status || 'Unknown'}`);
      console.error(`Message: ${tweetError.message || 'Unknown error'}`);
      if (tweetError.errors) {
        console.error('Error details:', JSON.stringify(tweetError.errors, null, 2));
      }
      
      // Check for specific error codes and provide guidance
      if (tweetError.code === 32) {
        console.error('🔑 Authentication error: Could not authenticate you. Check your credentials.');
      } else if (tweetError.code === 89) {
        console.error('🔒 Invalid token: Your access token is invalid or expired.');
      } else if (tweetError.code === 187) {
        console.error('🔄 Duplicate content: Status is a duplicate. Try a different message.');
      } else if (tweetError.code === 186) {
        console.error('📝 Tweet too long: Tweet exceeded character limit.');
      } else if (tweetError.code === 185) {
        console.error('⏱️ Rate limit: User is over daily status update limit.');
      }
    }
  } catch (error: any) {
    console.error('❌ Error initializing Twitter client:');
    console.error(error.message);
    
    // Provide more helpful guidance
    if (error.message && error.message.includes('401')) {
      console.error('\n📋 Common reasons for 401 Unauthorized errors:');
      console.error('1. Incorrect API keys or access tokens');
      console.error('2. Expired tokens');
      console.error('3. App lacks proper permissions (read/write/DM)');
      console.error('4. Clock synchronization issues between your system and Twitter');
    }
  }
  
  console.log('\n📋 TROUBLESHOOTING GUIDE:');
  console.log('1. Verify your API keys and tokens are correct');
  console.log('2. Check that your Twitter Developer App has Read & Write permissions');
  console.log('3. Regenerate access tokens if necessary');
  console.log('4. Ensure your app is not in restricted mode if it\'s a new developer account');
  console.log('5. Make sure your system clock is synchronized');
}

// Run the test and catch any errors
console.log('Starting Twitter API diagnostic test...');
testTwitterCredentials()
  .then(() => {
    console.log('Diagnostic test completed.');
  })
  .catch((error) => {
    console.error('Unhandled error in diagnostic test:', error);
  })
  .finally(() => {
    console.log('Test script execution finished.');
  }); 