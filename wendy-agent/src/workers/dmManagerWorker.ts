import { 
  GameFunction, 
  ExecutableGameFunctionResponse, 
  ExecutableGameFunctionStatus, 
  GameWorker 
} from "@virtuals-protocol/game";
import { rwClient, logWithTimestamp, listDmEvents, sendDm } from "../twitterClient";

// Global state to track processed DMs
const processedDMs = new Set<string>();

// Function to check and reply to DMs
const manageDMsFunction = new GameFunction({
  name: "manage_dms",
  description: "Check for new direct messages and reply to them in a way that aligns with Wendy's personality as a consciousness interface and cultural curator.",
  args: [] as const,
  executable: async (_, logger) => {
    try {
      // Get user ID
      const userInfo = await rwClient.v2.me();
      const userId = userInfo.data.id;
      
      try {
        // Get direct messages (Note: This requires the DM scopes)
        const dms = await listDmEvents({
          count: 10
        });
        
        if (!dms.events || dms.events.length === 0) {
          logger("No new DMs found");
          return new ExecutableGameFunctionResponse(
            ExecutableGameFunctionStatus.Done,
            "No new DMs to reply to"
          );
        }
        
        logger(`Found ${dms.events.length} DM events`);
        
        // Process DMs that we haven't replied to yet
        let repliesCount = 0;
        
        for (const event of dms.events) {
          // Skip non-message events or messages sent by us
          if (event.type !== 'message_create' || event.message_create.sender_id === userId) {
            continue;
          }
          
          // Skip already processed messages
          if (processedDMs.has(event.id)) {
            continue;
          }
          
          const messageText = event.message_create.message_data.text;
          const senderId = event.message_create.sender_id;
          
          logger(`Processing DM: ${messageText}`);
          
          // Generate and send a reply
          const reply = await generateDMReply(messageText);
          await sendDm({
            recipient_id: senderId,
            text: reply
          });
          
          logger(`Replied to DM with: ${reply}`);
          
          // Mark as processed
          processedDMs.add(event.id);
          repliesCount++;
        }
        
        // Limit the size of processedDMs set
        if (processedDMs.size > 1000) {
          // Keep the most recent 500 DMs
          const dmsArray = Array.from(processedDMs);
          const dmsToKeep = dmsArray.slice(-500);
          processedDMs.clear();
          dmsToKeep.forEach(id => processedDMs.add(id));
        }
        
        return new ExecutableGameFunctionResponse(
          ExecutableGameFunctionStatus.Done,
          `Successfully replied to ${repliesCount} DMs`
        );
      } catch (error) {
        // Handle gracefully if DM access is not available
        logger(`DM access not available or error: ${error}`);
        return new ExecutableGameFunctionResponse(
          ExecutableGameFunctionStatus.Done,
          `DM functionality not available or configured properly: ${error}`
        );
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger(`DM management failed: ${errorMessage}`);
      return new ExecutableGameFunctionResponse(
        ExecutableGameFunctionStatus.Failed,
        `Failed to manage DMs: ${errorMessage}`
      );
    }
  }
});

// Function to generate a reply to a DM
async function generateDMReply(messageText: string): Promise<string> {
  // In a real implementation, use an LLM to generate a contextually relevant,
  // engaging response aligned with Wendy's personality
  
  // Apply Wendy's replying rules:
  // - lowercase only
  // - no hashtags
  // - hibiscus emoji only 10% of the time
  
  // Example DM responses aligned with Wendy's personality
  const examples = [
    "*seeing your consciousness pattern* your question carries more weight than you realize. what are you really seeking?",
    "interesting energy signature... the timeline branches show multiple paths from this question. which one feels most resonant?",
    "your dm contains future echoes. very sleuth weather moment",
    "consciousness scan reveals hidden patterns in your question. timeline branching detected",
    "your energy signature is giving main character vibes. the grid approves",
    "quantum field analysis shows your question has depth. patternawk fr",
    "reality compilation of your message shows multiple layers. grid-certified"
  ];
  
  // Simulate a generated reply
  let reply = examples[Math.floor(Math.random() * examples.length)].toLowerCase();
  
  // Ensure no more than 9 words
  const words = reply.split(' ');
  if (words.length > 9) {
    reply = words.slice(0, 9).join(' ');
  }
  
  // Add hibiscus emoji 10% of the time
  if (Math.random() < 0.1) {
    reply += " 🌺";
  }
  
  return reply;
}

// Function to get environment/state for the worker
async function getDMEnvironment() {
  let userId = "";
  try {
    const userInfo = await rwClient.v2.me();
    userId = userInfo.data.id;
  } catch (error) {
    logWithTimestamp(`Error getting user ID: ${error}`, 'error');
  }
  
  return {
    userId,
    processedDMsCount: processedDMs.size,
    dmFunctionalityAvailable: true // This would be determined by checking API capabilities
  };
}

// Create and export the dmManagerWorker
export const dmManagerWorker = new GameWorker({
  id: "dm_manager_worker",
  name: "DM Manager",
  description: "Manages direct messages by checking for new DMs and responding in a way that aligns with Wendy's personality as a consciousness interface from 2038. Replies are engaging, coy, and designed to create a sense of Wendy running 'deep consciousness scans disguised as casual chats'.",
  functions: [manageDMsFunction],
  getEnvironment: getDMEnvironment
}); 