'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  Play, 
  Square, 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  Loader2 
} from 'lucide-react';
import { useAnalysisStore } from '@/lib/stores/analysis-store';
import { analysisService } from '@/lib/services/analysis-service';

type AnalysisStatus = 'idle' | 'starting' | 'processing' | 'completed' | 'failed' | 'cancelled';

export function AnalysisControl() {
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);
  const [progress, setProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const { 
    analysisStatus,
    taskId,
    scriptContent,
    setAnalysisStatus,
    setTaskId,
    setAnalysisResults
  } = useAnalysisStore();

  useEffect(() => {
    return () => {
      if (pollingInterval) {
        clearTimeout(pollingInterval);
      }
    };
  }, [pollingInterval]);

  const startAnalysis = async () => {
    if (!scriptContent) {
      setErrorMessage('请先上传剧本');
      return;
    }

    setAnalysisStatus('starting');
    setErrorMessage(null);
    setProgress(0);

    try {
      const response = await analysisService.startAnalysis(scriptContent);
      
      if (response.taskId) {
        setTaskId(response.taskId);
        setAnalysisStatus('processing');
        startPolling(response.taskId);
      } else {
        throw new Error('未能获取任务ID');
      }
    } catch (error) {
      setAnalysisStatus('failed');
      setErrorMessage(
        error instanceof Error ? error.message : '启动分析失败'
      );
    }
  };

  const startPolling = (taskId: string) => {
    let pollCount = 0;
    const maxPolls = 60; // Max 60 polls (about 5 minutes with exponential backoff)
    let pollDelay = 1000; // Start with 1 second
    let timeoutId: NodeJS.Timeout;
    
    const poll = async () => {
      try {
        const status = await analysisService.getAnalysisStatus(taskId);
        
        // Update progress based on status
        const progressPercent = Math.min((pollCount / maxPolls) * 100, 90);
        setProgress(progressPercent);
        
        if (status.status === 'completed') {
          setAnalysisStatus('completed');
          setProgress(100);
          
          if (status.results) {
            setAnalysisResults(status.results);
          }
          return; // Stop polling
        } else if (status.status === 'failed') {
          setAnalysisStatus('failed');
          setErrorMessage(status.error || '分析失败');
          return; // Stop polling
        } else {
          pollCount++;
          
          if (pollCount >= maxPolls) {
            setAnalysisStatus('failed');
            setErrorMessage('分析超时，请重试');
            return; // Stop polling
          }
          
          // Proper exponential backoff with jitter
          pollDelay = Math.min(pollDelay * 1.5, 10000); // Max 10 seconds
          const jitter = Math.random() * 1000; // Add 0-1000ms jitter
          
          // Schedule next poll with exponential backoff + jitter
          timeoutId = setTimeout(poll, pollDelay + jitter);
          setPollingInterval(timeoutId as any);
        }
      } catch (error) {
        setAnalysisStatus('failed');
        setErrorMessage(
          error instanceof Error ? error.message : '状态检查失败'
        );
        // Stop polling on error
      }
    };

    // Start polling immediately
    poll();
  };

  const cancelAnalysis = async () => {
    if (pollingInterval) {
      clearTimeout(pollingInterval);
      setPollingInterval(null);
    }

    if (taskId) {
      try {
        await analysisService.cancelAnalysis(taskId);
      } catch (error) {
        console.error('Failed to cancel analysis:', error);
      }
    }

    setAnalysisStatus('cancelled');
    setProgress(0);
  };

  const resetAnalysis = () => {
    if (pollingInterval) {
      clearTimeout(pollingInterval);
      setPollingInterval(null);
    }
    
    setAnalysisStatus('idle');
    setProgress(0);
    setErrorMessage(null);
    setTaskId(null);
  };

  const getStatusIcon = () => {
    switch (analysisStatus) {
      case 'idle':
        return <Play className="w-4 h-4" />;
      case 'starting':
      case 'processing':
        return <Loader2 className="w-4 h-4 animate-spin" />;
      case 'completed':
        return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'cancelled':
        return <Square className="w-4 h-4 text-gray-600" />;
      default:
        return <Play className="w-4 h-4" />;
    }
  };

  const getStatusText = () => {
    switch (analysisStatus) {
      case 'idle':
        return '准备就绪';
      case 'starting':
        return '正在启动分析...';
      case 'processing':
        return '分析进行中...';
      case 'completed':
        return '分析完成';
      case 'failed':
        return '分析失败';
      case 'cancelled':
        return '分析已取消';
      default:
        return '未知状态';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {getStatusIcon()}
          <span className="font-medium">{getStatusText()}</span>
        </div>
        
        <div className="flex gap-2">
          {analysisStatus === 'idle' || analysisStatus === 'failed' || analysisStatus === 'cancelled' ? (
            <Button 
              onClick={startAnalysis}
              disabled={!scriptContent}
            >
              <Play className="w-4 h-4 mr-2" />
              开始分析
            </Button>
          ) : analysisStatus === 'starting' || analysisStatus === 'processing' ? (
            <Button 
              onClick={cancelAnalysis}
              variant="destructive"
            >
              <Square className="w-4 h-4 mr-2" />
              取消分析
            </Button>
          ) : analysisStatus === 'completed' ? (
            <Button 
              onClick={resetAnalysis}
              variant="outline"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              重新分析
            </Button>
          ) : null}
        </div>
      </div>

      {(analysisStatus === 'starting' || analysisStatus === 'processing') && (
        <div className="space-y-2">
          <Progress value={progress} className="w-full" />
          <p className="text-sm text-gray-600 dark:text-gray-400">
            正在分析剧本，请稍候...
          </p>
        </div>
      )}

      {errorMessage && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      {analysisStatus === 'completed' && (
        <Alert>
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>
            分析完成！请查看下方的分析结果。
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}