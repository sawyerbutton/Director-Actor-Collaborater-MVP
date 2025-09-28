/**
 * Unit tests for Repair Error Handling
 * Epic-001 Story 3: Test verification
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { RevisionExecutive } from '../../../lib/agents/revision-executive';
import { RetryHelper } from '../../../lib/utils/retry-helper';
import { getErrorMessage } from '../../../lib/utils/error-messages';
import { LogicError } from '../../../types/analysis';
import { RevisionContext } from '../../../types/revision';

// Mock the DeepSeek client
jest.mock('../../../lib/api/deepseek/client');

describe('Repair Error Handling', () => {
  let revisionExecutive: RevisionExecutive;
  let testError: LogicError;
  let testContext: RevisionContext;

  beforeEach(() => {
    revisionExecutive = new RevisionExecutive({
      maxSuggestionsPerError: 3,
      enableContextAnalysis: true,
      retryConfig: {
        maxAttempts: 3,
        backoffMs: [100, 200, 400], // Faster for testing
        timeout: 1000
      }
    });

    testError = {
      id: 'test_error_001',
      type: 'character_consistency',
      severity: 'high',
      location: { page: 1, line: 5, scene: 1 },
      description: 'Test error description',
      suggestion: 'Test suggestion',
      confidence: 0.85,
      context: {
        before: 'Before context',
        error: 'Error context',
        after: 'After context'
      }
    };

    testContext = {
      scriptContent: 'Test script content',
      previousEvents: ['Event 1', 'Event 2'],
      affectedElements: ['Element 1', 'Element 2']
    };
  });

  describe('Retry Mechanism', () => {
    test('should retry 3 times on timeout', async () => {
      let attempts = 0;
      const fn = jest.fn().mockImplementation(() => {
        attempts++;
        if (attempts < 3) {
          throw new Error('Operation timeout');
        }
        return Promise.resolve({ success: true });
      });

      const result = await RetryHelper.withRetry(fn, {
        maxAttempts: 3,
        backoffMs: [10, 20, 40],
        timeout: 5000
      });

      expect(attempts).toBe(3);
      expect(result.success).toBe(true);
      expect(fn).toHaveBeenCalledTimes(3);
    });

    test('should use exponential backoff', async () => {
      const startTime = Date.now();
      let attempts = 0;

      const fn = jest.fn().mockImplementation(() => {
        attempts++;
        if (attempts < 3) {
          throw new Error('network timeout');
        }
        return Promise.resolve({ success: true });
      });

      await RetryHelper.withRetry(fn, {
        maxAttempts: 3,
        backoffMs: [100, 200, 400],
        timeout: 5000
      });

      const elapsedTime = Date.now() - startTime;
      // Should take at least 300ms (100 + 200)
      expect(elapsedTime).toBeGreaterThanOrEqual(300);
    });

    test('should not retry on non-retryable errors', async () => {
      const fn = jest.fn().mockRejectedValue(new Error('Invalid API key'));

      await expect(
        RetryHelper.withRetry(fn, {
          maxAttempts: 3,
          backoffMs: [100, 200, 400],
          timeout: 5000
        })
      ).rejects.toThrow('Invalid API key');

      expect(fn).toHaveBeenCalledTimes(1);
    });

    test('should respect max retry limit', async () => {
      const fn = jest.fn().mockRejectedValue(new Error('network timeout'));

      await expect(
        RetryHelper.withRetry(fn, {
          maxAttempts: 3,
          backoffMs: [10, 20, 40],
          timeout: 5000
        })
      ).rejects.toThrow(/Max retries \(3\) exceeded/);

      expect(fn).toHaveBeenCalledTimes(3);
    });
  });

  describe('Response Validation', () => {
    test('should handle malformed responses', async () => {
      // Mock a malformed response
      const mockCallAI = jest.spyOn(revisionExecutive as any, 'callAI')
        .mockResolvedValue({
          raw: 'Invalid JSON response',
          parsed: null,
          success: false,
          error: 'JSON parse error'
        });

      const suggestions = await revisionExecutive.generateSuggestions(testError, testContext);

      // Should return fallback suggestion
      expect(suggestions).toHaveLength(1);
      expect(suggestions[0].modification).toContain('Review and fix');
      expect(suggestions[0].confidence).toBeLessThan(0.5);
    });

    test('should validate fix confidence scores', async () => {
      const mockResponse = {
        raw: JSON.stringify([{
          modification: 'Test fix',
          rationale: 'Test rationale',
          impact: 'Test impact'
        }]),
        parsed: [{
          modification: 'Test fix',
          rationale: 'Test rationale',
          impact: 'Test impact'
        }],
        success: true
      };

      const mockCallAI = jest.spyOn(revisionExecutive as any, 'callAI')
        .mockResolvedValue(mockResponse);

      const suggestions = await revisionExecutive.generateSuggestions(testError, testContext);

      expect(suggestions).toHaveLength(1);
      expect(suggestions[0].confidence).toBeGreaterThanOrEqual(0);
      expect(suggestions[0].confidence).toBeLessThanOrEqual(1);
    });

    test('should reject invalid fix formats', async () => {
      const mockResponse = {
        raw: JSON.stringify({ notAnArray: true }),
        parsed: { notAnArray: true },
        success: true
      };

      const mockCallAI = jest.spyOn(revisionExecutive as any, 'callAI')
        .mockResolvedValue(mockResponse);

      const suggestions = await revisionExecutive.generateSuggestions(testError, testContext);

      // Should return fallback when format is invalid
      expect(suggestions).toHaveLength(1);
      expect(suggestions[0].rationale).toBe('Manual review required');
    });
  });

  describe('Error Messages', () => {
    test('should return correct error message for timeout', () => {
      const error = new Error('Request timeout after 30000ms');
      const message = getErrorMessage(error);
      expect(message).toBe('修复请求超时，正在重试...');
    });

    test('should return correct error message for API error', () => {
      const error = new Error('API connection failed');
      const message = getErrorMessage(error);
      expect(message).toBe('AI服务暂时不可用，请稍后再试');
    });

    test('should return correct error message for rate limit', () => {
      const error = new Error('Error 429: Too many requests');
      const message = getErrorMessage(error);
      expect(message).toBe('请求过于频繁，请稍后再试');
    });

    test('should return generic message for unknown errors', () => {
      const error = new Error('Some unknown error');
      const message = getErrorMessage(error);
      expect(message).toBe('发生未知错误，请刷新页面后重试');
    });
  });

  describe('generateFix Method', () => {
    test('should provide backward compatibility', async () => {
      const mockCallAI = jest.spyOn(revisionExecutive as any, 'callAI')
        .mockResolvedValue({
          raw: JSON.stringify([{
            modification: 'Fixed content',
            rationale: 'This fixes the issue',
            impact: 'Resolved'
          }]),
          parsed: [{
            modification: 'Fixed content',
            rationale: 'This fixes the issue',
            impact: 'Resolved'
          }],
          success: true
        });

      const fix = await revisionExecutive.generateFix(testError, testContext);

      expect(fix).not.toBeNull();
      expect(fix?.modification).toBe('Fixed content');
      expect(fix?.rationale).toBe('This fixes the issue');
    });

    test('should handle null context', async () => {
      const fix = await revisionExecutive.generateFix(testError);

      expect(fix).not.toBeNull();
      // Should work even without context
      expect(fix?.modification).toBeDefined();
    });

    test('should return null when no suggestions generated', async () => {
      const mockGenerateSuggestions = jest.spyOn(revisionExecutive, 'generateSuggestions')
        .mockResolvedValue([]);

      const fix = await revisionExecutive.generateFix(testError, testContext);

      expect(fix).toBeNull();
    });
  });
});