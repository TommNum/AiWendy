# Wendy Agent Tests

This directory contains test scripts for verifying different components of the Wendy agent without affecting production systems.

## Available Tests

### LLM Test (`llmTest.ts`)

Tests the LLM functionality without actually posting to Twitter. This test:

- Verifies that the LLM integration is working correctly
- Tests generating tweets and replies using the LLM
- Logs what actions would be taken on Twitter without actually performing them
- Tests handling of errors from the LLM service

Run with:
```bash
npm run test:llm
```

### Twitter API Test (`twitterApiTest.ts`)

Tests the Twitter API integration to verify:

- Twitter API credentials are valid and working
- Which endpoints are currently rate limited
- If rate limiting is from our internal rate limiter or from Twitter
- The status of our read-only and read-write API access

Run with:
```bash
npm run test:twitter
```

## Running All Tests

To run all tests sequentially:

```bash
npm test
```

## Log Output

All test output is logged with timestamps and appears in both:
- The console
- The log file (if configured)

## Important Notes

1. The LLM test will make actual calls to the LLM service, so it may incur API costs.
2. The Twitter API test makes actual API calls to Twitter to check credentials and rate limits but doesn't post any tweets or perform actions that would be visible to users.
3. Both tests use the same environment variables as the main application. 