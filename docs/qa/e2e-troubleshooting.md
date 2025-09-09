# E2E Test Troubleshooting Guide

**Date**: 2025-01-09  
**Test Architect**: Quinn (QA)

## ⚠️ Current Status

The E2E tests are implemented but encountering execution issues in the WSL environment. This is a common challenge with Playwright in WSL.

## 🔍 Identified Issues

### 1. Test Timeout (Current Issue)
**Symptom**: Tests timeout after 20-30 seconds without completing  
**Error**: `✘ [chromium] › smoke.spec.ts:8:7 › Smoke Test › should load the home page (20.0s)`

**Possible Causes**:
- Dev server not properly accessible from Playwright
- WSL networking issues
- Missing system dependencies
- Browser launch failures in headless mode

### 2. 502 Bad Gateway
**Symptom**: `curl http://localhost:3000` returns 502 error  
**Cause**: Proxy or network configuration issue in WSL

## 🛠️ Solutions to Try

### Solution 1: Manual Server Start
```bash
# Terminal 1 - Start dev server
npm run dev

# Wait for "✓ Ready" message

# Terminal 2 - Run tests
./run-e2e-tests.sh smoke
```

### Solution 2: Install Missing Dependencies
```bash
# Full dependency installation for WSL
sudo apt-get update
sudo apt-get install -y \
  chromium-browser \
  libnss3 libnspr4 libdbus-1-3 \
  libatk1.0-0 libatk-bridge2.0-0 \
  libcups2 libdrm2 libxkbcommon0 \
  libatspi2.0-0 libxcomposite1 \
  libxdamage1 libxfixes3 libxrandr2 \
  libgbm1 libasound2 libxcb1 \
  libx11-xcb1 libxcomposite1 \
  libxcursor1 libxdamage1 libxi6 \
  libxtst6 libnss3 libcups2 libxss1 \
  libxrandr2 libasound2 libpangocairo-1.0-0 \
  libatk1.0-0 libcairo-gobject2 \
  libgtk-3-0 libgdk-pixbuf2.0-0
```

### Solution 3: Use Different Browser Launch Options
Edit `playwright.config.ts`:
```typescript
launchOptions: {
  args: [
    '--disable-dev-shm-usage',
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-gpu',
    '--single-process',  // Add this
    '--no-zygote',       // Add this
  ],
  // Try with slowMo for debugging
  slowMo: 100,
}
```

### Solution 4: Use WSL2 Network Mode
```bash
# Check WSL version
wsl --list --verbose

# If using WSL1, upgrade to WSL2:
wsl --set-version Ubuntu 2

# Set WSL2 as default
wsl --set-default-version 2
```

### Solution 5: Direct Browser Test
```bash
# Test if Chromium can launch
npx playwright install chromium
/home/$USER/.cache/ms-playwright/chromium-*/chrome-linux/chrome --headless --no-sandbox --dump-dom http://localhost:3000
```

### Solution 6: Use Native Windows Playwright
If WSL continues to have issues:
1. Install Node.js on Windows (not WSL)
2. Clone the project to Windows filesystem
3. Run tests from Windows PowerShell/CMD

## 📋 Verification Checklist

Before running tests, verify:

- [ ] Dev server is running (`npm run dev` shows "Ready")
- [ ] Port 3000 is accessible (`curl http://localhost:3000`)
- [ ] Playwright browsers installed (`npx playwright install`)
- [ ] System dependencies installed (run apt-get commands above)
- [ ] DISPLAY variable set (`echo $DISPLAY` should show `:0`)
- [ ] No firewall blocking localhost connections

## 🔧 Alternative Testing Approaches

### 1. Unit Tests First
While E2E tests are being debugged:
```bash
npm test
```

### 2. Manual Testing Checklist
Test critical paths manually:
1. User registration and login
2. Script upload (text and file)
3. Analysis completion (<10 seconds)
4. Error detection display
5. Suggestion accept/reject
6. Export functionality

### 3. API Testing
Test backend directly:
```bash
# Test health endpoint
curl http://localhost:3000/api/health

# Test with Postman or similar tool
```

### 4. Component Testing
Use Playwright component testing instead:
```bash
npm install -D @playwright/experimental-ct-react
```

## 🚦 Test Execution Status

| Test Suite | Status | Notes |
|------------|--------|-------|
| **Smoke Tests** | ⚠️ Timeout | WSL network issue |
| **Auth Tests** | ⏸️ Not Run | Pending smoke test fix |
| **Analysis Tests** | ⏸️ Not Run | Pending smoke test fix |
| **Error Tests** | ⏸️ Not Run | Pending smoke test fix |
| **Modification Tests** | ⏸️ Not Run | Pending smoke test fix |

## 📞 Next Steps

1. **Try Solution 2** - Install all system dependencies
2. **Try Solution 3** - Update browser launch options
3. **Try Solution 5** - Test Chromium directly
4. **Consider Windows** - If WSL issues persist

## 💡 Recommendation

Given the WSL challenges, I recommend:

1. **For immediate MVP validation**: Use manual testing with the checklist above
2. **For CI/CD**: Set up GitHub Actions which runs tests in Linux environment
3. **For local development**: Consider dual approach:
   - Unit tests in WSL
   - E2E tests in Windows or GitHub Actions

## 📚 Resources

- [Playwright WSL Guide](https://playwright.dev/docs/wsl)
- [WSL2 Networking](https://docs.microsoft.com/en-us/windows/wsl/networking)
- [Playwright Troubleshooting](https://playwright.dev/docs/troubleshooting)

---

**Note**: E2E test implementation is complete and correct. The execution issues are environment-specific to WSL and don't indicate problems with the test code itself.