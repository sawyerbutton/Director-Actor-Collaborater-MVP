/**
 * Performance tests for Repair Load
 * Epic-001 Story 3: Performance verification
 */

import { describe, test, expect, beforeAll } from '@jest/globals';
import { RevisionExecutive } from '../../lib/agents/revision-executive';
import { LogicError } from '../../types/analysis';
import { RevisionContext } from '../../types/revision';

describe('Repair Performance', () => {
  let revisionExecutive: RevisionExecutive;

  beforeAll(() => {
    revisionExecutive = new RevisionExecutive({
      maxSuggestionsPerError: 3,
      enableContextAnalysis: true,
      retryConfig: {
        maxAttempts: 3,
        backoffMs: [1000, 2000, 4000],
        timeout: 30000
      }
    });
  });

  test('should handle 10 concurrent repair requests', async () => {
    const errors: LogicError[] = Array.from({ length: 10 }, (_, i) => ({
      id: `perf_error_${i}`,
      type: 'character_consistency',
      severity: 'medium',
      location: { page: i + 1, line: 5, scene: 1 },
      description: `Test error ${i}`,
      suggestion: `Fix for error ${i}`,
      confidence: 0.8
    }));

    const context: RevisionContext = {
      scriptContent: 'Performance test script',
      previousEvents: [],
      affectedElements: []
    };

    const startTime = Date.now();

    // Execute repairs concurrently
    const repairPromises = errors.map(error =>
      revisionExecutive.generateFix(error, context)
    );

    const results = await Promise.allSettled(repairPromises);

    const endTime = Date.now();
    const totalTime = endTime - startTime;

    // Check success rate
    const successful = results.filter(r => r.status === 'fulfilled' && r.value !== null);
    const successRate = successful.length / results.length;

    console.log(`Performance Test Results:
      - Total requests: ${results.length}
      - Successful: ${successful.length}
      - Failed: ${results.length - successful.length}
      - Success rate: ${(successRate * 100).toFixed(2)}%
      - Total time: ${totalTime}ms
      - Average time per request: ${(totalTime / results.length).toFixed(2)}ms
    `);

    // Assertions
    expect(successRate).toBeGreaterThanOrEqual(0.8); // At least 80% success rate
    expect(totalTime).toBeLessThan(60000); // Complete within 60 seconds
  }, 60000);

  test('should complete repair within 5 seconds for standard script', async () => {
    const standardError: LogicError = {
      id: 'standard_error',
      type: 'timeline_consistency',
      severity: 'high',
      location: { page: 10, line: 50, scene: 5 },
      description: 'Standard timeline inconsistency in a 100-page script',
      suggestion: 'Adjust timeline to maintain continuity',
      confidence: 0.85,
      context: {
        before: 'Scene 4: 3:00 PM - Character at location A',
        error: 'Scene 5: 2:30 PM - Character at location B',
        after: 'Timeline conflict detected'
      }
    };

    const context: RevisionContext = {
      scriptContent: generateStandardScript(),
      previousEvents: [
        'Character arrived at location A at 2:45 PM',
        'Character had meeting at 3:00 PM'
      ],
      affectedElements: ['Character', 'Timeline', 'Location']
    };

    const startTime = Date.now();

    const fix = await revisionExecutive.generateFix(standardError, context);

    const endTime = Date.now();
    const processingTime = endTime - startTime;

    console.log(`Standard script repair completed in ${processingTime}ms`);

    // Assertions
    expect(fix).not.toBeNull();
    expect(processingTime).toBeLessThan(5000); // Must complete within 5 seconds
  });

  test('should not exceed memory limit during large script repair', async () => {
    // Generate a very large script context
    const largeContext: RevisionContext = {
      scriptContent: generateLargeScript(500), // 500 pages
      previousEvents: Array.from({ length: 100 }, (_, i) => `Event ${i}`),
      affectedElements: Array.from({ length: 50 }, (_, i) => `Element ${i}`)
    };

    const error: LogicError = {
      id: 'large_script_error',
      type: 'plot_consistency',
      severity: 'critical',
      location: { page: 250, line: 100, scene: 50 },
      description: 'Plot inconsistency in large script',
      suggestion: 'Resolve plot hole',
      confidence: 0.9
    };

    // Monitor memory usage
    const initialMemory = process.memoryUsage().heapUsed;

    const fix = await revisionExecutive.generateFix(error, largeContext);

    const finalMemory = process.memoryUsage().heapUsed;
    const memoryIncrease = (finalMemory - initialMemory) / 1024 / 1024; // Convert to MB

    console.log(`Memory usage for large script: ${memoryIncrease.toFixed(2)} MB`);

    // Assertions
    expect(fix).not.toBeNull();
    expect(memoryIncrease).toBeLessThan(200); // Should not use more than 200MB
  });

  test('should maintain performance under stress', async () => {
    const stressTestDuration = 10000; // 10 seconds
    const startTime = Date.now();
    let requestCount = 0;
    let successCount = 0;
    let totalResponseTime = 0;

    const testError: LogicError = {
      id: 'stress_test_error',
      type: 'dialogue_consistency',
      severity: 'medium',
      location: { page: 5, line: 25, scene: 3 },
      description: 'Dialogue test error',
      suggestion: 'Fix dialogue',
      confidence: 0.75
    };

    const context: RevisionContext = {
      scriptContent: 'Stress test script',
      previousEvents: [],
      affectedElements: []
    };

    // Run continuous requests for the duration
    while (Date.now() - startTime < stressTestDuration) {
      const reqStartTime = Date.now();
      requestCount++;

      try {
        const fix = await revisionExecutive.generateFix(testError, context);
        if (fix) {
          successCount++;
          totalResponseTime += (Date.now() - reqStartTime);
        }
      } catch (error) {
        // Count as failed request
      }

      // Small delay to prevent overwhelming the system
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    const averageResponseTime = totalResponseTime / successCount;
    const successRate = (successCount / requestCount) * 100;

    console.log(`Stress Test Results (10 seconds):
      - Total requests: ${requestCount}
      - Successful: ${successCount}
      - Success rate: ${successRate.toFixed(2)}%
      - Average response time: ${averageResponseTime.toFixed(2)}ms
      - Requests per second: ${(requestCount / 10).toFixed(2)}
    `);

    // Assertions
    expect(successRate).toBeGreaterThan(90); // Should maintain >90% success rate
    expect(averageResponseTime).toBeLessThan(2000); // Average response under 2 seconds
  });

  test('should handle edge cases efficiently', async () => {
    const edgeCases = [
      // Empty context
      { scriptContent: '', previousEvents: [], affectedElements: [] },
      // Very long error description
      {
        scriptContent: 'Test',
        error: { description: 'A'.repeat(10000) }
      },
      // Many affected elements
      {
        affectedElements: Array.from({ length: 1000 }, (_, i) => `Element${i}`)
      },
      // Special characters
      {
        scriptContent: '测试脚本 🎬 with special chars: <>&"\'\\n\\t'
      }
    ];

    const results = [];

    for (const edgeCase of edgeCases) {
      const error: LogicError = {
        id: 'edge_case_error',
        type: 'scene_consistency',
        severity: 'low',
        location: { page: 1, line: 1, scene: 1 },
        description: edgeCase.error?.description || 'Edge case error',
        suggestion: 'Handle edge case',
        confidence: 0.5
      };

      const context: RevisionContext = {
        scriptContent: edgeCase.scriptContent || 'Default',
        previousEvents: edgeCase.previousEvents || [],
        affectedElements: edgeCase.affectedElements || []
      };

      const startTime = Date.now();
      const fix = await revisionExecutive.generateFix(error, context);
      const processingTime = Date.now() - startTime;

      results.push({
        case: JSON.stringify(edgeCase).substring(0, 50),
        success: fix !== null,
        time: processingTime
      });
    }

    console.log('Edge Case Results:');
    results.forEach((r, i) => {
      console.log(`  Case ${i + 1}: ${r.success ? '✅' : '❌'} (${r.time}ms)`);
    });

    // All edge cases should be handled without crashing
    const allHandled = results.every(r => r.time < 5000); // Each should complete within 5 seconds
    expect(allHandled).toBe(true);
  });
});

// Helper functions
function generateStandardScript(): string {
  let script = '';
  for (let i = 1; i <= 100; i++) {
    script += `
      场景 ${i} - 内景 - 地点 - 日
      角色A进入。

      角色A
      这是第${i}页的对话。

      角色B
      回应对话。

    `;
  }
  return script;
}

function generateLargeScript(pages: number): string {
  let script = '';
  for (let i = 1; i <= pages; i++) {
    script += `
      PAGE ${i}
      场景 ${i} - Location ${i}

      Character ${i % 10} enters the scene.

      CHARACTER ${i % 10}
      This is dialogue for page ${i}. It contains enough text to simulate
      a real script page with multiple paragraphs and dialogue exchanges.

      CHARACTER ${(i + 1) % 10}
      Response dialogue for interaction on page ${i}.

      [Action description and stage directions for scene ${i}]

    `;
  }
  return script;
}