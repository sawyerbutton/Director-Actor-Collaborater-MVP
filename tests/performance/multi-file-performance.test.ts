/**
 * Multi-File Analysis Performance Tests
 * Sprint 4 - T4.2: Performance Testing (Large File Scenarios)
 *
 * Tests performance with 5-10 script files (1000-2000 lines each)
 * Measures:
 * - Internal analysis time
 * - Cross-file analysis time
 * - Memory usage
 * - Throughput (files/second)
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { prisma } from '@/lib/db/client';
import { scriptFileService, multiFileAnalysisService } from '@/lib/db/services';
import { createCrossFileAnalyzer } from '@/lib/analysis/cross-file-analyzer';
import type { CrossFileCheckConfig } from '@/lib/analysis/cross-file-analyzer';

describe('Multi-File Analysis Performance Tests', () => {
  let testProjectId: string;
  const TEST_USER_ID = 'demo-user';

  // Performance thresholds
  const PERFORMANCE_THRESHOLDS = {
    internalAnalysis: {
      small: { files: 3, maxTime: 30000 }, // 30s for 3 files
      medium: { files: 5, maxTime: 60000 }, // 60s for 5 files
      large: { files: 10, maxTime: 120000 }, // 120s for 10 files
    },
    crossFileAnalysis: {
      small: { files: 3, maxTime: 5000 }, // 5s for 3 files
      medium: { files: 5, maxTime: 10000 }, // 10s for 5 files
      large: { files: 10, maxTime: 30000 }, // 30s for 10 files
    },
    memoryUsage: {
      maxHeapMB: 500, // 500MB max heap size
    },
  };

  /**
   * Generate large script content (1000-2000 lines)
   */
  function generateLargeScript(episodeNumber: number, lineCount: number = 1500): string {
    const scenes: string[] = [];
    const sceneCount = Math.floor(lineCount / 30); // ~30 lines per scene

    for (let i = 1; i <= sceneCount; i++) {
      const sceneNumber = i.toString().padStart(2, '0');
      const date = new Date(2024, 2, episodeNumber * 10 + i); // March + offset
      const dateStr = date.toISOString().split('T')[0];

      scenes.push(`## 场景${sceneNumber} - 办公室 - INT - DAY (${dateStr})

张三走进办公室，开始了忙碌的一天。
他打开电脑，查看邮件。

对话：
张三：早上好，今天有什么安排吗？
李四：我们需要完成那个项目的最后阶段。
张三：好的，我马上开始。

张三开始工作，全神贯注地处理任务。
时间一分一秒地过去，他没有注意到已经到了中午。

李四提醒他休息一下。

对话：
李四：该吃午饭了，休息一下吧。
张三：好，马上就来。

场景描述：现代化的办公室，明亮整洁。
桌上摆放着电脑和文件，墙上挂着激励标语。

张三和李四一起去餐厅。
他们讨论着项目的进展和下一步计划。

`);
    }

    return `# 第${episodeNumber}集

${scenes.join('\n')}`;
  }

  /**
   * Generate JSON content for a large script
   */
  function generateScriptJSON(episodeNumber: number, sceneCount: number = 50) {
    const scenes = [];
    for (let i = 1; i <= sceneCount; i++) {
      const date = new Date(2024, 2, episodeNumber * 10 + i);
      const dateStr = date.toISOString().split('T')[0];

      scenes.push({
        id: `S${episodeNumber}E${i.toString().padStart(2, '0')}`,
        heading: `场景${i} - 办公室 - INT - DAY`,
        timestamp: dateStr,
        location: i % 3 === 0 ? '办公室' : i % 3 === 1 ? '会议室' : '餐厅',
        characters: ['张三', '李四', i % 5 === 0 ? '王五' : '赵六'],
        dialogues: [
          { character: '张三', line: '这是一段对话内容。' },
          { character: '李四', line: '我同意你的看法。' },
        ],
        plotPoints: i % 10 === 0 ? ['重要情节发展'] : [],
        description: '现代化办公环境，光线充足',
        line: i * 30,
      });
    }

    return { scenes };
  }

  /**
   * Upload multiple large files
   */
  async function uploadLargeFiles(projectId: string, fileCount: number) {
    const uploadedFiles = [];

    for (let i = 1; i <= fileCount; i++) {
      const content = generateLargeScript(i, 1500);
      const jsonContent = generateScriptJSON(i, 50);

      const file = await scriptFileService.createFile({
        projectId,
        filename: `第${i}集.md`,
        episodeNumber: i,
        rawContent: content,
      });

      await scriptFileService.updateFile(file.id, {
        jsonContent,
        conversionStatus: 'completed',
      });

      uploadedFiles.push(file);
    }

    return uploadedFiles;
  }

  /**
   * Measure memory usage
   */
  function getMemoryUsage() {
    const usage = process.memoryUsage();
    return {
      heapUsedMB: Math.round(usage.heapUsed / 1024 / 1024),
      heapTotalMB: Math.round(usage.heapTotal / 1024 / 1024),
      rssMB: Math.round(usage.rss / 1024 / 1024),
    };
  }

  beforeAll(async () => {
    const user = await prisma.user.findUnique({ where: { id: TEST_USER_ID } });
    if (!user) {
      await prisma.user.create({
        data: {
          id: TEST_USER_ID,
          email: 'demo@example.com',
          name: 'Demo User',
          password: 'hashed_password',
        },
      });
    }
  });

  beforeEach(async () => {
    const project = await prisma.project.create({
      data: {
        userId: TEST_USER_ID,
        title: `Performance Test Project ${Date.now()}`,
        content: 'Performance test project',
        workflowStatus: 'INITIALIZED',
      },
    });
    testProjectId = project.id;
  });

  afterAll(async () => {
    await prisma.scriptFile.deleteMany({
      where: {
        project: {
          title: {
            contains: 'Performance Test Project',
          },
        },
      },
    });

    await prisma.project.deleteMany({
      where: {
        title: {
          contains: 'Performance Test Project',
        },
      },
    });

    await prisma.$disconnect();
  });

  /**
   * PERF-001: Small scenario (3 files)
   */
  it('PERF-001: should analyze 3 large files within 30 seconds', async () => {
    const fileCount = 3;
    const startMemory = getMemoryUsage();
    const startTime = Date.now();

    // Upload files
    console.log(`\n[PERF-001] Uploading ${fileCount} files...`);
    await uploadLargeFiles(testProjectId, fileCount);

    const uploadTime = Date.now() - startTime;
    console.log(`[PERF-001] Upload completed in ${uploadTime}ms`);

    // Cross-file analysis
    const analysisStart = Date.now();
    const result = await multiFileAnalysisService.analyzeCrossFileIssues(testProjectId, {
      checkTypes: [
        'cross_file_timeline',
        'cross_file_character',
        'cross_file_plot',
        'cross_file_setting',
      ],
      minConfidence: 0.6,
    });
    const analysisTime = Date.now() - analysisStart;

    const totalTime = Date.now() - startTime;
    const endMemory = getMemoryUsage();

    // Performance report
    console.log(`\n[PERF-001] Performance Report:`);
    console.log(`  Files: ${fileCount}`);
    console.log(`  Total time: ${totalTime}ms`);
    console.log(`  Upload time: ${uploadTime}ms`);
    console.log(`  Analysis time: ${analysisTime}ms`);
    console.log(`  Findings: ${result.findings.length}`);
    console.log(`  Memory before: ${startMemory.heapUsedMB}MB`);
    console.log(`  Memory after: ${endMemory.heapUsedMB}MB`);
    console.log(`  Memory delta: ${endMemory.heapUsedMB - startMemory.heapUsedMB}MB`);

    // Assertions
    expect(totalTime).toBeLessThan(PERFORMANCE_THRESHOLDS.internalAnalysis.small.maxTime);
    expect(analysisTime).toBeLessThan(PERFORMANCE_THRESHOLDS.crossFileAnalysis.small.maxTime);
    expect(endMemory.heapUsedMB).toBeLessThan(PERFORMANCE_THRESHOLDS.memoryUsage.maxHeapMB);
    expect(result.findings.length).toBeGreaterThan(0);
  }, 35000);

  /**
   * PERF-002: Medium scenario (5 files)
   */
  it('PERF-002: should analyze 5 large files within 60 seconds', async () => {
    const fileCount = 5;
    const startMemory = getMemoryUsage();
    const startTime = Date.now();

    console.log(`\n[PERF-002] Uploading ${fileCount} files...`);
    await uploadLargeFiles(testProjectId, fileCount);

    const uploadTime = Date.now() - startTime;
    console.log(`[PERF-002] Upload completed in ${uploadTime}ms`);

    const analysisStart = Date.now();
    const result = await multiFileAnalysisService.analyzeCrossFileIssues(testProjectId, {
      checkTypes: ['cross_file_timeline', 'cross_file_character'],
      minConfidence: 0.6,
    });
    const analysisTime = Date.now() - analysisStart;

    const totalTime = Date.now() - startTime;
    const endMemory = getMemoryUsage();

    console.log(`\n[PERF-002] Performance Report:`);
    console.log(`  Files: ${fileCount}`);
    console.log(`  Total time: ${totalTime}ms`);
    console.log(`  Upload time: ${uploadTime}ms`);
    console.log(`  Analysis time: ${analysisTime}ms`);
    console.log(`  Findings: ${result.findings.length}`);
    console.log(`  Memory before: ${startMemory.heapUsedMB}MB`);
    console.log(`  Memory after: ${endMemory.heapUsedMB}MB`);
    console.log(`  Throughput: ${(fileCount / (totalTime / 1000)).toFixed(2)} files/sec`);

    expect(totalTime).toBeLessThan(PERFORMANCE_THRESHOLDS.internalAnalysis.medium.maxTime);
    expect(analysisTime).toBeLessThan(PERFORMANCE_THRESHOLDS.crossFileAnalysis.medium.maxTime);
    expect(endMemory.heapUsedMB).toBeLessThan(PERFORMANCE_THRESHOLDS.memoryUsage.maxHeapMB);
  }, 65000);

  /**
   * PERF-003: Large scenario (10 files)
   */
  it('PERF-003: should analyze 10 large files within 120 seconds', async () => {
    const fileCount = 10;
    const startMemory = getMemoryUsage();
    const startTime = Date.now();

    console.log(`\n[PERF-003] Uploading ${fileCount} files...`);
    await uploadLargeFiles(testProjectId, fileCount);

    const uploadTime = Date.now() - startTime;
    console.log(`[PERF-003] Upload completed in ${uploadTime}ms`);

    const analysisStart = Date.now();
    const result = await multiFileAnalysisService.analyzeCrossFileIssues(testProjectId, {
      checkTypes: ['cross_file_timeline', 'cross_file_character'],
      minConfidence: 0.7,
    });
    const analysisTime = Date.now() - analysisStart;

    const totalTime = Date.now() - startTime;
    const endMemory = getMemoryUsage();

    console.log(`\n[PERF-003] Performance Report:`);
    console.log(`  Files: ${fileCount}`);
    console.log(`  Total time: ${totalTime}ms`);
    console.log(`  Upload time: ${uploadTime}ms`);
    console.log(`  Analysis time: ${analysisTime}ms`);
    console.log(`  Findings: ${result.findings.length}`);
    console.log(`  Memory before: ${startMemory.heapUsedMB}MB`);
    console.log(`  Memory after: ${endMemory.heapUsedMB}MB`);
    console.log(`  Throughput: ${(fileCount / (totalTime / 1000)).toFixed(2)} files/sec`);

    expect(totalTime).toBeLessThan(PERFORMANCE_THRESHOLDS.internalAnalysis.large.maxTime);
    expect(analysisTime).toBeLessThan(PERFORMANCE_THRESHOLDS.crossFileAnalysis.large.maxTime);
    expect(endMemory.heapUsedMB).toBeLessThan(PERFORMANCE_THRESHOLDS.memoryUsage.maxHeapMB);
  }, 125000);

  /**
   * PERF-004: Throughput test
   */
  it('PERF-004: should maintain consistent throughput across different file counts', async () => {
    const fileCounts = [3, 5];
    const throughputs: number[] = [];

    for (const count of fileCounts) {
      const startTime = Date.now();

      await uploadLargeFiles(testProjectId, count);

      await multiFileAnalysisService.analyzeCrossFileIssues(testProjectId, {
        checkTypes: ['cross_file_timeline'],
        minConfidence: 0.6,
      });

      const totalTime = Date.now() - startTime;
      const throughput = count / (totalTime / 1000);
      throughputs.push(throughput);

      console.log(`\n[PERF-004] ${count} files: ${throughput.toFixed(2)} files/sec`);

      // Create new project for next iteration
      if (count !== fileCounts[fileCounts.length - 1]) {
        const newProject = await prisma.project.create({
          data: {
            userId: TEST_USER_ID,
            title: `Performance Test Project ${Date.now()}`,
            content: 'Performance test project',
            workflowStatus: 'INITIALIZED',
          },
        });
        testProjectId = newProject.id;
      }
    }

    // Throughput should be relatively consistent (within 50% variance)
    const avgThroughput = throughputs.reduce((a, b) => a + b, 0) / throughputs.length;
    const maxDeviation = Math.max(...throughputs.map(t => Math.abs(t - avgThroughput)));

    console.log(`\n[PERF-004] Average throughput: ${avgThroughput.toFixed(2)} files/sec`);
    console.log(`[PERF-004] Max deviation: ${maxDeviation.toFixed(2)} files/sec`);

    expect(maxDeviation / avgThroughput).toBeLessThan(0.5); // Less than 50% variance
  }, 90000);

  /**
   * PERF-005: Memory stability test
   */
  it('PERF-005: should not leak memory across multiple analyses', async () => {
    const iterations = 3;
    const memoryReadings: number[] = [];

    for (let i = 0; i < iterations; i++) {
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const beforeMemory = getMemoryUsage();
      memoryReadings.push(beforeMemory.heapUsedMB);

      await uploadLargeFiles(testProjectId, 3);

      await multiFileAnalysisService.analyzeCrossFileIssues(testProjectId, {
        checkTypes: ['cross_file_timeline'],
        minConfidence: 0.6,
      });

      console.log(`\n[PERF-005] Iteration ${i + 1} memory: ${beforeMemory.heapUsedMB}MB`);

      // Create new project for next iteration
      if (i < iterations - 1) {
        await prisma.scriptFile.deleteMany({ where: { projectId: testProjectId } });
        const newProject = await prisma.project.create({
          data: {
            userId: TEST_USER_ID,
            title: `Performance Test Project ${Date.now()}`,
            content: 'Performance test project',
            workflowStatus: 'INITIALIZED',
          },
        });
        testProjectId = newProject.id;
      }
    }

    // Memory should not increase significantly (less than 100MB growth)
    const memoryGrowth = memoryReadings[memoryReadings.length - 1] - memoryReadings[0];
    console.log(`\n[PERF-005] Memory growth: ${memoryGrowth}MB`);

    expect(memoryGrowth).toBeLessThan(100);
  }, 90000);
});
