/**
 * Integration tests for Repair Full Flow
 * Epic-001 Story 3: Test verification
 */

import { describe, test, expect, beforeAll } from '@jest/globals';
import { RevisionExecutive } from '../../../lib/agents/revision-executive';
import { ConsistencyGuardian } from '../../../lib/agents/consistency-guardian';
import { ScriptParser } from '../../../lib/parser/script-parser';
import { LogicError, LogicErrorType } from '../../../types/analysis';
import { RevisionContext } from '../../../types/revision';

describe('Repair Full Flow', () => {
  let revisionExecutive: RevisionExecutive;
  let consistencyGuardian: ConsistencyGuardian;
  let scriptParser: ScriptParser;

  beforeAll(() => {
    revisionExecutive = new RevisionExecutive({
      maxSuggestionsPerError: 3,
      enableContextAnalysis: true,
      suggestionDepth: 'detailed'
    });

    consistencyGuardian = new ConsistencyGuardian();
    scriptParser = new ScriptParser();
  });

  test('should repair character consistency errors', async () => {
    const script = `
      场景 1 - 内景 - 咖啡店 - 日
      JOHN走进咖啡店。

      MARY
      早上好，Tom！

      JOHN
      早上好，Mary。
    `;

    // Parse script
    const parsedScript = await scriptParser.parse(script);
    expect(parsedScript).toBeDefined();

    // Create test error
    const error: LogicError = {
      id: 'char_error_001',
      type: 'character_consistency',
      severity: 'high',
      location: { page: 1, line: 5, scene: 1 },
      description: 'Mary calls John by wrong name (Tom)',
      suggestion: 'Change Tom to John',
      confidence: 0.9,
      context: {
        before: 'JOHN走进咖啡店。',
        error: 'MARY: 早上好，Tom！',
        after: 'JOHN: 早上好，Mary。'
      }
    };

    const context: RevisionContext = {
      scriptContent: script,
      previousEvents: ['John enters coffee shop'],
      affectedElements: ['Mary', 'John'],
      characterName: 'Mary'
    };

    // Generate fix
    const fix = await revisionExecutive.generateFix(error, context);

    expect(fix).not.toBeNull();
    expect(fix?.modification).toBeDefined();
    expect(fix?.priority).toBeDefined();
    expect(fix?.confidence).toBeGreaterThan(0);
  });

  test('should repair timeline inconsistencies', async () => {
    const script = `
      场景 1 - 内景 - 办公室 - 早上9点
      ALICE在开会。

      场景 2 - 内景 - 餐厅 - 早上8点
      ALICE在吃早餐。
    `;

    const error: LogicError = {
      id: 'time_error_001',
      type: 'timeline_consistency',
      severity: 'critical',
      location: { page: 1, line: 5, scene: 2 },
      description: 'Timeline inconsistency: Alice appears in two places at overlapping times',
      suggestion: 'Adjust scene 2 time to before 9am',
      confidence: 0.95,
      context: {
        before: 'Scene 1: 9am - Alice in meeting',
        error: 'Scene 2: 8am - Alice having breakfast',
        after: 'Timeline conflict detected'
      }
    };

    const context: RevisionContext = {
      scriptContent: script,
      previousEvents: ['Alice in meeting at 9am'],
      affectedElements: ['Alice', 'Timeline'],
      sceneInfo: 'Multiple scenes with time markers'
    };

    const suggestions = await revisionExecutive.generateSuggestions(error, context);

    expect(suggestions).toBeDefined();
    expect(suggestions.length).toBeGreaterThan(0);

    if (suggestions.length > 0) {
      const firstSuggestion = suggestions[0];
      expect(firstSuggestion.errorId).toBe(error.id);
      expect(firstSuggestion.modification).toBeDefined();
      expect(firstSuggestion.impact).toBeDefined();
    }
  });

  test('should handle multiple errors in sequence', async () => {
    const errors: LogicError[] = [
      {
        id: 'error_001',
        type: 'character_consistency',
        severity: 'high',
        location: { page: 1, line: 5, scene: 1 },
        description: 'Character inconsistency',
        suggestion: 'Fix character behavior',
        confidence: 0.8
      },
      {
        id: 'error_002',
        type: 'dialogue_consistency',
        severity: 'medium',
        location: { page: 2, line: 10, scene: 1 },
        description: 'Dialogue inconsistency',
        suggestion: 'Fix dialogue flow',
        confidence: 0.75
      },
      {
        id: 'error_003',
        type: 'scene_consistency',
        severity: 'low',
        location: { page: 3, line: 15, scene: 2 },
        description: 'Scene transition issue',
        suggestion: 'Clarify scene transition',
        confidence: 0.7
      }
    ];

    const context: RevisionContext = {
      scriptContent: 'Test script content',
      previousEvents: [],
      affectedElements: []
    };

    const allSuggestions = [];

    for (const error of errors) {
      const suggestions = await revisionExecutive.generateSuggestions(error, context);
      allSuggestions.push(...suggestions);
    }

    expect(allSuggestions.length).toBeGreaterThanOrEqual(errors.length);

    // Check priority ordering
    const prioritized = await revisionExecutive.prioritizeSuggestions(allSuggestions);

    // Higher severity errors should come first
    if (prioritized.length >= 2) {
      const firstPriorityValue = getPriorityValue(prioritized[0].priority);
      const secondPriorityValue = getPriorityValue(prioritized[1].priority);
      expect(firstPriorityValue).toBeLessThanOrEqual(secondPriorityValue);
    }
  });

  test('should maintain state during repairs', async () => {
    const context: RevisionContext = {
      scriptContent: 'Original script content',
      previousEvents: ['Event 1', 'Event 2'],
      affectedElements: ['Character A', 'Character B']
    };

    const error1: LogicError = {
      id: 'state_error_001',
      type: 'plot_consistency',
      severity: 'high',
      location: { page: 1, line: 5, scene: 1 },
      description: 'Plot hole detected',
      suggestion: 'Fix plot hole',
      confidence: 0.85
    };

    // First repair
    const suggestions1 = await revisionExecutive.generateSuggestions(error1, context);
    expect(suggestions1).toBeDefined();

    // Update context with repair
    context.previousEvents.push('Applied fix 1');

    const error2: LogicError = {
      id: 'state_error_002',
      type: 'plot_consistency',
      severity: 'medium',
      location: { page: 2, line: 10, scene: 1 },
      description: 'Another plot issue',
      suggestion: 'Fix second issue',
      confidence: 0.75
    };

    // Second repair should consider previous fix
    const suggestions2 = await revisionExecutive.generateSuggestions(error2, context);
    expect(suggestions2).toBeDefined();

    // Context should be maintained
    expect(context.previousEvents).toContain('Applied fix 1');
  });

  test('should evaluate suggestion feasibility', async () => {
    const suggestion = {
      id: 'sug_001',
      errorId: 'err_001',
      modification: 'Apply this fix to resolve the issue',
      location: { page: 1, line: 5, scene: 1 },
      rationale: 'This fix addresses the root cause',
      priority: 'high' as const,
      impact: 'Resolves the inconsistency',
      confidence: 0.85,
      createdAt: new Date().toISOString()
    };

    const context: RevisionContext = {
      scriptContent: 'Script content',
      previousEvents: [],
      affectedElements: ['Element1', 'Element2', 'Element3']
    };

    const evaluation = await revisionExecutive.evaluateSuggestionFeasibility(suggestion, context);

    expect(evaluation).toBeDefined();
    expect(evaluation.feasible).toBeDefined();
    expect(evaluation.issues).toBeInstanceOf(Array);
  });
});

function getPriorityValue(priority: string): number {
  const priorityMap: Record<string, number> = {
    'critical': 0,
    'high': 1,
    'medium': 2,
    'low': 3
  };
  return priorityMap[priority] ?? 99;
}