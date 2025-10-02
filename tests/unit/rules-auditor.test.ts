/**
 * Unit tests for RulesAuditor agent
 * Tests P7, P8, P9 prompt chain functionality
 */

import { RulesAuditor, createRulesAuditor } from '@/lib/agents/rules-auditor';
import { DeepSeekClient } from '@/lib/api/deepseek/client';

// Mock DeepSeekClient
jest.mock('@/lib/api/deepseek/client');

describe('RulesAuditor Agent', () => {
  let agent: RulesAuditor;
  let mockClient: jest.Mocked<DeepSeekClient>;

  beforeEach(() => {
    // Setup mock client
    mockClient = {
      chat: jest.fn()
    } as any;

    (DeepSeekClient as jest.MockedClass<typeof DeepSeekClient>).mockImplementation(() => mockClient);

    // Create agent instance
    agent = new RulesAuditor({
      apiKey: 'test-key',
      apiEndpoint: 'https://test.api.com',
      timeout: 30000
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('P7: auditWorldRules', () => {
    it('should detect worldbuilding inconsistencies', async () => {
      const mockResponse = {
        inconsistencies: [
          {
            rule: '魔法消耗机制',
            location: '第3章第5场',
            violation: '角色使用魔法无需消耗法力值，与前文设定矛盾',
            impact: 'high - 破坏世界观一致性'
          }
        ],
        ruleMap: {
          coreRules: ['魔法需要法力值', '法力值通过休息恢复'],
          exceptions: ['特殊情况下可以透支'],
          ambiguities: ['透支的代价尚未明确']
        }
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
        usage: { total_tokens: 150 }
      } as any);

      const result = await agent.auditWorldRules(
        '魔法系统设定...',
        '剧本内容...'
      );

      expect(result).toEqual(mockResponse);
      expect(result.inconsistencies).toHaveLength(1);
      expect(result.ruleMap.coreRules).toHaveLength(2);
      expect(mockClient.chat).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'deepseek-chat',
          response_format: { type: 'json_object' }
        })
      );
    });

    it('should return empty inconsistencies if no issues found', async () => {
      const mockResponse = {
        inconsistencies: [],
        ruleMap: {
          coreRules: ['规则1', '规则2'],
          exceptions: [],
          ambiguities: []
        }
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

      const result = await agent.auditWorldRules('设定', '剧本');

      expect(result.inconsistencies).toHaveLength(0);
    });

    it('should throw error on invalid audit result', async () => {
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
        agent.auditWorldRules('设定', '剧本')
      ).rejects.toThrow('P7 Audit failed');
    });
  });

  describe('P8: verifyDynamicConsistency', () => {
    it('should generate solutions with ripple effects', async () => {
      const mockInconsistencies = [
        {
          rule: '魔法消耗',
          location: '第3章',
          violation: '违反设定',
          impact: 'high'
        }
      ];

      const mockResponse = {
        solutions: [
          {
            id: 'solution_1',
            targetInconsistency: '魔法消耗',
            title: '统一魔法消耗机制',
            adjustment: '修改第3章的魔法使用场景，增加法力值消耗描述',
            rippleEffects: [
              '影响后续战斗场景的魔法使用',
              '需要调整角色的法力值设定',
              '影响剧情节奏'
            ],
            feasibility: {
              difficulty: 'medium',
              risk: 'low',
              scope: '影响3个章节'
            }
          }
        ],
        recommendation: '建议采用solution_1，影响范围可控'
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
        usage: { total_tokens: 200 }
      } as any);

      const result = await agent.verifyDynamicConsistency(mockInconsistencies);

      expect(result).toEqual(mockResponse);
      expect(result.solutions).toHaveLength(1);
      expect(result.solutions[0].rippleEffects).toHaveLength(3);
    });
  });

  describe('P9: alignSettingWithTheme', () => {
    it('should generate alignment strategies', async () => {
      const mockResponse = {
        alignmentStrategies: [
          {
            approach: '魔法代价强化主题',
            currentAlignment: '当前魔法系统与权力的代价主题有一定关联',
            gaps: ['代价不够明显', '缺乏情感冲击'],
            modifications: [
              '增加魔法使用的情感代价（如失去记忆）',
              '将魔法消耗与角色关系绑定'
            ],
            thematicImpact: '强化权力代价的主题表达，增加情感深度',
            symbolism: '魔法作为权力的象征'
          }
        ],
        coreRecommendation: '通过情感代价强化主题共鸣'
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

      const result = await agent.alignSettingWithTheme(
        '魔法系统设定',
        '权力的代价'
      );

      expect(result).toEqual(mockResponse);
      expect(result.alignmentStrategies).toHaveLength(1);
      expect(result.alignmentStrategies[0].modifications).toHaveLength(2);
    });
  });

  describe('completeWorldbuildingAudit', () => {
    it('should execute full P7-P8-P9 workflow', async () => {
      const mockAudit = {
        inconsistencies: [{ rule: 'rule1', location: 'loc1', violation: 'v1', impact: 'high' }],
        ruleMap: { coreRules: [], exceptions: [], ambiguities: [] }
      };

      const mockVerification = {
        solutions: [
          {
            id: 's1',
            targetInconsistency: 'rule1',
            title: 'Fix',
            adjustment: 'adj',
            rippleEffects: [],
            feasibility: { difficulty: 'simple', risk: 'low', scope: 'small' }
          }
        ],
        recommendation: 'rec'
      };

      const mockAlignment = {
        alignmentStrategies: [
          {
            approach: 'a1',
            currentAlignment: 'ca',
            gaps: [],
            modifications: [],
            thematicImpact: 'ti'
          }
        ],
        coreRecommendation: 'cr'
      };

      mockClient.chat
        .mockResolvedValueOnce({
          choices: [{ message: { content: JSON.stringify(mockAudit), role: 'assistant' } }],
          usage: { total_tokens: 100 }
        } as any)
        .mockResolvedValueOnce({
          choices: [{ message: { content: JSON.stringify(mockVerification), role: 'assistant' } }],
          usage: { total_tokens: 100 }
        } as any)
        .mockResolvedValueOnce({
          choices: [{ message: { content: JSON.stringify(mockAlignment), role: 'assistant' } }],
          usage: { total_tokens: 100 }
        } as any);

      const result = await agent.completeWorldbuildingAudit(
        '设定',
        '剧本',
        '主题'
      );

      expect(result.audit).toEqual(mockAudit);
      expect(result.verification).toEqual(mockVerification);
      expect(result.alignment).toEqual(mockAlignment);
      expect(mockClient.chat).toHaveBeenCalledTimes(3);
    });
  });

  describe('createRulesAuditor factory', () => {
    it('should create agent with env API key', () => {
      process.env.DEEPSEEK_API_KEY = 'env-key';
      const agent = createRulesAuditor();
      expect(agent).toBeInstanceOf(RulesAuditor);
      delete process.env.DEEPSEEK_API_KEY;
    });

    it('should throw error if no API key', () => {
      delete process.env.DEEPSEEK_API_KEY;
      expect(() => createRulesAuditor()).toThrow('DEEPSEEK_API_KEY');
    });
  });
});
