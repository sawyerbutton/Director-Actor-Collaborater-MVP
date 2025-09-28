'use client';

import { FileText, FileCode, FileType, File } from 'lucide-react';

interface FilePreviewProps {
  fileName: string;
  fileSize: number;
  fileType: string;
  preview?: string;
}

export function FilePreview({ fileName, fileSize, fileType, preview }: FilePreviewProps) {
  const getFileIcon = () => {
    const ext = fileName.split('.').pop()?.toLowerCase();

    switch (ext) {
      case 'md':
      case 'markdown':
        return <FileCode className="w-8 h-8 text-blue-500" />;
      case 'txt':
        return <FileText className="w-8 h-8 text-gray-500" />;
      case 'fdx':
      case 'fountain':
        return <FileType className="w-8 h-8 text-purple-500" />;
      default:
        return <File className="w-8 h-8 text-gray-400" />;
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="flex items-start gap-3 p-4 border rounded-lg bg-gray-50 dark:bg-gray-800">
      <div className="flex-shrink-0">
        {getFileIcon()}
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-sm truncate">{fileName}</h4>
        <p className="text-xs text-gray-500">
          {formatFileSize(fileSize)} • {fileType}
        </p>
        {preview && (
          <div className="mt-2 p-2 bg-white dark:bg-gray-900 rounded border text-xs font-mono text-gray-600 dark:text-gray-400">
            <pre className="whitespace-pre-wrap overflow-hidden max-h-20">
              {preview.substring(0, 200)}
              {preview.length > 200 && '...'}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}