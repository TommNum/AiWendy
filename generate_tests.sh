#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Running all tests for AiWendy...${NC}"
echo "========================================"

# Function to run a test and report results
run_test() {
  local test_name=$1
  local test_command=$2
  
  echo -e "\n${YELLOW}Running $test_name...${NC}"
  echo "----------------------------------------"
  
  if $test_command; then
    echo -e "\n${GREEN}✅ $test_name passed${NC}"
    return 0
  else
    echo -e "\n${RED}❌ $test_name failed${NC}"
    return 1
  fi
}

# Track overall success
TESTS_PASSED=0
TESTS_FAILED=0

# Run LLM usage test
if run_test "LLM Usage Test" "npx ts-node src/test-llm-usage.ts"; then
  TESTS_PASSED=$((TESTS_PASSED+1))
else
  TESTS_FAILED=$((TESTS_FAILED+1))
fi

# Run worker functionality test
if run_test "Worker Functionality Test" "npx ts-node src/test-workers.ts"; then
  TESTS_PASSED=$((TESTS_PASSED+1))
else
  TESTS_FAILED=$((TESTS_FAILED+1))
fi

# Run Twitter API test
if run_test "Twitter API Test" "npx ts-node src/test-tweet.ts"; then
  TESTS_PASSED=$((TESTS_PASSED+1))
else
  TESTS_FAILED=$((TESTS_FAILED+1))
fi

# Print summary
echo -e "\n${YELLOW}Test Summary:${NC}"
echo "----------------------------------------"
echo -e "${GREEN}Tests passed: $TESTS_PASSED${NC}"
echo -e "${RED}Tests failed: $TESTS_FAILED${NC}"

# Exit with appropriate code
if [ $TESTS_FAILED -eq 0 ]; then
  echo -e "\n${GREEN}All tests passed successfully!${NC}"
  exit 0
else
  echo -e "\n${RED}Some tests failed. Please check the output above for details.${NC}"
  exit 1
fi 