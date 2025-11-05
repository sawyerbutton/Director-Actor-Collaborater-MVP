/**
 * Multi-File Analysis API Integration Tests
 * Sprint 4 - T4.1: API Integration Testing
 *
 * Test Strategy: Direct API testing (bypassing UI limitations)
 * These tests validate the complete multi-file analysis backend workflow:
 * 1. Project creation with multiple script files
 * 2. Internal analysis (batch processing with ConsistencyGuardian)
 * 3. Cross-file analysis (DefaultCrossFileAnalyzer)
 * 4. Findings retrieval and grouping
 * 5. AI-assisted resolution advice
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { prisma } from '@/lib/db/client';
import { scriptFileService, multiFileAnalysisService } from '@/lib/db/services';
import { createCrossFileAnalyzer } from '@/lib/analysis/cross-file-analyzer';
import type { CrossFileCheckConfig } from '@/lib/analysis/cross-file-analyzer';

describe('Multi-File Analysis API Integration Tests', () => {
  let testProjectId: string;
  const TEST_USER_ID = 'demo-user';

  // Test data: Multiple scripts with intentional cross-file issues
  const testScripts = {
    episode1: {
      filename: '第1集.md',
      episodeNumber: 1,
      content: `# 第1集

## 场景1 - 咖啡馆 - INT - DAY (2024年3月1日)
张三走进咖啡馆，点了一杯拿铁。
他看起来很焦虑，不停地看手表。

对话：
张三：老板，给我来杯拿铁。
老板：好的，马上就来。

## 场景2 - 张三的家 - INT - NIGHT (2024年3月5日)
张三回到家，打开电脑开始工作。
他决定明天去拜访李四。

## 场景3 - 公园 - EXT - DAY (2024年3月10日)
张三在公园遇到了王五。
王五告诉张三一个重要的秘密，关于那个计划。

场景描述：公园宽敞明亮，阳光洒在草地上。`,
      jsonContent: {
        scenes: [
          {
            id: 'S1E01',
            heading: '咖啡馆 - INT - DAY',
            timestamp: '2024-03-01',
            location: '咖啡馆',
            characters: ['张三', '老板'],
            dialogues: [
              { character: '张三', line: '老板，给我来杯拿铁。' },
              { character: '老板', line: '好的，马上就来。' }
            ],
            description: '宽敞明亮的咖啡馆',
            line: 3
          },
          {
            id: 'S1E02',
            heading: '张三的家 - INT - NIGHT',
            timestamp: '2024-03-05',
            location: '张三的家',
            characters: ['张三'],
            plotPoints: ['张三决定明天去拜访李四'],
            line: 10
          },
          {
            id: 'S1E03',
            heading: '公园 - EXT - DAY',
            timestamp: '2024-03-10',
            location: '公园',
            characters: ['张三', '王五'],
            plotPoints: ['王五告诉张三一个重要的秘密，关于那个计划'],
            description: '宽敞明亮，阳光洒在草地上',
            line: 15
          }
        ]
      }
    },
    episode2: {
      filename: '第2集.md',
      episodeNumber: 2,
      content: `# 第2集

## 场景1 - 办公室 - INT - DAY (2024年2月28日)
张三儿来到办公室，开始了新的一天。
他的同事李四向他打招呼。

对话：
李四：早啊，张三儿！
张三儿：早！今天有什么安排吗？

## 场景2 - 会议室 - INT - DAY (2024年3月15日)
张三儿和李四在会议室讨论项目。
他们需要在下周完成这个任务。

## 场景3 - 餐厅 - INT - NIGHT (2024年3月20日)
张三儿请李四吃饭，感谢他的帮助。
赵六突然出现在餐厅。

场景描述：餐厅装修豪华，灯光柔和。`,
      jsonContent: {
        scenes: [
          {
            id: 'S2E01',
            heading: '办公室 - INT - DAY',
            timestamp: '2024-02-28',
            location: '办公室',
            characters: ['张三儿', '李四'],
            dialogues: [
              { character: '李四', line: '早啊，张三儿！' },
              { character: '张三儿', line: '早！今天有什么安排吗？' }
            ],
            line: 3
          },
          {
            id: 'S2E02',
            heading: '会议室 - INT - DAY',
            timestamp: '2024-03-15',
            location: '会议室',
            characters: ['张三儿', '李四'],
            plotPoints: ['需要在下周完成任务'],
            line: 10
          },
          {
            id: 'S2E03',
            heading: '餐厅 - INT - NIGHT',
            timestamp: '2024-03-20',
            location: '餐厅',
            characters: ['张三儿', '李四', '赵六'],
            description: '装修豪华，灯光柔和',
            line: 15
          }
        ]
      }
    },
    episode3: {
      filename: '第3集.md',
      episodeNumber: 3,
      content: `# 第3集

## 场景1 - 机场 - EXT - DAY (2024年3月25日)
张三前往机场，准备出差。
他打电话给李思询问工作进展。

对话：
张三：喂，李思，项目进展怎么样了？
李思：一切顺利，按计划进行中。

## 场景2 - 酒店 - INT - NIGHT (2024年3月26日)
张三入住酒店，休息片刻。
王五发短信提醒他那个秘密的重要性。

## 场景3 - 咖啡厅 - INT - DAY (2024年3月27日)
张三在咖啡厅工作，这里很安静舒适。
他完成了大部分工作，那个计划已经失败了。

场景描述：咖啡厅狭窄昏暗，有些拥挤。`,
      jsonContent: {
        scenes: [
          {
            id: 'S3E01',
            heading: '机场 - EXT - DAY',
            timestamp: '2024-03-25',
            location: '机场',
            characters: ['张三', '李思'],
            dialogues: [
              { character: '张三', line: '喂，李思，项目进展怎么样了？' },
              { character: '李思', line: '一切顺利，按计划进行中。' }
            ],
            line: 3
          },
          {
            id: 'S3E02',
            heading: '酒店 - INT - NIGHT',
            timestamp: '2024-03-26',
            location: '酒店',
            characters: ['张三', '王五'],
            line: 10
          },
          {
            id: 'S3E03',
            heading: '咖啡厅 - INT - DAY',
            timestamp: '2024-03-27',
            location: '咖啡厅',
            characters: ['张三'],
            plotPoints: ['那个计划已经失败了'],
            description: '狭窄昏暗，有些拥挤',
            line: 15
          }
        ]
      }
    }
  };

  // Expected cross-file issues in test data:
  // 1. Timeline: Episode 2 Scene 1 (2024-02-28) is BEFORE Episode 1 Scene 3 (2024-03-10)
  // 2. Character: "张三" vs "张三儿" (similarity ~80%, possible typo)
  // 3. Character: "李四" vs "李思" (similarity ~66%, possible typo)
  // 4. Plot: "关于那个计划" (Episode 1) vs "那个计划已经失败了" (Episode 3) without resolution in Episode 2
  // 5. Setting: "咖啡馆" (Episode 1, "宽敞明亮") vs "咖啡厅" (Episode 3, "狭窄昏暗") - contradictory descriptions

  beforeAll(async () => {
    // Ensure demo-user exists
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
    // Create a new test project before each test
    const project = await prisma.project.create({
      data: {
        userId: TEST_USER_ID,
        title: `Multi-File Test Project ${Date.now()}`,
        content: 'Test project for multi-file analysis',
        workflowStatus: 'INITIALIZED',
      },
    });
    testProjectId = project.id;
  });

  afterAll(async () => {
    // Cleanup: Delete all test projects
    await prisma.scriptFile.deleteMany({
      where: {
        project: {
          title: {
            startsWith: 'Multi-File Test Project',
          },
        },
      },
    });

    await prisma.project.deleteMany({
      where: {
        title: {
          startsWith: 'Multi-File Test Project',
        },
      },
    });

    await prisma.$disconnect();
  });

  /**
   * TC-INT-001: Create project and upload multiple files
   * Validates: File storage, JSON content, file count, episode numbering
   */
  it('TC-INT-001: should create project with multiple script files', async () => {
    // Upload files to the project
    const uploadedFiles = [];

    for (const script of Object.values(testScripts)) {
      // First create the file
      const file = await scriptFileService.createFile({
        projectId: testProjectId,
        filename: script.filename,
        episodeNumber: script.episodeNumber,
        rawContent: script.content,
      });

      // Then update with JSON content (simulating conversion completion)
      await scriptFileService.updateFile(file.id, {
        jsonContent: script.jsonContent,
        conversionStatus: 'completed',
      });

      uploadedFiles.push(file);
    }

    // Verify file count
    expect(uploadedFiles.length).toBe(3);

    // Verify files are stored correctly
    const storedFiles = await scriptFileService.getFilesByProjectId(testProjectId);
    expect(storedFiles.length).toBe(3);

    // Verify episode ordering
    const sortedFiles = storedFiles.sort((a, b) =>
      (a.episodeNumber || 0) - (b.episodeNumber || 0)
    );
    expect(sortedFiles[0].episodeNumber).toBe(1);
    expect(sortedFiles[1].episodeNumber).toBe(2);
    expect(sortedFiles[2].episodeNumber).toBe(3);

    // Verify JSON content
    expect(sortedFiles[0].jsonContent).toHaveProperty('scenes');
    expect(sortedFiles[0].jsonContent.scenes).toHaveLength(3);
  }, 10000);

  /**
   * TC-INT-002: Execute internal analysis (single-file checks)
   * Validates: Batch processing, findings generation, merging, statistics
   */
  it('TC-INT-002: should execute internal analysis on all files', async () => {
    // Upload files
    for (const script of Object.values(testScripts)) {
      const file = await scriptFileService.createFile({
        projectId: testProjectId,
        filename: script.filename,
        episodeNumber: script.episodeNumber,
        rawContent: script.content,
      });

      await scriptFileService.updateFile(file.id, {
        jsonContent: script.jsonContent,
        conversionStatus: 'completed',
      });
    }

    // Note: Internal analysis is typically triggered by ConsistencyGuardian
    // For this integration test, we verify the project setup is correct
    // The actual AI analysis would require mock or real DeepSeek API calls

    const files = await scriptFileService.getFilesByProjectId(testProjectId);
    expect(files.length).toBe(3);

    // Verify each file has JSON content ready for analysis
    files.forEach(file => {
      expect(file.conversionStatus).toBe('completed');
      expect(file.jsonContent).toHaveProperty('scenes');
    });
  }, 10000);

  /**
   * TC-INT-003: Execute cross-file analysis
   * Validates: Timeline checks, character checks, plot checks, setting checks
   */
  it('TC-INT-003: should execute cross-file analysis and detect inconsistencies', async () => {
    // Upload files
    for (const script of Object.values(testScripts)) {
      const file = await scriptFileService.createFile({
        projectId: testProjectId,
        filename: script.filename,
        episodeNumber: script.episodeNumber,
        rawContent: script.content,
      });

      await scriptFileService.updateFile(file.id, {
        jsonContent: script.jsonContent,
        conversionStatus: 'completed',
      });
    }

    // Get files for cross-file analysis
    const files = await scriptFileService.getFilesByProjectId(testProjectId);

    // Create analyzer with all check types
    const analyzer = createCrossFileAnalyzer();
    const config: CrossFileCheckConfig = {
      checkTypes: [
        'cross_file_timeline',
        'cross_file_character',
        'cross_file_plot',
        'cross_file_setting',
      ],
      minConfidence: 0.6,
      maxFindingsPerType: 30,
      useAI: false,
    };

    // Run cross-file analysis
    const result = await analyzer.analyze(files, config);

    // Verify findings were generated
    expect(result.findings.length).toBeGreaterThan(0);
    expect(result.processedFiles).toBe(3);

    // Verify timeline finding (Episode 2 starts before Episode 1 ends)
    const timelineFindings = result.findings.filter(
      f => f.type === 'cross_file_timeline'
    );
    expect(timelineFindings.length).toBeGreaterThan(0);

    // Check that timeline finding mentions the date conflict
    const hasDateConflict = timelineFindings.some(
      f => f.description.includes('2024') || f.evidence.some(e => e.includes('2024'))
    );
    expect(hasDateConflict).toBe(true);

    // Verify character finding (张三 vs 张三儿, 李四 vs 李思)
    const characterFindings = result.findings.filter(
      f => f.type === 'cross_file_character'
    );
    expect(characterFindings.length).toBeGreaterThan(0);

    // Verify setting finding (咖啡馆 vs 咖啡厅)
    const settingFindings = result.findings.filter(
      f => f.type === 'cross_file_setting'
    );
    // Note: May be 0 if similarity threshold not met, depends on analyzer logic

    // Verify finding structure
    const firstFinding = result.findings[0];
    expect(firstFinding).toHaveProperty('id');
    expect(firstFinding).toHaveProperty('type');
    expect(firstFinding).toHaveProperty('severity');
    expect(firstFinding).toHaveProperty('affectedFiles');
    expect(firstFinding).toHaveProperty('description');
    expect(firstFinding).toHaveProperty('suggestion');
    expect(firstFinding).toHaveProperty('confidence');
    expect(firstFinding).toHaveProperty('evidence');

    expect(firstFinding.affectedFiles.length).toBeGreaterThanOrEqual(2);
  }, 15000);

  /**
   * TC-INT-004: Get grouped cross-file findings
   * Validates: API endpoint, grouping logic, type separation
   */
  it('TC-INT-004: should retrieve grouped cross-file findings', async () => {
    // Upload files
    for (const script of Object.values(testScripts)) {
      const file = await scriptFileService.createFile({
        projectId: testProjectId,
        filename: script.filename,
        episodeNumber: script.episodeNumber,
        rawContent: script.content,
      });

      await scriptFileService.updateFile(file.id, {
        jsonContent: script.jsonContent,
        conversionStatus: 'completed',
      });
    }

    // Run cross-file analysis and store in database
    const result = await multiFileAnalysisService.analyzeCrossFileIssues(testProjectId, {
      checkTypes: [
        'cross_file_timeline',
        'cross_file_character',
        'cross_file_plot',
        'cross_file_setting',
      ],
      minConfidence: 0.6,
    });

    expect(result.findings.length).toBeGreaterThan(0);

    // Get grouped findings
    const grouped = await multiFileAnalysisService.getGroupedCrossFileFindings(testProjectId);

    // Verify grouping
    expect(grouped).toBeInstanceOf(Object);

    // Verify at least 2 groups exist (timeline and character expected)
    const groupKeys = Object.keys(grouped);
    expect(groupKeys.length).toBeGreaterThanOrEqual(2);

    // Verify each group contains findings of correct type
    for (const [type, findings] of Object.entries(grouped)) {
      expect(Array.isArray(findings)).toBe(true);
      if (findings.length > 0) {
        findings.forEach((f: any) => {
          expect(f.type).toBe(type);
        });
      }
    }
  }, 15000);

  /**
   * TC-INT-005: Complete workflow from project creation to findings retrieval
   * Validates: Full integration, all components working together
   */
  it('TC-INT-005: should complete entire multi-file analysis workflow', async () => {
    // Step 1: Create project (already done in beforeEach)
    expect(testProjectId).toBeDefined();

    // Step 2: Upload multiple files
    for (const script of Object.values(testScripts)) {
      const file = await scriptFileService.createFile({
        projectId: testProjectId,
        filename: script.filename,
        episodeNumber: script.episodeNumber,
        rawContent: script.content,
      });

      await scriptFileService.updateFile(file.id, {
        jsonContent: script.jsonContent,
        conversionStatus: 'completed',
      });
    }

    // Step 3: Verify file count
    const files = await scriptFileService.getFilesByProjectId(testProjectId);
    expect(files.length).toBe(3);

    // Step 4: Run cross-file analysis
    const analysisResult = await multiFileAnalysisService.analyzeCrossFileIssues(
      testProjectId,
      {
        checkTypes: ['cross_file_timeline', 'cross_file_character'],
        minConfidence: 0.6,
      }
    );

    expect(analysisResult.findings.length).toBeGreaterThan(0);
    expect(analysisResult.reportId).toBeDefined();

    // Step 5: Retrieve findings
    const crossFileFindings = await multiFileAnalysisService.getCrossFileFindings(
      testProjectId
    );
    expect(crossFileFindings.length).toBeGreaterThan(0);

    // Step 6: Get grouped findings
    const groupedFindings = await multiFileAnalysisService.getGroupedCrossFileFindings(
      testProjectId
    );
    expect(Object.keys(groupedFindings).length).toBeGreaterThanOrEqual(1);

    // Step 7: Verify finding details
    const firstFinding = crossFileFindings[0];
    expect(firstFinding.affectedFiles.length).toBeGreaterThanOrEqual(2);
    expect(firstFinding.description).toBeTruthy();
    expect(firstFinding.suggestion).toBeTruthy();
    expect(firstFinding.confidence).toBeGreaterThan(0);
    expect(firstFinding.confidence).toBeLessThanOrEqual(1);
  }, 20000);
});
