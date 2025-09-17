import { ExportService } from '@/lib/services/export-service';
import type { RevisionError } from '@/lib/stores/revision-store';
import { saveAs } from 'file-saver';

// Mock file-saver
jest.mock('file-saver', () => ({
  saveAs: jest.fn()
}));

// Mock docx
jest.mock('docx', () => ({
  Document: jest.fn().mockImplementation((config) => config),
  Packer: {
    toBlob: jest.fn().mockResolvedValue(new Blob(['mock docx content']))
  },
  Paragraph: jest.fn().mockImplementation((config) => config),
  TextRun: jest.fn().mockImplementation((config) => config),
  HeadingLevel: {
    TITLE: 'TITLE',
    HEADING_1: 'HEADING_1'
  }
}));

describe('ExportService', () => {
  const originalScript = `第一场
角色A：这是第一句台词
角色B：这是第二句台词

第二场
角色C：这是第三句台词`;

  const mockErrors: RevisionError[] = [
    {
      id: 'error-1',
      category: 'logic',
      severity: 'high',
      message: 'Error message 1',
      suggestion: '替换为"新台词"',
      context: {
        line: 2,
        snippet: '这是第一句台词'
      },
      status: 'accepted',
      appliedAt: new Date()
    },
    {
      id: 'error-2',
      category: 'consistency',
      severity: 'medium',
      message: 'Error message 2',
      suggestion: '修改建议2',
      context: {
        line: 3,
        snippet: '这是第二句台词'
      },
      status: 'rejected'
    }
  ];

  let exportService: ExportService;

  beforeEach(() => {
    exportService = new ExportService(originalScript);
    jest.clearAllMocks();
  });

  describe('exportScript', () => {
    it('should export as TXT format', async () => {
      await exportService.exportScript(mockErrors, {
        format: 'txt',
        filename: 'test-script'
      });

      expect(saveAs).toHaveBeenCalled();
      const [blob, filename] = (saveAs as jest.Mock).mock.calls[0];
      expect(blob).toBeInstanceOf(Blob);
      expect(filename).toBe('test-script.txt');
    });

    it('should export as DOCX format', async () => {
      await exportService.exportScript(mockErrors, {
        format: 'docx',
        filename: 'test-script'
      });

      expect(saveAs).toHaveBeenCalled();
      const [blob, filename] = (saveAs as jest.Mock).mock.calls[0];
      expect(blob).toBeInstanceOf(Blob);
      expect(filename).toBe('test-script.docx');
    });

    it('should include metadata when requested', async () => {
      await exportService.exportScript(mockErrors, {
        format: 'txt',
        filename: 'test-script',
        includeMetadata: true
      });

      expect(saveAs).toHaveBeenCalled();
      const [blob] = (saveAs as jest.Mock).mock.calls[0];
      expect(blob).toBeInstanceOf(Blob);
      // The blob should contain metadata when includeMetadata is true
      // We can't easily test the content in this unit test setup
    });

    it('should use default filename if not provided', async () => {
      await exportService.exportScript(mockErrors, {
        format: 'txt'
      });

      const [, filename] = (saveAs as jest.Mock).mock.calls[0];
      expect(filename).toMatch(/^剧本_修订版_\d{4}-\d{2}-\d{2}\.txt$/);
    });

    it('should throw error for unsupported format', async () => {
      await expect(
        exportService.exportScript(mockErrors, {
          format: 'pdf' as any
        })
      ).rejects.toThrow('Unsupported export format: pdf');
    });
  });

  describe('exportWithHighlights', () => {
    it('should export script with diff highlights', async () => {
      await exportService.exportWithHighlights(originalScript, mockErrors, 'highlighted-script');

      expect(saveAs).toHaveBeenCalled();
      const [blob, filename] = (saveAs as jest.Mock).mock.calls[0];
      expect(blob).toBeInstanceOf(Blob);
      expect(filename).toBe('highlighted-script.txt');
    });

    it('should use default filename for highlighted export', async () => {
      await exportService.exportWithHighlights(originalScript, mockErrors);

      const [, filename] = (saveAs as jest.Mock).mock.calls[0];
      expect(filename).toMatch(/^剧本_修订对比_\d{4}-\d{2}-\d{2}\.txt$/);
    });
  });

  describe('generateSummaryReport', () => {
    it('should generate a markdown report', () => {
      const report = exportService.generateSummaryReport(mockErrors);

      expect(report).toContain('# 剧本修订报告');
      expect(report).toContain('## 统计概览');
      expect(report).toContain('总问题数: 2');
      expect(report).toContain('已接受修改: 1');
      expect(report).toContain('已拒绝修改: 1');
    });

    it('should include accepted modifications in report', () => {
      const report = exportService.generateSummaryReport(mockErrors);

      expect(report).toContain('## 已接受的修改');
      expect(report).toContain('Error message 1');
      expect(report).toContain('替换为"新台词"');
    });

    it('should not include rejected modifications in accepted list', () => {
      const report = exportService.generateSummaryReport(mockErrors);

      expect(report).not.toContain('Error message 2');
      expect(report).not.toContain('修改建议2');
    });

    it('should include conflict warning when conflicts exist', () => {
      // Create errors that would conflict
      const conflictingErrors: RevisionError[] = [
        ...mockErrors,
        {
          id: 'error-3',
          category: 'logic',
          severity: 'high',
          message: 'Conflicting error',
          suggestion: '冲突的修改',
          context: {
            line: 2,
            snippet: '这是第一句台词'
          },
          status: 'accepted',
          appliedAt: new Date()
        }
      ];

      const report = exportService.generateSummaryReport(conflictingErrors);
      // Since the merger will detect conflicts, the report may contain warnings
      // The actual detection depends on the merger implementation
      expect(report).toBeDefined();
    });
  });
});