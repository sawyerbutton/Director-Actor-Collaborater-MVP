/**
 * ScriptFile Service Types
 *
 * Type definitions for ScriptFile CRUD operations
 */

import { ScriptFile, Prisma } from '@prisma/client';

/**
 * Input type for creating a new script file
 */
export interface CreateScriptFileInput {
  projectId: string;
  filename: string;
  rawContent: string;
  episodeNumber?: number; // Optional, will be auto-extracted if not provided
}

/**
 * Input type for updating an existing script file
 */
export interface UpdateScriptFileInput {
  jsonContent?: any; // Structured JSON after conversion
  conversionStatus?: 'pending' | 'processing' | 'completed' | 'failed';
  conversionError?: string | null;
}

/**
 * Query options for listing script files
 */
export interface QueryOptions {
  orderBy?: 'episodeNumber' | 'createdAt' | 'filename';
  order?: 'asc' | 'desc';
  skip?: number;
  take?: number;
  includeProject?: boolean; // Include related Project data
}

/**
 * Result type for batch operations
 */
export interface BatchOperationResult {
  success: boolean;
  count: number;
  errors?: Array<{
    filename: string;
    error: string;
  }>;
}

/**
 * ScriptFile with optional Project relation
 */
export type ScriptFileWithProject = Prisma.ScriptFileGetPayload<{
  include: { project: true };
}>;

/**
 * Statistics for project files
 */
export interface ProjectFilesStats {
  totalFiles: number;
  totalSize: number; // in bytes
  convertedFiles: number;
  pendingFiles: number;
  failedFiles: number;
  episodeRange: {
    min: number | null;
    max: number | null;
  };
}
