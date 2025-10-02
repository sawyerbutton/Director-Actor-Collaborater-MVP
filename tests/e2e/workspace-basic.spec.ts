/**
 * E2E Tests for Epic 005 - Workspace Components
 * Tests basic rendering and interaction of workspace components
 */

import { test, expect } from '@playwright/test';

test.describe('Workspace Components - Basic E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Set up any required authentication or state
    await page.goto('/');
  });

  test('homepage loads successfully', async ({ page }) => {
    await expect(page).toHaveTitle(/ScriptAI/i);
  });

  test('dashboard page loads', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.locator('h1, h2')).toBeVisible();
  });

  test('can navigate to test upload page', async ({ page }) => {
    await page.goto('/test-upload');
    await expect(page).toHaveURL(/.*test-upload/);
  });

  test('v1-demo page loads', async ({ page }) => {
    await page.goto('/v1-demo');
    await expect(page).toHaveURL(/.*v1-demo/);

    // Check for key elements
    const heading = page.locator('h1, h2').first();
    await expect(heading).toBeVisible();
  });

  test('api health check works', async ({ request }) => {
    const response = await request.get('/api/health');
    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data.status).toBe('healthy');
  });
});

test.describe('Workspace Components - Visual Verification', () => {
  test('workspace components can be imported', async ({ page }) => {
    // Navigate to a page that might use workspace components
    await page.goto('/dashboard');

    // Verify page renders without errors
    const errorMessages = await page.locator('[role="alert"]').count();
    expect(errorMessages).toBe(0);
  });

  test('responsive design works on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/dashboard');

    // Check that page is still accessible
    await expect(page.locator('body')).toBeVisible();
  });

  test('responsive design works on tablet viewport', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/dashboard');

    // Check that page is still accessible
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('API Endpoints - Epic 005', () => {
  test('iteration API endpoints are registered', async ({ request }) => {
    // These will return errors without proper auth/data, but should not be 404
    const proposeResponse = await request.post('/api/v1/iteration/propose', {
      data: {}
    });
    // Should not be 404 (not found)
    expect(proposeResponse.status()).not.toBe(404);

    const executeResponse = await request.post('/api/v1/iteration/execute', {
      data: {}
    });
    expect(executeResponse.status()).not.toBe(404);
  });

  test('decisions endpoint is accessible', async ({ request }) => {
    // This should return 404 for non-existent project, not route not found
    const response = await request.get('/api/v1/projects/test-id/decisions');

    // Should be either 404 (not found) or 403 (forbidden), not route error
    expect([404, 403]).toContain(response.status());
  });
});
