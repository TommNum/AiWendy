import http from 'http';
import { dbLogger } from './utils/dbLogger';

// Create a simple HTTP server for health checks
const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    // Return a 200 OK status for the health check
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'healthy', timestamp: new Date().toISOString() }));
    
    // Log the health check (but not too frequently to avoid log spam)
    if (Math.random() < 0.1) { // Log only about 10% of health checks
      dbLogger.info('Health check endpoint accessed', 'healthcheck');
    }
  } else {
    // For any other path, return 404
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  }
});

// Start the server on port 8080 (or use the PORT environment variable)
const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`Health check server running on port ${PORT}`);
  dbLogger.info(`Health check server running on port ${PORT}`, 'healthcheck');
});

export { server }; 