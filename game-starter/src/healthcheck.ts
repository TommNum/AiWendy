import express from 'express';
import { metrics } from './utils/metrics';
import { dbLogger, getCorrelationId, setCorrelationId } from './utils/dbLogger';
import { Pool } from 'pg';
import os from 'os';

// Create the Express app
const app = express();
const port = process.env.HEALTH_PORT || 8080;

// Add correlation ID middleware
app.use((req, res, next) => {
  // Generate a correlation ID for each request or use the one provided
  const correlationId = req.headers['x-correlation-id'] as string || setCorrelationId();
  
  // Add correlation ID to response headers
  res.setHeader('X-Correlation-ID', correlationId);
  
  // Track request start time for performance measurement
  const requestStartTime = Date.now();
  
  // Override end function to log response time
  const originalEnd = res.end;
  res.end = function(...args: any[]) {
    const responseTime = Date.now() - requestStartTime;
    metrics.recordMetric('http_request_duration_ms', responseTime);
    metrics.recordOutcome('http_request', res.statusCode < 400);
    
    // Log request
    dbLogger.info(
      `${req.method} ${req.originalUrl} ${res.statusCode} ${responseTime}ms`,
      'http',
      { method: req.method, url: req.originalUrl, statusCode: res.statusCode, responseTime }
    );
    
    return originalEnd.apply(this, args);
  };
  
  next();
});

// Basic health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    correlationId: getCorrelationId()
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
app.get('/db/health', async (req, res) => {
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
});

// Metrics endpoint
app.get('/metrics', (req, res) => {
  const metricNames = metrics.getAllMetricNames();
  const stats = {};
  
  for (const name of metricNames) {
    stats[name] = metrics.getMetricStats(name);
  }
  
  res.status(200).json({
    metrics: stats,
    timestamp: new Date().toISOString()
  });
});

// Dashboard HTML
app.get('/dashboard', (req, res) => {
  res.setHeader('Content-Type', 'text/html');
  
  const metricNames = metrics.getAllMetricNames();
  const allMetrics = metrics.getAllMetrics();
  
  // Simple HTML dashboard
  let html = `
  <!DOCTYPE html>
  <html>
  <head>
    <title>AiWendy System Dashboard</title>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
      body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
      .container { max-width: 1200px; margin: 0 auto; }
      h1, h2 { color: #333; }
      .card { background: white; border-radius: 5px; padding: 20px; margin-bottom: 20px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
      .metric { margin-bottom: 30px; }
      .stat-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 10px; margin-top: 10px; }
      .stat-box { background: #f0f8ff; padding: 10px; border-radius: 4px; }
      .stat-title { font-weight: bold; font-size: 0.9em; color: #555; }
      .stat-value { font-size: 1.2em; margin-top: 5px; }
      .tabs { display: flex; margin-bottom: 20px; }
      .tab { padding: 10px 20px; cursor: pointer; border: 1px solid #ddd; background: #f5f5f5; }
      .tab.active { background: white; border-bottom: none; }
      .tab-content { display: none; }
      .tab-content.active { display: block; }
      .header { display: flex; justify-content: space-between; align-items: center; }
      .refresh-btn { padding: 8px 15px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer; }
      .chart-container { height: 200px; margin-top: 20px; }
    </style>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>AiWendy System Dashboard</h1>
        <button class="refresh-btn" onclick="location.reload()">Refresh</button>
      </div>
      
      <div class="tabs">
        <div class="tab active" onclick="showTab('metrics')">Metrics</div>
        <div class="tab" onclick="showTab('system')">System</div>
        <div class="tab" onclick="showTab('logs')">Logs</div>
      </div>
      
      <div id="metrics" class="tab-content active">
        <div class="card">
          <h2>Performance Metrics</h2>
  `;
  
  // Add metrics sections
  for (const metric of allMetrics) {
    const stats = metrics.getMetricStats(metric.name);
    if (!stats) continue;
    
    html += `
      <div class="metric">
        <h3>${metric.name}</h3>
        <p>${metric.description || 'No description'} (${metric.unit})</p>
        
        <div class="stat-grid">
          <div class="stat-box">
            <div class="stat-title">Count</div>
            <div class="stat-value">${stats.count.toLocaleString()}</div>
          </div>
          <div class="stat-box">
            <div class="stat-title">Average</div>
            <div class="stat-value">${stats.avg.toFixed(2)}</div>
          </div>
          <div class="stat-box">
            <div class="stat-title">Min</div>
            <div class="stat-value">${stats.min.toFixed(2)}</div>
          </div>
          <div class="stat-box">
            <div class="stat-title">Max</div>
            <div class="stat-value">${stats.max.toFixed(2)}</div>
          </div>
          <div class="stat-box">
            <div class="stat-title">Median</div>
            <div class="stat-value">${stats.median.toFixed(2)}</div>
          </div>
          <div class="stat-box">
            <div class="stat-title">95th Percentile</div>
            <div class="stat-value">${stats.p95.toFixed(2)}</div>
          </div>
        </div>
        
        <div class="chart-container">
          <canvas id="chart-${metric.name}"></canvas>
        </div>
      </div>
    `;
  }
  
  html += `
        </div>
      </div>
      
      <div id="system" class="tab-content">
        <div class="card">
          <h2>System Information</h2>
          <div id="system-info">Loading...</div>
        </div>
      </div>
      
      <div id="logs" class="tab-content">
        <div class="card">
          <h2>Recent Logs</h2>
          <div id="logs-container">Loading...</div>
        </div>
      </div>
    </div>
    
    <script>
      // Tab switching
      function showTab(tabId) {
        // Hide all tabs
        document.querySelectorAll('.tab-content').forEach(tab => {
          tab.classList.remove('active');
        });
        
        // Deactivate all tab buttons
        document.querySelectorAll('.tab').forEach(tab => {
          tab.classList.remove('active');
        });
        
        // Show selected tab
        document.getElementById(tabId).classList.add('active');
        
        // Activate tab button
        document.querySelector('.tab[onclick="showTab(\\'' + tabId + '\\')"]').classList.add('active');
        
        // Load data for the tab
        if (tabId === 'system') {
          loadSystemInfo();
        } else if (tabId === 'logs') {
          loadLogs();
        }
      }
      
      // Create charts for metrics
      function createCharts() {
  `;
  
  // Add chart initialization for each metric
  for (const metric of allMetrics) {
    const recentValues = metrics.getRecentValues(metric.name, 50);
    if (recentValues.length === 0) continue;
    
    const labels = recentValues.map(v => {
      const date = new Date(v.timestamp);
      return date.toLocaleTimeString();
    });
    
    const values = recentValues.map(v => v.value);
    
    html += `
        new Chart(document.getElementById('chart-${metric.name}'), {
          type: 'line',
          data: {
            labels: ${JSON.stringify(labels)},
            datasets: [{
              label: '${metric.name}',
              data: ${JSON.stringify(values)},
              borderColor: 'rgb(75, 192, 192)',
              tension: 0.1
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              y: {
                beginAtZero: ${metric.name.includes('duration') ? 'true' : 'false'}
              }
            }
          }
        });
    `;
  }
  
  html += `
      }
      
      // Load system information
      async function loadSystemInfo() {
        try {
          const response = await fetch('/system');
          const data = await response.json();
          
          let html = '<div class="stat-grid">';
          
          // CPU and memory
          html += '<div class="stat-box"><div class="stat-title">CPUs</div><div class="stat-value">' + data.cpus + '</div></div>';
          html += '<div class="stat-box"><div class="stat-title">Platform</div><div class="stat-value">' + data.platform + '/' + data.arch + '</div></div>';
          html += '<div class="stat-box"><div class="stat-title">Load Average</div><div class="stat-value">' + data.loadavg[0].toFixed(2) + '</div></div>';
          
          // Memory
          const totalMemGB = (data.memory.total / 1024 / 1024 / 1024).toFixed(2);
          const freeMemGB = (data.memory.free / 1024 / 1024 / 1024).toFixed(2);
          const usedMemPercent = (100 - (data.memory.free / data.memory.total * 100)).toFixed(1);
          
          html += '<div class="stat-box"><div class="stat-title">Total Memory</div><div class="stat-value">' + totalMemGB + ' GB</div></div>';
          html += '<div class="stat-box"><div class="stat-title">Free Memory</div><div class="stat-value">' + freeMemGB + ' GB</div></div>';
          html += '<div class="stat-box"><div class="stat-title">Memory Usage</div><div class="stat-value">' + usedMemPercent + '%</div></div>';
          
          // Process memory
          const heapUsedMB = (data.memory.process.heapUsed / 1024 / 1024).toFixed(2);
          const heapTotalMB = (data.memory.process.heapTotal / 1024 / 1024).toFixed(2);
          const rssMB = (data.memory.process.rss / 1024 / 1024).toFixed(2);
          
          html += '<div class="stat-box"><div class="stat-title">Process RSS</div><div class="stat-value">' + rssMB + ' MB</div></div>';
          html += '<div class="stat-box"><div class="stat-title">Heap Used</div><div class="stat-value">' + heapUsedMB + ' MB</div></div>';
          html += '<div class="stat-box"><div class="stat-title">Heap Total</div><div class="stat-value">' + heapTotalMB + ' MB</div></div>';
          
          // Uptime
          const systemUptime = (data.uptime.system / 60 / 60).toFixed(1);
          const processUptime = (data.uptime.process / 60 / 60).toFixed(1);
          
          html += '<div class="stat-box"><div class="stat-title">System Uptime</div><div class="stat-value">' + systemUptime + ' hours</div></div>';
          html += '<div class="stat-box"><div class="stat-title">Process Uptime</div><div class="stat-value">' + processUptime + ' hours</div></div>';
          
          html += '</div>';
          
          document.getElementById('system-info').innerHTML = html;
        } catch (error) {
          document.getElementById('system-info').innerHTML = '<p>Error loading system info: ' + error.message + '</p>';
        }
      }
      
      // Load recent logs
      async function loadLogs() {
        try {
          const response = await fetch('/logs');
          const data = await response.json();
          
          let html = '<table style="width:100%; border-collapse: collapse;">';
          html += '<tr><th style="text-align:left;padding:8px;border-bottom:1px solid #ddd;">Time</th><th style="text-align:left;padding:8px;border-bottom:1px solid #ddd;">Level</th><th style="text-align:left;padding:8px;border-bottom:1px solid #ddd;">Source</th><th style="text-align:left;padding:8px;border-bottom:1px solid #ddd;">Message</th></tr>';
          
          for (const log of data.logs) {
            const rowColor = log.level === 'error' ? '#ffebee' : log.level === 'warn' ? '#fff8e1' : '';
            
            html += '<tr style="background-color:' + rowColor + '">';
            html += '<td style="padding:8px;border-bottom:1px solid #ddd;">' + new Date(log.timestamp).toLocaleString() + '</td>';
            html += '<td style="padding:8px;border-bottom:1px solid #ddd;">' + log.level.toUpperCase() + '</td>';
            html += '<td style="padding:8px;border-bottom:1px solid #ddd;">' + log.source + '</td>';
            html += '<td style="padding:8px;border-bottom:1px solid #ddd;">' + log.message + '</td>';
            html += '</tr>';
          }
          
          html += '</table>';
          
          document.getElementById('logs-container').innerHTML = html;
        } catch (error) {
          document.getElementById('logs-container').innerHTML = '<p>Error loading logs: ' + error.message + '</p>';
        }
      }
      
      // Initialize the page
      document.addEventListener('DOMContentLoaded', function() {
        createCharts();
      });
    </script>
  </body>
  </html>
  `;
  
  res.send(html);
});

// Logs endpoint for the dashboard
app.get('/logs', async (req, res) => {
  if (!process.env.DATABASE_URL) {
    return res.status(200).json({
      logs: []
    });
  }
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 5000
  });
  
  try {
    const limit = Math.min(parseInt(req.query.limit as string || '50'), 200);
    const level = req.query.level as string || '';
    const source = req.query.source as string || '';
    
    let query = 'SELECT * FROM logs';
    const params = [];
    
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
    dbLogger.info(`Health check server started on port ${port}`, 'system');
  });
} catch (error) {
  console.error('❌ Failed to start health check server:', error);
  dbLogger.error(`Failed to start health check server: ${error}`, 'system');
} 
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