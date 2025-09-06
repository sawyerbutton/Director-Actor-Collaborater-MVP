import { ConsistencyGuardian } from '@/lib/agents/consistency-guardian';
import { DeepSeekClient } from '@/lib/api/deepseek/client';
import {
  ParsedScript,
  ConsistencyCheckRequest,
  LogicErrorType,
  ErrorSeverity
} from '@/types/analysis';

jest.mock('@/lib/api/deepseek/client');

describe('ConsistencyGuardian', () => {
  let guardian: ConsistencyGuardian;
  let mockClient: jest.Mocked<DeepSeekClient>;
  
  const mockScript: ParsedScript = {
    id: 'test-script-1',
    title: 'Test Script',
    scenes: [
      {
        id: 'scene-1',
        number: 1,
        location: 'INT. OFFICE - MORNING',
        time: 'morning',
        description: 'A busy office',
        dialogues: [
          {
            character: 'John',
            text: "I can't believe what happened yesterday at the party.",
            emotion: 'surprised'
          },
          {
            character: 'Mary',
            text: "What party? You were home sick yesterday.",
            emotion: 'confused'
          }
        ]
      },
      {
        id: 'scene-2',
        number: 2,
        location: 'INT. OFFICE - AFTERNOON',
        time: 'afternoon',
        dialogues: [
          {
            character: 'John',
            text: "Oh right, I meant last week's party.",
            emotion: 'embarrassed'
          }
        ]
      }
    ],
    characters: [
      {
        name: 'John',
        description: 'Office worker',
        traits: ['forgetful', 'friendly']
      },
      {
        name: 'Mary',
        description: 'John\'s colleague',
        traits: ['observant', 'helpful']
      }
    ],
    metadata: {
      genre: 'Drama',
      setting: 'Modern office',
      timespan: 'Single day'
    }
  };

  beforeEach(() => {
    mockClient = new DeepSeekClient({
      apiKey: 'test-key',
      apiEndpoint: 'http://test.com'
    }) as jest.Mocked<DeepSeekClient>;
    
    guardian = new ConsistencyGuardian('test-key');
    (guardian as any).client = mockClient;
  });

  describe('analyzeScript', () => {
    it('should analyze a script and return a report', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify([
              {
                type: 'character',
                severity: 'high',
                location: {
                  sceneNumber: 1,
                  characterName: 'John'
                },
                description: 'John claims to have been at a party yesterday, but Mary says he was home sick',
                suggestion: 'Clarify whether John was actually at the party or home sick'
              }
            ])
          }
        }],
        usage: { total_tokens: 500 }
      };

      mockClient.chat.mockResolvedValue(mockResponse as any);

      const request: ConsistencyCheckRequest = {
        script: mockScript,
        checkTypes: ['character', 'timeline']
      };

      const report = await guardian.analyzeScript(request);

      expect(report).toBeDefined();
      expect(report.summary.totalIssues).toBeGreaterThan(0);
      expect(report.detailedAnalysis.errors).toHaveLength(1);
      expect(report.detailedAnalysis.errors[0].type).toBe('character');
      expect(report.recommendations).toBeDefined();
      expect(report.confidence).toBeGreaterThan(0);
    });

    it('should use cache for repeated requests', async () => {
      const mockResponse = {
        choices: [{
          message: { content: JSON.stringify([]) }
        }],
        usage: { total_tokens: 100 }
      };

      mockClient.chat.mockResolvedValue(mockResponse as any);

      const request: ConsistencyCheckRequest = {
        script: mockScript
      };

      await guardian.analyzeScript(request);
      await guardian.analyzeScript(request);

      expect(mockClient.chat).toHaveBeenCalledTimes(1);
    });

    it('should handle API errors gracefully', async () => {
      mockClient.chat.mockRejectedValue(new Error('API Error'));

      const request: ConsistencyCheckRequest = {
        script: mockScript
      };

      await expect(guardian.analyzeScript(request)).rejects.toThrow('Consistency analysis failed');
    });

    it('should filter errors by severity threshold', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify([
              {
                type: 'timeline',
                severity: 'low',
                location: { sceneNumber: 1 },
                description: 'Minor timing issue'
              },
              {
                type: 'character',
                severity: 'high',
                location: { sceneNumber: 2 },
                description: 'Major character inconsistency'
              }
            ])
          }
        }],
        usage: { total_tokens: 300 }
      };

      mockClient.chat.mockResolvedValue(mockResponse as any);

      const request: ConsistencyCheckRequest = {
        script: mockScript,
        severityThreshold: 'high'
      };

      const report = await guardian.analyzeScript(request);
      
      expect(report.detailedAnalysis.errors).toHaveLength(1);
      expect(report.detailedAnalysis.errors[0].severity).toBe('high');
    });

    it('should respect maxErrors limit', async () => {
      const errors = Array(10).fill(null).map((_, i) => ({
        type: 'plot',
        severity: 'medium',
        location: { sceneNumber: i + 1 },
        description: `Error ${i + 1}`
      }));

      const mockResponse = {
        choices: [{
          message: { content: JSON.stringify(errors) }
        }],
        usage: { total_tokens: 1000 }
      };

      mockClient.chat.mockResolvedValue(mockResponse as any);

      const request: ConsistencyCheckRequest = {
        script: mockScript,
        maxErrors: 5
      };

      const report = await guardian.analyzeScript(request);
      
      expect(report.detailedAnalysis.errors.length).toBeLessThanOrEqual(5);
    });
  });

  describe('preprocessScript', () => {
    it('should convert script to readable text format', () => {
      const preprocessed = (guardian as any).preprocessScript(mockScript);
      
      expect(preprocessed).toContain('TITLE: Test Script');
      expect(preprocessed).toContain('Genre: Drama');
      expect(preprocessed).toContain('CHARACTERS:');
      expect(preprocessed).toContain('- John: Office worker');
      expect(preprocessed).toContain('SCENE 1');
      expect(preprocessed).toContain('Location: INT. OFFICE - MORNING');
      expect(preprocessed).toContain('John (surprised): "I can\'t believe what happened yesterday at the party."');
    });
  });

  describe('error parsing', () => {
    it('should parse various AI response formats', () => {
      const testCases = [
        {
          input: '[{"type":"timeline","severity":"high","location":{},"description":"Test"}]',
          expectedLength: 1
        },
        {
          input: '{"errors":[{"type":"character","severity":"low","location":{},"description":"Test"}]}',
          expectedLength: 1
        },
        {
          input: 'invalid json',
          expectedLength: 0
        }
      ];

      testCases.forEach(testCase => {
        const result = (guardian as any).parseAIResponse(testCase.input);
        expect(result).toHaveLength(testCase.expectedLength);
      });
    });
  });

  describe('report generation', () => {
    it('should calculate overall consistency correctly', () => {
      const mockResult = {
        scriptId: 'test',
        analyzedAt: new Date(),
        totalErrors: 0,
        errors: [],
        errorsByType: Object.values(LogicErrorType).reduce((acc, type) => {
          acc[type] = 0;
          return acc;
        }, {} as any),
        errorsBySeverity: {
          ['critical']: 0,
          ['high']: 0,
          ['medium']: 0,
          ['low']: 0
        },
        analysisMetadata: {
          processingTime: 1000,
          modelUsed: 'test',
          version: '1.0.0'
        }
      };

      const report = (guardian as any).generateReport(mockResult);
      expect(report.summary.overallConsistency).toBe('excellent');

      mockResult.totalErrors = 5;
      mockResult.errorsBySeverity['high'] = 2;
      const report2 = (guardian as any).generateReport(mockResult);
      expect(report2.summary.overallConsistency).toBe('good');

      mockResult.errorsBySeverity['critical'] = 2;
      const report3 = (guardian as any).generateReport(mockResult);
      expect(report3.summary.overallConsistency).toBe('poor');
    });

    it('should generate appropriate recommendations', () => {
      const mockResult = {
        scriptId: 'test',
        analyzedAt: new Date(),
        totalErrors: 10,
        errors: [],
        errorsByType: {
          ['timeline']: 8,
          ['character']: 2,
          ['plot']: 0,
          ['dialogue']: 0,
          ['scene']: 0
        },
        errorsBySeverity: {
          ['critical']: 2,
          ['high']: 3,
          ['medium']: 3,
          ['low']: 2
        },
        analysisMetadata: {
          processingTime: 1000,
          modelUsed: 'test',
          version: '1.0.0'
        }
      };

      const recommendations = (guardian as any).generateRecommendations(mockResult);
      
      expect(recommendations).toContain('Priority: Address all critical errors before proceeding with production');
      expect(recommendations.some((r: string) => r.includes('timeline'))).toBe(true);
    });
  });

  describe('cache management', () => {
    it('should clear cache when requested', () => {
      guardian.clearCache();
      expect((guardian as any).cache.size).toBe(0);
    });
  });
});