/**
 * Unit tests for PacingStrategist agent
 * Tests P10, P11 prompt chain functionality
 */

import { PacingStrategist, createPacingStrategist } from '@/lib/agents/pacing-strategist';
import { DeepSeekClient } from '@/lib/api/deepseek/client';

// Mock DeepSeekClient
jest.mock('@/lib/api/deepseek/client');

describe('PacingStrategist Agent', () => {
  let agent: PacingStrategist;
  let mockClient: jest.Mocked<DeepSeekClient>;

  beforeEach(() => {
    // Setup mock client
    mockClient = {
      chat: jest.fn()
    } as any;

    (DeepSeekClient as jest.MockedClass<typeof DeepSeekClient>).mockImplementation(() => mockClient);

    // Create agent instance
    agent = new PacingStrategist({
      apiKey: 'test-key',
      apiEndpoint: 'https://test.api.com',
      timeout: 30000
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('P10: analyzePacing', () => {
    it('should identify pacing issues', async () => {
      const mockResponse = {
        pacingIssues: [
          {
            episode: 3,
            issue: 'information_overload',
            severity: 'high',
            description: '第3集信息过载，角色关系、背景设定、主线冲突同时展开',
            location: '第3集第1-5场',
            audienceImpact: '观众难以消化大量信息，可能产生疲劳感'
          },
          {
            episode: 4,
            issue: 'conflict_stacking',
            severity: 'medium',
            description: '第4集三个冲突同时爆发',
            location: '第4集第8-10场',
            audienceImpact: '情感冲击过于密集'
          }
        ],
        emotionalCurve: {
          peaks: ['第3集高潮', '第5集高潮'],
          valleys: ['第2集铺垫', '第4集缓冲'],
          transitions: ['第3集转第4集', '第4集转第5集']
        },
        overallAssessment: '整体节奏偏快，需要增加情感缓冲空间'
      };

      mockClient.chat.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: JSON.stringify(mockResponse),
              role: 'assistant'
            }
          }
        ],
        usage: { total_tokens: 180 }
      } as any);

      const result = await agent.analyzePacing(
        '剧集1-5内容...',
        '第1-5集'
      );

      expect(result).toEqual(mockResponse);
      expect(result.pacingIssues).toHaveLength(2);
      expect(result.pacingIssues[0].issue).toBe('information_overload');
      expect(result.pacingIssues[0].severity).toBe('high');
      expect(result.emotionalCurve.peaks).toHaveLength(2);
      expect(mockClient.chat).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'deepseek-chat',
          response_format: { type: 'json_object' }
        })
      );
    });

    it('should return empty issues if pacing is good', async () => {
      const mockResponse = {
        pacingIssues: [],
        emotionalCurve: {
          peaks: ['高潮1'],
          valleys: ['低谷1'],
          transitions: ['转换1']
        },
        overallAssessment: '节奏良好'
      };

      mockClient.chat.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: JSON.stringify(mockResponse),
              role: 'assistant'
            }
          }
        ],
        usage: { total_tokens: 100 }
      } as any);

      const result = await agent.analyzePacing('内容', '范围');

      expect(result.pacingIssues).toHaveLength(0);
    });

    it('should throw error on invalid pacing analysis', async () => {
      mockClient.chat.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: JSON.stringify({ invalid: 'data' }),
              role: 'assistant'
            }
          }
        ],
        usage: { total_tokens: 50 }
      } as any);

      await expect(
        agent.analyzePacing('内容', '范围')
      ).rejects.toThrow('P10 Pacing analysis failed');
    });
  });

  describe('P11: restructureConflicts', () => {
    it('should generate restructuring strategies', async () => {
      const mockIssues = [
        {
          episode: 3,
          issue: 'information_overload' as const,
          severity: 'high' as const,
          description: '信息过载',
          location: '第3集',
          audienceImpact: '观众疲劳'
        }
      ];

      const mockResponse = {
        strategies: [
          {
            id: 'strategy_1',
            approach: 'foreshadowing',
            title: '提前铺垫关键信息',
            description: '将第3集的部分背景信息移至第1-2集铺垫',
            changes: [
              {
                episode: 1,
                modification: '在第1集第3场增加世界观铺垫对话',
                rationale: '提前建立观众认知，降低第3集信息密度'
              },
              {
                episode: 3,
                modification: '精简第3集信息，只保留核心冲突',
                rationale: '聚焦主线，提升冲击力'
              }
            ],
            expectedImprovement: '信息分布更均匀，观众接受度提升',
            risks: ['可能影响第1集节奏']
          },
          {
            id: 'strategy_2',
            approach: 'resequencing',
            title: '调整事件顺序',
            description: '将部分冲突延后至第4集',
            changes: [
              {
                episode: 4,
                modification: '将角色关系冲突移至第4集展开',
                rationale: '拉开冲突间距'
              }
            ],
            expectedImprovement: '节奏更平稳',
            risks: ['需要调整因果链']
          }
        ],
        recommendedSequence: '建议先采用strategy_1，必要时结合strategy_2',
        continuityChecks: ['检查因果逻辑', '验证角色动机连贯性']
      };

      mockClient.chat.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: JSON.stringify(mockResponse),
              role: 'assistant'
            }
          }
        ],
        usage: { total_tokens: 250 }
      } as any);

      const result = await agent.restructureConflicts(mockIssues);

      expect(result).toEqual(mockResponse);
      expect(result.strategies).toHaveLength(2);
      expect(result.strategies[0].approach).toBe('foreshadowing');
      expect(result.strategies[0].changes).toHaveLength(2);
      expect(result.strategies[1].approach).toBe('resequencing');
    });

    it('should validate strategy approach types', async () => {
      const mockIssues = [
        {
          episode: 1,
          issue: 'conflict_stacking' as const,
          severity: 'medium' as const,
          description: 'test',
          location: 'test',
          audienceImpact: 'test'
        }
      ];

      mockClient.chat.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: JSON.stringify({
                strategies: [
                  {
                    id: 's1',
                    approach: 'invalid_approach',
                    title: 't',
                    description: 'd',
                    changes: [],
                    expectedImprovement: 'e',
                    risks: []
                  }
                ],
                recommendedSequence: 'r',
                continuityChecks: []
              }),
              role: 'assistant'
            }
          }
        ],
        usage: { total_tokens: 100 }
      } as any);

      await expect(
        agent.restructureConflicts(mockIssues)
      ).rejects.toThrow('P11 Restructure failed');
    });
  });

  describe('completePacingOptimization', () => {
    it('should execute full P10-P11 workflow', async () => {
      const mockAnalysis = {
        pacingIssues: [
          {
            episode: 1,
            issue: 'information_overload' as const,
            severity: 'high' as const,
            description: 'd',
            location: 'l',
            audienceImpact: 'a'
          }
        ],
        emotionalCurve: { peaks: [], valleys: [], transitions: [] },
        overallAssessment: 'oa'
      };

      const mockRestructure = {
        strategies: [
          {
            id: 's1',
            approach: 'spacing' as const,
            title: 't',
            description: 'd',
            changes: [],
            expectedImprovement: 'e',
            risks: []
          }
        ],
        recommendedSequence: 'rs',
        continuityChecks: []
      };

      mockClient.chat
        .mockResolvedValueOnce({
          choices: [{ message: { content: JSON.stringify(mockAnalysis), role: 'assistant' } }],
          usage: { total_tokens: 100 }
        } as any)
        .mockResolvedValueOnce({
          choices: [{ message: { content: JSON.stringify(mockRestructure), role: 'assistant' } }],
          usage: { total_tokens: 100 }
        } as any);

      const result = await agent.completePacingOptimization('episodes', 'range');

      expect(result.analysis).toEqual(mockAnalysis);
      expect(result.restructure).toEqual(mockRestructure);
      expect(mockClient.chat).toHaveBeenCalledTimes(2);
    });

    it('should skip restructure if no issues', async () => {
      const mockAnalysis = {
        pacingIssues: [],
        emotionalCurve: { peaks: [], valleys: [], transitions: [] },
        overallAssessment: 'good'
      };

      mockClient.chat.mockResolvedValueOnce({
        choices: [{ message: { content: JSON.stringify(mockAnalysis), role: 'assistant' } }],
        usage: { total_tokens: 100 }
      } as any);

      const result = await agent.completePacingOptimization('episodes', 'range');

      expect(result.analysis.pacingIssues).toHaveLength(0);
      expect(result.restructure.strategies).toHaveLength(0);
      expect(result.restructure.recommendedSequence).toBe('未发现节奏问题，无需重构');
      expect(mockClient.chat).toHaveBeenCalledTimes(1);
    });
  });

  describe('createPacingStrategist factory', () => {
    it('should create agent with env API key', () => {
      process.env.DEEPSEEK_API_KEY = 'env-key';
      const agent = createPacingStrategist();
      expect(agent).toBeInstanceOf(PacingStrategist);
      delete process.env.DEEPSEEK_API_KEY;
    });

    it('should throw error if no API key', () => {
      delete process.env.DEEPSEEK_API_KEY;
      expect(() => createPacingStrategist()).toThrow('DEEPSEEK_API_KEY');
    });
  });
});
