/**
 * ScriptFile Service
 *
 * Manages CRUD operations for script files in multi-file projects
 */

import { prisma } from '../client';
import { ScriptFile, Prisma } from '@prisma/client';
import { BaseService, NotFoundError, ValidationError } from './base.service';
import { createHash } from 'crypto';
import {
  CreateScriptFileInput,
  UpdateScriptFileInput,
  QueryOptions,
  BatchOperationResult,
  ScriptFileWithProject,
  ProjectFilesStats,
} from './types/script-file.types';

export class ScriptFileService extends BaseService {
  /**
   * Create a single script file
   *
   * @param data - File creation data
   * @returns Created ScriptFile
   */
  async createFile(data: CreateScriptFileInput): Promise<ScriptFile> {
    try {
      // Auto-extract episode number if not provided
      const episodeNumber =
        data.episodeNumber ?? this.extractEpisodeNumber(data.filename);

      // Generate content hash
      const contentHash = this.generateContentHash(data.rawContent);

      // Calculate file size
      const fileSize = Buffer.byteLength(data.rawContent, 'utf8');

      return await prisma.scriptFile.create({
        data: {
          projectId: data.projectId,
          filename: data.filename,
          episodeNumber,
          rawContent: data.rawContent,
          contentHash,
          fileSize,
          conversionStatus: 'pending',
        },
      });
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Create multiple script files in a transaction
   *
   * @param files - Array of file creation data
   * @returns Batch operation result
   */
  async createFiles(
    files: CreateScriptFileInput[]
  ): Promise<BatchOperationResult> {
    try {
      const errors: Array<{ filename: string; error: string }> = [];
      const createdFiles: ScriptFile[] = [];

      // Process files in a transaction for atomicity
      await prisma.$transaction(async (tx) => {
        for (const file of files) {
          try {
            // Check for duplicate filename within the same project
            const existing = await tx.scriptFile.findUnique({
              where: {
                projectId_filename: {
                  projectId: file.projectId,
                  filename: file.filename,
                },
              },
            });

            if (existing) {
              errors.push({
                filename: file.filename,
                error: `File "${file.filename}" already exists in this project`,
              });
              continue;
            }

            // Create file
            const episodeNumber =
              file.episodeNumber ?? this.extractEpisodeNumber(file.filename);
            const contentHash = this.generateContentHash(file.rawContent);
            const fileSize = Buffer.byteLength(file.rawContent, 'utf8');

            const created = await tx.scriptFile.create({
              data: {
                projectId: file.projectId,
                filename: file.filename,
                episodeNumber,
                rawContent: file.rawContent,
                contentHash,
                fileSize,
                conversionStatus: 'pending',
              },
            });

            createdFiles.push(created);
          } catch (err) {
            errors.push({
              filename: file.filename,
              error: err instanceof Error ? err.message : 'Unknown error',
            });
          }
        }
      });

      return {
        success: errors.length === 0,
        count: createdFiles.length,
        errors: errors.length > 0 ? errors : undefined,
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Get all script files for a project
   *
   * @param projectId - Project ID
   * @param options - Query options (sorting, pagination)
   * @returns Array of ScriptFiles
   */
  async getFilesByProjectId(
    projectId: string,
    options?: QueryOptions
  ): Promise<ScriptFile[] | ScriptFileWithProject[]> {
    try {
      const {
        orderBy = 'episodeNumber',
        order = 'asc',
        skip,
        take,
        includeProject = false,
      } = options || {};

      // Build orderBy clause
      const orderByClause: Prisma.ScriptFileOrderByWithRelationInput = {};
      if (orderBy === 'episodeNumber') {
        // Handle null episode numbers - they should come last
        orderByClause.episodeNumber = {
          sort: order,
          nulls: 'last',
        };
      } else if (orderBy === 'createdAt') {
        orderByClause.createdAt = order;
      } else if (orderBy === 'filename') {
        orderByClause.filename = order;
      }

      return await prisma.scriptFile.findMany({
        where: { projectId },
        orderBy: orderByClause,
        skip,
        take,
        include: includeProject ? { project: true } : undefined,
      });
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Get a script file by ID
   *
   * @param fileId - File ID
   * @param includeProject - Include related Project data
   * @returns ScriptFile or null
   */
  async getFileById(
    fileId: string,
    includeProject = false
  ): Promise<ScriptFile | ScriptFileWithProject | null> {
    try {
      return await prisma.scriptFile.findUnique({
        where: { id: fileId },
        include: includeProject ? { project: true } : undefined,
      });
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Get a script file by project and filename
   *
   * @param projectId - Project ID
   * @param filename - Filename
   * @returns ScriptFile or null
   */
  async getFileByProjectAndFilename(
    projectId: string,
    filename: string
  ): Promise<ScriptFile | null> {
    try {
      return await prisma.scriptFile.findUnique({
        where: {
          projectId_filename: {
            projectId,
            filename,
          },
        },
      });
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Update a script file (mainly for JSON conversion results)
   *
   * @param fileId - File ID
   * @param data - Update data
   * @returns Updated ScriptFile
   */
  async updateFile(
    fileId: string,
    data: UpdateScriptFileInput
  ): Promise<ScriptFile> {
    try {
      const file = await prisma.scriptFile.findUnique({
        where: { id: fileId },
      });

      if (!file) {
        throw new NotFoundError(`Script file with ID ${fileId} not found`);
      }

      return await prisma.scriptFile.update({
        where: { id: fileId },
        data: {
          jsonContent: data.jsonContent as any,
          conversionStatus: data.conversionStatus,
          conversionError: data.conversionError,
          updatedAt: new Date(),
        },
      });
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Delete a script file
   *
   * @param fileId - File ID
   */
  async deleteFile(fileId: string): Promise<void> {
    try {
      const file = await prisma.scriptFile.findUnique({
        where: { id: fileId },
      });

      if (!file) {
        throw new NotFoundError(`Script file with ID ${fileId} not found`);
      }

      await prisma.scriptFile.delete({
        where: { id: fileId },
      });
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Delete all script files for a project
   *
   * @param projectId - Project ID
   * @returns Number of deleted files
   */
  async deleteFilesByProjectId(projectId: string): Promise<{ count: number }> {
    try {
      const result = await prisma.scriptFile.deleteMany({
        where: { projectId },
      });

      return { count: result.count };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Get statistics for project files
   *
   * @param projectId - Project ID
   * @returns Project files statistics
   */
  async getProjectFilesStats(projectId: string): Promise<ProjectFilesStats> {
    try {
      const files = await prisma.scriptFile.findMany({
        where: { projectId },
        select: {
          fileSize: true,
          conversionStatus: true,
          episodeNumber: true,
        },
      });

      const totalSize = files.reduce((sum, f) => sum + f.fileSize, 0);
      const convertedFiles = files.filter(
        (f) => f.conversionStatus === 'completed'
      ).length;
      const pendingFiles = files.filter(
        (f) => f.conversionStatus === 'pending'
      ).length;
      const failedFiles = files.filter(
        (f) => f.conversionStatus === 'failed'
      ).length;

      const episodeNumbers = files
        .map((f) => f.episodeNumber)
        .filter((n): n is number => n !== null);

      return {
        totalFiles: files.length,
        totalSize,
        convertedFiles,
        pendingFiles,
        failedFiles,
        episodeRange: {
          min: episodeNumbers.length > 0 ? Math.min(...episodeNumbers) : null,
          max: episodeNumbers.length > 0 ? Math.max(...episodeNumbers) : null,
        },
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Extract episode number from filename using various patterns
   *
   * Supported patterns:
   * - "第1集.md" → 1
   * - "EP01.txt" → 1
   * - "E1.md" → 1
   * - "episode_01.md" → 1
   * - "01-pilot.md" → 1
   *
   * @param filename - Filename
   * @returns Episode number or null if not found
   */
  extractEpisodeNumber(filename: string): number | null {
    // Pattern 1: Chinese format "第N集"
    const chineseMatch = filename.match(/第(\d+)集/);
    if (chineseMatch) {
      return parseInt(chineseMatch[1], 10);
    }

    // Pattern 2: "EPN" or "EPN" format
    const epMatch = filename.match(/EP(\d+)/i);
    if (epMatch) {
      return parseInt(epMatch[1], 10);
    }

    // Pattern 3: "EN" format
    const eMatch = filename.match(/E(\d+)/i);
    if (eMatch) {
      return parseInt(eMatch[1], 10);
    }

    // Pattern 4: "episode_N" format
    const episodeMatch = filename.match(/episode[_\s](\d+)/i);
    if (episodeMatch) {
      return parseInt(episodeMatch[1], 10);
    }

    // Pattern 5: Leading number "NN-" or "NN_"
    const leadingMatch = filename.match(/^(\d+)[-_]/);
    if (leadingMatch) {
      return parseInt(leadingMatch[1], 10);
    }

    // Pattern 6: Number anywhere in filename (last resort)
    const anyNumberMatch = filename.match(/(\d+)/);
    if (anyNumberMatch) {
      return parseInt(anyNumberMatch[1], 10);
    }

    return null;
  }

  /**
   * Generate SHA256 hash for content
   *
   * Used for deduplication detection (V1.1 feature)
   *
   * @param content - Content to hash
   * @returns SHA256 hash (hex string)
   */
  generateContentHash(content: string): string {
    return createHash('sha256').update(content, 'utf8').digest('hex');
  }
}

// Singleton instance
export const scriptFileService = new ScriptFileService();
