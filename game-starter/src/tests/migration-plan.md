# Test Files Migration Plan

We have identified that some test files exist outside of the designated `src/tests` folder. This document outlines the plan to move them to their proper locations.

## Current Test File Structure

### Files outside `src/tests`:
- `/src/test-workers.ts` - Tests worker functionality
- `/src/test-tweet.ts` - Tests Twitter integration
- `/src/test-llm-usage.ts` - Tests LLM usage

### Files inside `src/tests`:
- `/src/tests/test-llm-usage.ts`
- `/src/tests/test-workers.ts`

## Migration Plan

1. **Compare Files**: Determine if the files in both locations are identical or have substantial differences
2. **If Identical**: 
   - Move references from outside files to inside files
   - Update package.json scripts to reference the files in the tests folder
   - Remove the outside files

3. **If Different**:
   - Merge the functionality from outside files into inside files
   - Update references accordingly
   - Remove the outside files

4. **Documentation Update**:
   - Update documentation references (README.md, etc.)
   - Update any script references

## Implementation Steps

1. Update package.json scripts:
   ```json
   "test:llm": "ts-node src/tests/test-llm-usage.ts",
   "test:workers": "ts-node src/tests/test-workers.ts",
   "test:tweet": "ts-node src/tests/test-tweet.ts",
   ```

2. Move `test-tweet.ts` to the tests folder if it doesn't exist there yet
3. Update all documentation references to point to the new locations
4. Remove the old files once migration is complete and verified

## Note on New Tests

We've created the following new test files to properly test mentions functionality:

1. `/src/tests/unit/mentionsFunction.test.ts` - Unit tests for the mentions function
2. `/src/tests/unit/twitterReplyWorker.test.ts` - Unit tests for the Twitter reply worker
3. `/src/tests/integration/mentionsWorkflow.test.ts` - Integration tests for the mentions workflow

These tests should be run with the Jest test runner and provide proper coverage for the mentions functionality. 