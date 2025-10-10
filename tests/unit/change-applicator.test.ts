/**
 * Unit tests for Change Applicator
 * Tests the core logic for applying decision changes to script content
 */

import {
  applyChanges,
  applyCharacterChanges,
  parseScriptToScenes,
  assembleScenesIntoScript
} from '@/lib/synthesis/change-applicator';
import { ActType } from '@prisma/client';

describe('Change Applicator', () => {
  const mockScript = `场景1 - 咖啡馆 - 白天

李明坐在窗边，盯着手机。

李明：你为什么不回我消息？

场景2 - 公园 - 傍晚

王芳在长椅上看书。

王芳：有些事情需要时间。`;

  describe('parseScriptToScenes', () => {
    it('should parse script into scenes correctly', () => {
      const scenes = parseScriptToScenes(mockScript);

      expect(scenes.length).toBeGreaterThan(0);
      expect(scenes[0].heading).toContain('场景');
    });

    it('should handle empty script', () => {
      const scenes = parseScriptToScenes('');
      expect(scenes.length).toBeGreaterThanOrEqual(0);
    });

    it('should preserve scene numbers', () => {
      const scenes = parseScriptToScenes(mockScript);
      const sceneNumbers = scenes.map(s => s.sceneNumber);
      expect(sceneNumbers).toContain(1);
      expect(sceneNumbers).toContain(2);
    });
  });

  describe('assembleScenesIntoScript', () => {
    it('should reassemble scenes into script', () => {
      const scenes = parseScriptToScenes(mockScript);
      const reassembled = assembleScenesIntoScript(scenes);

      expect(reassembled).toBeTruthy();
      expect(reassembled.length).toBeGreaterThan(0);
    });

    it('should maintain scene structure', () => {
      const scenes = parseScriptToScenes(mockScript);
      const reassembled = assembleScenesIntoScript(scenes);

      expect(reassembled).toContain('场景');
      expect(reassembled).toContain('李明');
      expect(reassembled).toContain('王芳');
    });
  });

  describe('applyCharacterChanges (ACT2)', () => {
    it('should apply dramatic actions to scenes', async () => {
      const changes = {
        dramaticActions: [
          {
            sceneNumber: 1,
            action: '李明紧张地握紧手机，手在微微颤抖',
            characterName: '李明'
          }
        ],
        overallArc: '李明从焦虑不安到最终释怀的情感转变',
        integrationNotes: '在场景1插入戏剧化动作'
      };

      const result = await applyCharacterChanges(changes, mockScript, {});

      expect(result).toContain('戏剧化动作');
      expect(result).toContain('李明紧张地握紧手机');
      expect(result).toContain('整体弧线');
    });

    it('should handle empty dramatic actions', async () => {
      const changes = {
        dramaticActions: [],
        overallArc: 'No arc',
        integrationNotes: 'No actions'
      };

      const result = await applyCharacterChanges(changes, mockScript, {});

      // Should return original script when no actions
      expect(result).toBe(mockScript);
    });

    it('should skip non-existent scene numbers', async () => {
      const changes = {
        dramaticActions: [
          {
            sceneNumber: 999, // Non-existent scene
            action: 'Test action',
            characterName: '测试'
          }
        ],
        overallArc: 'Test arc',
        integrationNotes: 'Test notes'
      };

      const result = await applyCharacterChanges(changes, mockScript, {});

      // Should not throw error, just skip the action
      expect(result).toBeTruthy();
    });
  });

  describe('applyChanges - Main Entry Point', () => {
    it('should apply ACT2_CHARACTER changes', async () => {
      const options = {
        act: ActType.ACT2_CHARACTER,
        generatedChanges: {
          dramaticActions: [
            {
              sceneNumber: 1,
              action: '测试动作',
              characterName: '李明'
            }
          ],
          overallArc: '测试弧线',
          integrationNotes: '测试说明'
        },
        currentScript: mockScript,
        focusContext: {}
      };

      const result = await applyChanges(options);

      expect(result).toContain('戏剧化动作');
      expect(result).toContain('测试动作');
    });

    it('should apply ACT3_WORLDBUILDING changes', async () => {
      const options = {
        act: ActType.ACT3_WORLDBUILDING,
        generatedChanges: {
          alignmentStrategies: [
            { strategy: '策略1', description: '描述1' },
            { strategy: '策略2', description: '描述2' }
          ],
          coreRecommendation: '核心建议',
          integrationNotes: '集成说明'
        },
        currentScript: mockScript,
        focusContext: {}
      };

      const result = await applyChanges(options);

      expect(result).toContain('ACT3 世界观对齐');
      expect(result).toContain('核心建议');
      expect(result).toContain('策略1');
    });

    it('should apply ACT4_PACING changes', async () => {
      const options = {
        act: ActType.ACT4_PACING,
        generatedChanges: {
          changes: [
            { type: 'shorten', sceneNumber: 1, targetLength: 50 }
          ],
          expectedImprovement: '改进节奏',
          integrationNotes: '节奏优化说明'
        },
        currentScript: mockScript,
        focusContext: {}
      };

      const result = await applyChanges(options);

      expect(result).toContain('ACT4 节奏优化');
      expect(result).toContain('改进节奏');
    });

    it('should apply ACT5_THEME changes', async () => {
      const options = {
        act: ActType.ACT5_THEME,
        generatedChanges: {
          characterCore: {
            coreFears: ['恐惧1', '恐惧2'],
            coreBeliefs: ['信念1', '信念2'],
            empathyHooks: ['共情点1']
          },
          integrationNotes: '主题润色说明'
        },
        currentScript: mockScript,
        focusContext: {}
      };

      const result = await applyChanges(options);

      expect(result).toContain('ACT5 主题润色');
      expect(result).toContain('恐惧1');
      expect(result).toContain('信念1');
    });

    it('should throw error for invalid act type', async () => {
      const options = {
        act: 'INVALID_ACT' as any,
        generatedChanges: {},
        currentScript: mockScript,
        focusContext: {}
      };

      await expect(applyChanges(options)).rejects.toThrow('Unsupported act type');
    });

    it('should throw error for missing generatedChanges', async () => {
      const options = {
        act: ActType.ACT2_CHARACTER,
        generatedChanges: null as any,
        currentScript: mockScript,
        focusContext: {}
      };

      await expect(applyChanges(options)).rejects.toThrow('generatedChanges is required');
    });

    it('should throw error for empty currentScript', async () => {
      const options = {
        act: ActType.ACT2_CHARACTER,
        generatedChanges: {
          dramaticActions: [],
          overallArc: '',
          integrationNotes: ''
        },
        currentScript: '',
        focusContext: {}
      };

      await expect(applyChanges(options)).rejects.toThrow('currentScript is required');
    });
  });

  describe('Round-trip consistency', () => {
    it('should preserve content in parse -> assemble cycle', () => {
      const scenes = parseScriptToScenes(mockScript);
      const reassembled = assembleScenesIntoScript(scenes);

      // Allow for minor whitespace differences
      const normalize = (s: string) => s.trim().replace(/\s+/g, ' ');

      expect(normalize(reassembled)).toContain(normalize('场景1'));
      expect(normalize(reassembled)).toContain(normalize('李明'));
      expect(normalize(reassembled)).toContain(normalize('王芳'));
    });
  });

  describe('Edge cases', () => {
    it('should handle script with only one scene', async () => {
      const singleSceneScript = '场景1 - 测试\n\n测试内容';

      const options = {
        act: ActType.ACT2_CHARACTER,
        generatedChanges: {
          dramaticActions: [
            { sceneNumber: 1, action: '测试动作', characterName: '测试' }
          ],
          overallArc: '测试',
          integrationNotes: '测试'
        },
        currentScript: singleSceneScript,
        focusContext: {}
      };

      const result = await applyChanges(options);
      expect(result).toBeTruthy();
      expect(result).toContain('戏剧化动作');
    });

    it('should handle script without scene markers', async () => {
      const noSceneScript = '这是一段没有场景标记的剧本内容。\n李明：对话内容。';

      const options = {
        act: ActType.ACT2_CHARACTER,
        generatedChanges: {
          dramaticActions: [
            { sceneNumber: 1, action: '测试动作', characterName: '李明' }
          ],
          overallArc: '测试',
          integrationNotes: '测试'
        },
        currentScript: noSceneScript,
        focusContext: {}
      };

      const result = await applyChanges(options);
      expect(result).toBeTruthy();
    });

    it('should handle very long scripts', async () => {
      const longScript = Array(100).fill(mockScript).join('\n\n');

      const options = {
        act: ActType.ACT2_CHARACTER,
        generatedChanges: {
          dramaticActions: [
            { sceneNumber: 1, action: '测试动作', characterName: '李明' }
          ],
          overallArc: '测试',
          integrationNotes: '测试'
        },
        currentScript: longScript,
        focusContext: {}
      };

      const result = await applyChanges(options);
      expect(result).toBeTruthy();
      expect(result.length).toBeGreaterThan(longScript.length);
    });
  });
});
