import winston from 'winston';
import path from 'path';

// Custom format for text generation logs
const textGenFormat = winston.format.printf(({ timestamp, level, message, ...metadata }) => {
  const meta = metadata.meta || {};
  return JSON.stringify({
    timestamp,
    level,
    message,
    ...meta
  }, null, 2);
});

export const contentLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.metadata({ fillWith: ['type', 'status', 'content', 'reasoning', 'tweetId'] }),
    textGenFormat
  ),
  transports: [
    // Separate file for text generation logs
    new winston.transports.File({ 
      filename: path.join(process.cwd(), 'logs', 'content-generation.log')
    }),
    // Console output in development
    ...(process.env.NODE_ENV !== 'production' ? [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.simple()
        )
      })
    ] : [])
  ]
});

export const logGeneratedContent = (content: string, reasoning: string, status: 'generated' | 'posted' | 'failed', tweetId?: string) => {
  contentLogger.info('Text Generation Event', {
    meta: {
      type: 'text_generation',
      status,
      content,
      reasoning,
      ...(tweetId && { tweetId })
    }
  });
}; 