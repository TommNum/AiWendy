// Mock implementation of tweetWorker for testing
import { 
  GameWorker, 
  GameFunction, 
  ExecutableGameFunctionResponse, 
  ExecutableGameFunctionStatus 
} from "@virtuals-protocol/game";
import { postTweet } from '../../utils/twitter';
import { saveToHistory } from '../../utils/db';

// Mock post tweet function
const postTweetFunction = new GameFunction({
  name: "post_tweet",
  description: "Posts a tweet with the given content",
  args: [
    { name: "content", description: "The content of the tweet to post" },
    { name: "in_reply_to", description: "Optional tweet ID to reply to" }
  ] as const,
  executable: async (args, logger) => {
    try {
      const { content, in_reply_to } = args;
      
      if (!content) {
        return new ExecutableGameFunctionResponse(
          ExecutableGameFunctionStatus.Failed,
          "Tweet content is required"
        );
      }
      
      // Enhanced content for testing
      const enhancedContent = 'This is a mock tweet response #test';
      
      // Post the tweet
      const tweetResult = await postTweet(enhancedContent, in_reply_to || null);
      
      return new ExecutableGameFunctionResponse(
        ExecutableGameFunctionStatus.Done,
        JSON.stringify({
          tweet_id: tweetResult.id,
          content: tweetResult.text
        })
      );
    } catch (error: any) {
      return new ExecutableGameFunctionResponse(
        ExecutableGameFunctionStatus.Failed,
        error.message
      );
    }
  }
});

// Create the mock tweet worker
export const tweetWorker = new GameWorker({
  id: "tweet_worker_mock",
  name: "Tweet Worker Mock",
  description: "Mock worker for testing tweet functionality",
  functions: [postTweetFunction],
  getEnvironment: async () => {
    return {
      testing: true,
      timestamp: new Date().toISOString()
    };
  }
});

// Add backward compatibility for tests that use the old structure
(tweetWorker as any).execute = async (params: any) => {
  try {
    if (params.function !== 'postTweet') {
      return {
        status: 'error',
        error: 'Unsupported function',
      };
    }
    
    const { content, inReplyTo } = params.arguments;
    const { userId } = params.context;
    
    if (!content) {
      return {
        status: 'error',
        error: 'Missing required parameter: content',
      };
    }
    
    // Enhanced content (would normally come from GameClient)
    const enhancedContent = 'This is a mock tweet response #test';
    
    // Post the tweet
    const tweetResult = await postTweet(enhancedContent, inReplyTo);
    
    // Save to history - adjust the parameters to match what the actual saveToHistory expects
    await saveToHistory(
      tweetResult.id,
      enhancedContent,
      userId || 'system',
      inReplyTo
    );
    
    return {
      status: 'success',
      output: {
        tweetId: tweetResult.id,
        content: tweetResult.text,
      },
    };
  } catch (error: any) {
    return {
      status: 'error',
      error: error.message,
    };
  }
};