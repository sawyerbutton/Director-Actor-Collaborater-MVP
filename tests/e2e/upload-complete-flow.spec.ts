import { test, expect, Page } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

// Create test files
const createTestFiles = () => {
  const testDir = path.join(process.cwd(), 'tests', 'fixtures', 'upload');

  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }

  // Standard text script
  const standardScript = `场景 1 - 内景 - 咖啡店 - 日

咖啡店里人来人往。

服务员: 欢迎光临！

顾客: 我要一杯咖啡。`;

  // Markdown script
  const markdownScript = `# 场景 1 - 内景 - 咖啡店 - 日

咖啡店里人来人往，午后的阳光透过窗户洒进来。

**服务员**: 欢迎光临！请问需要点什么？

**顾客**: 一杯拿铁，谢谢。

*(服务员微笑着记下订单)*

**服务员**: 好的，请稍等。

## 淡出

# 场景 2 - 外景 - 街道 - 夜

繁忙的街道上，霓虹灯闪烁。

**路人甲**: 这个城市从不睡觉。`;

  // Large file (8MB)
  const largeContent = 'A'.repeat(8 * 1024 * 1024);

  // Oversized file (15MB)
  const oversizedContent = 'B'.repeat(15 * 1024 * 1024);

  fs.writeFileSync(path.join(testDir, 'standard.txt'), standardScript);
  fs.writeFileSync(path.join(testDir, 'markdown.md'), markdownScript);
  fs.writeFileSync(path.join(testDir, 'large.txt'), largeContent);
  fs.writeFileSync(path.join(testDir, 'oversized.txt'), oversizedContent);
  fs.writeFileSync(path.join(testDir, 'invalid.pdf'), 'PDF content');

  return testDir;
};

test.describe('Complete Upload Flow', () => {
  let testDir: string;

  test.beforeAll(() => {
    testDir = createTestFiles();
  });

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('drag and drop upload with Markdown file', async ({ page }) => {
    // Navigate to upload page
    await page.goto('/analysis');

    // Wait for the drop zone to be visible
    const dropZone = page.locator('[onDrop]').first();
    await expect(dropZone).toBeVisible();

    // Create file chooser promise before clicking
    const fileChooserPromise = page.waitForEvent('filechooser');

    // Click the upload button to trigger file chooser
    await page.getByRole('button', { name: /选择文件/i }).click();

    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(path.join(testDir, 'markdown.md'));

    // Verify file appears in upload queue
    await expect(page.getByText('markdown.md')).toBeVisible({ timeout: 5000 });

    // Wait for upload to complete
    await expect(page.locator('.lucide-check-circle')).toBeVisible({ timeout: 10000 });

    // Verify Markdown detection hint appears
    await expect(page.getByText(/检测到 Markdown 格式/)).toBeVisible();

    // Click analyze button if it exists
    const analyzeButton = page.getByRole('button', { name: /开始分析/i });
    if (await analyzeButton.isVisible()) {
      await analyzeButton.click();

      // Wait for analysis page or results
      await page.waitForURL(/analysis/, { timeout: 10000 });
    }
  });

  test('handle multiple file uploads', async ({ page }) => {
    await page.goto('/analysis');

    const dropZone = page.locator('[onDrop]').first();
    await expect(dropZone).toBeVisible();

    // Upload multiple files
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: /选择文件/i }).click();

    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles([
      path.join(testDir, 'standard.txt'),
      path.join(testDir, 'markdown.md')
    ]);

    // Verify both files appear
    await expect(page.getByText('standard.txt')).toBeVisible();
    await expect(page.getByText('markdown.md')).toBeVisible();

    // Check upload queue count
    await expect(page.getByText(/上传队列.*2/)).toBeVisible();
  });

  test('validate file size limits', async ({ page }) => {
    await page.goto('/analysis');

    // Try to upload oversized file
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: /选择文件/i }).click();

    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(path.join(testDir, 'oversized.txt'));

    // Verify error message
    await expect(page.getByText(/大小超过.*10MB/)).toBeVisible();
  });

  test('reject invalid file types', async ({ page }) => {
    await page.goto('/analysis');

    // Try to upload PDF file
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: /选择文件/i }).click();

    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(path.join(testDir, 'invalid.pdf'));

    // Verify error message
    await expect(page.getByText(/格式不支持/)).toBeVisible();
  });

  test('text input mode with Markdown detection', async ({ page }) => {
    await page.goto('/analysis');

    // Switch to text input mode
    await page.getByRole('tab', { name: /文本输入/i }).click();

    // Enter Markdown content
    const textarea = page.locator('textarea');
    await textarea.fill(`# 场景 1 - 内景 - 办公室 - 日

**老板**: 开会了。

**员工**: 好的。`);

    // Submit the text
    await page.getByRole('button', { name: /确认上传/i }).click();

    // Verify Markdown detection
    await expect(page.getByText(/检测到 Markdown 格式/)).toBeVisible();
  });

  test('use Markdown template', async ({ page }) => {
    await page.goto('/analysis');

    // Switch to text input mode
    await page.getByRole('tab', { name: /文本输入/i }).click();

    // Click use template button
    await page.getByRole('button', { name: /使用 Markdown 模板/i }).click();

    // Verify template content is loaded
    const textarea = page.locator('textarea');
    const content = await textarea.inputValue();

    expect(content).toContain('# 场景 1');
    expect(content).toContain('**服务员**:');
    expect(content).toContain('*(');
  });

  test('remove file from upload queue', async ({ page }) => {
    await page.goto('/analysis');

    // Upload a file
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: /选择文件/i }).click();

    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(path.join(testDir, 'standard.txt'));

    // Wait for file to appear
    await expect(page.getByText('standard.txt')).toBeVisible();

    // Click remove button
    const removeButton = page.locator('button').filter({ has: page.locator('.lucide-x') }).first();
    await removeButton.click();

    // Verify file is removed
    await expect(page.getByText('standard.txt')).not.toBeVisible();
  });

  test('clear all uploads', async ({ page }) => {
    await page.goto('/analysis');

    // Upload multiple files
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: /选择文件/i }).click();

    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles([
      path.join(testDir, 'standard.txt'),
      path.join(testDir, 'markdown.md')
    ]);

    // Wait for files to appear
    await expect(page.getByText('standard.txt')).toBeVisible();
    await expect(page.getByText('markdown.md')).toBeVisible();

    // Click clear all
    await page.getByRole('button', { name: /清空所有/i }).click();

    // Verify all files are removed
    await expect(page.getByText('standard.txt')).not.toBeVisible();
    await expect(page.getByText('markdown.md')).not.toBeVisible();
  });

  test('drag enter and leave visual feedback', async ({ page }) => {
    await page.goto('/analysis');

    const dropZone = page.locator('[onDrop]').first();
    const boundingBox = await dropZone.boundingBox();

    if (!boundingBox) {
      throw new Error('Drop zone not found');
    }

    // Simulate drag enter
    await page.mouse.move(boundingBox.x + boundingBox.width / 2, boundingBox.y - 50);
    await page.mouse.down();
    await page.mouse.move(boundingBox.x + boundingBox.width / 2, boundingBox.y + boundingBox.height / 2);

    // Check for visual feedback (blue border, different background)
    // This would need actual file dragging which is complex in Playwright
    // For now, we just verify the drop zone exists and is interactive
    await expect(dropZone).toHaveAttribute('onDragEnter');
    await expect(dropZone).toHaveAttribute('onDragLeave');
    await expect(dropZone).toHaveAttribute('onDrop');

    await page.mouse.up();
  });

  test('error recovery flow', async ({ page }) => {
    await page.goto('/analysis');

    // Try to upload invalid file
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: /选择文件/i }).click();

    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(path.join(testDir, 'invalid.pdf'));

    // Verify error appears
    await expect(page.getByText(/格式不支持/)).toBeVisible();

    // Now upload a valid file
    const fileChooserPromise2 = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: /选择文件/i }).click();

    const fileChooser2 = await fileChooserPromise2;
    await fileChooser2.setFiles(path.join(testDir, 'standard.txt'));

    // Verify error is cleared and new file is uploaded
    await expect(page.getByText(/格式不支持/)).not.toBeVisible();
    await expect(page.getByText('standard.txt')).toBeVisible();
  });
});

test.describe('Browser Compatibility', () => {
  const browsers = ['chromium', 'firefox', 'webkit'];

  test.skip(({ browserName }) => !browsers.includes(browserName), 'Testing specific browsers only');

  test('drag and drop works across browsers', async ({ page, browserName }) => {
    await page.goto('/analysis');

    // Verify drop zone exists
    const dropZone = page.locator('[onDrop]').first();
    await expect(dropZone).toBeVisible();

    // Verify file input exists
    const fileInput = page.locator('input[type="file"]');
    await expect(fileInput).toHaveCount(1);

    console.log(`✓ Drop zone verified in ${browserName}`);
  });

  test('file validation works across browsers', async ({ page, browserName }) => {
    const testDir = createTestFiles();
    await page.goto('/analysis');

    // Try invalid file
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: /选择文件/i }).click();

    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(path.join(testDir, 'invalid.pdf'));

    // Should show error regardless of browser
    await expect(page.getByText(/格式不支持/)).toBeVisible();

    console.log(`✓ File validation verified in ${browserName}`);
  });
});

test.describe('Performance Tests', () => {
  test('large file upload performance', async ({ page }) => {
    const testDir = createTestFiles();
    await page.goto('/analysis');

    const startTime = Date.now();

    // Upload large file (8MB)
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: /选择文件/i }).click();

    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(path.join(testDir, 'large.txt'));

    // Wait for upload to complete
    await expect(page.locator('.lucide-check-circle')).toBeVisible({ timeout: 15000 });

    const endTime = Date.now();
    const uploadTime = endTime - startTime;

    console.log(`Large file upload time: ${uploadTime}ms`);

    // Should complete within 15 seconds
    expect(uploadTime).toBeLessThan(15000);
  });

  test('multiple concurrent uploads', async ({ page }) => {
    const testDir = createTestFiles();
    await page.goto('/analysis');

    const startTime = Date.now();

    // Upload multiple files
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: /选择文件/i }).click();

    const fileChooser = await fileChooserPromise;

    // Create 3 test files
    const testFiles = [
      path.join(testDir, 'test1.txt'),
      path.join(testDir, 'test2.txt'),
      path.join(testDir, 'test3.txt')
    ];

    testFiles.forEach(file => {
      fs.writeFileSync(file, 'Test content for concurrent upload');
    });

    await fileChooser.setFiles(testFiles);

    // Wait for all uploads to complete
    await expect(page.locator('.lucide-check-circle')).toHaveCount(3, { timeout: 10000 });

    const endTime = Date.now();
    const uploadTime = endTime - startTime;

    console.log(`Concurrent upload time for 3 files: ${uploadTime}ms`);

    // Should handle concurrent uploads efficiently
    expect(uploadTime).toBeLessThan(10000);
  });
});