import express, { Request, Response, RequestHandler } from 'express';
import http, { IncomingMessage, ServerResponse } from 'http';
import { AsyncLocalStorage } from 'async_hooks';
import { v4 as uuidv4 } from 'uuid';
import { logInfo, logError, getCorrelationId, setCorrelationId, generateCorrelationId } from './utils/dbLogger';
import { Pool } from 'pg';
import os from 'os';

// Define the MetricsTracker interface
interface MetricsTracker {
  recordMetric(name: string, value: number): void;
  recordOutcome(name: string, outcome: string): void;
  getAllMetricNames(): string[];
  getAllMetrics(): Record<string, any>;
  getRecentValues(metricName: string, count: number): Array<{timestamp: number, value: any}>;
}

// Define the MetricsStats interface
interface MetricsStats {
  [key: string]: {
    name: string;
    count: number;
    sum: number;
    avg: number;
    min: number;
    max: number;
    stddev: number;
    p50: number;
    p90: number;
    p99: number;
    recent?: {
      labels: string[];
      values: number[];
    };
  };
}

// Create a mock metrics object in case the real one fails to load
let metrics: MetricsTracker = {
  recordMetric: (name: string, value: number) => {
    console.log(`[MOCK METRICS] Recording metric ${name}: ${value}`);
  },
  recordOutcome: (name: string, outcome: string) => {
    console.log(`[MOCK METRICS] Recording outcome ${name}: ${outcome}`);
  },
  getAllMetricNames: () => [],
  getAllMetrics: () => ({}),
  getRecentValues: (metricName: string, count: number) => []
};

// Try to load the real metrics module
try {
  const metricsModule = require('./utils/metrics');
  metrics = metricsModule.metrics;
} catch (err) {
  console.error('Failed to load metrics module, using mock:', err);
}

// Create Express app for the main API
const app = express();
const port = process.env.HEALTH_PORT || 8084;

// Add middleware to track response time and add correlation ID
app.use((req, res, next) => {
  // Generate a correlation ID for this request
  const correlationId = generateCorrelationId();
  setCorrelationId(correlationId);
  
  // Add correlation ID to response headers
  res.setHeader('X-Correlation-ID', correlationId);
  
  // Track request start time
  const start = Date.now();
  
  // Override end method to log response time
  const originalEnd = res.end;
  res.end = function(this: any, chunk: any, encoding?: BufferEncoding, callback?: () => void) {
    // Calculate response time
    const responseTime = Date.now() - start;
    
    // Log the request with response time
    logInfo(`${req.method} ${req.url} ${res.statusCode} ${responseTime}ms`);
    
    // Record response time metric
    metrics.recordMetric('api.response_time', responseTime);
    
    // Call the original end method with proper type handling
    return originalEnd.call(this, chunk, encoding as BufferEncoding, callback);
  } as any;
  
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  const stats = getMetricsStats();
  
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    correlationId: getCorrelationId(),
    stats
  });
});

// System info endpoint
app.get('/system', async (req, res) => {
  const memoryUsage = process.memoryUsage();
  const systemInfo = {
    hostname: os.hostname(),
    platform: process.platform,
    arch: process.arch,
    cpus: os.cpus().length,
    memory: {
      total: os.totalmem(),
      free: os.freemem(),
      process: {
        rss: memoryUsage.rss,
        heapTotal: memoryUsage.heapTotal,
        heapUsed: memoryUsage.heapUsed,
        external: memoryUsage.external
      }
    },
    uptime: {
      system: os.uptime(),
      process: process.uptime()
    },
    loadavg: os.loadavg()
  };
  
  res.status(200).json(systemInfo);
});

// Database health check
app.get('/db/health', (async (req, res) => {
  if (!process.env.DATABASE_URL) {
    return res.status(200).json({
      status: 'not_configured',
      message: 'Database URL not configured'
    });
  }
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 5000
  });
  
  try {
    const startTime = Date.now();
    const result = await pool.query('SELECT NOW()');
    const duration = Date.now() - startTime;
    
    await pool.end();
    
    res.status(200).json({
      status: 'ok',
      timestamp: result.rows[0].now,
      duration_ms: duration
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error instanceof Error ? error.message : String(error)
    });
  }
}) as RequestHandler);

// Metrics endpoint
app.get('/metrics', (req, res) => {
  const stats = getMetricsStats();
  
  res.status(200).json({
    metrics: stats,
    timestamp: new Date().toISOString()
  });
});

// Dashboard endpoint with metrics visualization
app.get('/dashboard', (req, res) => {
  const metricStats = getMetricsStats();
  const metricNames = Object.keys(metricStats);
  
  let html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Health Dashboard</title>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif; margin: 0; padding: 20px; color: #333; }
        h1, h2, h3 { margin-top: 20px; }
        .stat-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 10px; margin: 15px 0; }
        .stat-box { background: #f5f5f5; border-radius: 5px; padding: 10px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        .stat-title { font-size: 0.8em; color: #666; }
        .stat-value { font-size: 1.4em; font-weight: bold; margin-top: 5px; }
        .metric { background: white; border-radius: 8px; padding: 15px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .chart-container { height: 200px; margin-top: 15px; }
        .system-info { display: flex; flex-wrap: wrap; gap: 15px; margin-bottom: 20px; }
        .system-info div { background: #e9f5ff; padding: 10px 15px; border-radius: 5px; }
      </style>
    </head>
    <body>
      <h1>System Health Dashboard</h1>
      
      <div class="system-info">
        <div>Uptime: ${(process.uptime() / 60).toFixed(2)} minutes</div>
        <div>Memory: ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB</div>
        <div>Node Version: ${process.version}</div>
        <div>Environment: ${process.env.NODE_ENV || 'development'}</div>
      </div>
      
      <h2>Performance Metrics</h2>
  `;
  
  // Add metrics sections
  for (const name of metricNames) {
    const metric = metricStats[name];
    if (!metric) continue;
    
    html += `
      <div class="metric">
        <h3>${name}</h3>
        
        <div class="stat-grid">
          <div class="stat-box">
            <div class="stat-title">Count</div>
            <div class="stat-value">${metric.count.toLocaleString()}</div>
          </div>
          <div class="stat-box">
            <div class="stat-title">Average</div>
            <div class="stat-value">${metric.avg.toFixed(2)}</div>
          </div>
          <div class="stat-box">
            <div class="stat-title">Min</div>
            <div class="stat-value">${metric.min.toFixed(2)}</div>
          </div>
          <div class="stat-box">
            <div class="stat-title">Max</div>
            <div class="stat-value">${metric.max.toFixed(2)}</div>
          </div>
          <div class="stat-box">
            <div class="stat-title">P90</div>
            <div class="stat-value">${metric.p90.toFixed(2)}</div>
          </div>
        </div>
        
        ${metric.recent ? `
          <div class="chart-container">
            <canvas id="chart-${name}"></canvas>
          </div>
        ` : ''}
      </div>
    `;
  }
  
  html += `
      <script>
        // Create charts for metrics
        function createCharts() {
  `;
  
  // Add chart initialization for each metric
  for (const name of metricNames) {
    const metric = metricStats[name];
    if (!metric.recent) continue;
    
    html += `
        new Chart(document.getElementById('chart-${name}'), {
          type: 'line',
          data: {
            labels: ${JSON.stringify(metric.recent.labels)},
            datasets: [{
              label: '${name}',
              data: ${JSON.stringify(metric.recent.values)},
              borderColor: '#3e95cd',
              tension: 0.1,
              fill: false
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              y: {
                beginAtZero: false
              }
            }
          }
        });
    `;
  }
  
  html += `
        }
        
        // Initialize charts when page loads
        window.onload = createCharts;
      </script>
    </body>
    </html>
  `;
  
  res.setHeader('Content-Type', 'text/html');
  res.send(html);
});

// Logs endpoint
app.get('/logs', async (req, res) => {
  try {
    const level = req.query.level as string | undefined;
    const source = req.query.source as string | undefined;
    const limit = parseInt(req.query.limit as string || '100', 10);
    
    // Create a connection pool
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
    
    let query = 'SELECT * FROM logs';
    const params: any[] = [];
    
    if (level || source) {
      query += ' WHERE';
      
      if (level) {
        query += ' level = $1';
        params.push(level);
      }
      
      if (source) {
        if (level) {
          query += ' AND';
        }
        query += ' source = $' + (params.length + 1);
        params.push(source);
      }
    }
    
    query += ' ORDER BY timestamp DESC LIMIT $' + (params.length + 1);
    params.push(limit);
    
    const result = await pool.query(query, params);
    await pool.end();
    
    res.status(200).json({
      logs: result.rows
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

// Start the server
try {
  app.listen(port, () => {
    console.log(`🚀 Health check server running on port ${port}`);
    logInfo(`Health check server started on port ${port}`, 'system');
  });
} catch (error) {
  console.error('❌ Failed to start health check server:', error);
  logError(`Failed to start health check server: ${error}`, 'system');
}

// Function to get metrics stats
function getMetricsStats(): MetricsStats {
  const stats: MetricsStats = {};
  
  try {
    // Get all metric names
    const metricNames = metrics.getAllMetricNames();
    
    // Get all metrics data
    const allMetrics = metrics.getAllMetrics();
    
    // Process each metric name
    for (const name of metricNames) {
      const metric = allMetrics[name];
      
      if (!metric) continue;
      
      stats[name] = {
        name,
        count: metric.count || 0,
        sum: metric.sum || 0,
        avg: metric.avg || 0,
        min: metric.min || 0,
        max: metric.max || 0,
        stddev: metric.stddev || 0,
        p50: metric.p50 || 0,
        p90: metric.p90 || 0,
        p99: metric.p99 || 0
      };
      
      // Add recent values if available
      if (metric.count > 0) {
        const recentValues = metrics.getRecentValues(name, 50);
        
        if (recentValues && recentValues.length > 0) {
          const labels = recentValues.map((v: {timestamp: number}) => {
            const date = new Date(v.timestamp);
            return `${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}`;
          });
          
          const values = recentValues.map((v: {value: number}) => v.value);
          
          stats[name].recent = {
            labels,
            values
          };
        }
      }
    }
  } catch (err) {
    logError(`Failed to get metrics stats: ${err}`);
  }
  
  return stats;
}

// Create a simple HTTP server for health checks
const server = http.createServer((req: IncomingMessage, res: ServerResponse) => {
  if (req.url === '/health') {
    // Return 200 OK for health checks
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    
    const response = {
      status: 'ok',
      timestamp: new Date().toISOString()
    };
    
    res.end(JSON.stringify(response));
    
    // Log health check access (approximately 10% of the time)
    if (Math.random() < 0.1) {
      logInfo('Health check accessed');
    }
  } else {
    // Return 404 for any other path
    res.statusCode = 404;
    res.end();
  }
});

// Start the health check server
const HEALTH_PORT = process.env.HEALTH_PORT || 8084;
server.listen(HEALTH_PORT, () => {
  console.log(`Health check server is running on port ${HEALTH_PORT}`);
});

export { server }; 