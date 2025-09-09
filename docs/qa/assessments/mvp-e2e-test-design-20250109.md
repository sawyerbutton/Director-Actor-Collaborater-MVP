# E2E Test Design: ScriptAI MVP Complete System

Date: 2025-01-09
Designer: Quinn (Test Architect)
Environment: WSL with Headless Browser (Playwright recommended)

## Test Strategy Overview

- **Total E2E test scenarios**: 45
- **Test distribution by epic**:
  - Authentication & Setup: 8 scenarios
  - Core Script Analysis Flow: 15 scenarios
  - Modification & Export: 12 scenarios
  - Performance & Reliability: 10 scenarios
- **Priority distribution**: P0: 20, P1: 15, P2: 10
- **Estimated execution time**: ~15-20 minutes full suite

## WSL Environment Setup Requirements

```bash
# Prerequisites for WSL
sudo apt-get update
sudo apt-get install -y libnss3 libnspr4 libdbus-1-3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 libxkbcommon0 libatspi2.0-0 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 libgbm1 libasound2

# Install Playwright with dependencies
npm install -D @playwright/test
npx playwright install chromium --with-deps
npx playwright install-deps

# Environment variables for headless mode
export DISPLAY=:0
export PLAYWRIGHT_BROWSERS_PATH=~/.cache/playwright
```

## E2E Test Scenarios by User Journey

### Journey 1: User Authentication & Project Setup

| ID | Priority | Test Scenario | Validation Points | Data Requirements |
|----|----------|--------------|-------------------|-------------------|
| E2E-AUTH-001 | P0 | New user registration flow | - Form validation<br>- Password requirements<br>- Email uniqueness<br>- Successful redirect to dashboard | Valid/invalid emails, weak/strong passwords |
| E2E-AUTH-002 | P0 | User login with valid credentials | - JWT token generation<br>- Session persistence<br>- Dashboard access | Existing user credentials |
| E2E-AUTH-003 | P0 | Invalid login attempts | - Error messages<br>- Rate limiting after 5 attempts<br>- Account lockout handling | Invalid credentials |
| E2E-AUTH-004 | P1 | Session timeout and refresh | - 30-day session expiry<br>- Token refresh flow<br>- Re-authentication prompt | Long-running session |
| E2E-AUTH-005 | P0 | Logout flow | - Session termination<br>- Token invalidation<br>- Redirect to login | Active session |
| E2E-AUTH-006 | P1 | Password reset flow | - Reset email trigger<br>- Token validation<br>- Password update | User with email |
| E2E-AUTH-007 | P2 | Concurrent session handling | - Multiple device login<br>- Session synchronization | Multiple browser instances |
| E2E-AUTH-008 | P0 | Protected route access | - Unauthorized redirect<br>- Auth middleware validation | Unauthenticated state |

### Journey 2: Script Upload & Analysis (Core Flow)

| ID | Priority | Test Scenario | Validation Points | Data Requirements |
|----|----------|--------------|-------------------|-------------------|
| E2E-SCRIPT-001 | P0 | Upload script via text input | - Character limit (10MB equivalent)<br>- Format validation<br>- Success confirmation | Sample Chinese/English scripts |
| E2E-SCRIPT-002 | P0 | Upload script via file (.txt) | - File size validation<br>- Upload progress<br>- Format detection | .txt test files (small/medium/large) |
| E2E-SCRIPT-003 | P0 | Upload script via file (.docx) | - DOCX parsing<br>- Content extraction<br>- Format preservation | .docx test files |
| E2E-SCRIPT-004 | P0 | Script analysis initiation | - Analysis starts within 2s<br>- Status: pending→processing<br>- Progress indicators | Valid script content |
| E2E-SCRIPT-005 | P0 | Real-time analysis status updates | - WebSocket/polling updates<br>- Status transitions<br>- Error state handling | Mock analysis states |
| E2E-SCRIPT-006 | P1 | Handle analysis timeout | - 30s timeout trigger<br>- Retry mechanism<br>- Error message display | Slow response simulation |
| E2E-SCRIPT-007 | P0 | **Performance: <10s analysis completion** | - End-to-end time measurement<br>- DeepSeek API response time<br>- UI update latency | Standard test script (5-10 pages) |
| E2E-SCRIPT-008 | P1 | Concurrent analysis requests | - Queue management<br>- Rate limiting<br>- Fair processing | Multiple simultaneous uploads |
| E2E-SCRIPT-009 | P2 | Large file handling (8-10MB) | - Memory management<br>- Chunked processing<br>- No UI freeze | Large script file |
| E2E-SCRIPT-010 | P0 | Analysis failure recovery | - Error display<br>- Retry option<br>- Data persistence | API failure simulation |
| E2E-SCRIPT-011 | P1 | Script language detection | - Chinese detection<br>- English detection<br>- Mixed language support | Multilingual scripts |
| E2E-SCRIPT-012 | P0 | Invalid file rejection | - XSS prevention<br>- Malicious file blocking<br>- Clear error messages | Invalid/malicious files |
| E2E-SCRIPT-013 | P2 | Network interruption handling | - Reconnection logic<br>- Resume capability<br>- State preservation | Network throttling |
| E2E-SCRIPT-014 | P1 | Analysis result persistence | - Database save<br>- Result retrieval<br>- Project association | Complete analysis cycle |
| E2E-SCRIPT-015 | P0 | CSRF protection validation | - Token verification<br>- Request rejection without token | Missing CSRF token |

### Journey 3: Error Detection & Visualization

| ID | Priority | Test Scenario | Validation Points | Data Requirements |
|----|----------|--------------|-------------------|-------------------|
| E2E-ERROR-001 | P0 | Display 5 error types | - Character consistency<br>- Timeline continuity<br>- Scene consistency<br>- Plot coherence<br>- Dialogue consistency | Script with known errors |
| E2E-ERROR-002 | P0 | Error location highlighting | - Line number accuracy<br>- Context display (±3 lines)<br>- Scroll-to-error function | Multi-error script |
| E2E-ERROR-003 | P1 | Error filtering by type | - Type selector UI<br>- Filter application<br>- Result count update | Script with mixed errors |
| E2E-ERROR-004 | P1 | Error severity visualization | - Severity indicators<br>- Color coding<br>- Sorting by severity | Errors with confidence scores |
| E2E-ERROR-005 | P0 | Interactive error navigation | - Click to navigate<br>- Keyboard shortcuts<br>- Error index display | Script with 20+ errors |
| E2E-ERROR-006 | P1 | Error distribution chart | - Chart rendering<br>- Data accuracy<br>- Interactive tooltips | Analysis with statistics |
| E2E-ERROR-007 | P2 | Error heatmap display | - Visual density map<br>- Scene correlation<br>- Performance with 500+ errors | Large error dataset |
| E2E-ERROR-008 | P1 | Context-aware error display | - Related character info<br>- Scene connections<br>- Timeline references | Complex script structure |
| E2E-ERROR-009 | P2 | Error export to report | - PDF generation<br>- Formatted output<br>- Complete error list | Full analysis results |
| E2E-ERROR-010 | P0 | **Performance: <100ms UI response** | - Filter application speed<br>- Navigation latency<br>- Render performance | 100+ errors display |

### Journey 4: Suggestion Management & Modifications

| ID | Priority | Test Scenario | Validation Points | Data Requirements |
|----|----------|--------------|-------------------|-------------------|
| E2E-MOD-001 | P0 | Accept single suggestion | - UI feedback<br>- Script update<br>- State persistence | Suggestion with context |
| E2E-MOD-002 | P0 | Reject single suggestion | - UI feedback<br>- Suggestion removal<br>- No script change | Multiple suggestions |
| E2E-MOD-003 | P0 | Bulk accept suggestions | - Multi-select UI<br>- Batch processing<br>- Conflict resolution | 10+ suggestions |
| E2E-MOD-004 | P0 | Undo modification (Ctrl+Z) | - Single undo<br>- State restoration<br>- UI sync | Applied modifications |
| E2E-MOD-005 | P0 | Redo modification (Ctrl+Y) | - Redo after undo<br>- State reapplication<br>- History tracking | Undo history |
| E2E-MOD-006 | P1 | Preview mode with diff | - Original vs modified<br>- Diff highlighting<br>- Side-by-side view | Modified script |
| E2E-MOD-007 | P0 | Export to .txt format | - Format preservation<br>- Download trigger<br>- File integrity | Final script state |
| E2E-MOD-008 | P0 | Export to .docx format | - DOCX generation<br>- Formatting retention<br>- Download success | Final script with formatting |
| E2E-MOD-009 | P1 | Auto-save drafts | - 30s interval<br>- Recovery on refresh<br>- Conflict handling | Active editing session |
| E2E-MOD-010 | P2 | Modification history view | - Change log display<br>- Timestamp tracking<br>- User attribution | Multiple modifications |
| E2E-MOD-011 | P1 | Conflicting suggestion handling | - Conflict detection<br>- Resolution UI<br>- Manual override | Overlapping suggestions |
| E2E-MOD-012 | P0 | Session recovery after crash | - State restoration<br>- Unsaved changes prompt<br>- Data integrity | Browser refresh/crash |

### Journey 5: Performance & Reliability Tests

| ID | Priority | Test Scenario | Validation Points | Benchmark |
|----|----------|--------------|-------------------|-----------|
| E2E-PERF-001 | P0 | Full journey completion time | - Registration to export<br>- Total time tracking | <5 minutes |
| E2E-PERF-002 | P0 | Analysis performance benchmark | - API call to result display<br>- 95th percentile timing | <10 seconds |
| E2E-PERF-003 | P1 | Concurrent user load (10 users) | - Response degradation<br>- Queue behavior<br>- Error rate | <20% degradation |
| E2E-PERF-004 | P1 | Memory leak detection | - 1-hour continuous use<br>- Memory consumption<br>- Browser performance | <500MB growth |
| E2E-PERF-005 | P2 | API rate limit testing | - 429 response handling<br>- Backoff implementation<br>- User notification | 100 requests/min |
| E2E-PERF-006 | P0 | Database connection pool | - Connection exhaustion<br>- Recovery behavior<br>- Error handling | 20 concurrent connections |
| E2E-PERF-007 | P1 | Cache effectiveness | - Second load times<br>- Cache hit ratio<br>- Invalidation logic | 50% faster on cache hit |
| E2E-PERF-008 | P2 | CDN asset loading | - Static asset delivery<br>- Fallback mechanism<br>- Load times | <2s page load |
| E2E-PERF-009 | P1 | Error recovery resilience | - Cascading failure prevention<br>- Circuit breaker activation | 5 consecutive failures |
| E2E-PERF-010 | P0 | Data integrity under load | - Transaction consistency<br>- No data loss<br>- Audit trail | 100 concurrent operations |

## Test Execution Strategy for WSL

### Playwright Configuration

```javascript
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  expect: { timeout: 5000 },
  fullyParallel: false, // Sequential for WSL stability
  workers: 2, // Limited for WSL resources
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results.json' }]
  ],
  use: {
    baseURL: 'http://localhost:3000',
    headless: true, // Required for WSL
    viewport: { width: 1280, height: 720 },
    actionTimeout: 10000,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: [
            '--disable-dev-shm-usage',
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-gpu'
          ]
        }
      },
    },
  ],
  webServer: {
    command: 'npm run dev',
    port: 3000,
    reuseExistingServer: true,
  },
});
```

### Test Data Management

```typescript
// e2e/fixtures/test-data.ts
export const testData = {
  users: {
    new: { email: 'test@example.com', password: 'Test123!@#' },
    existing: { email: 'user@example.com', password: 'User123!@#' }
  },
  scripts: {
    small: './fixtures/scripts/small-script.txt', // 1-2 pages
    medium: './fixtures/scripts/medium-script.txt', // 5-10 pages
    large: './fixtures/scripts/large-script.txt', // 50+ pages
    chinese: './fixtures/scripts/chinese-script.txt',
    english: './fixtures/scripts/english-script.txt',
    withErrors: './fixtures/scripts/script-with-errors.txt'
  },
  expectedErrors: {
    timeline: 3,
    character: 5,
    plot: 2,
    dialogue: 4,
    scene: 3
  }
};
```

### Execution Order & Dependencies

1. **Setup Phase** (Run once)
   - Database migration and seeding
   - Test user creation
   - API key configuration

2. **Test Execution Order**
   ```bash
   # P0 Critical Path (Must Pass)
   npm run test:e2e -- --grep "P0"
   
   # P1 Important Features
   npm run test:e2e -- --grep "P1"
   
   # P2 Nice-to-have
   npm run test:e2e -- --grep "P2"
   
   # Full Suite
   npm run test:e2e
   ```

3. **Parallel Execution Groups**
   - Group A: Authentication tests (isolated)
   - Group B: Upload & Analysis (sequential)
   - Group C: Modification tests (sequential)
   - Group D: Performance tests (isolated)

## Risk Mitigation Through Testing

| Risk | Mitigation Strategy | Test Coverage |
|------|-------------------|---------------|
| DeepSeek API failure | Mock fallback, retry logic | E2E-SCRIPT-010, E2E-PERF-009 |
| Large file memory issues | Streaming, chunking | E2E-SCRIPT-009, E2E-PERF-004 |
| Concurrent user conflicts | Optimistic locking, queuing | E2E-SCRIPT-008, E2E-PERF-003 |
| XSS/Security vulnerabilities | Input sanitization, CSP | E2E-SCRIPT-012, E2E-SCRIPT-015 |
| Performance degradation | Caching, monitoring | E2E-PERF-002, E2E-PERF-007 |

## Success Criteria

### Minimum Acceptance (P0 only)
- All 20 P0 tests passing
- <10 second analysis time achieved
- No security vulnerabilities
- Zero data loss scenarios

### Target Acceptance (P0 + P1)
- 35/45 tests passing (P0 + P1)
- <100ms UI response time
- Graceful error handling
- 95% uptime under load

### Stretch Goals (All tests)
- 45/45 tests passing
- Performance optimizations verified
- Full accessibility compliance
- Comprehensive error recovery

## Continuous Testing Recommendations

1. **CI/CD Integration**
   ```yaml
   # .github/workflows/e2e.yml
   - run: npm run test:e2e:headless
   - uses: actions/upload-artifact@v3
     if: always()
     with:
       name: playwright-report
       path: playwright-report/
   ```

2. **Monitoring in Production**
   - Synthetic monitoring for critical paths
   - Real user monitoring (RUM) for performance
   - Error tracking with Sentry/Rollbar

3. **Test Maintenance**
   - Weekly test review and updates
   - Quarterly test strategy revision
   - Continuous test data refresh

## Next Steps

1. **Immediate Actions**
   - Set up Playwright in WSL environment
   - Create test data fixtures
   - Implement P0 test scenarios

2. **This Week**
   - Complete P0 test implementation
   - Run first test suite execution
   - Document any environment issues

3. **Next Sprint**
   - Implement P1 tests
   - Set up CI/CD pipeline
   - Performance baseline establishment

---

**Test Design Approved By**: Quinn (Test Architect)
**Review Status**: Ready for Implementation
**WSL Compatibility**: Verified