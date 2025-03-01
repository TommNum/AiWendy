import { metrics } from '../../utils/metrics';
import fs from 'fs';

// Mock fs module
jest.mock('fs', () => ({
  existsSync: jest.fn().mockReturnValue(false),
  mkdirSync: jest.fn(),
  writeFileSync: jest.fn(),
  readFileSync: jest.fn(),
}));

// Mock the interval
jest.useFakeTimers();

// Mock dbLogger
jest.mock('../../utils/dbLogger', () => ({
  dbLogger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('Metrics Tracker', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset metrics state between tests
    // We do this by accessing the private map directly for testing
    (metrics as any).metrics = new Map();
  });

  afterAll(() => {
    // Cleanup
    if ((metrics as any).saveInterval) {
      clearInterval((metrics as any).saveInterval);
    }
  });

  describe('initMetric', () => {
    it('should initialize a new metric', () => {
      metrics.initMetric('test_metric', 'A test metric', 'count');
      
      const allMetrics = metrics.getAllMetrics();
      expect(allMetrics).toHaveLength(1);
      expect(allMetrics[0].name).toBe('test_metric');
      expect(allMetrics[0].description).toBe('A test metric');
      expect(allMetrics[0].unit).toBe('count');
    });

    it('should not reinitialize existing metrics', () => {
      metrics.initMetric('test_metric', 'A test metric');
      metrics.initMetric('test_metric', 'Different description');
      
      const allMetrics = metrics.getAllMetrics();
      expect(allMetrics).toHaveLength(1);
      expect(allMetrics[0].description).toBe('A test metric');
    });
  });

  describe('recordMetric', () => {
    it('should record metric values', () => {
      metrics.recordMetric('test_counter', 1);
      metrics.recordMetric('test_counter', 2);
      
      const values = metrics.getRecentValues('test_counter');
      expect(values).toHaveLength(2);
      expect(values[0].value).toBe(1);
      expect(values[1].value).toBe(2);
    });

    it('should auto-initialize metrics if they do not exist', () => {
      metrics.recordMetric('new_metric', 5);
      
      const allMetrics = metrics.getAllMetricNames();
      expect(allMetrics).toContain('new_metric');
      
      const values = metrics.getRecentValues('new_metric');
      expect(values).toHaveLength(1);
      expect(values[0].value).toBe(5);
    });

    it('should limit the number of values stored', () => {
      // Set up a metric with maxValues = 3
      metrics.initMetric('limited_metric', 'Limited metric', 'count', 3);
      
      // Record 5 values
      for (let i = 1; i <= 5; i++) {
        metrics.recordMetric('limited_metric', i);
      }
      
      // Should only have the last 3 values
      const values = metrics.getRecentValues('limited_metric');
      expect(values).toHaveLength(3);
      expect(values[0].value).toBe(3);
      expect(values[1].value).toBe(4);
      expect(values[2].value).toBe(5);
    });
  });

  describe('getMetricStats', () => {
    it('should calculate correct statistics', () => {
      metrics.initMetric('stats_test', 'Test for statistics');
      
      // Record values: 10, 20, 30, 40, 50
      for (let i = 1; i <= 5; i++) {
        metrics.recordMetric('stats_test', i * 10);
      }
      
      const stats = metrics.getMetricStats('stats_test');
      expect(stats).not.toBeNull();
      
      if (stats) {
        expect(stats.count).toBe(5);
        expect(stats.sum).toBe(150);
        expect(stats.avg).toBe(30);
        expect(stats.min).toBe(10);
        expect(stats.max).toBe(50);
        expect(stats.median).toBe(30);
        expect(stats.p95).toBe(50);
      }
    });

    it('should return null for non-existent metrics', () => {
      const stats = metrics.getMetricStats('non_existent');
      expect(stats).toBeNull();
    });
  });

  describe('trackDuration', () => {
    it('should track the duration of operations', () => {
      // Mock Date.now to control time
      const originalNow = Date.now;
      
      try {
        let currentTime = 1000;
        Date.now = jest.fn(() => currentTime);
        
        const operation = () => {
          // Simulate operation taking 100ms
          currentTime += 100;
          return 'result';
        };
        
        const result = metrics.trackDuration('test_operation', operation);
        
        expect(result).toBe('result');
        
        const values = metrics.getRecentValues('test_operation_duration_ms');
        expect(values).toHaveLength(1);
        expect(values[0].value).toBe(100);
      } finally {
        Date.now = originalNow;
      }
    });
  });

  describe('trackDurationAsync', () => {
    it('should track the duration of async operations', async () => {
      // Mock Date.now to control time
      const originalNow = Date.now;
      
      try {
        let currentTime = 1000;
        Date.now = jest.fn(() => currentTime);
        
        const asyncOperation = async () => {
          // Simulate operation taking 150ms
          currentTime += 150;
          return 'async result';
        };
        
        const result = await metrics.trackDurationAsync('async_operation', asyncOperation);
        
        expect(result).toBe('async result');
        
        const values = metrics.getRecentValues('async_operation_duration_ms');
        expect(values).toHaveLength(1);
        expect(values[0].value).toBe(150);
      } finally {
        Date.now = originalNow;
      }
    });
  });
}); 