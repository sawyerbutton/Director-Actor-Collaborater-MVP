import { User, Prisma } from '@prisma/client';
import { prisma } from '../client';
import { BaseService, PaginationOptions } from './base.service';

export type CreateUserInput = Omit<Prisma.UserCreateInput, 'projects'>;
export type UpdateUserInput = Partial<CreateUserInput>;

export class UserService extends BaseService {
  async create(data: CreateUserInput): Promise<User> {
    try {
      return await prisma.user.create({
        data,
      });
    } catch (error) {
      this.handleError(error);
    }
  }

  async findById(id: string): Promise<User | null> {
    return await prisma.user.findUnique({
      where: { id },
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    return await prisma.user.findUnique({
      where: { email },
    });
  }

  async findAll(pagination?: PaginationOptions): Promise<User[]> {
    return await prisma.user.findMany({
      take: pagination?.limit || 20,
      skip: pagination?.offset || 0,
      orderBy: { createdAt: 'desc' },
    });
  }

  async update(id: string, data: UpdateUserInput): Promise<User> {
    try {
      return await prisma.user.update({
        where: { id },
        data,
      });
    } catch (error) {
      this.handleError(error);
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await prisma.user.delete({
        where: { id },
      });
    } catch (error) {
      this.handleError(error);
    }
  }

  async countProjects(userId: string): Promise<number> {
    return await prisma.project.count({
      where: { userId },
    });
  }
}

export const userService = new UserService();