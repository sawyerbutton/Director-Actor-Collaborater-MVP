import { test, expect } from '@playwright/test';

test.describe('V1 Demo Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/v1-demo');
  });

  test('should load V1 demo page', async ({ page }) => {
    // Check page title
    await expect(page.locator('h1')).toContainText('V1 API Migration Demo');

    // Check page subtitle
    await expect(page.locator('p').first()).toContainText('Five-Act Workflow System');
  });

  test('should display upload interface', async ({ page }) => {
    // Check upload tabs
    await expect(page.locator('button[role="tab"]').nth(0)).toContainText('文件上传');
    await expect(page.locator('button[role="tab"]').nth(1)).toContainText('文本输入');
    await expect(page.locator('button[role="tab"]').nth(2)).toContainText('已有项目');

    // Check upload area is visible
    const uploadArea = page.locator('text=/拖拽文件到此处/');
    await expect(uploadArea).toBeVisible();
  });

  test('should display analysis control panel', async ({ page }) => {
    // Check status display
    await expect(page.locator('text=/准备就绪/')).toBeVisible();

    // Check workflow status badge
    await expect(page.locator('text=/INITIALIZED/')).toBeVisible();

    // Check start button
    const startButton = page.locator('button:has-text("开始 Act 1 分析")');
    await expect(startButton).toBeVisible();
    await expect(startButton).toBeDisabled(); // Should be disabled without script
  });

  test('should display V1 API features', async ({ page }) => {
    // Check features list
    await expect(page.locator('text=/数据库持久化存储/')).toBeVisible();
    await expect(page.locator('text=/异步任务队列处理/')).toBeVisible();
    await expect(page.locator('text=/五幕工作流状态跟踪/')).toBeVisible();
    await expect(page.locator('text=/Act 1 基础诊断分析/')).toBeVisible();
  });

  test('should switch between upload tabs', async ({ page }) => {
    // Click text input tab
    await page.locator('button[role="tab"]:has-text("文本输入")').click();

    // Check text area appears
    const textarea = page.locator('textarea[placeholder*="粘贴或输入剧本内容"]');
    await expect(textarea).toBeVisible();

    // Click existing projects tab
    await page.locator('button[role="tab"]:has-text("已有项目")').click();

    // Check projects section appears
    await expect(page.locator('text=/选择一个已存在的项目/')).toBeVisible();
  });

  test('should handle text input', async ({ page }) => {
    // Switch to text input tab
    await page.locator('button[role="tab"]:has-text("文本输入")').click();

    // Enter project title
    const titleInput = page.locator('input[placeholder="输入项目标题"]');
    await titleInput.fill('E2E Test Project');

    // Enter script content
    const textarea = page.locator('textarea[placeholder*="粘贴或输入剧本内容"]');
    await textarea.fill(`
      Scene 1 - Test Scene
      Characters: A, B

      A: Hello!
      B: Hi there!
    `);

    // Check button is now enabled
    const submitButton = page.locator('button:has-text("创建项目并分析")');
    await expect(submitButton).toBeEnabled();
  });

  test('should handle file upload interaction', async ({ page }) => {
    // Create a test file
    const fileContent = Buffer.from('Test script content');

    // Set file input
    await page.setInputFiles('input[type="file"]', {
      name: 'test-script.txt',
      mimeType: 'text/plain',
      buffer: fileContent
    });

    // Wait for file to be processed (visual feedback would appear)
    await page.waitForTimeout(500);
  });

  test('should display proper error messages for unsupported files', async ({ page }) => {
    // Try to upload unsupported file type
    const fileContent = Buffer.from('Test content');

    await page.setInputFiles('input[type="file"]', {
      name: 'test.docx',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      buffer: fileContent
    });

    // Should show error for unsupported format
    await expect(page.locator('text=/不支持的文件格式/i')).toBeVisible({ timeout: 5000 });
  });

  test('should show loading states during analysis', async ({ page }) => {
    // Switch to text input
    await page.locator('button[role="tab"]:has-text("文本输入")').click();

    // Fill in required fields
    await page.locator('input[placeholder="输入项目标题"]').fill('Loading Test');
    await page.locator('textarea').fill('Test content');

    // Mock API response for testing loading state
    await page.route('**/api/v1/projects', route => {
      route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            id: 'test-123',
            title: 'Loading Test',
            workflowStatus: 'INITIALIZED',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        })
      });
    });

    // Click submit
    await page.locator('button:has-text("创建项目并分析")').click();

    // Should show loading indicator
    await expect(page.locator('text=/处理中/i')).toBeVisible();
  });
});

test.describe('V1 Demo Responsive Design', () => {
  test('should be responsive on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/v1-demo');

    // Check mobile layout
    await expect(page.locator('h1')).toBeVisible();

    // Grid should stack on mobile (lg:grid-cols-3 becomes single column)
    const mainGrid = page.locator('.grid.lg\\:grid-cols-3');
    await expect(mainGrid).toBeVisible();
  });

  test('should be responsive on tablet', async ({ page }) => {
    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/v1-demo');

    // Check tablet layout
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('text=/V1 API Migration Demo/')).toBeVisible();
  });
});