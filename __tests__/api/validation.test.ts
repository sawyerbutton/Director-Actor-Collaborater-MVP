import { z } from 'zod';
import { parseQueryParams, commonSchemas } from '@/lib/api/validation';

describe('API Validation', () => {
  describe('commonSchemas', () => {
    describe('pagination schema', () => {
      it('should validate pagination parameters', () => {
        const result = commonSchemas.pagination.parse({
          page: '2',
          limit: '50',
          sort: 'name',
          order: 'desc'
        });
        
        expect(result.page).toBe(2);
        expect(result.limit).toBe(50);
        expect(result.sort).toBe('name');
        expect(result.order).toBe('desc');
      });

      it('should use defaults for missing parameters', () => {
        const result = commonSchemas.pagination.parse({});
        
        expect(result.page).toBe(1);
        expect(result.limit).toBe(20);
        expect(result.order).toBe('asc');
      });

      it('should reject invalid pagination values', () => {
        expect(() => {
          commonSchemas.pagination.parse({
            page: '0',
            limit: '200'
          });
        }).toThrow();
      });
    });

    describe('email schema', () => {
      it('should validate email addresses', () => {
        const valid = commonSchemas.email.safeParse('user@example.com');
        expect(valid.success).toBe(true);
        
        const invalid = commonSchemas.email.safeParse('not-an-email');
        expect(invalid.success).toBe(false);
      });
    });

    describe('url schema', () => {
      it('should validate URLs', () => {
        const valid = commonSchemas.url.safeParse('https://example.com');
        expect(valid.success).toBe(true);
        
        const invalid = commonSchemas.url.safeParse('not-a-url');
        expect(invalid.success).toBe(false);
      });
    });

    describe('id schema', () => {
      it('should validate UUIDs', () => {
        const valid = commonSchemas.id.safeParse('550e8400-e29b-41d4-a716-446655440000');
        expect(valid.success).toBe(true);
        
        const invalid = commonSchemas.id.safeParse('not-a-uuid');
        expect(invalid.success).toBe(false);
      });
    });

    describe('search schema', () => {
      it('should validate search queries', () => {
        const result = commonSchemas.search.parse({
          q: 'search term',
          fields: ['name', 'description']
        });
        
        expect(result.q).toBe('search term');
        expect(result.fields).toEqual(['name', 'description']);
      });

      it('should require query string', () => {
        const invalid = commonSchemas.search.safeParse({ q: '' });
        expect(invalid.success).toBe(false);
      });
    });
  });
});