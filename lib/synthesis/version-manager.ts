/**
 * Epic 007: Version Management and Diff System
 *
 * Manages script versions, generates diffs, and provides comparison capabilities.
 */

import { PrismaClient } from '@prisma/client';
import {
  DiffResult,
  DiffEntry,
  DiffStats,
  VersionComparison,
  VersionMetadata
} from '@/types/synthesis';

const prisma = new PrismaClient();

export class VersionManager {
  /**
   * Creates a new script version
   */
  async createVersion(
    projectId: string,
    content: string,
    metadata: VersionMetadata
  ): Promise<any> {
    // Get the latest version number
    const latestVersion = await prisma.scriptVersion.findFirst({
      where: { projectId },
      orderBy: { version: 'desc' }
    });

    const newVersion = (latestVersion?.version || 0) + 1;

    // Create new version
    const version = await prisma.scriptVersion.create({
      data: {
        projectId,
        version: newVersion,
        content,
        changeLog: JSON.stringify(metadata.synthesisLog),
        synthesisMetadata: {
          decisionsApplied: metadata.decisionsApplied,
          styleProfile: metadata.styleProfile || null,
          processingTime: metadata.processingTime || 0,
          tokenUsage: 0,
          timestamp: metadata.timestamp.toISOString(),
          previousVersion: metadata.previousVersion || newVersion - 1
        } as any,
        confidence: metadata.confidence
      }
    });

    return version;
  }

  /**
   * Generates diff between two versions
   */
  async generateDiff(v1Content: string, v2Content: string): Promise<DiffResult> {
    const v1Lines = v1Content.split('\n');
    const v2Lines = v2Content.split('\n');

    const additions: DiffEntry[] = [];
    const deletions: DiffEntry[] = [];
    const modifications: DiffEntry[] = [];

    // Simple line-by-line diff (Myers algorithm would be better in production)
    const maxLen = Math.max(v1Lines.length, v2Lines.length);

    for (let i = 0; i < maxLen; i++) {
      const line1 = v1Lines[i] || '';
      const line2 = v2Lines[i] || '';

      if (line1 === line2) {
        continue; // No change
      } else if (line1 && !line2) {
        deletions.push({
          lineNumber: i + 1,
          content: line1,
          type: 'deleted'
        });
      } else if (!line1 && line2) {
        additions.push({
          lineNumber: i + 1,
          content: line2,
          type: 'added'
        });
      } else {
        modifications.push({
          lineNumber: i + 1,
          content: line2,
          type: 'modified'
        });
      }
    }

    // Calculate stats
    const stats: DiffStats = {
      linesAdded: additions.length,
      linesDeleted: deletions.length,
      linesModified: modifications.length,
      scenesAffected: this.countAffectedScenes([...additions, ...deletions, ...modifications]),
      charactersAffected: this.extractAffectedCharacters([...additions, ...deletions, ...modifications])
    };

    return {
      additions,
      deletions,
      modifications,
      stats
    };
  }

  /**
   * Compares two versions
   */
  async compareVersions(versionId1: string, versionId2: string): Promise<VersionComparison> {
    const [v1, v2] = await Promise.all([
      prisma.scriptVersion.findUnique({ where: { id: versionId1 } }),
      prisma.scriptVersion.findUnique({ where: { id: versionId2 } })
    ]);

    if (!v1 || !v2) {
      throw new Error('One or both versions not found');
    }

    const diff = await this.generateDiff(v1.content, v2.content);
    const summary = this.generateDiffSummary(diff);

    return {
      v1Id: versionId1,
      v2Id: versionId2,
      diff,
      summary,
      changeAttribution: new Map() // Would map changes to decisions in production
    };
  }

  /**
   * Lists all versions for a project
   */
  async listVersions(projectId: string): Promise<any[]> {
    return await prisma.scriptVersion.findMany({
      where: { projectId },
      orderBy: { version: 'desc' }
    });
  }

  /**
   * Gets a specific version
   */
  async getVersion(versionId: string): Promise<any> {
    return await prisma.scriptVersion.findUnique({
      where: { id: versionId }
    });
  }

  /**
   * Gets the latest version for a project (for gradual iteration)
   */
  async getLatestVersion(projectId: string): Promise<any | null> {
    return await prisma.scriptVersion.findFirst({
      where: { projectId },
      orderBy: { version: 'desc' }
    });
  }

  /**
   * Counts affected scenes in diff
   */
  private countAffectedScenes(entries: DiffEntry[]): number {
    const sceneLines = entries.filter(entry =>
      entry.content.match(/^场景|^SCENE|^INT\.|^EXT\./i)
    );
    return sceneLines.length;
  }

  /**
   * Extracts affected character names from diff
   */
  private extractAffectedCharacters(entries: DiffEntry[]): string[] {
    const characters = new Set<string>();

    entries.forEach(entry => {
      const match = entry.content.match(/^([A-Z\u4e00-\u9fa5]+)[:：]/);
      if (match) {
        characters.add(match[1]);
      }
    });

    return Array.from(characters);
  }

  /**
   * Generates a human-readable diff summary
   */
  private generateDiffSummary(diff: DiffResult): string {
    const { stats } = diff;
    const parts: string[] = [];

    parts.push(`总计变更：`);
    parts.push(`- 新增 ${stats.linesAdded} 行`);
    parts.push(`- 删除 ${stats.linesDeleted} 行`);
    parts.push(`- 修改 ${stats.linesModified} 行`);

    if (stats.scenesAffected > 0) {
      parts.push(`- 影响 ${stats.scenesAffected} 个场景`);
    }

    if (stats.charactersAffected.length > 0) {
      parts.push(`- 影响角色: ${stats.charactersAffected.join(', ')}`);
    }

    return parts.join('\n');
  }

  /**
   * Rollback to a previous version
   */
  async rollbackToVersion(projectId: string, versionId: string): Promise<void> {
    const targetVersion = await prisma.scriptVersion.findUnique({
      where: { id: versionId }
    });

    if (!targetVersion || targetVersion.projectId !== projectId) {
      throw new Error('Version not found or does not belong to project');
    }

    // Create a new version with the content of the target version
    await this.createVersion(
      projectId,
      targetVersion.content,
      {
        synthesisLog: [],
        decisionsApplied: [],
        confidence: targetVersion.confidence || 1.0,
        timestamp: new Date(),
        previousVersion: targetVersion.version
      }
    );
  }
}
