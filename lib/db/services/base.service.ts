export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

export interface PaginationOptions {
  limit?: number;
  offset?: number;
}

export abstract class BaseService {
  protected handleError(error: unknown): never {
    // Check if error has the shape of a Prisma error
    if (error && typeof error === 'object' && 'code' in error) {
      const prismaError = error as { code: string };
      if (prismaError.code === 'P2002') {
        throw new ValidationError('Unique constraint violation');
      }
      if (prismaError.code === 'P2025') {
        throw new NotFoundError('Record not found');
      }
    }
    throw error;
  }
}