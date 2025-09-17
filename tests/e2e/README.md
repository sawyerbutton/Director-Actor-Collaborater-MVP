# E2E Testing Guide for ScriptAI MVP

## 🚀 Quick Start

### Prerequisites for WSL

1. **Install system dependencies** (run in WSL terminal):
```bash
sudo apt-get update
sudo apt-get install -y \
  libnss3 libnspr4 libdbus-1-3 libatk1.0-0 \
  libatk-bridge2.0-0 libcups2 libdrm2 \
  libxkbcommon0 libatspi2.0-0 libxcomposite1 \
  libxdamage1 libxfixes3 libxrandr2 \
  libgbm1 libasound2 libxcb1
```

2. **Verify Playwright installation**:
```bash
npx playwright --version
```

### Running E2E Tests

#### Option 1: Manual Server Start (Recommended for WSL)

1. **Start the development server** in Terminal 1:
```bash
npm run dev
```
Wait until you see: `✓ Ready in X.Xs`

2. **Run tests** in Terminal 2:
```bash
# Run all tests
npm run test:e2e

# Run specific test file
npx playwright test auth.spec.ts

# Run tests with specific tag
npx playwright test --grep "P0"

# Run in headed mode (see browser)
npm run test:e2e:headed
```

#### Option 2: Automatic Server Start

Uncomment the `webServer` section in `playwright.config.ts` and run:
```bash
npm run test:e2e
```

### Viewing Test Results

```bash
# Open HTML report
npm run test:e2e:report

# Open Playwright UI
npm run test:e2e:ui
```

## 📁 Project Structure

```
e2e/
├── tests/              # Test files
│   ├── auth.spec.ts   # Authentication tests (P0)
│   ├── smoke.spec.ts  # Basic smoke tests
│   └── ...
├── fixtures/          # Test data
│   └── test-data.ts
├── helpers/           # Test utilities
│   └── test-helpers.ts
├── data/             # Test files (scripts, etc.)
├── screenshots/      # Test screenshots
└── README.md         # This file
```

## 🧪 Test Scenarios

### Priority Levels
- **P0**: Critical path tests (must pass for release)
- **P1**: Important features (should pass)
- **P2**: Nice-to-have features (can be deferred)

### Implemented Tests

#### Authentication (8 tests)
- ✅ E2E-AUTH-001: New user registration
- ✅ E2E-AUTH-002: User login
- ✅ E2E-AUTH-003: Invalid login handling
- ✅ E2E-AUTH-005: Logout flow
- ✅ E2E-AUTH-008: Protected route access
- ⏩ E2E-AUTH-004: Session timeout (P1)
- ⏩ E2E-AUTH-006: Password reset (P1)
- ⏩ E2E-AUTH-007: Concurrent sessions (P2)

### Test Data

Test data is managed in `e2e/fixtures/test-data.ts`:
- User credentials
- Sample scripts (Chinese/English)
- Scripts with known errors
- Expected error types
- Performance benchmarks

## 🔧 Troubleshooting

### Common Issues in WSL

#### 1. Browser Launch Failures
```bash
# Error: Failed to launch browser
# Solution: Install missing dependencies
sudo apt-get install -y chromium-browser
```

#### 2. Display Issues
```bash
# Set display variable
export DISPLAY=:0
```

#### 3. Permission Issues
```bash
# Fix Playwright cache permissions
chmod -R 755 ~/.cache/ms-playwright
```

#### 4. Timeout Issues
- Increase timeout in `playwright.config.ts`
- Check if dev server is running: `curl http://localhost:3000`
- Check server logs in Terminal 1

### Debug Mode

Run tests in debug mode to troubleshoot:
```bash
# Debug mode with Playwright Inspector
npm run test:e2e:debug

# With verbose logging
DEBUG=pw:api npx playwright test
```

## 📊 Test Coverage Goals

### MVP Release Criteria
- [ ] All P0 tests passing (20 scenarios)
- [ ] <10 second analysis performance validated
- [ ] No data loss scenarios
- [ ] Security tests passing (CSRF/XSS)

### Current Status
- ✅ Test framework setup complete
- ✅ Authentication tests implemented
- ⏳ Script analysis tests pending
- ⏳ Modification workflow tests pending
- ⏳ Performance tests pending

## 🚦 CI/CD Integration

### GitHub Actions (Future)
```yaml
name: E2E Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run test:e2e
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

## 📝 Writing New Tests

### Test Template
```typescript
import { test, expect } from '@playwright/test';
import { testData } from '../fixtures/test-data';

test.describe('Feature Name', () => {
  test('P0: should do something critical', async ({ page }) => {
    // Arrange
    await page.goto('/');
    
    // Act
    await page.click('[data-testid="element"]');
    
    // Assert
    await expect(page).toHaveURL('/expected-url');
  });
});
```

### Best Practices
1. Use `data-testid` attributes for element selection
2. Group related tests with `test.describe`
3. Use priority tags (P0, P1, P2) in test names
4. Keep tests atomic and independent
5. Use fixtures for test data
6. Add meaningful assertions

## 🔗 Resources

- [Playwright Documentation](https://playwright.dev)
- [WSL Setup Guide](https://docs.microsoft.com/en-us/windows/wsl/)
- [Project Test Design](../docs/qa/assessments/mvp-e2e-test-design-20250109.md)

## 📞 Support

If you encounter issues:
1. Check this troubleshooting guide
2. Review server logs
3. Run tests in debug mode
4. Check the quality gate assessment at `docs/qa/gates/`

---

**Last Updated**: 2025-01-09
**Test Architect**: Quinn (QA)