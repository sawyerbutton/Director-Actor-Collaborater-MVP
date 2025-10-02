/**
 * Unit tests for RevisionDecisionService
 */

import { RevisionDecisionService } from '@/lib/db/services/revision-decision.service';
import { prisma } from '@/lib/db/client';
import { ActType } from '@prisma/client';

// Mock prisma client
jest.mock('@/lib/db/client', () => ({
  prisma: {
    revisionDecision: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn()
    }
  }
}));

describe('RevisionDecisionService', () => {
  let service: RevisionDecisionService;
  const mockPrisma = prisma as any;

  beforeEach(() => {
    service = new RevisionDecisionService();
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new revision decision', async () => {
      const mockDecision = {
        id: 'decision-1',
        projectId: 'project-1',
        act: 'ACT2_CHARACTER' as ActType,
        focusName: '张三',
        focusContext: { contradiction: '性格不一致' },
        proposals: [
          {
            id: 'p1',
            title: '提案1',
            description: '描述1',
            pros: ['优点1'],
            cons: ['缺点1']
          }
        ],
        userChoice: null,
        generatedChanges: null,
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockPrisma.revisionDecision.create.mockResolvedValueOnce(mockDecision as any);

      const result = await service.create({
        projectId: 'project-1',
        act: 'ACT2_CHARACTER' as ActType,
        focusName: '张三',
        focusContext: { contradiction: '性格不一致' },
        proposals: [
          {
            id: 'p1',
            title: '提案1',
            description: '描述1',
            pros: ['优点1'],
            cons: ['缺点1']
          }
        ]
      });

      expect(result).toEqual(mockDecision);
      expect(mockPrisma.revisionDecision.create).toHaveBeenCalledWith({
        data: {
          projectId: 'project-1',
          act: 'ACT2_CHARACTER',
          focusName: '张三',
          focusContext: { contradiction: '性格不一致' },
          proposals: expect.any(Array),
          version: 1
        }
      });
    });
  });

  describe('execute', () => {
    it('should update decision with user choice and changes', async () => {
      const existingDecision = {
        id: 'decision-1',
        projectId: 'project-1',
        act: 'ACT2_CHARACTER' as ActType,
        focusName: '张三',
        focusContext: {},
        proposals: [],
        userChoice: null,
        generatedChanges: null,
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const updatedDecision = {
        ...existingDecision,
        userChoice: 'proposal_1',
        generatedChanges: [
          {
            scene: '场景1',
            action: '动作1',
            reveals: '揭示1'
          }
        ]
      };

      mockPrisma.revisionDecision.findUnique.mockResolvedValueOnce(
        existingDecision as any
      );
      mockPrisma.revisionDecision.update.mockResolvedValueOnce(updatedDecision as any);

      const result = await service.execute('decision-1', {
        userChoice: 'proposal_1',
        generatedChanges: [
          {
            scene: '场景1',
            action: '动作1',
            reveals: '揭示1'
          }
        ]
      });

      expect(result.userChoice).toBe('proposal_1');
      expect(mockPrisma.revisionDecision.update).toHaveBeenCalledWith({
        where: { id: 'decision-1' },
        data: {
          userChoice: 'proposal_1',
          generatedChanges: expect.any(Array),
          updatedAt: expect.any(Date)
        }
      });
    });

    it('should throw NotFoundError if decision does not exist', async () => {
      mockPrisma.revisionDecision.findUnique.mockResolvedValueOnce(null);

      await expect(
        service.execute('non-existent', {
          userChoice: 'p1',
          generatedChanges: []
        })
      ).rejects.toThrow('Decision not found');
    });
  });

  describe('getByProjectId', () => {
    it('should retrieve all decisions for a project', async () => {
      const mockDecisions = [
        {
          id: 'decision-1',
          projectId: 'project-1',
          act: 'ACT2_CHARACTER' as ActType,
          focusName: '张三',
          focusContext: {},
          proposals: [],
          userChoice: null,
          generatedChanges: null,
          version: 1,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'decision-2',
          projectId: 'project-1',
          act: 'ACT2_CHARACTER' as ActType,
          focusName: '李四',
          focusContext: {},
          proposals: [],
          userChoice: null,
          generatedChanges: null,
          version: 1,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      mockPrisma.revisionDecision.findMany.mockResolvedValueOnce(mockDecisions as any);

      const result = await service.getByProjectId('project-1');

      expect(result).toHaveLength(2);
      expect(mockPrisma.revisionDecision.findMany).toHaveBeenCalledWith({
        where: { projectId: 'project-1' },
        orderBy: { createdAt: 'desc' }
      });
    });
  });

  describe('getByProjectAndAct', () => {
    it('should filter decisions by act type', async () => {
      const mockDecisions = [
        {
          id: 'decision-1',
          projectId: 'project-1',
          act: 'ACT2_CHARACTER' as ActType,
          focusName: '张三',
          focusContext: {},
          proposals: [],
          userChoice: null,
          generatedChanges: null,
          version: 1,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      mockPrisma.revisionDecision.findMany.mockResolvedValueOnce(mockDecisions as any);

      const result = await service.getByProjectAndAct(
        'project-1',
        'ACT2_CHARACTER' as ActType
      );

      expect(result).toHaveLength(1);
      expect(result[0].act).toBe('ACT2_CHARACTER');
      expect(mockPrisma.revisionDecision.findMany).toHaveBeenCalledWith({
        where: { projectId: 'project-1', act: 'ACT2_CHARACTER' },
        orderBy: { createdAt: 'desc' }
      });
    });
  });

  describe('isExecuted', () => {
    it('should return true if decision has userChoice and generatedChanges', async () => {
      mockPrisma.revisionDecision.findUnique.mockResolvedValueOnce({
        userChoice: 'proposal_1',
        generatedChanges: [{ scene: 's1', action: 'a1', reveals: 'r1' }]
      } as any);

      const result = await service.isExecuted('decision-1');

      expect(result).toBe(true);
    });

    it('should return false if decision is not executed', async () => {
      mockPrisma.revisionDecision.findUnique.mockResolvedValueOnce({
        userChoice: null,
        generatedChanges: null
      } as any);

      const result = await service.isExecuted('decision-1');

      expect(result).toBe(false);
    });
  });

  describe('getStatistics', () => {
    it('should calculate decision statistics correctly', async () => {
      const mockDecisions = [
        {
          id: 'd1',
          projectId: 'p1',
          act: 'ACT2_CHARACTER' as ActType,
          focusName: 'f1',
          focusContext: {},
          proposals: [],
          userChoice: 'p1',
          generatedChanges: [{}],
          version: 1,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'd2',
          projectId: 'p1',
          act: 'ACT2_CHARACTER' as ActType,
          focusName: 'f2',
          focusContext: {},
          proposals: [],
          userChoice: null,
          generatedChanges: null,
          version: 1,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'd3',
          projectId: 'p1',
          act: 'ACT3_WORLDBUILDING' as ActType,
          focusName: 'f3',
          focusContext: {},
          proposals: [],
          userChoice: 'p2',
          generatedChanges: [{}],
          version: 1,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      mockPrisma.revisionDecision.findMany.mockResolvedValueOnce(mockDecisions as any);

      const stats = await service.getStatistics('p1');

      expect(stats.total).toBe(3);
      expect(stats.executed).toBe(2);
      expect(stats.pending).toBe(1);
      expect(stats.byAct['ACT2_CHARACTER']).toBe(2);
      expect(stats.byAct['ACT3_WORLDBUILDING']).toBe(1);
    });
  });

  describe('rollback', () => {
    it('should clear userChoice and generatedChanges', async () => {
      const mockDecision = {
        id: 'decision-1',
        projectId: 'project-1',
        act: 'ACT2_CHARACTER' as ActType,
        focusName: '张三',
        focusContext: {},
        proposals: [],
        userChoice: null,
        generatedChanges: undefined,
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockPrisma.revisionDecision.update.mockResolvedValueOnce(mockDecision as any);

      const result = await service.rollback('decision-1');

      expect(result.userChoice).toBeNull();
      expect(mockPrisma.revisionDecision.update).toHaveBeenCalledWith({
        where: { id: 'decision-1' },
        data: {
          userChoice: null,
          generatedChanges: null,
          updatedAt: expect.any(Date)
        }
      });
    });
  });

  describe('delete', () => {
    it('should delete decision permanently', async () => {
      const mockDecision = {
        id: 'decision-1',
        projectId: 'project-1',
        act: 'ACT2_CHARACTER' as ActType,
        focusName: '张三',
        focusContext: {},
        proposals: [],
        userChoice: null,
        generatedChanges: null,
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockPrisma.revisionDecision.delete.mockResolvedValueOnce(mockDecision as any);

      const result = await service.delete('decision-1');

      expect(result.id).toBe('decision-1');
      expect(mockPrisma.revisionDecision.delete).toHaveBeenCalledWith({
        where: { id: 'decision-1' }
      });
    });
  });

  describe('exists', () => {
    it('should return true if decision exists', async () => {
      mockPrisma.revisionDecision.count.mockResolvedValueOnce(1);

      const result = await service.exists('decision-1');

      expect(result).toBe(true);
    });

    it('should return false if decision does not exist', async () => {
      mockPrisma.revisionDecision.count.mockResolvedValueOnce(0);

      const result = await service.exists('decision-1');

      expect(result).toBe(false);
    });
  });
});
