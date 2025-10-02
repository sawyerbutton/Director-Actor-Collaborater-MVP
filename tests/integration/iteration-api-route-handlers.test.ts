/**
 * Integration tests for Iteration API route handlers
 * Tests route handlers directly using NextRequest (no HTTP server required)
 * @jest-environment node
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db/client';
import type { CharacterArchitect } from '@/lib/agents/character-architect';

// Import route handlers
import { POST as proposeHandler } from '@/app/api/v1/iteration/propose/route';
import { POST as executeHandler } from '@/app/api/v1/iteration/execute/route';
import { GET as decisionsHandler } from '@/app/api/v1/projects/[id]/decisions/route';

// Mock AI agent factory functions
jest.mock('@/lib/agents/character-architect', () => ({
  createCharacterArchitect: jest.fn()
}));
jest.mock('@/lib/agents/rules-auditor', () => ({
  createRulesAuditor: jest.fn()
}));
jest.mock('@/lib/agents/pacing-strategist', () => ({
  createPacingStrategist: jest.fn()
}));
jest.mock('@/lib/agents/thematic-polisher', () => ({
  createThematicPolisher: jest.fn()
}));

describe('Iteration API Route Handlers', () => {
  let testProjectId: string;
  let testUserId: string;

  beforeAll(async () => {
    // Ensure test user exists
    testUserId = 'demo-user';

    const existingUser = await prisma.user.findUnique({
      where: { id: testUserId }
    });

    if (!existingUser) {
      await prisma.user.create({
        data: {
          id: testUserId,
          email: 'demo@example.com',
          name: 'Demo User'
        }
      });
    }

    // Create test project
    const project = await prisma.project.create({
      data: {
        userId: testUserId,
        title: 'Test Project for Iteration Route Handlers',
        content: '测试剧本内容...',
        workflowStatus: 'ACT1_COMPLETE'
      }
    });
    testProjectId = project.id;

    // Create diagnostic report
    await prisma.diagnosticReport.create({
      data: {
        projectId: testProjectId,
        findings: [
          {
            type: 'character',
            severity: 'high',
            description: '张三的性格前后不一致',
            location: {
              sceneNumber: 1,
              characterName: '张三'
            },
            suggestion: '需要更清晰的角色发展弧线'
          }
        ] as any,
        summary: '发现1个角色一致性问题',
        confidence: 0.85
      }
    });

    // Setup CharacterArchitect mock
    const { createCharacterArchitect } = require('@/lib/agents/character-architect');

    const mockAgent = {
      focusCharacter: jest.fn().mockResolvedValue({
      character: '张三',
      contradiction: '性格前后不一致',
      analysis: {
        essence: '角色缺乏内在驱动力',
        rootCause: '初始设定不够清晰',
        manifestation: '行为决策反复无常',
        impact: '观众难以共情',
        dramaticPotential: '可以通过关键事件塑造性格转变'
      },
        relatedScenes: ['场景1', '场景5'],
        keyMoments: ['第一次选择', '最终决定']
      }),
      proposeSolutions: jest.fn().mockResolvedValue({
      proposals: [
        {
          id: 'proposal_1',
          title: '渐进式性格塑造',
          description: '通过一系列小事件逐步展现角色内在',
          approach: '渐进式角色发展',
          pros: ['自然', '可信', '观众容易接受'],
          cons: ['需要更多篇幅', '节奏可能较慢'],
          dramaticImpact: '增强角色真实感'
        },
        {
          id: 'proposal_2',
          title: '戏剧性转折',
          description: '通过一个重大事件引发角色剧变',
          approach: '戏剧性转折',
          pros: ['冲击力强', '记忆点明确', '节奏紧凑'],
          cons: ['可能显得突兀', '需要精心设计'],
          dramaticImpact: '创造强烈戏剧张力'
        }
        ],
        recommendation: '建议选择方案1，更适合本剧本的叙事风格'
      }),
      executeShowDontTell: jest.fn().mockResolvedValue({
        dramaticActions: [
          {
            sequence: 1,
            scene: '办公室，白天',
            action: '张三面对同事的挑衅，深吸一口气，紧握拳头，但最终选择转身离开',
            reveals: '展现角色的克制和内在挣扎',
            dramaticFunction: '建立角色初始状态'
          },
          {
            sequence: 2,
            scene: '家中，夜晚',
            action: '张三独自坐在黑暗中，拿出一张旧照片反复端详，眼神从迷茫转为坚定',
            reveals: '暗示角色的过去和动机',
            dramaticFunction: '揭示内在驱动力'
          }
        ],
        overallArc: '通过两个场景展现角色从被动到主动的转变',
        integrationNotes: '建议在第一幕结尾和第二幕开头分别插入这两个场景'
      })
    };

    (createCharacterArchitect as jest.Mock).mockReturnValue(mockAgent);
  });

  afterAll(async () => {
    // Cleanup
    if (testProjectId) {
      await prisma.revisionDecision.deleteMany({
        where: { projectId: testProjectId }
      });

      await prisma.diagnosticReport.deleteMany({
        where: { projectId: testProjectId }
      });

      await prisma.project.delete({
        where: { id: testProjectId }
      });
    }

    await prisma.$disconnect();
  });

  describe('POST /api/v1/iteration/propose', () => {
    it('should generate proposals for character contradiction', async () => {
      const request = new NextRequest('http://localhost:3001/api/v1/iteration/propose', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          projectId: testProjectId,
          act: 'ACT2_CHARACTER',
          focusName: '张三',
          contradiction: '性格前后不一致',
          scriptContext: '相关剧本上下文...'
        })
      });

      const response = await proposeHandler(request);
      expect(response.status).toBe(200);

      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data.decisionId).toBeDefined();
      expect(data.data.focusContext).toBeDefined();
      expect(data.data.proposals).toHaveLength(2);
      expect(data.data.recommendation).toBeDefined();

      // Verify proposals structure
      const proposal = data.data.proposals[0];
      expect(proposal.id).toBeDefined();
      expect(proposal.title).toBeDefined();
      expect(proposal.description).toBeDefined();
      expect(Array.isArray(proposal.pros)).toBe(true);
      expect(Array.isArray(proposal.cons)).toBe(true);
    }, 15000);

    it('should return 404 for non-existent project', async () => {
      const request = new NextRequest('http://localhost:3001/api/v1/iteration/propose', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          projectId: 'non-existent-id',
          act: 'ACT2_CHARACTER',
          focusName: '张三',
          contradiction: '矛盾',
          scriptContext: '上下文'
        })
      });

      const response = await proposeHandler(request);
      expect(response.status).toBe(404);

      const data = await response.json();
      expect(data.success).toBe(false);
    });

    it('should validate request body', async () => {
      const request = new NextRequest('http://localhost:3001/api/v1/iteration/propose', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          projectId: testProjectId
          // Missing required fields
        })
      });

      const response = await proposeHandler(request);
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.success).toBe(false);
    });
  });

  describe('POST /api/v1/iteration/execute', () => {
    let decisionId: string;

    beforeAll(async () => {
      // Create a decision first
      const proposeRequest = new NextRequest('http://localhost:3001/api/v1/iteration/propose', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          projectId: testProjectId,
          act: 'ACT2_CHARACTER',
          focusName: '张三',
          contradiction: '性格前后不一致',
          scriptContext: '相关剧本上下文...'
        })
      });

      const proposeResponse = await proposeHandler(proposeRequest);
      const proposeData = await proposeResponse.json();
      decisionId = proposeData.data.decisionId;
    });

    it('should execute selected proposal and generate dramatic actions', async () => {
      const request = new NextRequest('http://localhost:3001/api/v1/iteration/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          decisionId,
          proposalChoice: 0 // Select first proposal
        })
      });

      const response = await executeHandler(request);
      expect(response.status).toBe(200);

      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data.decisionId).toBe(decisionId);
      expect(data.data.selectedProposal).toBeDefined();
      expect(Array.isArray(data.data.dramaticActions)).toBe(true);
      expect(data.data.dramaticActions.length).toBeGreaterThan(0);
      expect(data.data.overallArc).toBeDefined();
      expect(data.data.integrationNotes).toBeDefined();

      // Verify dramatic action structure
      const action = data.data.dramaticActions[0];
      expect(action.sequence).toBeDefined();
      expect(action.scene).toBeDefined();
      expect(action.action).toBeDefined();
      expect(action.reveals).toBeDefined();
    }, 15000);

    it('should validate proposalChoice range', async () => {
      const request = new NextRequest('http://localhost:3001/api/v1/iteration/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          decisionId,
          proposalChoice: 5 // Invalid choice
        })
      });

      const response = await executeHandler(request);
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.success).toBe(false);
    });

    it('should return 404 for non-existent decision', async () => {
      const request = new NextRequest('http://localhost:3001/api/v1/iteration/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          decisionId: 'non-existent-id',
          proposalChoice: 0
        })
      });

      const response = await executeHandler(request);
      expect(response.status).toBe(404);

      const data = await response.json();
      expect(data.success).toBe(false);
    });
  });

  describe('GET /api/v1/projects/:id/decisions', () => {
    it('should retrieve all decisions for a project', async () => {
      const request = new NextRequest(
        `http://localhost:3001/api/v1/projects/${testProjectId}/decisions`,
        {
          method: 'GET'
        }
      );

      const response = await decisionsHandler(request, { params: { id: testProjectId } });
      expect(response.status).toBe(200);

      const data = await response.json();

      expect(data.success).toBe(true);
      expect(Array.isArray(data.data.decisions)).toBe(true);
      expect(data.data.statistics).toBeDefined();
      expect(data.data.statistics.total).toBeGreaterThanOrEqual(0);
    });

    it('should filter decisions by act', async () => {
      const request = new NextRequest(
        `http://localhost:3001/api/v1/projects/${testProjectId}/decisions?act=ACT2_CHARACTER`,
        {
          method: 'GET'
        }
      );

      const response = await decisionsHandler(request, { params: { id: testProjectId } });
      expect(response.status).toBe(200);

      const data = await response.json();

      expect(data.success).toBe(true);
      expect(Array.isArray(data.data.decisions)).toBe(true);

      // All decisions should be for ACT2_CHARACTER
      data.data.decisions.forEach((decision: any) => {
        expect(decision.act).toBe('ACT2_CHARACTER');
      });
    });

    it('should return 404 for non-existent project', async () => {
      const request = new NextRequest(
        'http://localhost:3001/api/v1/projects/non-existent-id/decisions',
        {
          method: 'GET'
        }
      );

      const response = await decisionsHandler(request, { params: { id: 'non-existent-id' } });
      expect(response.status).toBe(404);

      const data = await response.json();
      expect(data.success).toBe(false);
    });
  });
});
