import { ImpactAnalyzer } from '@/lib/analysis/impact-analyzer';
import { ChangeEvent } from '@/types/change-tracking';
import { ParsedScript } from '@/types/script';

describe('ImpactAnalyzer', () => {
  let analyzer: ImpactAnalyzer;
  let testScript: ParsedScript;
  let testChanges: ChangeEvent[];

  beforeEach(() => {
    analyzer = new ImpactAnalyzer();
    
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
          title: 'Scene 1',
          description: 'First scene',
          characters: ['char-1', 'char-2'],
          dialogues: [
            { id: 'd1', characterId: 'char-1', characterName: 'Alice', content: 'Hello', sceneId: 'scene-1' },
            { id: 'd2', characterId: 'char-2', characterName: 'Bob', content: 'Hi there', sceneId: 'scene-1' }
          ],
          actions: []
        },
        {
          id: 'scene-2',
          index: 2,
          title: 'Scene 2',
          description: 'Second scene',
          characters: ['char-1', 'char-3'],
          dialogues: [
            { id: 'd3', characterId: 'char-1', characterName: 'Alice', content: 'Continuing', sceneId: 'scene-2' },
            { id: 'd4', characterId: 'char-3', characterName: 'Charlie', content: 'New character', sceneId: 'scene-2' }
          ],
          actions: []
        },
        {
          id: 'scene-3',
          index: 3,
          title: 'Scene 3',
          description: 'Third scene',
          characters: ['char-2'],
          dialogues: [
            { id: 'd5', characterId: 'char-2', characterName: 'Bob', content: 'Back again', sceneId: 'scene-3' }
          ],
          actions: []
        }
      ],
      characters: [
        { id: 'char-1', name: 'Alice', dialogueCount: 2, scenes: ['scene-1', 'scene-2'], firstAppearance: { sceneId: 'scene-1' } },
        { id: 'char-2', name: 'Bob', dialogueCount: 2, scenes: ['scene-1', 'scene-3'], firstAppearance: { sceneId: 'scene-1' } },
        { id: 'char-3', name: 'Charlie', dialogueCount: 1, scenes: ['scene-2'], firstAppearance: { sceneId: 'scene-2' } }
      ],
      dialogues: [],
      actions: [],
      totalDialogues: 5,
      totalActions: 0
    };

    testChanges = [
      {
        id: 'change-1',
        timestamp: new Date(),
        type: 'content',
        location: {
          sceneId: 'scene-1',
          path: ['scenes', '0', 'dialogues', '0', 'text']
        },
        oldValue: 'Hello',
        newValue: 'Goodbye',
        affectedElements: ['scene-1', 'char-1']
      }
    ];
  });

  describe('analyzeImpact', () => {
    it('should identify direct impact from changes', () => {
      const impact = analyzer.analyzeImpact(testChanges, testScript);
      
      expect(impact.directImpact).toContain('scene-1');
      expect(impact.directImpact).toContain('char-1');
    });

    it('should identify indirect impact on subsequent scenes', () => {
      const impact = analyzer.analyzeImpact(testChanges, testScript);
      
      expect(impact.indirectImpact.length).toBeGreaterThan(0);
    });

    it('should calculate impact level correctly', () => {
      const minorChange = [{
        ...testChanges[0],
        affectedElements: ['scene-1']
      }];
      
      const minorImpact = analyzer.analyzeImpact(minorChange, testScript);
      expect(['low', 'medium', 'high', 'critical']).toContain(minorImpact.impactLevel);
      
      const majorChanges = testChanges.map((c, i) => ({
        ...c,
        id: `change-${i}`,
        affectedElements: testScript.scenes.map(s => s.id)
      }));
      
      const majorImpact = analyzer.analyzeImpact(majorChanges, testScript);
      expect(['medium', 'high', 'critical']).toContain(majorImpact.impactLevel);
    });

    it('should generate propagation paths', () => {
      const impact = analyzer.analyzeImpact(testChanges, testScript);
      
      expect(impact.propagationPath).toBeDefined();
      expect(Array.isArray(impact.propagationPath)).toBe(true);
      
      if (impact.propagationPath.length > 0) {
        expect(impact.propagationPath[0]).toContain(testChanges[0].affectedElements[0]);
      }
    });

    it('should estimate analysis time', () => {
      const impact = analyzer.analyzeImpact(testChanges, testScript);
      
      expect(impact.estimatedAnalysisTime).toBeGreaterThan(0);
      expect(impact.estimatedAnalysisTime).toBeLessThanOrEqual(10000);
    });
  });

  describe('getCharacterScenes', () => {
    it('should return all scenes containing a character', () => {
      analyzer.analyzeImpact(testChanges, testScript);
      const scenes = analyzer.getCharacterScenes('char-1');
      
      expect(scenes).toContain('scene-1');
      expect(scenes).toContain('scene-2');
      expect(scenes).not.toContain('scene-3');
    });

    it('should return empty array for non-existent character', () => {
      analyzer.analyzeImpact(testChanges, testScript);
      const scenes = analyzer.getCharacterScenes('char-999');
      
      expect(scenes).toEqual([]);
    });
  });

  describe('getSceneDependencies', () => {
    it('should identify scene dependencies correctly', () => {
      analyzer.analyzeImpact(testChanges, testScript);
      const deps = analyzer.getSceneDependencies('scene-2');
      
      expect(deps.characters).toContain('char-1');
      expect(deps.characters).toContain('char-3');
      expect(deps.previousScenes).toContain('scene-1');
      expect(deps.nextScenes).toContain('scene-3');
    });

    it('should handle first scene correctly', () => {
      analyzer.analyzeImpact(testChanges, testScript);
      const deps = analyzer.getSceneDependencies('scene-1');
      
      expect(deps.previousScenes).toEqual([]);
      expect(deps.nextScenes).toContain('scene-2');
    });

    it('should handle last scene correctly', () => {
      analyzer.analyzeImpact(testChanges, testScript);
      const deps = analyzer.getSceneDependencies('scene-3');
      
      expect(deps.previousScenes).toContain('scene-2');
      expect(deps.nextScenes).toEqual([]);
    });
  });

  describe('getRelationshipImpact', () => {
    it('should find scenes with both characters', () => {
      analyzer.analyzeImpact(testChanges, testScript);
      const scenes = analyzer.getRelationshipImpact('char-1', 'char-2');
      
      expect(scenes).toContain('scene-1');
      expect(scenes).not.toContain('scene-2');
      expect(scenes).not.toContain('scene-3');
    });

    it('should return empty array when characters never interact', () => {
      analyzer.analyzeImpact(testChanges, testScript);
      const scenes = analyzer.getRelationshipImpact('char-1', 'char-999');
      
      expect(scenes).toEqual([]);
    });
  });

  describe('dependency graph building', () => {
    it('should handle character relationship changes', () => {
      const relationshipChange: ChangeEvent = {
        id: 'change-rel',
        timestamp: new Date(),
        type: 'relationship',
        location: {
          characterId: 'char-1',
          path: ['characters', 'char-1', 'relationships']
        },
        oldValue: {},
        newValue: { 'char-2': 'friend' },
        affectedElements: ['char-1', 'char-2']
      };
      
      const impact = analyzer.analyzeImpact([relationshipChange], testScript);
      
      expect(impact.directImpact).toContain('char-1');
      expect(impact.directImpact).toContain('char-2');
    });

    it('should handle structural changes', () => {
      const structuralChange: ChangeEvent = {
        id: 'change-struct',
        timestamp: new Date(),
        type: 'structure',
        location: {
          path: ['scenes', '1']
        },
        oldValue: testScript.scenes[1],
        newValue: null,
        affectedElements: ['scene-2']
      };
      
      const impact = analyzer.analyzeImpact([structuralChange], testScript);
      
      expect(impact.directImpact).toContain('scene-2');
      expect(impact.impactLevel).not.toBe('low');
    });
  });
});