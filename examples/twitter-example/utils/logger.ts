// Create src/utils/logger.ts
export class QuantumLogger {
    static log(msg: string, level: 'info' | 'error' | 'warning' = 'info') {
      const timestamp = new Date().toISOString();
      console.log(`⌛ [${timestamp}] [${level.toUpperCase()}] ${msg.toLowerCase()}`);
    }
  }