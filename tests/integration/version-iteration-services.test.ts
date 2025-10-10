/**
 * Integration test for Version Iteration Services
 * Tests version management and change application logic
 */

import { VersionManager } from '@/lib/synthesis/version-manager';
import { applyChanges } from '@/lib/synthesis/change-applicator';
import { ActType } from '@prisma/client';

// Mock Prisma Client
jest.mock('@/lib/db/client', () => ({
  prisma: {
    scriptVersion: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn()
    }
  }
}));

import { prisma } from '@/lib/db/client';

describe('Version Iteration Services Integration', () => {
  const mockPrisma = prisma as any;
  const versionManager = new VersionManager();

  const mockScript = `场景1 - 咖啡馆 - 白天

李明坐在窗边，盯着手机。

李明：你为什么不回我消息？

场景2 - 公园 - 傍晚

王芳在长椅上看书。`;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Complete Version Iteration Flow', () => {
    it('should create V1, apply changes, create V2 in sequence', async () => {
      const projectId = 'test-project';

      // Step 1: No existing version (V1 will be created)
      mockPrisma.scriptVersion.findFirst.mockResolvedValueOnce(null);

      // Step 2: Apply ACT2 changes
      const act2Changes = {
        dramaticActions: [
          {
            sceneNumber: 1,
            action: '李明紧张地握紧手机，手在微微颤抖',
            characterName: '李明'
          }
        ],
        overallArc: '李明从焦虑到释怀的情感转变',
        integrationNotes: '在场景1插入戏剧化动作'
      };

      const v1Content = await applyChanges({
        act: ActType.ACT2_CHARACTER,
        generatedChanges: act2Changes,
        currentScript: mockScript,
        focusContext: {}
      });

      expect(v1Content).toContain('戏剧化动作');
      expect(v1Content).toContain('李明紧张地握紧手机');

      // Step 3: Create V1
      mockPrisma.scriptVersion.create.mockResolvedValueOnce({
        id: 'version-1',
        projectId,
        version: 1,
        content: v1Content,
        changeLog: JSON.stringify([]),
        confidence: 0.9,
        createdAt: new Date()
      });

      const v1 = await versionManager.createVersion(projectId, v1Content, {
        synthesisLog: [],
        decisionsApplied: ['decision-1'],
        confidence: 0.9,
        timestamp: new Date()
      });

      expect(v1.version).toBe(1);
      expect(mockPrisma.scriptVersion.create).toHaveBeenCalledTimes(1);

      // Step 4: Get latest version for next decision
      mockPrisma.scriptVersion.findFirst.mockResolvedValueOnce(v1);

      const latestVersion = await versionManager.getLatestVersion(projectId);
      expect(latestVersion).toBe(v1);
      expect(latestVersion.content).toContain('戏剧化动作');

      // Step 5: Apply second ACT2 change based on V1
      const act2Changes2 = {
        dramaticActions: [
          {
            sceneNumber: 2,
            action: '王芳缓缓抬起头，目光温柔',
            characterName: '王芳'
          }
        ],
        overallArc: '进一步深化角色弧光',
        integrationNotes: '基于 V1 的改进'
      };

      const v2Content = await applyChanges({
        act: ActType.ACT2_CHARACTER,
        generatedChanges: act2Changes2,
        currentScript: v1.content,
        focusContext: {}
      });

      expect(v2Content).toContain('李明紧张地握紧手机'); // V1 changes
      expect(v2Content).toContain('王芳缓缓抬起头'); // V2 changes

      // Step 6: Create V2
      mockPrisma.scriptVersion.create.mockResolvedValueOnce({
        id: 'version-2',
        projectId,
        version: 2,
        content: v2Content,
        changeLog: JSON.stringify([]),
        confidence: 0.9,
        createdAt: new Date()
      });

      const v2 = await versionManager.createVersion(projectId, v2Content, {
        synthesisLog: [],
        decisionsApplied: ['decision-1', 'decision-2'],
        confidence: 0.9,
        timestamp: new Date(),
        previousVersion: 1
      });

      expect(v2.version).toBe(2);
      expect(mockPrisma.scriptVersion.create).toHaveBeenCalledTimes(2);
    });

    it('should support different act types in sequence', async () => {
      const projectId = 'test-project';
      let currentContent = mockScript;

      // ACT2: Character changes
      const act2Result = await applyChanges({
        act: ActType.ACT2_CHARACTER,
        generatedChanges: {
          dramaticActions: [
            { sceneNumber: 1, action: '动作1', characterName: '李明' }
          ],
          overallArc: '弧线1',
          integrationNotes: '说明1'
        },
        currentScript: currentContent,
        focusContext: {}
      });

      expect(act2Result).toContain('ACT2 修改');
      currentContent = act2Result;

      // ACT3: Worldbuilding
      const act3Result = await applyChanges({
        act: ActType.ACT3_WORLDBUILDING,
        generatedChanges: {
          alignmentStrategies: [
            { strategy: '策略1' }
          ],
          coreRecommendation: '核心建议',
          integrationNotes: '世界观说明'
        },
        currentScript: currentContent,
        focusContext: {}
      });

      expect(act3Result).toContain('ACT2 修改'); // Previous changes
      expect(act3Result).toContain('ACT3 世界观对齐'); // New changes
      currentContent = act3Result;

      // ACT4: Pacing
      const act4Result = await applyChanges({
        act: ActType.ACT4_PACING,
        generatedChanges: {
          changes: [
            { type: 'shorten', sceneNumber: 1 }
          ],
          expectedImprovement: '节奏改进',
          integrationNotes: '节奏说明'
        },
        currentScript: currentContent,
        focusContext: {}
      });

      expect(act4Result).toContain('ACT2 修改'); // Changes from ACT2
      expect(act4Result).toContain('ACT3 世界观对齐'); // Changes from ACT3
      expect(act4Result).toContain('ACT4 节奏优化'); // Changes from ACT4
      currentContent = act4Result;

      // ACT5: Theme
      const act5Result = await applyChanges({
        act: ActType.ACT5_THEME,
        generatedChanges: {
          characterCore: {
            coreFears: ['恐惧1'],
            coreBeliefs: ['信念1']
          },
          integrationNotes: '主题说明'
        },
        currentScript: currentContent,
        focusContext: {}
      });

      expect(act5Result).toContain('ACT2 修改');
      expect(act5Result).toContain('ACT3 世界观对齐');
      expect(act5Result).toContain('ACT4 节奏优化');
      expect(act5Result).toContain('ACT5 主题润色');
    });
  });

  describe('Version Manager Integration', () => {
    it('should handle version number incrementation', async () => {
      const projectId = 'test-project';

      // No existing versions
      mockPrisma.scriptVersion.findFirst.mockResolvedValueOnce(null);
      mockPrisma.scriptVersion.create.mockResolvedValueOnce({
        id: 'v1',
        version: 1,
        content: 'content1'
      });

      const v1 = await versionManager.createVersion(projectId, 'content1', {
        synthesisLog: [],
        decisionsApplied: [],
        confidence: 1.0,
        timestamp: new Date()
      });

      expect(v1.version).toBe(1);

      // Existing V1
      mockPrisma.scriptVersion.findFirst.mockResolvedValueOnce(v1);
      mockPrisma.scriptVersion.create.mockResolvedValueOnce({
        id: 'v2',
        version: 2,
        content: 'content2'
      });

      const v2 = await versionManager.createVersion(projectId, 'content2', {
        synthesisLog: [],
        decisionsApplied: [],
        confidence: 1.0,
        timestamp: new Date()
      });

      expect(v2.version).toBe(2);

      // Existing V2
      mockPrisma.scriptVersion.findFirst.mockResolvedValueOnce(v2);
      mockPrisma.scriptVersion.create.mockResolvedValueOnce({
        id: 'v3',
        version: 3,
        content: 'content3'
      });

      const v3 = await versionManager.createVersion(projectId, 'content3', {
        synthesisLog: [],
        decisionsApplied: [],
        confidence: 1.0,
        timestamp: new Date()
      });

      expect(v3.version).toBe(3);
    });

    it('should retrieve latest version correctly', async () => {
      const projectId = 'test-project';

      const v3 = {
        id: 'v3',
        projectId,
        version: 3,
        content: 'latest content'
      };

      mockPrisma.scriptVersion.findFirst.mockResolvedValue(v3);

      const latest = await versionManager.getLatestVersion(projectId);

      expect(latest).toBe(v3);
      expect(mockPrisma.scriptVersion.findFirst).toHaveBeenCalledWith({
        where: { projectId },
        orderBy: { version: 'desc' }
      });
    });

    it('should return null if no versions exist', async () => {
      mockPrisma.scriptVersion.findFirst.mockResolvedValue(null);

      const latest = await versionManager.getLatestVersion('nonexistent');

      expect(latest).toBeNull();
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      mockPrisma.scriptVersion.findFirst.mockRejectedValue(
        new Error('Database connection failed')
      );

      await expect(
        versionManager.getLatestVersion('test-project')
      ).rejects.toThrow('Database connection failed');
    });

    it('should handle invalid act types in applyChanges', async () => {
      await expect(
        applyChanges({
          act: 'INVALID_ACT' as any,
          generatedChanges: {},
          currentScript: mockScript,
          focusContext: {}
        })
      ).rejects.toThrow('Unsupported act type');
    });
  });
});
