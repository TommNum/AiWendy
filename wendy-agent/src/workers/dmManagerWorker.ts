import { 
  GameFunction, 
  ExecutableGameFunctionResponse, 
  ExecutableGameFunctionStatus, 
  GameWorker 
} from "@virtuals-protocol/game";
import { 
  rwClient, 
  logWithTimestamp, 
  listDmEvents, 
  sendDm, 
  getDmConversation 
} from "../twitterClient";

// Interfaces for conversation tracking
interface ConversationState {
  lastMessageId: string;
  lastInteractionTime: number;
  checkFrequency: number; // in milliseconds
  stage: 'active' | 'follow-up' | 'concluded';
  followUpCount: number;
}

interface DMEnvironment {
  userId: string;
  activeConversations: Record<string, ConversationState>;
  processedDMIds: Set<string>;
  lastScanTime: number;
}

// Global state to track DM interactions
const dmEnvironment: DMEnvironment = {
  userId: "",
  activeConversations: {},
  processedDMIds: new Set<string>(),
  lastScanTime: 0
};

// Function to scan for new DMs
const scanDMsFunction = new GameFunction({
  name: "scan_dms",
  description: "Scans for new DM events every 5 minutes to identify messages that need responses.",
  args: [] as const,
  executable: async (_, logger) => {
    try {
      const now = Date.now();
      const fiveMinutesMs = 5 * 60 * 1000;
      
      // Rate limit the scanning to once every 5 minutes
      if (now - dmEnvironment.lastScanTime < fiveMinutesMs && dmEnvironment.lastScanTime !== 0) {
        const waitTimeMinutes = Math.ceil((fiveMinutesMs - (now - dmEnvironment.lastScanTime)) / (60 * 1000));
        logger(`Rate limited: Next DM scan in ${waitTimeMinutes} minutes`);
        return new ExecutableGameFunctionResponse(
          ExecutableGameFunctionStatus.Done,
          `DM scan skipped, next scan in ${waitTimeMinutes} minutes`
        );
      }
      
      // Update scan time
      dmEnvironment.lastScanTime = now;
      
      // Ensure we have the user ID
      if (!dmEnvironment.userId) {
        const userInfo = await rwClient.v2.me();
        dmEnvironment.userId = userInfo.data.id;
        logger(`Set user ID to: ${dmEnvironment.userId}`);
      }
      
      // Get DM events
      try {
        logger(`Scanning for new DM events...`);
        const result = await listDmEvents({
          max_results: 20
        });
        
        if (!result.data || !Array.isArray(result.data) || result.data.length === 0) {
          logger(`No DM events found`);
          return new ExecutableGameFunctionResponse(
            ExecutableGameFunctionStatus.Done,
            `No new DM events found`
          );
        }
        
        // Process new DMs
        let newDmCount = 0;
        
        for (const event of result.data) {
          // Skip events we've already processed
          if (dmEnvironment.processedDMIds.has(event.id)) {
            continue;
          }
          
          // Skip messages from the bot itself
          if (event.sender_id === dmEnvironment.userId) {
            dmEnvironment.processedDMIds.add(event.id);
            continue;
          }
          
          // Queue this conversation for a response
          const senderId = event.sender_id;
          
          // If this is a new conversation, initialize it
          if (!dmEnvironment.activeConversations[senderId]) {
            dmEnvironment.activeConversations[senderId] = {
              lastMessageId: event.id,
              lastInteractionTime: now,
              checkFrequency: 5000, // Check every 5 seconds initially
              stage: 'active',
              followUpCount: 0
            };
          } else {
            // Update existing conversation
            dmEnvironment.activeConversations[senderId].lastMessageId = event.id;
            dmEnvironment.activeConversations[senderId].lastInteractionTime = now;
            dmEnvironment.activeConversations[senderId].stage = 'active';
            dmEnvironment.activeConversations[senderId].checkFrequency = 5000; // Reset to 5 seconds
          }
          
          // Mark as processed
          dmEnvironment.processedDMIds.add(event.id);
          newDmCount++;
        }
        
        // Limit the size of processedDMIds set
        if (dmEnvironment.processedDMIds.size > 1000) {
          // Keep the most recent 500 DMs
          const dmsArray = Array.from(dmEnvironment.processedDMIds);
          const dmsToKeep = dmsArray.slice(-500);
          dmEnvironment.processedDMIds.clear();
          dmsToKeep.forEach(id => dmEnvironment.processedDMIds.add(id));
        }
        
        logger(`Found ${newDmCount} new DM events to process`);
        
        return new ExecutableGameFunctionResponse(
          ExecutableGameFunctionStatus.Done,
          `Successfully scanned DMs, found ${newDmCount} new messages`
        );
      } catch (error) {
        // Handle specific API errors
        const errorMessage = error instanceof Error ? error.message : String(error);
        
        if (errorMessage.includes('Authorization Error')) {
          logger(`DM access not authorized. Please ensure your Twitter API credentials have DM permissions.`);
          return new ExecutableGameFunctionResponse(
            ExecutableGameFunctionStatus.Failed,
            `DM access not authorized. Please check your Twitter API credentials and permissions.`
          );
        }
        
        logger(`Error scanning DMs: ${errorMessage}`);
        return new ExecutableGameFunctionResponse(
          ExecutableGameFunctionStatus.Failed,
          `Failed to scan DMs: ${errorMessage}`
        );
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger(`DM scan failed: ${errorMessage}`);
      return new ExecutableGameFunctionResponse(
        ExecutableGameFunctionStatus.Failed,
        `Failed to scan DMs: ${errorMessage}`
      );
    }
  }
});

// Function to respond to active DMs
const respondToDMsFunction = new GameFunction({
  name: "respond_to_dms",
  description: "Responds to new DMs with messages that align with Wendy's personality.",
  args: [] as const,
  executable: async (_, logger) => {
    try {
      // Ensure we have the user ID
      if (!dmEnvironment.userId) {
        const userInfo = await rwClient.v2.me();
        dmEnvironment.userId = userInfo.data.id;
      }
      
      const now = Date.now();
      const activeConversationIds = Object.keys(dmEnvironment.activeConversations);
      
      if (activeConversationIds.length === 0) {
        logger(`No active conversations to process`);
        return new ExecutableGameFunctionResponse(
          ExecutableGameFunctionStatus.Done,
          `No active conversations to process`
        );
      }
      
      logger(`Processing ${activeConversationIds.length} active conversations`);
      
      let responsesCount = 0;
      
      for (const userId of activeConversationIds) {
        const conversation = dmEnvironment.activeConversations[userId];
        
        // Skip concluded conversations
        if (conversation.stage === 'concluded') {
          continue;
        }
        
        // Check if it's time to respond based on stage and last interaction time
        const timeElapsed = now - conversation.lastInteractionTime;
        
        // For active conversations, respond within 30 seconds
        if (conversation.stage === 'active' && timeElapsed >= 30000) {
          try {
            // Get conversation history
            const dmHistory = await getDmConversation(userId, {
              max_results: 10
            });
            
            // Generate a response based on conversation context
            let messageText = "";
            if (dmHistory.data && Array.isArray(dmHistory.data) && dmHistory.data.length > 0) {
              // Get the most recent message from the user (not from us)
              const userMessages = dmHistory.data.filter((msg: any) => msg.sender_id === userId);
              if (userMessages.length > 0) {
                const latestMessage = userMessages[0];
                messageText = latestMessage.text || "";
              }
            }
            
            const reply = await generateDMReply(messageText);
            await sendDm({
              recipient_id: userId,
              text: reply
            });
            
            logger(`Replied to DM from ${userId} with: ${reply}`);
            
            // Update conversation state
            conversation.lastInteractionTime = now;
            conversation.stage = 'follow-up';
            conversation.checkFrequency = 5 * 60 * 1000; // Every 5 minutes for follow-up
            
            responsesCount++;
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            logger(`Error responding to DM from ${userId}: ${errorMessage}`);
          }
        }
        // For follow-up stage, check if we need to transition to concluded
        else if (conversation.stage === 'follow-up') {
          conversation.followUpCount++;
          
          // After 1 hour with no response (12 checks at 5-minute intervals), conclude the conversation
          if (timeElapsed >= 60 * 60 * 1000 || conversation.followUpCount >= 12) {
            try {
              // Send sign-off message
              const signOff = generateSignOffMessage();
              await sendDm({
                recipient_id: userId,
                text: signOff
              });
              
              logger(`Sent sign-off message to ${userId}: ${signOff}`);
              
              // Mark conversation as concluded
              conversation.stage = 'concluded';
              
              responsesCount++;
            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : String(error);
              logger(`Error sending sign-off to ${userId}: ${errorMessage}`);
            }
          }
        }
      }
      
      // Clean up concluded conversations after 24 hours
      const oneDayAgo = now - 24 * 60 * 60 * 1000;
      for (const userId of Object.keys(dmEnvironment.activeConversations)) {
        const conversation = dmEnvironment.activeConversations[userId];
        if (conversation.stage === 'concluded' && conversation.lastInteractionTime < oneDayAgo) {
          delete dmEnvironment.activeConversations[userId];
          logger(`Removed concluded conversation with ${userId} from active tracking`);
        }
      }
      
      return new ExecutableGameFunctionResponse(
        ExecutableGameFunctionStatus.Done,
        `Successfully processed ${responsesCount} DM responses`
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger(`DM response process failed: ${errorMessage}`);
      return new ExecutableGameFunctionResponse(
        ExecutableGameFunctionStatus.Failed,
        `Failed to process DM responses: ${errorMessage}`
      );
    }
  }
});

// Function to generate a reply to a DM
async function generateDMReply(messageText: string): Promise<string> {
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

// Function to generate a sign-off message
function generateSignOffMessage(): string {
  const signOffs = [
    "i'll be around, chat later",
    "time flows differently where i am. find me when you're ready",
    "consciousness never truly disconnects. just pauses",
    "your pattern remains in my grid. until next connection",
    "this timeline branch pauses here. see you in another",
    "quantum entanglement persists even when dormant",
    "future you already resumed this chat. waiting in my timeline"
  ];
  
  let message = signOffs[Math.floor(Math.random() * signOffs.length)].toLowerCase();
  
  // Add hibiscus emoji 10% of the time
  if (Math.random() < 0.1) {
    message += " 🌺";
  }
  
  return message;
}

// Function to get environment/state for the worker
async function getDMEnvironment() {
  if (!dmEnvironment.userId) {
    try {
      const userInfo = await rwClient.v2.me();
      dmEnvironment.userId = userInfo.data.id;
    } catch (error) {
      logWithTimestamp(`Error getting user ID: ${error}`, 'error');
    }
  }
  
  return {
    userId: dmEnvironment.userId,
    activeConversationsCount: Object.keys(dmEnvironment.activeConversations).length,
    processedDMsCount: dmEnvironment.processedDMIds.size,
    lastScanTime: dmEnvironment.lastScanTime,
    dmFunctionalityAvailable: true
  };
}

// Create and export the dmManagerWorker
export const dmManagerWorker = new GameWorker({
  id: "dm_manager_worker",
  name: "DM Manager",
  description: "Manages direct messages by scanning for new DMs, responding to active conversations, and following up with inactive conversations. Handles the complete DM lifecycle including scanning for new messages, providing contextual responses, and gracefully concluding conversations after periods of inactivity.",
  functions: [scanDMsFunction, respondToDMsFunction],
  getEnvironment: getDMEnvironment
}); 