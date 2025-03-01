import { withRetry, calculateDelay, defaultIsRetryable } from '../../utils/retry';
import { dbLogger } from '../../utils/dbLogger';

// Mock the dbLogger
jest.mock('../../utils/dbLogger', () => ({
  dbLogger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('Retry Utility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('calculateDelay', () => {
    it('should calculate exponential backoff', () => {
      expect(calculateDelay(1, 100, 10000, 2, 0)).toBe(100);
      expect(calculateDelay(2, 100, 10000, 2, 0)).toBe(200);
      expect(calculateDelay(3, 100, 10000, 2, 0)).toBe(400);
    });

    it('should not exceed maxDelay', () => {
      expect(calculateDelay(10, 100, 1000, 2, 0)).toBe(1000);
    });

    it('should apply jitter correctly', () => {
      // With 50% jitter, values should be between base±(base*0.5)
      const delay = calculateDelay(2, 100, 10000, 2, 0.5);
      expect(delay).toBeGreaterThanOrEqual(100);
      expect(delay).toBeLessThanOrEqual(300);
    });
  });

  describe('defaultIsRetryable', () => {
    it('should retry on network errors', () => {
      const networkError = new Error('network error');
      networkError.code = 'ECONNRESET';
      expect(defaultIsRetryable(networkError)).toBe(true);
    });

    it('should retry on rate limit errors', () => {
      const rateLimitError = new Error('rate limit');
      rateLimitError.name = 'AxiosError';
      (rateLimitError as any).response = { status: 429 };
      expect(defaultIsRetryable(rateLimitError)).toBe(true);
    });

    it('should not retry on client errors', () => {
      const clientError = new Error('client error');
      clientError.name = 'AxiosError';
      (clientError as any).response = { status: 400 };
      expect(defaultIsRetryable(clientError)).toBe(false);
    });
  });

  describe('withRetry', () => {
    it('should return the result if operation succeeds on first try', async () => {
      const operation = jest.fn().mockResolvedValue('success');
      
      const result = await withRetry(operation);
      
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
      expect(dbLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Operation succeeded'),
        expect.anything()
      );
    });

    it('should retry and eventually succeed', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('failure 1'))
        .mockRejectedValueOnce(new Error('failure 2'))
        .mockResolvedValue('success');
      
      const result = await withRetry(operation, {
        maxRetries: 3,
        initialDelayMs: 10,
        backoffFactor: 1,
      });
      
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(3);
      expect(dbLogger.warn).toHaveBeenCalledTimes(2);
      expect(dbLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Operation succeeded after 2 retries'),
        expect.anything()
      );
    });

    it('should give up after max retries', async () => {
      const error = new Error('persistent failure');
      const operation = jest.fn().mockRejectedValue(error);
      
      await expect(withRetry(operation, {
        maxRetries: 2,
        initialDelayMs: 10,
        backoffFactor: 1,
      })).rejects.toThrow('persistent failure');
      
      expect(operation).toHaveBeenCalledTimes(3); // Initial + 2 retries
      expect(dbLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Operation failed after 2 retries'),
        expect.anything()
      );
    });

    it('should not retry if error is not retryable', async () => {
      const error = new Error('not retryable');
      const operation = jest.fn().mockRejectedValue(error);
      
      await expect(withRetry(operation, {
        maxRetries: 3,
        initialDelayMs: 10,
        isRetryable: () => false,
      })).rejects.toThrow('not retryable');
      
      expect(operation).toHaveBeenCalledTimes(1);
      expect(dbLogger.info).not.toHaveBeenCalled();
    });
  });
}); 