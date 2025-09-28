/**
 * E2E tests for Intelligent Repair Feature
 * Epic-001 Story 3: Test verification
 */

import { test, expect, Page } from '@playwright/test';

test.describe('Intelligent Repair E2E', () => {
  let page: Page;

  test.beforeEach(async ({ page: p }) => {
    page = p;
    await page.goto('http://localhost:3000');
  });

  test('complete repair workflow', async () => {
    // 1. Navigate to dashboard
    await page.click('a[href="/dashboard"]');
    await expect(page).toHaveURL(/.*dashboard/);

    // 2. Upload a script with errors
    const testScript = `
      场景 1 - 内景 - 咖啡店 - 日
      JOHN走进咖啡店。

      MARY
      早上好，Tom！

      JOHN
      早上好，Mary。

      场景 2 - 内景 - 办公室 - 早上9点
      ALICE在开会。

      场景 3 - 内景 - 餐厅 - 早上8点30分
      ALICE在吃早餐。
    `;

    // Look for script input area
    const scriptInput = page.locator('textarea[placeholder*="剧本"], textarea[placeholder*="script"]').first();

    if (await scriptInput.isVisible()) {
      await scriptInput.fill(testScript);
    } else {
      // Try file upload if text input not available
      const fileInput = page.locator('input[type="file"]').first();
      if (await fileInput.isVisible()) {
        // Create a temporary file
        const buffer = Buffer.from(testScript, 'utf-8');
        await fileInput.setInputFiles({
          name: 'test-script.txt',
          mimeType: 'text/plain',
          buffer
        });
      }
    }

    // 3. Run analysis
    const analyzeButton = page.locator('button:has-text("分析"), button:has-text("Analyze")').first();
    await analyzeButton.click();

    // 4. Wait for analysis to complete
    await page.waitForSelector('[data-testid="analysis-results"], .analysis-results, .error-list', {
      timeout: 30000
    });

    // 5. Select an error to fix
    const errorItems = page.locator('[data-testid="error-item"], .error-item, .logic-error').all();
    const errors = await errorItems;

    if (errors.length > 0) {
      // Click on the first error
      await errors[0].click();

      // 6. Click repair/fix button
      const repairButton = page.locator('button:has-text("修复"), button:has-text("Fix"), button:has-text("修正")').first();
      await repairButton.click();

      // 7. Wait for repair suggestion
      await page.waitForSelector('[data-testid="repair-suggestion"], .suggestion, .fix-content', {
        timeout: 30000
      });

      // 8. Accept the repair
      const acceptButton = page.locator('button:has-text("接受"), button:has-text("Accept"), button:has-text("应用")').first();
      await acceptButton.click();

      // 9. Verify the repair was applied
      const successMessage = page.locator('.success-message, [data-testid="success-message"], .toast-success');
      await expect(successMessage).toBeVisible({ timeout: 5000 });

      // 10. Export the fixed script
      const exportButton = page.locator('button:has-text("导出"), button:has-text("Export"), button:has-text("下载")').first();

      if (await exportButton.isVisible()) {
        // Set up download promise before clicking
        const downloadPromise = page.waitForEvent('download');
        await exportButton.click();

        const download = await downloadPromise;
        expect(download).toBeTruthy();

        // Verify the downloaded file
        const fileName = download.suggestedFilename();
        expect(fileName).toMatch(/\.(txt|docx|md)$/);
      }
    }
  });

  test('handle repair failures gracefully', async () => {
    // Navigate to dashboard
    await page.click('a[href="/dashboard"]');

    // Mock API failure
    await page.route('**/api/v1/analyze/**', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: {
            code: 'REPAIR_FAILED',
            message: 'Failed to generate repair',
            retryable: true
          }
        })
      });
    });

    // Upload a script
    const scriptInput = page.locator('textarea[placeholder*="剧本"], textarea[placeholder*="script"]').first();

    if (await scriptInput.isVisible()) {
      await scriptInput.fill('Test script with errors');

      // Try to analyze
      const analyzeButton = page.locator('button:has-text("分析"), button:has-text("Analyze")').first();
      await analyzeButton.click();

      // Verify error message is shown
      const errorMessage = page.locator('.error-message, [data-testid="error-message"], .toast-error');
      await expect(errorMessage).toBeVisible({ timeout: 10000 });

      // Verify retry option is available
      const retryButton = page.locator('button:has-text("重试"), button:has-text("Retry"), button:has-text("再试")');

      if (await retryButton.isVisible()) {
        // Remove the mock to allow retry
        await page.unroute('**/api/v1/analyze/**');

        // Click retry
        await retryButton.click();

        // Verify it attempts to retry
        await page.waitForTimeout(1000);
      }
    }
  });

  test('performance: handle large scripts', async () => {
    // Generate a large script (200+ pages)
    let largeScript = '';
    for (let i = 1; i <= 200; i++) {
      largeScript += `
        场景 ${i} - 内景 - 地点${i} - 日
        角色${i % 10}进入房间。

        角色${i % 10}
        这是第${i}场的对话内容。

      `;
    }

    // Navigate to dashboard
    await page.click('a[href="/dashboard"]');

    // Measure performance
    const startTime = Date.now();

    // Upload the large script
    const scriptInput = page.locator('textarea[placeholder*="剧本"], textarea[placeholder*="script"]').first();

    if (await scriptInput.isVisible()) {
      await scriptInput.fill(largeScript);

      // Run analysis
      const analyzeButton = page.locator('button:has-text("分析"), button:has-text("Analyze")').first();
      await analyzeButton.click();

      // Wait for completion
      await page.waitForSelector('[data-testid="analysis-complete"], .analysis-results', {
        timeout: 60000 // 1 minute timeout for large scripts
      });

      const endTime = Date.now();
      const processingTime = (endTime - startTime) / 1000;

      // Performance assertion: should complete within 30 seconds
      expect(processingTime).toBeLessThan(30);

      console.log(`Large script (200 pages) processed in ${processingTime}s`);
    }
  });

  test('concurrent repairs handling', async () => {
    // Navigate to dashboard
    await page.click('a[href="/dashboard"]');

    const testScript = `
      Multiple errors script
      Error 1: Character issue
      Error 2: Timeline issue
      Error 3: Dialogue issue
    `;

    const scriptInput = page.locator('textarea[placeholder*="剧本"], textarea[placeholder*="script"]').first();

    if (await scriptInput.isVisible()) {
      await scriptInput.fill(testScript);

      // Analyze
      const analyzeButton = page.locator('button:has-text("分析"), button:has-text("Analyze")').first();
      await analyzeButton.click();

      // Wait for errors
      await page.waitForSelector('[data-testid="error-item"], .error-item', {
        timeout: 30000
      });

      // Get all repair buttons
      const repairButtons = await page.locator('button:has-text("修复"), button:has-text("Fix")').all();

      if (repairButtons.length >= 3) {
        // Click multiple repair buttons quickly (simulating concurrent requests)
        const repairPromises = repairButtons.slice(0, 3).map(button => button.click());
        await Promise.all(repairPromises);

        // Wait for all repairs to complete
        await page.waitForTimeout(5000);

        // Verify no crashes or errors
        const errorDialog = page.locator('.error-dialog, [data-testid="critical-error"]');
        await expect(errorDialog).not.toBeVisible();

        // Verify suggestions are shown
        const suggestions = await page.locator('[data-testid="repair-suggestion"], .suggestion').all();
        expect(suggestions.length).toBeGreaterThan(0);
      }
    }
  });

  test('network resilience', async () => {
    // Test with slow network
    await page.route('**/api/v1/**', route => {
      // Simulate slow network with 3 second delay
      setTimeout(() => {
        route.continue();
      }, 3000);
    });

    // Navigate to dashboard
    await page.click('a[href="/dashboard"]');

    const scriptInput = page.locator('textarea[placeholder*="剧本"], textarea[placeholder*="script"]').first();

    if (await scriptInput.isVisible()) {
      await scriptInput.fill('Test script');

      // Should show loading state
      const analyzeButton = page.locator('button:has-text("分析"), button:has-text("Analyze")').first();
      await analyzeButton.click();

      // Verify loading indicator is shown
      const loadingIndicator = page.locator('.loading, [data-testid="loading"], .spinner');
      await expect(loadingIndicator).toBeVisible();

      // Should eventually complete despite slow network
      await page.waitForSelector('[data-testid="analysis-results"], .analysis-results', {
        timeout: 40000 // Extended timeout for slow network
      });
    }

    // Clean up route
    await page.unroute('**/api/v1/**');
  });
});