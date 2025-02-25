import express from 'express';
import fs from 'fs';
import path from 'path';

export const setupMonitoring = (app: express.Application) => {
  app.get('/content-logs', (req, res) => {
    try {
      const logPath = path.join(process.cwd(), 'logs', 'content-generation.log');
      const logs = fs.readFileSync(logPath, 'utf8')
        .split('\n')
        .filter(Boolean)
        .map(line => JSON.parse(line))
        .slice(-50); // Get last 50 entries
        
      res.json({
        total: logs.length,
        logs: logs.map(log => ({
          timestamp: log.timestamp,
          content: log.meta.content,
          status: log.meta.status,
          tweetId: log.meta.tweetId
        }))
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch content logs' });
    }
  });
}; 