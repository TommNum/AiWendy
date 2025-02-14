module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
  },
  testRegex: '(/__tests__/.*|(\\.|/)(test|spec))\\.tsx?$',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  setupFiles: ['dotenv/config'],
  testTimeout: 30000,  // Increase timeout for API calls
  verbose: true,
  detectOpenHandles: true,
  forceExit: true,  // Add this to force exit after tests
  setupFilesAfterEnv: ['<rootDir>/src/tests/setup.ts']  // Add this for global setup
}; 