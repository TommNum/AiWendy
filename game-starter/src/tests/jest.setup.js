// Setup file for Jest
// This will run before each test file

// Set environment variables for testing
process.env.NODE_ENV = 'test';

// Global test timeout
jest.setTimeout(30000); // 30 seconds

// Silent console during tests unless explicitly enabled
if (!process.env.DEBUG) {
  global.console = {
    ...console,
    log: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
    // Keep errors and warnings visible
    error: console.error,
    warn: console.warn,
  };
} 