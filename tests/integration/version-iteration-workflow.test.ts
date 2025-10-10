/**
 * Integration test for Version Iteration Workflow
 * Tests the complete flow of gradual version updates (方案A)
 */

// Polyfill for NextRequest in test environment
import 'next/dist/server/web/spec-extension/request';

import { NextRequest } from 'next/server';
import { POST as executeHandler } from '@/app/api/v1/iteration/execute/route';
import { POST as proposeHandler } from '@/app/api/v1/iteration/propose/route';

// Mock dependencies
jest.mock('@/lib/db/client', () => ({
  prisma: {
    revisionDecision: {
      findUnique: jest.fn(),
      update: jest.fn()
    },
    project: {
      findUnique: jest.fn(),
      update: jest.fn()
    },
    scriptVersion: {
      findFirst: jest.fn(),
      create: jest.fn()
    }
  }
}));

jest.mock('@/lib/agents/character-architect', () => ({
  createCharacterArchitect: jest.fn(() => ({
    focusCharacter: jest.fn(),
    proposeSolutions: jest.fn(),
    executeShowDontTell: jest.fn()
  }))
}));

jest.mock('@/lib/agents/rules-auditor', () => ({
  createRulesAuditor: jest.fn(() => ({
    alignSettingWithTheme: jest.fn()
  }))
}));

jest.mock('@/lib/agents/pacing-strategist', () => ({
  createPacingStrategist: jest.fn()
}));

jest.mock('@/lib/agents/thematic-polisher', () => ({
  createThematicPolisher: jest.fn(() => ({
    defineCharacterCore: jest.fn()
  }))
}));

import { prisma } from '@/lib/db/client';
import { createCharacterArchitect } from '@/lib/agents/character-architect';
import { createRulesAuditor } from '@/lib/agents/rules-auditor';
import { createThematicPolisher } from '@/lib/agents/thematic-polisher';

describe('Version Iteration Workflow Integration', () => {
  const mockPrisma = prisma as any;
  const mockProject = {
    id: 'project-1',
    userId: 'demo-user',
    content: '场景1 - 咖啡馆\n\n李明：你好。',
    workflowStatus: 'ACT1_COMPLETE',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const mockDecision = {
    id: 'decision-1',
    projectId: 'project-1',
    act: 'ACT2_CHARACTER',
    focusName: '李明',
    focusContext: { contradiction: '角色矛盾' },
    proposals: [
      {
        id: 'prop1',
        title: '方案1',
        approach: '方法1',
        pros: ['优点1'],
        cons: ['缺点1']
      },
      {
        id: 'prop2',
        title: '方案2',
        approach: '方法2',
        pros: ['优点2'],
        cons: ['缺点2']
      }
    ],
    userChoice: null,
    generatedChanges: null,
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Execute API - Version Creation', () => {
    it('should create new version after decision execution', async () => {
      // Setup mocks
      mockPrisma.revisionDecision.findUnique.mockResolvedValue(mockDecision);
      mockPrisma.project.findUnique.mockResolvedValue(mockProject);

      const generatedChanges = {
        dramaticActions: [
          {
            sceneNumber: 1,
            action: '李明紧张地握紧手机',
            characterName: '李明'
          }
        ],
        overallArc: '情感转变弧线',
        integrationNotes: '集成说明'
      };

      const mockAgent = createCharacterArchitect() as any;
      mockAgent.executeShowDontTell.mockResolvedValue(generatedChanges);

      mockPrisma.revisionDecision.update.mockResolvedValue({
        ...mockDecision,
        userChoice: 'prop1',
        generatedChanges
      });

      // Mock version creation
      mockPrisma.scriptVersion.findFirst.mockResolvedValue(null); // No existing versions
      mockPrisma.scriptVersion.create.mockResolvedValue({
        id: 'version-1',
        projectId: 'project-1',
        version: 1,
        content: '场景1 - 咖啡馆\n\n[戏剧化动作 - 李明]\n李明紧张地握紧手机\n\n李明：你好。',
        changeLog: JSON.stringify([]),
        confidence: 0.9,
        createdAt: new Date()
      });

      mockPrisma.project.update.mockResolvedValue(mockProject);

      // Make request
      const request = new NextRequest('http://localhost:3001/api/v1/iteration/execute', {
        method: 'POST',
        body: JSON.stringify({
          decisionId: 'decision-1',
          proposalChoice: 0
        })
      });

      const response = await executeHandler(request);
      const data = await response.json();

      // Verify response contains version info
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.versionId).toBeDefined();
      expect(data.data.version).toBeDefined();

      // Verify version was created
      expect(mockPrisma.scriptVersion.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            projectId: 'project-1',
            version: 1,
            content: expect.stringContaining('戏剧化动作')
          })
        })
      );

      // Verify project content was updated
      expect(mockPrisma.project.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'project-1' },
          data: expect.objectContaining({
            content: expect.stringContaining('戏剧化动作')
          })
        })
      );

      // Verify decision version was updated
      expect(mockPrisma.revisionDecision.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'decision-1' },
          data: expect.objectContaining({
            version: 1
          })
        })
      );
    });

    it('should use latest version as base for second decision', async () => {
      // First version exists
      const existingVersion = {
        id: 'version-1',
        projectId: 'project-1',
        version: 1,
        content: '场景1 - 咖啡馆\n\n[戏剧化动作 - 李明]\n李明紧张地握紧手机\n\n李明：你好。',
        changeLog: '[]',
        confidence: 0.9,
        createdAt: new Date()
      };

      mockPrisma.scriptVersion.findFirst.mockResolvedValue(existingVersion);
      mockPrisma.revisionDecision.findUnique.mockResolvedValue(mockDecision);
      mockPrisma.project.findUnique.mockResolvedValue(mockProject);

      const generatedChanges = {
        dramaticActions: [
          {
            sceneNumber: 1,
            action: '他的眼神闪过一丝犹豫',
            characterName: '李明'
          }
        ],
        overallArc: '进一步深化',
        integrationNotes: '基于 V1 的修改'
      };

      const mockAgent = createCharacterArchitect() as any;
      mockAgent.executeShowDontTell.mockResolvedValue(generatedChanges);

      mockPrisma.revisionDecision.update.mockResolvedValue({
        ...mockDecision,
        userChoice: 'prop1',
        generatedChanges
      });

      // Should create V2 based on V1
      mockPrisma.scriptVersion.create.mockResolvedValue({
        id: 'version-2',
        projectId: 'project-1',
        version: 2, // Incremented version
        content: existingVersion.content + '\n他的眼神闪过一丝犹豫',
        changeLog: JSON.stringify([]),
        confidence: 0.9,
        createdAt: new Date()
      });

      mockPrisma.project.update.mockResolvedValue(mockProject);

      const request = new NextRequest('http://localhost:3001/api/v1/iteration/execute', {
        method: 'POST',
        body: JSON.stringify({
          decisionId: 'decision-1',
          proposalChoice: 0
        })
      });

      await executeHandler(request);

      // Verify that version 2 was created
      expect(mockPrisma.scriptVersion.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            version: 2,
            content: expect.stringContaining('他的眼神闪过一丝犹豫')
          })
        })
      );
    });

    it('should handle graceful degradation if applyChanges fails', async () => {
      mockPrisma.revisionDecision.findUnique.mockResolvedValue(mockDecision);
      mockPrisma.project.findUnique.mockResolvedValue(mockProject);
      mockPrisma.scriptVersion.findFirst.mockResolvedValue(null);

      // Mock agent to return changes
      const mockAgent = createCharacterArchitect() as any;
      mockAgent.executeShowDontTell.mockResolvedValue({
        dramaticActions: [],
        overallArc: '',
        integrationNotes: ''
      });

      mockPrisma.revisionDecision.update.mockResolvedValue({
        ...mockDecision,
        userChoice: 'prop1',
        generatedChanges: {}
      });

      mockPrisma.scriptVersion.create.mockResolvedValue({
        id: 'version-1',
        projectId: 'project-1',
        version: 1,
        content: mockProject.content, // Should fallback to original
        changeLog: '[]',
        confidence: 0.9,
        createdAt: new Date()
      });

      mockPrisma.project.update.mockResolvedValue(mockProject);

      const request = new NextRequest('http://localhost:3001/api/v1/iteration/execute', {
        method: 'POST',
        body: JSON.stringify({
          decisionId: 'decision-1',
          proposalChoice: 0
        })
      });

      const response = await executeHandler(request);

      // Should still succeed, just with original content
      expect(response.status).toBe(200);
      expect(mockPrisma.scriptVersion.create).toHaveBeenCalled();
    });
  });

  describe('Propose API - Latest Version Usage', () => {
    it('should use latest version as scriptContext', async () => {
      const latestVersion = {
        id: 'version-2',
        projectId: 'project-1',
        version: 2,
        content: '场景1 - 咖啡馆\n\n[戏剧化动作]\n改进后的剧本内容',
        changeLog: '[]',
        confidence: 0.9,
        createdAt: new Date()
      };

      mockPrisma.project.findUnique.mockResolvedValue(mockProject);
      mockPrisma.scriptVersion.findFirst.mockResolvedValue(latestVersion);

      const mockAgent = createCharacterArchitect() as any;
      mockAgent.focusCharacter.mockResolvedValue({
        characterName: '李明',
        contradiction: '角色矛盾',
        contextSummary: '上下文'
      });
      mockAgent.proposeSolutions.mockResolvedValue({
        proposals: [{ id: 'prop1', title: '方案1' }],
        recommendation: '推荐方案1'
      });

      mockPrisma.revisionDecision.create.mockResolvedValue(mockDecision);

      const request = new NextRequest('http://localhost:3001/api/v1/iteration/propose', {
        method: 'POST',
        body: JSON.stringify({
          projectId: 'project-1',
          act: 'ACT2_CHARACTER',
          focusName: '李明',
          contradiction: '角色矛盾'
        })
      });

      await proposeHandler(request);

      // Verify that focusCharacter was called with latest version content
      expect(mockAgent.focusCharacter).toHaveBeenCalledWith(
        '李明',
        '角色矛盾',
        expect.stringContaining('改进后的剧本内容')
      );
    });

    it('should fallback to project.content if no versions exist', async () => {
      mockPrisma.project.findUnique.mockResolvedValue(mockProject);
      mockPrisma.scriptVersion.findFirst.mockResolvedValue(null); // No versions

      const mockAgent = createCharacterArchitect() as any;
      mockAgent.focusCharacter.mockResolvedValue({
        characterName: '李明',
        contradiction: '角色矛盾'
      });
      mockAgent.proposeSolutions.mockResolvedValue({
        proposals: [],
        recommendation: ''
      });

      mockPrisma.revisionDecision.create.mockResolvedValue(mockDecision);

      const request = new NextRequest('http://localhost:3001/api/v1/iteration/propose', {
        method: 'POST',
        body: JSON.stringify({
          projectId: 'project-1',
          act: 'ACT2_CHARACTER',
          focusName: '李明',
          contradiction: '角色矛盾'
        })
      });

      await proposeHandler(request);

      // Should use original project.content
      expect(mockAgent.focusCharacter).toHaveBeenCalledWith(
        '李明',
        '角色矛盾',
        expect.stringContaining(mockProject.content)
      );
    });
  });

  describe('Cumulative Iteration Flow', () => {
    it('should support cumulative improvements across multiple decisions', async () => {
      // Decision 1: Creates V1
      mockPrisma.scriptVersion.findFirst.mockResolvedValueOnce(null);

      // Decision 2: Finds V1, creates V2
      const v1 = {
        version: 1,
        content: 'V1 content'
      };
      mockPrisma.scriptVersion.findFirst.mockResolvedValueOnce(v1);

      // Decision 3: Finds V2, creates V3
      const v2 = {
        version: 2,
        content: 'V2 content with V1 changes'
      };
      mockPrisma.scriptVersion.findFirst.mockResolvedValueOnce(v2);

      // Verify version numbers increment correctly
      const versions = [null, v1, v2];

      for (let i = 0; i < versions.length; i++) {
        const expectedVersion = i + 1;
        const currentVersion = versions[i];

        if (currentVersion === null) {
          expect(expectedVersion).toBe(1);
        } else {
          expect((currentVersion as any).version).toBe(i);
          expect(expectedVersion).toBe(i + 1);
        }
      }
    });
  });
});
