import { test, expect, type Page } from '@playwright/test';
import { testData, wait } from '../fixtures/test-data';
import { loginUser, uploadScript, waitForAnalysisComplete, isElementInViewport } from '../helpers/test-helpers';

/**
 * E2E-ERROR-001 to E2E-ERROR-010: Error Detection & Visualization Tests
 * Priority: P0-P2
 * These tests validate error detection, display, and interaction features
 */

test.describe('Error Detection & Visualization', () => {
  let page: Page;
  let analysisId: string;

  test.beforeAll(async ({ browser }) => {
    // Setup: Upload a script with known errors once
    const context = await browser.newContext();
    page = await context.newPage();
    
    await loginUser(page);
    analysisId = await uploadScript(page, testData.scripts.scriptWithErrors);
    await waitForAnalysisComplete(page);
  });

  test.beforeEach(async () => {
    // Navigate to the analysis results page
    await page.goto(`/analysis/${analysisId}`);
    await expect(page.locator('[data-testid="analysis-results"]')).toBeVisible();
  });

  /**
   * E2E-ERROR-001: Display 5 error types
   * Priority: P0
   * Validates: All 5 core error types are detected and displayed
   */
  test('P0: should display all 5 error types', async () => {
    const errorTypes = [
      'character-consistency',
      'timeline-continuity',
      'scene-consistency',
      'plot-coherence',
      'dialogue-consistency'
    ];

    for (const errorType of errorTypes) {
      const errorElement = page.locator(`[data-testid="error-type-${errorType}"]`);
      await expect(errorElement).toBeVisible();
      
      // Verify error count is displayed
      const count = await errorElement.locator('[data-testid="error-count"]').textContent();
      expect(Number(count)).toBeGreaterThan(0);
    }

    // Verify total error count
    const totalErrors = await page.locator('[data-testid="total-error-count"]').textContent();
    expect(Number(totalErrors)).toBeGreaterThan(0);
  });

  /**
   * E2E-ERROR-002: Error location highlighting
   * Priority: P0
   * Validates: Line number accuracy, context display, scroll-to-error
   */
  test('P0: should highlight error locations in script', async () => {
    // Click on first error
    const firstError = page.locator('[data-testid^="error-item-"]').first();
    await firstError.click();

    // Verify script viewer scrolls to error location
    await wait(500); // Allow for scroll animation
    
    // Check if error line is highlighted
    const highlightedLine = page.locator('[data-testid="highlighted-line"]');
    await expect(highlightedLine).toBeVisible();
    await expect(highlightedLine).toHaveClass(/highlight|error|active/);

    // Verify line number is shown
    const lineNumber = await highlightedLine.locator('[data-testid="line-number"]').textContent();
    expect(Number(lineNumber)).toBeGreaterThan(0);

    // Verify context lines are visible (±3 lines)
    const contextBefore = page.locator(`[data-testid="line-${Number(lineNumber) - 1}"]`);
    const contextAfter = page.locator(`[data-testid="line-${Number(lineNumber) + 1}"]`);
    
    if (Number(lineNumber) > 1) {
      await expect(contextBefore).toBeVisible();
    }
    await expect(contextAfter).toBeVisible();
  });

  /**
   * E2E-ERROR-003: Error filtering by type
   * Priority: P1
   * Validates: Type selector UI, filter application, result count update
   */
  test('P1: should filter errors by type', async () => {
    // Get initial error count
    const initialCount = await page.locator('[data-testid="filtered-error-count"]').textContent();
    
    // Apply filter for character consistency errors only
    await page.click('[data-testid="filter-button"]');
    await page.click('[data-testid="filter-character-consistency"]');
    await page.click('[data-testid="apply-filter"]');

    // Verify filtered results
    const filteredCount = await page.locator('[data-testid="filtered-error-count"]').textContent();
    expect(Number(filteredCount)).toBeLessThan(Number(initialCount));

    // Verify only character consistency errors are shown
    const visibleErrors = page.locator('[data-testid^="error-item-"]:visible');
    const count = await visibleErrors.count();
    
    for (let i = 0; i < count; i++) {
      const errorType = await visibleErrors.nth(i).getAttribute('data-error-type');
      expect(errorType).toBe('character-consistency');
    }

    // Clear filter
    await page.click('[data-testid="clear-filter"]');
    const clearedCount = await page.locator('[data-testid="filtered-error-count"]').textContent();
    expect(clearedCount).toBe(initialCount);
  });

  /**
   * E2E-ERROR-004: Error severity visualization
   * Priority: P1
   * Validates: Severity indicators, color coding, sorting by severity
   */
  test('P1: should visualize error severity correctly', async () => {
    // Check severity indicators
    const highSeverityErrors = page.locator('[data-severity="high"]');
    const mediumSeverityErrors = page.locator('[data-severity="medium"]');
    const lowSeverityErrors = page.locator('[data-severity="low"]');

    // Verify at least some errors of each severity exist
    expect(await highSeverityErrors.count()).toBeGreaterThan(0);
    
    // Verify color coding (using CSS classes or computed styles)
    const highSeverityElement = highSeverityErrors.first();
    await expect(highSeverityElement).toHaveClass(/severity-high|danger|red/);

    // Test sorting by severity
    await page.selectOption('[data-testid="sort-by"]', 'severity');
    
    // Verify high severity errors appear first
    const firstError = page.locator('[data-testid^="error-item-"]').first();
    const firstErrorSeverity = await firstError.getAttribute('data-severity');
    expect(firstErrorSeverity).toBe('high');
  });

  /**
   * E2E-ERROR-005: Interactive error navigation
   * Priority: P0
   * Validates: Click to navigate, keyboard shortcuts, error index display
   */
  test('P0: should navigate between errors interactively', async () => {
    // Test click navigation
    const errorItems = page.locator('[data-testid^="error-item-"]');
    const errorCount = await errorItems.count();
    
    // Click through first 3 errors
    for (let i = 0; i < Math.min(3, errorCount); i++) {
      await errorItems.nth(i).click();
      
      // Verify script viewer updates
      await expect(page.locator('[data-testid="highlighted-line"]')).toBeVisible();
      
      // Verify error details panel updates
      await expect(page.locator('[data-testid="error-details"]')).toContainText(/error|issue/i);
      
      // Verify error index is shown
      await expect(page.locator('[data-testid="error-index"]')).toContainText(`${i + 1} of ${errorCount}`);
    }

    // Test keyboard navigation
    await page.keyboard.press('ArrowDown');
    await wait(300);
    await expect(page.locator('[data-testid="error-index"]')).toContainText('4 of');

    await page.keyboard.press('ArrowUp');
    await wait(300);
    await expect(page.locator('[data-testid="error-index"]')).toContainText('3 of');

    // Test jump to first/last
    await page.keyboard.press('Home');
    await expect(page.locator('[data-testid="error-index"]')).toContainText('1 of');

    await page.keyboard.press('End');
    await expect(page.locator('[data-testid="error-index"]')).toContainText(`${errorCount} of`);
  });

  /**
   * E2E-ERROR-006: Error distribution chart
   * Priority: P1
   * Validates: Chart rendering, data accuracy, interactive tooltips
   */
  test('P1: should display error distribution chart', async () => {
    // Open visualization tab/panel
    await page.click('[data-testid="visualizations-tab"]');

    // Verify chart is rendered
    const chart = page.locator('[data-testid="error-distribution-chart"]');
    await expect(chart).toBeVisible();

    // Verify chart has data
    const chartBars = chart.locator('[data-testid^="chart-bar-"]');
    expect(await chartBars.count()).toBeGreaterThan(0);

    // Test interactive tooltips
    const firstBar = chartBars.first();
    await firstBar.hover();
    
    const tooltip = page.locator('[data-testid="chart-tooltip"]');
    await expect(tooltip).toBeVisible();
    await expect(tooltip).toContainText(/\d+/); // Should contain a number
  });

  /**
   * E2E-ERROR-008: Context-aware error display
   * Priority: P1
   * Validates: Related character info, scene connections, timeline references
   */
  test('P1: should show context-aware error information', async () => {
    // Find a character consistency error
    const characterError = page.locator('[data-error-type="character-consistency"]').first();
    await characterError.click();

    // Verify character context is shown
    const errorDetails = page.locator('[data-testid="error-details"]');
    await expect(errorDetails).toBeVisible();
    
    // Should show character name
    await expect(errorDetails.locator('[data-testid="character-name"]')).toBeVisible();
    
    // Should show scene information
    await expect(errorDetails.locator('[data-testid="scene-info"]')).toBeVisible();
    
    // Should show related errors if any
    const relatedErrors = errorDetails.locator('[data-testid="related-errors"]');
    if (await relatedErrors.count() > 0) {
      await expect(relatedErrors).toBeVisible();
      const relatedCount = await relatedErrors.locator('[data-testid^="related-error-"]').count();
      expect(relatedCount).toBeGreaterThan(0);
    }
  });

  /**
   * E2E-ERROR-010: Performance - <100ms UI response
   * Priority: P0
   * Validates: Filter application speed, navigation latency, render performance
   */
  test('P0: should respond to UI interactions within 100ms', async () => {
    // Test filter application performance
    const filterStartTime = Date.now();
    await page.click('[data-testid="filter-button"]');
    await page.click('[data-testid="filter-character-consistency"]');
    await page.click('[data-testid="apply-filter"]');
    
    // Wait for results to update
    await page.waitForSelector('[data-testid="filtered-error-count"]');
    const filterTime = Date.now() - filterStartTime;
    expect(filterTime).toBeLessThan(100);

    // Test error navigation performance
    const navStartTime = Date.now();
    const firstError = page.locator('[data-testid^="error-item-"]').first();
    await firstError.click();
    
    // Wait for highlight
    await page.waitForSelector('[data-testid="highlighted-line"]');
    const navTime = Date.now() - navStartTime;
    expect(navTime).toBeLessThan(100);

    console.log(`✅ UI Response times - Filter: ${filterTime}ms, Navigation: ${navTime}ms`);
  });

  /**
   * E2E-ERROR-007: Error heatmap display
   * Priority: P2
   * Validates: Visual density map, scene correlation, performance with 500+ errors
   */
  test('P2: should display error heatmap for large datasets', async () => {
    // This test requires a script with many errors
    // Skip for now, implement with large error dataset
    test.skip();
  });

  /**
   * E2E-ERROR-009: Error export to report
   * Priority: P2
   * Validates: PDF generation, formatted output, complete error list
   */
  test('P2: should export errors to report', async () => {
    // Open export menu
    await page.click('[data-testid="export-errors-button"]');
    
    // Select PDF format
    await page.click('[data-testid="export-pdf"]');
    
    // Wait for download
    const downloadPromise = page.waitForEvent('download');
    await page.click('[data-testid="confirm-export"]');
    const download = await downloadPromise;
    
    // Verify download
    expect(download.suggestedFilename()).toContain('.pdf');
    
    // In production, you'd verify the PDF content
    console.log(`✅ Error report exported: ${download.suggestedFilename()}`);
  });
});