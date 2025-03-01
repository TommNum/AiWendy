import { dbLogger } from './dbLogger';

/**
 * Options for retry operations
 */
export interface RetryOptions {
  /** Maximum number of retry attempts (default: 3) */
  maxRetries?: number;
  
  /** Initial delay in milliseconds (default: 1000) */
  initialDelayMs?: number;
  
  /** Maximum delay in milliseconds (default: 30000) */
  maxDelayMs?: number;
  
  /** Backoff factor - how much to multiply delay by each time (default: 2) */
  backoffFactor?: number;
  
  /** Optional jitter factor to add randomness to delays (0-1, default: 0.1) */
  jitterFactor?: number;
  
  /** Logger tag for the operation */
  loggerTag?: string;
  
  /** Function to determine if an error is retryable (default: all errors) */
  isRetryable?: (error: any) => boolean;
}

/**
 * Default function to determine if an error is retryable
 * @param error The error to check
 * @returns true if the error is likely retryable (network or 5xx errors)
 */
export function defaultIsRetryable(error: any): boolean {
  // Network errors
  if (error.code === 'ECONNRESET' || 
      error.code === 'ETIMEDOUT' || 
      error.code === 'ECONNABORTED' ||
      error.code === 'ENETUNREACH' ||
      error.code === 'ENOTFOUND') {
    return true;
  }
  
  // Check status code for server errors
  const statusCode = error.status || error.statusCode || (error.response?.status);
  if (statusCode) {
    // Server errors (5xx) and certain client errors (429)
    return statusCode === 429 || (statusCode >= 500 && statusCode < 600);
  }
  
  // If no clear indicators, default to retryable to be safe
  return true;
}

/**
 * Calculate the delay for the next retry attempt using exponential backoff with jitter
 * 
 * @param attempt The current retry attempt number
 * @param initialDelayMs The initial delay in milliseconds
 * @param maxDelayMs The maximum delay in milliseconds
 * @param backoffFactor The factor to multiply the delay by each time
 * @param jitterFactor The amount of randomness to add (0-1)
 * @returns The calculated delay in milliseconds
 */
export function calculateDelay(
  attempt: number, 
  initialDelayMs: number, 
  maxDelayMs: number, 
  backoffFactor: number, 
  jitterFactor: number = 0
): number {
  // Calculate base delay with exponential backoff
  const baseDelay = Math.min(
    initialDelayMs * Math.pow(backoffFactor, attempt - 1),
    maxDelayMs
  );
  
  // Add jitter - random factor between 0 and jitterFactor
  const jitter = jitterFactor > 0 
    ? baseDelay * jitterFactor * Math.random()
    : 0;
    
  return baseDelay + jitter;
}

/**
 * Internal helper for calculating delay with options object
 */
function calculateDelayWithOptions(attempt: number, options: Required<RetryOptions>): number {
  return calculateDelay(
    attempt,
    options.initialDelayMs,
    options.maxDelayMs,
    options.backoffFactor,
    options.jitterFactor
  );
}

/**
 * Wrapper function that implements retry logic with exponential backoff
 * 
 * @param operation The async function to retry
 * @param options Retry configuration options
 * @returns The result of the operation if successful
 * @throws The last error encountered if all retries fail
 */
export async function withRetry<T>(
  operation: () => Promise<T>, 
  options: RetryOptions = {}
): Promise<T> {
  // Set default options
  const resolvedOptions: Required<RetryOptions> = {
    maxRetries: options.maxRetries ?? 3,
    initialDelayMs: options.initialDelayMs ?? 1000,
    maxDelayMs: options.maxDelayMs ?? 30000,
    backoffFactor: options.backoffFactor ?? 2,
    jitterFactor: options.jitterFactor ?? 0.1,
    loggerTag: options.loggerTag ?? 'retry',
    isRetryable: options.isRetryable ?? defaultIsRetryable
  };
  
  let lastError: any;
  
  // Try the operation
  try {
    const result = await operation();
    // Log success on first try
    dbLogger.info(
      `Operation succeeded on first attempt`,
      resolvedOptions.loggerTag
    );
    return result;
  } catch (error) {
    lastError = error;
    
    // If error is not retryable or max retries is 0, throw immediately
    if (!resolvedOptions.isRetryable(error) || resolvedOptions.maxRetries === 0) {
      dbLogger.error(
        `Non-retryable error: ${error instanceof Error ? error.message : String(error)}`,
        resolvedOptions.loggerTag
      );
      throw error;
    }
  }
  
  // Now handle retries
  for (let attempt = 1; attempt <= resolvedOptions.maxRetries; attempt++) {
    try {
      // Log retry attempt (but only once per attempt)
      if (attempt <= resolvedOptions.maxRetries) {
        dbLogger.warn(
          `Retry attempt ${attempt}/${resolvedOptions.maxRetries} for operation`, 
          resolvedOptions.loggerTag
        );
      }
      
      // Execute the operation
      const result = await operation();
      
      // Log success after retry
      dbLogger.info(
        `Operation succeeded after ${attempt} retries`,
        resolvedOptions.loggerTag
      );
      
      return result;
      
    } catch (error) {
      lastError = error;
      
      const isRetryable = resolvedOptions.isRetryable(error);
      const hasMoreAttempts = attempt < resolvedOptions.maxRetries;
      
      // Log the error
      if (!isRetryable) {
        dbLogger.error(
          `Non-retryable error: ${error instanceof Error ? error.message : String(error)}`,
          resolvedOptions.loggerTag
        );
        break; // Exit the retry loop for non-retryable errors
      } else if (hasMoreAttempts) {
        // Calculate delay for next retry
        const delayMs = calculateDelay(
          attempt + 1,
          resolvedOptions.initialDelayMs,
          resolvedOptions.maxDelayMs,
          resolvedOptions.backoffFactor,
          resolvedOptions.jitterFactor
        );
        
        // Don't log warns for the initial error since we would have already done that above
        // This ensures we only get the expected number of warn calls
        
        // Wait before next retry
        await new Promise(resolve => setTimeout(resolve, delayMs));
      } else {
        // Log final failure
        dbLogger.error(
          `Operation failed after ${resolvedOptions.maxRetries} retries. ` +
          `Final error: ${error instanceof Error ? error.message : String(error)}`,
          resolvedOptions.loggerTag
        );
      }
    }
  }
  
  // If we've exhausted all retries, throw the last error
  throw lastError;
} 