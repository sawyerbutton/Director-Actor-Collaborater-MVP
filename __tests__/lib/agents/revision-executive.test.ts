import { RevisionExecutive } from '@/lib/agents/revision-executive';
import { LogicError, LogicErrorType, ErrorSeverity } from '@/types/analysis';
import { RevisionContext, SuggestionPriority } from '@/types/revision';
import { DeepSeekClient } from '@/lib/api/deepseek/client';

jest.mock('@/lib/api/deepseek/client');
jest.mock('@/lib/agents/ai-output-validator', () => ({
  AIOutputValidator: {
    sanitizeString: jest.fn((str) => str),
    validatePromptParams: jest.fn((params) => params),
    containsSecurityRisk: jest.fn(() => false),
    safeJSONParse: jest.fn((str) => {
      try {
        const jsonMatch = str.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
        return JSON.parse(str);
      } catch {
        return null;
      }
    }),
    validateSuggestions: jest.fn((input) => {
      if (typeof input === 'string') {
        try {
          const jsonMatch = input.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            input = JSON.parse(jsonMatch[0]);
          } else {
            input = JSON.parse(input);
          }
        } catch {
          return null;
        }
      }
      return Array.isArray(input) ? input : null;
    })
  }
}));

describe('RevisionExecutive', () => {
  let revisionExecutive: RevisionExecutive;

  beforeEach(() => {
    jest.clearAllMocks();
    revisionExecutive = new RevisionExecutive();
  });

  describe('generateSuggestions', () => {
    it('should generate suggestions for timeline errors', async () => {
      const error: LogicError = {
        id: 'error-1',
        type: 'timeline',
        severity: 'high',
        location: { sceneId: 'scene-1', lineNumber: 10 },
        description: 'Character appears before being introduced'
      };

      const context: RevisionContext = {
        scriptContent: 'Scene content here',
        previousEvents: ['Event 1', 'Event 2']
      };

      (revisionExecutive as any).client.complete = jest.fn().mockResolvedValue({
        content: JSON.stringify([
          {
            modification: 'Move character introduction earlier',
            location: { sceneId: 'scene-1', lineNumber: 5 },
            rationale: 'Ensures character is introduced before appearance',
            impact: 'Fixes timeline inconsistency'
          }
        ]),
        usage: { total_tokens: 100 }
      });

      const suggestions = await revisionExecutive.generateSuggestions(error, context);

      expect(suggestions).toHaveLength(1);
      expect(suggestions[0].errorId).toBe('error-1');
      expect(suggestions[0].modification).toBe('Move character introduction earlier');
      expect(suggestions[0].priority).toBe(SuggestionPriority.HIGH);
      expect(suggestions[0].rationale).toBe('Ensures character is introduced before appearance');
    });

    it('should handle character consistency errors', async () => {
      const error: LogicError = {
        id: 'error-2',
        type: 'character',
        severity: 'medium',
        location: { characterName: 'char-1' },
        description: 'Character knows information they should not'
      };

      const context: RevisionContext = {
        characterName: 'John',
        scriptContent: 'Dialogue content'
      };

      (revisionExecutive as any).client.complete = jest.fn().mockResolvedValue({
        content: JSON.stringify([
          {
            modification: 'Remove knowledge reference',
            location: { characterName: 'char-1' },
            rationale: 'Character has not learned this yet',
            impact: 'Maintains character knowledge consistency'
          }
        ]),
        usage: { total_tokens: 80 }
      });

      const suggestions = await revisionExecutive.generateSuggestions(error, context);

      expect(suggestions).toHaveLength(1);
      expect(suggestions[0].priority).toBe(SuggestionPriority.MEDIUM);
    });

    it('should generate fallback suggestion on AI failure', async () => {
      const error: LogicError = {
        id: 'error-3',
        type: 'plot',
        severity: 'low',
        location: {},
        description: 'Plot inconsistency detected'
      };

      (revisionExecutive as any).client.complete = jest.fn().mockRejectedValue(new Error('API error'));

      const suggestions = await revisionExecutive.generateSuggestions(error, {} as RevisionContext);

      expect(suggestions).toHaveLength(1);
      expect(suggestions[0]).toMatchObject({
        errorId: 'error-3',
        modification: 'Review and fix: Plot inconsistency detected',
        rationale: 'Manual review required',
        priority: SuggestionPriority.MEDIUM // Fallback defaults to MEDIUM
      });
    });

    it('should limit suggestions to maxSuggestionsPerError', async () => {
      const revExec = new RevisionExecutive({ maxSuggestionsPerError: 2 });
      (revExec as any).client.complete = jest.fn().mockResolvedValue({
        content: JSON.stringify([
          { modification: 'Fix 1', rationale: 'Reason 1' },
          { modification: 'Fix 2', rationale: 'Reason 2' },
          { modification: 'Fix 3', rationale: 'Reason 3' },
          { modification: 'Fix 4', rationale: 'Reason 4' }
        ]),
        usage: { total_tokens: 150 }
      });
      
      const error: LogicError = {
        id: 'error-4',
        type: 'dialogue',
        severity: 'medium',
        location: {},
        description: 'Dialogue flow issue'
      };


      const suggestions = await revExec.generateSuggestions(error, {} as RevisionContext);

      expect(suggestions).toHaveLength(2);
    });
  });

  describe('evaluateSuggestionFeasibility', () => {
    it('should evaluate suggestion as feasible', async () => {
      const suggestion = {
        id: 'sug-1',
        errorId: 'error-1',
        modification: 'Valid modification text',
        location: {},
        rationale: 'Good reason',
        priority: SuggestionPriority.HIGH,
        impact: 'Positive impact',
        confidence: 0.8,
        createdAt: new Date().toISOString()
      };

      const context: RevisionContext = {
        affectedElements: ['element1', 'element2']
      };

      const result = await revisionExecutive.evaluateSuggestionFeasibility(suggestion, context);

      expect(result.feasible).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should identify infeasible suggestions', async () => {
      const suggestion = {
        id: 'sug-2',
        errorId: 'error-2',
        modification: '',
        location: {},
        rationale: 'Reason',
        priority: SuggestionPriority.LOW,
        impact: 'Impact',
        confidence: 0.3,
        createdAt: new Date().toISOString()
      };

      const context: RevisionContext = {
        affectedElements: Array(10).fill('element')
      };

      const result = await revisionExecutive.evaluateSuggestionFeasibility(suggestion, context);

      expect(result.feasible).toBe(false);
      expect(result.issues).toContain('No modification provided');
      expect(result.issues).toContain('Low confidence suggestion');
      expect(result.issues).toContain('High impact change affecting 10 elements');
    });
  });

  describe('prioritizeSuggestions', () => {
    it('should sort suggestions by priority and confidence', async () => {
      const suggestions = [
        {
          id: 'sug-1',
          errorId: 'error-1',
          modification: 'Fix 1',
          location: {},
          rationale: 'Reason 1',
          priority: SuggestionPriority.MEDIUM,
          impact: 'Impact 1',
          confidence: 0.5,
          createdAt: new Date().toISOString()
        },
        {
          id: 'sug-2',
          errorId: 'error-2',
          modification: 'Fix 2',
          location: {},
          rationale: 'Reason 2',
          priority: SuggestionPriority.CRITICAL,
          impact: 'Impact 2',
          confidence: 0.9,
          createdAt: new Date().toISOString()
        },
        {
          id: 'sug-3',
          errorId: 'error-3',
          modification: 'Fix 3',
          location: {},
          rationale: 'Reason 3',
          priority: SuggestionPriority.CRITICAL,
          impact: 'Impact 3',
          confidence: 0.7,
          createdAt: new Date().toISOString()
        }
      ];

      const sorted = await revisionExecutive.prioritizeSuggestions(suggestions);

      expect(sorted[0].id).toBe('sug-2');
      expect(sorted[1].id).toBe('sug-3');
      expect(sorted[2].id).toBe('sug-1');
    });
  });

  describe('error type templates', () => {
    it('should have templates for all error types', () => {
      const errorTypes = Object.values(LogicErrorType);
      
      for (const errorType of errorTypes) {
        const error: LogicError = {
          id: `error-${errorType}`,
          type: errorType,
          severity: 'medium',
          location: {},
          description: `Test ${errorType} error`
        };

        expect(async () => {
          await revisionExecutive.generateSuggestions(error, {} as RevisionContext);
        }).not.toThrow();
      }
    });
  });
});