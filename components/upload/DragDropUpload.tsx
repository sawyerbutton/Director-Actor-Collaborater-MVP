'use client';

import { useState, useRef, useCallback, DragEvent, ChangeEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Upload, FileText, AlertCircle, X, CheckCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FileUploadItem {
  file: File;
  id: string;
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress: number;
  error?: string;
}

interface DragDropUploadProps {
  accept?: string[];
  maxSize?: number;
  multiple?: boolean;
  disabled?: boolean;
  onUpload: (files: File[]) => Promise<void>;
  onFileSelect?: (files: File[]) => void;
  className?: string;
}

export function DragDropUpload({
  accept = ['.txt', '.md', '.markdown'],
  maxSize = 10 * 1024 * 1024, // 10MB
  multiple = true,
  disabled = false,
  onUpload,
  onFileSelect,
  className
}: DragDropUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadItems, setUploadItems] = useState<FileUploadItem[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);

  const validateFile = (file: File): string | null => {
    // Size validation
    if (file.size > maxSize) {
      return `文件 "${file.name}" 大小超过 ${maxSize / 1024 / 1024}MB 限制`;
    }

    // Extension validation
    const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if (!accept.some(ext => fileExtension === ext.toLowerCase())) {
      return `文件 "${file.name}" 格式不支持。支持的格式: ${accept.join(', ')}`;
    }

    // Path traversal prevention
    if (file.name.includes('../') || file.name.includes('..\\')) {
      return `文件 "${file.name}" 包含非法字符`;
    }

    return null;
  };

  const handleFiles = useCallback(async (files: File[]) => {
    setUploadError(null);

    // Validate all files
    const validFiles: File[] = [];
    const errors: string[] = [];

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

    // Create upload items
    const newItems: FileUploadItem[] = validFiles.map(file => ({
      file,
      id: `${file.name}-${Date.now()}-${Math.random()}`,
      status: 'pending' as const,
      progress: 0
    }));

    if (!multiple) {
      setUploadItems(newItems.slice(0, 1));
    } else {
      setUploadItems(prev => [...prev, ...newItems]);
    }

    // Notify parent about file selection
    if (onFileSelect) {
      onFileSelect(validFiles);
    }

    // Start upload process
    for (const item of newItems) {
      await uploadFile(item);
    }
  }, [accept, maxSize, multiple, onFileSelect]);

  const uploadFile = async (item: FileUploadItem) => {
    setUploadItems(prev =>
      prev.map(i => i.id === item.id ? { ...i, status: 'uploading', progress: 0 } : i)
    );

    try {
      // Simulate progress for demo
      for (let i = 0; i <= 100; i += 20) {
        await new Promise(resolve => setTimeout(resolve, 200));
        setUploadItems(prev =>
          prev.map(it => it.id === item.id ? { ...it, progress: i } : it)
        );
      }

      // Call the actual upload function
      await onUpload([item.file]);

      setUploadItems(prev =>
        prev.map(i => i.id === item.id ? { ...i, status: 'success', progress: 100 } : i)
      );
    } catch (error) {
      setUploadItems(prev =>
        prev.map(i => i.id === item.id
          ? { ...i, status: 'error', error: error instanceof Error ? error.message : '上传失败' }
          : i
        )
      );
    }
  };

  const handleDragEnter = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;

    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;

    if (dragCounter.current === 0) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounter.current = 0;

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFiles(files);
    }
  }, [handleFiles]);

  const handleFileInput = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length > 0) {
      handleFiles(files);
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeUploadItem = (id: string) => {
    setUploadItems(prev => prev.filter(item => item.id !== id));
  };

  const clearAll = () => {
    setUploadItems([]);
    setUploadError(null);
  };

  return (
    <div className={cn('space-y-4', className)}>
      {uploadError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{uploadError}</AlertDescription>
        </Alert>
      )}

      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={cn(
          'relative border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200',
          isDragging
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20 scale-[1.02]'
            : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept.join(',')}
          multiple={multiple}
          onChange={handleFileInput}
          className="hidden"
        />

        <div className={cn(
          'transition-all duration-200',
          isDragging ? 'scale-110' : ''
        )}>
          <Upload className={cn(
            'w-12 h-12 mx-auto mb-4 transition-colors',
            isDragging ? 'text-blue-500' : 'text-gray-400'
          )} />
        </div>

        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {isDragging ? '释放文件以上传' : '拖拽文件到此处，或点击选择文件'}
        </p>

        <p className="text-xs text-gray-500 mb-4">
          支持 {accept.join(', ')} 格式，最大 {maxSize / 1024 / 1024}MB
          {multiple && '，可同时上传多个文件'}
        </p>

        <Button
          onClick={() => fileInputRef.current?.click()}
          variant={isDragging ? 'default' : 'outline'}
          className="relative"
        >
          选择文件
        </Button>
      </div>

      {/* Upload Items List */}
      {uploadItems.length > 0 && (
        <div className="space-y-2">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium">上传队列 ({uploadItems.length})</span>
            <Button
              onClick={clearAll}
              variant="ghost"
              size="sm"
              className="text-xs"
            >
              清空所有
            </Button>
          </div>

          {uploadItems.map(item => (
            <div
              key={item.id}
              className="border rounded-lg p-3 space-y-2 bg-white dark:bg-gray-800"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 flex-1">
                  <FileText className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-medium truncate">
                    {item.file.name}
                  </span>
                  <span className="text-xs text-gray-500">
                    ({(item.file.size / 1024).toFixed(1)} KB)
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {item.status === 'pending' && (
                    <span className="text-xs text-gray-500">等待中</span>
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
                    onClick={() => removeUploadItem(item.id)}
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {item.status === 'uploading' && (
                <Progress value={item.progress} className="h-1" />
              )}

              {item.error && (
                <p className="text-xs text-red-500">{item.error}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}