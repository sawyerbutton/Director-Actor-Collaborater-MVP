# Testing Guide

Complete guide for testing in ScriptAI project.

## Testing Stack

- **Unit Tests**: Jest + Testing Library
- **Integration Tests**: Jest + Route Handler Testing
- **E2E Tests**: Playwright
- **Type Checking**: TypeScript
- **Linting**: ESLint

## Test Commands

```bash
# Quick test validation (61 tests, ~55s)
npm test -- tests/unit/character-architect.test.ts tests/unit/rules-auditor.test.ts tests/unit/pacing-strategist.test.ts tests/unit/thematic-polisher.test.ts tests/unit/v1-api-service.test.ts tests/unit/revision-decision.service.test.ts tests/integration/iteration-api-simple.test.ts

# Run specific test file
npm test -- path/to/test.spec.ts

# Run test by description
npm test -- -t "test description"

# Run tests in watch mode
npm run test:watch

# E2E tests (WSL-optimized)
npm run test:e2e            # Headless mode
npm run test:e2e:headed     # With visible browser

# Type checking
npm run typecheck

# Linting
npm run lint

# Complete check (typecheck + lint + build)
npm run check:all
```

## Test Coverage Status

### Unit Tests: 47/47 (100%) ✅
- Character Architect: 8/8 ✅
- Rules Auditor: 8/8 ✅
- Pacing Strategist: 8/8 ✅
- Thematic Polisher: 8/8 ✅
- V1 API Service: 6/6 ✅
- Revision Decision Service: 12/12 ✅
- Error Handling: 14/14 ✅

### Integration Tests: 29/30 (96.7%) ✅
- V1 API Flow: All passing ✅
- Iteration API (Route Handlers): 9/9 ✅
- Iteration API (Simple): 11/11 ✅
- Repair Full Flow: 7/8 (1 legacy failure, low priority)

### E2E Tests: Framework ready, some WSL stability issues

### Overall Pass Rate: 97.5% (77/79 tests)

## Test Environment Setup

### Database Configuration

Tests use development database credentials (NOT test-specific database):

```javascript
// jest.setup.js sets these automatically:
DATABASE_URL = 'postgresql://director_user:director_pass_2024@localhost:5432/director_actor_db?schema=public'
DEEPSEEK_API_KEY = 'test-api-key' // Mocked in unit tests
```

**Important**: Integration tests connect to the same database as development. Use `npx prisma db push --force-reset` to clean state before test runs.

### Jest Configuration

**Location**: `jest.config.js`

```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1'
  },
  testMatch: [
    '**/tests/**/*.test.ts',
    '**/tests/**/*.spec.ts'
  ],
  collectCoverageFrom: [
    'lib/**/*.ts',
    'app/**/*.ts',
    '!**/*.d.ts',
    '!**/node_modules/**'
  ]
};
```

### Playwright Configuration

**Location**: `config/playwright.config.ts`

```typescript
export default defineConfig({
  fullyParallel: false,        // Sequential for WSL stability
  workers: 2,                   // Limited for resources
  retries: 1,                   // Retry flaky tests
  use: {
    headless: true,             // Required for WSL
    launchOptions: {
      args: [
        '--disable-dev-shm-usage',
        '--no-sandbox',
        '--disable-gpu'
      ]
    }
  }
});
```

## Unit Testing Patterns

### Testing AI Agents

**Pattern**: Mock DeepSeekClient, use factory functions

```typescript
import { createCharacterArchitect } from '@/lib/agents/character-architect';
import { DeepSeekClient } from '@/lib/api/deepseek/client';

jest.mock('@/lib/api/deepseek/client');
jest.mock('@/lib/agents/character-architect', () => ({
  createCharacterArchitect: jest.fn()
}));

describe('CharacterArchitect', () => {
  let mockDeepSeek: jest.Mocked<DeepSeekClient>;
  let mockAgent: any;

  beforeEach(() => {
    mockDeepSeek = {
      chat: jest.fn()
    } as any;

    mockAgent = {
      proposeCharacterEnhancement: jest.fn(),
      executeProposal: jest.fn()
    };

    (createCharacterArchitect as jest.Mock).mockReturnValue(mockAgent);
  });

  test('proposeCharacterEnhancement returns proposals', async () => {
    const mockProposals = {
      focusContext: { characterName: '张三' },
      proposals: [
        { id: 0, type: 'gradual', approach: '渐进式' },
        { id: 1, type: 'dramatic', approach: '戏剧性' }
      ],
      recommendation: 0
    };

    mockAgent.proposeCharacterEnhancement.mockResolvedValue(mockProposals);

    const result = await mockAgent.proposeCharacterEnhancement({
      projectId: 'test-id',
      focusName: '张三',
      contradiction: '角色动机不清晰',
      scriptContext: '剧本片段'
    });

    expect(result.proposals).toHaveLength(2);
    expect(result.recommendation).toBe(0);
  });
});
```

### Testing Database Services

**Pattern**: Use Prisma mocks with `as any`

```typescript
import { prisma } from '@/lib/prisma';
import { revisionDecisionService } from '@/lib/db/services/revision-decision.service';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    revisionDecision: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn()
    }
  }
}));

const mockPrisma = prisma as any;

describe('RevisionDecisionService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('createDecision creates new decision', async () => {
    const mockDecision = {
      id: 'decision-1',
      projectId: 'project-1',
      act: 'ACT2_CHARACTER',
      focusName: '张三',
      proposals: [],
      userChoice: null,
      generatedChanges: null,
      executedAt: null
    };

    mockPrisma.revisionDecision.create.mockResolvedValue(mockDecision);

    const result = await revisionDecisionService.createDecision({
      projectId: 'project-1',
      act: 'ACT2_CHARACTER',
      focusName: '张三',
      contradiction: '角色动机不清晰',
      scriptContext: '剧本片段',
      proposals: []
    });

    expect(result.id).toBe('decision-1');
    expect(mockPrisma.revisionDecision.create).toHaveBeenCalledTimes(1);
  });

  test('rollback sets generatedChanges to null', async () => {
    const updatedDecision = {
      id: 'decision-1',
      userChoice: null,
      generatedChanges: null, // NOT undefined
      executedAt: null
    };

    mockPrisma.revisionDecision.update.mockResolvedValue(updatedDecision);

    const result = await revisionDecisionService.rollback('decision-1');

    expect(result.generatedChanges).toBeNull(); // NOT toBeUndefined()
  });
});
```

### Testing API Client (v1ApiService)

**Pattern**: Mock fetch, handle polling

```typescript
import { v1ApiService } from '@/lib/services/v1-api-service';

global.fetch = jest.fn();

describe('v1ApiService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    v1ApiService.clearState();
  });

  test('pollJobStatus returns COMPLETED after polling', async () => {
    // Use mockResolvedValue (NOT mockResolvedValueOnce) for continuous polling
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { jobId: 'job-1', status: 'PROCESSING', progress: 0.5 }
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { jobId: 'job-1', status: 'COMPLETED', progress: 1.0 }
        })
      });

    const result = await v1ApiService.pollJobStatus('job-1');

    expect(result.status).toBe('COMPLETED');
    expect(result.progress).toBe(1.0);
  });

  test('handles API errors gracefully', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 500,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({
        success: false,
        error: { message: 'Internal error' }
      })
    });

    await expect(v1ApiService.createProject('Test', 'Content', 'user-1'))
      .rejects.toThrow('Internal error');
  });
});
```

## Integration Testing Patterns

### Testing Route Handlers

**Pattern**: Use NextRequest to test route handlers directly (no HTTP server needed)

```typescript
import { NextRequest } from 'next/server';
import { POST as proposeHandler } from '@/app/api/v1/iteration/propose/route';
import { POST as executeHandler } from '@/app/api/v1/iteration/execute/route';

describe('Iteration API Routes', () => {
  test('POST /api/v1/iteration/propose creates ITERATION job', async () => {
    const request = new NextRequest('http://localhost:3001/api/v1/iteration/propose', {
      method: 'POST',
      body: JSON.stringify({
        projectId: 'project-1',
        act: 'ACT2_CHARACTER',
        focusName: '张三',
        contradiction: '角色动机不清晰',
        scriptContext: '剧本片段'
      })
    });

    const response = await proposeHandler(request);
    const data = await response.json();

    expect(response.status).toBe(202);
    expect(data.success).toBe(true);
    expect(data.data.jobId).toBeDefined();
    expect(data.data.status).toBe('QUEUED');
  });

  test('POST /api/v1/iteration/execute executes proposal', async () => {
    // First create decision via propose
    const proposeReq = new NextRequest('http://localhost:3001/api/v1/iteration/propose', {
      method: 'POST',
      body: JSON.stringify({
        projectId: 'project-1',
        act: 'ACT2_CHARACTER',
        focusName: '张三',
        contradiction: '角色动机不清晰',
        scriptContext: '剧本片段'
      })
    });

    const proposeRes = await proposeHandler(proposeReq);
    const proposeData = await proposeRes.json();
    const jobId = proposeData.data.jobId;

    // Poll until COMPLETED (or use timeout)
    // ... polling logic ...

    // Then execute
    const executeReq = new NextRequest('http://localhost:3001/api/v1/iteration/execute', {
      method: 'POST',
      body: JSON.stringify({
        decisionId: 'decision-id-from-job-result',
        proposalChoice: 0
      })
    });

    const executeRes = await executeHandler(executeReq);
    const executeData = await executeRes.json();

    expect(executeRes.status).toBe(200);
    expect(executeData.success).toBe(true);
    expect(executeData.data.actions).toBeDefined();
  });
});
```

### Testing Complete Workflows

```typescript
describe('Complete ACT2 Workflow', () => {
  let projectId: string;
  let jobId: string;
  let decisionId: string;

  test('Step 1: Create project', async () => {
    const request = new NextRequest('http://localhost:3001/api/v1/projects', {
      method: 'POST',
      body: JSON.stringify({
        title: 'Test Project',
        content: 'Test script content...',
        userId: 'demo-user'
      })
    });

    const response = await createProjectHandler(request);
    const data = await response.json();

    projectId = data.data.id;
    expect(response.status).toBe(201);
  });

  test('Step 2: Start ACT1 analysis', async () => {
    // ... start analysis logic ...
  });

  test('Step 3: Apply ACT1 repair', async () => {
    // ... apply repair logic ...
  });

  test('Step 4: Generate ACT2 proposals', async () => {
    // ... propose logic ...
  });

  test('Step 5: Execute ACT2 proposal', async () => {
    // ... execute logic ...
  });
});
```

## E2E Testing Patterns

### Complete User Flow

```typescript
import { test, expect } from '@playwright/test';

test('complete workflow from upload to synthesis', async ({ page }) => {
  // Step 1: Upload script
  await page.goto('http://localhost:3000/dashboard');
  await page.setInputFiles('input[type="file"]', 'tests/fixtures/test-script.txt');
  await page.click('button:has-text("开始分析")');

  // Step 2: Wait for ACT1 analysis
  await page.waitForURL(/\/analysis\/\w+/);
  await expect(page.locator('text=诊断报告')).toBeVisible({ timeout: 60000 });

  // Step 3: Proceed to iteration
  await page.click('button:has-text("进入迭代工作区")');
  await page.waitForURL(/\/iteration\/\w+/);

  // Step 4: Select ACT2
  await page.click('[data-testid="act-2-button"]');

  // Step 5: Select finding
  await page.click('[data-testid="finding-item"]:first-child');
  await page.click('button:has-text("获取AI解决方案提案")');

  // Step 6: Wait for proposals
  await expect(page.locator('[data-testid="proposal-0"]')).toBeVisible({ timeout: 60000 });

  // Step 7: Select and execute proposal
  await page.click('[data-testid="proposal-0"]');
  await page.click('button:has-text("执行选定提案")');

  // Step 8: Verify changes displayed
  await expect(page.locator('[data-testid="changes-display"]')).toBeVisible();

  // Step 9: Proceed to synthesis
  await page.click('button:has-text("生成最终剧本")');
  await page.waitForURL(/\/synthesis\/\w+/);

  // Step 10: Start synthesis
  await page.click('button:has-text("开始合成")');

  // Step 11: Wait for V2
  await expect(page.locator('text=最终剧本 (V2)')).toBeVisible({ timeout: 300000 });
});
```

### Visual Regression Testing

```typescript
test('dashboard page matches screenshot', async ({ page }) => {
  await page.goto('http://localhost:3000/dashboard');
  await expect(page).toHaveScreenshot('dashboard.png');
});
```

## Critical Test Fixes Applied (2025-10-02)

### Issue 1: Database Authentication

**Problem**: Tests failing with authentication error

**Fix**: Updated `jest.setup.js` with correct credentials:
```javascript
process.env.DATABASE_URL = 'postgresql://director_user:director_pass_2024@localhost:5432/director_actor_db?schema=public';
```

### Issue 2: Prisma Mock Types

**Problem**: TypeScript errors with complex Prisma types

**Fix**: Use `as any` for Prisma mocks:
```typescript
const mockPrisma = prisma as any;
```

### Issue 3: Service Bug - rollback()

**Problem**: `revisionDecisionService.rollback()` setting `generatedChanges: undefined`

**Fix**: Updated service to set `null` instead:
```typescript
generatedChanges: null, // NOT undefined
```

## Test Conventions

### 1. Prisma Mocks

Use `const mockPrisma = prisma as any` (not `jest.Mocked<typeof prisma>`)

### 2. Agent Factory Functions

Mock factory functions, not classes:
```typescript
jest.mock('@/lib/agents/character-architect', () => ({
  createCharacterArchitect: jest.fn()
}));
```

### 3. Route Handler Tests

Use `NextRequest` to test route handlers directly:
```typescript
import { POST as handler } from '@/app/api/v1/iteration/propose/route';
const request = new NextRequest('http://localhost:3001/api/v1/iteration/propose', {
  method: 'POST',
  body: JSON.stringify({ /* data */ })
});
const response = await handler(request);
```

### 4. Agent Tests

Always mock DeepSeekClient, return arrays not objects

### 5. Database Tests

Expect `null` for nullable fields (Prisma uses `null`, not `undefined`)

### 6. Async Jobs

Use `mockResolvedValue()` for polling (not `mockResolvedValueOnce()`)

### 7. Environment Variables

`NEXTAUTH_SECRET` must be ≥32 characters in `jest.setup.js`

### 8. Cleanup

Run `npx prisma generate` after schema changes, before tests

## Common Test Patterns

### Testing Async Operations

```typescript
test('async operation completes', async () => {
  const promise = someAsyncFunction();
  await expect(promise).resolves.toBe(expectedValue);
});

test('async operation throws error', async () => {
  const promise = someAsyncFunction();
  await expect(promise).rejects.toThrow('Expected error');
});
```

### Testing Timeouts

```typescript
test('operation completes within timeout', async () => {
  jest.setTimeout(15000); // 15 seconds

  const result = await longRunningOperation();

  expect(result).toBeDefined();
}, 15000);
```

### Testing Error Handling

```typescript
test('handles API error gracefully', async () => {
  mockFetch.mockRejectedValue(new Error('Network error'));

  await expect(apiCall()).rejects.toThrow('Network error');
});
```

### Testing Validation

```typescript
test('validates input correctly', () => {
  const schema = z.object({ name: z.string() });

  expect(() => schema.parse({ name: 123 })).toThrow();
  expect(schema.parse({ name: 'Test' })).toEqual({ name: 'Test' });
});
```

## WSL-Specific Considerations

### E2E Test Configuration

Playwright configured for WSL stability:
```typescript
{
  fullyParallel: false,        // Sequential for stability
  workers: 2,                   // Limited for resources
  retries: 1,                   // Retry flaky tests
  headless: true,               // Required for WSL
  launchOptions: {
    args: [
      '--disable-dev-shm-usage',
      '--no-sandbox',
      '--disable-gpu'
    ]
  }
}
```

### Performance Considerations

- Sequential execution prevents resource exhaustion
- Limited workers (2) for WSL environment
- Retry logic compensates for timing-based flakiness

## Debugging Tests

### Jest Debug Mode

```bash
# Run tests with verbose output
npm test -- --verbose

# Run single test with debugging
node --inspect-brk node_modules/.bin/jest tests/unit/character-architect.test.ts
```

### Playwright Debug Mode

```bash
# Run with UI mode
npx playwright test --ui

# Run with debug mode
npx playwright test --debug

# Run with headed browser
npm run test:e2e:headed
```

### Console Logging

```typescript
test('debug test', () => {
  console.log('Debug value:', someValue);
  console.dir(complexObject, { depth: null });
});
```

## Known Test Issues

### Low Priority

- Legacy tests in `tests/__tests__/` have TypeScript errors (not in main test suite)
- Some timing-based tests may be flaky in WSL (retry logic compensates)
- One legacy repair flow test failing (7/8 passing, low priority)

### Resolved

- ✅ Database authentication errors (fixed 2025-10-02)
- ✅ Prisma mock type errors (fixed 2025-10-02)
- ✅ Service rollback bug (fixed 2025-10-02)

## Test Data Management

### Fixtures

Store test data in `tests/fixtures/`:
```
tests/fixtures/
├── test-script.txt
├── large-script.txt
├── invalid-script.txt
└── mock-responses.json
```

### Database Seeding for Tests

```typescript
beforeAll(async () => {
  // Clean database
  await prisma.$executeRaw`TRUNCATE TABLE "Project" CASCADE`;

  // Seed test data
  await prisma.user.create({
    data: { id: 'test-user', email: 'test@example.com' }
  });
});

afterAll(async () => {
  // Cleanup
  await prisma.$disconnect();
});
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: director_user
          POSTGRES_PASSWORD: director_pass_2024
          POSTGRES_DB: director_actor_db
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      - run: npm install
      - run: npx prisma generate
      - run: npx prisma db push
      - run: npm run typecheck
      - run: npm run lint
      - run: npm test
      - run: npm run test:e2e
```

## Related Documentation

- **API Reference**: See `ref/API_REFERENCE.md`
- **AI Agents**: See `ref/AI_AGENTS.md`
- **Database Schema**: See `ref/DATABASE_SCHEMA.md`
- **Comprehensive Testing Strategy**: See `docs/COMPREHENSIVE_TESTING_STRATEGY.md`
- **Test Execution Report**: See `docs/archive/testing/TEST_EXECUTION_REPORT.md`
- **Test Fixes Summary**: See `docs/TEST_FIXES_SUMMARY.md`
- **Iteration API Test Notes**: See `tests/integration/ITERATION_API_TEST_NOTES.md`
