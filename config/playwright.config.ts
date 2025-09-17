import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E Test Configuration for ScriptAI MVP
 * Optimized for WSL environment with headless Chromium
 */
export default defineConfig({
  // Test directory
  testDir: '../tests/e2e',

  // Test execution settings
  timeout: 60000, // 60 seconds per test (increased for stability)
  expect: { 
    timeout: 10000 // 10 seconds for assertions (increased for WSL)
  },
  
  // Parallel execution settings (limited for WSL)
  fullyParallel: false, // Sequential for WSL stability
  workers: 2, // Limited workers for WSL resources
  retries: 1, // Retry failed tests once
  
  // Reporter configuration
  reporter: [
    ['html', { outputFolder: '../tests/results/playwright-report' }],
    ['json', { outputFile: '../tests/results/test-results.json' }],
    ['list'] // Console output
  ],
  
  // Shared settings for all browsers
  use: {
    // Base URL for the application
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    
    // Browser settings
    headless: true, // Required for WSL
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,
    
    // Action settings
    actionTimeout: 10000,
    navigationTimeout: 30000,
    
    // Screenshot and video settings
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
    
    // Custom test attributes
    testIdAttribute: 'data-testid',
  },
  
  // Browser configurations
  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        // WSL-specific launch options
        launchOptions: {
          args: [
            '--disable-dev-shm-usage',
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-gpu',
            '--disable-web-security',
            '--disable-features=IsolateOrigins',
            '--disable-site-isolation-trials',
            '--single-process',
            '--no-zygote',
            '--disable-blink-features=AutomationControlled'
          ],
          slowMo: 50, // Add small delay for WSL stability
        },
      },
    },
    // Uncomment to add more browsers later
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
  ],
  
  // Local dev server configuration
  webServer: {
    command: 'npm run dev',
    port: 3000,
    timeout: 120 * 1000, // 2 minutes to start
    reuseExistingServer: !process.env.CI,
    stdout: 'pipe',
    stderr: 'pipe',
    env: {
      // Ensure proper environment variables are set
      ...process.env,
      NODE_ENV: 'test',
    },
  },
});