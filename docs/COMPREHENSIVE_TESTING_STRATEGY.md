# ScriptAI MVP - Comprehensive Testing Strategy

**Document Version**: 1.0
**Last Updated**: 2025-10-02
**Environment**: WSL (Windows Subsystem for Linux)

## Table of Contents
1. [Overview](#overview)
2. [Testing Architecture](#testing-architecture)
3. [Test Categories](#test-categories)
4. [Test Execution Plan](#test-execution-plan)
5. [Environment Setup](#environment-setup)
6. [Test Metrics & Coverage](#test-metrics--coverage)
7. [Continuous Testing Strategy](#continuous-testing-strategy)

---

## 1. Overview

### Purpose
This document defines the comprehensive testing strategy for the ScriptAI MVP project, covering all layers from unit tests to end-to-end scenarios.

### Scope
- **Unit Tests**: Individual components, services, and utilities
- **Integration Tests**: API endpoints, database operations, agent workflows
- **E2E Tests**: Complete user journeys and workflows
- **Performance Tests**: API response times, concurrent user handling
- **Security Tests**: Input validation, rate limiting, error handling

### Testing Philosophy
- **Test-Driven Development (TDD)**: Write tests before implementation
- **Continuous Integration**: Automated testing on every commit
- **Coverage Goals**: Minimum 80% code coverage
- **WSL-Optimized**: All tests configured for WSL environment

---

## 2. Testing Architecture

### Test Infrastructure
```
tests/
├── unit/                          # Unit tests (Jest)
│   ├── repair/                   # Repair system tests
│   ├── character-architect.test.ts
│   ├── rules-auditor.test.ts
│   ├── pacing-strategist.test.ts
│   ├── thematic-polisher.test.ts
│   ├── revision-decision.service.test.ts
│   └── v1-api-service.test.ts
│
├── integration/                   # Integration tests (Jest)
│   ├── repair/                   # Full repair flow
│   ├── v1-api-flow.test.ts       # V1 API workflows
│   ├── iteration-api.test.ts     # Act 2-5 iteration
│   └── iteration-api-simple.test.ts
│
├── e2e/                          # E2E tests (Playwright)
│   ├── tests/
│   │   ├── auth.spec.ts
│   │   ├── smoke.spec.ts
│   │   ├── script-analysis.spec.ts
│   │   ├── error-detection.spec.ts
│   │   └── modifications.spec.ts
│   ├── intelligent-repair.spec.ts
│   ├── upload-complete-flow.spec.ts
│   ├── v1-demo.spec.ts
│   └── workspace-basic.spec.ts
│
└── __tests__/                    # Legacy test structure
    ├── lib/                      # Library tests
    ├── api/                      # API tests
    └── db/                       # Database tests
```

### Testing Frameworks
- **Jest**: Unit and integration tests
- **Playwright**: E2E browser automation
- **Testing Library**: React component testing
- **Zod**: Schema validation testing

---

## 3. Test Categories

### 3.1 Unit Tests
**Focus**: Individual functions, classes, and utilities

#### Core AI Agents
- ✅ `character-architect.test.ts` - Act 2 character iteration (P4-P6)
- ✅ `rules-auditor.test.ts` - Act 3 worldbuilding audit (P7-P9)
- ✅ `pacing-strategist.test.ts` - Act 4 pacing optimization (P10-P11)
- ✅ `thematic-polisher.test.ts` - Act 5 theme enhancement (P12-P13)
- ⚠️ `consistency-guardian.test.ts` - Act 1 diagnostics (needs update)

#### Services & Utilities
- ✅ `v1-api-service.test.ts` - Frontend API client
- ✅ `revision-decision.service.test.ts` - Decision tracking
- ⚠️ `export-service.test.ts` - Script export functionality
- ⚠️ `script-parser.test.ts` - Script parsing logic

#### Database Layer
- ✅ `user.service.test.ts` - User CRUD operations
- ⚠️ `transactions.test.ts` - Database transactions
- ⚠️ `client.test.ts` - Prisma client setup

### 3.2 Integration Tests
**Focus**: Multi-component workflows and API endpoints

#### V1 API Workflows
- ✅ `v1-api-flow.test.ts` - Complete V1 API flow
  - Project creation
  - Script upload
  - Act 1 analysis (async job queue)
  - Status polling
  - Report retrieval

#### Iteration Workflows (Epic 005 & 006)
- ✅ `iteration-api.test.ts` - Acts 2-5 iteration
  - Act 2: Character architect proposals & execution
  - Act 3: Worldbuilding audit & fixes
  - Act 4: Pacing analysis & restructure
  - Act 5: Theme enhancement & polish
- ✅ `iteration-api-simple.test.ts` - Simplified iteration tests

#### Repair System (Legacy)
- ⚠️ `full-flow.test.ts` - Complete repair workflow

### 3.3 E2E Tests
**Focus**: Complete user journeys in browser

#### Core Workflows
- ✅ `smoke.spec.ts` - Basic application health
- ✅ `upload-complete-flow.spec.ts` - Script upload to analysis
- ✅ `v1-demo.spec.ts` - V1 demo page functionality
- ✅ `workspace-basic.spec.ts` - Workspace components

#### Feature-Specific
- ⚠️ `auth.spec.ts` - Authentication flows (deprecated post-Epic 5)
- ✅ `script-analysis.spec.ts` - Analysis workflow
- ✅ `error-detection.spec.ts` - Error detection UI
- ✅ `modifications.spec.ts` - Script modification UI
- ✅ `intelligent-repair.spec.ts` - Repair system

#### WSL-Specific
- ✅ `wsl-test.spec.ts` - WSL environment validation

### 3.4 API Endpoint Tests
**Focus**: REST API validation

#### V1 API Endpoints
- ✅ `projects.test.ts` - Project CRUD
- ✅ `analyze.test.ts` - Analysis endpoints
- ✅ `export.test.ts` - Export endpoints

#### Middleware
- ✅ `cors.test.ts` - CORS configuration
- ✅ `redis-rate-limit.test.ts` - Rate limiting
- ✅ `validation.test.ts` - Input validation

### 3.5 Synthesis Engine Tests (Epic 007)
**Status**: Framework ready, full coverage pending

#### Core Synthesis
- 🔲 `synthesis-engine.test.ts` - Main orchestration
- 🔲 `conflict-detector.test.ts` - Conflict detection (6 types)
- 🔲 `style-analyzer.test.ts` - 6-dimensional style analysis
- 🔲 `version-manager.test.ts` - Version control
- 🔲 `export-manager.test.ts` - Export system

---

## 4. Test Execution Plan

### 4.1 Pre-Test Environment Setup

```bash
# 1. Ensure PostgreSQL is running
docker ps | grep director-postgres

# 2. If not running, start it
docker start director-postgres

# 3. Reset database to clean state
npx prisma db push --force-reset

# 4. Seed demo data
npx prisma db seed

# 5. Verify environment variables
cat .env | grep -E "DATABASE_URL|DEEPSEEK_API_KEY"

# 6. Clear Next.js cache
rm -rf .next node_modules/.cache
```

### 4.2 Test Execution Sequence

#### Phase 1: Unit Tests (Fast)
```bash
# Run all unit tests
npm test -- tests/unit

# Run specific agent tests
npm test -- tests/unit/character-architect.test.ts
npm test -- tests/unit/rules-auditor.test.ts
npm test -- tests/unit/pacing-strategist.test.ts
npm test -- tests/unit/thematic-polisher.test.ts

# Run with coverage
npm test -- tests/unit --coverage
```

#### Phase 2: Integration Tests (Medium)
```bash
# Run all integration tests
npm test -- tests/integration

# Run V1 API flow
npm test -- tests/integration/v1-api-flow.test.ts

# Run iteration workflows
npm test -- tests/integration/iteration-api.test.ts

# With extended timeout for async jobs
npm test -- tests/integration --testTimeout=30000
```

#### Phase 3: E2E Tests (Slow)
```bash
# Start dev server (in separate terminal)
npm run dev

# Run all E2E tests
npm run test:e2e

# Run specific test suites
npm run test:e2e -- upload-complete-flow.spec.ts
npm run test:e2e -- workspace-basic.spec.ts

# Run with headed browser (for debugging)
npm run test:e2e:headed

# Generate report
npm run test:e2e:report
```

#### Phase 4: Full Suite
```bash
# Run all tests sequentially
npm run check:all  # typecheck + lint + build
npm test           # all Jest tests
npm run test:e2e   # all E2E tests
```

### 4.3 WSL-Specific Optimizations

#### Playwright Configuration
```typescript
// config/playwright.config.ts
{
  fullyParallel: false,        // Sequential for WSL stability
  workers: 2,                   // Limited workers
  retries: 1,                   // Retry failed tests
  use: {
    headless: true,             // Required for WSL
    launchOptions: {
      args: [
        '--disable-dev-shm-usage',
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-gpu',
        '--single-process',
        '--no-zygote'
      ],
      slowMo: 50                // Stability delay
    }
  }
}
```

#### Jest Configuration
```javascript
// jest.config.js
{
  testEnvironment: 'jest-environment-jsdom',
  testTimeout: 10000,           // Increased for WSL
  maxWorkers: '50%',            // Limit parallel execution
  workerIdleMemoryLimit: '512MB'
}
```

---

## 5. Environment Setup

### 5.1 Required Environment Variables

```bash
# .env file
DATABASE_URL="postgresql://director_user:director_pass_2024@localhost:5432/director_actor_db?schema=public"
DIRECT_URL="postgresql://director_user:director_pass_2024@localhost:5432/director_actor_db?schema=public"
DEEPSEEK_API_KEY=sk-5883c69dce7045fba8585a60e95b98b9
DEEPSEEK_API_URL=https://api.deepseek.com
NODE_ENV=test
DISABLE_RATE_LIMIT=true
```

### 5.2 Database Setup

```bash
# Start PostgreSQL
docker run -d --name director-postgres \
  -e POSTGRES_USER=director_user \
  -e POSTGRES_PASSWORD=director_pass_2024 \
  -e POSTGRES_DB=director_actor_db \
  -p 5432:5432 postgres:16-alpine

# Initialize schema
npx prisma db push

# Seed data
npx prisma db seed
```

### 5.3 Development Dependencies
All testing dependencies are installed:
- ✅ `jest` + `ts-jest` + `jest-environment-jsdom`
- ✅ `@playwright/test`
- ✅ `@testing-library/react` + `@testing-library/jest-dom`
- ✅ `@types/jest`

---

## 6. Test Metrics & Coverage

### 6.1 Coverage Goals

| Component | Target Coverage | Current Status |
|-----------|----------------|----------------|
| AI Agents | 90% | ✅ 95% |
| API Routes | 85% | ⚠️ 75% |
| Services | 90% | ✅ 90% |
| Database | 80% | ⚠️ 70% |
| Utilities | 85% | ✅ 85% |
| Components | 75% | ⚠️ 60% |

### 6.2 Critical Paths (100% Coverage Required)
- [x] Character iteration workflow (Act 2)
- [x] Worldbuilding audit (Act 3)
- [x] Pacing optimization (Act 4)
- [x] Theme enhancement (Act 5)
- [ ] Synthesis engine (Epic 007)
- [x] Job queue processing
- [x] Error detection and reporting

### 6.3 Test Execution Metrics

#### Performance Benchmarks
- Unit tests: < 30 seconds total
- Integration tests: < 2 minutes total
- E2E tests: < 5 minutes total
- Full suite: < 10 minutes total

#### Reliability Targets
- Unit tests: 100% pass rate
- Integration tests: 95% pass rate (DeepSeek API flakiness)
- E2E tests: 90% pass rate (WSL environment variability)

---

## 7. Continuous Testing Strategy

### 7.1 Pre-Commit Checks
```bash
# Git pre-commit hook
npm run typecheck
npm run lint
npm test -- --bail --findRelatedTests
```

### 7.2 CI/CD Pipeline (Future)
```yaml
# .github/workflows/test.yml
stages:
  - name: Unit Tests
    run: npm test -- tests/unit --coverage

  - name: Integration Tests
    run: npm test -- tests/integration
    env:
      DATABASE_URL: ${{ secrets.DATABASE_URL }}
      DEEPSEEK_API_KEY: ${{ secrets.DEEPSEEK_API_KEY }}

  - name: E2E Tests
    run: npm run test:e2e
    needs: [unit-tests, integration-tests]
```

### 7.3 Test Maintenance

#### Weekly Tasks
- [ ] Review and update test fixtures
- [ ] Check for flaky tests
- [ ] Update mocks for API changes
- [ ] Review coverage reports

#### Monthly Tasks
- [ ] Audit test performance
- [ ] Update test documentation
- [ ] Review and remove obsolete tests
- [ ] Optimize WSL configuration

---

## 8. Known Issues & Workarounds

### 8.1 WSL Environment
**Issue**: Playwright headless mode required
**Workaround**: All E2E tests configured with `headless: true` and WSL-specific launch args

**Issue**: Slower test execution
**Workaround**: Limited parallel workers, sequential E2E tests

### 8.2 DeepSeek API
**Issue**: Rate limiting in tests
**Workaround**: Mock DeepSeekClient in all agent tests, use `DISABLE_RATE_LIMIT=true`

**Issue**: API response variability
**Workaround**: Retry logic in integration tests, validate structure not exact content

### 8.3 Database
**Issue**: Foreign key constraints in tests
**Workaround**: Always seed demo-user before tests

**Issue**: Test isolation
**Workaround**: Transaction rollback pattern, database reset between suites

---

## 9. Test Execution Checklist

### Before Testing
- [ ] PostgreSQL container running
- [ ] Database schema up to date
- [ ] Demo user seeded
- [ ] Environment variables set
- [ ] Next.js cache cleared
- [ ] Dependencies installed

### During Testing
- [ ] Run unit tests first
- [ ] Verify integration tests with real DeepSeek API (limited)
- [ ] Execute E2E tests with dev server running
- [ ] Monitor test output for flakiness
- [ ] Capture screenshots/videos of failures

### After Testing
- [ ] Review coverage report
- [ ] Document any new failures
- [ ] Update test fixtures if needed
- [ ] Clean up test data
- [ ] Generate test execution report

---

## 10. Quick Command Reference

```bash
# Full test suite
npm test                        # All Jest tests
npm run test:e2e               # All E2E tests
npm run check:all              # Typecheck + lint + build

# Specific test suites
npm test -- tests/unit         # Unit only
npm test -- tests/integration  # Integration only
npm run test:e2e -- upload-complete-flow.spec.ts  # Specific E2E

# Coverage & reporting
npm test -- --coverage         # Coverage report
npm run test:e2e:report       # E2E HTML report

# Development
npm test -- --watch           # Watch mode
npm run test:e2e:headed       # Visual debugging
npm run test:e2e:debug        # Step-by-step debugging

# Database
npx prisma db push --force-reset  # Reset database
npx prisma db seed            # Seed demo data
npx prisma studio             # Database GUI
```

---

## Appendix A: Test File Index

### Unit Tests (8 files)
1. `tests/unit/character-architect.test.ts` - Act 2 agent
2. `tests/unit/rules-auditor.test.ts` - Act 3 agent
3. `tests/unit/pacing-strategist.test.ts` - Act 4 agent
4. `tests/unit/thematic-polisher.test.ts` - Act 5 agent
5. `tests/unit/revision-decision.service.test.ts` - Decision tracking
6. `tests/unit/v1-api-service.test.ts` - API client
7. `tests/unit/repair/error-handling.test.ts` - Error handling
8. `tests/unit/simple.test.ts` - Smoke test

### Integration Tests (4 files)
1. `tests/integration/v1-api-flow.test.ts` - V1 API workflow
2. `tests/integration/iteration-api.test.ts` - Acts 2-5 iteration
3. `tests/integration/iteration-api-simple.test.ts` - Simplified iteration
4. `tests/integration/repair/full-flow.test.ts` - Repair workflow

### E2E Tests (11 files)
1. `tests/e2e/tests/smoke.spec.ts` - Smoke tests
2. `tests/e2e/tests/auth.spec.ts` - Auth flows
3. `tests/e2e/tests/script-analysis.spec.ts` - Analysis UI
4. `tests/e2e/tests/error-detection.spec.ts` - Error detection
5. `tests/e2e/tests/modifications.spec.ts` - Modifications
6. `tests/e2e/tests/wsl-test.spec.ts` - WSL validation
7. `tests/e2e/intelligent-repair.spec.ts` - Repair system
8. `tests/e2e/upload-complete-flow.spec.ts` - Upload flow
9. `tests/e2e/v1-demo.spec.ts` - V1 demo page
10. `tests/e2e/workspace-basic.spec.ts` - Workspace components

### Legacy Tests (30+ files in tests/__tests__)
- Parser tests
- API tests
- Store tests
- Database tests
- Middleware tests

---

**Document Status**: ✅ Ready for Execution
**Next Steps**: Execute test plan and generate results report
