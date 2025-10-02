/**
 * Unit tests for ThematicPolisher agent
 * Tests P12, P13 prompt chain functionality
 */

import { ThematicPolisher, createThematicPolisher } from '@/lib/agents/thematic-polisher';
import { DeepSeekClient } from '@/lib/api/deepseek/client';

// Mock DeepSeekClient
jest.mock('@/lib/api/deepseek/client');

describe('ThematicPolisher Agent', () => {
  let agent: ThematicPolisher;
  let mockClient: jest.Mocked<DeepSeekClient>;

  beforeEach(() => {
    // Setup mock client
    mockClient = {
      chat: jest.fn()
    } as any;

    (DeepSeekClient as jest.MockedClass<typeof DeepSeekClient>).mockImplementation(() => mockClient);

    // Create agent instance
    agent = new ThematicPolisher({
      apiKey: 'test-key',
      apiEndpoint: 'https://test.api.com',
      timeout: 30000
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('P12: enhanceCharacterDepth', () => {
    it('should enhance character depth and remove labels', async () => {
      const mockResponse = {
        characterProfile: {
          name: '李明',
          originalLabels: ['聪明的科学家', '工作狂'],
          enhancedTraits: [
            '在实验室精准如钟表，但面对人际冲突用术语掩饰情感脆弱',
            '用概率思维分析一切，包括感情，导致理性与孤独并存',
            '对失败有病态的恐惧，源于童年被父亲否定的经历'
          ],
          thematicRole: '李明代表理性与情感的冲突，体现现代人用理智武装脆弱内心的主题',
          uniqueVoice: {
            speechPattern: '习惯用数据和逻辑支撑观点，紧张时会快速说出一串专业术语',
            thinkingStyle: '凡事先建立假设，然后寻找证据验证，难以接受不确定性',
            decisionLogic: '依赖风险评估和概率计算，情感因素常被理性压制'
          },
          relationalDynamics: {
            '张华': '张华的感性直觉让李明既羡慕又恐惧，两人形成理性与感性的对照',
            '王芳': '王芳能看穿李明的伪装，成为他唯一能卸下防备的人'
          }
        },
        styleAlignment: '角色设定体现了科幻现实主义风格，理性外壳下的人性挣扎'
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

      const result = await agent.enhanceCharacterDepth(
        '李明',
        '理性与情感的冲突',
        '科幻现实主义'
      );

      expect(result).toEqual(mockResponse);
      expect(result.characterProfile.enhancedTraits).toHaveLength(3);
      expect(result.characterProfile.originalLabels).toContain('聪明的科学家');
      expect(result.characterProfile.uniqueVoice.speechPattern).toBeDefined();
      expect(mockClient.chat).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'deepseek-chat',
          response_format: { type: 'json_object' }
        })
      );
    });

    it('should throw error on invalid enhanced profile', async () => {
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
        agent.enhanceCharacterDepth('角色', '主题', '风格')
      ).rejects.toThrow('P12 Character enhancement failed');
    });
  });

  describe('P13: defineCharacterCore', () => {
    it('should define character emotional core', async () => {
      const mockProfile = {
        name: '李明',
        originalLabels: [],
        enhancedTraits: ['特质1'],
        thematicRole: '角色',
        uniqueVoice: {
          speechPattern: 'sp',
          thinkingStyle: 'ts',
          decisionLogic: 'dl'
        },
        relationalDynamics: {}
      };

      const mockResponse = {
        characterCore: {
          name: '李明',
          coreFear: {
            description: '李明最深层的恐惧是被证明自己的理性思维无法解决问题，从而暴露内心的无助和脆弱',
            origin: '童年时父亲总用"你这样不行"否定他的情感表达，让他学会用理性武装自己',
            manifestation: '面对无法用逻辑解释的情况时，会表现出焦虑、逃避，甚至攻击性'
          },
          limitingBelief: {
            belief: '只要我足够理性，就能控制一切',
            impact: '这个信念让他无法真正信任他人，也无法面对自己的情感需求，导致关系疏离',
            challenge: '剧情中通过一次理性失效的危机，迫使他正视情感的力量和人际连接的价值'
          },
          vulnerabilityMoment: {
            scene: '实验室深夜，李明独自面对失败的实验数据',
            trigger: '多次验证后发现问题出在他从未怀疑的基础假设上，意味着理性体系的崩塌',
            breakdown: '他先是疯狂重算数据，然后开始自我怀疑，最终双手颤抖地摘下眼镜，第一次在镜头前流下眼泪。这一刻他不再是"科学家李明"，只是一个害怕失败的普通人',
            revelation: '这一刻揭示了李明用理性构建的防御机制其实是因为他比任何人都更脆弱'
          },
          empathyHook: {
            hook: '每个人都曾用某种方式伪装脆弱',
            universalEmotion: '害怕被看穿真实的自己',
            connectionStrategy: '通过李明的崩溃瞬间，观众看到自己也曾有的伪装时刻，产生深层共鸣'
          }
        },
        integrationNotes: '可以在第8集安排李明的脆弱性时刻，作为角色弧线的转折点，之后逐步展现他学会接纳情感的过程'
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

      const result = await agent.defineCharacterCore('李明', mockProfile);

      expect(result).toEqual(mockResponse);
      expect(result.characterCore.coreFear.description).toBeDefined();
      expect(result.characterCore.limitingBelief.belief).toBeDefined();
      expect(result.characterCore.vulnerabilityMoment.breakdown).toBeDefined();
      expect(result.characterCore.empathyHook.hook).toBeDefined();
      expect(result.integrationNotes).toBeDefined();
    });

    it('should throw error on invalid core definition', async () => {
      const mockProfile = {
        name: 'test',
        originalLabels: [],
        enhancedTraits: [],
        thematicRole: '',
        uniqueVoice: {
          speechPattern: '',
          thinkingStyle: '',
          decisionLogic: ''
        },
        relationalDynamics: {}
      };

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
        agent.defineCharacterCore('test', mockProfile)
      ).rejects.toThrow('P13 Core definition failed');
    });
  });

  describe('completeCharacterPolishing', () => {
    it('should execute full P12-P13 workflow', async () => {
      const mockEnhanced = {
        characterProfile: {
          name: '测试',
          originalLabels: [],
          enhancedTraits: ['特质1'],
          thematicRole: '角色',
          uniqueVoice: {
            speechPattern: 'sp',
            thinkingStyle: 'ts',
            decisionLogic: 'dl'
          },
          relationalDynamics: {}
        },
        styleAlignment: 'sa'
      };

      const mockCore = {
        characterCore: {
          name: '测试',
          coreFear: {
            description: 'd',
            origin: 'o',
            manifestation: 'm'
          },
          limitingBelief: {
            belief: 'b',
            impact: 'i',
            challenge: 'c'
          },
          vulnerabilityMoment: {
            scene: 's',
            trigger: 't',
            breakdown: 'b',
            revelation: 'r'
          },
          empathyHook: {
            hook: 'h',
            universalEmotion: 'ue',
            connectionStrategy: 'cs'
          }
        },
        integrationNotes: 'in'
      };

      mockClient.chat
        .mockResolvedValueOnce({
          choices: [{ message: { content: JSON.stringify(mockEnhanced), role: 'assistant' } }],
          usage: { total_tokens: 100 }
        } as any)
        .mockResolvedValueOnce({
          choices: [{ message: { content: JSON.stringify(mockCore), role: 'assistant' } }],
          usage: { total_tokens: 100 }
        } as any);

      const result = await agent.completeCharacterPolishing(
        '测试',
        '主题',
        '风格'
      );

      expect(result.enhanced).toEqual(mockEnhanced);
      expect(result.core).toEqual(mockCore);
      expect(mockClient.chat).toHaveBeenCalledTimes(2);
    });
  });

  describe('createThematicPolisher factory', () => {
    it('should create agent with env API key', () => {
      process.env.DEEPSEEK_API_KEY = 'env-key';
      const agent = createThematicPolisher();
      expect(agent).toBeInstanceOf(ThematicPolisher);
      delete process.env.DEEPSEEK_API_KEY;
    });

    it('should throw error if no API key', () => {
      delete process.env.DEEPSEEK_API_KEY;
      expect(() => createThematicPolisher()).toThrow('DEEPSEEK_API_KEY');
    });
  });
});
