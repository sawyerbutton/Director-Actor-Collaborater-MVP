import { ContinuousAnalysisSystem } from '@/lib/analysis';
import { ParsedScript } from '@/types/script';
import { LogicErrorType, ErrorSeverity } from '@/types/analysis';

jest.mock('@/lib/agents/consistency-guardian', () => {
  return {
    ConsistencyGuardian: jest.fn().mockImplementation(() => ({
      analyzeScript: jest.fn().mockResolvedValue({
        id: 'mock-report',
        timestamp: new Date().toISOString(),
        errors: [
          {
            id: 'mock-error-1',
            type: 'plot',
            severity: 'medium',
            description: 'Mock error',
            timestamp: new Date().toISOString()
          }
        ],
        summary: {
          totalErrors: 1,
          criticalErrors: 0,
          highErrors: 0,
          mediumErrors: 1,
          lowErrors: 0,
          byType: { ['plot']: 1 }
        }
      })
    }))
  };
});

describe('ContinuousAnalysisSystem Integration', () => {
  let system: ContinuousAnalysisSystem;
  let testScript: ParsedScript;
  let modifiedScript: ParsedScript;

  beforeEach(() => {
    system = new ContinuousAnalysisSystem({
      apiKey: 'test-api-key',
      enableCaching: true,
      performanceMode: 'balanced'
    });

    testScript = {
      metadata: {
        parseVersion: '1.0.0',
        parseTime: new Date(),
        language: 'en',
        originalLength: 0
      },
      scenes: [
        {
          id: 'scene-1',
          index: 1,
          title: 'Opening',
          description: 'The beginning',
          characters: ['char-1', 'char-2'],
          dialogues: [
            { id: 'd1', characterId: 'char-1', characterName: 'Alice', content: 'Hello world', sceneId: 'scene-1' },
            { id: 'd2', characterId: 'char-2', characterName: 'Bob', content: 'Hi there', sceneId: 'scene-1' }
          ],
          actions: []
        },
        {
          id: 'scene-2',
          index: 2,
          title: 'Middle',
          description: 'The middle part',
          characters: ['char-1'],
          dialogues: [
            { id: 'd3', characterId: 'char-1', characterName: 'Alice', content: 'Continuing', sceneId: 'scene-2' }
          ],
          actions: []
        }
      ],
      characters: [
        { id: 'char-1', name: 'Alice', dialogueCount: 2, scenes: ['scene-1', 'scene-2'], firstAppearance: { sceneId: 'scene-1' } },
        { id: 'char-2', name: 'Bob', dialogueCount: 1, scenes: ['scene-1'], firstAppearance: { sceneId: 'scene-1' } }
      ],
      dialogues: [],
      actions: [],
      totalDialogues: 3,
      totalActions: 0
    };

    modifiedScript = JSON.parse(JSON.stringify(testScript));
    modifiedScript.scenes[0].dialogues![0].content = 'Goodbye world';
  });

  describe('analyzeChanges', () => {
    it('should perform initial analysis', async () => {
      const result = await system.analyzeChanges(
        'script-1',
        null,
        testScript,
        { userId: 'user-1' }
      );

      expect(result.analysis).toBeDefined();
      expect(result.changes).toBeDefined();
      expect(result.impact).toBeDefined();
      expect(result.performance).toBeDefined();
    });

    it('should detect and analyze changes', async () => {
      const result = await system.analyzeChanges(
        'script-1',
        testScript,
        modifiedScript,
        { userId: 'user-1' }
      );

      expect(result.changes.length).toBeGreaterThan(0);
      expect(result.impact.directImpact.length).toBeGreaterThan(0);
    });

    it('should use cache when no changes detected', async () => {
      await system.analyzeChanges('script-1', null, testScript);
      
      const result = await system.analyzeChanges(
        'script-1',
        testScript,
        testScript
      );

      expect(result.performance.cacheHits).toBeGreaterThan(0);
      expect(result.changes.length).toBe(0);
    });

    it('should generate diff report when requested', async () => {
      await system.analyzeChanges('script-1', null, testScript);
      
      const result = await system.analyzeChanges(
        'script-1',
        testScript,
        modifiedScript,
        {
          generateReport: true,
          reportFormat: 'detailed'
        }
      );

      expect(result.diffReport).toBeDefined();
      expect(result.diffReport?.addedIssues).toBeDefined();
      expect(result.diffReport?.resolvedIssues).toBeDefined();
      expect(result.diffReport?.recommendations).toBeDefined();
    });

    it('should respect performance mode settings', async () => {
      const aggressiveSystem = new ContinuousAnalysisSystem({
        apiKey: 'test-api-key',
        performanceMode: 'aggressive'
      });

      const result = await aggressiveSystem.analyzeChanges(
        'script-1',
        testScript,
        modifiedScript
      );

      expect(result.analysis).toBeDefined();
    });

    it('should handle options correctly', async () => {
      const result = await system.analyzeChanges(
        'script-1',
        null,
        testScript,
        {
          checkTypes: ['plot'],
          severityThreshold: 'high',
          maxErrors: 10
        }
      );

      expect(result.analysis).toBeDefined();
    });
  });

  describe('getChangeHistory', () => {
    it('should retrieve change history', async () => {
      await system.analyzeChanges('script-1', null, testScript);
      await system.analyzeChanges('script-1', testScript, modifiedScript);
      
      const history = system.getChangeHistory('script-1');
      
      expect(history).toBeDefined();
      expect(Array.isArray(history)).toBe(true);
    });
  });

  describe('getPerformanceMetrics', () => {
    it('should track performance metrics', async () => {
      await system.analyzeChanges('script-1', null, testScript);
      await system.analyzeChanges('script-1', testScript, modifiedScript);
      
      const metrics = system.getPerformanceMetrics();
      
      expect(metrics.totalAnalyses).toBeGreaterThan(0);
      expect(metrics.averageAnalysisTime).toBeGreaterThanOrEqual(0);
      expect(metrics.lastAnalysisTime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('clearCache', () => {
    it('should clear cache for specific script', async () => {
      await system.analyzeChanges('script-1', null, testScript);
      system.clearCache('script-1');
      
      const result = await system.analyzeChanges(
        'script-1',
        testScript,
        testScript
      );
      
      expect(result.performance.cacheHits).toBe(0);
    });

    it('should clear all cache', async () => {
      await system.analyzeChanges('script-1', null, testScript);
      await system.analyzeChanges('script-2', null, testScript);
      
      system.clearCache();
      
      const result1 = await system.analyzeChanges('script-1', testScript, testScript);
      const result2 = await system.analyzeChanges('script-2', testScript, testScript);
      
      expect(result1.performance.cacheHits).toBe(0);
      expect(result2.performance.cacheHits).toBe(0);
    });
  });

  describe('getTrendAnalysis', () => {
    it('should analyze trends over multiple changes', async () => {
      await system.analyzeChanges('script-1', null, testScript);
      
      for (let i = 0; i < 3; i++) {
        const modified = JSON.parse(JSON.stringify(modifiedScript));
        modified.scenes[0].title = `Title ${i}`;
        await system.analyzeChanges(
          'script-1',
          i === 0 ? testScript : modifiedScript,
          modified,
          { generateReport: true }
        );
        modifiedScript = modified;
      }
      
      const trend = system.getTrendAnalysis('script-1');
      
      expect(trend.trend).toMatch(/improving|degrading|stable/);
      expect(trend.averageImprovements).toBeDefined();
      expect(trend.averageDegradations).toBeDefined();
    });
  });

  describe('error handling', () => {
    it('should handle analysis failures gracefully', async () => {
      const ConsistencyGuardian = require('@/lib/agents/consistency-guardian').ConsistencyGuardian;
      const originalImplementation = ConsistencyGuardian.getMockImplementation();
      
      ConsistencyGuardian.mockImplementation(() => ({
        analyzeScript: jest.fn().mockRejectedValue(new Error('API Error'))
      }));

      const failSystem = new ContinuousAnalysisSystem({
        apiKey: 'test-api-key'
      });

      await expect(
        failSystem.analyzeChanges('script-1', null, testScript)
      ).rejects.toThrow('API Error');
      
      // Restore original mock
      ConsistencyGuardian.mockImplementation(originalImplementation);
    });
  });

  describe('performance optimizations', () => {
    it('should use incremental analysis for minor changes', async () => {
      await system.analyzeChanges('script-1', null, testScript);
      
      const minorChange = { ...modifiedScript };
      minorChange.scenes[0].dialogues![0].content = 'Minor edit';
      
      const result = await system.analyzeChanges(
        'script-1',
        modifiedScript,
        minorChange
      );
      
      expect(result.impact.impactLevel).toBe('low');
    });

    it('should perform full analysis for structural changes', async () => {
      const structuralChange = JSON.parse(JSON.stringify(testScript));
      structuralChange.scenes.push({
        id: 'scene-3',
        title: 'New Scene',
        description: 'Added scene'
      });
      
      const result = await system.analyzeChanges(
        'script-1',
        testScript,
        structuralChange
      );
      
      expect(result.changes.length).toBeGreaterThan(0);
      expect(result.changes.some(c => c.type === 'structure')).toBe(true);
    });
  });
});