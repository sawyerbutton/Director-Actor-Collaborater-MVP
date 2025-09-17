import { test, expect } from '@playwright/test';

/**
 * Minimal test to verify WSL setup works
 */

test('WSL Setup Verification', async ({ browser }) => {
  console.log('✅ Browser launched successfully');
  
  const context = await browser.newContext();
  console.log('✅ Context created');
  
  const page = await context.newPage();
  console.log('✅ Page created');
  
  // Try to navigate to a simple page
  await page.goto('https://example.com', { timeout: 10000 });
  console.log('✅ Navigation successful');
  
  // Check title
  const title = await page.title();
  expect(title).toContain('Example');
  console.log(`✅ Page title: ${title}`);
  
  await page.close();
  await context.close();
  
  console.log('✅ WSL Playwright setup is working!');
});