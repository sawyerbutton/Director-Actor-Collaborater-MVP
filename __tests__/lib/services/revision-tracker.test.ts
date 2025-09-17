import { RevisionTracker } from '@/lib/services/revision-tracker';
import type { RevisionError } from '@/lib/stores/revision-store';

describe('RevisionTracker', () => {
  let tracker: RevisionTracker;
  const originalScript = `第一场
角色A：这是第一句台词
角色B：这是第二句台词

第二场
角色C：这是第三句台词`;

  beforeEach(() => {
    tracker = new RevisionTracker(originalScript);
  });

  describe('addModification', () => {
    it('should add a modification for an error with suggestion', () => {
      const error: RevisionError = {
        id: 'error-1',
        category: 'logic',
        severity: 'high',
        message: 'Test error',
        suggestion: '将"第一句"改为"开场白"',
        context: {
          line: 2,
          character: 5,
          snippet: '这是第一句台词'
        },
        status: 'accepted'
      };

      const modification = tracker.addModification(error);
      
      expect(modification).not.toBeNull();
      expect(modification?.id).toBe('mod-error-1');
      expect(modification?.originalText).toBe('这是第一句台词');
      expect(modification?.errorId).toBe('error-1');
    });

    it('should return null for error without suggestion', () => {
      const error: RevisionError = {
        id: 'error-2',
        category: 'logic',
        severity: 'low',
        message: 'Test error',
        status: 'pending'
      };

      const modification = tracker.addModification(error);
      expect(modification).toBeNull();
    });
  });

  describe('applyModification', () => {
    it('should mark modification as applied', () => {
      const error: RevisionError = {
        id: 'error-1',
        category: 'logic',
        severity: 'high',
        message: 'Test error',
        suggestion: '替换为"新台词"',
        context: {
          line: 2,
          snippet: '这是第一句台词'
        },
        status: 'accepted'
      };

      tracker.addModification(error);
      const result = tracker.applyModification('error-1');
      
      expect(result).toBe(true);
      expect(tracker.getAppliedCount()).toBe(1);
    });

    it('should return false for non-existent modification', () => {
      const result = tracker.applyModification('non-existent');
      expect(result).toBe(false);
    });
  });

  describe('detectConflicts', () => {
    it('should detect overlapping modifications', () => {
      const error1: RevisionError = {
        id: 'error-1',
        category: 'logic',
        severity: 'high',
        message: 'Error 1',
        suggestion: '修改建议1',
        context: {
          line: 2,
          snippet: '这是第一句台词'
        },
        status: 'accepted'
      };

      const error2: RevisionError = {
        id: 'error-2',
        category: 'logic',
        severity: 'medium',
        message: 'Error 2',
        suggestion: '修改建议2',
        context: {
          line: 2,
          snippet: '第一句'
        },
        status: 'accepted'
      };

      tracker.addModification(error1);
      tracker.addModification(error2);
      tracker.applyModification('error-1');
      tracker.applyModification('error-2');

      const conflicts = tracker.detectConflicts();
      
      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].reason).toBe('修改位置重叠');
    });

    it('should not detect conflicts for non-overlapping modifications', () => {
      const error1: RevisionError = {
        id: 'error-1',
        category: 'logic',
        severity: 'high',
        message: 'Error 1',
        suggestion: '修改建议1',
        context: {
          line: 2,
          snippet: '这是第一句台词'
        },
        status: 'accepted'
      };

      const error2: RevisionError = {
        id: 'error-2',
        category: 'logic',
        severity: 'medium',
        message: 'Error 2',
        suggestion: '修改建议2',
        context: {
          line: 6,
          snippet: '这是第三句台词'
        },
        status: 'accepted'
      };

      tracker.addModification(error1);
      tracker.addModification(error2);
      tracker.applyModification('error-1');
      tracker.applyModification('error-2');

      const conflicts = tracker.detectConflicts();
      
      expect(conflicts).toHaveLength(0);
    });
  });

  describe('applyModificationsToScript', () => {
    it('should apply accepted modifications to the script', () => {
      const error: RevisionError = {
        id: 'error-1',
        category: 'logic',
        severity: 'high',
        message: 'Test error',
        suggestion: '替换为"新的台词"',
        context: {
          line: 2,
          snippet: '这是第一句台词'
        },
        status: 'accepted'
      };

      tracker.addModification(error);
      tracker.applyModification('error-1');
      
      const modifiedScript = tracker.applyModificationsToScript(['error-1']);
      
      expect(modifiedScript).toContain('新的台词');
      expect(modifiedScript).not.toContain('这是第一句台词');
    });

    it('should maintain script structure when applying modifications', () => {
      const error: RevisionError = {
        id: 'error-1',
        category: 'logic',
        severity: 'high',
        message: 'Test error',
        suggestion: '替换为"修改后的台词"',
        context: {
          line: 3,
          snippet: '这是第二句台词'
        },
        status: 'accepted'
      };

      tracker.addModification(error);
      tracker.applyModification('error-1');
      
      const modifiedScript = tracker.applyModificationsToScript(['error-1']);
      const lines = modifiedScript.split('\n');
      
      expect(lines).toHaveLength(6); // Same number of lines as original
      expect(lines[0]).toBe('第一场');
      expect(lines[4]).toBe('第二场');
    });
  });

  describe('clearAll', () => {
    it('should clear all modifications', () => {
      const error: RevisionError = {
        id: 'error-1',
        category: 'logic',
        severity: 'high',
        message: 'Test error',
        suggestion: '修改建议',
        context: {
          line: 2,
          snippet: '这是第一句台词'
        },
        status: 'accepted'
      };

      tracker.addModification(error);
      expect(tracker.getModificationCount()).toBe(1);
      
      tracker.clearAll();
      expect(tracker.getModificationCount()).toBe(0);
    });
  });
});