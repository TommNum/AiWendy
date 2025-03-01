// Mock environment variables before imports
jest.mock('../../agent', () => ({}));

// Set required environment variables
process.env.API_KEY = 'test-api-key';
process.env.TWITTER_USER_ID = 'test-user-id';
process.env.TWITTER_BEARER_TOKEN = 'test-bearer-token';
process.env.TWITTER_API_KEY = 'test-api-key';
process.env.TWITTER_API_SECRET = 'test-api-secret';
process.env.TWITTER_ACCESS_TOKEN = 'test-access-token';
process.env.TWITTER_ACCESS_SECRET = 'test-access-secret';

import { twitterReplyWorker } from '../../workers/twitterReplyWorker';
import { getMentionsFunction, replyToTweetFunction } from '../../functions';

// Mock the functions
jest.mock('../../functions', () => ({
  getMentionsFunction: {
    name: 'get_twitter_mentions',
    executable: jest.fn()
  },
  replyToTweetFunction: {
    name: 'reply_to_tweet',
    executable: jest.fn()
  }
}));

describe('twitterReplyWorker', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  it('should be properly configured with the correct functions', () => {
    // Check that the worker has the expected structure
    expect(twitterReplyWorker.id).toBe('twitter_reply_worker');
    expect(twitterReplyWorker.name).toBe('Twitter Reply Worker');
    expect(twitterReplyWorker.functions).toHaveLength(2);
    expect(twitterReplyWorker.functions[0].name).toBe('get_twitter_mentions');
    expect(twitterReplyWorker.functions[1].name).toBe('reply_to_tweet');
  });
  
  it('should provide the correct environment variables', async () => {
    // Store original environment
    const originalEnv = process.env.TWITTER_HANDLE;
    
    try {
      // Set test environment
      process.env.TWITTER_HANDLE = 'TestWendy';
      
      // Get environment from worker
      const env = await twitterReplyWorker.getEnvironment();
      
      // Check environment values
      expect(env).toHaveProperty('twitter_handle', 'TestWendy');
      expect(env).toHaveProperty('last_check');
    } finally {
      // Restore original environment
      process.env.TWITTER_HANDLE = originalEnv;
    }
  });
  
  it('should default to AiWendy if no TWITTER_HANDLE is set', async () => {
    // Store original environment
    const originalEnv = process.env.TWITTER_HANDLE;
    
    try {
      // Unset environment variable
      delete process.env.TWITTER_HANDLE;
      
      // Get environment from worker
      const env = await twitterReplyWorker.getEnvironment();
      
      // Check environment values
      expect(env).toHaveProperty('twitter_handle', 'AiWendy');
    } finally {
      // Restore original environment
      process.env.TWITTER_HANDLE = originalEnv;
    }
  });
}); 