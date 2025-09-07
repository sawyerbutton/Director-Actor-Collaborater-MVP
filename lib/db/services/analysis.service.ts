import { Analysis, Prisma } from '@prisma/client';
import { prisma } from '../client';
import { BaseService, PaginationOptions } from './base.service';

export type CreateAnalysisInput = {
  projectId: string;
  status?: string;
};

export type UpdateAnalysisInput = {
  status?: string;
  result?: Prisma.JsonValue;
  errors?: Prisma.JsonValue;
  suggestions?: Prisma.JsonValue;
  startedAt?: Date;
  completedAt?: Date;
};

export class AnalysisService extends BaseService {
  async create(data: CreateAnalysisInput): Promise<Analysis> {
    try {
      return await prisma.analysis.create({
        data: {
          ...data,
          status: data.status || 'pending',
        },
      });
    } catch (error) {
      this.handleError(error);
    }
  }

  async findById(id: string, includeProject = false): Promise<Analysis | null> {
    return await prisma.analysis.findUnique({
      where: { id },
      include: {
        project: includeProject,
      },
    });
  }

  async findByProject(projectId: string, pagination?: PaginationOptions) {
    return await prisma.analysis.findMany({
      where: { projectId },
      take: pagination?.limit || 20,
      skip: pagination?.offset || 0,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByStatus(status: string, pagination?: PaginationOptions) {
    return await prisma.analysis.findMany({
      where: { status },
      take: pagination?.limit || 20,
      skip: pagination?.offset || 0,
      orderBy: { createdAt: 'desc' },
      include: {
        project: {
          select: {
            id: true,
            title: true,
            userId: true,
          },
        },
      },
    });
  }

  async update(id: string, data: UpdateAnalysisInput): Promise<Analysis> {
    try {
      return await prisma.analysis.update({
        where: { id },
        data,
      });
    } catch (error) {
      this.handleError(error);
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await prisma.analysis.delete({
        where: { id },
      });
    } catch (error) {
      this.handleError(error);
    }
  }

  async startAnalysis(id: string): Promise<Analysis> {
    try {
      return await prisma.analysis.update({
        where: { id },
        data: {
          status: 'processing',
          startedAt: new Date(),
        },
      });
    } catch (error) {
      this.handleError(error);
    }
  }

  async completeAnalysis(
    id: string,
    result: Prisma.JsonValue,
    suggestions?: Prisma.JsonValue
  ): Promise<Analysis> {
    try {
      return await prisma.analysis.update({
        where: { id },
        data: {
          status: 'completed',
          result,
          suggestions,
          completedAt: new Date(),
        },
      });
    } catch (error) {
      this.handleError(error);
    }
  }

  async failAnalysis(id: string, errors: Prisma.JsonValue): Promise<Analysis> {
    try {
      return await prisma.analysis.update({
        where: { id },
        data: {
          status: 'failed',
          errors,
          completedAt: new Date(),
        },
      });
    } catch (error) {
      this.handleError(error);
    }
  }

  async getLatestForProject(projectId: string): Promise<Analysis | null> {
    return await prisma.analysis.findFirst({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });
  }
}

export const analysisService = new AnalysisService();