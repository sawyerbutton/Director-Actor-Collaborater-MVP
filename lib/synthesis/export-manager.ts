/**
 * Epic 007: Export Manager
 *
 * Handles exporting scripts to various formats (TXT, MD, DOCX).
 */

import { ExportFormat, ExportJob, ExportOptions, ExportStatus } from '@/types/synthesis';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class ExportManager {
  /**
   * Exports a script version to specified format
   */
  async exportScript(
    versionId: string,
    format: ExportFormat,
    options: ExportOptions = {
      includeChangeLog: false,
      includeMetadata: false,
      formatting: {}
    }
  ): Promise<ExportJob> {
    const version = await prisma.scriptVersion.findUnique({
      where: { id: versionId }
    });

    if (!version) {
      throw new Error('Version not found');
    }

    // Create export job (using ITERATION type as placeholder)
    const job = await prisma.analysisJob.create({
      data: {
        projectId: version.projectId,
        type: 'ITERATION',
        status: 'QUEUED',
        metadata: {
          exportJob: true,
          versionId,
          format,
          options
        } as any
      }
    });

    // Process export (in production, would be queued)
    try {
      const exportedContent = await this.processExport(version, format, options);

      // Update job status
      await prisma.analysisJob.update({
        where: { id: job.id },
        data: {
          status: 'COMPLETED',
          result: { content: exportedContent },
          completedAt: new Date()
        }
      });

      return {
        id: job.id,
        versionId,
        format,
        status: 'completed' as ExportStatus,
        options,
        createdAt: job.createdAt,
        completedAt: new Date(),
        downloadUrl: `/api/v1/export/${job.id}/download`
      };
    } catch (error) {
      await prisma.analysisJob.update({
        where: { id: job.id },
        data: {
          status: 'FAILED',
          error: error instanceof Error ? error.message : 'Export failed'
        }
      });

      throw error;
    }
  }

  /**
   * Processes the actual export
   */
  private async processExport(
    version: any,
    format: ExportFormat,
    options: ExportOptions
  ): Promise<string> {
    let content = version.content;

    // Add metadata if requested
    if (options.includeMetadata && version.synthesisMetadata) {
      content = this.addMetadataHeader(content, version, format);
    }

    // Add change log if requested
    if (options.includeChangeLog && version.changeLog) {
      content = this.addChangeLog(content, version.changeLog, format);
    }

    // Format based on export type
    switch (format) {
      case ExportFormat.TXT:
        return this.exportToTxt(content);
      case ExportFormat.MD:
        return this.exportToMarkdown(content);
      case ExportFormat.DOCX:
        // In production, would use docx library
        return this.exportToDocx(content);
      default:
        return content;
    }
  }

  /**
   * Adds metadata header
   */
  private addMetadataHeader(content: string, version: any, format: ExportFormat): string {
    const metadata = version.synthesisMetadata;
    const header: string[] = [];

    if (format === ExportFormat.MD) {
      header.push('# 剧本元数据');
      header.push('');
      header.push(`- **版本**: V${version.version}`);
      header.push(`- **创建时间**: ${new Date(version.createdAt).toLocaleString('zh-CN')}`);
      if (metadata?.decisionsApplied) {
        header.push(`- **应用决策数**: ${metadata.decisionsApplied.length}`);
      }
      if (version.confidence) {
        header.push(`- **置信度**: ${(version.confidence * 100).toFixed(1)}%`);
      }
      header.push('');
      header.push('---');
      header.push('');
    } else {
      header.push('═══════════════════════════════════════');
      header.push('剧本元数据');
      header.push('═══════════════════════════════════════');
      header.push(`版本: V${version.version}`);
      header.push(`创建时间: ${new Date(version.createdAt).toLocaleString('zh-CN')}`);
      if (metadata?.decisionsApplied) {
        header.push(`应用决策数: ${metadata.decisionsApplied.length}`);
      }
      if (version.confidence) {
        header.push(`置信度: ${(version.confidence * 100).toFixed(1)}%`);
      }
      header.push('═══════════════════════════════════════');
      header.push('');
    }

    return header.join('\n') + content;
  }

  /**
   * Adds change log
   */
  private addChangeLog(content: string, changeLog: string, format: ExportFormat): string {
    const footer: string[] = ['', ''];

    if (format === ExportFormat.MD) {
      footer.push('---');
      footer.push('');
      footer.push('# 变更日志');
      footer.push('');
      footer.push('```json');
      footer.push(changeLog);
      footer.push('```');
    } else {
      footer.push('═══════════════════════════════════════');
      footer.push('变更日志');
      footer.push('═══════════════════════════════════════');
      footer.push(changeLog);
      footer.push('═══════════════════════════════════════');
    }

    return content + footer.join('\n');
  }

  /**
   * Exports to plain text
   */
  private exportToTxt(content: string): string {
    // Already in text format, just ensure proper line endings
    return content.replace(/\r\n/g, '\n');
  }

  /**
   * Exports to Markdown
   */
  private exportToMarkdown(content: string): string {
    // Convert script format to Markdown
    const lines = content.split('\n');
    const mdLines: string[] = [];

    lines.forEach(line => {
      // Scene headers
      if (line.match(/^场景|^SCENE|^INT\.|^EXT\./i)) {
        mdLines.push('');
        mdLines.push(`## ${line.trim()}`);
        mdLines.push('');
      }
      // Character dialogue
      else if (line.match(/^([A-Z\u4e00-\u9fa5]+)[:：]/)) {
        const [, character, dialogue] = line.match(/^([A-Z\u4e00-\u9fa5]+)[:：]\s*(.*)/) || [];
        if (character) {
          mdLines.push(`**${character}**: ${dialogue || ''}`);
        }
      }
      // Regular text
      else {
        mdLines.push(line);
      }
    });

    return mdLines.join('\n');
  }

  /**
   * Exports to DOCX (placeholder - would use docx library in production)
   */
  private exportToDocx(content: string): string {
    // In production, would use the `docx` npm package to create proper DOCX files
    // For now, return formatted text with a note
    return `[DOCX Export]\n\nNote: Full DOCX export requires the 'docx' library.\n\n${content}`;
  }

  /**
   * Gets export job status
   */
  async getExportStatus(jobId: string): Promise<ExportJob> {
    const job = await prisma.analysisJob.findUnique({
      where: { id: jobId }
    });

    const metadata = job?.metadata as any;

    if (!job || !metadata?.exportJob) {
      throw new Error('Export job not found');
    }

    return {
      id: job.id,
      versionId: metadata.versionId,
      format: metadata.format,
      status: job.status.toLowerCase() as ExportStatus,
      options: metadata.options || {},
      createdAt: job.createdAt,
      completedAt: job.completedAt || undefined,
      downloadUrl: job.status === 'COMPLETED' ? `/api/v1/export/${job.id}/download` : undefined,
      error: job.error || undefined
    };
  }

  /**
   * Gets exported content for download
   */
  async getExportedContent(jobId: string): Promise<{ content: string; format: ExportFormat }> {
    const job = await prisma.analysisJob.findUnique({
      where: { id: jobId }
    });

    const metadata = job?.metadata as any;

    if (!job || !metadata?.exportJob || job.status !== 'COMPLETED') {
      throw new Error('Export not ready or not found');
    }

    const result = job.result as any;

    return {
      content: result.content,
      format: metadata.format
    };
  }
}
