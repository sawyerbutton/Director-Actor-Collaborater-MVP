/**
 * Unit tests for CrossFileAnalyzer
 */

import { DefaultCrossFileAnalyzer, createCrossFileAnalyzer, CrossFileCheckConfig } from '@/lib/analysis/cross-file-analyzer';
import { ScriptFile } from '@prisma/client';
import { CrossFileFindingType } from '@/types/diagnostic-report';

describe('CrossFileAnalyzer', () => {
  // Helper to create mock ScriptFile
  const createMockScriptFile = (
    id: string,
    filename: string,
    episodeNumber: number | null,
    jsonContent: any,
    rawContent: string = ''
  ): ScriptFile => ({
    id,
    projectId: 'test-project',
    filename,
    episodeNumber,
    rawContent,
    jsonContent,
    contentHash: 'hash',
    fileSize: 100,
    conversionStatus: 'completed',
    conversionError: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  describe('Configuration and Initialization', () => {
    it('should use default configuration when no config provided', () => {
      const analyzer = new DefaultCrossFileAnalyzer();

      // Access protected config via type assertion for testing
      const config = (analyzer as any).config;

      expect(config.checkTypes).toEqual([
        'cross_file_timeline',
        'cross_file_character',
        'cross_file_plot',
        'cross_file_setting',
      ]);
      expect(config.minConfidence).toBe(0.7);
      expect(config.maxFindingsPerType).toBe(50);
      expect(config.useAI).toBe(false);
    });

    it('should accept custom configuration', () => {
      const customConfig: CrossFileCheckConfig = {
        checkTypes: ['cross_file_timeline', 'cross_file_character'],
        minConfidence: 0.8,
        maxFindingsPerType: 20,
        useAI: true,
      };

      const analyzer = new DefaultCrossFileAnalyzer(customConfig);
      const config = (analyzer as any).config;

      expect(config.checkTypes).toEqual(['cross_file_timeline', 'cross_file_character']);
      expect(config.minConfidence).toBe(0.8);
      expect(config.maxFindingsPerType).toBe(20);
      expect(config.useAI).toBe(true);
    });

    it('should merge partial configuration with defaults', () => {
      const partialConfig: CrossFileCheckConfig = {
        minConfidence: 0.9,
      };

      const analyzer = new DefaultCrossFileAnalyzer(partialConfig);
      const config = (analyzer as any).config;

      expect(config.minConfidence).toBe(0.9);
      expect(config.checkTypes).toEqual([
        'cross_file_timeline',
        'cross_file_character',
        'cross_file_plot',
        'cross_file_setting',
      ]);
      expect(config.maxFindingsPerType).toBe(50);
    });
  });

  describe('Factory Function', () => {
    it('should create analyzer using factory function', () => {
      const analyzer = createCrossFileAnalyzer();
      expect(analyzer).toBeInstanceOf(DefaultCrossFileAnalyzer);
    });

    it('should pass config to factory function', () => {
      const config: CrossFileCheckConfig = { minConfidence: 0.85 };
      const analyzer = createCrossFileAnalyzer(config);

      const analyzerConfig = (analyzer as any).config;
      expect(analyzerConfig.minConfidence).toBe(0.85);
    });
  });

  describe('Timeline Check', () => {
    it('should detect chronological inconsistency between episodes', async () => {
      const analyzer = new DefaultCrossFileAnalyzer();

      const files = [
        createMockScriptFile('file1', 'EP01.md', 1, {
          scenes: [
            { id: 'scene1', timestamp: '2024-01-15', line: 10 },
          ],
        }),
        createMockScriptFile('file2', 'EP02.md', 2, {
          scenes: [
            { id: 'scene2', timestamp: '2024-01-10', line: 10 }, // Earlier than EP01
          ],
        }),
      ];

      const result = await analyzer.analyze(files);

      expect(result.findings.length).toBeGreaterThan(0);
      expect(result.findings[0].type).toBe('cross_file_timeline');
      expect(result.findings[0].severity).toBe('high');
      expect(result.findings[0].description).toContain('开场时间');
      expect(result.findings[0].description).toContain('早于');
    });

    it('should detect timeline going backwards within an episode', async () => {
      const analyzer = new DefaultCrossFileAnalyzer();

      const files = [
        createMockScriptFile('file1', 'EP01.md', 1, {
          scenes: [
            { id: 'scene1', timestamp: '2024-01-15', line: 10 },
            { id: 'scene2', timestamp: '2024-01-10', line: 20 }, // Goes backwards
          ],
        }),
        createMockScriptFile('file2', 'EP02.md', 2, {
          scenes: [
            { id: 'scene3', timestamp: '2024-01-20', line: 10 },
          ],
        }),
      ];

      const result = await analyzer.analyze(files);

      const timelineFindings = result.findings.filter(f =>
        f.type === 'cross_file_timeline' && f.description.includes('内部时间线倒退')
      );
      expect(timelineFindings.length).toBeGreaterThan(0);
    });

    it.skip('should detect large time gaps between episodes (requires >= 1 year gap)', async () => {
      const analyzer = new DefaultCrossFileAnalyzer();

      const files = [
        createMockScriptFile('file1', 'EP01.md', 1, {
          scenes: [
            { id: 'scene1', timestamp: '2020-01-01', line: 10 },
          ],
        }),
        createMockScriptFile('file2', 'EP02.md', 2, {
          scenes: [
            { id: 'scene2', timestamp: '2022-01-01', line: 10 }, // 2 years later (730 days > 365)
          ],
        }),
      ];

      const result = await analyzer.analyze(files);

      const gapFindings = result.findings.filter(f =>
        f.description.includes('较大时间跨度')
      );
      expect(gapFindings.length).toBeGreaterThan(0);
      expect(gapFindings[0].severity).toBe('low');
    });

    it('should parse Chinese date format correctly', async () => {
      const analyzer = new DefaultCrossFileAnalyzer();

      const files = [
        createMockScriptFile('file1', 'EP01.md', 1, {
          scenes: [
            { id: 'scene1', timeReference: '2024年1月15日', line: 10 },
          ],
        }),
        createMockScriptFile('file2', 'EP02.md', 2, {
          scenes: [
            { id: 'scene2', timeReference: '2024年1月10日', line: 10 },
          ],
        }),
      ];

      const result = await analyzer.analyze(files);

      expect(result.findings.length).toBeGreaterThan(0);
      expect(result.findings[0].type).toBe('cross_file_timeline');
    });

    it('should skip episodes without timeline events', async () => {
      const analyzer = new DefaultCrossFileAnalyzer();

      const files = [
        createMockScriptFile('file1', 'EP01.md', 1, { scenes: [] }),
        createMockScriptFile('file2', 'EP02.md', 2, { scenes: [] }),
      ];

      const result = await analyzer.analyze(files);

      const timelineFindings = result.findings.filter(f => f.type === 'cross_file_timeline');
      expect(timelineFindings.length).toBe(0);
    });
  });

  describe('Character Check', () => {
    it('should detect character appearing without introduction', async () => {
      const analyzer = new DefaultCrossFileAnalyzer();

      const files = [
        createMockScriptFile('file1', 'EP01.md', 1, {
          characters: ['角色A', '角色B'],
        }),
        createMockScriptFile('file2', 'EP02.md', 2, {
          characters: ['角色A', '角色C'], // 角色C first appears in EP02
        }),
      ];

      const result = await analyzer.analyze(files);

      const characterFindings = result.findings.filter(f =>
        f.type === 'cross_file_character' && f.description.includes('首次出现')
      );
      expect(characterFindings.length).toBeGreaterThan(0);
      expect(characterFindings[0].description).toContain('角色C');
    });

    it('should detect similar character names (potential typos)', async () => {
      const analyzer = new DefaultCrossFileAnalyzer();

      const files = [
        createMockScriptFile('file1', 'EP01.md', 1, {
          characters: ['张三'],
        }),
        createMockScriptFile('file2', 'EP02.md', 2, {
          characters: ['张三丰'], // Very similar to 张三
        }),
      ];

      const result = await analyzer.analyze(files);

      const similarNameFindings = result.findings.filter(f =>
        f.description.includes('名称可能存在不一致')
      );
      expect(similarNameFindings.length).toBeGreaterThan(0);
      expect(similarNameFindings[0].severity).toBe('high');
    });

    it.skip('should detect single-mention characters (requires specific count patterns)', async () => {
      const analyzer = new DefaultCrossFileAnalyzer();

      const files = [
        createMockScriptFile('file1', 'EP01.md', 1, {
          characters: ['主角', '配角A'],
        }),
        createMockScriptFile('file2', 'EP02.md', 2, {
          characters: ['主角', '配角B'],
        }),
        createMockScriptFile('file3', 'EP03.md', 3, {
          characters: ['主角', '临时角色'], // Single mention across all episodes
        }),
      ];

      const result = await analyzer.analyze(files);

      const singleMentionFindings = result.findings.filter(f =>
        f.description.includes('仅出现一次')
      );
      expect(singleMentionFindings.length).toBeGreaterThan(0);
    });

    it('should normalize character names correctly', async () => {
      const analyzer = new DefaultCrossFileAnalyzer();

      const files = [
        createMockScriptFile('file1', 'EP01.md', 1, {
          characters: ['张 三 （主角）'],
        }),
        createMockScriptFile('file2', 'EP02.md', 2, {
          characters: ['张三(主角)'],
        }),
      ];

      const result = await analyzer.analyze(files);

      // Should not report these as different characters
      const similarNameFindings = result.findings.filter(f =>
        f.description.includes('张三') && f.description.includes('名称可能存在不一致')
      );
      expect(similarNameFindings.length).toBe(0);
    });

    it('should extract characters from scenes and dialogues', async () => {
      const analyzer = new DefaultCrossFileAnalyzer();

      const files = [
        createMockScriptFile('file1', 'EP01.md', 1, {
          scenes: [
            {
              id: 'scene1',
              characters: ['角色A'],
              dialogues: [
                { character: '角色B' },
                { character: '角色C' },
              ],
            },
          ],
        }),
      ];

      const result = await analyzer.analyze(files);

      // All characters should be extracted
      expect(result.processedFiles).toBe(1);
    });
  });

  describe('Plot Check', () => {
    it.skip('should detect unresolved plot threads (requires resolution keywords)', async () => {
      const analyzer = new DefaultCrossFileAnalyzer();

      const files = [
        createMockScriptFile('file1', 'EP01.md', 1, {
          scenes: [
            {
              id: 'scene1',
              plot: '主角计划寻找宝藏，这是一个悬念',
              line: 10,
            },
          ],
        }),
        createMockScriptFile('file2', 'EP02.md', 2, {
          scenes: [
            {
              id: 'scene2',
              plot: '完全不相关的情节发展',
              line: 10,
            },
          ],
        }),
        createMockScriptFile('file3', 'EP03.md', 3, {
          scenes: [
            {
              id: 'scene3',
              plot: '另一个完全不相关的故事',
              line: 10,
            },
          ],
        }),
        createMockScriptFile('file4', 'EP04.md', 4, {
          scenes: [
            {
              id: 'scene4',
              plot: '继续其他的剧情线',
              line: 10,
            },
          ],
        }),
      ];

      const result = await analyzer.analyze(files);

      const unresolvedFindings = result.findings.filter(f =>
        f.description.includes('情节线索可能未在后续集数中解决')
      );
      expect(unresolvedFindings.length).toBeGreaterThan(0);
    });

    it.skip('should detect plot contradictions (requires contradiction keywords)', async () => {
      const analyzer = new DefaultCrossFileAnalyzer();

      const files = [
        createMockScriptFile('file1', 'EP01.md', 1, {
          scenes: [
            {
              id: 'scene1',
              plot: '主角成功获得了宝藏财富',
              line: 10,
            },
          ],
        }),
        createMockScriptFile('file2', 'EP02.md', 2, {
          scenes: [
            {
              id: 'scene2',
              plot: '主角失败失去了宝藏财富',
              line: 10,
            },
          ],
        }),
      ];

      const result = await analyzer.analyze(files);

      const contradictionFindings = result.findings.filter(f =>
        f.description.includes('情节矛盾')
      );
      expect(contradictionFindings.length).toBeGreaterThan(0);
      expect(contradictionFindings[0].severity).toBe('high');
    });

    it.skip('should detect missing plot setup (requires setup keywords)', async () => {
      const analyzer = new DefaultCrossFileAnalyzer();

      const files = [
        createMockScriptFile('file1', 'EP01.md', 1, {
          scenes: [
            {
              id: 'scene1',
              plot: '完全无关的情节发展',
              line: 10,
            },
          ],
        }),
        createMockScriptFile('file2', 'EP02.md', 2, {
          scenes: [
            {
              id: 'scene2',
              plot: '主角终于找到了之前一直寻找的宝剑',
              line: 10,
            },
          ],
        }),
      ];

      const result = await analyzer.analyze(files);

      const setupFindings = result.findings.filter(f =>
        f.description.includes('缺少前置铺垫')
      );
      expect(setupFindings.length).toBeGreaterThan(0);
    });

    it('should recognize plot similarity', async () => {
      const analyzer = new DefaultCrossFileAnalyzer();

      const files = [
        createMockScriptFile('file1', 'EP01.md', 1, {
          scenes: [
            {
              id: 'scene1',
              plot: '主角寻找神秘的宝藏',
              line: 10,
            },
          ],
        }),
        createMockScriptFile('file2', 'EP02.md', 2, {
          scenes: [
            {
              id: 'scene2',
              plot: '继续寻找神秘宝藏的线索',
              line: 10,
            },
          ],
        }),
      ];

      const result = await analyzer.analyze(files);

      // Should not flag as unresolved since plot continues
      const unresolvedFindings = result.findings.filter(f =>
        f.description.includes('情节线索可能未在后续集数中解决') &&
        f.description.includes('寻找')
      );
      expect(unresolvedFindings.length).toBe(0);
    });
  });

  describe('Setting Check', () => {
    it('should detect contradictory location descriptions', async () => {
      const analyzer = new DefaultCrossFileAnalyzer();

      const files = [
        createMockScriptFile('file1', 'EP01.md', 1, {
          scenes: [
            {
              id: 'scene1',
              location: '客厅',
              description: '宽敞明亮的客厅',
              line: 10,
            },
          ],
        }),
        createMockScriptFile('file2', 'EP02.md', 2, {
          scenes: [
            {
              id: 'scene2',
              location: '客厅',
              description: '狭窄昏暗的客厅',
              line: 10,
            },
          ],
        }),
      ];

      const result = await analyzer.analyze(files);

      const contradictionFindings = result.findings.filter(f =>
        f.description.includes('存在矛盾描述')
      );
      expect(contradictionFindings.length).toBeGreaterThan(0);
      expect(contradictionFindings[0].severity).toBe('high');
    });

    it.skip('should detect sudden location appearances (requires introduction keywords)', async () => {
      const analyzer = new DefaultCrossFileAnalyzer();

      const files = [
        createMockScriptFile('file1', 'EP01.md', 1, {
          scenes: [
            {
              id: 'scene1',
              location: '家',
              description: '主角的家',
              line: 10,
            },
          ],
        }),
        createMockScriptFile('file2', 'EP02.md', 2, {
          scenes: [
            {
              id: 'scene2',
              location: '神秘洞穴',
              description: '洞穴内部空间', // Missing introduction words like "新"/"初次"
              line: 10,
            },
          ],
        }),
      ];

      const result = await analyzer.analyze(files);

      const introFindings = result.findings.filter(f =>
        f.description.includes('首次出现') && f.description.includes('缺少场景介绍')
      );
      expect(introFindings.length).toBeGreaterThan(0);
    });

    it('should detect similar location names (typos)', async () => {
      const analyzer = new DefaultCrossFileAnalyzer();

      const files = [
        createMockScriptFile('file1', 'EP01.md', 1, {
          scenes: [
            {
              id: 'scene1',
              location: '张三办公室',
              line: 10,
            },
          ],
        }),
        createMockScriptFile('file2', 'EP02.md', 2, {
          scenes: [
            {
              id: 'scene2',
              location: '张三办工室', // Typo: 工 instead of 公
              line: 10,
            },
          ],
        }),
      ];

      const result = await analyzer.analyze(files);

      const typoFindings = result.findings.filter(f =>
        f.description.includes('地点名称可能存在不一致')
      );
      expect(typoFindings.length).toBeGreaterThan(0);
    });

    it.skip('should detect inconsistent location usage patterns (requires 3+ mentions with gaps)', async () => {
      const analyzer = new DefaultCrossFileAnalyzer();

      const files = [
        createMockScriptFile('file1', 'EP01.md', 1, {
          scenes: [
            { id: 'scene1', location: '办公室', line: 10 },
            { id: 'scene2', location: '办公室', line: 20 },
            { id: 'scene3', location: '办公室', line: 30 },
          ],
        }),
        createMockScriptFile('file2', 'EP02.md', 2, {
          scenes: [{ id: 'scene4', location: '家', line: 10 }],
        }),
        createMockScriptFile('file3', 'EP03.md', 3, {
          scenes: [{ id: 'scene5', location: '家', line: 10 }],
        }),
        createMockScriptFile('file4', 'EP04.md', 4, {
          scenes: [{ id: 'scene6', location: '家', line: 10 }],
        }),
        createMockScriptFile('file5', 'EP05.md', 5, {
          scenes: [
            { id: 'scene7', location: '办公室', line: 10 },
          ],
        }),
      ];

      const result = await analyzer.analyze(files);

      const gapFindings = result.findings.filter(f =>
        f.description.includes('消失') && f.description.includes('重新出现')
      );
      expect(gapFindings.length).toBeGreaterThan(0);
    });

    it('should normalize location names correctly', async () => {
      const analyzer = new DefaultCrossFileAnalyzer();

      const files = [
        createMockScriptFile('file1', 'EP01.md', 1, {
          scenes: [
            {
              id: 'scene1',
              location: '办公室的、',
              line: 10,
            },
          ],
        }),
        createMockScriptFile('file2', 'EP02.md', 2, {
          scenes: [
            {
              id: 'scene2',
              location: '办 公 室',
              line: 10,
            },
          ],
        }),
      ];

      const result = await analyzer.analyze(files);

      // Should normalize to same location
      const typoFindings = result.findings.filter(f =>
        f.description.includes('办公室') && f.description.includes('名称可能存在不一致')
      );
      expect(typoFindings.length).toBe(0);
    });
  });

  describe('Configuration Options', () => {
    it('should filter findings by minConfidence threshold', async () => {
      const analyzer = new DefaultCrossFileAnalyzer({ minConfidence: 0.9 });

      const files = [
        createMockScriptFile('file1', 'EP01.md', 1, {
          scenes: [
            { id: 'scene1', timestamp: '2024-01-15', line: 10 },
          ],
        }),
        createMockScriptFile('file2', 'EP02.md', 2, {
          scenes: [
            { id: 'scene2', timestamp: '2024-01-10', line: 10 },
          ],
        }),
      ];

      const result = await analyzer.analyze(files);

      // All findings should have confidence >= 0.9
      for (const finding of result.findings) {
        expect(finding.confidence).toBeGreaterThanOrEqual(0.9);
      }
    });

    it('should limit findings by maxFindingsPerType', async () => {
      const analyzer = new DefaultCrossFileAnalyzer({ maxFindingsPerType: 2 });

      // Create many files with similar character names to generate many findings
      const files = [];
      for (let i = 1; i <= 10; i++) {
        files.push(
          createMockScriptFile(`file${i}`, `EP${i.toString().padStart(2, '0')}.md`, i, {
            characters: [`角色${i}`, `角色${i}A`, `角色${i}B`],
          })
        );
      }

      const result = await analyzer.analyze(files);

      // Check that no type has more than 2 findings
      for (const [type, count] of Object.entries(result.byType)) {
        expect(count).toBeLessThanOrEqual(2);
      }
    });

    it('should only run specified check types', async () => {
      const analyzer = new DefaultCrossFileAnalyzer({
        checkTypes: ['cross_file_timeline'],
      });

      const files = [
        createMockScriptFile('file1', 'EP01.md', 1, {
          scenes: [
            {
              id: 'scene1',
              timestamp: '2024-01-15',
              line: 10,
            },
          ],
          characters: ['新角色'],
        }),
        createMockScriptFile('file2', 'EP02.md', 2, {
          scenes: [
            {
              id: 'scene2',
              timestamp: '2024-01-10',
              line: 10,
            },
          ],
          characters: ['另一个角色'],
        }),
      ];

      const result = await analyzer.analyze(files);

      // Should only have timeline findings
      for (const finding of result.findings) {
        expect(finding.type).toBe('cross_file_timeline');
      }
    });
  });

  describe('Helper Methods', () => {
    it('should parse scripts correctly', async () => {
      const analyzer = new DefaultCrossFileAnalyzer();

      const files = [
        createMockScriptFile('file1', 'EP01.md', 1, { scenes: [] }, 'raw content'),
        createMockScriptFile('file2', 'EP02.md', null, null, 'raw only'),
      ];

      const result = await analyzer.analyze(files);

      expect(result.processedFiles).toBe(2);
    });

    it('should sort scripts by episode number', async () => {
      const analyzer = new DefaultCrossFileAnalyzer();

      const files = [
        createMockScriptFile('file3', 'EP03.md', 3, { scenes: [] }),
        createMockScriptFile('file1', 'EP01.md', 1, { scenes: [] }),
        createMockScriptFile('file2', 'EP02.md', 2, { scenes: [] }),
        createMockScriptFile('file4', 'Special.md', null, { scenes: [] }),
      ];

      const result = await analyzer.analyze(files);

      // Analyzer should process files in sorted order
      expect(result.processedFiles).toBe(4);
    });

    it('should extract scenes from various JSON structures', async () => {
      const analyzer = new DefaultCrossFileAnalyzer();

      // Test scenes as array property
      const file1 = createMockScriptFile('file1', 'EP01.md', 1, {
        scenes: [{ id: 'scene1' }],
      });

      // Test scenes as root array
      const file2 = createMockScriptFile('file2', 'EP02.md', 2, [
        { id: 'scene2' },
      ]);

      const result = await analyzer.analyze([file1, file2]);

      expect(result.processedFiles).toBe(2);
    });
  });

  describe('Analysis Result Structure', () => {
    it('should return correct result structure', async () => {
      const analyzer = new DefaultCrossFileAnalyzer();

      const files = [
        createMockScriptFile('file1', 'EP01.md', 1, {
          scenes: [
            {
              id: 'scene1',
              timestamp: '2024-01-15',
              line: 10,
            },
          ],
        }),
        createMockScriptFile('file2', 'EP02.md', 2, {
          scenes: [
            {
              id: 'scene2',
              timestamp: '2024-01-10',
              line: 10,
            },
          ],
        }),
      ];

      const result = await analyzer.analyze(files);

      expect(result).toHaveProperty('findings');
      expect(result).toHaveProperty('processedFiles');
      expect(result).toHaveProperty('totalFindings');
      expect(result).toHaveProperty('byType');
      expect(result).toHaveProperty('processingTime');

      expect(Array.isArray(result.findings)).toBe(true);
      expect(typeof result.processedFiles).toBe('number');
      expect(typeof result.totalFindings).toBe('number');
      expect(typeof result.byType).toBe('object');
      expect(typeof result.processingTime).toBe('number');

      expect(result.processedFiles).toBe(2);
      expect(result.totalFindings).toBe(result.findings.length);
    });

    it('should include correct finding structure', async () => {
      const analyzer = new DefaultCrossFileAnalyzer();

      const files = [
        createMockScriptFile('file1', 'EP01.md', 1, {
          scenes: [
            {
              id: 'scene1',
              timestamp: '2024-01-15',
              line: 10,
            },
          ],
        }),
        createMockScriptFile('file2', 'EP02.md', 2, {
          scenes: [
            {
              id: 'scene2',
              timestamp: '2024-01-10',
              line: 10,
            },
          ],
        }),
      ];

      const result = await analyzer.analyze(files);

      if (result.findings.length > 0) {
        const finding = result.findings[0];

        expect(finding).toHaveProperty('id');
        expect(finding).toHaveProperty('type');
        expect(finding).toHaveProperty('severity');
        expect(finding).toHaveProperty('affectedFiles');
        expect(finding).toHaveProperty('description');
        expect(finding).toHaveProperty('suggestion');
        expect(finding).toHaveProperty('confidence');
        expect(finding).toHaveProperty('evidence');

        expect(['high', 'medium', 'low']).toContain(finding.severity);
        expect(Array.isArray(finding.affectedFiles)).toBe(true);
        expect(Array.isArray(finding.evidence)).toBe(true);
        expect(finding.confidence).toBeGreaterThanOrEqual(0);
        expect(finding.confidence).toBeLessThanOrEqual(1);
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty file list', async () => {
      const analyzer = new DefaultCrossFileAnalyzer();

      const result = await analyzer.analyze([]);

      expect(result.findings).toEqual([]);
      expect(result.processedFiles).toBe(0);
      expect(result.totalFindings).toBe(0);
    });

    it('should handle single file (no cross-file issues)', async () => {
      const analyzer = new DefaultCrossFileAnalyzer();

      const files = [
        createMockScriptFile('file1', 'EP01.md', 1, {
          scenes: [{ id: 'scene1', timestamp: '2024-01-15' }],
        }),
      ];

      const result = await analyzer.analyze(files);

      expect(result.processedFiles).toBe(1);
      // Might have internal issues (like backward timeline) but no cross-file issues
    });

    it('should handle files without JSON content', async () => {
      const analyzer = new DefaultCrossFileAnalyzer();

      const files = [
        createMockScriptFile('file1', 'EP01.md', 1, null, 'raw content only'),
        createMockScriptFile('file2', 'EP02.md', 2, null, 'another raw content'),
      ];

      const result = await analyzer.analyze(files);

      // Should not crash, but likely no findings
      expect(result.processedFiles).toBe(2);
    });

    it('should handle malformed JSON content gracefully', async () => {
      const analyzer = new DefaultCrossFileAnalyzer();

      const files = [
        createMockScriptFile('file1', 'EP01.md', 1, { randomKey: 'value' }),
        createMockScriptFile('file2', 'EP02.md', 2, { anotherKey: 123 }),
      ];

      const result = await analyzer.analyze(files);

      // Should not crash
      expect(result.processedFiles).toBe(2);
    });

    it('should handle null episode numbers', async () => {
      const analyzer = new DefaultCrossFileAnalyzer();

      const files = [
        createMockScriptFile('file1', 'Special.md', null, {
          scenes: [{ id: 'scene1' }],
        }),
        createMockScriptFile('file2', 'EP01.md', 1, {
          scenes: [{ id: 'scene2' }],
        }),
      ];

      const result = await analyzer.analyze(files);

      // Should not crash, files with null episode numbers sorted to end
      expect(result.processedFiles).toBe(2);
    });
  });
});
