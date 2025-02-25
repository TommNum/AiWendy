import { Request, Response, Express } from 'express';

let lastActivityTimestamp = Date.now();

function updateActivityTimestamp() {
  lastActivityTimestamp = Date.now();
}

export function setupHealthCheck(app: Express) {
  app.get('/health', (req: Request, res: Response) => {
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