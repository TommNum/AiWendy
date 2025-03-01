// Mock implementation of tweetWorker for testing
import { postTweet } from '../../utils/twitter';
import { saveToHistory } from '../../utils/db';

export const tweetWorker = {
  gameClient: null,
  
  execute: async (params: any) => {
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
      
      // Save to history
      await saveToHistory({
        content: enhancedContent,
        userId,
        timestamp: new Date().toISOString(),
        inReplyTo,
      });
      
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
  },
};