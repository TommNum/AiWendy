import dotenv from 'dotenv';
import { twitterApiRateLimiter, twitterMentionsRateLimiter } from './src/utils/rateLimiter';

// Load environment variables
dotenv.config();

// Function to test Twitter API connectivity
async function testTwitterApiConnectivity() {
  console.log("Testing Twitter API Connectivity");
  console.log("===============================");
  
  // Check if required environment variables are set
  if (!process.env.TWITTER_BEARER_TOKEN) {
    console.error("ERROR: TWITTER_BEARER_TOKEN is not set in environment variables");
    return false;
  }
  
  if (!process.env.TWITTER_USER_ID) {
    console.error("ERROR: TWITTER_USER_ID is not set in environment variables");
    return false;
  }

  // Log the Twitter credentials we have (masked for security)
  console.log(`TWITTER_BEARER_TOKEN: ${maskString(process.env.TWITTER_BEARER_TOKEN || '')}`);
  console.log(`TWITTER_USER_ID: ${process.env.TWITTER_USER_ID}`);
  
  // Test API connectivity by fetching user info
  console.log("\nTesting API connection by fetching user info...");
  const userId = process.env.TWITTER_USER_ID;
  const twitterApiBaseUrl = process.env.TWITTER_API_BASE_URL || 'https://api.twitter.com/2';
  
  try {
    // Apply rate limiting
    await twitterApiRateLimiter.getToken();
    
    // Fetch user info
    const url = `${twitterApiBaseUrl}/users/${userId}?user.fields=description,profile_image_url`;
    console.log(`Fetching from URL: ${url}`);
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${process.env.TWITTER_BEARER_TOKEN}`,
        'Content-Type': 'application/json',
      }
    });
    
    console.log(`Response status: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error("Error response:", JSON.stringify(errorData, null, 2));
      return false;
    }
    
    const userData = await response.json();
    console.log("User data retrieved successfully:", JSON.stringify(userData, null, 2));
    
    // Test mentions API connectivity
    console.log("\nTesting mentions API connectivity...");
    
    // Apply rate limiting
    await twitterMentionsRateLimiter.getToken();
    
    // Fetch recent mentions (just to test connectivity, not to process them)
    const mentionsUrl = `${twitterApiBaseUrl}/users/${userId}/mentions?max_results=5`;
    console.log(`Fetching mentions from URL: ${mentionsUrl}`);
    
    const mentionsResponse = await fetch(mentionsUrl, {
      headers: {
        'Authorization': `Bearer ${process.env.TWITTER_BEARER_TOKEN}`,
        'Content-Type': 'application/json',
      }
    });
    
    console.log(`Mentions response status: ${mentionsResponse.status} ${mentionsResponse.statusText}`);
    
    if (!mentionsResponse.ok) {
      const errorData = await mentionsResponse.json();
      console.error("Error response from mentions API:", JSON.stringify(errorData, null, 2));
      return false;
    }
    
    const mentionsData = await mentionsResponse.json();
    console.log("Mentions API test successful!");
    console.log(`Retrieved ${mentionsData.data?.length || 0} recent mentions`);
    
    return true;
  } catch (error) {
    console.error("Error testing Twitter API connectivity:", error);
    return false;
  }
}

// Helper function to mask sensitive strings
function maskString(str: string): string {
  if (str.length <= 8) return "********";
  return str.substring(0, 4) + "..." + str.substring(str.length - 4);
}

// Run the test
testTwitterApiConnectivity()
  .then(isSuccessful => {
    console.log("\nTest Summary:");
    console.log(isSuccessful 
      ? "✅ Twitter API connectivity test PASSED"
      : "❌ Twitter API connectivity test FAILED");
    
    if (!isSuccessful) {
      process.exit(1);
    }
  })
  .catch(error => {
    console.error("Test failed with unexpected error:", error);
    process.exit(1);
  }); 