import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import { AsyncLocalStorage } from 'async_hooks';

// Create AsyncLocalStorage for correlation ID tracking
const correlationIdStorage = new AsyncLocalStorage<string>();

// Database connection
let pool: Pool | null = null;

// Fallback file logging when DB is not available
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}
const logFilePath = path.join(logsDir, 'app.log');

// Initialize the database connection
export async function initDbLogger(retries = 5, delay = 2000): Promise<void> {
  let attempt = 0;
  
  while (attempt < retries) {
    try {
      console.log(`Attempting database connection (attempt ${attempt + 1}/${retries})...`);
      
      pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: {
          rejectUnauthorized: false // Needed for Railway PostgreSQL
        }
      });
      
      // Test the connection
      await pool.query('SELECT NOW()');
      
      // Create logs table if it doesn't exist
      await pool.query(`
        CREATE TABLE IF NOT EXISTS logs (
          id SERIAL PRIMARY KEY,
          level VARCHAR(10) NOT NULL,
          message TEXT NOT NULL,
          timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
          source VARCHAR(100),
          correlation_id VARCHAR(100),
          additional_data JSONB
        )
      `);
      
      console.log('Database logger initialized successfully');
      return;
      
    } catch (error) {
      console.error(`Database connection attempt ${attempt + 1} failed:`, error);
      
      if (attempt === retries - 1) {
        console.error('All database connection attempts failed, falling back to file logging');
        pool = null;
        return;
      }
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
      attempt++;
    }
  }
}

/**
 * Get the current correlation ID from the AsyncLocalStorage
 * @returns The current correlation ID or undefined if not set
 */
export function getCorrelationId(): string | undefined {
  return correlationIdStorage.getStore();
}

/**
 * Set the correlation ID for the current execution context
 */
export function setCorrelationId<T>(correlationId: string, callback?: () => T): T | void {
  if (callback) {
    return correlationIdStorage.run(correlationId, callback);
  } else {
    correlationIdStorage.enterWith(correlationId);
    return;
  }
}

/**
 * Generate a new random correlation ID
 * @returns A newly generated correlation ID
 */
export function generateCorrelationId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}

// Log to database or fall back to file
async function logToDb(
  level: string, 
  message: string, 
  source: string = 'app', 
  additionalData: Record<string, any> = {}
): Promise<void> {
  const timestamp = new Date().toISOString();
  const correlationId = getCorrelationId();
  const logMessage = `[${level.toUpperCase()}] ${timestamp} ${correlationId ? `[${correlationId}]` : ''} - ${message}`;
  
  try {
    if (pool) {
      await pool.query(
        'INSERT INTO logs(level, message, source, correlation_id, additional_data) VALUES($1, $2, $3, $4, $5)',
        [level, message, source, correlationId, JSON.stringify(additionalData)]
      );
    } else {
      // Fallback to file logging
      fs.appendFileSync(logFilePath, logMessage + '\n');
      console.log(logMessage);
    }
  } catch (error) {
    // If database logging fails, fall back to file
    fs.appendFileSync(logFilePath, logMessage + '\n');
    console.log(logMessage);
    console.error('Error writing to database log:', error);
  }
}

// Logger implementation
export const dbLogger = {
  info: (message: string, source: string = 'app', additionalData: Record<string, any> = {}): void => {
    logToDb('info', message, source, additionalData);
  },
  
  error: (message: string, source: string = 'app', additionalData: Record<string, any> = {}): void => {
    logToDb('error', message, source, additionalData);
    console.error(`[ERROR] - ${message}`);
  },
  
  warn: (message: string, source: string = 'app', additionalData: Record<string, any> = {}): void => {
    logToDb('warn', message, source, additionalData);
    console.warn(`[WARN] - ${message}`);
  },
  
  debug: (message: string, source: string = 'app', additionalData: Record<string, any> = {}): void => {
    if (process.env.DEBUG === 'true') {
      logToDb('debug', message, source, additionalData);
      console.debug(`[DEBUG] - ${message}`);
    }
  }
};

/**
 * Simple wrapper for logging info messages
 */
export function logInfo(message: string, category: string = 'general', metadata: Record<string, any> = {}): void {
  dbLogger.info(message, category, metadata);
}

/**
 * Simple wrapper for logging error messages
 */
export function logError(message: string, category: string = 'error', metadata: Record<string, any> = {}): void {
  dbLogger.error(message, category, metadata);
}

/**
 * Simple wrapper for logging warning messages
 */
export function logWarning(message: string, category: string = 'warning', metadata: Record<string, any> = {}): void {
  dbLogger.warn(message, category, metadata);
}

/**
 * Simple wrapper for logging debug messages
 */
export function logDebug(message: string, category: string = 'debug', metadata: Record<string, any> = {}): void {
  dbLogger.debug(message, category, metadata);
} 