import express from 'express';

let lastActivityTimestamp = Date.now();

function updateActivityTimestamp() {
  lastActivityTimestamp = Date.now();
}

export function setupHealthCheck(app: express.Application) {
  app.get('/health', (req, res) => {
    const timeSinceLastActivity = Date.now() - lastActivityTimestamp;
    const isHealthy = timeSinceLastActivity < 5 * 60 * 1000; // 5 minutes

    res.status(isHealthy ? 200 : 503).json({
      status: isHealthy ? 'healthy' : 'unhealthy',
      lastActivity: new Date(lastActivityTimestamp).toISOString(),
      timeSinceLastActivity: `${Math.round(timeSinceLastActivity / 1000)}s`
    });
  });

  return updateActivityTimestamp;
}