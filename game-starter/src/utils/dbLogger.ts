import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';

// Database connection
let pool: Pool | null = null;

// Fallback file logging when DB is not available
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}
const logFilePath = path.join(logsDir, 'app.log');

// Initialize the database connection
export async function initDbLogger(): Promise<void> {
  try {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false // Needed for Railway PostgreSQL
      }
    });
    
    // Create logs table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS logs (
        id SERIAL PRIMARY KEY,
        level VARCHAR(10) NOT NULL,
        message TEXT NOT NULL,
        timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
        source VARCHAR(100),
        additional_data JSONB
      )
    `);
    
    console.log('Database logger initialized successfully');
  } catch (error) {
    console.error('Failed to initialize database logger:', error);
    console.log('Falling back to file logging');
    pool = null;
  }
}

// Log to database or fall back to file
async function logToDb(
  level: string, 
  message: string, 
  source: string = 'app', 
  additionalData: Record<string, any> = {}
): Promise<void> {
  const timestamp = new Date().toISOString();
  const logMessage = `[${level.toUpperCase()}] ${timestamp} - ${message}`;
  
  try {
    if (pool) {
      await pool.query(
        'INSERT INTO logs(level, message, source, additional_data) VALUES($1, $2, $3, $4)',
        [level, message, source, JSON.stringify(additionalData)]
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