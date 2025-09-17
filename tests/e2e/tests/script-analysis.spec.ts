import { test, expect, type Page } from '@playwright/test';
import { testData, wait } from '../fixtures/test-data';
import { loginUser, uploadScript, waitForAnalysisComplete, measurePerformance } from '../helpers/test-helpers';

/**
 * E2E-SCRIPT-001 to E2E-SCRIPT-015: Script Upload & Analysis Tests
 * Priority: P0-P2
 * These tests validate the core script analysis functionality
 */

test.describe('Script Upload & Analysis', () => {
  let page: Page;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    // Login before each test
    await loginUser(page);
  });

  /**
   * E2E-SCRIPT-001: Upload script via text input
   * Priority: P0
   * Validates: Character limit, format validation, success confirmation
   */
  test('P0: should upload script via text input', async () => {
    // Navigate to new analysis
    await page.click('[data-testid="new-analysis"]');
    await expect(page).toHaveURL(/\/(analysis|upload|new)/);

    // Test with small Chinese script
    await page.fill('[data-testid="script-input"]', testData.scripts.smallChinese);
    
    // Verify character count
    const charCount = await page.locator('[data-testid="char-count"]').textContent();
    expect(charCount).toContain(testData.scripts.smallChinese.length.toString());

    // Submit script
    await page.click('[data-testid="analyze-button"]');
    
    // Wait for analysis to start
    await expect(page.locator('[data-testid="analysis-status"]')).toContainText(/pending|processing/i, {
      timeout: 5000
    });

    // Verify success message
    await expect(page.locator('[data-testid="upload-success"]')).toBeVisible({ timeout: 10000 });
  });

  /**
   * E2E-SCRIPT-002: Upload script via file (.txt)
   * Priority: P0
   * Validates: File size validation, upload progress, format detection
   */
  test('P0: should upload script via text file', async () => {
    await page.click('[data-testid="new-analysis"]');

    // Create a test file
    const fileName = 'test-script.txt';
    const fileContent = testData.scripts.smallEnglish;
    
    // Switch to file upload tab
    await page.click('[data-testid="upload-tab-file"]');

    // Upload file
    const fileInput = page.locator('[data-testid="file-input"]');
    await fileInput.setInputFiles({
      name: fileName,
      mimeType: 'text/plain',
      buffer: Buffer.from(fileContent)
    });

    // Verify file info display
    await expect(page.locator('[data-testid="file-name"]')).toContainText(fileName);
    await expect(page.locator('[data-testid="file-size"]')).toBeVisible();

    // Submit for analysis
    await page.click('[data-testid="analyze-button"]');
    
    // Verify upload started
    await expect(page.locator('[data-testid="analysis-status"]')).toBeVisible({ timeout: 5000 });
  });

  /**
   * E2E-SCRIPT-003: Upload script via file (.docx)
   * Priority: P0
   * Validates: DOCX parsing, content extraction, format preservation
   */
  test('P0: should upload script via DOCX file', async () => {
    await page.click('[data-testid="new-analysis"]');
    await page.click('[data-testid="upload-tab-file"]');

    // Create a mock DOCX file
    const fileName = 'test-script.docx';
    const fileContent = testData.scripts.smallChinese;
    
    // Note: In real implementation, you'd use a proper DOCX file
    // For testing, we'll simulate with appropriate MIME type
    const fileInput = page.locator('[data-testid="file-input"]');
    await fileInput.setInputFiles({
      name: fileName,
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      buffer: Buffer.from(fileContent) // This would be actual DOCX bytes in production
    });

    // Verify DOCX detected
    await expect(page.locator('[data-testid="file-type"]')).toContainText('DOCX');

    // Submit
    await page.click('[data-testid="analyze-button"]');
    await expect(page.locator('[data-testid="analysis-status"]')).toBeVisible({ timeout: 5000 });
  });

  /**
   * E2E-SCRIPT-004: Script analysis initiation
   * Priority: P0
   * Validates: Analysis starts within 2s, status transitions, progress indicators
   */
  test('P0: should initiate analysis within 2 seconds', async () => {
    await page.click('[data-testid="new-analysis"]');
    await page.fill('[data-testid="script-input"]', testData.scripts.smallEnglish);

    // Measure time to start analysis
    const startTime = Date.now();
    await page.click('[data-testid="analyze-button"]');
    
    // Wait for status change
    await expect(page.locator('[data-testid="analysis-status"]')).toContainText(/processing/i, {
      timeout: 2000
    });
    
    const analysisStartTime = Date.now() - startTime;
    expect(analysisStartTime).toBeLessThan(2000);

    // Verify progress indicator is visible
    await expect(page.locator('[data-testid="analysis-progress"]')).toBeVisible();
  });

  /**
   * E2E-SCRIPT-005: Real-time analysis status updates
   * Priority: P0
   * Validates: WebSocket/polling updates, status transitions, error handling
   */
  test('P0: should show real-time analysis status updates', async () => {
    await page.click('[data-testid="new-analysis"]');
    await page.fill('[data-testid="script-input"]', testData.scripts.scriptWithErrors);
    await page.click('[data-testid="analyze-button"]');

    // Verify status transitions
    const statusElement = page.locator('[data-testid="analysis-status"]');
    
    // Should start as pending
    await expect(statusElement).toContainText(/pending/i, { timeout: 2000 });
    
    // Should transition to processing
    await expect(statusElement).toContainText(/processing/i, { timeout: 5000 });
    
    // Check for progress updates
    const progressElement = page.locator('[data-testid="analysis-progress-percent"]');
    const initialProgress = await progressElement.textContent();
    
    // Wait and check if progress updates
    await wait(2000);
    const updatedProgress = await progressElement.textContent();
    
    // Progress should change (or complete)
    const statusText = await statusElement.textContent();
    if (!statusText?.includes('completed')) {
      expect(updatedProgress).not.toBe(initialProgress);
    }
  });

  /**
   * E2E-SCRIPT-007: Performance - <10s analysis completion
   * Priority: P0
   * Validates: End-to-end time measurement, API response time, UI update latency
   */
  test('P0: should complete analysis in less than 10 seconds', async () => {
    await page.click('[data-testid="new-analysis"]');
    
    // Use standard test script (5-10 pages equivalent)
    const testScript = testData.scripts.scriptWithErrors;
    await page.fill('[data-testid="script-input"]', testScript);

    // Measure total analysis time
    const duration = await measurePerformance(page, async () => {
      await page.click('[data-testid="analyze-button"]');
      await waitForAnalysisComplete(page, 10000);
    }, 10000);

    console.log(`✅ Analysis completed in ${duration}ms (requirement: <10000ms)`);
    
    // Verify results are displayed
    await expect(page.locator('[data-testid="analysis-results"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-count"]')).toBeVisible();
  });

  /**
   * E2E-SCRIPT-010: Analysis failure recovery
   * Priority: P0
   * Validates: Error display, retry option, data persistence
   */
  test('P0: should handle analysis failure gracefully', async () => {
    await page.click('[data-testid="new-analysis"]');
    
    // Use a script that triggers an error (e.g., empty or malformed)
    await page.fill('[data-testid="script-input"]', '');
    await page.click('[data-testid="analyze-button"]');

    // Should show validation error
    await expect(page.locator('[data-testid="validation-error"]')).toContainText(/required|empty/i);

    // Try with very short invalid content
    await page.fill('[data-testid="script-input"]', 'abc');
    await page.click('[data-testid="analyze-button"]');

    // Should show format error
    await expect(page.locator('[data-testid="format-error"]')).toBeVisible({ timeout: 5000 });

    // Retry button should be available
    await expect(page.locator('[data-testid="retry-analysis"]')).toBeVisible();
  });

  /**
   * E2E-SCRIPT-012: Invalid file rejection
   * Priority: P0
   * Validates: XSS prevention, malicious file blocking, clear error messages
   */
  test('P0: should reject invalid and malicious files', async () => {
    await page.click('[data-testid="new-analysis"]');
    await page.click('[data-testid="upload-tab-file"]');

    // Test invalid file type
    const fileInput = page.locator('[data-testid="file-input"]');
    
    // Try to upload .exe file
    await fileInput.setInputFiles({
      name: 'malicious.exe',
      mimeType: 'application/x-msdownload',
      buffer: Buffer.from('MZ') // PE header signature
    });

    // Should show error immediately
    await expect(page.locator('[data-testid="file-error"]')).toContainText(/invalid|not supported/i);

    // Try XSS in filename
    await fileInput.setInputFiles({
      name: '<script>alert("xss")</script>.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('test content')
    });

    // Filename should be sanitized in display
    const displayedName = await page.locator('[data-testid="file-name"]').textContent();
    expect(displayedName).not.toContain('<script>');
  });

  /**
   * E2E-SCRIPT-015: CSRF protection validation
   * Priority: P0
   * Validates: Token verification, request rejection without token
   */
  test('P0: should validate CSRF protection', async () => {
    // This test verifies CSRF tokens are required
    // We'll attempt to submit without proper token by manipulating the request
    
    await page.click('[data-testid="new-analysis"]');
    await page.fill('[data-testid="script-input"]', testData.scripts.smallChinese);

    // Intercept the request to remove CSRF token
    await page.route('**/api/analyze', async route => {
      const request = route.request();
      const headers = await request.headers();
      delete headers['x-csrf-token'];
      
      await route.continue({ headers });
    });

    // Try to submit
    await page.click('[data-testid="analyze-button"]');

    // Should show security error
    await expect(page.locator('[data-testid="security-error"]')).toBeVisible({ timeout: 5000 });
    
    // Clear route handler for other tests
    await page.unroute('**/api/analyze');
  });

  /**
   * E2E-SCRIPT-006: Handle analysis timeout
   * Priority: P1
   * Validates: 30s timeout trigger, retry mechanism, error message
   */
  test('P1: should handle analysis timeout', async () => {
    // This test would require mocking a slow response
    test.skip(); // Implement with API mocking in next iteration
  });

  /**
   * E2E-SCRIPT-008: Concurrent analysis requests
   * Priority: P1
   * Validates: Queue management, rate limiting, fair processing
   */
  test('P1: should handle concurrent analysis requests', async ({ browser }) => {
    // Create multiple browser contexts for concurrent users
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    // Login both users
    await loginUser(page1);
    await loginUser(page2);

    // Start analysis on both
    await Promise.all([
      uploadScript(page1, testData.scripts.smallChinese),
      uploadScript(page2, testData.scripts.smallEnglish)
    ]);

    // Both should be processing
    await expect(page1.locator('[data-testid="analysis-status"]')).toContainText(/processing|completed/i);
    await expect(page2.locator('[data-testid="analysis-status"]')).toContainText(/processing|completed/i);

    // Cleanup
    await context1.close();
    await context2.close();
  });

  /**
   * E2E-SCRIPT-011: Script language detection
   * Priority: P1
   * Validates: Chinese detection, English detection, mixed language support
   */
  test('P1: should detect script language correctly', async () => {
    // Test Chinese script
    await page.click('[data-testid="new-analysis"]');
    await page.fill('[data-testid="script-input"]', testData.scripts.smallChinese);
    await page.click('[data-testid="analyze-button"]');
    
    await waitForAnalysisComplete(page);
    await expect(page.locator('[data-testid="detected-language"]')).toContainText(/chinese|中文/i);

    // Test English script
    await page.click('[data-testid="new-analysis"]');
    await page.fill('[data-testid="script-input"]', testData.scripts.smallEnglish);
    await page.click('[data-testid="analyze-button"]');
    
    await waitForAnalysisComplete(page);
    await expect(page.locator('[data-testid="detected-language"]')).toContainText(/english|英文/i);
  });

  /**
   * E2E-SCRIPT-014: Analysis result persistence
   * Priority: P1
   * Validates: Database save, result retrieval, project association
   */
  test('P1: should persist analysis results', async () => {
    // Upload and analyze
    await page.click('[data-testid="new-analysis"]');
    await page.fill('[data-testid="script-input"]', testData.scripts.scriptWithErrors);
    await page.click('[data-testid="analyze-button"]');
    
    await waitForAnalysisComplete(page);
    
    // Get analysis ID from URL
    const url = page.url();
    const analysisId = url.split('/').pop();
    
    // Navigate away
    await page.goto('/dashboard');
    
    // Navigate back to the analysis
    await page.goto(`/analysis/${analysisId}`);
    
    // Results should still be there
    await expect(page.locator('[data-testid="analysis-results"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-count"]')).toBeVisible();
  });

  /**
   * E2E-SCRIPT-009: Large file handling (8-10MB)
   * Priority: P2
   * Validates: Memory management, chunked processing, no UI freeze
   */
  test('P2: should handle large script files', async () => {
    test.skip(); // Implement with large file fixture in next iteration
  });

  /**
   * E2E-SCRIPT-013: Network interruption handling
   * Priority: P2
   * Validates: Reconnection logic, resume capability, state preservation
   */
  test('P2: should handle network interruptions', async () => {
    test.skip(); // Implement with network simulation in next iteration
  });
});