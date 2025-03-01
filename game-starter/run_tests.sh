#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default settings
RUN_UNIT_TESTS=true
RUN_INTEGRATION_TESTS=true
RUN_E2E_TESTS=true
TEST_PATTERN=""
COVERAGE=true
VERBOSE=false

# Parse command line arguments
for arg in "$@"; do
  case $arg in
    --skip-unit)
      RUN_UNIT_TESTS=false
      shift
      ;;
    --skip-integration)
      RUN_INTEGRATION_TESTS=false
      shift
      ;;
    --skip-e2e)
      RUN_E2E_TESTS=false
      shift
      ;;
    --test=*)
      TEST_PATTERN="${arg#*=}"
      shift
      ;;
    --no-coverage)
      COVERAGE=false
      shift
      ;;
    --verbose)
      VERBOSE=true
      shift
      ;;
    --help)
      echo "Usage: ./run_tests.sh [options]"
      echo "Options:"
      echo "  --skip-unit         Skip unit tests"
      echo "  --skip-integration  Skip integration tests"
      echo "  --skip-e2e          Skip end-to-end tests"
      echo "  --test=PATTERN      Run only tests matching the pattern"
      echo "  --no-coverage       Disable code coverage reporting"
      echo "  --verbose           Show detailed test output"
      echo "  --help              Show this help message"
      exit 0
      ;;
    *)
      # Unknown option
      echo "Unknown option: $arg"
      echo "Use --help to see available options."
      exit 1
      ;;
  esac
done

echo -e "${YELLOW}Running tests for AiWendy Game Starter${NC}"
echo "========================================"

# Function to run tests and report results
run_tests() {
  local test_type=$1
  local test_path=$2
  local test_cmd="npx jest --config=src/tests/jest.config.js"
  
  # Add options for test pattern if specified
  if [ -n "$TEST_PATTERN" ]; then
    test_cmd="$test_cmd -t \"$TEST_PATTERN\""
  fi
  
  # Add coverage option if enabled
  if [ "$COVERAGE" = true ]; then
    test_cmd="$test_cmd --coverage"
  fi
  
  # Add verbosity if enabled
  if [ "$VERBOSE" = true ]; then
    test_cmd="$test_cmd --verbose"
  fi
  
  # Add test path
  test_cmd="$test_cmd $test_path"
  
  echo -e "\n${BLUE}Running $test_type tests...${NC}"
  echo "----------------------------------------"
  
  # Run the command
  eval $test_cmd
  
  local exit_code=$?
  if [ $exit_code -eq 0 ]; then
    echo -e "\n${GREEN}✅ $test_type tests passed${NC}"
    return 0
  else
    echo -e "\n${RED}❌ $test_type tests failed${NC}"
    return 1
  fi
}

# Track overall success
TESTS_PASSED=0
TESTS_FAILED=0

# Run unit tests
if [ "$RUN_UNIT_TESTS" = true ]; then
  if run_tests "Unit" "src/tests/unit"; then
    TESTS_PASSED=$((TESTS_PASSED+1))
  else
    TESTS_FAILED=$((TESTS_FAILED+1))
  fi
fi

# Run integration tests
if [ "$RUN_INTEGRATION_TESTS" = true ]; then
  if run_tests "Integration" "src/tests/integration"; then
    TESTS_PASSED=$((TESTS_PASSED+1))
  else
    TESTS_FAILED=$((TESTS_FAILED+1))
  fi
fi

# Run E2E tests
if [ "$RUN_E2E_TESTS" = true ]; then
  if run_tests "End-to-End" "src/tests/e2e"; then
    TESTS_PASSED=$((TESTS_PASSED+1))
  else
    TESTS_FAILED=$((TESTS_FAILED+1))
  fi
fi

# Print summary
echo -e "\n${YELLOW}Test Summary:${NC}"
echo "----------------------------------------"
echo -e "${GREEN}Test suites passed: $TESTS_PASSED${NC}"
echo -e "${RED}Test suites failed: $TESTS_FAILED${NC}"

# Print coverage summary if enabled
if [ "$COVERAGE" = true ]; then
  echo -e "\n${YELLOW}Coverage Summary:${NC}"
  echo "----------------------------------------"
  echo "Check the coverage report in ./coverage/lcov-report/index.html"
fi

# Exit with appropriate code
if [ $TESTS_FAILED -eq 0 ]; then
  echo -e "\n${GREEN}All test suites passed successfully!${NC}"
  exit 0
else
  echo -e "\n${RED}Some test suites failed. Please check the output above for details.${NC}"
  exit 1
fi 