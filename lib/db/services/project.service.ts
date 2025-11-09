import { Project, Prisma, WorkflowStatus } from '@prisma/client';
import { prisma } from '../client';
import { BaseService, PaginationOptions } from './base.service';

export type CreateProjectInput = Omit<Prisma.ProjectCreateInput, 'user' | 'analyses'> & {
  userId: string;
};
export type UpdateProjectInput = Partial<Omit<CreateProjectInput, 'userId'>>;

export class ProjectService extends BaseService {
  async create(data: CreateProjectInput): Promise<Project> {
    try {
      return await prisma.project.create({
        data,
      });
    } catch (error) {
      this.handleError(error);
    }
  }

  async findById(id: string, includeAnalyses = false): Promise<Project | null> {
    return await prisma.project.findUnique({
      where: { id },
      include: {
        analyses: includeAnalyses,
      },
    });
  }

  async findByUser(userId: string, options?: PaginationOptions & { where?: any }) {
    const { limit, offset, where: additionalWhere } = options || {};

    return await prisma.project.findMany({
      where: {
        userId,
        ...additionalWhere,
      },
      take: limit || 20,
      skip: offset || 0,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            analyses: true,
            scriptFiles: true,
          },
        },
      },
    });
  }

  async findAll(pagination?: PaginationOptions) {
    return await prisma.project.findMany({
      take: pagination?.limit || 20,
      skip: pagination?.offset || 0,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: { analyses: true },
        },
      },
    });
  }

  async update(id: string, data: UpdateProjectInput): Promise<Project> {
    try {
      return await prisma.project.update({
        where: { id },
        data,
      });
    } catch (error) {
      this.handleError(error);
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await prisma.project.delete({
        where: { id },
      });
    } catch (error) {
      this.handleError(error);
    }
  }

  async updateStatus(id: string, status: string): Promise<Project> {
    try {
      return await prisma.project.update({
        where: { id },
        data: { status },
      });
    } catch (error) {
      this.handleError(error);
    }
  }

  async countByStatus(status: string): Promise<number> {
    return await prisma.project.count({
      where: { status },
    });
  }

  async countByUser(userId: string): Promise<number> {
    return await prisma.project.count({
      where: { userId },
    });
  }

  /**
   * Update workflow status for a project
   */
  async updateWorkflowStatus(id: string, workflowStatus: WorkflowStatus): Promise<Project> {
    try {
      // Validate state transitions
      const project = await this.findById(id);
      if (!project) {
        throw new Error('Project not found');
      }

      // Validate state machine transitions
      if (!this.isValidTransition(project.workflowStatus, workflowStatus)) {
        throw new Error(`Invalid workflow transition from ${project.workflowStatus} to ${workflowStatus}`);
      }

      return await prisma.project.update({
        where: { id },
        data: { workflowStatus },
      });
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * Validate workflow state transitions
   */
  private isValidTransition(from: WorkflowStatus, to: WorkflowStatus): boolean {
    const validTransitions: Record<WorkflowStatus, WorkflowStatus[]> = {
      [WorkflowStatus.INITIALIZED]: [WorkflowStatus.ACT1_RUNNING],
      [WorkflowStatus.ACT1_RUNNING]: [WorkflowStatus.ACT1_COMPLETE, WorkflowStatus.INITIALIZED],
      [WorkflowStatus.ACT1_COMPLETE]: [WorkflowStatus.ITERATING, WorkflowStatus.SYNTHESIZING],
      [WorkflowStatus.ITERATING]: [WorkflowStatus.ACT1_COMPLETE, WorkflowStatus.SYNTHESIZING],
      [WorkflowStatus.SYNTHESIZING]: [WorkflowStatus.COMPLETED, WorkflowStatus.ITERATING],
      [WorkflowStatus.COMPLETED]: [WorkflowStatus.INITIALIZED], // Allow restart
    };

    return validTransitions[from]?.includes(to) ?? false;
  }

  /**
   * Get projects by workflow status
   */
  async findByWorkflowStatus(
    workflowStatus: WorkflowStatus,
    pagination?: PaginationOptions
  ): Promise<Project[]> {
    return await prisma.project.findMany({
      where: { workflowStatus },
      take: pagination?.limit || 20,
      skip: pagination?.offset || 0,
      orderBy: { updatedAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            analyses: true,
            scriptVersions: true,
            analysisJobs: true,
          },
        },
      },
    });
  }

  /**
   * Get project with all workflow data
   */
  async findWithWorkflowData(id: string): Promise<Project & {
    scriptVersions?: any[];
    analysisJobs?: any[];
    diagnosticReport?: any;
  } | null> {
    return await prisma.project.findUnique({
      where: { id },
      include: {
        scriptVersions: {
          orderBy: { version: 'desc' },
          take: 5, // Last 5 versions
        },
        analysisJobs: {
          orderBy: { createdAt: 'desc' },
          take: 10, // Last 10 jobs
        },
        diagnosticReport: true,
        analyses: {
          orderBy: { createdAt: 'desc' },
          take: 1, // Latest analysis
        },
      },
    });
  }

  /**
   * Update project content (for gradual version iteration)
   */
  async updateContent(id: string, content: string): Promise<Project> {
    try {
      return await prisma.project.update({
        where: { id },
        data: { content, updatedAt: new Date() }
      });
    } catch (error) {
      this.handleError(error);
    }
  }
}

export const projectService = new ProjectService();