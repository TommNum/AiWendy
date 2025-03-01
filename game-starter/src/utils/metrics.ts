import fs from 'fs';
import path from 'path';
import { dbLogger } from './dbLogger';

interface MetricValue {
  timestamp: number;
  value: number;
}

interface MetricData {
  name: string;
  description: string;
  unit: string;
  values: MetricValue[];
  maxValues: number;  // Maximum number of values to keep
}

class MetricsTracker {
  private metrics: Map<string, MetricData> = new Map();
  private readonly dataDir: string;
  private readonly metricsFilePath: string;
  private saveInterval: NodeJS.Timeout | null = null;
  private loadedMetrics = false;
  private readonly MAX_VALUES = 1000; // Default max values to keep
  
  constructor() {
    this.dataDir = path.join(__dirname, '../../data');
    this.metricsFilePath = path.join(this.dataDir, 'metrics.json');
    
    // Ensure the data directory exists
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
    
    // Load existing metrics
    this.loadMetrics();
    
    // Set up auto-save interval
    this.saveInterval = setInterval(() => this.saveMetrics(), 60000); // Save every minute
  }
  
  // Initialize a new metric
  initMetric(name: string, description: string, unit: string = 'count', maxValues: number = this.MAX_VALUES) {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, {
        name,
        description,
        unit,
        values: [],
        maxValues
      });
      dbLogger.info(`Initialized metric: ${name}`, 'metrics');
    }
  }
  
  // Record a metric value
  recordMetric(name: string, value: number) {
    if (!this.metrics.has(name)) {
      // Auto-initialize if it doesn't exist
      this.initMetric(name, name);
    }
    
    const metric = this.metrics.get(name)!;
    
    // Add the new value
    metric.values.push({
      timestamp: Date.now(),
      value
    });
    
    // Trim to max values
    if (metric.values.length > metric.maxValues) {
      metric.values = metric.values.slice(-metric.maxValues);
    }
  }
  
  // Track duration of an operation
  trackDuration(name: string, operation: () => any) {
    const start = Date.now();
    try {
      return operation();
    } finally {
      const duration = Date.now() - start;
      this.recordMetric(`${name}_duration_ms`, duration);
    }
  }
  
  // Track duration of an async operation
  async trackDurationAsync(name: string, operation: () => Promise<any>) {
    const start = Date.now();
    try {
      return await operation();
    } finally {
      const duration = Date.now() - start;
      this.recordMetric(`${name}_duration_ms`, duration);
    }
  }
  
  // Record outcome counter
  recordOutcome(name: string, outcome: string) {
    this.recordMetric(`${name}_${outcome}`, 1);
    // Also record total
    this.recordMetric(`${name}_total`, 1);
  }
  
  // Get statistics for a metric
  getMetricStats(name: string) {
    const metric = this.metrics.get(name);
    if (!metric) return null;
    
    const values = metric.values.map(v => v.value);
    if (values.length === 0) return null;
    
    const sum = values.reduce((a, b) => a + b, 0);
    const avg = sum / values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);
    
    // Calculate median
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    const median = sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid];
    
    // Calculate 95th percentile
    const p95Index = Math.ceil(sorted.length * 0.95) - 1;
    const p95 = sorted[p95Index];
    
    return {
      count: values.length,
      sum,
      avg,
      min,
      max,
      median,
      p95
    };
  }
  
  // Get recent values for a metric
  getRecentValues(name: string, limit: number = 50) {
    const metric = this.metrics.get(name);
    if (!metric) return [];
    
    return metric.values.slice(-limit);
  }
  
  // Get all metric names
  getAllMetricNames() {
    return Array.from(this.metrics.keys());
  }
  
  // Get all metrics data
  getAllMetrics(): Record<string, any> {
    const metricsObject: Record<string, any> = {};
    this.metrics.forEach((metric, name) => {
      const values = metric.values.map(v => v.value);
      if (values.length === 0) return;
      
      const sum = values.reduce((a, b) => a + b, 0);
      const avg = sum / values.length;
      const min = Math.min(...values);
      const max = Math.max(...values);
      
      // Calculate median (p50)
      const sorted = [...values].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      const p50 = sorted.length % 2 === 0
        ? (sorted[mid - 1] + sorted[mid]) / 2
        : sorted[mid];
      
      // Calculate 90th percentile
      const p90Index = Math.ceil(sorted.length * 0.9) - 1;
      const p90 = sorted[p90Index >= 0 ? p90Index : 0];
      
      // Calculate 99th percentile
      const p99Index = Math.ceil(sorted.length * 0.99) - 1;
      const p99 = sorted[p99Index >= 0 ? p99Index : 0];
      
      // Calculate standard deviation
      const variance = values.reduce((acc, val) => acc + Math.pow(val - avg, 2), 0) / values.length;
      const stddev = Math.sqrt(variance);
      
      metricsObject[name] = {
        name,
        count: values.length,
        sum,
        avg,
        min,
        max,
        stddev,
        p50,
        p90,
        p99,
        description: metric.description,
        unit: metric.unit
      };
    });
    return metricsObject;
  }
  
  // Load metrics from disk
  private loadMetrics() {
    try {
      if (fs.existsSync(this.metricsFilePath)) {
        const data = JSON.parse(fs.readFileSync(this.metricsFilePath, 'utf8'));
        
        // Convert data back to Map
        for (const metric of data) {
          this.metrics.set(metric.name, metric);
        }
        
        dbLogger.info(`Loaded ${this.metrics.size} metrics from disk`, 'metrics');
        this.loadedMetrics = true;
      }
    } catch (error) {
      dbLogger.error(`Failed to load metrics: ${error}`, 'metrics');
    }
  }
  
  // Save metrics to disk
  saveMetrics() {
    try {
      const data = Array.from(this.metrics.values());
      fs.writeFileSync(this.metricsFilePath, JSON.stringify(data, null, 2));
      dbLogger.debug(`Saved ${data.length} metrics to disk`, 'metrics');
    } catch (error) {
      dbLogger.error(`Failed to save metrics: ${error}`, 'metrics');
    }
  }
  
  // Clean up
  destroy() {
    if (this.saveInterval) {
      clearInterval(this.saveInterval);
      this.saveInterval = null;
    }
    this.saveMetrics(); // Final save
  }
}

// Create singleton instance
export const metrics = new MetricsTracker();

// Clean up on exit
process.on('exit', () => {
  metrics.destroy();
});

// Handle other termination signals
process.on('SIGINT', () => {
  metrics.destroy();
  process.exit(0);
});

process.on('SIGTERM', () => {
  metrics.destroy();
  process.exit(0);
}); 