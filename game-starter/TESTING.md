# Testing Guide for AiWendy Game Starter

This document provides a comprehensive guide to the testing infrastructure and processes for the AiWendy Game Starter project.

## Table of Contents

1. [Testing Overview](#testing-overview)
2. [Test Directory Structure](#test-directory-structure)
3. [Types of Tests](#types-of-tests)
4. [Running Tests](#running-tests)
5. [Writing Tests](#writing-tests)
6. [Test Coverage](#test-coverage)
7. [CI/CD Integration](#cicd-integration)
8. [Debugging Tests](#debugging-tests)

## Testing Overview

The AiWendy Game Starter project uses Jest as the primary testing framework. The testing setup includes:

- **Jest**: For test running and assertions
- **ts-jest**: For TypeScript support in tests
- **Custom test script**: For enhanced test running and reporting

## Test Directory Structure

Tests are organized in the following structure:

```
game-starter/
├── src/
│   ├── tests/
│   │   ├── unit/          # Unit tests
│   │   ├── integration/   # Integration tests
│   │   ├── e2e/           # End-to-end tests
│   │   ├── jest.config.js # Jest configuration
│   │   └── jest.setup.js  # Jest setup
└── run_tests.sh           # Test runner script
```

## Types of Tests

### Unit Tests

Unit tests focus on testing individual functions, classes, or modules in isolation. They should be fast, isolated, and not depend on external resources.

**Example unit test files:**
- `metrics.test.ts`: Tests for the metrics tracking system
- `retry.test.ts`: Tests for retry logic

### Integration Tests

Integration tests check how different components work together. They may include database interactions, API calls between services, etc.

### End-to-End (E2E) Tests

E2E tests validate the entire application workflow from start to finish. They simulate real user scenarios and often interact with the full stack.

## Running Tests

### Using npm scripts

The following npm scripts are available for running tests:

```bash
# Run all tests
npm test

# Run only unit tests
npm run test:unit

# Run only integration tests
npm run test:integration

# Run only E2E tests
npm run test:e2e

# Run tests with coverage reporting
npm run test:coverage
```

### Using the test script directly

The `run_tests.sh` script provides more options for running tests:

```bash
# Run all tests
./run_tests.sh

# Skip specific test types
./run_tests.sh --skip-unit
./run_tests.sh --skip-integration
./run_tests.sh --skip-e2e

# Run tests matching a pattern
./run_tests.sh --test="metrics"

# Disable coverage reporting
./run_tests.sh --no-coverage

# Show verbose output
./run_tests.sh --verbose

# Show help
./run_tests.sh --help
```

## Writing Tests

### Unit Test Example

```typescript
import { someFunction } from '../../utils/someModule';

describe('someFunction', () => {
  it('should return expected result', () => {
    const result = someFunction(input);
    expect(result).toBe(expectedOutput);
  });
  
  it('should handle edge cases', () => {
    expect(someFunction(null)).toBeNull();
  });
});
```

### Mocking Dependencies

Use Jest's mocking capabilities to isolate the unit under test:

```typescript
// Mock a module
jest.mock('../../utils/dependencyModule', () => ({
  dependencyFunction: jest.fn().mockReturnValue('mocked result')
}));

// Mock a class
jest.mock('../../utils/SomeClass', () => {
  return {
    SomeClass: jest.fn().mockImplementation(() => {
      return {
        method: jest.fn().mockReturnValue('mocked method result')
      };
    })
  };
});
```

## Test Coverage

Test coverage reports are generated when running tests with the `--coverage` flag or using the `npm run test:coverage` script. The coverage report is available at:

```
./coverage/lcov-report/index.html
```

## CI/CD Integration

Tests are automatically run in the CI/CD pipeline. The workflow is configured to:

1. Run all tests
2. Generate coverage reports
3. Fail the build if tests fail or coverage falls below thresholds

## Debugging Tests

### Using VS Code

Add the following configuration to your `.vscode/launch.json` file:

```json
{
  "type": "node",
  "request": "launch",
  "name": "Debug Jest Tests",
  "program": "${workspaceFolder}/node_modules/.bin/jest",
  "args": [
    "--runInBand",
    "--watchAll=false",
    "${file}"
  ],
  "console": "integratedTerminal",
  "internalConsoleOptions": "neverOpen",
  "disableOptimisticBPs": true
}
```

Then open a test file and press F5 to debug.

### Common Issues

1. **Tests timing out**: Check for asynchronous operations not properly resolved
2. **Mock not working**: Ensure the mock is defined before the import
3. **Coverage report issues**: Clear the coverage directory and run tests again

## Best Practices

1. **Test isolation**: Each test should be independent and not rely on the state from other tests
2. **Meaningful assertions**: Test the actual behavior, not implementation details
3. **Test description**: Use clear and descriptive test names
4. **Setup and teardown**: Use `beforeEach` and `afterEach` to set up and clean up test state
5. **Avoid test interdependence**: Don't make tests depend on the order of execution

---

For more information, contact the development team or refer to the project documentation. 