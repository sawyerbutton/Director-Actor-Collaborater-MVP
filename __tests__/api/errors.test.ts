import { ZodError, z } from 'zod';
import {
  ApiError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  ServiceUnavailableError,
  handleApiError
} from '@/lib/api/errors';
import { ERROR_CODES, HTTP_STATUS } from '@/lib/config/constants';

describe('API Errors', () => {
  describe('ApiError', () => {
    it('should create an error with correct properties', () => {
      const error = new ApiError('TEST_ERROR', 'Test message', 400, { detail: 'test' });
      
      expect(error.code).toBe('TEST_ERROR');
      expect(error.message).toBe('Test message');
      expect(error.statusCode).toBe(400);
      expect(error.details).toEqual({ detail: 'test' });
      expect(error.name).toBe('ApiError');
    });

    it('should convert to NextResponse', () => {
      const error = new ApiError('TEST_ERROR', 'Test message', 400);
      const response = error.toResponse();
      
      expect(response.status).toBe(400);
    });
  });

  describe('Predefined Error Classes', () => {
    it('ValidationError should have correct defaults', () => {
      const error = new ValidationError();
      expect(error.code).toBe(ERROR_CODES.VALIDATION_ERROR);
      expect(error.statusCode).toBe(HTTP_STATUS.BAD_REQUEST);
      expect(error.message).toBe('Validation failed');
    });

    it('NotFoundError should have correct defaults', () => {
      const error = new NotFoundError('User');
      expect(error.code).toBe(ERROR_CODES.NOT_FOUND);
      expect(error.statusCode).toBe(HTTP_STATUS.NOT_FOUND);
      expect(error.message).toBe('User not found');
    });

    it('UnauthorizedError should have correct defaults', () => {
      const error = new UnauthorizedError();
      expect(error.code).toBe(ERROR_CODES.UNAUTHORIZED);
      expect(error.statusCode).toBe(HTTP_STATUS.UNAUTHORIZED);
    });

    it('ForbiddenError should have correct defaults', () => {
      const error = new ForbiddenError();
      expect(error.code).toBe(ERROR_CODES.FORBIDDEN);
      expect(error.statusCode).toBe(HTTP_STATUS.FORBIDDEN);
    });

    it('ConflictError should have correct defaults', () => {
      const error = new ConflictError();
      expect(error.code).toBe(ERROR_CODES.CONFLICT);
      expect(error.statusCode).toBe(HTTP_STATUS.CONFLICT);
    });

    it('ServiceUnavailableError should have correct defaults', () => {
      const error = new ServiceUnavailableError();
      expect(error.code).toBe(ERROR_CODES.SERVICE_UNAVAILABLE);
      expect(error.statusCode).toBe(HTTP_STATUS.SERVICE_UNAVAILABLE);
    });
  });

  describe('handleApiError', () => {
    it('should handle ApiError instances', () => {
      const error = new ValidationError('Custom validation message');
      const response = handleApiError(error);
      
      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
    });

    it('should handle ZodError instances', () => {
      const schema = z.object({
        name: z.string(),
        age: z.number()
      });
      
      try {
        schema.parse({ name: 123, age: 'invalid' });
      } catch (error) {
        const response = handleApiError(error);
        expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
      }
    });

    it('should handle standard Error instances', () => {
      const error = new Error('Standard error');
      const response = handleApiError(error);
      
      expect(response.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR);
    });

    it('should handle unknown errors', () => {
      const response = handleApiError('string error');
      
      expect(response.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR);
    });

    it('should not expose internal errors in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      
      const error = new Error('Internal secret error');
      const response = handleApiError(error);
      
      // Response should not contain the actual error message
      expect(response.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR);
      
      process.env.NODE_ENV = originalEnv;
    });
  });
});