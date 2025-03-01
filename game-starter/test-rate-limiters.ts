import { 
  twitterApiRateLimiter, 
  twitterMentionsRateLimiter, 
  twitterRepliesRateLimiter, 
  twitterLikesRateLimiter,
  twitterTweetsRateLimiter,
  virtualsApiRateLimiter
} from './src/utils/rateLimiter';

// Function to display rate limiter status
async function displayRateLimiterStatus() {
  console.log("Rate Limiter Status");
  console.log("==================");
  
  // Display status for each rate limiter
  const limiters = [
    { name: "Twitter API", limiter: twitterApiRateLimiter, expectedTokens: 300, expectedMinutes: 15 },
    { name: "Twitter Mentions", limiter: twitterMentionsRateLimiter, expectedTokens: 10, expectedMinutes: 15 },
    { name: "Twitter Replies", limiter: twitterRepliesRateLimiter, expectedTokens: 50, expectedMinutes: 60 },
    { name: "Twitter Likes", limiter: twitterLikesRateLimiter, expectedTokens: 200, expectedMinutes: 24 * 60 },
    { name: "Twitter Tweets", limiter: twitterTweetsRateLimiter, expectedTokens: 100, expectedMinutes: 24 * 60 },
    { name: "Virtuals API", limiter: virtualsApiRateLimiter, expectedTokens: 30, expectedMinutes: 5 }
  ];
  
  let allCorrect = true;
  
  for (const { name, limiter, expectedTokens, expectedMinutes } of limiters) {
    const status = limiter.getStatus();
    const expectedIntervalMs = expectedMinutes * 60 * 1000;
    
    console.log(`\n${name} Rate Limiter:`);
    console.log(`  - Max tokens: ${status.maxTokens}`);
    console.log(`  - Current tokens: ${status.currentTokens.toFixed(2)}`);
    console.log(`  - Requests in current interval: ${status.requestsThisInterval}`);
    
    // Check if the rate limiter's configuration is appropriate
    if (status.maxTokens !== expectedTokens) {
      console.log(`  ⚠️ WARNING: ${name} rate limiter might be misconfigured!`);
      console.log(`    Expected ${expectedTokens} tokens, got ${status.maxTokens}`);
      allCorrect = false;
    } else {
      console.log(`  ✅ ${name} rate limiter has the correct token limit (${expectedTokens}).`);
    }
  }
  
  return allCorrect;
}

// Run the display function
displayRateLimiterStatus()
  .then(allCorrect => {
    console.log("\nRate limiter verification completed!");
    if (allCorrect) {
      console.log("✅ All rate limiters have correct configurations.");
    } else {
      console.log("⚠️ Some rate limiters may have incorrect configurations. Please check the warnings above.");
    }
  })
  .catch(error => {
    console.error("Error checking rate limiters:", error);
    process.exit(1);
  }); 