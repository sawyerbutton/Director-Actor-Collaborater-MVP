import { createApiResponse, createErrorResponse } from '@/lib/api/response';

describe('API Response Utilities', () => {
  describe('createApiResponse', () => {
    it('should create a success response with data', () => {
      const data = { id: '123', name: 'Test' };
      const response = createApiResponse(data);
      
      expect(response.success).toBe(true);
      expect(response.data).toEqual(data);
      expect(response.meta).toBeDefined();
      expect(response.meta?.timestamp).toBeDefined();
      expect(response.meta?.version).toBeDefined();
    });

    it('should create a success response without data', () => {
      const response = createApiResponse();
      
      expect(response.success).toBe(true);
      expect(response.data).toBeUndefined();
      expect(response.meta).toBeDefined();
    });

    it('should create a failure response when success is false', () => {
      const response = createApiResponse(null, false);
      
      expect(response.success).toBe(false);
      expect(response.data).toBeUndefined();
    });
  });

  describe('createErrorResponse', () => {
    it('should create an error response with code and message', () => {
      const response = createErrorResponse('ERROR_CODE', 'Error message');
      
      expect(response.success).toBe(false);
      expect(response.error).toBeDefined();
      expect(response.error?.code).toBe('ERROR_CODE');
      expect(response.error?.message).toBe('Error message');
      expect(response.error?.details).toBeUndefined();
    });

    it('should create an error response with details', () => {
      const details = { field: 'email', reason: 'invalid' };
      const response = createErrorResponse('VALIDATION_ERROR', 'Validation failed', details);
      
      expect(response.error?.details).toEqual(details);
    });

    it('should include meta information', () => {
      const response = createErrorResponse('ERROR', 'Message');
      
      expect(response.meta).toBeDefined();
      expect(response.meta?.timestamp).toBeDefined();
      expect(response.meta?.version).toBeDefined();
    });
  });
});