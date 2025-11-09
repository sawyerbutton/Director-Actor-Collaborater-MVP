'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import {
  FileText,
  Trash2,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Clock,
  Loader2,
  Download,
  Eye,
  Upload
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { MultiFileUploader } from '@/components/upload/MultiFileUploader';

interface ScriptFile {
  id: string;
  projectId: string;
  filename: string;
  episodeNumber: number | null;
  fileSize: number;
  contentHash: string;
  conversionStatus: 'pending' | 'processing' | 'completed' | 'failed';
  conversionError: string | null;
  createdAt: string;
  updatedAt: string;
}

interface FileStats {
  totalFiles: number;
  totalSize: number;
  convertedFiles: number;
  pendingFiles: number;
  failedFiles: number;
  episodeRange: {
    min: number | null;
    max: number | null;
  };
}

interface FileListManagerProps {
  projectId: string;
  className?: string;
  showUploader?: boolean;
  onFileUploadComplete?: (fileIds: string[]) => void;
  onFileDelete?: (fileId: string) => void;
}

/**
 * FileListManager Component
 *
 * Comprehensive file management interface for multi-script projects
 *
 * Features:
 * - Integrated MultiFileUploader
 * - File list with status indicators
 * - Statistics dashboard
 * - Delete/refresh operations
 * - Real-time status updates
 * - Sorting by episode number/creation time
 *
 * Usage:
 * ```tsx
 * <FileListManager
 *   projectId={projectId}
 *   showUploader={true}
 *   onFileUploadComplete={(ids) => console.log('Uploaded:', ids)}
 * />
 * ```
 */
export function FileListManager({
  projectId,
  className,
  showUploader = true,
  onFileUploadComplete,
  onFileDelete
}: FileListManagerProps) {
  const [files, setFiles] = useState<ScriptFile[]>([]);
  const [stats, setStats] = useState<FileStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<ScriptFile | null>(null);
  const [isDeletingFile, setIsDeletingFile] = useState(false);
  const [showUploaderSection, setShowUploaderSection] = useState(false);

  /**
   * Fetch files from API
   */
  const fetchFiles = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/v1/projects/${projectId}/files?orderBy=episodeNumber&order=asc&take=100`
      );

      if (!response.ok) {
        throw new Error('获取文件列表失败');
      }

      const result = await response.json();
      setFiles(result.data.items || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  /**
   * Fetch file statistics
   */
  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch(`/api/v1/projects/${projectId}/files/stats`);

      if (!response.ok) {
        throw new Error('获取统计信息失败');
      }

      const result = await response.json();
      setStats(result.data);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  }, [projectId]);

  /**
   * Load files and stats on mount
   */
  useEffect(() => {
    fetchFiles();
    fetchStats();
  }, [fetchFiles, fetchStats]);

  /**
   * Handle file upload completion
   */
  const handleUploadComplete = (fileIds: string[]) => {
    // Refresh file list
    fetchFiles();
    fetchStats();

    // Hide uploader after successful upload
    setShowUploaderSection(false);

    // Notify parent
    if (onFileUploadComplete) {
      onFileUploadComplete(fileIds);
    }
  };

  /**
   * Handle delete confirmation
   */
  const confirmDelete = (file: ScriptFile) => {
    setFileToDelete(file);
    setDeleteDialogOpen(true);
  };

  /**
   * Execute file deletion
   */
  const executeDelete = async () => {
    if (!fileToDelete) return;

    setIsDeletingFile(true);

    try {
      const response = await fetch(
        `/api/v1/projects/${projectId}/files/${fileToDelete.id}`,
        { method: 'DELETE' }
      );

      if (!response.ok) {
        throw new Error('删除文件失败');
      }

      // Refresh lists
      await fetchFiles();
      await fetchStats();

      // Notify parent
      if (onFileDelete) {
        onFileDelete(fileToDelete.id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除失败');
    } finally {
      setIsDeletingFile(false);
      setDeleteDialogOpen(false);
      setFileToDelete(null);
    }
  };

  /**
   * Refresh files and stats
   */
  const handleRefresh = () => {
    fetchFiles();
    fetchStats();
  };

  /**
   * Get status badge variant
   */
  const getStatusBadge = (status: ScriptFile['conversionStatus']) => {
    switch (status) {
      case 'completed':
        return (
          <Badge variant="default" className="bg-green-500">
            <CheckCircle className="w-3 h-3 mr-1" />
            已转换
          </Badge>
        );
      case 'processing':
        return (
          <Badge variant="default" className="bg-blue-500">
            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
            转换中
          </Badge>
        );
      case 'failed':
        return (
          <Badge variant="destructive">
            <AlertCircle className="w-3 h-3 mr-1" />
            失败
          </Badge>
        );
      case 'pending':
      default:
        return (
          <Badge variant="secondary">
            <Clock className="w-3 h-3 mr-1" />
            待转换
          </Badge>
        );
    }
  };

  /**
   * Format file size
   */
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  /**
   * Format date
   */
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Statistics Card */}
      {stats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>文件统计</span>
              <Button onClick={handleRefresh} variant="outline" size="sm" disabled={isLoading}>
                <RefreshCw className={cn('w-4 h-4 mr-2', isLoading && 'animate-spin')} />
                刷新
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold">{stats.totalFiles}</div>
                <div className="text-xs text-gray-500">总文件数</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{stats.convertedFiles}</div>
                <div className="text-xs text-gray-500">已转换</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-600">{stats.pendingFiles}</div>
                <div className="text-xs text-gray-500">待转换</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{stats.failedFiles}</div>
                <div className="text-xs text-gray-500">转换失败</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{formatFileSize(stats.totalSize)}</div>
                <div className="text-xs text-gray-500">总大小</div>
              </div>
            </div>

            {stats.episodeRange.min !== null && stats.episodeRange.max !== null && (
              <div className="mt-4 text-center text-sm text-gray-600">
                集数范围: 第{stats.episodeRange.min}集 - 第{stats.episodeRange.max}集
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Upload Section */}
      {showUploader && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>文件上传</span>
              {files.length > 0 && (
                <Button
                  onClick={() => setShowUploaderSection(!showUploaderSection)}
                  variant="ghost"
                  size="sm"
                >
                  {showUploaderSection ? '隐藏上传区' : '显示上传区'}
                </Button>
              )}
            </CardTitle>
            <CardDescription>
              上传剧本文件，支持多文件同时上传（最多50个）
            </CardDescription>
          </CardHeader>
          {(files.length === 0 || showUploaderSection) && (
            <CardContent>
              <MultiFileUploader
                projectId={projectId}
                onUploadComplete={handleUploadComplete}
                maxFiles={50}
              />
            </CardContent>
          )}
        </Card>
      )}

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* File List Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>文件列表 ({files.length})</span>
            {files.length > 0 && (
              <Button
                onClick={() => setShowUploaderSection(true)}
                variant="outline"
                size="sm"
              >
                <Upload className="w-4 h-4 mr-2" />
                添加更多文件
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
          ) : files.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>暂无文件</p>
              <p className="text-sm mt-2">请上传剧本文件以开始分析</p>
            </div>
          ) : (
            <div className="space-y-2">
              {files.map((file, index) => (
                <div
                  key={file.id}
                  className="border rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    {/* Left Section: File Info */}
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-gray-500">#{index + 1}</span>
                        <FileText className="w-4 h-4 text-gray-500 flex-shrink-0" />
                        <span className="font-medium truncate" title={file.filename}>
                          {file.filename}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-sm">
                        {/* Episode Number */}
                        {file.episodeNumber !== null ? (
                          <Badge variant="outline">第{file.episodeNumber}集</Badge>
                        ) : (
                          <span className="text-gray-400 text-sm">未识别集数</span>
                        )}

                        {/* Status */}
                        {getStatusBadge(file.conversionStatus)}

                        {/* File Size */}
                        <span className="text-gray-600">{formatFileSize(file.fileSize)}</span>

                        {/* Upload Time */}
                        <span className="text-gray-500 text-xs">
                          {formatDate(file.createdAt)}
                        </span>
                      </div>

                      {/* Error Message */}
                      {file.conversionError && (
                        <div className="text-xs text-red-500 bg-red-50 dark:bg-red-950/20 px-2 py-1 rounded">
                          错误: {file.conversionError}
                        </div>
                      )}
                    </div>

                    {/* Right Section: Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {/* View button - placeholder for future feature */}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        title="查看文件"
                        disabled
                      >
                        <Eye className="w-4 h-4" />
                      </Button>

                      {/* Delete button */}
                      <Button
                        onClick={() => confirmDelete(file)}
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
                        title="删除文件"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除文件</DialogTitle>
            <DialogDescription>
              确定要删除文件 "{fileToDelete?.filename}" 吗？
              <br />
              此操作无法撤销，文件的所有数据将被永久删除。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={isDeletingFile}
            >
              取消
            </Button>
            <Button
              onClick={executeDelete}
              disabled={isDeletingFile}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeletingFile ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  删除中...
                </>
              ) : (
                '确认删除'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
