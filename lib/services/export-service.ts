import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import { saveAs } from 'file-saver';
import type { RevisionError } from '@/lib/stores/revision-store';
import { ScriptMerger } from './script-merger';

export type ExportFormat = 'txt' | 'docx';

export interface ExportOptions {
  format: ExportFormat;
  filename?: string;
  includeHighlights?: boolean;
  includeMetadata?: boolean;
}

export class ExportService {
  private merger: ScriptMerger;

  constructor(originalScript: string) {
    this.merger = new ScriptMerger(originalScript);
  }

  async exportScript(
    acceptedErrors: RevisionError[],
    options: ExportOptions
  ): Promise<void> {
    const mergeResult = this.merger.processAcceptedErrors(acceptedErrors);
    const statistics = this.merger.getStatistics(acceptedErrors);
    
    const timestamp = new Date().toISOString().split('T')[0];
    const defaultFilename = `剧本_修订版_${timestamp}`;
    const filename = options.filename || defaultFilename;

    switch (options.format) {
      case 'txt':
        await this.exportAsTxt(mergeResult.mergedScript, filename, options, statistics);
        break;
      case 'docx':
        await this.exportAsDocx(mergeResult.mergedScript, filename, options, statistics);
        break;
      default:
        throw new Error(`Unsupported export format: ${options.format}`);
    }
  }

  private async exportAsTxt(
    content: string,
    filename: string,
    options: ExportOptions,
    statistics: ReturnType<ScriptMerger['getStatistics']>
  ): Promise<void> {
    let exportContent = content;

    if (options.includeMetadata) {
      const metadata = this.generateMetadata(statistics);
      exportContent = metadata + '\n\n' + content;
    }

    const blob = new Blob([exportContent], { type: 'text/plain;charset=utf-8' });
    saveAs(blob, `${filename}.txt`);
  }

  private async exportAsDocx(
    content: string,
    filename: string,
    options: ExportOptions,
    statistics: ReturnType<ScriptMerger['getStatistics']>
  ): Promise<void> {
    const sections: any[] = [];

    // Add metadata section if requested
    if (options.includeMetadata) {
      sections.push(
        new Paragraph({
          text: '剧本修订版',
          heading: HeadingLevel.TITLE,
        }),
        new Paragraph({
          text: `生成日期: ${new Date().toLocaleDateString('zh-CN')}`,
        }),
        new Paragraph({
          text: `应用修改: ${statistics.acceptedCount} 项`,
        }),
        new Paragraph({
          text: `拒绝修改: ${statistics.rejectedCount} 项`,
        }),
        new Paragraph({
          text: `待处理: ${statistics.pendingCount} 项`,
        }),
        new Paragraph({
          text: '',
        })
      );
    }

    // Parse and format script content
    const lines = content.split('\n');
    let currentScene: string | null = null;

    for (const line of lines) {
      const trimmedLine = line.trim();

      if (!trimmedLine) {
        sections.push(new Paragraph({ text: '' }));
        continue;
      }

      // Detect scene headers (e.g., "第一场", "场景一", etc.)
      if (this.isSceneHeader(trimmedLine)) {
        currentScene = trimmedLine;
        sections.push(
          new Paragraph({
            text: trimmedLine,
            heading: HeadingLevel.HEADING_1,
          })
        );
      }
      // Detect character dialogue (e.g., "角色A：")
      else if (this.isCharacterLine(trimmedLine)) {
        const [character, dialogue] = this.parseCharacterLine(trimmedLine);
        
        sections.push(
          new Paragraph({
            children: [
              new TextRun({
                text: character,
                bold: true,
              }),
              new TextRun({
                text: dialogue,
              }),
            ],
          })
        );
      }
      // Stage directions or descriptions
      else if (this.isStageDirection(trimmedLine)) {
        sections.push(
          new Paragraph({
            children: [
              new TextRun({
                text: trimmedLine,
                italics: true,
              }),
            ],
            indent: {
              left: 720, // 0.5 inch indent
            },
          })
        );
      }
      // Regular text
      else {
        sections.push(
          new Paragraph({
            text: trimmedLine,
          })
        );
      }
    }

    // Create document
    const doc = new Document({
      sections: [{
        properties: {},
        children: sections,
      }],
    });

    // Generate and save document
    const blob = await Packer.toBlob(doc);
    saveAs(blob, `${filename}.docx`);
  }

  private generateMetadata(statistics: ReturnType<ScriptMerger['getStatistics']>): string {
    const lines = [
      '=' .repeat(50),
      '剧本修订版',
      '=' .repeat(50),
      `生成日期: ${new Date().toLocaleDateString('zh-CN')} ${new Date().toLocaleTimeString('zh-CN')}`,
      '',
      '修改统计:',
      `-  总错误数: ${statistics.totalErrors}`,
      `-  已接受: ${statistics.acceptedCount}`,
      `-  已拒绝: ${statistics.rejectedCount}`,
      `-  待处理: ${statistics.pendingCount}`,
      `-  修改行数: ${statistics.linesModified}`,
      '',
      statistics.conflictsCount > 0 ? `⚠️ 检测到 ${statistics.conflictsCount} 个冲突` : '✅ 无冲突',
      '=' .repeat(50),
    ];

    return lines.join('\n');
  }

  private isSceneHeader(line: string): boolean {
    return /^(第[一二三四五六七八九十百千万\d]+[场幕章节]|场景|SCENE|ACT)/i.test(line);
  }

  private isCharacterLine(line: string): boolean {
    return /^[^：:]+[：:]/.test(line) && !this.isStageDirection(line);
  }

  private parseCharacterLine(line: string): [string, string] {
    const match = line.match(/^([^：:]+)([：:])(.*)$/);
    if (match) {
      return [match[1] + match[2], match[3] || ''];
    }
    return [line, ''];
  }

  private isStageDirection(line: string): boolean {
    return line.startsWith('(') || line.startsWith('（') || 
           line.startsWith('[') || line.startsWith('【');
  }

  // Export with highlights for review
  async exportWithHighlights(
    originalScript: string,
    acceptedErrors: RevisionError[],
    filename?: string
  ): Promise<void> {
    const highlightedScript = this.merger.getMergedScriptWithHighlights(acceptedErrors);
    const timestamp = new Date().toISOString().split('T')[0];
    const exportFilename = filename || `剧本_修订对比_${timestamp}`;
    
    const blob = new Blob([highlightedScript], { type: 'text/plain;charset=utf-8' });
    saveAs(blob, `${exportFilename}.txt`);
  }

  // Generate summary report
  generateSummaryReport(acceptedErrors: RevisionError[]): string {
    const statistics = this.merger.getStatistics(acceptedErrors);
    const acceptedList = acceptedErrors.filter(e => e.status === 'accepted');
    
    const report = [
      '# 剧本修订报告',
      '',
      `生成时间: ${new Date().toLocaleString('zh-CN')}`,
      '',
      '## 统计概览',
      `- 总问题数: ${statistics.totalErrors}`,
      `- 已接受修改: ${statistics.acceptedCount}`,
      `- 已拒绝修改: ${statistics.rejectedCount}`,
      `- 待处理: ${statistics.pendingCount}`,
      `- 影响行数: ${statistics.linesModified}`,
      '',
      '## 已接受的修改',
      '',
    ];

    acceptedList.forEach((error, index) => {
      report.push(`### ${index + 1}. ${(error as any).type || 'unknown'} - ${error.severity}`);
      report.push(`**问题**: ${(error as any).description || (error as any).message || ''}`);
      if (error.suggestion) {
        report.push(`**建议**: ${error.suggestion}`);
      }
      if ((error as any).location || (error as any).context) {
        const loc = (error as any).location || (error as any).context;
        report.push(`**位置**: 第 ${loc.line} 行`);
      }
      report.push('');
    });

    if (statistics.conflictsCount > 0) {
      report.push('## ⚠️ 注意事项');
      report.push(`检测到 ${statistics.conflictsCount} 个潜在冲突，请仔细审查修改后的剧本。`);
    }

    return report.join('\n');
  }
}