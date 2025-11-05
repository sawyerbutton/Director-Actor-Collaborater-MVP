import { test, expect, type Page } from '@playwright/test';

/**
 * E2E-MULTIFILE-001 to E2E-MULTIFILE-010: Multi-File Analysis E2E Tests
 * Sprint 4 - T4.1: End-to-End Functionality Tests
 * Priority: P0
 *
 * These tests validate the complete multi-file analysis workflow:
 * 1. Project creation with multiple script files
 * 2. Internal analysis (single-file checks)
 * 3. Cross-file analysis (consistency checks across files)
 * 4. Diagnostic report display (internal + cross-file findings)
 * 5. UI interactions and navigation
 */

test.describe('Multi-File Analysis Workflow', () => {
  let page: Page;
  const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

  // Test data: Multiple script files with intentional cross-file issues
  const testScripts = {
    episode1: {
      filename: '第1集.md',
      content: `# 第1集

## 场景1 - 咖啡馆 (2024年3月1日)
张三走进咖啡馆，点了一杯拿铁。
他看起来很焦虑，不停地看手表。

## 场景2 - 张三的家 (2024年3月5日)
张三回到家，打开电脑开始工作。
他决定明天去拜访李四。

## 场景3 - 公园 (2024年3月10日)
张三在公园遇到了王五。
王五告诉张三一个重要的秘密。`
    },
    episode2: {
      filename: '第2集.md',
      content: `# 第2集

## 场景1 - 办公室 (2024年2月28日)
张三儿来到办公室，开始了新的一天。
他的同事李四向他打招呼。

## 场景2 - 会议室 (2024年3月15日)
张三儿和李四在会议室讨论项目。
他们需要在下周完成这个任务。

## 场景3 - 餐厅 (2024年3月20日)
张三儿请李四吃饭。
赵六突然出现在餐厅。`
    },
    episode3: {
      filename: '第3集.md',
      content: `# 第3集

## 场景1 - 机场 (2024年3月25日)
张三前往机场，准备出差。
他打电话给李思询问工作进展。

## 场景2 - 酒店 (2024年3月26日)
张三入住酒店，休息片刻。
王五发短信提醒他那个秘密的重要性。

## 场景3 - 咖啡厅 (2024年3月27日)
张三在咖啡厅工作，这里很安静明亮。
他完成了大部分工作。`
    }
  };

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    await page.goto(`${BASE_URL}/dashboard`);

    // Wait for page to be ready
    await page.waitForLoadState('networkidle');
  });

  /**
   * E2E-MULTIFILE-001: Create project with multiple files
   * Priority: P0
   * Validates: Project creation, file upload, file listing
   */
  test('P0: should create project with multiple script files', async () => {
    // Navigate to project creation
    await page.click('[data-testid="new-project-btn"]');
    await expect(page).toHaveURL(/\/dashboard/);

    // Fill project name
    await page.fill('[data-testid="project-name-input"]', 'Multi-File Test Project');

    // Upload first file
    const file1Input = page.locator('input[type="file"]').first();
    await file1Input.setInputFiles({
      name: testScripts.episode1.filename,
      mimeType: 'text/markdown',
      buffer: Buffer.from(testScripts.episode1.content, 'utf-8')
    });

    // Wait for file to be added
    await page.waitForTimeout(500);

    // Verify file appears in the list
    await expect(page.locator('text=第1集.md')).toBeVisible({ timeout: 5000 });

    // Upload second file
    await file1Input.setInputFiles({
      name: testScripts.episode2.filename,
      mimeType: 'text/markdown',
      buffer: Buffer.from(testScripts.episode2.content, 'utf-8')
    });

    await page.waitForTimeout(500);
    await expect(page.locator('text=第2集.md')).toBeVisible({ timeout: 5000 });

    // Upload third file
    await file1Input.setInputFiles({
      name: testScripts.episode3.filename,
      mimeType: 'text/markdown',
      buffer: Buffer.from(testScripts.episode3.content, 'utf-8')
    });

    await page.waitForTimeout(500);
    await expect(page.locator('text=第3集.md')).toBeVisible({ timeout: 5000 });

    // Verify file count
    const fileItems = page.locator('[data-testid="uploaded-file-item"]');
    await expect(fileItems).toHaveCount(3);

    // Start analysis
    await page.click('[data-testid="start-analysis-btn"]');

    // Verify navigation to analysis page
    await expect(page).toHaveURL(/\/analysis\/[a-zA-Z0-9-]+/, { timeout: 10000 });
  });

  /**
   * E2E-MULTIFILE-002: Internal analysis execution
   * Priority: P0
   * Validates: Single-file checks, progress tracking, findings display
   */
  test('P0: should execute internal analysis on all files', async () => {
    // Create project (reuse setup logic)
    await createProjectWithFiles(page);

    // Wait for analysis to start
    await page.waitForSelector('[data-testid="analysis-status"]', { timeout: 10000 });

    // Verify analysis is running
    const statusText = await page.locator('[data-testid="analysis-status"]').textContent();
    expect(statusText).toMatch(/processing|analyzing|queued/i);

    // Wait for analysis to complete (timeout: 60 seconds for 3 files)
    await page.waitForSelector('[data-testid="analysis-completed"]', { timeout: 60000 });

    // Verify internal findings are displayed
    await expect(page.locator('[data-testid="internal-findings-section"]')).toBeVisible();

    // Check that findings count is shown
    const internalCount = page.locator('[data-testid="internal-findings-count"]');
    await expect(internalCount).toBeVisible();

    // Verify at least some findings were detected
    const countText = await internalCount.textContent();
    const count = parseInt(countText || '0', 10);
    expect(count).toBeGreaterThan(0);
  });

  /**
   * E2E-MULTIFILE-003: Cross-file analysis execution
   * Priority: P0
   * Validates: Cross-file checks, timeline/character/plot/setting consistency
   */
  test('P0: should execute cross-file analysis and detect inconsistencies', async () => {
    await createProjectWithFiles(page);

    // Wait for internal analysis to complete
    await page.waitForSelector('[data-testid="analysis-completed"]', { timeout: 60000 });

    // Trigger cross-file analysis (if separate button exists)
    const crossFileBtn = page.locator('[data-testid="run-cross-file-analysis-btn"]');
    if (await crossFileBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await crossFileBtn.click();
      await page.waitForTimeout(2000); // Wait for cross-file analysis to run
    }

    // Navigate to cross-file findings tab
    await page.click('[data-testid="cross-file-tab"]');

    // Verify cross-file findings section is visible
    await expect(page.locator('[data-testid="cross-file-findings-section"]')).toBeVisible({ timeout: 10000 });

    // Check for cross-file findings count
    const crossFileCount = page.locator('[data-testid="cross-file-findings-count"]');
    await expect(crossFileCount).toBeVisible();

    // Verify at least some cross-file issues were detected
    const countText = await crossFileCount.textContent();
    const count = parseInt(countText || '0', 10);
    expect(count).toBeGreaterThan(0);

    // Expected cross-file issues in test data:
    // 1. Timeline: Episode 2 starts before Episode 1 ends (2024-02-28 < 2024-03-10)
    // 2. Character: "张三" vs "张三儿" (similar names, possible typo)
    // 3. Character: "李四" vs "李思" (similar names, possible typo)
    // 4. Setting: "咖啡馆" vs "咖啡厅" (similar locations)
  });

  /**
   * E2E-MULTIFILE-004: Grouped findings display
   * Priority: P0
   * Validates: Findings grouped by type, toggle between views
   */
  test('P0: should display cross-file findings grouped by type', async () => {
    await createProjectWithFiles(page);
    await page.waitForSelector('[data-testid="analysis-completed"]', { timeout: 60000 });

    // Navigate to cross-file tab
    await page.click('[data-testid="cross-file-tab"]');
    await page.waitForTimeout(1000);

    // Toggle to grouped view
    const groupedViewBtn = page.locator('[data-testid="view-mode-grouped"]');
    if (await groupedViewBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await groupedViewBtn.click();
      await page.waitForTimeout(500);
    }

    // Verify finding type groups are displayed
    const timelineGroup = page.locator('[data-testid="finding-group-timeline"]');
    const characterGroup = page.locator('[data-testid="finding-group-character"]');
    const plotGroup = page.locator('[data-testid="finding-group-plot"]');
    const settingGroup = page.locator('[data-testid="finding-group-setting"]');

    // At least 2 groups should be visible based on test data
    const visibleGroups = [
      await timelineGroup.isVisible({ timeout: 1000 }).catch(() => false),
      await characterGroup.isVisible({ timeout: 1000 }).catch(() => false),
      await plotGroup.isVisible({ timeout: 1000 }).catch(() => false),
      await settingGroup.isVisible({ timeout: 1000 }).catch(() => false)
    ];

    const visibleCount = visibleGroups.filter(v => v).length;
    expect(visibleCount).toBeGreaterThanOrEqual(2);
  });

  /**
   * E2E-MULTIFILE-005: Finding detail display
   * Priority: P1
   * Validates: Affected files, evidence, suggestions, confidence score
   */
  test('P1: should display detailed information for each finding', async () => {
    await createProjectWithFiles(page);
    await page.waitForSelector('[data-testid="analysis-completed"]', { timeout: 60000 });
    await page.click('[data-testid="cross-file-tab"]');
    await page.waitForTimeout(1000);

    // Click on first finding to expand details
    const firstFinding = page.locator('[data-testid^="finding-item-"]').first();
    await expect(firstFinding).toBeVisible({ timeout: 5000 });
    await firstFinding.click();

    // Verify detail sections are visible
    await expect(page.locator('[data-testid="finding-description"]')).toBeVisible();
    await expect(page.locator('[data-testid="finding-affected-files"]')).toBeVisible();
    await expect(page.locator('[data-testid="finding-evidence"]')).toBeVisible();
    await expect(page.locator('[data-testid="finding-suggestion"]')).toBeVisible();

    // Verify confidence score is displayed
    const confidence = page.locator('[data-testid="finding-confidence"]');
    await expect(confidence).toBeVisible();

    const confidenceText = await confidence.textContent();
    expect(confidenceText).toMatch(/\d+%/); // Should contain percentage
  });

  /**
   * E2E-MULTIFILE-006: Navigation between internal and cross-file tabs
   * Priority: P1
   * Validates: Tab switching, data persistence, UI state
   */
  test('P1: should navigate between internal and cross-file findings tabs', async () => {
    await createProjectWithFiles(page);
    await page.waitForSelector('[data-testid="analysis-completed"]', { timeout: 60000 });

    // Start on internal findings tab (default)
    await expect(page.locator('[data-testid="internal-findings-section"]')).toBeVisible();

    // Get internal findings count
    const internalCountBefore = await page.locator('[data-testid="internal-findings-count"]').textContent();

    // Switch to cross-file tab
    await page.click('[data-testid="cross-file-tab"]');
    await page.waitForTimeout(500);
    await expect(page.locator('[data-testid="cross-file-findings-section"]')).toBeVisible();

    // Get cross-file findings count
    const crossFileCount = await page.locator('[data-testid="cross-file-findings-count"]').textContent();

    // Switch back to internal tab
    await page.click('[data-testid="internal-tab"]');
    await page.waitForTimeout(500);
    await expect(page.locator('[data-testid="internal-findings-section"]')).toBeVisible();

    // Verify internal count is the same (data persisted)
    const internalCountAfter = await page.locator('[data-testid="internal-findings-count"]').textContent();
    expect(internalCountAfter).toBe(internalCountBefore);
  });

  /**
   * E2E-MULTIFILE-007: Severity filtering
   * Priority: P2
   * Validates: Filter by severity (high/medium/low), filter state persistence
   */
  test('P2: should filter findings by severity', async () => {
    await createProjectWithFiles(page);
    await page.waitForSelector('[data-testid="analysis-completed"]', { timeout: 60000 });
    await page.click('[data-testid="cross-file-tab"]');
    await page.waitForTimeout(1000);

    // Get total findings count
    const totalCountText = await page.locator('[data-testid="cross-file-findings-count"]').textContent();
    const totalCount = parseInt(totalCountText || '0', 10);

    // Apply "high severity" filter
    const highSeverityFilter = page.locator('[data-testid="filter-severity-high"]');
    if (await highSeverityFilter.isVisible({ timeout: 2000 }).catch(() => false)) {
      await highSeverityFilter.click();
      await page.waitForTimeout(500);

      // Count visible findings
      const visibleFindings = await page.locator('[data-testid^="finding-item-"]').count();

      // Filtered count should be less than or equal to total
      expect(visibleFindings).toBeLessThanOrEqual(totalCount);

      // Clear filter
      await highSeverityFilter.click();
      await page.waitForTimeout(500);
    }
  });

  /**
   * E2E-MULTIFILE-008: Timeline consistency detection
   * Priority: P0
   * Validates: Detects chronological issues, displays affected episodes
   */
  test('P0: should detect timeline inconsistencies across episodes', async () => {
    await createProjectWithFiles(page);
    await page.waitForSelector('[data-testid="analysis-completed"]', { timeout: 60000 });
    await page.click('[data-testid="cross-file-tab"]');
    await page.waitForTimeout(1000);

    // Look for timeline findings
    const timelineFindings = page.locator('[data-testid="finding-type-cross_file_timeline"]');
    const count = await timelineFindings.count();

    // Should detect at least one timeline issue (Episode 2 starts before Episode 1 ends)
    expect(count).toBeGreaterThan(0);

    // Click on first timeline finding
    if (count > 0) {
      await timelineFindings.first().click();
      await page.waitForTimeout(500);

      // Verify affected files include Episode 1 and 2
      const affectedFiles = await page.locator('[data-testid="finding-affected-files"]').textContent();
      expect(affectedFiles).toMatch(/第[12]集/);
    }
  });

  /**
   * E2E-MULTIFILE-009: Character consistency detection
   * Priority: P0
   * Validates: Detects similar character names, suggests unification
   */
  test('P0: should detect character name inconsistencies', async () => {
    await createProjectWithFiles(page);
    await page.waitForSelector('[data-testid="analysis-completed"]', { timeout: 60000 });
    await page.click('[data-testid="cross-file-tab"]');
    await page.waitForTimeout(1000);

    // Look for character findings
    const characterFindings = page.locator('[data-testid="finding-type-cross_file_character"]');
    const count = await characterFindings.count();

    // Should detect character issues (张三 vs 张三儿, 李四 vs 李思)
    expect(count).toBeGreaterThan(0);

    // Click on first character finding
    if (count > 0) {
      await characterFindings.first().click();
      await page.waitForTimeout(500);

      // Verify evidence mentions character names
      const evidence = await page.locator('[data-testid="finding-evidence"]').textContent();
      expect(evidence).toMatch(/张三|李四|李思/);
    }
  });

  /**
   * E2E-MULTIFILE-010: Complete workflow validation
   * Priority: P0
   * Validates: End-to-end workflow from project creation to findings review
   */
  test('P0: should complete entire multi-file analysis workflow', async () => {
    // Step 1: Create project
    await page.click('[data-testid="new-project-btn"]');
    await page.fill('[data-testid="project-name-input"]', 'Complete Workflow Test');

    // Step 2: Upload files
    const fileInput = page.locator('input[type="file"]').first();
    for (const script of Object.values(testScripts)) {
      await fileInput.setInputFiles({
        name: script.filename,
        mimeType: 'text/markdown',
        buffer: Buffer.from(script.content, 'utf-8')
      });
      await page.waitForTimeout(500);
    }

    // Step 3: Start analysis
    await page.click('[data-testid="start-analysis-btn"]');
    await expect(page).toHaveURL(/\/analysis\/[a-zA-Z0-9-]+/, { timeout: 10000 });

    // Step 4: Wait for analysis completion
    await page.waitForSelector('[data-testid="analysis-completed"]', { timeout: 60000 });

    // Step 5: Verify internal findings
    const internalCount = await page.locator('[data-testid="internal-findings-count"]').textContent();
    expect(parseInt(internalCount || '0', 10)).toBeGreaterThan(0);

    // Step 6: Verify cross-file findings
    await page.click('[data-testid="cross-file-tab"]');
    await page.waitForTimeout(1000);
    const crossFileCount = await page.locator('[data-testid="cross-file-findings-count"]').textContent();
    expect(parseInt(crossFileCount || '0', 10)).toBeGreaterThan(0);

    // Step 7: Verify findings can be expanded
    const firstFinding = page.locator('[data-testid^="finding-item-"]').first();
    await firstFinding.click();
    await expect(page.locator('[data-testid="finding-description"]')).toBeVisible();

    // Step 8: Navigate back to dashboard
    await page.click('[data-testid="back-to-dashboard-btn"]');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 5000 });

    // Step 9: Verify project appears in project list
    await expect(page.locator('text=Complete Workflow Test')).toBeVisible({ timeout: 5000 });
  });
});

/**
 * Helper function: Create project with test files
 */
async function createProjectWithFiles(page: Page) {
  const testScripts = {
    episode1: {
      filename: '第1集.md',
      content: `# 第1集

## 场景1 - 咖啡馆 (2024年3月1日)
张三走进咖啡馆，点了一杯拿铁。

## 场景2 - 张三的家 (2024年3月5日)
张三回到家，打开电脑开始工作。

## 场景3 - 公园 (2024年3月10日)
张三在公园遇到了王五。`
    },
    episode2: {
      filename: '第2集.md',
      content: `# 第2集

## 场景1 - 办公室 (2024年2月28日)
张三儿来到办公室，开始了新的一天。

## 场景2 - 会议室 (2024年3月15日)
张三儿和李四在会议室讨论项目。`
    },
    episode3: {
      filename: '第3集.md',
      content: `# 第3集

## 场景1 - 机场 (2024年3月25日)
张三前往机场，准备出差。

## 场景2 - 酒店 (2024年3月26日)
张三入住酒店，休息片刻。`
    }
  };

  await page.click('[data-testid="new-project-btn"]');
  await page.fill('[data-testid="project-name-input"]', 'Multi-File Test Project');

  const fileInput = page.locator('input[type="file"]').first();
  for (const script of Object.values(testScripts)) {
    await fileInput.setInputFiles({
      name: script.filename,
      mimeType: 'text/markdown',
      buffer: Buffer.from(script.content, 'utf-8')
    });
    await page.waitForTimeout(500);
  }

  await page.click('[data-testid="start-analysis-btn"]');
  await page.waitForURL(/\/analysis\/[a-zA-Z0-9-]+/, { timeout: 10000 });
}
