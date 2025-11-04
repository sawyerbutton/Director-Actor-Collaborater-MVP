/**
 * Conversion Progress Component
 *
 * Displays real-time conversion progress using polling
 *
 * @example
 * ```tsx
 * <ConversionProgress
 *   projectId="project-123"
 *   autoStart={true}
 *   onComplete={(data) => console.log('Done!', data)}
 * />
 * ```
 */

'use client';

import { useConversionPolling } from '@/lib/hooks/useConversionPolling';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  CheckCircle2,
  XCircle,
  Loader2,
  FileText,
  AlertCircle,
} from 'lucide-react';

export interface ConversionProgressProps {
  /**
   * Project ID to track conversion for
   */
  projectId: string;

  /**
   * Automatically start polling on mount
   * @default false
   */
  autoStart?: boolean;

  /**
   * Show file-by-file details
   * @default true
   */
  showFileDetails?: boolean;

  /**
   * Callback when all conversions complete
   */
  onComplete?: () => void;

  /**
   * Callback when conversion fails
   */
  onError?: (error: string) => void;
}

export function ConversionProgress({
  projectId,
  autoStart = false,
  showFileDetails = true,
  onComplete,
  onError,
}: ConversionProgressProps) {
  const {
    status,
    progress,
    data,
    error,
    isPolling,
    pollCount,
    startPolling,
    stopPolling,
    reset,
  } = useConversionPolling({
    projectId,
    enabled: autoStart,
    onCompleted: () => {
      onComplete?.();
    },
    onError: (err) => {
      onError?.(err);
    },
  });

  const getStatusIcon = () => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'processing':
        return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />;
      default:
        return <FileText className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'completed':
        return '转换完成';
      case 'failed':
        return '转换失败';
      case 'processing':
        return '转换中...';
      case 'partial':
        return '部分完成';
      default:
        return '等待转换';
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'completed':
        return 'text-green-600';
      case 'failed':
        return 'text-red-600';
      case 'processing':
        return 'text-blue-600';
      case 'partial':
        return 'text-yellow-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {getStatusIcon()}
          <div>
            <h3 className={`font-semibold ${getStatusColor()}`}>
              {getStatusText()}
            </h3>
            {data && (
              <p className="text-sm text-muted-foreground">
                {data.completed} / {data.totalFiles} 文件已完成
              </p>
            )}
          </div>
        </div>

        {/* Control Buttons */}
        <div className="flex gap-2">
          {!isPolling && status !== 'completed' && (
            <Button
              size="sm"
              onClick={startPolling}
              disabled={!projectId}
            >
              开始监控
            </Button>
          )}
          {isPolling && (
            <Button
              size="sm"
              variant="outline"
              onClick={stopPolling}
            >
              停止监控
            </Button>
          )}
          {(status === 'completed' || status === 'failed') && (
            <Button
              size="sm"
              variant="outline"
              onClick={reset}
            >
              重置
            </Button>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <Progress value={progress} className="h-2" />
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>{progress}% 完成</span>
          {isPolling && (
            <span className="text-xs">
              轮询次数: {pollCount}
            </span>
          )}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* File Details */}
      {showFileDetails && data && data.files.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">文件状态</h4>
          <div className="space-y-1">
            {data.files.map((file) => (
              <div
                key={file.id}
                className="flex items-center justify-between p-2 rounded-md bg-muted/50"
              >
                <div className="flex items-center gap-2">
                  {file.conversionStatus === 'completed' && (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  )}
                  {file.conversionStatus === 'processing' && (
                    <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
                  )}
                  {file.conversionStatus === 'failed' && (
                    <XCircle className="h-4 w-4 text-red-500" />
                  )}
                  {file.conversionStatus === 'pending' && (
                    <FileText className="h-4 w-4 text-gray-400" />
                  )}
                  <span className="text-sm">
                    {file.filename}
                    {file.episodeNumber && (
                      <span className="text-muted-foreground ml-1">
                        (第{file.episodeNumber}集)
                      </span>
                    )}
                  </span>
                </div>
                <span
                  className={`text-xs px-2 py-1 rounded ${
                    file.conversionStatus === 'completed'
                      ? 'bg-green-100 text-green-700'
                      : file.conversionStatus === 'processing'
                      ? 'bg-blue-100 text-blue-700'
                      : file.conversionStatus === 'failed'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {file.conversionStatus}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Statistics */}
      {data && (
        <div className="grid grid-cols-4 gap-2 text-center text-sm">
          <div className="p-2 rounded-md bg-green-50">
            <div className="font-semibold text-green-700">{data.completed}</div>
            <div className="text-xs text-green-600">已完成</div>
          </div>
          <div className="p-2 rounded-md bg-blue-50">
            <div className="font-semibold text-blue-700">{data.processing}</div>
            <div className="text-xs text-blue-600">转换中</div>
          </div>
          <div className="p-2 rounded-md bg-gray-50">
            <div className="font-semibold text-gray-700">{data.pending}</div>
            <div className="text-xs text-gray-600">待转换</div>
          </div>
          <div className="p-2 rounded-md bg-red-50">
            <div className="font-semibold text-red-700">{data.failed}</div>
            <div className="text-xs text-red-600">失败</div>
          </div>
        </div>
      )}
    </div>
  );
}
