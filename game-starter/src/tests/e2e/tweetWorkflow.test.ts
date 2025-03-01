import { GameAgent } from '../mocks/GameAgentMock';
import { tweetWorker } from '../mocks/tweetWorkerMock';
import { dbLogger } from '../../utils/dbLogger';

// Mock dependencies
jest.mock('../../game/client', () => {
  const mockSetTask = jest.fn().mockImplementation((taskData) => {
    return Promise.resolve({
      taskId: 'mock-task-123',
      status: 'completed',
      result: 'This is a mock tweet response #test',
    });
  });
  
  return {
    GameClient: jest.fn().mockImplementation(() => ({
      setTask: mockSetTask,
      getTaskResult: jest.fn().mockImplementation((taskId) => {
        return Promise.resolve({
          taskId,
          status: 'completed',
          result: 'This is a mock tweet response #test',
        });
      }),
      getAction: jest.fn(),
    })),
  };
});

// Mock Twitter API
jest.mock('../../utils/twitter', () => ({
  postTweet: jest.fn().mockResolvedValue({
    id: 'tweet-123',
    text: 'This is a mock tweet response #test',
  }),
  getMentions: jest.fn().mockResolvedValue([
    {
      id: 'mention-456',
      text: '@testbot Hello, can you help me?',
      author: 'user123',
    },
  ]),
}));

// Mock database operations
jest.mock('../../utils/db', () => ({
  saveToHistory: jest.fn(),
  getLatestTweets: jest.fn().mockResolvedValue([]),
}));

describe('Tweet Workflow End-to-End', () => {
  let agent: GameAgent;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Set up the agent
    agent = new GameAgent({
      apiKey: 'test-api-key',
      mapId: 'test-map',
    });
    
    // Manually set the gameClient (since we're testing without initialization)
    (agent as any).gameClient = new (require('../../game/client').GameClient)();
    (agent as any).agentId = 'test-agent';
  });
  
  it('should process a tweet workflow end-to-end', async () => {
    // Set up the tweet worker
    const worker = tweetWorker;
    worker.gameClient = (agent as any).gameClient;
    
    // Execute the workflow
    const result = await worker.execute({
      function: 'postTweet',
      arguments: {
        content: 'Testing the tweet workflow',
        inReplyTo: null,
      },
      context: {
        userId: 'user123',
        conversationId: 'conv456',
      },
    });
    
    // Verify the result
    expect(result.status).toBe('success');
    expect(result.output).toEqual({
      tweetId: 'tweet-123',
      content: 'This is a mock tweet response #test',
    });
    
    // Verify the Twitter API was called
    const { postTweet } = require('../../utils/twitter');
    expect(postTweet).toHaveBeenCalledWith(
      expect.stringContaining('mock tweet response'),
      null
    );
    
    // Verify history was saved
    const { saveToHistory } = require('../../utils/db');
    expect(saveToHistory).toHaveBeenCalled();
  });
  
  it('should handle API errors gracefully', async () => {
    // Override the mock to simulate an error
    const { postTweet } = require('../../utils/twitter');
    postTweet.mockRejectedValueOnce(new Error('Twitter API Error'));
    
    // Set up the tweet worker
    const worker = tweetWorker;
    worker.gameClient = (agent as any).gameClient;
    
    // Execute the workflow
    const result = await worker.execute({
      function: 'postTweet',
      arguments: {
        content: 'Testing the tweet workflow with error',
        inReplyTo: null,
      },
      context: {
        userId: 'user123',
        conversationId: 'conv456',
      },
    });
    
    // Verify the result indicates an error
    expect(result.status).toBe('error');
    expect(result.error).toContain('Twitter API Error');
  });
}); 