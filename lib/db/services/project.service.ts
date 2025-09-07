import { Project, Prisma } from '@prisma/client';
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

  async findByUser(userId: string, pagination?: PaginationOptions) {
    return await prisma.project.findMany({
      where: { userId },
      take: pagination?.limit || 20,
      skip: pagination?.offset || 0,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { analyses: true },
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
}

export const projectService = new ProjectService();