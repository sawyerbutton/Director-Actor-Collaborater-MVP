import { RevisionTracker } from './revision-tracker';
import type { RevisionError } from '@/lib/stores/revision-store';
import * as Diff from 'diff';

export interface MergeResult {
  mergedScript: string;
  changes: Array<{
    type: 'add' | 'remove' | 'normal';
    value: string;
    lineNumber?: number;
  }>;
  appliedCount: number;
  conflicts: Array<{
    line: number;
    description: string;
  }>;
}

export class ScriptMerger {
  private tracker: RevisionTracker;
  private originalScript: string;

  constructor(originalScript: string) {
    this.originalScript = originalScript;
    this.tracker = new RevisionTracker(originalScript);
  }

  setOriginalScript(script: string) {
    this.originalScript = script;
    this.tracker.setOriginalScript(script);
  }

  processAcceptedErrors(acceptedErrors: RevisionError[]): MergeResult {
    // Clear previous modifications
    this.tracker.clearAll();

    // Add modifications for accepted errors
    acceptedErrors.forEach(error => {
      if (error.status === 'accepted') {
        this.tracker.addModification(error);
        this.tracker.applyModification(error.id);
      }
    });

    // Apply modifications to get merged script
    const acceptedErrorIds = acceptedErrors
      .filter(e => e.status === 'accepted')
      .map(e => e.id);
    
    const mergedScript = this.tracker.applyModificationsToScript(acceptedErrorIds);

    // Calculate differences
    const changes = this.calculateChanges(this.originalScript, mergedScript);

    // Detect conflicts
    const trackerConflicts = this.tracker.detectConflicts();
    const conflicts = trackerConflicts.map(conflict => ({
      line: conflict.modification1.startLine + 1,
      description: conflict.reason
    }));

    return {
      mergedScript,
      changes,
      appliedCount: this.tracker.getAppliedCount(),
      conflicts
    };
  }

  private calculateChanges(original: string, modified: string): MergeResult['changes'] {
    const changes: MergeResult['changes'] = [];
    const diff = Diff.diffLines(original, modified);
    
    let currentLine = 1;

    diff.forEach(part => {
      const lines = part.value.split('\n').filter(line => line !== '');
      
      if (part.added) {
        changes.push({
          type: 'add',
          value: part.value,
          lineNumber: currentLine
        });
      } else if (part.removed) {
        changes.push({
          type: 'remove',
          value: part.value,
          lineNumber: currentLine
        });
      } else {
        changes.push({
          type: 'normal',
          value: part.value,
          lineNumber: currentLine
        });
        currentLine += lines.length;
      }

      if (!part.removed) {
        currentLine += lines.length;
      }
    });

    return changes;
  }

  getMergedScriptWithHighlights(acceptedErrors: RevisionError[]): string {
    const result = this.processAcceptedErrors(acceptedErrors);
    const lines = result.mergedScript.split('\n');
    const highlightedLines: string[] = [];

    let lineIndex = 0;
    result.changes.forEach(change => {
      if (change.type === 'add') {
        const changeLines = change.value.split('\n').filter(line => line !== '');
        changeLines.forEach(line => {
          highlightedLines.push(`+ ${line}`);
        });
      } else if (change.type === 'remove') {
        const changeLines = change.value.split('\n').filter(line => line !== '');
        changeLines.forEach(line => {
          highlightedLines.push(`- ${line}`);
        });
      } else {
        const changeLines = change.value.split('\n').filter(line => line !== '');
        changeLines.forEach(line => {
          highlightedLines.push(`  ${line}`);
        });
      }
    });

    return highlightedLines.join('\n');
  }

  getStatistics(acceptedErrors: RevisionError[]): {
    totalErrors: number;
    acceptedCount: number;
    rejectedCount: number;
    pendingCount: number;
    linesModified: number;
    conflictsCount: number;
  } {
    const result = this.processAcceptedErrors(acceptedErrors);
    
    const acceptedCount = acceptedErrors.filter(e => e.status === 'accepted').length;
    const rejectedCount = acceptedErrors.filter(e => e.status === 'rejected').length;
    const pendingCount = acceptedErrors.filter(e => e.status === 'pending').length;
    
    const linesModified = result.changes.filter(c => c.type !== 'normal').length;

    return {
      totalErrors: acceptedErrors.length,
      acceptedCount,
      rejectedCount,
      pendingCount,
      linesModified,
      conflictsCount: result.conflicts.length
    };
  }
}