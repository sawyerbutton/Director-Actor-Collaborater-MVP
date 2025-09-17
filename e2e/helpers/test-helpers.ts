import { Page, expect } from '@playwright/test';
import { testData } from '../fixtures/test-data';

/**
 * Common helper functions for E2E tests
 */

/**
 * Login a user and navigate to dashboard
 */
export async function loginUser(page: Page, email?: string, password?: string) {
  const userEmail = email || testData.users.existingUser.email;
  const userPassword = password || testData.users.existingUser.password;
  
  await page.goto('/auth/login');
  await page.fill('[data-testid="login-email"]', userEmail);
  await page.fill('[data-testid="login-password"]', userPassword);
  await page.click('[data-testid="login-submit"]');
  
  // Wait for dashboard to load
  await expect(page).toHaveURL('/dashboard', { timeout: 10000 });
}

/**
 * Upload a script for analysis
 */
export async function uploadScript(page: Page, scriptContent: string) {
  // Ensure we're on the dashboard
  await expect(page).toHaveURL('/dashboard');
  
  // Click new analysis button
  await page.click('[data-testid="new-analysis"]');
  
  // Fill in script content
  await page.fill('[data-testid="script-input"]', scriptContent);
  
  // Submit for analysis
  await page.click('[data-testid="analyze-button"]');
  
  // Return the analysis ID from the URL
  await page.waitForURL(/\/analysis\/[\w-]+/, { timeout: 15000 });
  const url = page.url();
  const analysisId = url.split('/analysis/')[1];
  return analysisId;
}

/**
 * Wait for analysis to complete
 */
export async function waitForAnalysisComplete(page: Page, timeout = 15000) {
  // Wait for analysis status to change to completed
  await expect(page.locator('[data-testid="analysis-status"]')).toContainText('Completed', { 
    timeout 
  });
}

/**
 * Accept a suggestion
 */
export async function acceptSuggestion(page: Page, suggestionIndex: number) {
  const suggestion = page.locator(`[data-testid="suggestion-${suggestionIndex}"]`);
  await suggestion.locator('[data-testid="accept-button"]').click();
  
  // Verify suggestion is marked as accepted
  await expect(suggestion).toHaveAttribute('data-status', 'accepted');
}

/**
 * Reject a suggestion
 */
export async function rejectSuggestion(page: Page, suggestionIndex: number) {
  const suggestion = page.locator(`[data-testid="suggestion-${suggestionIndex}"]`);
  await suggestion.locator('[data-testid="reject-button"]').click();
  
  // Verify suggestion is marked as rejected
  await expect(suggestion).toHaveAttribute('data-status', 'rejected');
}

/**
 * Export the modified script
 */
export async function exportScript(page: Page, format: 'txt' | 'docx') {
  // Open export menu
  await page.click('[data-testid="export-button"]');
  
  // Select format
  await page.click(`[data-testid="export-${format}"]`);
  
  // Wait for download
  const downloadPromise = page.waitForEvent('download');
  await page.click('[data-testid="confirm-export"]');
  const download = await downloadPromise;
  
  return download;
}

/**
 * Measure performance of an action
 */
export async function measurePerformance(
  page: Page, 
  action: () => Promise<void>, 
  maxDuration: number
): Promise<number> {
  const startTime = Date.now();
  await action();
  const duration = Date.now() - startTime;
  
  expect(duration).toBeLessThan(maxDuration);
  return duration;
}

/**
 * Check if element is visible within viewport
 */
export async function isElementInViewport(page: Page, selector: string): Promise<boolean> {
  return await page.evaluate((sel) => {
    const element = document.querySelector(sel);
    if (!element) return false;
    
    const rect = element.getBoundingClientRect();
    return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= window.innerHeight &&
      rect.right <= window.innerWidth
    );
  }, selector);
}

/**
 * Create a test project
 */
export async function createProject(page: Page, projectName: string) {
  await page.click('[data-testid="new-project"]');
  await page.fill('[data-testid="project-name"]', projectName);
  await page.click('[data-testid="create-project"]');
  
  // Wait for project to be created
  await expect(page.locator('[data-testid="project-title"]')).toContainText(projectName);
}

/**
 * Clean up test data (call in afterEach or afterAll)
 */
export async function cleanupTestData(page: Page) {
  // Navigate to settings
  await page.goto('/settings');
  
  // Delete test projects
  const deleteButtons = page.locator('[data-testid^="delete-project-"]');
  const count = await deleteButtons.count();
  
  for (let i = 0; i < count; i++) {
    await deleteButtons.first().click();
    await page.click('[data-testid="confirm-delete"]');
    await page.waitForTimeout(500); // Small delay for deletion
  }
}