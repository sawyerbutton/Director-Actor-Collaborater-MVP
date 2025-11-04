/**
 * Unit tests for ScriptFileService
 */

import { ScriptFileService } from '@/lib/db/services/script-file.service';
import { prisma } from '@/lib/db/client';
import { Prisma } from '@prisma/client';

// Mock prisma client
jest.mock('@/lib/db/client', () => ({
  prisma: {
    scriptFile: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn()
    },
    $transaction: jest.fn()
  }
}));

describe('ScriptFileService', () => {
  let service: ScriptFileService;
  const mockPrisma = prisma as any;

  beforeEach(() => {
    service = new ScriptFileService();
    jest.clearAllMocks();
  });

  describe('createFile', () => {
    it('should create a file with auto-extracted episode number', async () => {
      const mockFile = {
        id: 'file-1',
        projectId: 'project-1',
        filename: '第1集.md',
        episodeNumber: 1,
        rawContent: 'test content',
        jsonContent: null,
        contentHash: 'abc123',
        fileSize: 12,
        conversionStatus: 'pending',
        conversionError: null,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockPrisma.scriptFile.create.mockResolvedValueOnce(mockFile);

      const result = await service.createFile({
        projectId: 'project-1',
        filename: '第1集.md',
        rawContent: 'test content'
      });

      expect(result).toEqual(mockFile);
      expect(mockPrisma.scriptFile.create).toHaveBeenCalledWith({
        data: {
          projectId: 'project-1',
          filename: '第1集.md',
          episodeNumber: 1,
          rawContent: 'test content',
          contentHash: expect.any(String),
          fileSize: 12,
          conversionStatus: 'pending'
        }
      });
    });

    it('should use provided episode number if given', async () => {
      const mockFile = {
        id: 'file-1',
        projectId: 'project-1',
        filename: 'custom.md',
        episodeNumber: 5,
        rawContent: 'test',
        jsonContent: null,
        contentHash: 'abc',
        fileSize: 4,
        conversionStatus: 'pending',
        conversionError: null,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockPrisma.scriptFile.create.mockResolvedValueOnce(mockFile);

      const result = await service.createFile({
        projectId: 'project-1',
        filename: 'custom.md',
        rawContent: 'test',
        episodeNumber: 5
      });

      expect(result.episodeNumber).toBe(5);
    });
  });

  describe('createFiles', () => {
    it('should create multiple files in transaction', async () => {
      const files = [
        { projectId: 'p1', filename: 'EP01.md', rawContent: 'content1' },
        { projectId: 'p1', filename: 'EP02.md', rawContent: 'content2' }
      ];

      const mockCreatedFiles = files.map((f, i) => ({
        id: `file-${i}`,
        projectId: f.projectId,
        filename: f.filename,
        episodeNumber: i + 1,
        rawContent: f.rawContent,
        jsonContent: null,
        contentHash: `hash${i}`,
        fileSize: f.rawContent.length,
        conversionStatus: 'pending',
        conversionError: null,
        createdAt: new Date(),
        updatedAt: new Date()
      }));

      // Mock transaction
      mockPrisma.$transaction.mockImplementationOnce(async (callback: any) => {
        const tx = {
          scriptFile: {
            findUnique: jest.fn().mockResolvedValue(null),
            create: jest.fn()
              .mockResolvedValueOnce(mockCreatedFiles[0])
              .mockResolvedValueOnce(mockCreatedFiles[1])
          }
        };
        return await callback(tx);
      });

      const result = await service.createFiles(files);

      expect(result.success).toBe(true);
      expect(result.count).toBe(2);
      expect(result.errors).toBeUndefined();
    });

    it('should detect duplicate filenames', async () => {
      const files = [
        { projectId: 'p1', filename: 'duplicate.md', rawContent: 'content1' }
      ];

      // Mock transaction with existing file
      mockPrisma.$transaction.mockImplementationOnce(async (callback: any) => {
        const tx = {
          scriptFile: {
            findUnique: jest.fn().mockResolvedValue({ id: 'existing', filename: 'duplicate.md' }),
            create: jest.fn()
          }
        };
        return await callback(tx);
      });

      const result = await service.createFiles(files);

      expect(result.success).toBe(false);
      expect(result.count).toBe(0);
      expect(result.errors).toBeDefined();
      expect(result.errors?.[0].filename).toBe('duplicate.md');
    });
  });

  describe('getFilesByProjectId', () => {
    it('should return files sorted by episode number ascending', async () => {
      const mockFiles = [
        { id: '1', episodeNumber: 1, filename: 'EP01.md' },
        { id: '2', episodeNumber: 2, filename: 'EP02.md' },
        { id: '3', episodeNumber: 3, filename: 'EP03.md' }
      ];

      mockPrisma.scriptFile.findMany.mockResolvedValueOnce(mockFiles);

      const result = await service.getFilesByProjectId('project-1', {
        orderBy: 'episodeNumber',
        order: 'asc'
      });

      expect(result).toEqual(mockFiles);
      expect(mockPrisma.scriptFile.findMany).toHaveBeenCalledWith({
        where: { projectId: 'project-1' },
        orderBy: { episodeNumber: { sort: 'asc', nulls: 'last' } },
        skip: undefined,
        take: undefined,
        include: undefined
      });
    });

    it('should support pagination', async () => {
      mockPrisma.scriptFile.findMany.mockResolvedValueOnce([]);

      await service.getFilesByProjectId('project-1', {
        skip: 10,
        take: 5
      });

      expect(mockPrisma.scriptFile.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,
          take: 5
        })
      );
    });

    it('should include project data when requested', async () => {
      mockPrisma.scriptFile.findMany.mockResolvedValueOnce([]);

      await service.getFilesByProjectId('project-1', {
        includeProject: true
      });

      expect(mockPrisma.scriptFile.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: { project: true }
        })
      );
    });
  });

  describe('getFileById', () => {
    it('should return file by id', async () => {
      const mockFile = {
        id: 'file-1',
        projectId: 'project-1',
        filename: 'test.md',
        episodeNumber: 1
      };

      mockPrisma.scriptFile.findUnique.mockResolvedValueOnce(mockFile);

      const result = await service.getFileById('file-1');

      expect(result).toEqual(mockFile);
      expect(mockPrisma.scriptFile.findUnique).toHaveBeenCalledWith({
        where: { id: 'file-1' },
        include: undefined
      });
    });

    it('should return null if file not found', async () => {
      mockPrisma.scriptFile.findUnique.mockResolvedValueOnce(null);

      const result = await service.getFileById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('getFileByProjectAndFilename', () => {
    it('should find file by project and filename', async () => {
      const mockFile = {
        id: 'file-1',
        projectId: 'project-1',
        filename: 'test.md'
      };

      mockPrisma.scriptFile.findUnique.mockResolvedValueOnce(mockFile);

      const result = await service.getFileByProjectAndFilename('project-1', 'test.md');

      expect(result).toEqual(mockFile);
      expect(mockPrisma.scriptFile.findUnique).toHaveBeenCalledWith({
        where: {
          projectId_filename: {
            projectId: 'project-1',
            filename: 'test.md'
          }
        }
      });
    });
  });

  describe('updateFile', () => {
    it('should update file with JSON content', async () => {
      const existingFile = {
        id: 'file-1',
        projectId: 'project-1',
        filename: 'test.md'
      };

      const updatedFile = {
        ...existingFile,
        jsonContent: { scenes: [] },
        conversionStatus: 'completed'
      };

      mockPrisma.scriptFile.findUnique.mockResolvedValueOnce(existingFile);
      mockPrisma.scriptFile.update.mockResolvedValueOnce(updatedFile);

      const result = await service.updateFile('file-1', {
        jsonContent: { scenes: [] },
        conversionStatus: 'completed'
      });

      expect(result).toEqual(updatedFile);
      expect(mockPrisma.scriptFile.update).toHaveBeenCalledWith({
        where: { id: 'file-1' },
        data: {
          jsonContent: { scenes: [] },
          conversionStatus: 'completed',
          conversionError: undefined,
          updatedAt: expect.any(Date)
        }
      });
    });

    it('should throw error if file not found', async () => {
      mockPrisma.scriptFile.findUnique.mockResolvedValueOnce(null);

      await expect(
        service.updateFile('nonexistent', { conversionStatus: 'completed' })
      ).rejects.toThrow('Script file with ID nonexistent not found');
    });
  });

  describe('deleteFile', () => {
    it('should delete file by id', async () => {
      const mockFile = { id: 'file-1', filename: 'test.md' };

      mockPrisma.scriptFile.findUnique.mockResolvedValueOnce(mockFile);
      mockPrisma.scriptFile.delete.mockResolvedValueOnce(mockFile);

      await service.deleteFile('file-1');

      expect(mockPrisma.scriptFile.delete).toHaveBeenCalledWith({
        where: { id: 'file-1' }
      });
    });

    it('should throw error if file not found', async () => {
      mockPrisma.scriptFile.findUnique.mockResolvedValueOnce(null);

      await expect(service.deleteFile('nonexistent')).rejects.toThrow(
        'Script file with ID nonexistent not found'
      );
    });
  });

  describe('deleteFilesByProjectId', () => {
    it('should delete all files for a project', async () => {
      mockPrisma.scriptFile.deleteMany.mockResolvedValueOnce({ count: 5 });

      const result = await service.deleteFilesByProjectId('project-1');

      expect(result.count).toBe(5);
      expect(mockPrisma.scriptFile.deleteMany).toHaveBeenCalledWith({
        where: { projectId: 'project-1' }
      });
    });
  });

  describe('getProjectFilesStats', () => {
    it('should calculate project file statistics', async () => {
      const mockFiles = [
        { fileSize: 100, conversionStatus: 'completed', episodeNumber: 1 },
        { fileSize: 200, conversionStatus: 'pending', episodeNumber: 2 },
        { fileSize: 150, conversionStatus: 'failed', episodeNumber: 3 },
        { fileSize: 300, conversionStatus: 'completed', episodeNumber: 4 }
      ];

      mockPrisma.scriptFile.findMany.mockResolvedValueOnce(mockFiles);

      const result = await service.getProjectFilesStats('project-1');

      expect(result).toEqual({
        totalFiles: 4,
        totalSize: 750,
        convertedFiles: 2,
        pendingFiles: 1,
        failedFiles: 1,
        episodeRange: {
          min: 1,
          max: 4
        }
      });
    });

    it('should handle null episode numbers', async () => {
      const mockFiles = [
        { fileSize: 100, conversionStatus: 'pending', episodeNumber: null },
        { fileSize: 200, conversionStatus: 'completed', episodeNumber: 5 }
      ];

      mockPrisma.scriptFile.findMany.mockResolvedValueOnce(mockFiles);

      const result = await service.getProjectFilesStats('project-1');

      expect(result.episodeRange).toEqual({
        min: 5,
        max: 5
      });
    });

    it('should return null range if no episode numbers', async () => {
      const mockFiles = [
        { fileSize: 100, conversionStatus: 'pending', episodeNumber: null }
      ];

      mockPrisma.scriptFile.findMany.mockResolvedValueOnce(mockFiles);

      const result = await service.getProjectFilesStats('project-1');

      expect(result.episodeRange).toEqual({
        min: null,
        max: null
      });
    });
  });

  describe('extractEpisodeNumber', () => {
    it('should extract from Chinese format', () => {
      expect(service.extractEpisodeNumber('第1集.md')).toBe(1);
      expect(service.extractEpisodeNumber('第10集.txt')).toBe(10);
      expect(service.extractEpisodeNumber('第99集剧本.md')).toBe(99);
    });

    it('should extract from EP format', () => {
      expect(service.extractEpisodeNumber('EP01.md')).toBe(1);
      expect(service.extractEpisodeNumber('ep05.txt')).toBe(5);
      expect(service.extractEpisodeNumber('EP100.md')).toBe(100);
    });

    it('should extract from E format', () => {
      expect(service.extractEpisodeNumber('E1.md')).toBe(1);
      expect(service.extractEpisodeNumber('e05.txt')).toBe(5);
    });

    it('should extract from episode format', () => {
      expect(service.extractEpisodeNumber('episode_01.md')).toBe(1);
      expect(service.extractEpisodeNumber('episode 05.txt')).toBe(5);
    });

    it('should extract from leading number format', () => {
      expect(service.extractEpisodeNumber('01-pilot.md')).toBe(1);
      expect(service.extractEpisodeNumber('05_script.txt')).toBe(5);
    });

    it('should extract any number as fallback', () => {
      expect(service.extractEpisodeNumber('script_10.md')).toBe(10);
      expect(service.extractEpisodeNumber('final_5.txt')).toBe(5);
    });

    it('should return null if no number found', () => {
      expect(service.extractEpisodeNumber('script.md')).toBeNull();
      expect(service.extractEpisodeNumber('pilot.txt')).toBeNull();
    });
  });

  describe('generateContentHash', () => {
    it('should generate consistent SHA256 hash', () => {
      const content = 'test content';
      const hash1 = service.generateContentHash(content);
      const hash2 = service.generateContentHash(content);

      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64); // SHA256 hex = 64 chars
    });

    it('should generate different hashes for different content', () => {
      const hash1 = service.generateContentHash('content1');
      const hash2 = service.generateContentHash('content2');

      expect(hash1).not.toBe(hash2);
    });

    it('should handle empty content', () => {
      const hash = service.generateContentHash('');
      expect(hash).toHaveLength(64);
    });

    it('should handle Unicode characters', () => {
      const hash = service.generateContentHash('测试内容');
      expect(hash).toHaveLength(64);
    });
  });
});
