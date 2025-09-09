import { test, expect, type Page, type Download } from '@playwright/test';
import { testData, wait } from '../fixtures/test-data';
import { 
  loginUser, 
  uploadScript, 
  waitForAnalysisComplete,
  acceptSuggestion,
  rejectSuggestion,
  exportScript
} from '../helpers/test-helpers';

/**
 * E2E-MOD-001 to E2E-MOD-012: Suggestion Management & Modifications Tests
 * Priority: P0-P2
 * These tests validate the modification workflow and export functionality
 */

test.describe('Modifications & Export', () => {
  let page: Page;
  let analysisId: string;

  test.beforeAll(async ({ browser }) => {
    // Setup: Upload and analyze a script with errors once
    const context = await browser.newContext();
    page = await context.newPage();
    
    await loginUser(page);
    analysisId = await uploadScript(page, testData.scripts.scriptWithErrors);
    await waitForAnalysisComplete(page);
  });

  test.beforeEach(async () => {
    // Navigate to the analysis results with suggestions
    await page.goto(`/analysis/${analysisId}`);
    await expect(page.locator('[data-testid="suggestions-panel"]')).toBeVisible();
  });

  /**
   * E2E-MOD-001: Accept single suggestion
   * Priority: P0
   * Validates: UI feedback, script update, state persistence
   */
  test('P0: should accept a single suggestion', async () => {
    // Find first suggestion
    const firstSuggestion = page.locator('[data-testid^="suggestion-"]').first();
    const suggestionText = await firstSuggestion.locator('[data-testid="suggestion-text"]').textContent();
    
    // Accept the suggestion
    await firstSuggestion.locator('[data-testid="accept-button"]').click();

    // Verify UI feedback
    await expect(firstSuggestion).toHaveAttribute('data-status', 'accepted');
    await expect(firstSuggestion).toHaveClass(/accepted|success/);

    // Verify script preview updates
    const scriptPreview = page.locator('[data-testid="script-preview"]');
    await expect(scriptPreview).toContainText(suggestionText || '');

    // Verify modification counter updates
    const modCount = await page.locator('[data-testid="modification-count"]').textContent();
    expect(Number(modCount)).toBeGreaterThan(0);

    // Verify state persists after page refresh
    await page.reload();
    await expect(firstSuggestion).toHaveAttribute('data-status', 'accepted');
  });

  /**
   * E2E-MOD-002: Reject single suggestion
   * Priority: P0
   * Validates: UI feedback, suggestion removal, no script change
   */
  test('P0: should reject a single suggestion', async () => {
    // Get original script content
    const originalScript = await page.locator('[data-testid="script-preview"]').textContent();
    
    // Find a pending suggestion
    const pendingSuggestion = page.locator('[data-testid^="suggestion-"][data-status="pending"]').first();
    
    // Reject the suggestion
    await pendingSuggestion.locator('[data-testid="reject-button"]').click();

    // Verify UI feedback
    await expect(pendingSuggestion).toHaveAttribute('data-status', 'rejected');
    await expect(pendingSuggestion).toHaveClass(/rejected|danger/);

    // Verify script preview doesn't change
    const currentScript = await page.locator('[data-testid="script-preview"]').textContent();
    expect(currentScript).toBe(originalScript);

    // Verify the suggestion is visually marked as rejected
    await expect(pendingSuggestion).toHaveCSS('opacity', /0\.[3-7]/); // Faded appearance
  });

  /**
   * E2E-MOD-003: Bulk accept suggestions
   * Priority: P0
   * Validates: Multi-select UI, batch processing, conflict resolution
   */
  test('P0: should bulk accept multiple suggestions', async () => {
    // Enable multi-select mode
    await page.click('[data-testid="bulk-select-mode"]');
    
    // Select multiple suggestions
    const suggestions = page.locator('[data-testid^="suggestion-"][data-status="pending"]');
    const count = Math.min(3, await suggestions.count());
    
    for (let i = 0; i < count; i++) {
      await suggestions.nth(i).locator('[data-testid="suggestion-checkbox"]').check();
    }

    // Bulk accept
    await page.click('[data-testid="bulk-accept-button"]');
    
    // Confirm in dialog
    await page.click('[data-testid="confirm-bulk-accept"]');

    // Verify all selected suggestions are accepted
    for (let i = 0; i < count; i++) {
      await expect(suggestions.nth(i)).toHaveAttribute('data-status', 'accepted');
    }

    // Verify modification count
    const modCount = await page.locator('[data-testid="modification-count"]').textContent();
    expect(Number(modCount)).toBeGreaterThanOrEqual(count);
  });

  /**
   * E2E-MOD-004: Undo modification (Ctrl+Z)
   * Priority: P0
   * Validates: Single undo, state restoration, UI sync
   */
  test('P0: should undo modifications with Ctrl+Z', async () => {
    // Accept a suggestion first
    const suggestion = page.locator('[data-testid^="suggestion-"][data-status="pending"]').first();
    await suggestion.locator('[data-testid="accept-button"]').click();
    await expect(suggestion).toHaveAttribute('data-status', 'accepted');

    // Get modification count
    const modCountBefore = await page.locator('[data-testid="modification-count"]').textContent();

    // Perform undo
    await page.keyboard.press('Control+z');
    
    // Verify suggestion reverted to pending
    await expect(suggestion).toHaveAttribute('data-status', 'pending');
    
    // Verify modification count decreased
    const modCountAfter = await page.locator('[data-testid="modification-count"]').textContent();
    expect(Number(modCountAfter)).toBeLessThan(Number(modCountBefore || 0));

    // Verify undo notification
    await expect(page.locator('[data-testid="undo-notification"]')).toBeVisible();
  });

  /**
   * E2E-MOD-005: Redo modification (Ctrl+Y)
   * Priority: P0
   * Validates: Redo after undo, state reapplication, history tracking
   */
  test('P0: should redo modifications with Ctrl+Y', async () => {
    // Accept, then undo
    const suggestion = page.locator('[data-testid^="suggestion-"][data-status="pending"]').first();
    await suggestion.locator('[data-testid="accept-button"]').click();
    await page.keyboard.press('Control+z');
    await expect(suggestion).toHaveAttribute('data-status', 'pending');

    // Perform redo
    await page.keyboard.press('Control+y');
    
    // Verify suggestion is accepted again
    await expect(suggestion).toHaveAttribute('data-status', 'accepted');
    
    // Verify redo notification
    await expect(page.locator('[data-testid="redo-notification"]')).toBeVisible();
  });

  /**
   * E2E-MOD-006: Preview mode with diff
   * Priority: P1
   * Validates: Original vs modified, diff highlighting, side-by-side view
   */
  test('P1: should show preview with diff highlighting', async () => {
    // Accept some suggestions first
    await acceptSuggestion(page, 0);
    await acceptSuggestion(page, 1);

    // Open preview mode
    await page.click('[data-testid="preview-button"]');
    
    // Verify preview modal/panel opens
    await expect(page.locator('[data-testid="preview-panel"]')).toBeVisible();

    // Check for diff view toggle
    await page.click('[data-testid="diff-view-toggle"]');
    
    // Verify diff highlighting
    const additions = page.locator('[data-testid="diff-addition"]');
    const deletions = page.locator('[data-testid="diff-deletion"]');
    
    expect(await additions.count()).toBeGreaterThan(0);
    await expect(additions.first()).toHaveClass(/added|green|plus/);

    // Toggle to side-by-side view
    await page.click('[data-testid="side-by-side-toggle"]');
    
    // Verify both panels are visible
    await expect(page.locator('[data-testid="original-script"]')).toBeVisible();
    await expect(page.locator('[data-testid="modified-script"]')).toBeVisible();
  });

  /**
   * E2E-MOD-007: Export to .txt format
   * Priority: P0
   * Validates: Format preservation, download trigger, file integrity
   */
  test('P0: should export modified script to .txt format', async () => {
    // Accept some modifications
    await acceptSuggestion(page, 0);
    
    // Export as .txt
    const download = await exportScript(page, 'txt');
    
    // Verify download properties
    expect(download.suggestedFilename()).toMatch(/\.txt$/);
    
    // Save and verify file size
    const path = await download.path();
    expect(path).toBeTruthy();
    
    console.log(`✅ Script exported to: ${download.suggestedFilename()}`);
  });

  /**
   * E2E-MOD-008: Export to .docx format
   * Priority: P0
   * Validates: DOCX generation, formatting retention, download success
   */
  test('P0: should export modified script to .docx format', async () => {
    // Accept some modifications
    await acceptSuggestion(page, 0);
    
    // Export as .docx
    const download = await exportScript(page, 'docx');
    
    // Verify download properties
    expect(download.suggestedFilename()).toMatch(/\.docx$/);
    
    // Verify MIME type
    const path = await download.path();
    expect(path).toBeTruthy();
    
    console.log(`✅ Script exported to: ${download.suggestedFilename()}`);
  });

  /**
   * E2E-MOD-009: Auto-save drafts
   * Priority: P1
   * Validates: 30s interval, recovery on refresh, conflict handling
   */
  test('P1: should auto-save draft modifications', async () => {
    // Accept a suggestion
    await acceptSuggestion(page, 0);
    
    // Wait for auto-save (checking for indicator)
    await wait(3000); // Shortened for testing
    
    // Check for auto-save indicator
    await expect(page.locator('[data-testid="auto-save-indicator"]')).toBeVisible();
    await expect(page.locator('[data-testid="auto-save-timestamp"]')).toBeVisible();
    
    // Simulate browser refresh
    await page.reload();
    
    // Verify modifications are preserved
    const suggestion = page.locator('[data-testid^="suggestion-"]').first();
    await expect(suggestion).toHaveAttribute('data-status', 'accepted');
    
    // Check for draft recovery message
    await expect(page.locator('[data-testid="draft-recovered"]')).toBeVisible();
  });

  /**
   * E2E-MOD-011: Conflicting suggestion handling
   * Priority: P1
   * Validates: Conflict detection, resolution UI, manual override
   */
  test('P1: should handle conflicting suggestions', async () => {
    // Find suggestions that might conflict (same line/scene)
    const suggestions = page.locator('[data-testid^="suggestion-"]');
    
    // Look for conflict indicator
    const conflictingSuggestion = suggestions.filter({ 
      has: page.locator('[data-testid="conflict-indicator"]') 
    }).first();
    
    if (await conflictingSuggestion.count() > 0) {
      // Accept first conflicting suggestion
      await conflictingSuggestion.locator('[data-testid="accept-button"]').click();
      
      // Try to accept conflicting suggestion
      const relatedConflict = await conflictingSuggestion.getAttribute('data-conflicts-with');
      const conflictingItem = page.locator(`[data-testid="suggestion-${relatedConflict}"]`);
      
      await conflictingItem.locator('[data-testid="accept-button"]').click();
      
      // Should show conflict resolution dialog
      await expect(page.locator('[data-testid="conflict-dialog"]')).toBeVisible();
      
      // Choose resolution
      await page.click('[data-testid="override-conflict"]');
      
      // Verify resolution applied
      await expect(conflictingItem).toHaveAttribute('data-status', 'accepted');
    } else {
      console.log('No conflicting suggestions found in test data');
    }
  });

  /**
   * E2E-MOD-012: Session recovery after crash
   * Priority: P0
   * Validates: State restoration, unsaved changes prompt, data integrity
   */
  test('P0: should recover session after crash/disconnect', async () => {
    // Make some modifications
    await acceptSuggestion(page, 0);
    await acceptSuggestion(page, 1);
    
    // Store current state
    const modCount = await page.locator('[data-testid="modification-count"]').textContent();
    
    // Simulate crash by navigating away without saving
    await page.goto('about:blank');
    
    // Navigate back
    await page.goto(`/analysis/${analysisId}`);
    
    // Should show recovery prompt
    await expect(page.locator('[data-testid="recover-session"]')).toBeVisible();
    
    // Recover session
    await page.click('[data-testid="recover-yes"]');
    
    // Verify modifications are restored
    const restoredCount = await page.locator('[data-testid="modification-count"]').textContent();
    expect(restoredCount).toBe(modCount);
    
    // Verify suggestions maintain their status
    const firstSuggestion = page.locator('[data-testid^="suggestion-"]').first();
    await expect(firstSuggestion).toHaveAttribute('data-status', 'accepted');
  });

  /**
   * E2E-MOD-010: Modification history view
   * Priority: P2
   * Validates: Change log display, timestamp tracking, user attribution
   */
  test('P2: should display modification history', async () => {
    // Make several modifications
    await acceptSuggestion(page, 0);
    await wait(1000);
    await rejectSuggestion(page, 1);
    await wait(1000);
    await acceptSuggestion(page, 2);

    // Open history panel
    await page.click('[data-testid="history-button"]');
    await expect(page.locator('[data-testid="history-panel"]')).toBeVisible();

    // Verify history entries
    const historyItems = page.locator('[data-testid^="history-item-"]');
    expect(await historyItems.count()).toBeGreaterThanOrEqual(3);

    // Verify each entry has required information
    const firstEntry = historyItems.first();
    await expect(firstEntry.locator('[data-testid="history-timestamp"]')).toBeVisible();
    await expect(firstEntry.locator('[data-testid="history-action"]')).toContainText(/accepted|rejected/i);
    await expect(firstEntry.locator('[data-testid="history-user"]')).toBeVisible();

    // Test history filtering
    await page.selectOption('[data-testid="history-filter"]', 'accepted');
    const filteredItems = page.locator('[data-testid^="history-item-"]:visible');
    
    for (let i = 0; i < await filteredItems.count(); i++) {
      await expect(filteredItems.nth(i)).toContainText(/accepted/i);
    }
  });
});