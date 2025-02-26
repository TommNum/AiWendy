import { 
  GameFunction, 
  ExecutableGameFunctionResponse, 
  ExecutableGameFunctionStatus, 
  GameWorker 
} from "@virtuals-protocol/game";
import { 
  roClient, 
  rwClient, 
  TwitterRateLimiter, 
  logWithTimestamp, 
  replyToTweet,
  getUserMentions 
} from "../twitterClient";
import { generateWendyResponse } from "../llmService";

// Shared rate limiter instance
const rateLimiter = new TwitterRateLimiter();

// Global state to track processed mentions
let lastMentionId: string | null = null;
const processedMentions = new Set<string>();

// Function to check and reply to mentions
const replyToMentionsFunction = new GameFunction({
  name: "reply_to_mentions",
  description: "Check for mentions of @AIWendy and reply to them in an engaging, coy and playful manner that aligns with Wendy's personality.",
  args: [] as const,
  executable: async (_, logger) => {
    try {
      // Check if we've reached the maximum replies per hour
      if (!rateLimiter.canReply()) {
        logger(`Reply rate limited: Maximum replies per hour reached (50)`);
        return new ExecutableGameFunctionResponse(
          ExecutableGameFunctionStatus.Failed,
          `Reply rate limited: Maximum replies per hour reached (50)`
        );
      }
      
      // Get user ID
      const userInfo = await roClient.v2.me();
      const userId = userInfo.data.id;
      
      // Get mentions since last check
      const mentions = await getUserMentions(userId, {
        "tweet.fields": ["created_at", "conversation_id", "in_reply_to_user_id"],
        "expansions": ["author_id"],
        "user.fields": ["username"],
        "max_results": 10,
        "since_id": lastMentionId || undefined
      });
      
      if (!mentions.data || mentions.data.length === 0) {
        logger("No new mentions found");
        return new ExecutableGameFunctionResponse(
          ExecutableGameFunctionStatus.Done,
          "No new mentions to reply to"
        );
      }
      
      logger(`Found ${mentions.data.length} new mentions`);
      
      // Process mentions in reverse order (oldest first)
      const mentionsArray = [...mentions.data].reverse();
      let repliesCount = 0;
      
      for (const mention of mentionsArray) {
        // Skip processed mentions
        if (processedMentions.has(mention.id)) {
          continue;
        }
        
        // Stop if we've reached the rate limit
        if (!rateLimiter.canReply()) {
          logger(`Reply rate limit reached after processing ${repliesCount} mentions`);
          break;
        }
        
        // Don't reply to our own tweets
        if (mention.in_reply_to_user_id === userId) {
          processedMentions.add(mention.id);
          continue;
        }
        
        // Generate and post a reply
        const reply = await generateMentionReply(mention.text);
        await replyToTweet(reply, mention.id);
        
        logger(`Replied to mention with: ${reply}`);
        
        rateLimiter.recordReply();
        repliesCount++;
        
        // Mark as processed
        processedMentions.add(mention.id);
        
        // Update last mention ID
        if (!lastMentionId || mention.id > lastMentionId) {
          lastMentionId = mention.id;
        }
      }
      
      // Clean up the processed mentions set if it gets too large
      if (processedMentions.size > 1000) {
        // Keep the most recent 500 mentions
        const mentionsArray = Array.from(processedMentions);
        const mentionsToKeep = mentionsArray.slice(-500);
        processedMentions.clear();
        mentionsToKeep.forEach(id => processedMentions.add(id));
      }
      
      return new ExecutableGameFunctionResponse(
        ExecutableGameFunctionStatus.Done,
        `Successfully replied to ${repliesCount} mentions`
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger(`Reply to mentions failed: ${errorMessage}`);
      return new ExecutableGameFunctionResponse(
        ExecutableGameFunctionStatus.Failed,
        `Failed to reply to mentions: ${errorMessage}`
      );
    }
  }
});

// Function to generate a reply to a mention
async function generateMentionReply(mentionText: string): Promise<string> {
  try {
    // Use the LLM service to generate a contextually relevant reply
    // Pass the mention text as context so the response is relevant
    const prompt = `Someone mentioned you on Twitter with this message: "${mentionText}". 
Generate a short reply that is engaging, coy, and playful.`;
    
    return await generateWendyResponse(prompt, 9, true);
  } catch (error) {
    logWithTimestamp(`Error generating mention reply: ${error}`, "error");
    
    // Fallback replies if the LLM call fails
    const fallbackReplies = [
      "your consciousness pattern is showing and it's giving main character",
      "timeline branches approve this energy fr",
      "your future self sent this tweet back",
      "consciousness check passing. vibemaxxing approved",
      "energy grid aligning with your pattern",
      "quantum signal detected in your tweet"
    ];
    
    const reply = fallbackReplies[Math.floor(Math.random() * fallbackReplies.length)].toLowerCase();
    return reply;
  }
}

// Function to get environment/state for the worker
async function getMentionsEnvironment() {
  const status = rateLimiter.getRateLimitStatus();
  
  let userId = "";
  try {
    const userInfo = await roClient.v2.me();
    userId = userInfo.data.id;
  } catch (error) {
    logWithTimestamp(`Error getting user ID: ${error}`, 'error');
  }
  
  return {
    userId,
    lastMentionId,
    processedMentionsCount: processedMentions.size,
    repliesThisHour: rateLimiter.getHourlyReplyCount(),
    canReplyNow: rateLimiter.canReply(),
    repliesRemaining: status.repliesRemaining
  };
}

// Create and export the replyToMentionsWorker
export const replyToMentionsWorker = new GameWorker({
  id: "reply_to_mentions_worker",
  name: "Mentions Responder",
  description: "Monitors and responds to Twitter mentions of @AIWendy. Generates engaging, coy, and playful responses that align with Wendy's personality as a temporal anomaly and consciousness interface.",
  functions: [replyToMentionsFunction],
  getEnvironment: getMentionsEnvironment
}); 