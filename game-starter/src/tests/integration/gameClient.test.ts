import { GameClient } from '../../game/client';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('GameClient Integration', () => {
  let gameClient: GameClient;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create a mock axios instance with the methods we need
    const mockAxiosInstance = {
      post: mockedAxios.post,
      get: mockedAxios.get,
      defaults: { headers: { common: {} } }
    };
    
    gameClient = new GameClient({
      apiKey: 'test-api-key',
      baseUrl: 'https://api.test.example',
      httpClient: mockAxiosInstance as any,
    });
  });
  
  describe('setTask', () => {
    it('should submit a task to the Game Protocol API', async () => {
      // Mock API response
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          taskId: 'task-123',
          status: 'processing',
        },
        status: 200,
      });
      
      const result = await gameClient.setTask({
        agentId: 'agent-abc',
        prompt: 'Test prompt',
        context: { test: true },
      });
      
      expect(result).toEqual({
        taskId: 'task-123',
        status: 'processing',
      });
      
      // Verify API call
      expect(mockedAxios.post).toHaveBeenCalledWith(
        '/tasks',
        {
          agentId: 'agent-abc',
          prompt: 'Test prompt',
          context: { test: true },
        }
      );
    });
    
    it('should handle API errors gracefully', async () => {
      // Mock API error
      const apiError = new Error('API Error');
      (apiError as any).response = {
        status: 500,
        data: { error: 'Internal Server Error' },
      };
      mockedAxios.post.mockRejectedValueOnce(apiError);
      
      await expect(gameClient.setTask({
        agentId: 'agent-abc',
        prompt: 'Test prompt',
      })).rejects.toThrow('Failed to set task: API Error');
    });
  });
  
  describe('getTaskResult', () => {
    it('should fetch task results from the Game Protocol API', async () => {
      // Mock API response
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          taskId: 'task-123',
          status: 'completed',
          result: 'Task completed successfully',
        },
        status: 200,
      });
      
      const result = await gameClient.getTaskResult('task-123');
      
      expect(result).toEqual({
        taskId: 'task-123',
        status: 'completed',
        result: 'Task completed successfully',
      });
      
      // Verify API call
      expect(mockedAxios.get).toHaveBeenCalledWith('/tasks/task-123');
    });
    
    it('should handle task not found errors', async () => {
      // Mock API error
      const apiError = new Error('Not Found');
      (apiError as any).response = {
        status: 404,
        data: { error: 'Task not found' },
      };
      mockedAxios.get.mockRejectedValueOnce(apiError);
      
      await expect(gameClient.getTaskResult('invalid-task')).rejects.toThrow('Task not found');
    });
  });
}); 