/**
 * Unit tests for CharacterArchitect agent
 * Tests P4, P5, P6 prompt chain functionality
 */

import { CharacterArchitect, createCharacterArchitect } from '@/lib/agents/character-architect';
import { DeepSeekClient } from '@/lib/api/deepseek/client';

// Mock DeepSeekClient
jest.mock('@/lib/api/deepseek/client');

describe('CharacterArchitect Agent', () => {
  let agent: CharacterArchitect;
  let mockClient: jest.Mocked<DeepSeekClient>;

  beforeEach(() => {
    // Setup mock client
    mockClient = {
      chat: jest.fn()
    } as any;

    (DeepSeekClient as jest.MockedClass<typeof DeepSeekClient>).mockImplementation(() => mockClient);

    // Create agent instance
    agent = new CharacterArchitect({
      apiKey: 'test-key',
      apiEndpoint: 'https://test.api.com',
      timeout: 30000
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('P4: focusCharacter', () => {
    it('should analyze character contradiction and return FocusContext', async () => {
      const mockResponse = {
        character: '张三',
        contradiction: '角色前后行为不一致',
        analysis: {
          essence: '矛盾的核心本质',
          rootCause: '深层根源',
          manifestation: '表现形式',
          impact: '影响范围',
          dramaticPotential: '戏剧潜力'
        },
        relatedScenes: ['场景1', '场景2'],
        keyMoments: ['时刻1', '时刻2']
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

      const result = await agent.focusCharacter(
        '张三',
        '角色前后行为不一致',
        '剧本上下文...'
      );

      expect(result).toEqual(mockResponse);
      expect(mockClient.chat).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'deepseek-chat',
          response_format: { type: 'json_object' }
        })
      );
    });

    it('should throw error on invalid FocusContext', async () => {
      mockClient.chat.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: JSON.stringify({ invalid: 'data' }),
              role: 'assistant'
            }
          }
        ],
        usage: { total_tokens: 100 }
      } as any);

      await expect(
        agent.focusCharacter('张三', '矛盾', '上下文')
      ).rejects.toThrow('P4 Focus analysis failed');
    });
  });

  describe('P5: proposeSolutions', () => {
    it('should generate exactly 2 proposals', async () => {
      const mockFocusContext = {
        character: '张三',
        contradiction: '矛盾',
        analysis: {
          essence: '核心',
          rootCause: '根源',
          manifestation: '表现',
          impact: '影响',
          dramaticPotential: '潜力'
        },
        relatedScenes: [],
        keyMoments: []
      };

      const mockProposals = {
        proposals: [
          {
            id: 'proposal_1',
            title: '提案1',
            description: '描述1',
            approach: '渐进式',
            pros: ['优点1', '优点2'],
            cons: ['缺点1'],
            dramaticImpact: '影响1'
          },
          {
            id: 'proposal_2',
            title: '提案2',
            description: '描述2',
            approach: '戏剧性',
            pros: ['优点1', '优点2'],
            cons: ['缺点1'],
            dramaticImpact: '影响2'
          }
        ],
        recommendation: '推荐意见'
      };

      mockClient.chat.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: JSON.stringify(mockProposals),
              role: 'assistant'
            }
          }
        ],
        usage: { total_tokens: 100 }
      } as any);

      const result = await agent.proposeSolutions(mockFocusContext);

      expect(result.proposals).toHaveLength(2);
      expect(result.proposals[0].id).toBe('proposal_1');
      expect(result.proposals[1].id).toBe('proposal_2');
      expect(result.recommendation).toBe('推荐意见');
    });

    it('should throw error if not exactly 2 proposals', async () => {
      const mockFocusContext = {
        character: '张三',
        contradiction: '矛盾',
        analysis: {
          essence: '核心',
          rootCause: '根源',
          manifestation: '表现',
          impact: '影响',
          dramaticPotential: '潜力'
        },
        relatedScenes: [],
        keyMoments: []
      };

      mockClient.chat.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: JSON.stringify({
                proposals: [{ id: 'p1', title: 't', description: 'd', pros: ['p'], cons: ['c'] }],
                recommendation: 'r'
              }),
              role: 'assistant'
            }
          }
        ],
        usage: { total_tokens: 100 }
      } as any);

      await expect(
        agent.proposeSolutions(mockFocusContext)
      ).rejects.toThrow('Expected exactly 2 proposals');
    });
  });

  describe('P6: executeShowDontTell', () => {
    it('should generate dramatic actions', async () => {
      const mockProposal = {
        id: 'proposal_1',
        title: '提案1',
        description: '描述',
        approach: '渐进式',
        pros: ['优点'],
        cons: ['缺点'],
        dramaticImpact: '影响'
      };

      const mockFocusContext = {
        character: '张三',
        contradiction: '矛盾',
        analysis: {
          essence: '核心',
          rootCause: '根源',
          manifestation: '表现',
          impact: '影响',
          dramaticPotential: '潜力'
        },
        relatedScenes: [],
        keyMoments: []
      };

      const mockShowDontTell = {
        dramaticActions: [
          {
            sequence: 1,
            scene: '场景1',
            action: '动作1',
            reveals: '揭示1',
            dramaticFunction: '功能1'
          },
          {
            sequence: 2,
            scene: '场景2',
            action: '动作2',
            reveals: '揭示2',
            dramaticFunction: '功能2'
          }
        ],
        overallArc: '整体弧线',
        integrationNotes: '整合建议'
      };

      mockClient.chat.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: JSON.stringify(mockShowDontTell),
              role: 'assistant'
            }
          }
        ],
        usage: { total_tokens: 100 }
      } as any);

      const result = await agent.executeShowDontTell(mockProposal, mockFocusContext);

      expect(result.dramaticActions).toHaveLength(2);
      expect(result.dramaticActions[0].sequence).toBe(1);
      expect(result.overallArc).toBe('整体弧线');
      expect(result.integrationNotes).toBe('整合建议');
    });

    it('should validate dramatic actions structure', async () => {
      const mockProposal = {
        id: 'proposal_1',
        title: '提案',
        description: '描述',
        approach: '方法',
        pros: ['优点'],
        cons: ['缺点'],
        dramaticImpact: '影响'
      };

      const mockFocusContext = {
        character: '张三',
        contradiction: '矛盾',
        analysis: {
          essence: '核心',
          rootCause: '根源',
          manifestation: '表现',
          impact: '影响',
          dramaticPotential: '潜力'
        },
        relatedScenes: [],
        keyMoments: []
      };

      // Invalid response - missing required fields
      mockClient.chat.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: JSON.stringify({
                dramaticActions: [{ sequence: 1 }], // Missing required fields
                overallArc: 'arc'
              }),
              role: 'assistant'
            }
          }
        ],
        usage: { total_tokens: 100 }
      } as any);

      await expect(
        agent.executeShowDontTell(mockProposal, mockFocusContext)
      ).rejects.toThrow();
    });
  });

  describe('createCharacterArchitect factory', () => {
    it('should create agent with environment API key', () => {
      process.env.DEEPSEEK_API_KEY = 'env-test-key';

      const agent = createCharacterArchitect();

      expect(agent).toBeInstanceOf(CharacterArchitect);
    });

    it('should throw error if API key not provided', () => {
      delete process.env.DEEPSEEK_API_KEY;

      expect(() => createCharacterArchitect()).toThrow(
        'DEEPSEEK_API_KEY environment variable is required'
      );
    });
  });
});
