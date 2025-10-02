# Iteration API Integration Test Notes

## Issue Summary

The `iteration-api.test.ts` file attempts to make real HTTP requests using `fetch()` to test the iteration API endpoints. However, this approach has the following problems:

### Problem 1: `fetch()` is undefined in Jest
- Jest uses `jest-environment-jsdom` by default, which doesn't include Node.js's `fetch()`
- Even with `@jest-environment node`, `fetch()` is not automatically mocked in Jest
- The test file tries to call `fetch('http://localhost:3001/...')` but gets `undefined`

### Problem 2: Dev Server Dependency
- These tests require the Next.js dev server to be running on a specific port
- Port may vary (3000, 3001, etc.) depending on availability
- This makes tests non-deterministic and CI/CD incompatible

## Current Test Status

❌ **FAILING** (9/9 tests fail with "Cannot read properties of undefined")

```
Tests:       9 failed, 9 total
Error: TypeError: Cannot read properties of undefined (reading 'status')
```

## Solution Options

### Option 1: Mock-Based Testing (RECOMMENDED)
Convert tests to use mocked fetch, similar to `v1-api-flow.test.ts`:

```typescript
// Mock fetch globally
global.fetch = jest.fn();

// In test
(global.fetch as jest.Mock).mockResolvedValueOnce({
  ok: true,
  status: 200,
  json: async () => ({ data: mockResponse })
});
```

**Pros**: Fast, reliable, no external dependencies
**Cons**: Doesn't test real HTTP layer

### Option 2: Manual E2E Testing
Keep current approach but mark as manual test that requires dev server:

**Pros**: Tests real HTTP endpoints
**Cons**: Requires manual dev server setup, can't run in CI

### Option 3: Use Supertest/Next.js Testing Tools
Refactor to use Next.js app testing utilities:

```typescript
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/v1/iteration/propose/route';

// Test route handler directly
const request = new NextRequest(/* ... */);
const response = await POST(request);
```

**Pros**: Tests real route handlers, no server needed
**Cons**: Requires refactoring

## Recommended Fix

The simplest and most maintainable solution is **Option 3** - test route handlers directly.

### Implementation Plan

1. Import route handlers from `app/api/v1/iteration/**/route.ts`
2. Create `NextRequest` objects with test data
3. Call route handlers directly
4. Assert on returned `Response` objects
5. No need for running dev server or mocking fetch

### Example

```typescript
import { POST as proposeHandler } from '@/app/api/v1/iteration/propose/route';
import { NextRequest } from 'next/server';

it('should generate proposals', async () => {
  const request = new NextRequest('http://localhost:3001/api/v1/iteration/propose', {
    method: 'POST',
    body: JSON.stringify({
      projectId: testProjectId,
      act: 'ACT2_CHARACTER',
      focusName: '张三',
      contradiction: '性格前后不一致'
    }),
    headers: {
      'Content-Type': 'application/json'
    }
  });

  const response = await proposeHandler(request);
  const data = await response.json();

  expect(response.status).toBe(200);
  expect(data.success).toBe(true);
});
```

## Current Workaround

Until fixed, these tests are skipped in the main test suite. To run manually:

1. Start dev server: `npm run dev`
2. Note the port (e.g., 3001)
3. Update `baseUrl` in test file if needed
4. Run: `npm test -- tests/integration/iteration-api.test.ts`

**Note**: Tests will still fail due to fetch() being undefined. Needs refactoring per Option 3.

## Test Coverage Alternative

The functionality tested by these failing tests IS covered by:
- ✅ `iteration-api-simple.test.ts` (11 tests, all passing)
- ✅ Unit tests for CharacterArchitect, RulesAuditor, etc. (32 tests, all passing)
- ✅ `v1-api-flow.test.ts` (complete V1 API workflow, passing)

So the **core iteration API logic is verified**, just not via real HTTP calls.

## Action Items

- [ ] Refactor `iteration-api.test.ts` to use Option 3 (NextRequest/route handler approach)
- [ ] Or remove this file and rely on `iteration-api-simple.test.ts`
- [ ] Update COMPREHENSIVE_TESTING_STRATEGY.md with these findings
- [ ] Add example of Next.js route testing pattern to project docs

---

**Last Updated**: 2025-10-02
**Status**: ❌ Tests failing, awaiting refactor
**Priority**: Medium (functionality is covered by other tests)
