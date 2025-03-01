import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { withRetry } from '../utils/retry';

/**
 * Configuration for the Game Client
 */
export interface GameClientConfig {
  /** API key for authentication */
  apiKey: string;
  
  /** Base URL for the API */
  baseUrl: string;
  
  /** Timeout in milliseconds (default: 30000) */
  timeout?: number;
  
  /** Optional axios instance for testing */
  httpClient?: AxiosInstance;
}

/**
 * Task parameters
 */
export interface TaskParams {
  /** Agent ID */
  agentId: string;
  
  /** Task prompt */
  prompt: string;
  
  /** Optional context data */
  context?: Record<string, any>;
}

/**
 * Task response
 */
export interface TaskResponse {
  /** Task ID */
  taskId: string;
  
  /** Task status */
  status: string;
  
  /** Optional task result */
  result?: any;
}

/**
 * Client for interacting with the Game Protocol API
 */
export class GameClient {
  private client: AxiosInstance;
  private config: GameClientConfig;
  
  /**
   * Create a new GameClient
   * @param config Client configuration
   */
  constructor(config: GameClientConfig) {
    this.config = {
      ...config,
      timeout: config.timeout || 30000,
    };
    
    // Use provided client or create a new one
    this.client = config.httpClient || axios.create({
      baseURL: this.config.baseUrl,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
    });
  }
  
  /**
   * Set a new task for an agent
   * @param params Task parameters
   * @returns Task response
   */
  async setTask(params: TaskParams): Promise<TaskResponse> {
    try {
      const response = await this.client.post('/tasks', params);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to set task: ${error.message}`);
    }
  }
  
  /**
   * Get the result of a task
   * @param taskId Task ID
   * @returns Task response
   */
  async getTaskResult(taskId: string): Promise<TaskResponse> {
    try {
      const response = await this.client.get(`/tasks/${taskId}`);
      return response.data;
    } catch (error) {
      // Handle specific error cases
      if (error.response && error.response.status === 404) {
        throw new Error('Task not found');
      }
      
      throw new Error(`Failed to get task result: ${error.message}`);
    }
  }
} 