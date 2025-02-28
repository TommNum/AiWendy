import fs from 'fs';
import path from 'path';

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Log file path
const logFilePath = path.join(logsDir, 'app.log');

// Simple logger implementation
export const logger = {
  info: (message: string): void => {
    const timestamp = new Date().toISOString();
    const logMessage = `[INFO] ${timestamp} - ${message}`;
    console.log(logMessage);
    fs.appendFileSync(logFilePath, logMessage + '\n');
  },
  
  error: (message: string): void => {
    const timestamp = new Date().toISOString();
    const logMessage = `[ERROR] ${timestamp} - ${message}`;
    console.error(logMessage);
    fs.appendFileSync(logFilePath, logMessage + '\n');
  },
  
  warn: (message: string): void => {
    const timestamp = new Date().toISOString();
    const logMessage = `[WARN] ${timestamp} - ${message}`;
    console.warn(logMessage);
    fs.appendFileSync(logFilePath, logMessage + '\n');
  },
  
  debug: (message: string): void => {
    if (process.env.DEBUG === 'true') {
      const timestamp = new Date().toISOString();
      const logMessage = `[DEBUG] ${timestamp} - ${message}`;
      console.debug(logMessage);
      fs.appendFileSync(logFilePath, logMessage + '\n');
    }
  }
};

// Default log function for compatibility with existing code
export default function log(message: string): void {
  logger.info(message);
} 