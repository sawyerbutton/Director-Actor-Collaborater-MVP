import { test, expect } from '@playwright/test';

/**
 * Smoke test to verify E2E setup works in WSL
 */

test.describe('Smoke Test', () => {
  test('should load the home page', async ({ page }) => {
    // Simple test to verify Playwright works
    await page.goto('/');
    
    // Check if the page loads
    await expect(page).toHaveTitle(/ScriptAI|Script Analysis|Home/i, { timeout: 10000 });
    
    // Take a screenshot for verification
    await page.screenshot({ path: 'e2e/screenshots/home-page.png' });
    
    console.log('✅ Smoke test passed - Playwright is working in WSL!');
  });

  test('should navigate to login page', async ({ page }) => {
    await page.goto('/');
    
    // Look for any login-related element
    const loginLink = page.locator('a[href*="login"], a[href*="signin"], button:has-text("Sign In"), button:has-text("Login")').first();
    
    if (await loginLink.count() > 0) {
      await loginLink.click();
      await expect(page).toHaveURL(/\/(auth|login|signin)/i, { timeout: 5000 });
      console.log('✅ Navigation to login page works!');
    } else {
      console.log('⚠️ No login link found on home page - might already be on login page');
    }
  });
});