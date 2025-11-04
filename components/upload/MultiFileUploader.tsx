'use client';

import { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import {
  Upload,
  FileText,
  AlertCircle,
  X,
  CheckCircle,
  Loader2,
  Edit2,
  Save,
  FolderOpen,
  Info
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { v1ApiService } from '@/lib/services/v1-api-service';

interface FileItem {
  file: File;
  id: string;
  filename: string;
  episodeNumber: number | null;
  rawContent: string;
  fileSize: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress: number;
  error?: string;
  isEditingEpisode: boolean;
  uploadedFileId?: string;
}

interface MultiFileUploaderProps {
  projectId: string;
  onUploadComplete?: (fileIds: string[]) => void;
  onUploadProgress?: (progress: number) => void;
  maxFiles?: number;
  className?: string;
}

/**
 * MultiFileUploader Component
 *
 * Handles multiple script file uploads with:
 * - Drag-and-drop support
 * - Auto episode number extraction
 * - Manual episode editing
 * - Batch upload to API
 * - Progress tracking
 * - Error handling
 *
 * Usage:
 * ```tsx
 * <MultiFileUploader
 *   projectId={projectId}
 *   onUploadComplete={(fileIds) => console.log('Uploaded:', fileIds)}
 *   maxFiles={20}
 * />
 * ```
 */
export function MultiFileUploader({
  projectId,
  onUploadComplete,
  onUploadProgress,
  maxFiles = 50,
  className
}: MultiFileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [fileItems, setFileItems] = useState<FileItem[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const ACCEPT_FORMATS = ['.txt', '.md', '.markdown'];
  const MAX_SIZE = 10 * 1024 * 1024; // 10MB per file

  /**
   * Extract episode number from filename using multiple patterns
   */
  const extractEpisodeNumber = (filename: string): number | null => {
    // Pattern 1: Chinese format "第N集"
    const chineseMatch = filename.match(/第(\d+)集/);
    if (chineseMatch) return parseInt(chineseMatch[1], 10);

    // Pattern 2: "EPN" format
    const epMatch = filename.match(/EP(\d+)/i);
    if (epMatch) return parseInt(epMatch[1], 10);

    // Pattern 3: "EN" format
    const eMatch = filename.match(/E(\d+)/i);
    if (eMatch) return parseInt(eMatch[1], 10);

    // Pattern 4: "episode_N" format
    const episodeMatch = filename.match(/episode[_\s](\d+)/i);
    if (episodeMatch) return parseInt(episodeMatch[1], 10);

    // Pattern 5: Leading number "NN-"
    const leadingMatch = filename.match(/^(\d+)[-_]/);
    if (leadingMatch) return parseInt(leadingMatch[1], 10);

    // Pattern 6: Any number (last resort)
    const anyNumberMatch = filename.match(/(\d+)/);
    if (anyNumberMatch) return parseInt(anyNumberMatch[1], 10);

    return null;
  };

  /**
   * Validate file before adding to queue
   */
  const validateFile = (file: File): string | null => {
    // Size validation
    if (file.size > MAX_SIZE) {
      return `文件 "${file.name}" 大小超过 ${MAX_SIZE / 1024 / 1024}MB 限制`;
    }

    // Extension validation
    const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if (!ACCEPT_FORMATS.some(ext => fileExtension === ext.toLowerCase())) {
      return `文件 "${file.name}" 格式不支持。支持的格式: ${ACCEPT_FORMATS.join(', ')}`;
    }

    // Path traversal prevention
    if (file.name.includes('../') || file.name.includes('..\\')) {
      return `文件 "${file.name}" 包含非法字符`;
    }

    // Max files limit
    if (fileItems.length >= maxFiles) {
      return `最多只能上传 ${maxFiles} 个文件`;
    }

    // Duplicate filename check
    const duplicate = fileItems.find(item => item.filename === file.name);
    if (duplicate) {
      return `文件 "${file.name}" 已存在`;
    }

    return null;
  };

  /**
   * Read file content and create FileItem
   */
  const readFileContent = (file: File): Promise<FileItem> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (event) => {
        const content = event.target?.result as string;

        const item: FileItem = {
          file,
          id: `${file.name}-${Date.now()}-${Math.random()}`,
          filename: file.name,
          episodeNumber: extractEpisodeNumber(file.name),
          rawContent: content,
          fileSize: file.size,
          status: 'pending',
          progress: 0,
          isEditingEpisode: false
        };

        resolve(item);
      };

      reader.onerror = () => {
        reject(new Error(`无法读取文件: ${file.name}`));
      };

      reader.readAsText(file, 'utf-8');
    });
  };

  /**
   * Handle files from drag-and-drop or file picker
   */
  const handleFiles = useCallback(async (files: File[]) => {
    setUploadError(null);

    const validFiles: File[] = [];
    const errors: string[] = [];

    // Validate all files
    for (const file of files) {
      const error = validateFile(file);
      if (error) {
        errors.push(error);
      } else {
        validFiles.push(file);
      }
    }

    if (errors.length > 0) {
      setUploadError(errors.join('; '));
      if (validFiles.length === 0) return;
    }

    // Read file contents
    try {
      const newItems = await Promise.all(validFiles.map(file => readFileContent(file)));
      setFileItems(prev => [...prev, ...newItems]);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : '文件读取失败');
    }
  }, [fileItems, maxFiles]);

  /**
   * Handle drag-and-drop events
   */
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set to false if leaving the drop zone completely
    if (e.currentTarget === e.target) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFiles(files);
    }
  }, [handleFiles]);

  /**
   * Handle file input change
   */
  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length > 0) {
      handleFiles(files);
    }
    // Reset input
    e.target.value = '';
  };

  /**
   * Remove file from queue
   */
  const removeFileItem = (id: string) => {
    setFileItems(prev => prev.filter(item => item.id !== id));
  };

  /**
   * Clear all files
   */
  const clearAll = () => {
    setFileItems([]);
    setUploadError(null);
  };

  /**
   * Toggle episode number editing
   */
  const toggleEpisodeEdit = (id: string) => {
    setFileItems(prev =>
      prev.map(item =>
        item.id === id ? { ...item, isEditingEpisode: !item.isEditingEpisode } : item
      )
    );
  };

  /**
   * Update episode number
   */
  const updateEpisodeNumber = (id: string, episodeNumber: string) => {
    const parsed = parseInt(episodeNumber, 10);
    setFileItems(prev =>
      prev.map(item =>
        item.id === id
          ? {
              ...item,
              episodeNumber: isNaN(parsed) ? null : parsed,
              isEditingEpisode: false
            }
          : item
      )
    );
  };

  /**
   * Upload single file to API
   */
  const uploadSingleFile = async (item: FileItem): Promise<string> => {
    const response = await fetch(`/api/v1/projects/${projectId}/files`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        filename: item.filename,
        rawContent: item.rawContent,
        episodeNumber: item.episodeNumber
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || `上传失败: ${response.statusText}`);
    }

    const result = await response.json();
    return result.data.id;
  };

  /**
   * Upload all pending files
   */
  const uploadAllFiles = async () => {
    setIsUploading(true);
    setUploadError(null);

    const pendingFiles = fileItems.filter(item => item.status === 'pending');
    if (pendingFiles.length === 0) {
      setUploadError('没有待上传的文件');
      setIsUploading(false);
      return;
    }

    const uploadedFileIds: string[] = [];
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < pendingFiles.length; i++) {
      const item = pendingFiles[i];

      // Update status to uploading
      setFileItems(prev =>
        prev.map(it => (it.id === item.id ? { ...it, status: 'uploading', progress: 0 } : it))
      );

      try {
        // Simulate progress
        for (let progress = 0; progress <= 90; progress += 30) {
          setFileItems(prev =>
            prev.map(it => (it.id === item.id ? { ...it, progress } : it))
          );
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        // Upload file
        const fileId = await uploadSingleFile(item);
        uploadedFileIds.push(fileId);
        successCount++;

        // Update to success
        setFileItems(prev =>
          prev.map(it =>
            it.id === item.id
              ? { ...it, status: 'success', progress: 100, uploadedFileId: fileId }
              : it
          )
        );
      } catch (error) {
        errorCount++;

        // Update to error
        setFileItems(prev =>
          prev.map(it =>
            it.id === item.id
              ? {
                  ...it,
                  status: 'error',
                  error: error instanceof Error ? error.message : '上传失败'
                }
              : it
          )
        );
      }

      // Update overall progress
      if (onUploadProgress) {
        const overallProgress = ((i + 1) / pendingFiles.length) * 100;
        onUploadProgress(overallProgress);
      }
    }

    setIsUploading(false);

    // Show summary
    if (errorCount > 0) {
      setUploadError(`上传完成：成功 ${successCount} 个，失败 ${errorCount} 个`);
    }

    // Notify parent
    if (uploadedFileIds.length > 0 && onUploadComplete) {
      onUploadComplete(uploadedFileIds);
    }
  };

  const pendingCount = fileItems.filter(item => item.status === 'pending').length;
  const successCount = fileItems.filter(item => item.status === 'success').length;
  const errorCount = fileItems.filter(item => item.status === 'error').length;

  return (
    <div className={cn('space-y-4', className)}>
      {/* Upload Instructions */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <div className="space-y-1">
            <p>支持多文件上传，系统会自动从文件名中提取集数编号</p>
            <p className="text-xs text-gray-500">
              支持格式: "第1集.md", "EP01.txt", "E1.md", "episode_01.md", "01-pilot.md" 等
            </p>
          </div>
        </AlertDescription>
      </Alert>

      {/* Error Display */}
      {uploadError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{uploadError}</AlertDescription>
        </Alert>
      )}

      {/* Drag-and-Drop Zone */}
      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={cn(
          'relative border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200',
          isDragging
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20 scale-[1.02]'
            : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500',
          isUploading && 'pointer-events-none opacity-50'
        )}
      >
        <input
          id="file-upload"
          type="file"
          accept={ACCEPT_FORMATS.join(',')}
          multiple
          onChange={handleFileInput}
          className="hidden"
          disabled={isUploading}
        />

        <div className={cn('transition-all duration-200', isDragging ? 'scale-110' : '')}>
          <Upload
            className={cn(
              'w-12 h-12 mx-auto mb-4 transition-colors',
              isDragging ? 'text-blue-500' : 'text-gray-400'
            )}
          />
        </div>

        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {isDragging ? '释放文件以添加到队列' : '拖拽文件到此处，或点击选择文件'}
        </p>

        <p className="text-xs text-gray-500 mb-4">
          支持 {ACCEPT_FORMATS.join(', ')} 格式，单个文件最大 {MAX_SIZE / 1024 / 1024}MB
          <br />
          最多可同时上传 {maxFiles} 个文件
        </p>

        <Button
          onClick={() => document.getElementById('file-upload')?.click()}
          variant={isDragging ? 'default' : 'outline'}
          disabled={isUploading}
        >
          <FolderOpen className="w-4 h-4 mr-2" />
          选择文件
        </Button>
      </div>

      {/* File Queue */}
      {fileItems.length > 0 && (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">
                文件队列 ({fileItems.length}/{maxFiles})
              </span>
              {successCount > 0 && (
                <span className="text-xs text-green-600 dark:text-green-400">
                  成功: {successCount}
                </span>
              )}
              {errorCount > 0 && (
                <span className="text-xs text-red-600 dark:text-red-400">
                  失败: {errorCount}
                </span>
              )}
            </div>
            <div className="flex gap-2">
              {pendingCount > 0 && (
                <Button onClick={uploadAllFiles} disabled={isUploading} size="sm">
                  {isUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      上传中...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      上传全部 ({pendingCount})
                    </>
                  )}
                </Button>
              )}
              <Button onClick={clearAll} variant="ghost" size="sm" disabled={isUploading}>
                清空所有
              </Button>
            </div>
          </div>

          {/* File List */}
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {fileItems.map(item => (
              <div
                key={item.id}
                className="border rounded-lg p-3 space-y-2 bg-white dark:bg-gray-800"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <FileText className="w-4 h-4 text-gray-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium truncate">{item.filename}</span>
                        <span className="text-xs text-gray-500 flex-shrink-0">
                          ({(item.fileSize / 1024).toFixed(1)} KB)
                        </span>
                      </div>

                      {/* Episode Number */}
                      <div className="flex items-center gap-2 mt-1">
                        {item.isEditingEpisode ? (
                          <>
                            <Input
                              type="number"
                              min="1"
                              defaultValue={item.episodeNumber || ''}
                              placeholder="集数"
                              className="h-6 text-xs w-20"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  updateEpisodeNumber(item.id, e.currentTarget.value);
                                }
                              }}
                            />
                            <Button
                              onClick={() =>
                                updateEpisodeNumber(
                                  item.id,
                                  (
                                    document.querySelector(
                                      `input[type="number"]`
                                    ) as HTMLInputElement
                                  )?.value || ''
                                )
                              }
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2"
                            >
                              <Save className="w-3 h-3" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <span className="text-xs text-gray-600 dark:text-gray-400">
                              集数: {item.episodeNumber !== null ? item.episodeNumber : '未识别'}
                            </span>
                            {item.status === 'pending' && (
                              <Button
                                onClick={() => toggleEpisodeEdit(item.id)}
                                variant="ghost"
                                size="sm"
                                className="h-5 px-1"
                              >
                                <Edit2 className="w-3 h-3" />
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Status Icons */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {item.status === 'pending' && (
                      <span className="text-xs text-gray-500">待上传</span>
                    )}
                    {item.status === 'uploading' && (
                      <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                    )}
                    {item.status === 'success' && (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    )}
                    {item.status === 'error' && (
                      <AlertCircle className="w-4 h-4 text-red-500" />
                    )}

                    <Button
                      onClick={() => removeFileItem(item.id)}
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      disabled={item.status === 'uploading'}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Progress Bar */}
                {item.status === 'uploading' && <Progress value={item.progress} className="h-1" />}

                {/* Error Message */}
                {item.error && <p className="text-xs text-red-500">{item.error}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
