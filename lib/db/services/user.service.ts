import { User, Prisma } from '@prisma/client';
import { prisma } from '../client';
import { BaseService, PaginationOptions } from './base.service';
import bcrypt from 'bcryptjs';

export type CreateUserInput = Omit<Prisma.UserCreateInput, 'projects'>;
export type UpdateUserInput = Partial<CreateUserInput>;

export class UserService extends BaseService {
  async create(data: CreateUserInput): Promise<User> {
    try {
      const createData = { ...data };
      
      if ('password' in createData && createData.password) {
        createData.password = await this.hashPassword(createData.password);
      }
      
      return await prisma.user.create({
        data: createData,
      });
    } catch (error) {
      this.handleError(error);
    }
  }

  async hashPassword(password: string): Promise<string> {
    return await bcrypt.hash(password, 10);
  }

  async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    return await bcrypt.compare(password, hashedPassword);
  }

  async findById(id: string): Promise<User | null> {
    return await prisma.user.findUnique({
      where: { id },
    });
  }

  async findByEmail(email: string, includePassword: boolean = false): Promise<User | null> {
    return await prisma.user.findUnique({
      where: { email },
      select: includePassword ? undefined : {
        id: true,
        email: true,
        name: true,
        image: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
      },
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