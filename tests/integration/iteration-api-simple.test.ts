/**
 * Simplified Integration tests for Iteration API endpoints
 * Tests database integration without HTTP server
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { prisma } from '@/lib/db/client';
import { revisionDecisionService } from '@/lib/db/services/revision-decision.service';
import { projectService } from '@/lib/db/services/project.service';
import { ActType } from '@prisma/client';

describe('Iteration API Database Integration', () => {
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
        title: 'Test Project for Iteration Integration',
        content: '测试剧本内容...',
        workflowStatus: 'ACT1_COMPLETE'
      }
    });
    testProjectId = project.id;

    // Create diagnostic report for the project
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

  describe('RevisionDecisionService Integration', () => {
    it('should create a decision with proposals', async () => {
      const decision = await revisionDecisionService.create({
        projectId: testProjectId,
        act: 'ACT2_CHARACTER' as ActType,
        focusName: '张三',
        focusContext: {
          character: '张三',
          contradiction: '性格前后不一致',
          analysis: {
            essence: '角色缺乏内在驱动力',
            rootCause: '初始设定不够清晰',
            manifestation: '行为决策反复无常',
            impact: '观众难以共情',
            dramaticPotential: '可以通过关键事件塑造性格转变'
          }
        },
        proposals: [
          {
            id: 'proposal_1',
            title: '渐进式性格塑造',
            description: '通过一系列小事件逐步展现角色内在',
            approach: '渐进式角色发展',
            pros: ['自然', '可信'],
            cons: ['需要更多篇幅'],
            dramaticImpact: '增强角色真实感'
          },
          {
            id: 'proposal_2',
            title: '戏剧性转折',
            description: '通过一个重大事件引发角色剧变',
            approach: '戏剧性转折',
            pros: ['冲击力强', '记忆点明确'],
            cons: ['可能显得突兀'],
            dramaticImpact: '创造强烈戏剧张力'
          }
        ]
      });

      expect(decision).toBeDefined();
      expect(decision.id).toBeDefined();
      expect(decision.projectId).toBe(testProjectId);
      expect(decision.act).toBe('ACT2_CHARACTER');
      expect(decision.focusName).toBe('张三');
      expect(decision.userChoice).toBeNull();
      expect(decision.generatedChanges).toBeNull();
    });

    it('should execute a decision with user choice', async () => {
      // First create a decision
      const decision = await revisionDecisionService.create({
        projectId: testProjectId,
        act: 'ACT2_CHARACTER' as ActType,
        focusName: '李四',
        focusContext: { test: 'context' },
        proposals: [
          {
            id: 'p1',
            title: 'Title 1',
            description: 'Desc 1',
            pros: ['pro1'],
            cons: ['con1']
          },
          {
            id: 'p2',
            title: 'Title 2',
            description: 'Desc 2',
            pros: ['pro2'],
            cons: ['con2']
          }
        ]
      });

      // Execute the decision
      const executed = await revisionDecisionService.execute(decision.id, {
        userChoice: 'p1',
        generatedChanges: [
          {
            scene: '办公室，白天',
            action: '张三转身离开',
            reveals: '展现角色的克制'
          }
        ]
      });

      expect(executed.userChoice).toBe('p1');
      expect(executed.generatedChanges).toBeDefined();
      expect(Array.isArray(executed.generatedChanges)).toBe(true);
    });

    it('should retrieve all decisions for a project', async () => {
      const decisions = await revisionDecisionService.getByProjectId(testProjectId);

      expect(Array.isArray(decisions)).toBe(true);
      expect(decisions.length).toBeGreaterThan(0);
      expect(decisions[0].projectId).toBe(testProjectId);
    });

    it('should filter decisions by act type', async () => {
      const decisions = await revisionDecisionService.getByProjectAndAct(
        testProjectId,
        'ACT2_CHARACTER' as ActType
      );

      expect(Array.isArray(decisions)).toBe(true);
      decisions.forEach(decision => {
        expect(decision.act).toBe('ACT2_CHARACTER');
      });
    });

    it('should calculate statistics correctly', async () => {
      const stats = await revisionDecisionService.getStatistics(testProjectId);

      expect(stats).toBeDefined();
      expect(stats.total).toBeGreaterThan(0);
      expect(stats.executed).toBeGreaterThanOrEqual(0);
      expect(stats.pending).toBeGreaterThanOrEqual(0);
      expect(stats.byAct).toBeDefined();
      expect(stats.byAct['ACT2_CHARACTER']).toBeGreaterThan(0);
    });

    it('should check if decision is executed', async () => {
      // Get an executed decision
      const decisions = await revisionDecisionService.getByProjectId(testProjectId);
      const executedDecision = decisions.find(d => d.userChoice !== null);

      if (executedDecision) {
        const isExecuted = await revisionDecisionService.isExecuted(executedDecision.id);
        expect(isExecuted).toBe(true);
      }

      // Get a pending decision
      const pendingDecision = decisions.find(d => d.userChoice === null);
      if (pendingDecision) {
        const isExecuted = await revisionDecisionService.isExecuted(pendingDecision.id);
        expect(isExecuted).toBe(false);
      }
    });

    it('should rollback a decision', async () => {
      // Create and execute a decision
      const decision = await revisionDecisionService.create({
        projectId: testProjectId,
        act: 'ACT2_CHARACTER' as ActType,
        focusName: '王五',
        focusContext: { test: 'context' },
        proposals: [
          {
            id: 'p1',
            title: 'T1',
            description: 'D1',
            pros: ['p'],
            cons: ['c']
          },
          {
            id: 'p2',
            title: 'T2',
            description: 'D2',
            pros: ['p'],
            cons: ['c']
          }
        ]
      });

      await revisionDecisionService.execute(decision.id, {
        userChoice: 'p1',
        generatedChanges: [{ scene: 's', action: 'a', reveals: 'r' }]
      });

      // Rollback
      const rolledBack = await revisionDecisionService.rollback(decision.id);

      expect(rolledBack.userChoice).toBeNull();
      expect(rolledBack.generatedChanges).toBeNull();
    });

    it('should delete a decision', async () => {
      // Create a decision
      const decision = await revisionDecisionService.create({
        projectId: testProjectId,
        act: 'ACT2_CHARACTER' as ActType,
        focusName: '赵六',
        focusContext: { test: 'context' },
        proposals: [
          {
            id: 'p1',
            title: 'T1',
            description: 'D1',
            pros: ['p'],
            cons: ['c']
          },
          {
            id: 'p2',
            title: 'T2',
            description: 'D2',
            pros: ['p'],
            cons: ['c']
          }
        ]
      });

      // Delete
      await revisionDecisionService.delete(decision.id);

      // Verify deletion
      const exists = await revisionDecisionService.exists(decision.id);
      expect(exists).toBe(false);
    });

    it('should get parsed decisions with typed data', async () => {
      const decisions = await revisionDecisionService.getParsedDecisions(testProjectId);

      expect(Array.isArray(decisions)).toBe(true);
      if (decisions.length > 0) {
        const decision = decisions[0];
        expect(decision.parsedProposals).toBeDefined();
        expect(Array.isArray(decision.parsedProposals)).toBe(true);

        if (decision.parsedProposals.length > 0) {
          const proposal = decision.parsedProposals[0];
          expect(proposal.id).toBeDefined();
          expect(proposal.title).toBeDefined();
          expect(proposal.description).toBeDefined();
        }
      }
    });

    it('should get latest decision for an act', async () => {
      const latest = await revisionDecisionService.getLatest(
        testProjectId,
        'ACT2_CHARACTER' as ActType
      );

      if (latest) {
        expect(latest.projectId).toBe(testProjectId);
        expect(latest.act).toBe('ACT2_CHARACTER');
      }
    });
  });

  describe('Project Integration', () => {
    it('should verify project workflow status', async () => {
      const project = await projectService.findById(testProjectId);

      expect(project).toBeDefined();
      expect(project?.workflowStatus).toBe('ACT1_COMPLETE');
    });
  });
});
